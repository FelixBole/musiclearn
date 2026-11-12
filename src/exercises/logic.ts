/**
 * Pure question generators and checkers for all drills.
 * No React / DOM here so everything is unit-testable.
 */
import type { Rng } from '../engine/rng';
import {
  CHORD_QUALITIES,
  LETTERS,
  SIMPLE_INTERVALS,
  chordQualityById,
  describeInterval,
  diatonicStep,
  fromStep,
  intervalById,
  keyInfo,
  keyName,
  majorKeyByAlteration,
  noteToString,
  parseNote,
  prettyNote,
  prettyPc,
  spellChord,
  toMidi,
  transpose,
  voiceChord,
  type Letter,
} from '../engine/theory';
import { Interval } from 'tonal';
import type { CheckResult, ExerciseLogic } from './types';

/* ---------------- helpers ---------------- */

export function makeOptions<T>(correct: T, pool: readonly T[], n: number, rng: Rng): T[] {
  const others = rng.shuffle(pool.filter((p) => p !== correct)).slice(0, n - 1);
  return rng.shuffle([correct, ...others]);
}

/** Random natural/accidental note between two notes (inclusive, by staff step). */
export function randomNoteInRange(low: string, high: string, rng: Rng, accidentals = false): string {
  const step = rng.int(diatonicStep(low), diatonicStep(high));
  const acc = accidentals ? rng.pick([-1, 0, 0, 1]) : 0;
  return noteToString(fromStep(step, acc));
}

/* ================================================================== */
/* Note reading                                                        */
/* ================================================================== */

type ReadClef = 'treble' | 'bass' | 'alto' | 'tenor';

export interface NoteReadingQ {
  clef: ReadClef;
  note: string;
  accidentals: boolean;
}

const READ_RANGES: Record<ReadClef, { staff: [string, string]; ledger: [string, string] }> = {
  treble: { staff: ['E4', 'F5'], ledger: ['A3', 'C6'] },
  bass: { staff: ['G2', 'A3'], ledger: ['C2', 'E4'] },
  alto: { staff: ['F3', 'G4'], ledger: ['D3', 'B4'] },
  tenor: { staff: ['D3', 'E4'], ledger: ['B2', 'G4'] },
};

export const noteReading: ExerciseLogic<NoteReadingQ> = {
  id: 'note-reading',
  title: 'Note reading',
  area: 'reading',
  description: 'Name (or play) the note on the staff. Builds instant recognition in all orchestral clefs.',
  levels: [
    'Treble clef · on the staff',
    'Bass clef · on the staff',
    'Treble & bass · ledger lines',
    'Treble & bass · sharps & flats',
    'Alto clef (viola)',
    'Tenor clef (cello, bassoon, trombone)',
    'All four clefs mixed',
  ],
  generate(level, rng) {
    const cfg: { clefs: ReadClef[]; ledger: boolean; acc: boolean } = [
      { clefs: ['treble'], ledger: false, acc: false },
      { clefs: ['bass'], ledger: false, acc: false },
      { clefs: ['treble', 'bass'], ledger: true, acc: false },
      { clefs: ['treble', 'bass'], ledger: true, acc: true },
      { clefs: ['alto'], ledger: true, acc: false },
      { clefs: ['tenor'], ledger: true, acc: false },
      { clefs: ['treble', 'bass', 'alto', 'tenor'], ledger: true, acc: true },
    ][Math.min(level, 6)] as { clefs: ReadClef[]; ledger: boolean; acc: boolean };
    const clef = rng.pick(cfg.clefs);
    const [low, high] = cfg.ledger ? READ_RANGES[clef].ledger : READ_RANGES[clef].staff;
    return { clef, note: randomNoteInRange(low, high, rng, cfg.acc), accidentals: cfg.acc };
  },
};

/** Check by name (letter + accidental) — octave not required. */
export function checkNoteName(q: NoteReadingQ, letter: Letter, acc: number): CheckResult {
  const n = parseNote(q.note);
  const correct = n.letter === letter && n.acc === acc;
  return {
    correct,
    expected: prettyNote(q.note, true),
    given: `${letter}${acc > 0 ? '♯' : acc < 0 ? '♭' : ''}`,
    feedback: octaveHint(q.note),
  };
}

