/**
 * Track D drills (composer): instrument ranges, transposing instruments,
 * orchestral voicing doctor, motif transformations by ear.
 */
import type { Rng } from '../engine/rng';
import { INSTRUMENTS, TRANSPOSERS, type Family, type Instrument } from '../engine/orchestra/instruments';
import { ORCH_RULE_LABELS, checkOrchestralVoicing, noteLabel, type OrchIssue, type OrchRule } from '../engine/orchestra/voicingCheck';
import { midiToName, prettyNote, toMidi, transpose } from '../engine/theory';
import {
  changeMode,
  diatonicShift,
  fragment,
  invert,
  parseMotif,
  retrograde,
  scaleRhythm,
  transposeMotif,
  type MotifNote,
} from '../engine/motif';
import type { KeyCtx } from '../engine/harmony/roman';
import type { CheckResult, ExerciseLogic } from './types';

const clefFor = (midi: number) => (midi >= 60 ? 'treble' : 'bass');

/* ================================================================== */
/* Instrument ranges                                                   */
/* ================================================================== */

export type RangeAnswer = 'comfortable' | 'edge' | 'out';
export const RANGE_LABELS: Record<RangeAnswer, string> = {
  comfortable: 'Yes, comfortably',
  edge: 'Yes, but at the edge',
  out: 'No, out of range',
};

export interface RangeQ {
  kind: 'judge' | 'which';
  instrument: string;
  /** sounding pitch */
  note: string;
  answer: string;
  options: string[];
}

const RANGE_LEVELS: { families: Family[]; kind: 'judge' | 'which' }[] = [
  { families: ['strings'], kind: 'judge' },
  { families: ['woodwinds'], kind: 'judge' },
  { families: ['brass'], kind: 'judge' },
  { families: ['strings', 'woodwinds', 'brass'], kind: 'judge' },
  { families: ['strings', 'woodwinds', 'brass'], kind: 'which' },
];

export function rangeStatus(inst: Instrument, midi: number): RangeAnswer {
  if (midi < inst.range[0] || midi > inst.range[1]) return 'out';
  if (midi < inst.comfortable[0] || midi > inst.comfortable[1]) return 'edge';
  return 'comfortable';
}

export const instrumentRange: ExerciseLogic<RangeQ> = {
  id: 'instrument-range',
  title: 'Instrument ranges',
  area: 'theory',
  description: 'Can this instrument play this note, and is it a good register? Learn the ranges by heart: no more parts the player can’t play.',
  levels: ['Strings', 'Woodwinds', 'Brass', 'Whole orchestra', 'Which instrument?'],
  generate(level, rng) {
    const cfg = RANGE_LEVELS[Math.min(level, RANGE_LEVELS.length - 1)];
    const pool = INSTRUMENTS.filter((i) => cfg.families.includes(i.family));
    if (cfg.kind === 'which') {
      for (;;) {
        const inst = rng.pick(pool);
        // a note this instrument plays comfortably but at least two others can't play at all
        const midi = rng.chance(0.5) ? rng.int(inst.comfortable[0], inst.comfortable[0] + 4) : rng.int(inst.comfortable[1] - 4, inst.comfortable[1]);
        const wrong = pool.filter((i) => i.id !== inst.id && rangeStatus(i, midi) === 'out');
        if (wrong.length < 3) continue;
        const options = rng.shuffle([inst.id, ...rng.shuffle(wrong).slice(0, 3).map((i) => i.id)]);
        return { kind: 'which', instrument: inst.id, note: midiToName(midi, rng.chance(0.4)), answer: inst.id, options };
      }
    }
    const inst = rng.pick(pool);
    const want: RangeAnswer = rng.pick(['comfortable', 'comfortable', 'edge', 'out']);
    let midi: number;
    if (want === 'comfortable') midi = rng.int(inst.comfortable[0], inst.comfortable[1]);
    else if (want === 'edge') {
      const low = inst.comfortable[0] > inst.range[0];
      const high = inst.range[1] > inst.comfortable[1];
      midi = low && (!high || rng.chance(0.5)) ? rng.int(inst.range[0], inst.comfortable[0] - 1) : rng.int(inst.comfortable[1] + 1, inst.range[1]);
    } else midi = rng.chance(0.6) ? inst.range[0] - rng.int(1, 5) : inst.range[1] + rng.int(1, 5);
    return { kind: 'judge', instrument: inst.id, note: midiToName(midi, rng.chance(0.4)), answer: rangeStatus(inst, midi), options: ['comfortable', 'edge', 'out'] };
  },
};

