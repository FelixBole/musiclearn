import { Chord, Interval, Key, Note } from 'tonal';

/* ------------------------------------------------------------------ */
/* Spelled notes                                                       */
/* ------------------------------------------------------------------ */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];
const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface SpelledNote {
  letter: Letter;
  /** -2 = double flat ... +2 = double sharp */
  acc: number;
  octave: number;
}

export function accidentalString(acc: number): string {
  return acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc);
}

export function accidentalSymbol(acc: number): string {
  if (acc === 0) return '';
  if (acc === 2) return '𝄪';
  if (acc === -2) return '𝄫';
  return acc > 0 ? '♯' : '♭';
}

/** Parse "C#4", "Eb3", "Fx5"/"F##5", "Bbb2". Throws on invalid input. */
export function parseNote(name: string): SpelledNote {
  const m = /^([A-Ga-g])(#{1,2}|x|b{1,2})?(-?\d+)$/.exec(name.trim());
  if (!m) throw new Error(`Invalid note name: ${name}`);
  const letter = m[1].toUpperCase() as Letter;
  const accStr = m[2] ?? '';
  const acc = accStr === 'x' ? 2 : accStr.startsWith('#') ? accStr.length : -accStr.length;
  return { letter, acc, octave: parseInt(m[3], 10) };
}

export function noteToString(n: SpelledNote): string {
  return `${n.letter}${accidentalString(n.acc)}${n.octave}`;
}

/** Pretty name with ♯/♭ glyphs, optionally without octave. */
export function prettyNote(name: string, withOctave = false): string {
  const n = parseNote(withOctave || /\d$/.test(name) ? name : `${name}4`);
  return `${n.letter}${accidentalSymbol(n.acc)}${withOctave ? n.octave : ''}`;
}

/** Pretty pitch-class name ("Eb" -> "E♭"). */
export function prettyPc(pc: string): string {
  return pc.replace(/##/g, '𝄪').replace(/bb/g, '𝄫').replace(/#/g, '♯').replace(/(?<=[A-G])b/g, '♭');
}

export function toMidi(n: SpelledNote | string): number {
  const s = typeof n === 'string' ? parseNote(n) : n;
  return (s.octave + 1) * 12 + LETTER_PC[s.letter] + s.acc;
}

/** Diatonic step index: C0 = 0, D0 = 1 ... C4 = 28. Used for staff positions. */
export function diatonicStep(n: SpelledNote | string): number {
  const s = typeof n === 'string' ? parseNote(n) : n;
  return s.octave * 7 + LETTERS.indexOf(s.letter);
}

export function fromStep(step: number, acc = 0): SpelledNote {
  const octave = Math.floor(step / 7);
  const letter = LETTERS[((step % 7) + 7) % 7];
  return { letter, acc, octave };
}

/** VexFlow key format: "C#4" -> "c#/4" */
export function vexKey(name: string): string {
  const n = parseNote(name);
  return `${n.letter.toLowerCase()}${accidentalString(n.acc)}/${n.octave}`;
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function midiToName(midi: number, preferFlats = false): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${(preferFlats ? FLAT_NAMES : SHARP_NAMES)[pc]}${octave}`;
}

export function midiToPcName(midi: number, preferFlats = false): string {
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[((midi % 12) + 12) % 12];
}

export const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

export function pcOfName(pcName: string): number {
  const pc = Note.chroma(pcName);
  if (pc === undefined || Number.isNaN(pc)) throw new Error(`Invalid pitch class ${pcName}`);
  return pc;
}

/** Compare two pitch sets by pitch class (order and octave ignored). */
export function samePitchClassSet(a: number[], b: number[]): boolean {
  const sa = new Set(a.map(pitchClass));
  const sb = new Set(b.map(pitchClass));
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

export function transpose(note: string, interval: string): string {
  const out = Note.transpose(note, interval);
  if (!out) throw new Error(`Cannot transpose ${note} by ${interval}`);
  return out;
}

/* ------------------------------------------------------------------ */
/* Intervals                                                           */
/* ------------------------------------------------------------------ */

export interface IntervalInfo {
  id: string; // short id e.g. "m3"
  tonal: string; // tonal notation e.g. "3m"
  semitones: number;
  name: string;
}

export const SIMPLE_INTERVALS: IntervalInfo[] = [
  { id: 'P1', tonal: '1P', semitones: 0, name: 'Unison' },
  { id: 'm2', tonal: '2m', semitones: 1, name: 'minor 2nd' },
  { id: 'M2', tonal: '2M', semitones: 2, name: 'Major 2nd' },
  { id: 'm3', tonal: '3m', semitones: 3, name: 'minor 3rd' },
  { id: 'M3', tonal: '3M', semitones: 4, name: 'Major 3rd' },
  { id: 'P4', tonal: '4P', semitones: 5, name: 'Perfect 4th' },
  { id: 'TT', tonal: '4A', semitones: 6, name: 'Tritone' },
  { id: 'P5', tonal: '5P', semitones: 7, name: 'Perfect 5th' },
  { id: 'm6', tonal: '6m', semitones: 8, name: 'minor 6th' },
  { id: 'M6', tonal: '6M', semitones: 9, name: 'Major 6th' },
  { id: 'm7', tonal: '7m', semitones: 10, name: 'minor 7th' },
  { id: 'M7', tonal: '7M', semitones: 11, name: 'Major 7th' },
  { id: 'P8', tonal: '8P', semitones: 12, name: 'Octave' },
];

export const intervalById = (id: string) => {
  const i = SIMPLE_INTERVALS.find((x) => x.id === id);
  if (!i) throw new Error(`Unknown interval ${id}`);
  return i;
};

const QUALITY_NAMES: Record<string, string> = {
  P: 'Perfect',
  M: 'Major',
  m: 'minor',
  A: 'Augmented',
  d: 'diminished',
  AA: 'Doubly augmented',
  dd: 'Doubly diminished',
};

const ORDINALS = ['', 'Unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'Octave', '9th', '10th', '11th', '12th', '13th'];

/** Full name of the interval between two spelled notes (lower first), e.g. "Major 3rd". */
export function intervalNameBetween(lower: string, upper: string): string {
  const ivl = Interval.get(Interval.distance(lower, upper));
  if (ivl.empty) throw new Error(`No interval ${lower}-${upper}`);
  return describeInterval(ivl.name);
}

/** "3M" -> "Major 3rd", "5d" -> "diminished 5th", "1P" -> "Perfect Unison". */
export function describeInterval(tonalName: string): string {
  const ivl = Interval.get(tonalName);
  const num = Math.abs(ivl.num);
  const ord = ORDINALS[num] ?? `${num}th`;
  const q = QUALITY_NAMES[ivl.q] ?? ivl.q;
  if (num === 8 && ivl.q === 'P') return 'Octave';
  if (num === 1 && ivl.q === 'P') return 'Unison';
  return `${q} ${ord}`;
}

/** Generic interval size (number of letter names spanned), lower→upper. 3rd = 3. */
export function intervalNumber(lower: string, upper: string): number {
  return diatonicStep(upper) - diatonicStep(lower) + 1;
}

/* ------------------------------------------------------------------ */
/* Chords                                                              */
/* ------------------------------------------------------------------ */

export interface ChordQuality {
  id: string;
  name: string;
  /** tonal chord type symbol */
  tonal: string;
  /** display suffix after root, e.g. "m7" */
  suffix: string;
  intervals: number[];
}

export const CHORD_QUALITIES: ChordQuality[] = [
  { id: 'maj', name: 'Major', tonal: 'M', suffix: '', intervals: [0, 4, 7] },
  { id: 'min', name: 'Minor', tonal: 'm', suffix: 'm', intervals: [0, 3, 7] },
  { id: 'dim', name: 'Diminished', tonal: 'dim', suffix: '°', intervals: [0, 3, 6] },
  { id: 'aug', name: 'Augmented', tonal: 'aug', suffix: '+', intervals: [0, 4, 8] },
  { id: 'sus2', name: 'Sus2', tonal: 'sus2', suffix: 'sus2', intervals: [0, 2, 7] },
  { id: 'sus4', name: 'Sus4', tonal: 'sus4', suffix: 'sus4', intervals: [0, 5, 7] },
  { id: 'maj7', name: 'Major 7th', tonal: 'maj7', suffix: 'maj7', intervals: [0, 4, 7, 11] },
  { id: 'dom7', name: 'Dominant 7th', tonal: '7', suffix: '7', intervals: [0, 4, 7, 10] },
  { id: 'min7', name: 'Minor 7th', tonal: 'm7', suffix: 'm7', intervals: [0, 3, 7, 10] },
  { id: 'm7b5', name: 'Half-diminished 7th', tonal: 'm7b5', suffix: 'ø7', intervals: [0, 3, 6, 10] },
  { id: 'dim7', name: 'Diminished 7th', tonal: 'dim7', suffix: '°7', intervals: [0, 3, 6, 9] },
  { id: 'mMaj7', name: 'Minor-major 7th', tonal: 'mMaj7', suffix: 'm(maj7)', intervals: [0, 3, 7, 11] },
];

export const chordQualityById = (id: string) => {
  const q = CHORD_QUALITIES.find((x) => x.id === id);
  if (!q) throw new Error(`Unknown chord quality ${id}`);
  return q;
};

/** Spelled pitch classes of a chord, e.g. ("Eb", "maj7") -> ["Eb","G","Bb","D"]. */
export function spellChord(root: string, qualityId: string): string[] {
  const q = chordQualityById(qualityId);
  const c = Chord.getChord(q.tonal, root);
  if (c.empty) throw new Error(`Cannot spell ${root}${q.tonal}`);
  return c.notes;
}

/**
 * Voice a chord from spelled pitch classes upward from a starting octave.
 * inversion 0 = root position, 1 = first inversion...
 */
export function voiceChord(pcs: string[], bassOctave: number, inversion = 0): string[] {
  const rotated = [...pcs.slice(inversion), ...pcs.slice(0, inversion)];
  const out: string[] = [];
  let lastMidi = -Infinity;
  let octave = bassOctave;
  for (const pc of rotated) {
    let name = `${pc}${octave}`;
    while (toMidi(name) <= lastMidi) {
      octave++;
      name = `${pc}${octave}`;
    }
    out.push(name);
    lastMidi = toMidi(name);
  }
  return out;
}

/** Best-effort chord name(s) for a set of MIDI notes (bass = lowest note). */
export function detectChord(midis: number[], preferFlats = false): string[] {
  if (midis.length < 2) return [];
  const sorted = [...new Set(midis)].sort((a, b) => a - b);
  const names = sorted.map((m) => midiToPcName(m, preferFlats));
  const uniq: string[] = [];
  for (const n of names) if (!uniq.includes(n)) uniq.push(n);
  return Chord.detect(uniq).map(prettyChordSymbol);
}

/**
 * Spell MIDI notes as scientific names using the detected chord's own spelling
 * (C E G A#→ C E G Bb for C7). Falls back to sharps/flats when no chord is found.
 */
export function spellForChord(midis: number[], preferFlats = false): string[] {
  const sorted = [...new Set(midis)].sort((a, b) => a - b);
  const fallback = sorted.map((m) => midiToName(m, preferFlats));
  if (sorted.length < 2) return fallback;
  const uniq: string[] = [];
  for (const m of sorted) {
    const n = midiToPcName(m, preferFlats);
    if (!uniq.includes(n)) uniq.push(n);
  }
  const sym = Chord.detect(uniq)[0];
  if (!sym) return fallback;
  const pcs = Chord.get(sym).notes;
  return sorted.map((m, i) => {
    const pc = pcs.find((p) => Note.chroma(p) === pitchClass(m));
    if (!pc) return fallback[i];
    // the octave number belongs to the letter (B#3 = C4), so search nearby octaves
    const base = Math.floor(m / 12) - 1;
    for (const o of [base, base - 1, base + 1]) if (toMidi(`${pc}${o}`) === m) return `${pc}${o}`;
    return fallback[i];
  });
}

/** Make tonal's symbols friendlier: "CM" -> "C", "Cm7b5" -> "Cø7", "Co7" -> "C°7". */
export function prettyChordSymbol(sym: string): string {
  let s = sym;
  s = s.replace(/^([A-G][#b]*)M(?=$|\/)/, '$1');
  s = s.replace(/m7b5/, 'ø7').replace(/o7/, '°7').replace(/dim7/, '°7').replace(/dim(?!7)/, '°');
  s = s.replace(/(^[A-G][#b]*)o(?=$|\/)/, '$1°');
  return prettyPc(s);
}

/* ------------------------------------------------------------------ */
/* Keys                                                                */
/* ------------------------------------------------------------------ */

/** Major keys ordered by circle of fifths, flats to sharps. */
export const MAJOR_KEYS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];

export function keyInfo(tonic: string, minor = false) {
  if (minor) {
    const k = Key.minorKey(tonic);
    const rel = Key.majorKey(k.relativeMajor);
    return {
      tonic,
      minor: true,
      alteration: rel.alteration,
      signature: rel.keySignature,
      relative: k.relativeMajor,
      scale: k.natural.scale as string[],
    };
  }
  const k = Key.majorKey(tonic);
  return {
    tonic,
    minor: false,
    alteration: k.alteration,
    signature: k.keySignature,
    relative: k.minorRelative,
    scale: k.scale as string[],
  };
}

/** Major key with the given number of accidentals (+ sharps, - flats). */
export function majorKeyByAlteration(alteration: number): string {
  return MAJOR_KEYS[alteration + 7];
}

export function keyName(tonic: string, minor = false): string {
  return `${prettyPc(tonic)} ${minor ? 'minor' : 'major'}`;
}

/** Scale-degree names. */
export const DEGREE_NAMES = ['Tonic', 'Supertonic', 'Mediant', 'Subdominant', 'Dominant', 'Submediant', 'Leading tone'];
