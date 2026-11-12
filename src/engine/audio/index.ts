import * as Tone from 'tone';

/**
 * Audio engine: a lazily-loaded sampled piano with a touch of reverb.
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
}

/** Play a sequence of events. Resolves when the last event ends. */
export async function playEvents(events: PlayEvent[]): Promise<void> {
  await ensureAudio();
  const s = sampler!;
  const start = Tone.now() + 0.05;
  let cursor = 0;
  let end = 0;
  for (const ev of events) {
    const at = ev.at ?? cursor;
    if (ev.notes.length) {
      s.triggerAttackRelease(ev.notes.map(freq), ev.duration, start + at, ev.velocity ?? 0.75);
    }
    cursor = at + ev.duration;
    end = Math.max(end, cursor);
  }
  await new Promise((r) => setTimeout(r, end * 1000 + 100));
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

export function playProgression(chords: number[][], chordDuration = 1.1) {
  return playEvents(chords.map((c) => ({ notes: c, duration: chordDuration })));
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
}
