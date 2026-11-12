/**
 * Motif (leitmotif) engine: parse a short melody, transform it the ways composers do
 * (sequence, inversion, retrograde, augmentation, diminution, fragmentation, mode change)
 * and suggest reharmonizations in different colours.
 */
import { parseNote, toMidi } from './theory';
import { parseRoman, pcOf, type KeyCtx } from './harmony/roman';

export interface MotifNote {
  /** MIDI, or null for a rest */
  midi: number | null;
  /** duration in quarter-note beats */
  dur: number;
}

export type ModeName = 'ionian' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'harmonic';

export const MODE_STEPS: Record<ModeName, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};

export const MODE_LABELS: Record<ModeName, string> = {
  ionian: 'Major',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  aeolian: 'Minor',
  harmonic: 'Harmonic minor',
};

const DUR_TOKENS: Record<string, number> = { w: 4, 'h.': 3, h: 2, 'q.': 1.5, q: 1, '8.': 0.75, '8': 0.5, '16': 0.25, t: 1 / 3 };

/**
 * "E4:q G4:8 A4:8 B4:h r:q" — note:duration (q h w 8 16, dotted "q."), "r" for a rest.
 * A missing duration repeats the previous one (default q).
 */
export function parseMotif(text: string): MotifNote[] {
  let last = 1;
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const [n, d] = tok.split(':');
      if (d !== undefined) {
        const v = DUR_TOKENS[d] ?? Number(d);
        if (!Number.isFinite(v) || v <= 0) throw new Error(`Bad duration "${d}" in "${tok}"`);
        last = v;
      }
      if (/^r$/i.test(n)) return { midi: null, dur: last };
      const m = toMidi(n);
      if (!Number.isFinite(m)) throw new Error(`Bad note "${n}"`);
      return { midi: m, dur: last };
    });
}

export function motifToText(m: MotifNote[], names: (midi: number) => string): string {
  const rev = Object.entries(DUR_TOKENS);
  return m
    .map((n) => {
      const d = rev.find(([, v]) => Math.abs(v - n.dur) < 1e-6)?.[0] ?? String(n.dur);
      return `${n.midi === null ? 'r' : names(n.midi)}:${d}`;
    })
    .join(' ');
}

/* ---------------- scale-degree mapping ---------------- */

interface Degree {
  /** diatonic index counting from the tonic in octave 0 (can be negative) */
  step: number;
  /** chromatic deviation from the mode's note */
  alt: number;
}

function toDegree(midi: number, tonicPc: number, steps: number[]): Degree {
  const rel = midi - tonicPc;
  const oct = Math.floor(rel / 12);
  const pc = ((rel % 12) + 12) % 12;
  let best = 0;
  for (let i = 0; i < 7; i++) if (Math.abs(steps[i] - pc) < Math.abs(steps[best] - pc)) best = i;
  return { step: oct * 7 + best, alt: pc - steps[best] };
}

function fromDegree(d: Degree, tonicPc: number, steps: number[]): number {
  const oct = Math.floor(d.step / 7);
  const i = ((d.step % 7) + 7) % 7;
  return tonicPc + oct * 12 + steps[i] + d.alt;
}

export const modeOfKey = (key: KeyCtx): ModeName => (key.minor ? 'aeolian' : 'ionian');

const mapPitches = (m: MotifNote[], f: (midi: number) => number): MotifNote[] => m.map((n) => ({ ...n, midi: n.midi === null ? null : f(n.midi) }));

/* ---------------- transformations ---------------- */

export function transposeMotif(m: MotifNote[], semis: number): MotifNote[] {
  return mapPitches(m, (x) => x + semis);
}

/** Move every note `steps` scale steps within the key (a sequence step). */
export function diatonicShift(m: MotifNote[], key: KeyCtx, steps: number, mode: ModeName = modeOfKey(key)): MotifNote[] {
  const t = pcOf(key.tonic);
  const sc = MODE_STEPS[mode];
  return mapPitches(m, (x) => {
    const d = toDegree(x, t, sc);
    return fromDegree({ step: d.step + steps, alt: d.alt }, t, sc);
  });
}