export function checkRange(q: RangeQ, picked: string): CheckResult {
  const inst = INSTRUMENTS.find((i) => i.id === q.instrument)!;
  const range = `${noteLabel(inst.range[0])}–${noteLabel(inst.range[1])} (comfortable ${noteLabel(inst.comfortable[0])}–${noteLabel(inst.comfortable[1])})`;
  if (q.kind === 'which') {
    const pickedInst = INSTRUMENTS.find((i) => i.id === picked);
    return {
      correct: picked === q.answer,
      expected: inst.name,
      given: pickedInst?.name,
      feedback: `${inst.name}: ${range}.${pickedInst && picked !== q.answer ? ` ${pickedInst.name}: ${noteLabel(pickedInst.range[0])}–${noteLabel(pickedInst.range[1])}.` : ''}`,
    };
  }
  return { correct: picked === q.answer, expected: RANGE_LABELS[q.answer as RangeAnswer], given: RANGE_LABELS[picked as RangeAnswer], feedback: `${inst.name} (sounding): ${range}.` };
}

export const clefForNote = (note: string) => clefFor(toMidi(note));

/* ================================================================== */
/* Transposing instruments                                             */
/* ================================================================== */

export interface TransposeQ {
  instrument: string;
  /** shown note */
  shown: string;
  /** 'concert→written' or 'written→concert' */
  direction: 'to-written' | 'to-concert';
  answer: string;
  options: string[];
}

const INTERVAL_FOR: Record<number, string> = { 2: '2M', 3: '3m', 7: '5P', 9: '6M', 12: '8P', [-12]: '-8P' };
const neg = (iv: string) => (iv.startsWith('-') ? iv.slice(1) : `-${iv}`);

const TRANSPOSE_LEVELS: { ids: string[]; dir: 'to-written' | 'to-concert' | 'mixed' }[] = [
  { ids: ['clarinet', 'trumpet'], dir: 'to-written' },
  { ids: ['horn', 'english-horn'], dir: 'to-written' },
  { ids: ['piccolo', 'bass', 'clarinet', 'horn'], dir: 'to-written' },
  { ids: ['clarinet-a', 'alto-sax', 'clarinet', 'horn'], dir: 'to-written' },
  { ids: ['clarinet', 'trumpet', 'horn', 'clarinet-a', 'alto-sax'], dir: 'to-concert' },
];

const CONCERT_POOL = ['C4', 'D4', 'E♭4', 'E4', 'F4', 'G4', 'A4', 'B♭4', 'B4', 'C5', 'D5', 'F♯4', 'A♭4', 'E5'].map((n) => n.replace('♭', 'b').replace('♯', '#'));