/** Check a played pitch — exact octave required (enharmonics accepted). */
export function checkNotePlayed(q: NoteReadingQ, midi: number): CheckResult {
  const target = toMidi(q.note);
  const correct = midi === target;
  const sameClass = !correct && (midi - target) % 12 === 0;
  return {
    correct,
    expected: prettyNote(q.note, true),
    feedback: sameClass
      ? `Right note name, wrong octave — you played ${midi < target ? 'too low' : 'too high'}. ${octaveHint(q.note)}`
      : octaveHint(q.note),
  };
}

function octaveHint(note: string): string {
  const m = toMidi(note);
  if (m === 60) return 'Middle C — the note between the treble and bass staves.';
  const diff = diatonicStep(note) - diatonicStep('C4');
  if (Math.abs(diff) <= 2) return `${Math.abs(diff)} step${Math.abs(diff) === 1 ? '' : 's'} ${diff > 0 ? 'above' : 'below'} middle C.`;
  return `Octave ${parseNote(note).octave} (middle C is C4).`;
}

/* ================================================================== */
/* Key signatures                                                      */
/* ================================================================== */

export interface KeySigQ {
  clef: 'treble' | 'bass';
  majorTonic: string;
  minor: boolean;
  /** tonic of the answer key */
  answer: string;
  options: string[];
}

export const keySignatures: ExerciseLogic<KeySigQ> = {
  id: 'key-signatures',
  title: 'Key signatures',
  area: 'reading',
  description: 'Identify the key from its signature: the first thing to read on any part.',
  levels: [
    'Major keys · up to 2 ♯/♭',
    'Major keys · up to 4 ♯/♭',
    'All major keys',
    'Minor keys · up to 4 ♯/♭',
    'All major & minor keys',
  ],
  generate(level, rng) {
    const maxAcc = [2, 4, 7, 4, 7][Math.min(level, 4)];
    const minor = level === 3 ? true : level === 4 ? rng.chance(0.5) : false;
    const alteration = rng.int(-maxAcc, maxAcc);
    const majorTonic = majorKeyByAlteration(alteration);
    const answer = minor ? keyInfo(majorTonic).relative : majorTonic;
    const pool = [];
    for (let a = -maxAcc; a <= maxAcc; a++) {
      const t = majorKeyByAlteration(a);
      pool.push(minor ? keyInfo(t).relative : t);
    }
    return { clef: rng.pick(['treble', 'bass'] as const), majorTonic, minor, answer, options: makeOptions(answer, pool, 6, rng) };
  },
};

export function checkKeySig(q: KeySigQ, picked: string): CheckResult {
  const info = keyInfo(q.majorTonic);
  const n = Math.abs(info.alteration);
  const accName = info.alteration > 0 ? 'sharp' : 'flat';
  return {
    correct: picked === q.answer,
    expected: keyName(q.answer, q.minor),
    given: keyName(picked, q.minor),
    feedback:
      n === 0
        ? 'No sharps or flats: C major / A minor.'
        : `${n} ${accName}${n > 1 ? 's' : ''} = ${keyName(q.majorTonic)}${q.minor ? ` → relative minor ${keyName(q.answer, true)} (down a minor 3rd)` : ''}. ${
            info.alteration > 0 ? 'Tip: the last sharp is the leading tone — go up a half step.' : n > 1 ? 'Tip: the second-to-last flat is the key name.' : 'One flat = F major.'
          }`,
  };
}

/* ================================================================== */
/* Interval ear training                                               */
/* ================================================================== */

export interface IntervalEarQ {
  root: number;
  interval: string; // id, e.g. "m3"
  direction: 'asc' | 'desc' | 'harm';
  options: string[];
}