/** Same scale degrees, other mode (major theme → minor, Dorian, Lydian…). */
export function changeMode(m: MotifNote[], key: KeyCtx, to: ModeName): MotifNote[] {
  const t = pcOf(key.tonic);
  const from = MODE_STEPS[modeOfKey(key)];
  const target = MODE_STEPS[to];
  return mapPitches(m, (x) => {
    const d = toDegree(x, t, from);
    const i = ((d.step % 7) + 7) % 7;
    // an altered note that is native in the target mode stays put (A minor's G♯ in A major)
    const alt = d.alt !== 0 && from[i] + d.alt === target[i] ? 0 : d.alt;
    return fromDegree({ step: d.step, alt }, t, target);
  });
}

/** Diatonic inversion (mirror) around the first note. */
export function invert(m: MotifNote[], key: KeyCtx): MotifNote[] {
  const t = pcOf(key.tonic);
  const sc = MODE_STEPS[modeOfKey(key)];
  const first = m.find((n) => n.midi !== null)?.midi;
  if (first === undefined || first === null) return m;
  const axis = toDegree(first, t, sc).step;
  return mapPitches(m, (x) => {
    const d = toDegree(x, t, sc);
    return fromDegree({ step: 2 * axis - d.step, alt: -d.alt }, t, sc);
  });
}

export function retrograde(m: MotifNote[]): MotifNote[] {
  return [...m].reverse();
}

export function scaleRhythm(m: MotifNote[], factor: number): MotifNote[] {
  return m.map((n) => ({ ...n, dur: n.dur * factor }));
}

/** First `count` notes, then sequenced up a step twice (fragmentation + sequence). */
export function fragment(m: MotifNote[], key: KeyCtx, count = 3): MotifNote[] {
  const frag = m.slice(0, Math.max(1, Math.min(count, m.length)));
  return [...frag, ...diatonicShift(frag, key, 1), ...diatonicShift(frag, key, 2)];
}

/* ---------------- reharmonization ---------------- */

export type HarmonyFlavour = 'diatonic' | 'modal' | 'cinematic';

export const FLAVOUR_INFO: Record<HarmonyFlavour, { name: string; desc: string }> = {
  diatonic: { name: 'Diatonic', desc: 'Chords from the key, functional order: clear and familiar.' },
  modal: { name: 'Borrowed / modal', desc: 'Borrowed chords (♭VI, ♭VII, iv…): darker, epic colours.' },
  cinematic: { name: 'Cinematic', desc: 'Chromatic mediants and major chords a third away: wonder and surprise.' },
};

const PALETTES: Record<HarmonyFlavour, { major: string[]; minor: string[] }> = {
  diatonic: { major: ['I', 'IV', 'V', 'vi', 'ii', 'iii'], minor: ['i', 'iv', 'V', 'VI', 'III', 'VII'] },
  modal: { major: ['I', 'bVI', 'bVII', 'iv', 'bIII', 'IV', 'vi'], minor: ['i', 'VI', 'VII', 'III', 'iv', 'v', 'bII'] },
  cinematic: { major: ['I', 'bVI', 'III', 'VI', 'bIII', 'IV', 'ii'], minor: ['i', 'VI', 'III', 'bvi', 'iv', 'VII', 'I'] },
};

export interface Harmonization {
  flavour: HarmonyFlavour;
  /** one Roman numeral per segment */
  romans: string[];
  segBeats: number;
}

/** One chord per `segBeats` beats: each chord must contain the segment's main note. */
export function harmonize(m: MotifNote[], key: KeyCtx, flavour: HarmonyFlavour, segBeats = 2): Harmonization {
  const total = m.reduce((s, n) => s + n.dur, 0);
  const segs = Math.max(1, Math.ceil(total / segBeats - 1e-6));
  const palette = PALETTES[flavour][key.minor ? 'minor' : 'major'];
  const chords = palette.map((r) => ({ r, pcs: new Set(parseRoman(r, key).pcs.map(pcOf)) }));
  const romans: string[] = [];
  for (let s = 0; s < segs; s++) {
    // notes sounding in this segment, weighted by duration (onset on the downbeat counts double)
    const weight = new Map<number, number>();
    let t = 0;
    for (const n of m) {
      const a = Math.max(t, s * segBeats);
      const b = Math.min(t + n.dur, (s + 1) * segBeats);
      if (n.midi !== null && b > a) {
        const pc = ((n.midi % 12) + 12) % 12;
        weight.set(pc, (weight.get(pc) ?? 0) + (b - a) * (Math.abs(t - s * segBeats) < 1e-6 ? 2 : 1));
      }
      t += n.dur;
    }
    const prev = romans[romans.length - 1];
    let best = palette[0];
    let bestScore = -Infinity;
    chords.forEach(({ r, pcs }, i) => {
      let score = 0;
      for (const [pc, w] of weight) score += pcs.has(pc) ? w : -w * 0.8;
      score -= i * 0.15; // palette order = preference
      if (r === prev) score -= 1.5;
      if (s === 0 && i === 0) score += 1; // start on the tonic when it fits
      if (s === segs - 1 && i === 0) score += 0.8; // and end there
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    });
    romans.push(best);
  }
  return { flavour, romans, segBeats };
}