export const transposition: ExerciseLogic<TransposeQ> = {
  id: 'transposition',
  title: 'Transposing instruments',
  area: 'reading',
  description: 'Concert pitch ↔ written pitch for B♭, F, A, E♭ and octave instruments: read and write horn and clarinet parts without thinking twice.',
  levels: ['B♭ clarinet & trumpet', 'Horn & English horn (F)', 'Octave transposers', 'A clarinet & E♭ sax', 'Written → concert'],
  generate(level, rng) {
    const cfg = TRANSPOSE_LEVELS[Math.min(level, TRANSPOSE_LEVELS.length - 1)];
    const id = rng.pick(cfg.ids);
    const inst = TRANSPOSERS.find((t) => t.id === id)!;
    const iv = INTERVAL_FOR[inst.transpose];
    let concert = rng.pick(CONCERT_POOL);
    if (inst.id === 'piccolo') concert = transpose(concert, '8P');
    if (inst.id === 'bass') concert = transpose(concert, '-15P');
    const written = transpose(concert, iv);
    const toWritten = cfg.dir === 'to-written';
    const shown = toWritten ? concert : written;
    const answer = toWritten ? written : concert;
    // distractors: wrong direction, other common transpositions, octave slip
    const pool = new Set<string>([
      transpose(shown, toWritten ? neg(iv) : iv),
      ...['2M', '5P', '4P', '3m', '6M', '8P', '-8P', '-2M', '-5P']
        .filter((x) => x !== (toWritten ? iv : neg(iv)))
        .map((x) => transpose(shown, x)),
      shown,
    ]);
    pool.delete(answer);
    const sameMidi = (a: string, b: string) => toMidi(a) === toMidi(b);
    const distinct = [...pool].filter((p) => !sameMidi(p, answer));
    const options = rng.shuffle([answer, ...rng.shuffle(distinct).slice(0, 3)]);
    return { instrument: inst.id, shown, direction: toWritten ? 'to-written' : 'to-concert', answer, options };
  },
};

export function transposerName(id: string) {
  return TRANSPOSERS.find((t) => t.id === id)!.name;
}

export function checkTransposition(q: TransposeQ, picked: string): CheckResult {
  const t = TRANSPOSERS.find((x) => x.id === q.instrument)!;
  return {
    correct: picked === q.answer,
    expected: prettyNote(q.answer, true),
    given: prettyNote(picked, true),
    feedback: `${t.name} sounds ${t.transposeLabel} than written, so the part is written ${t.transpose > 0 ? 'higher' : 'lower'} than it sounds.`,
  };
}

/* ================================================================== */
/* Voicing doctor                                                      */
/* ================================================================== */

export type DoctorTarget = 'low-interval' | 'gap' | 'inverted-spacing' | 'none';
export const DOCTOR_LABELS: Record<DoctorTarget, string> = {
  'low-interval': ORCH_RULE_LABELS['low-interval'],
  gap: ORCH_RULE_LABELS.gap,
  'inverted-spacing': ORCH_RULE_LABELS['inverted-spacing'],
  none: 'Well voiced',
};

export interface DoctorQ {
  notes: number[];
  chordName: string;
  target: DoctorTarget;
  issues: OrchIssue[];
  ensemble: 'strings' | 'brass';
  options: DoctorTarget[];
}

const DOCTOR_LEVELS: { set: DoctorTarget[]; sevenths: boolean }[] = [
  { set: ['none', 'low-interval'], sevenths: false },
  { set: ['none', 'low-interval', 'gap'], sevenths: false },
  { set: ['none', 'low-interval', 'gap', 'inverted-spacing'], sevenths: false },
  { set: ['none', 'low-interval', 'gap', 'inverted-spacing'], sevenths: true },
];

const QUALITIES = [
  { name: '', iv: [0, 4, 7] },
  { name: 'm', iv: [0, 3, 7] },
];
const SEVENTHS = [
  { name: 'maj7', iv: [0, 4, 7, 11] },
  { name: 'm7', iv: [0, 3, 7, 10] },
  { name: '7', iv: [0, 4, 7, 10] },
];

