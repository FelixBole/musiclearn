import * as Tone from 'tone';
import { ORCHESTRA_SAMPLES } from './orchestraManifest';
import { orchestrateFree, orchestrateSatb, type EnsembleId, type SampleId } from '../orchestra/instruments';

/**
 * Audio engine: a lazily-loaded sampled piano with a touch of reverb, plus orchestral
 * sections (VSCO 2 CE) loaded on first use.
 * All public functions are safe to call before samples finish loading (they await).
 */

const SAMPLE_NOTES: Record<string, string> = {};
for (const o of [1, 2, 3, 4, 5, 6, 7]) {
  for (const [name, file] of [
    ['C', 'C'],
    ['D#', 'Ds'],
    ['F#', 'Fs'],
    ['A', 'A'],
  ]) {
    SAMPLE_NOTES[`${name}${o}`] = `${file}${o}.mp3`;
  }
}
SAMPLE_NOTES['A0'] = 'A0.mp3';
SAMPLE_NOTES['C8'] = 'C8.mp3';

let sampler: Tone.Sampler | null = null;
let ready: Promise<void> | null = null;
let output: Tone.Volume | null = null;

function baseUrl(): string {
  return `${import.meta.env.BASE_URL}samples/piano/`;
}

/** Must be called from a user gesture at least once (browser autoplay policy). */
export function ensureAudio(): Promise<void> {
  if (ready) {
    // Tone.start() is idempotent but must run inside a gesture if the context got suspended.
    if (Tone.getContext().state !== 'running') void Tone.start();
    return ready;
  }
  ready = (async () => {
    await Tone.start();
    output = new Tone.Volume(-4).toDestination();
    const reverb = new Tone.Reverb({ decay: 2.4, wet: 0.18 });
    await reverb.generate();
    reverb.connect(output);
    sampler = new Tone.Sampler({
      urls: SAMPLE_NOTES,
      baseUrl: baseUrl(),
      release: 1.2,
    }).connect(reverb);
    await Tone.loaded();
  })();
  return ready;
}

export function isAudioReady(): boolean {
  return sampler !== null && sampler.loaded;
}

export function setVolume(db: number) {
  if (output) output.volume.value = db;
}

const freq = (midi: number) => Tone.Frequency(midi, 'midi').toFrequency();

export interface PlayEvent {
  notes: number[];
  /** seconds */
  duration: number;
  /** seconds from start; if omitted events are sequential */
  at?: number;
  velocity?: number;
  /** instrument for `notes` (default piano) */
  sample?: SampleId;
  /** extra notes on specific instruments (orchestrated chords) */
  parts?: { midi: number; sample: SampleId }[];
}

/* ---------------- orchestral sections ---------------- */

const orchestra = new Map<SampleId, Promise<Tone.Sampler>>();
let hall: Tone.Reverb | null = null;
const RELEASE: Partial<Record<SampleId, number>> = { violins: 0.7, violas: 0.7, cellos: 0.7, basses: 0.7, horn: 0.5, trumpet: 0.35, trombone: 0.45, tuba: 0.45 };
/** usable seconds per orchestral sample (they are trimmed to 3.4–4.2 s with a fade) */
const SAMPLE_SUSTAIN = 2.6;

function orchestraUrl(id: SampleId) {
  return `${import.meta.env.BASE_URL}samples/orchestra/${id}/`;
}

/** Load (once) the sampler of an orchestral section. */
export function loadInstrument(id: SampleId): Promise<Tone.Sampler> {
  if (id === 'piano') return ensureAudio().then(() => sampler!);
  let p = orchestra.get(id);
  if (!p) {
    p = (async () => {
      await ensureAudio();
      if (!hall) {
        hall = new Tone.Reverb({ decay: 3.2, wet: 0.28 });
        await hall.generate();
        hall.connect(output!);
      }
      const urls = ORCHESTRA_SAMPLES[id];
      if (!urls) throw new Error(`No samples for ${id}`);
      return await new Promise<Tone.Sampler>((resolve, reject) => {
        const smp = new Tone.Sampler({
          urls,
          baseUrl: orchestraUrl(id),
          attack: 0.02,
          release: RELEASE[id] ?? 0.3,
          onload: () => resolve(smp),
          onerror: (e) => reject(e),
        }).connect(hall!);
        smp.volume.value = -6;
      });
    })();
    p.catch(() => orchestra.delete(id));
    orchestra.set(id, p);
  }
  return p;
}

/** All sample files (for "download for offline use"). */
export function orchestraFileUrls(): string[] {
  return Object.entries(ORCHESTRA_SAMPLES).flatMap(([id, notes]) => Object.values(notes).map((f) => `${orchestraUrl(id as SampleId)}${f}`));
}

export interface PlayOptions {
  /** called when event `i` starts sounding (for highlighting) */
  onEvent?: (i: number) => void;
}

/** Bumped by stopPlayback(): pending events of older playbacks are dropped. */
let generation = 0;
const pendingStops = new Set<() => void>();

/**
 * Play a sequence of events. Resolves when the last event ends (or playback is stopped).
 * Events are handed to the sampler shortly before they sound, so stopPlayback() can cut them.
 */
