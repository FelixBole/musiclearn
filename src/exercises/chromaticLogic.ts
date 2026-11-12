/**
 * Track C drills (chromatic & modal harmony): pure generators + checkers.
 */
import { Note } from 'tonal';
import { chordName, parseRoman, pcOf, prettyRoman, type KeyCtx } from '../engine/harmony/roman';
import { realize } from '../engine/harmony/voicing';
import type { Satb } from '../engine/harmony/voiceleading';
import { keyName, prettyPc } from '../engine/theory';
import type { CheckResult, ExerciseLogic } from './types';
import { randomKey } from './harmonyLogic';

/* ================================================================== */
/* Chromatic chords by ear                                             */
/* ================================================================== */

export const CHROMATIC_INFO: Record<string, { name: string; hear: string }> = {
  IV: { name: 'Major IV', hear: 'Plain diatonic IV: bright, open, no surprise.' },
  iv: { name: 'Minor iv (borrowed)', hear: 'The 6th degree drops a half step: a sudden shadow, wistful.' },
  bVI: { name: '♭VI (borrowed)', hear: 'Bass drops to ♭6: a warm, heavy, epic major chord.' },
  bVII: { name: '♭VII (borrowed)', hear: 'A major chord a whole step below the tonic: heroic, Mixolydian, no leading tone.' },
  ii: { name: 'Diatonic ii', hear: 'Plain minor ii: smooth pre-dominant, nothing chromatic.' },
  'V/V': { name: 'V/V (secondary dominant)', hear: 'A major chord on 2 with a raised 4th (♯4) that pushes up into V: bright lift.' },
  'V/vi': { name: 'V/vi (secondary dominant)', hear: 'A major chord on 3 with a raised 5th (♯5) leading into vi: a twist toward the relative minor.' },
  'V7/IV': { name: 'V7/IV (secondary dominant)', hear: 'The tonic itself grows a ♭7 and tips over into IV: bluesy, gospel-like lean.' },
  N6: { name: 'Neapolitan (N⁶)', hear: 'A major chord on ♭2 over the 4th degree: tragic, operatic darkness before V.' },
  'It+6': { name: 'Italian augmented 6th', hear: 'Three notes; the outer voices spread outward by half steps onto V: intense pull.' },
  'Ger+6': { name: 'German augmented 6th', hear: 'Sounds like a dominant 7th on ♭6; resolves via the cadential 6/4. Thick and Romantic.' },
  'iiø7': { name: 'Half-diminished ii⁷ (borrowed)', hear: 'ii⁷ with ♭6: darker, yearning pre-dominant.' },
  III: { name: 'III (chromatic mediant)', hear: 'Major chord on 3: one common tone, the other notes shift by half steps up. Bright, uplifting.' },
  bIII: { name: '♭III (chromatic mediant)', hear: 'Major chord on ♭3: the tonic triad’s 5th stays, the colour darkens. Heroic/dramatic.' },
  VI: { name: 'VI (chromatic mediant)', hear: 'Major chord on 6: the tonic’s 3rd stays, shimmering lift. “Wonder”.' },
  'bVI*': { name: '♭VI (chromatic mediant)', hear: 'Major chord on ♭6: the tonic stays, everything else sinks. Majestic and ominous.' },
};

/** Phrase used to present each target chord (the target is always the 2nd chord). */
const PHRASES: Record<string, string[]> = {
  IV: ['I', 'IV', 'V', 'I'],
  iv: ['I', 'iv', 'V', 'I'],
  bVI: ['I', 'bVI', 'V', 'I'],
  bVII: ['I', 'bVII', 'IV', 'I'],
  ii: ['I', 'ii', 'V', 'I'],
  'V/V': ['I', 'V65/V', 'V', 'I'],
  'V/vi': ['I', 'V/vi', 'vi', 'V', 'I'],
  'V7/IV': ['I', 'V7/IV', 'IV', 'V', 'I'],
  N6: ['I', 'N6', 'V', 'I'],
  'It+6': ['I', 'It+6', 'V', 'I'],
  'Ger+6': ['I', 'Ger+6', 'I64', 'V', 'I'],
  'iiø7': ['I', 'iiø65', 'V', 'I'],
  III: ['I', 'III', 'I'],
  bIII: ['I', 'bIII', 'I'],
  VI: ['I', 'VI', 'I'],
  'bVI*': ['I', 'bVI', 'I'],
};