/** Candidate voicings of a chord (root in the bass) in a given style. */
function buildVoicing(root: number, iv: number[], style: DoctorTarget, rng: Rng): number[] {
  const [, third, fifth, seventh] = iv;
  const upper = [third, fifth, ...(seventh !== undefined ? [seventh] : []), 0];
  switch (style) {
    case 'none': {
      // harmonic series: root, octave (or 5th), then the colour tones close together higher up
      const mid = root + 12 + (rng.chance(0.5) ? 7 : 0);
      const top = root + 24;
      const close = upper.map((u) => top + u).sort((a, b) => a - b);
      return [root, mid, ...close.slice(0, rng.int(3, close.length))];
    }
    case 'low-interval': {
      // the 3rd (and 5th) crammed right above a low bass
      return [root, root + third, root + fifth, root + 12, root + 19, ...(seventh !== undefined ? [root + 12 + seventh] : [])];
    }
    case 'gap':
      return [root, root + 7, root + 31 + (rng.chance(0.5) ? 0 : 5), root + 36 + third].sort((a, b) => a - b);
    case 'inverted-spacing': {
      // close triad at the bottom, wide intervals on top
      const r = root + 12;
      return [r, r + third, r + fifth, r + 12 + third, r + 24];
    }
  }
}

export const voicingDoctor: ExerciseLogic<DoctorQ> = {
  id: 'voicing-doctor',
  title: 'Voicing doctor',
  area: 'keyboard',
  description: 'Hear and see an orchestral chord voicing: is it clear and full, or muddy, hollow, upside-down? Train the eye and ear that stops mud before it reaches the mix.',
  levels: ['Mud or clear?', 'Add holes', 'Add spacing', 'Seventh chords'],
  generate(level, rng) {
    const cfg = DOCTOR_LEVELS[Math.min(level, DOCTOR_LEVELS.length - 1)];
    for (let attempt = 0; attempt < 200; attempt++) {
      const target = rng.pick(cfg.set);
      const q = rng.pick(cfg.sevenths && rng.chance(0.6) ? SEVENTHS : QUALITIES);
      const root = rng.int(36, 47); // C2..B2
      const notes = buildVoicing(root, q.iv, target, rng);
      const thirdPc = (root + q.iv[1]) % 12;
      const issues = checkOrchestralVoicing(notes, { thirdPc });
      const rules = new Set<OrchRule>(issues.map((i) => i.rule));
      // the planted problem must be the only one detected (or none for a clean voicing)
      const ok = target === 'none' ? rules.size === 0 : rules.has(target) && [...rules].every((r) => r === target);
      if (!ok || Math.max(...notes) > 96) continue;
      const chordName = `${midiToName(root, true).replace(/\d+$/, '')}${q.name}`;
      return { notes, chordName, target, issues, ensemble: rng.chance(0.5) ? 'strings' : 'brass', options: cfg.set };
    }
    throw new Error('voicing doctor: generation failed');
  },
};

export function checkDoctor(q: DoctorQ, picked: DoctorTarget): CheckResult {
  return {
    correct: picked === q.target,
    expected: DOCTOR_LABELS[q.target],
    given: DOCTOR_LABELS[picked],
    feedback: q.issues.length ? q.issues.map((i) => i.message).join(' ') : 'Wide intervals low, close intervals high, no holes: like the harmonic series, so it sounds full and clear.',
  };
}

/* ================================================================== */
/* Motif transformations by ear                                        */
/* ================================================================== */

export type MotifTransform = 'sequence' | 'mode' | 'inversion' | 'retrograde' | 'augmentation' | 'diminution' | 'fragment';

export const TRANSFORM_LABELS: Record<MotifTransform, string> = {
  sequence: 'Sequence (moved up a step)',
  mode: 'Mode change (major ↔ minor)',
  inversion: 'Inversion (upside down)',
  retrograde: 'Retrograde (backwards)',
  augmentation: 'Augmentation (slower)',
  diminution: 'Diminution (faster)',
  fragment: 'Fragmentation (head, sequenced)',
};