export async function playEvents(events: PlayEvent[], opts: PlayOptions = {}): Promise<void> {
  await ensureAudio();
  // load every instrument the sequence needs before scheduling anything
  const needed = new Set<SampleId>();
  for (const ev of events) {
    if (ev.notes.length) needed.add(ev.sample ?? 'piano');
    for (const p of ev.parts ?? []) needed.add(p.sample);
  }
  const samplers = new Map<SampleId, Tone.Sampler>();
  await Promise.all(
    [...needed].map(async (id) => {
      try {
        samplers.set(id, await loadInstrument(id));
      } catch {
        samplers.set(id, sampler!); // offline and never cached: fall back to piano
      }
    }),
  );
  const gen = generation;
  const start = Tone.now() + 0.05;
  const t0 = performance.now() + 50;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cursor = 0;
  let end = 0;
  const trigger = (id: SampleId, midis: number[], at: number, dur: number, vel: number) => {
    const smp = samplers.get(id)!;
    const sustained = id !== 'piano' && smp !== sampler;
    // orchestral samples are short: re-strike long notes with overlap so pads keep sounding
    const chunks: [number, number][] = [];
    if (sustained && dur > SAMPLE_SUSTAIN + 0.4) {
      for (let t = 0; t < dur - 0.2; t += SAMPLE_SUSTAIN) chunks.push([t, Math.min(SAMPLE_SUSTAIN + 0.5, dur - t)]);
    } else chunks.push([0, dur]);
    for (const [off, len] of chunks) {
      timers.push(
        setTimeout(
          () => {
            if (gen !== generation) return;
            smp.triggerAttackRelease(midis.map(freq), len, start + at + off, off ? vel * 0.85 : vel);
          },
          Math.max(0, (at + off) * 1000 - 150),
        ),
      );
    }
  };
  events.forEach((ev, i) => {
    const at = ev.at ?? cursor;
    const vel = ev.velocity ?? 0.75;
    if (ev.notes.length) trigger(ev.sample ?? 'piano', ev.notes, at, ev.duration, vel);
    const bySample = new Map<SampleId, number[]>();
    for (const p of ev.parts ?? []) bySample.set(p.sample, [...(bySample.get(p.sample) ?? []), p.midi]);
    for (const [id, midis] of bySample) trigger(id, midis, at, ev.duration, vel * 0.9);
    if (opts.onEvent) timers.push(setTimeout(() => gen === generation && opts.onEvent!(i), Math.max(0, t0 - performance.now() + at * 1000)));
    cursor = at + ev.duration;
    end = Math.max(end, cursor);
  });
  await new Promise<void>((resolve) => {
    const done = () => {
      pendingStops.delete(done);
      timers.forEach(clearTimeout);
      clearTimeout(t);
      resolve();
    };
    const t = setTimeout(done, end * 1000 + 100);
    pendingStops.add(done);
  });
}

/** Cut every playing / scheduled sequence. */
export function stopPlayback() {
  generation++;
  sampler?.releaseAll();
  for (const p of orchestra.values()) void p.then((smp) => smp.releaseAll()).catch(() => {});
  for (const stop of [...pendingStops]) stop();
}

export function playChord(midis: number[], duration = 1.6) {
  return playEvents([{ notes: midis, duration }]);
}

export function playMelody(midis: number[], noteDuration = 0.6) {
  return playEvents(midis.map((m) => ({ notes: [m], duration: noteDuration })));
}

/** Broken then block: useful for teaching chords. */
export function playArpeggioThenChord(midis: number[], noteDuration = 0.45) {
  const sorted = [...midis].sort((a, b) => a - b);
  return playEvents([
    ...sorted.map((m) => ({ notes: [m], duration: noteDuration })),
    { notes: sorted, duration: 1.6 },
  ]);
}

export function playProgression(chords: number[][], chordDuration = 1.1, opts?: PlayOptions) {
  return playEvents(
    chords.map((c) => ({ notes: c, duration: chordDuration })),
    opts,
  );
}

/* Live playing (MIDI echo / on-screen keyboard) */
export function noteOn(midi: number, velocity = 0.8) {
  if (!sampler?.loaded) {
    void ensureAudio();
    return;
  }
  sampler.triggerAttack(freq(midi), Tone.now(), velocity);
}

export function noteOff(midi: number) {
  if (!sampler?.loaded) return;
  sampler.triggerRelease(freq(midi), Tone.now());
}

export function stopAll() {
  sampler?.releaseAll();
  for (const p of orchestra.values()) void p.then((smp) => smp.releaseAll()).catch(() => {});
}

/* ---------------- orchestrated playback ---------------- */


/** SATB voicings played by an ensemble (piano = plain). */
export function playVoicings(voicings: number[][], ensemble: EnsembleId, chordDuration = 1.1, opts?: PlayOptions) {
  if (ensemble === 'piano') return playProgression(voicings, chordDuration, opts);
  return playEvents(
    voicings.map((v) => ({ notes: [], parts: v.length === 4 ? orchestrateSatb(v, ensemble) : orchestrateFree(v, ensemble), duration: chordDuration })),
    opts,
  );
}

/** One melodic line on one instrument. */
export function playLine(midis: (number | null)[], durations: number[], sample: SampleId = 'piano', opts?: PlayOptions) {
  return playEvents(
    midis.map((m, i) => ({ notes: m === null ? [] : [m], duration: durations[i], sample })),
    opts,
  );
}