const CHROM_EAR_LEVELS: string[][] = [
  ['IV', 'iv', 'bVI', 'bVII'],
  ['ii', 'V/V', 'V/vi', 'V7/IV'],
  ['iv', 'bVI', 'bVII', 'V/V', 'V/vi', 'N6'],
  ['ii', 'iv', 'V/V', 'N6', 'It+6', 'Ger+6', 'iiø7'],
  ['III', 'bIII', 'VI', 'bVI*'],
];

export interface ChromEarQ {
  key: KeyCtx;
  target: string;
  symbols: string[];
  voicings: Satb[];
  names: string[][];
  options: string[];
}

export const chromaticEar: ExerciseLogic<ChromEarQ> = {
  id: 'chromatic-ear',
  title: 'Chromatic chords by ear',
  area: 'ear',
  description: 'A short phrase in a major key: name the colourful chord in 2nd position. Borrowed chords, secondary dominants, Neapolitan, augmented 6ths, mediants.',
  levels: ['Borrowed from minor', 'Secondary dominants', 'Mixed colours', 'Chromatic pre-dominants', 'Chromatic mediants'],
  generate(level, rng) {
    const set = CHROM_EAR_LEVELS[Math.min(level, CHROM_EAR_LEVELS.length - 1)];
    const target = rng.pick(set);
    const key = randomKey(rng, false);
    const symbols = PHRASES[target];
    const r = realize(symbols, key);
    return { key, target, symbols, voicings: r.voicings, names: r.names, options: set };
  },
};

export function checkChromaticEar(q: ChromEarQ, picked: string): CheckResult {
  const info = CHROMATIC_INFO[q.target];
  return {
    correct: picked === q.target,
    expected: info.name,
    given: CHROMATIC_INFO[picked]?.name ?? picked,
    feedback: `${info.hear} Phrase: ${q.symbols.map(prettyRoman).join(' – ')}.`,
  };
}

/* ================================================================== */
/* Chromatic chord spelling (theory, multiple choice)                  */
/* ================================================================== */

const SPELL_LEVELS: { set: string[]; minor: 'never' | 'sometimes'; reverse?: boolean }[] = [
  { set: ['V/V', 'V7/V', 'V/vi', 'V7/vi', 'V/ii', 'V7/ii', 'V7/IV', 'V/iii'], minor: 'never' },
  { set: ['iv', 'bVI', 'bVII', 'bIII', 'ii°', 'iiø7', 'v'], minor: 'never' },
  { set: ['vii°7/V', 'vii°7/ii', 'vii°7/vi', 'viiø7/V', 'vii°7/IV'], minor: 'never' },
  { set: ['N6', 'It+6', 'Fr+6', 'Ger+6'], minor: 'sometimes' },
  { set: ['V/V', 'V7/vi', 'V7/IV', 'V/ii', 'iv', 'bVI', 'bVII', 'bIII', 'N6'], minor: 'never', reverse: true },
];

export interface ChromSpellQ {
  key: KeyCtx;
  symbol: string;
  /** chord name of `symbol` in `key` */
  name: string;
  /** reverse questions show the chord and ask for the numeral */
  reverse: boolean;
  options: string[];
  answer: string;
}

const enharmonicRoot = (name: string): string | null => {
  const m = /^([A-G])([♯♭]?)(.*)$/.exec(name);
  if (!m) return null;
  const raw = `${m[1]}${m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : ''}`;
  const e = Note.enharmonic(raw);
  return e && e !== raw && e.length <= 2 ? `${prettyPc(e)}${m[3]}` : null;
};