/** Simple pad voicing under a melody: bass root + close triad below `ceiling`. */
export function padVoicing(roman: string, key: KeyCtx, ceiling: number): number[] {
  const c = parseRoman(roman, key);
  const rootPc = pcOf(c.root);
  let bass = 36 + rootPc; // C2..B2
  if (bass < 40) bass += 12;
  const top = Math.max(55, ceiling - 1);
  const notes: number[] = [];
  for (const p of c.pcs.slice(0, 3).map(pcOf)) {
    let m = top - ((top - p) % 12 + 12) % 12; // highest instance of pc at or below top
    while (m > top) m -= 12;
    notes.push(m);
  }
  return [bass, ...notes.sort((a, b) => a - b)];
}

/* ---------------- variations bundle ---------------- */

export interface Variation {
  id: string;
  name: string;
  desc: string;
  notes: MotifNote[];
}

export function variations(m: MotifNote[], key: KeyCtx): Variation[] {
  const minor = key.minor;
  const out: Variation[] = [
    { id: 'original', name: 'Original', desc: 'The motif as written.', notes: m },
    { id: 'sequence', name: 'Sequence (up a step)', desc: 'The same shape one scale step higher: builds momentum when repeated.', notes: diatonicShift(m, key, 1) },
    {
      id: 'mode',
      name: minor ? 'Major mode' : 'Minor mode',
      desc: minor ? 'Same degrees in major: hope, victory, the hero restored.' : 'Same degrees in minor: loss, threat, the hero in trouble.',
      notes: changeMode(m, key, minor ? 'ionian' : 'aeolian'),
    },
    { id: 'lydian', name: 'Lydian', desc: 'Raised 4th: the motif turns magical, weightless.', notes: changeMode(m, key, 'lydian') },
    { id: 'dorian', name: 'Dorian', desc: 'Minor with a raised 6th: noble, determined, folk-like.', notes: changeMode(m, key, 'dorian') },
    { id: 'phrygian', name: 'Phrygian', desc: 'Lowered 2nd: the villain’s version, dark and exotic.', notes: changeMode(m, key, 'phrygian') },
    { id: 'inversion', name: 'Inversion', desc: 'Every interval flipped (up becomes down): recognisable rhythm, new contour.', notes: invert(m, key) },
    { id: 'retrograde', name: 'Retrograde', desc: 'Played backwards: a hidden, mirrored reference.', notes: retrograde(m) },
    { id: 'augmentation', name: 'Augmentation', desc: 'Twice as slow: grand, solemn, majestic (end credits, a funeral).', notes: scaleRhythm(m, 2) },
    { id: 'diminution', name: 'Diminution', desc: 'Twice as fast: urgent, playful, a chase.', notes: scaleRhythm(m, 0.5) },
    { id: 'fragment', name: 'Fragmentation', desc: 'The head of the motif, sequenced upward: development and build-up.', notes: fragment(m, key, Math.min(3, Math.max(2, Math.ceil(m.length / 2)))) },
  ];
  return out;
}

/** VexFlow duration for a beat length (approximate for odd values). */
export function vexDuration(beats: number): string {
  const table: [number, string][] = [
    [4, 'w'],
    [3, 'hd'],
    [2, 'h'],
    [1.5, 'qd'],
    [1, 'q'],
    [0.75, '8d'],
    [0.5, '8'],
    [0.25, '16'],
  ];
  let best = table[0];
  for (const t of table) if (Math.abs(t[0] - beats) < Math.abs(best[0] - beats)) best = t;
  return best[1];
}

export { parseNote };