/** Hand-written motifs in C major / A minor (asymmetric, so every transform sounds different). */
const MOTIFS: { text: string; minor: boolean }[] = [
  { text: 'C4:q E4:q G4:h F4:q E4:q D4:h', minor: false },
  { text: 'G4:q. A4:8 B4:q D5:q C5:h', minor: false },
  { text: 'E4:8 G4:8 C5:q B4:q G4:q A4:h', minor: false },
  { text: 'C5:q G4:8 A4:8 B4:q E4:q F4:h', minor: false },
  { text: 'A4:q C5:q E5:h D5:8 C5:8 B4:q', minor: true },
  { text: 'E4:q A4:q. B4:8 C5:q B4:q G#4:h', minor: true },
  { text: 'A3:8 C4:8 E4:q D4:q F4:q E4:h', minor: true },
  { text: 'D4:q F4:q A4:q. G4:8 F4:q E4:h', minor: true },
];

const TRANSFORM_LEVELS: MotifTransform[][] = [
  ['sequence', 'augmentation', 'diminution'],
  ['sequence', 'mode', 'augmentation', 'diminution'],
  ['sequence', 'mode', 'inversion', 'retrograde', 'augmentation'],
  ['sequence', 'mode', 'inversion', 'retrograde', 'augmentation', 'diminution', 'fragment'],
];

export interface MotifEarQ {
  key: KeyCtx;
  original: MotifNote[];
  variant: MotifNote[];
  transform: MotifTransform;
  options: MotifTransform[];
}

function applyTransform(t: MotifTransform, m: MotifNote[], key: KeyCtx): MotifNote[] {
  switch (t) {
    case 'sequence':
      return diatonicShift(m, key, 1);
    case 'mode':
      return changeMode(m, key, key.minor ? 'ionian' : 'aeolian');
    case 'inversion':
      return invert(m, key);
    case 'retrograde':
      return retrograde(m);
    case 'augmentation':
      return scaleRhythm(m, 2);
    case 'diminution':
      return scaleRhythm(m, 0.5);
    case 'fragment':
      return fragment(m, key, 3);
  }
}

const sameMotif = (a: MotifNote[], b: MotifNote[]) => a.length === b.length && a.every((n, i) => n.midi === b[i].midi && n.dur === b[i].dur);

export const motifEar: ExerciseLogic<MotifEarQ> = {
  id: 'motif-ear',
  title: 'Motif transformations by ear',
  area: 'ear',
  description: 'Hear a motif, then a variation: how was it transformed? The leitmotif toolbox, trained by ear.',
  levels: ['Sequence & rhythm', 'Add mode change', 'Add inversion & retrograde', 'All transformations'],
  generate(level, rng) {
    const set = TRANSFORM_LEVELS[Math.min(level, TRANSFORM_LEVELS.length - 1)];
    for (;;) {
      const src = rng.pick(MOTIFS);
      const shift = rng.pick([0, 2, -3, 5, -2, 7]);
      const key: KeyCtx = { tonic: midiToName((src.minor ? 69 : 60) + shift, true).replace(/\d+$/, ''), minor: src.minor };
      const original = transposeMotif(parseMotif(src.text), shift);
      const transform = rng.pick(set);
      const variant = applyTransform(transform, original, key);
      // every option must give a different result, so the answer is unambiguous
      const others = set.filter((t) => t !== transform).map((t) => applyTransform(t, original, key));
      if (sameMotif(variant, original) || others.some((o) => sameMotif(o, variant))) continue;
      return { key, original, variant, transform, options: set };
    }
  },
};

export function checkMotifEar(q: MotifEarQ, picked: MotifTransform): CheckResult {
  const tips: Record<MotifTransform, string> = {
    sequence: 'Same shape and rhythm, everything one step higher.',
    mode: 'Same contour and rhythm, but the 3rd (and 6th/7th) changed: the mood flips.',
    inversion: 'Same rhythm, but where the original went up, the variant goes down.',
    retrograde: 'The last note comes first: the rhythm is reversed too.',
    augmentation: 'Same notes, every duration doubled.',
    diminution: 'Same notes, every duration halved.',
    fragment: 'Only the opening notes, repeated higher and higher.',
  };
  return { correct: picked === q.transform, expected: TRANSFORM_LABELS[q.transform], given: TRANSFORM_LABELS[picked], feedback: tips[q.transform] };
}