const QUALITY_VARIANTS = ['', 'm', '7', 'm7', '°7', 'ø7', '°'];

export const chromaticSpelling: ExerciseLogic<ChromSpellQ> = {
  id: 'chromatic-spelling',
  title: 'Chromatic chords: spell & name',
  area: 'theory',
  description: 'Translate between chromatic Roman numerals and real chords in any key: V/V, ♭VI, vii°7/V, N⁶, augmented 6ths.',
  levels: ['Secondary dominants', 'Borrowed chords', 'Leading-tone 7ths', 'Neapolitan & augmented 6ths', 'Name the numeral'],
  generate(level, rng) {
    const cfg = SPELL_LEVELS[Math.min(level, SPELL_LEVELS.length - 1)];
    const key = randomKey(rng, cfg.minor === 'sometimes' && rng.chance(0.4));
    const symbol = rng.pick(cfg.set);
    const chord = parseRoman(symbol, key);
    const name = chordName(chord);
    if (cfg.reverse) {
      const others = cfg.set.filter((s) => s !== symbol && chordName(parseRoman(s, key)) !== name);
      const options = rng.shuffle([symbol, ...rng.shuffle(others).slice(0, 3)]);
      return { key, symbol, name, reverse: true, options, answer: symbol };
    }
    const pool = new Set<string>();
    for (const s of cfg.set) if (s !== symbol) pool.add(chordName(parseRoman(s, key)));
    const root = /^([A-G][♯♭]?)/.exec(name)?.[1];
    if (chord.kind === 'aug6') {
      // misspelled versions: the #4 written as its flat enharmonic
      const pcs = chord.pcs.map((p) => prettyPc(p));
      const flat = enharmonicRoot(pcs[pcs.length - 1]);
      if (flat) pool.add([...pcs.slice(0, -1), flat].join('–'));
    } else if (root && chord.kind !== 'neapolitan') {
      for (const v of QUALITY_VARIANTS) pool.add(`${root}${v}`);
      const en = enharmonicRoot(name);
      if (en) pool.add(en);
    } else if (chord.kind === 'neapolitan') {
      const en = enharmonicRoot(name);
      if (en) pool.add(en);
      pool.add(name.split('/')[0]);
    }
    pool.delete(name);
    const options = rng.shuffle([name, ...rng.shuffle([...pool]).slice(0, 3)]);
    return { key, symbol, name, reverse: false, options, answer: name };
  },
};

export function checkChromaticSpelling(q: ChromSpellQ, picked: string): CheckResult {
  const c = parseRoman(q.symbol, q.key);
  const notes = c.pcs.map((p) => prettyPc(p)).join(' ');
  return {
    correct: picked === q.answer,
    expected: q.reverse ? prettyRoman(q.symbol) : q.name,
    given: q.reverse ? prettyRoman(picked) : picked,
    feedback: `${prettyRoman(q.symbol)} in ${keyName(q.key.tonic, q.key.minor)} = ${q.name} (${notes}).${c.secondaryOf ? ` It borrows its notes from the key of ${chordName(parseRoman(c.secondaryOf, q.key), false)}.` : ''}`,
  };
}

/* ================================================================== */
/* Modes by ear                                                        */
/* ================================================================== */

export type ModeId = 'ionian' | 'lydian' | 'mixolydian' | 'dorian' | 'aeolian' | 'phrygian' | 'locrian';