const INTERVAL_LEVELS: { set: string[]; dirs: IntervalEarQ['direction'][] }[] = [
  { set: ['M2', 'M3', 'P5', 'P8'], dirs: ['asc'] },
  { set: ['M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'P8'], dirs: ['asc'] },
  { set: SIMPLE_INTERVALS.filter((i) => i.id !== 'P1').map((i) => i.id), dirs: ['asc'] },
  { set: SIMPLE_INTERVALS.filter((i) => i.id !== 'P1').map((i) => i.id), dirs: ['asc', 'desc'] },
  { set: SIMPLE_INTERVALS.filter((i) => i.id !== 'P1').map((i) => i.id), dirs: ['harm'] },
  { set: SIMPLE_INTERVALS.filter((i) => i.id !== 'P1').map((i) => i.id), dirs: ['asc', 'desc', 'harm'] },
];

export const intervalEar: ExerciseLogic<IntervalEarQ> = {
  id: 'interval-ear',
  title: 'Intervals by ear',
  area: 'ear',
  description: 'Hear two notes, name the distance. The foundation for transcribing melodies and voicings.',
  levels: [
    'M2 · M3 · P5 · Octave (ascending)',
    'Add m3 · P4 · M6',
    'All intervals ascending',
    'Ascending & descending',
    'Harmonic (played together)',
    'Everything mixed',
  ],
  generate(level, rng) {
    const cfg = INTERVAL_LEVELS[Math.min(level, INTERVAL_LEVELS.length - 1)];
    const interval = rng.pick(cfg.set);
    const direction = rng.pick(cfg.dirs);
    const root = rng.int(direction === 'desc' ? 60 : 48, direction === 'desc' ? 76 : 64);
    return { root, interval, direction, options: cfg.set };
  },
};

export function intervalEarNotes(q: IntervalEarQ): [number, number] {
  const semis = intervalById(q.interval).semitones;
  return q.direction === 'desc' ? [q.root, q.root - semis] : [q.root, q.root + semis];
}

export const INTERVAL_SONGS: Record<string, string> = {
  m2: 'Jaws theme',
  M2: 'Happy Birthday (first two notes)',
  m3: 'Greensleeves / Smoke on the Water',
  M3: 'Oh When the Saints',
  P4: 'Here Comes the Bride / Amazing Grace',
  TT: 'The Simpsons / Maria (West Side Story)',
  P5: 'Star Wars main theme (first leap)',
  m6: 'The Entertainer (E–C) / Love Story theme',
  M6: 'My Bonnie / NBC chime',
  m7: 'Star Trek original theme',
  M7: 'Take On Me (chorus leap)',
  P8: 'Somewhere Over the Rainbow',
};

export function checkIntervalEar(q: IntervalEarQ, picked: string): CheckResult {
  const info = intervalById(q.interval);
  const song = INTERVAL_SONGS[q.interval];
  return {
    correct: picked === q.interval,
    expected: info.name,
    given: intervalById(picked).name,
    feedback: `${info.semitones} semitones${song ? ` · think: ${song}` : ''}`,
  };
}

/* ================================================================== */
/* Chord quality ear training                                          */
/* ================================================================== */

export interface ChordEarQ {
  quality: string;
  midis: number[];
  inversion: number;
  options: string[];
}

const CHORD_EAR_LEVELS: { set: string[]; inversions: boolean }[] = [
  { set: ['maj', 'min'], inversions: false },
  { set: ['maj', 'min', 'dim', 'aug'], inversions: false },
  { set: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4'], inversions: false },
  { set: ['maj', 'min', 'dim', 'aug'], inversions: true },
  { set: ['maj7', 'dom7', 'min7', 'm7b5', 'dim7'], inversions: false },
  { set: ['maj', 'min', 'dim', 'aug', 'sus4', 'maj7', 'dom7', 'min7', 'm7b5', 'dim7', 'mMaj7'], inversions: true },
];

export const chordQualityEar: ExerciseLogic<ChordEarQ> = {
  id: 'chord-quality-ear',
  title: 'Chord quality by ear',
  area: 'ear',
  description: 'Major, minor, diminished, suspended, sevenths… recognise the colour of a chord instantly.',
  levels: ['Major vs minor', 'Add diminished & augmented', 'Add sus2 & sus4', 'Triads in inversions', 'Seventh chords', 'Everything'],
  generate(level, rng) {
    const cfg = CHORD_EAR_LEVELS[Math.min(level, CHORD_EAR_LEVELS.length - 1)];
    const quality = rng.pick(cfg.set);
    const q = chordQualityById(quality);
    const root = rng.int(48, 60);
    const inversion = cfg.inversions ? rng.int(0, q.intervals.length - 1) : 0;
    const ivs = q.intervals.map((i, idx) => (idx < inversion ? i + 12 : i)).sort((a, b) => a - b);
    return { quality, midis: ivs.map((i) => root + i), inversion, options: cfg.set };
  },
};

export function checkChordEar(q: ChordEarQ, picked: string): CheckResult {
  const info = chordQualityById(q.quality);
  const hints: Record<string, string> = {
    maj: 'bright, stable',
    min: 'darker, still stable',
    dim: 'tense, wants to resolve — two stacked minor 3rds',
    aug: 'dreamy/unsettled — two stacked major 3rds, great for mystery cues',
    sus2: 'open, ambiguous — no 3rd',
    sus4: 'open, wants to fall to the 3rd',
    maj7: 'lush, cinematic, a bit nostalgic',
    dom7: 'bluesy tension that pulls to a chord a 5th below',
    min7: 'soft, mellow',
    m7b5: 'dark and yearning — the ii of minor keys',
    dim7: 'maximum tension, horror/suspense, symmetrical',
    mMaj7: 'noir / spy-movie mystery',
  };
  return {
    correct: picked === q.quality,
    expected: info.name,
    given: chordQualityById(picked).name,
    feedback: `${hints[q.quality] ?? ''}${q.inversion ? ` · played in ${['root position', '1st', '2nd', '3rd'][q.inversion]} inversion` : ''}`,
  };
}

/* ================================================================== */
/* Interval reading (staff)                                            */
/* ================================================================== */

export interface IntervalReadQ {
  clef: 'treble' | 'bass';
  lower: string;
  upper: string;
  withQuality: boolean;
  answer: string;
  options: string[];
}

const NUMBER_NAMES = ['Unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'Octave'];

export const intervalReading: ExerciseLogic<IntervalReadQ> = {
  id: 'interval-reading',
  title: 'Intervals on the staff',
  area: 'reading',
  description: 'Read the distance between two written notes — quickly reading harmony on paper starts here.',
  levels: ['Size only (2nd–octave)', 'Size · treble & bass', 'Size + quality (no accidentals)', 'Size + quality with accidentals'],
  generate(level, rng) {
    const clef = level === 0 ? 'treble' : rng.pick(['treble', 'bass'] as const);
    const withQuality = level >= 2;
    const [low, high] = clef === 'treble' ? ['C4', 'F5'] : ['E2', 'A3'];
    for (;;) {
      const lower = randomNoteInRange(low, high, rng, level >= 3);
      const size = rng.int(2, 8);
      const upperStep = fromStep(diatonicStep(lower) + size - 1);
      let upper = noteToString(upperStep);
      if (level >= 3 && rng.chance(0.35)) upper = noteToString({ ...upperStep, acc: rng.pick([-1, 1]) });
      if (!withQuality) {
        return { clef, lower, upper, withQuality, answer: NUMBER_NAMES[size - 1], options: NUMBER_NAMES.slice(1) };
      }
      const dist = Interval.distance(lower, upper);
      const ivl = Interval.get(dist);
      if (ivl.empty || Math.abs(ivl.alt) > 1 || ['dd', 'AA'].includes(ivl.q)) continue;
      const answer = describeInterval(dist);
      const pool = qualityPool(size);
      return { clef, lower, upper, withQuality, answer, options: makeOptions(answer, pool, Math.min(5, pool.length), rng).sort() };
    }
  },
};

function qualityPool(size: number): string[] {
  const perfect = [1, 4, 5, 8].includes(size);
  const qualities = perfect ? ['P', 'A', 'd'] : ['M', 'm', 'A', 'd'];
  const neighbors = [size - 1, size + 1].filter((s) => s >= 2 && s <= 8);
  const own = qualities.map((q) => describeInterval(`${size}${q}`));
  const near = neighbors.flatMap((s) => ([1, 4, 5, 8].includes(s) ? ['P'] : ['M', 'm']).map((q) => describeInterval(`${s}${q}`)));
  return [...new Set([...own, ...near])];
}

export function checkIntervalReading(q: IntervalReadQ, picked: string): CheckResult {
  const semis = toMidi(q.upper) - toMidi(q.lower);
  return {
    correct: picked === q.answer,
    expected: q.answer,
    given: picked,
    feedback: `${prettyNote(q.lower, true)} → ${prettyNote(q.upper, true)}: count letter names for the size (${intervalNumberText(q)}), then semitones for the quality (${semis}).`,
  };
}

function intervalNumberText(q: IntervalReadQ) {
  const size = diatonicStep(q.upper) - diatonicStep(q.lower) + 1;
  const letters: string[] = [];
  for (let s = 0; s < size; s++) letters.push(fromStep(diatonicStep(q.lower) + s).letter);
  return letters.join('-');
}

/* ================================================================== */
/* Chord spelling                                                      */
/* ================================================================== */

export interface ChordSpellQ {
  root: string;
  quality: string;
  /** correctly spelled pitch classes, root first */
  pcs: string[];
  /** a reference voicing (for playback/staff) */
  voicing: string[];
}

const NATURAL_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const COMMON_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const chordSpelling: ExerciseLogic<ChordSpellQ> = {
  id: 'chord-spelling',
  title: 'Chord spelling',
  area: 'theory',
  description: 'Build any chord from its name — on the keyboard or by spelling the notes.',
  levels: [
    'Major triads · natural roots',
    'Major & minor triads · all roots',
    'Add diminished & augmented',
    'Seventh chords',
    'Everything incl. sus & minor-major 7',
  ],
  generate(level, rng) {
    const sets = [
      { roots: NATURAL_ROOTS, q: ['maj'] },
      { roots: COMMON_ROOTS, q: ['maj', 'min'] },
      { roots: COMMON_ROOTS, q: ['maj', 'min', 'dim', 'aug'] },
      { roots: COMMON_ROOTS, q: ['maj7', 'dom7', 'min7', 'm7b5', 'dim7'] },
      { roots: COMMON_ROOTS, q: CHORD_QUALITIES.map((c) => c.id) },
    ];
    const cfg = sets[Math.min(level, sets.length - 1)];
    for (;;) {
      const root = rng.pick(cfg.roots);
      const quality = rng.pick(cfg.q);
      const pcs = spellChord(root, quality);
      // avoid double-sharps/flats at early levels (e.g. G#aug)
      if (level < 4 && pcs.some((p) => /##|bb/.test(p))) continue;
      const bassOct = toMidi(`${root}3`) < toMidi('F3') ? 4 : 3;
      return { root, quality, pcs, voicing: voiceChord(pcs, bassOct) };
    }
  },
};

export function chordSymbol(root: string, quality: string): string {
  return `${prettyPc(root)}${chordQualityById(quality).suffix}`;
}

export function checkChordPlayed(q: ChordSpellQ, midis: number[]): CheckResult {
  const want = new Set(q.pcs.map((p) => toMidi(`${p}4`) % 12));
  const got = new Set(midis.map((m) => m % 12));
  const missing = [...want].filter((x) => !got.has(x));
  const extra = [...got].filter((x) => !want.has(x));
  const correct = missing.length === 0 && extra.length === 0;
  return {
    correct,
    expected: q.pcs.map(prettyPc).join(' – '),
    feedback: correct
      ? undefined
      : [missing.length ? `${missing.length} note${missing.length > 1 ? 's' : ''} missing` : '', extra.length ? `${extra.length} wrong note${extra.length > 1 ? 's' : ''}` : '']
          .filter(Boolean)
          .join(', '),
  };
}

/** Check a spelled answer (order-insensitive, exact spelling required). */
export function checkChordSpelled(q: ChordSpellQ, spelled: string[]): CheckResult {
  const norm = (s: string) => s.replace('x', '##');
  const want = [...q.pcs].map(norm).sort();
  const got = [...spelled].map(norm).sort();
  const correct = want.length === got.length && want.every((w, i) => w === got[i]);
  const enharmonicOk = !correct && checkChordPlayed(q, spelled.map((s) => toMidi(`${s}4`))).correct;
  return {
    correct,
    expected: q.pcs.map(prettyPc).join(' – '),
    given: spelled.map(prettyPc).join(' – '),
    feedback: enharmonicOk
      ? 'Right sounds, wrong spelling: each chord tone needs its own letter (stack every other letter: root–3rd–5th–7th).'
      : 'Stack 3rds on every other letter, then adjust with ♯/♭ to get the right qualities.',
  };
}

/* ================================================================== */
/* Sight-reading (play it)                                             */
/* ================================================================== */

export interface SightReadQ {
  clef: 'treble' | 'bass' | 'grand';
  keySig: string;
  notes: string[];
}

export const sightReading: ExerciseLogic<SightReadQ> = {
  id: 'sight-reading',
  title: 'Sight-reading (play it)',
  area: 'keyboard',
  description: 'Play the notes on your MIDI keyboard (or the on-screen piano) as you read them. Speed comes from repetition.',
  levels: [
    'Treble · C position (C4–G4)',
    'Treble · one octave',
    'Bass clef · one octave',
    'Grand staff',
    'With key signatures',
    'Wider range + accidentals',
  ],
  generate(level, rng) {
    const L = Math.min(level, 5);
    const clef = (['treble', 'treble', 'bass', 'grand', 'grand', 'grand'] as const)[L];
    const keySig = L >= 4 ? rng.pick(['G', 'F', 'D', 'Bb', 'A', 'Eb']) : 'C';
    const range: [string, string] = [
      ['C4', 'G4'],
      ['C4', 'C5'],
      ['C3', 'C4'],
      ['F3', 'G4'],
      ['C3', 'C5'],
      ['F2', 'F5'],
    ][L] as [string, string];
    const count = L === 0 ? 4 : 6;
    const scale = keyInfo(keySig).scale;
    const notes: string[] = [];
    let step = rng.int(diatonicStep(range[0]), diatonicStep(range[1]));
    for (let i = 0; i < count; i++) {
      const maxLeap = L <= 1 ? 2 : 4;
      step = Math.max(diatonicStep(range[0]), Math.min(diatonicStep(range[1]), step + rng.int(-maxLeap, maxLeap)));
      const sn = fromStep(step);
      // apply key signature
      const inKey = scale.find((p) => p[0] === sn.letter)!;
      let n = noteToString({ ...sn, acc: parseNote(`${inKey}4`).acc });
      if (L >= 5 && rng.chance(0.15)) n = noteToString({ ...parseNote(n), acc: parseNote(n).acc + rng.pick([-1, 1]) });
      notes.push(n);
    }
    return { clef, keySig, notes };
  },
};

/* ================================================================== */
/* Scale degrees by ear (functional ear training)                      */
/* ================================================================== */

export interface DegreeEarQ {
  tonic: number;
  minor: boolean;
  degree: string;
  target: number;
  options: string[];
}

export const DEGREES: Record<string, { semis: number; solfege: string }> = {
  '1': { semis: 0, solfege: 'Do' },
  'b2': { semis: 1, solfege: 'Ra' },
  '2': { semis: 2, solfege: 'Re' },
  'b3': { semis: 3, solfege: 'Me' },
  '3': { semis: 4, solfege: 'Mi' },
  '4': { semis: 5, solfege: 'Fa' },
  '#4': { semis: 6, solfege: 'Fi' },
  '5': { semis: 7, solfege: 'Sol' },
  'b6': { semis: 8, solfege: 'Le' },
  '6': { semis: 9, solfege: 'La' },
  'b7': { semis: 10, solfege: 'Te' },
  '7': { semis: 11, solfege: 'Ti' },
};

export const scaleDegreeEar: ExerciseLogic<DegreeEarQ> = {
  id: 'scale-degree-ear',
  title: 'Scale degrees by ear',
  area: 'ear',
  description: 'Hear a cadence to set the key, then name the note’s function. The single most useful ear skill for writing melodies and bass lines.',
  levels: ['Do · Mi · Sol (1 3 5)', 'All major-scale degrees', 'Minor keys', 'Chromatic (borrowed) degrees'],
  generate(level, rng) {
    const sets = [
      { minor: false, set: ['1', '3', '5'] },
      { minor: false, set: ['1', '2', '3', '4', '5', '6', '7'] },
      { minor: true, set: ['1', '2', 'b3', '4', '5', 'b6', 'b7', '7'] },
      { minor: false, set: ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'] },
    ];
    const cfg = sets[Math.min(level, sets.length - 1)];
    const tonic = rng.int(55, 64);
    const degree = rng.pick(cfg.set);
    const octaveShift = rng.pick([0, 0, 12, -12]);
    const target = Math.max(48, Math.min(84, tonic + DEGREES[degree].semis + octaveShift));
    return { tonic, minor: cfg.minor, degree, target, options: cfg.set };
  },
};

/** I–IV–V–I (or i–iv–V–i) with smooth voice leading, bass separate. */
export function cadenceChords(tonic: number, minor: boolean): number[][] {
  const t = tonic;
  const third = minor ? 3 : 4;
  const sixth = minor ? 8 : 9;
  return [
    [t - 12, t, t + third, t + 7],
    [t - 7, t, t + 5, t + sixth],
    [t - 5, t - 1, t + 2, t + 7],
    [t - 12, t, t + third, t + 7],
  ];
}

export function checkDegree(q: DegreeEarQ, picked: string): CheckResult {
  const d = DEGREES[q.degree];
  return {
    correct: picked === q.degree,
    expected: `${q.degree.replace('b', '♭').replace('#', '♯')} (${d.solfege})`,
    given: `${picked.replace('b', '♭').replace('#', '♯')} (${DEGREES[picked].solfege})`,
  };
}

export { LETTERS, transpose };