export const MODES: Record<ModeId, { name: string; minor: boolean; vamp: string[]; scale: number[]; colour: string }> = {
  ionian: { name: 'Ionian (major)', minor: false, vamp: ['I', 'IV', 'V', 'I'], scale: [0, 2, 4, 5, 7, 9, 11], colour: 'Plain major: settled, bright, “home”.' },
  lydian: { name: 'Lydian', minor: false, vamp: ['I', 'II', 'I', 'II', 'I'], scale: [0, 2, 4, 6, 7, 9, 11], colour: 'Raised 4th (the major II chord): floating, magical, wonder and flight.' },
  mixolydian: { name: 'Mixolydian', minor: false, vamp: ['I', 'bVII', 'IV', 'I'], scale: [0, 2, 4, 5, 7, 9, 10], colour: 'Lowered 7th (♭VII chord): heroic, adventurous, folk and rock.' },
  dorian: { name: 'Dorian', minor: true, vamp: ['i', 'IV', 'i', 'IV', 'i'], scale: [0, 2, 3, 5, 7, 9, 10], colour: 'Minor with a raised 6th (major IV chord): noble, hopeful minor, Celtic.' },
  aeolian: { name: 'Aeolian (natural minor)', minor: true, vamp: ['i', 'VI', 'VII', 'i'], scale: [0, 2, 3, 5, 7, 8, 10], colour: 'Natural minor (VI–VII–i): epic, sad, the default battle-theme minor.' },
  phrygian: { name: 'Phrygian', minor: true, vamp: ['i', 'bII', 'i', 'bII', 'i'], scale: [0, 1, 3, 5, 7, 8, 10], colour: 'Lowered 2nd (♭II chord): dark, exotic, menacing; Spanish or desert colour.' },
  locrian: { name: 'Locrian', minor: true, vamp: ['i°', 'bII', 'i°', 'bII', 'i°'], scale: [0, 1, 3, 5, 6, 8, 10], colour: 'Diminished tonic: unstable, horror; rarely sustained, great for dread.' },
};

const MODE_LEVELS: { set: ModeId[]; scale: boolean }[] = [
  { set: ['ionian', 'lydian', 'mixolydian'], scale: true },
  { set: ['aeolian', 'dorian', 'phrygian'], scale: true },
  { set: ['ionian', 'lydian', 'mixolydian', 'aeolian', 'dorian', 'phrygian'], scale: true },
  { set: ['ionian', 'lydian', 'mixolydian', 'aeolian', 'dorian', 'phrygian'], scale: false },
  { set: ['ionian', 'lydian', 'mixolydian', 'aeolian', 'dorian', 'phrygian', 'locrian'], scale: false },
];

const MODE_TONICS = ['C', 'D', 'E', 'F', 'G', 'A'];

export interface ModeEarQ {
  mode: ModeId;
  tonic: string;
  voicings: Satb[];
  /** ascending scale, MIDI, tonic to tonic */
  scale: number[];
  playScale: boolean;
  options: ModeId[];
}

export const modeEar: ExerciseLogic<ModeEarQ> = {
  id: 'mode-ear',
  title: 'Modes by ear',
  area: 'ear',
  description: 'Hear a modal vamp (and scale) and name the mode by its colour: Lydian wonder, Dorian nobility, Phrygian menace…',
  levels: ['Bright modes (with scale)', 'Dark modes (with scale)', 'All six (with scale)', 'All six (vamp only)', 'Add Locrian'],
  generate(level, rng) {
    const cfg = MODE_LEVELS[Math.min(level, MODE_LEVELS.length - 1)];
    const mode = rng.pick(cfg.set);
    const m = MODES[mode];
    const tonic = rng.pick(MODE_TONICS);
    const r = realize(m.vamp, { tonic, minor: m.minor });
    const base = 60 + pcOf(tonic);
    const scale = [...m.scale.map((s) => base + s), base + 12];
    return { mode, tonic, voicings: r.voicings, scale, playScale: cfg.scale, options: cfg.set };
  },
};

export function checkModeEar(q: ModeEarQ, picked: ModeId): CheckResult {
  const m = MODES[q.mode];
  return {
    correct: picked === q.mode,
    expected: m.name,
    given: MODES[picked].name,
    feedback: `${m.colour} Vamp: ${m.vamp.map(prettyRoman).join(' – ')} on ${prettyPc(q.tonic)}.`,
  };
}
