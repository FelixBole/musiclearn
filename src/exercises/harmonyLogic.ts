/**
 * Track B drills (diatonic harmony): pure generators + checkers.
 */
import type { Rng } from '../engine/rng';
import { parseRoman, pcOf, prettyRoman, type KeyCtx, type RomanChord } from '../engine/harmony/roman';
import { CADENCE_INFO, generateProgression, type Cadence } from '../engine/harmony/progressions';
import { chordCost, enumerateVoicings, realize, spellVoicing } from '../engine/harmony/voicing';
import {
  RULE_LABELS,
  checkChord,
  checkPair,
  checkProgression,
  errorsOnly,
  type Issue,
  type RuleId,
  type Satb,
} from '../engine/harmony/voiceleading';
import { keyInfo, keyName } from '../engine/theory';
import type { CheckResult, ExerciseLogic } from './types';
import { makeOptions } from './logic';

const MAJOR_TONICS = ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb'];
const MINOR_TONICS = ['A', 'E', 'D', 'G', 'C', 'B'];

export function randomKey(rng: Rng, minor: boolean): KeyCtx {
  return { tonic: rng.pick(minor ? MINOR_TONICS : MAJOR_TONICS), minor };
}

/** Major-key tonic to draw the key signature with. */
export function keySigFor(key: KeyCtx): string {
  return key.minor ? keyInfo(key.tonic, true).relative : key.tonic;
}

export const keyLabel = (key: KeyCtx) => keyName(key.tonic, key.minor);

/* ================================================================== */
/* Cadence ear training                                                */
/* ================================================================== */

export interface CadenceQ {
  key: KeyCtx;
  cadence: Cadence;
  symbols: string[];
  voicings: Satb[];
  options: Cadence[];
}

const CADENCE_LEVELS: { set: Cadence[]; minor: boolean }[] = [
  { set: ['PAC', 'HC'], minor: false },
  { set: ['PAC', 'HC', 'plagal'], minor: false },
  { set: ['PAC', 'HC', 'plagal', 'deceptive'], minor: false },
  { set: ['PAC', 'IAC', 'HC'], minor: false },
  { set: ['PAC', 'HC', 'plagal', 'deceptive'], minor: true },
];

export const cadenceEar: ExerciseLogic<CadenceQ> = {
  id: 'cadence-ear',
  title: 'Cadences by ear',
  area: 'ear',
  description: 'Hear a short phrase and name how it ends: full stop, comma, question or surprise.',
  levels: ['Authentic vs half', 'Add plagal', 'Add deceptive', 'Perfect vs imperfect authentic', 'All cadences in minor'],
  generate(level, rng) {
    const cfg = CADENCE_LEVELS[Math.min(level, CADENCE_LEVELS.length - 1)];
    for (;;) {
      const cadence = rng.pick(cfg.set);
      const key = randomKey(rng, cfg.minor);
      const vocab = cfg.minor ? ['i', 'iv', 'VI', 'ii°6', 'V'] : ['I', 'IV', 'ii', 'vi', 'V', 'I6'];
      try {
        const symbols = generateProgression({ minor: cfg.minor, vocabulary: vocab, length: 4, cadence }, rng);
        const n = symbols.length;
        const tonicPc = pcOf(key.tonic);
        const thirdPc = (tonicPc + (key.minor ? 3 : 4)) % 12;
        const sopranoPc: (number | undefined)[] = Array(n).fill(undefined);
        if (cadence === 'PAC') sopranoPc[n - 1] = tonicPc;
        if (cadence === 'IAC') sopranoPc[n - 1] = thirdPc;
        const r = realize(symbols, key, { sopranoPc });
        return { key, cadence, symbols, voicings: r.voicings, options: cfg.set };
      } catch {
        /* retry */
      }
    }
  },
};

export function checkCadence(q: CadenceQ, picked: Cadence): CheckResult {
  const n = q.symbols.length;
  return {
    correct: picked === q.cadence,
    expected: CADENCE_INFO[q.cadence].name,
    given: CADENCE_INFO[picked].name,
    feedback: `${CADENCE_INFO[q.cadence].desc} Ending: ${prettyRoman(q.symbols[n - 2] ?? '')} → ${prettyRoman(q.symbols[n - 1])}.`,
  };
}

/* ================================================================== */
/* Progression dictation                                               */
/* ================================================================== */

export interface DictationQ {
  key: KeyCtx;
  symbols: string[];
  voicings: Satb[];
  vocabulary: string[];
}

const DICTATION_LEVELS: { vocab: string[]; minor: boolean; length: number }[] = [
  { vocab: ['I', 'IV', 'V'], minor: false, length: 4 },
  { vocab: ['I', 'IV', 'V', 'vi'], minor: false, length: 4 },
  { vocab: ['I', 'IV', 'V', 'vi', 'ii'], minor: false, length: 5 },
  { vocab: ['I', 'I6', 'ii', 'ii6', 'IV', 'V', 'V6', 'V7', 'vi'], minor: false, length: 5 },
  { vocab: ['i', 'iv', 'V', 'V7', 'VI', 'ii°6'], minor: true, length: 5 },
];

export const progressionEar: ExerciseLogic<DictationQ> = {
  id: 'progression-ear',
  title: 'Progression dictation',
  area: 'ear',
  description: 'Hear a progression, write it in Roman numerals. Focus on the bass line — it gives most chords away.',
  levels: ['I · IV · V', 'Add vi', 'Add ii (5 chords)', 'Inversions & V7', 'Minor keys'],
  generate(level, rng) {
    const cfg = DICTATION_LEVELS[Math.min(level, DICTATION_LEVELS.length - 1)];
    for (;;) {
      const key = randomKey(rng, cfg.minor);
      try {
        const symbols = generateProgression(
          { minor: cfg.minor, vocabulary: cfg.vocab, length: cfg.length, cadence: rng.chance(0.7) ? 'PAC' : 'HC' },
          rng,
        );
        const r = realize(symbols, key);
        return { key, symbols, voicings: r.voicings, vocabulary: cfg.vocab };
      } catch {
        /* retry */
      }
    }
  },
};

export function checkDictation(q: DictationQ, answers: string[]): CheckResult & { perChord: boolean[] } {
  const perChord = q.symbols.map((s, i) => i === 0 || answers[i] === s);
  const wrong = perChord.filter((x) => !x).length;
  return {
    correct: wrong === 0,
    perChord,
    expected: q.symbols.map(prettyRoman).join(' – '),
    given: answers.map((a) => (a ? prettyRoman(a) : '?')).join(' – '),
    feedback: wrong ? `${q.symbols.length - 1 - wrong}/${q.symbols.length - 1} chords right. Replay the bass line and listen to how each chord's bass moves.` : undefined,
  };
}

/* ================================================================== */
/* Roman numeral analysis                                              */
/* ================================================================== */

export interface AnalysisQ {
  key: KeyCtx;
  symbol: string;
  names: string[];
  voicing: Satb;
  options: string[];
}

const ANALYSIS_LEVELS: { set: string[]; minor: boolean }[] = [
  { set: ['I', 'ii', 'iii', 'IV', 'V', 'vi'], minor: false },
  { set: ['I', 'I6', 'I64', 'ii', 'ii6', 'IV', 'IV6', 'V', 'V6', 'vi', 'vii°6'], minor: false },
  { set: ['i', 'i6', 'ii°6', 'III', 'iv', 'iv6', 'V', 'V6', 'VI', 'vii°6'], minor: true },
  { set: ['V7', 'V65', 'V43', 'V42', 'ii7', 'ii65', 'IV7', 'viiø7', 'I', 'V'], minor: false },
];

export const romanAnalysis: ExerciseLogic<AnalysisQ> = {
  id: 'roman-analysis',
  title: 'Roman-numeral analysis',
  area: 'theory',
  description: 'Read a four-part chord in a key and name it — root, quality and inversion.',
  levels: ['Major · root position', 'Major · with inversions', 'Minor keys', 'Seventh chords & figures'],
  generate(level, rng) {
    const cfg = ANALYSIS_LEVELS[Math.min(level, ANALYSIS_LEVELS.length - 1)];
    const minor = level === 3 ? false : cfg.minor;
    const key = randomKey(rng, minor);
    const symbol = rng.pick(cfg.set);
    const chord = parseRoman(symbol, key);
    const vs = enumerateVoicings(chord, key)
      .map((v) => ({ v, c: chordCost(v, chord) }))
      .sort((a, b) => a.c - b.c);
    const pick = vs[rng.int(0, Math.max(0, Math.floor(vs.length * 0.3) - 1))].v;
    // distractors: same root other inversions first, then others
    const sameRoot = cfg.set.filter((s) => s !== symbol && parseRoman(s, key).root === chord.root);
    const pool = [...sameRoot, ...rng.shuffle(cfg.set.filter((s) => s !== symbol && !sameRoot.includes(s)))];
    const options = rng.shuffle([symbol, ...pool.slice(0, 5)]);
    return { key, symbol, names: spellVoicing(pick, chord), voicing: pick, options };
  },
};

export function checkAnalysis(q: AnalysisQ, picked: string): CheckResult {
  const c = parseRoman(q.symbol, q.key);
  const inv = ['root position', '1st inversion', '2nd inversion', '3rd inversion'][c.inversion];
  return {
    correct: picked === q.symbol,
    expected: prettyRoman(q.symbol),
    given: prettyRoman(picked),
    feedback: `Bass ${c.bass} → ${inv}. Chord tones ${c.pcs.join(' ')}: root ${c.root} is degree ${c.degree} of ${keyLabel(q.key)}.`,
  };
}

/* ================================================================== */
/* Spot the voice-leading error                                        */
/* ================================================================== */

export type SpotTarget = RuleId | 'none';

export interface ErrorSpotQ {
  key: KeyCtx;
  symbols: [string, string];
  voicings: [Satb, Satb];
  names: [string[], string[]];
  target: SpotTarget;
  issues: Issue[];
  options: SpotTarget[];
}

const SPOT_LEVELS: SpotTarget[][] = [
  ['parallel-fifths', 'parallel-octaves', 'none'],
  ['parallel-fifths', 'parallel-octaves', 'spacing', 'crossing', 'none'],
  ['parallel-fifths', 'parallel-octaves', 'spacing', 'doubled-leading-tone', 'leading-tone-unresolved', 'none'],
  ['parallel-fifths', 'parallel-octaves', 'spacing', 'crossing', 'doubled-leading-tone', 'leading-tone-unresolved', 'seventh-unresolved', 'none'],
];

const SPOT_PAIRS: Partial<Record<SpotTarget, [string, string][]>> = {
  'leading-tone-unresolved': [['V', 'I']],
  'seventh-unresolved': [['V7', 'I']],
  'doubled-leading-tone': [['I', 'V'], ['IV', 'V'], ['V', 'I']],
};
const GENERIC_PAIRS: [string, string][] = [
  ['I', 'IV'], ['IV', 'V'], ['I', 'ii'], ['ii', 'V'], ['V', 'vi'], ['I', 'V'], ['vi', 'IV'], ['IV', 'I'], ['V', 'I'],
];

export const SPOT_LABELS: Record<SpotTarget, string> = { ...RULE_LABELS, none: 'Nothing wrong' };

export const errorSpotting: ExerciseLogic<ErrorSpotQ> = {
  id: 'error-spotting',
  title: 'Spot the voice-leading error',
  area: 'theory',
  description: 'Two chords in four parts — find the mistake (or confirm there is none). Trains the eye and ear you need to check your own string and brass writing.',
  levels: ['Parallel 5ths & octaves', 'Add spacing & crossing', 'Add leading-tone problems', 'Everything incl. 7ths'],
  generate(level, rng) {
    const set = SPOT_LEVELS[Math.min(level, SPOT_LEVELS.length - 1)];
    for (let attempt = 0; attempt < 60; attempt++) {
      const target = rng.pick(set);
      const key = randomKey(rng, false);
      const pair = rng.pick(SPOT_PAIRS[target] ?? GENERIC_PAIRS);
      const ca = parseRoman(pair[0], key);
      const cb = parseRoman(pair[1], key);
      const found = findPairWith(target, ca, cb, key, rng);
      if (!found) continue;
      const issues = checkProgression(found, [ca, cb], key);
      return {
        key,
        symbols: pair,
        voicings: found,
        names: [spellVoicing(found[0], ca), spellVoicing(found[1], cb)],
        target,
        issues,
        options: set,
      };
    }
    throw new Error('Could not generate an error-spotting question');
  },
};

/** Find a voicing pair whose only error is `target` (or with no error at all). */
function findPairWith(target: SpotTarget, ca: RomanChord, cb: RomanChord, key: KeyCtx, rng: Rng): [Satb, Satb] | null {
  const A = enumerateVoicings(ca, key);
  const B = enumerateVoicings(cb, key);
  const errs = (a: Satb, b: Satb) => errorsOnly([...checkChord(a, 0, ca, key), ...checkChord(b, 1, cb, key), ...checkPair(a, b, 1, ca, cb, key)]);
  const onlyTarget = (a: Satb, b: Satb) => {
    const e = errs(a, b);
    return target === 'none' ? e.length === 0 : e.length > 0 && e.every((i) => i.rule === target);
  };
  if (target === 'none') {
    const r = realize([ca.symbol, cb.symbol], key);
    return [r.voicings[0], r.voicings[1]];
  }
  if (target === 'spacing' || target === 'crossing' || target === 'doubled-leading-tone') {
    // mutate a clean pair
    const base = realize([ca.symbol, cb.symbol], key).voicings;
    for (let t = 0; t < 40; t++) {
      const which = rng.int(0, 1);
      const v = [...base[which]] as Satb;
      const chord = which ? cb : ca;
      if (target === 'spacing') {
        const i = rng.pick([2, 3]);
        v[i] += 12;
      } else if (target === 'crossing') {
        const i = rng.pick([1, 2]);
        [v[i], v[i + 1]] = [v[i + 1], v[i]];
      } else {
        const lt = (pcOf(key.tonic) + 11) % 12;
        if (!chord.pcs.map(pcOf).includes(lt)) continue;
        const i = rng.int(1, 3);
        const candidates = [v[i] - 12, v[i], v[i] + 12].map((m) => m - (((m % 12) - lt + 12) % 12)).concat([v[i] + ((lt - (v[i] % 12) + 12) % 12)]);
        v[i] = rng.pick(candidates);
      }
      const pairV: [Satb, Satb] = which ? [base[0], v] : [v, base[1]];
      if (onlyTarget(pairV[0], pairV[1])) return pairV;
    }
    return null;
  }
  for (let t = 0; t < 4000; t++) {
    const a = rng.pick(A);
    const b = rng.pick(B);
    if (onlyTarget(a, b)) return [a, b];
  }
  return null;
}

export function checkErrorSpot(q: ErrorSpotQ, picked: SpotTarget): CheckResult {
  const e = errorsOnly(q.issues);
  return {
    correct: picked === q.target,
    expected: SPOT_LABELS[q.target],
    given: SPOT_LABELS[picked],
    feedback: e.length ? e.map((i) => i.message).join(' ') : 'Clean voice leading: no parallels, good spacing, tendency tones resolved.',
  };
}

/* ================================================================== */
/* Voice the next chord (keyboard)                                     */
/* ================================================================== */

export interface VoiceNextQ {
  key: KeyCtx;
  symbols: [string, string];
  first: Satb;
  firstNames: string[];
  model: Satb;
  modelNames: string[];
}

const VOICE_NEXT_LEVELS: { pairs: [string, string][]; minor: boolean }[] = [
  { pairs: [['I', 'IV'], ['IV', 'I'], ['I', 'V'], ['V', 'I'], ['IV', 'V']], minor: false },
  { pairs: [['ii', 'V'], ['vi', 'ii'], ['I', 'vi'], ['vi', 'IV'], ['V', 'vi'], ['IV', 'V'], ['I', 'ii']], minor: false },
  { pairs: [['I6', 'IV'], ['ii6', 'V'], ['V6', 'I'], ['I', 'V6'], ['IV', 'I6'], ['I64', 'V']], minor: false },
  { pairs: [['V7', 'I'], ['V65', 'I'], ['V43', 'I6'], ['V42', 'I6'], ['ii7', 'V'], ['I64', 'V7']], minor: false },
  { pairs: [['i', 'iv'], ['iv', 'V'], ['V', 'i'], ['VI', 'ii°6'], ['ii°6', 'V'], ['V7', 'i'], ['V', 'VI']], minor: true },
];

export const voiceNext: ExerciseLogic<VoiceNextQ> = {
  id: 'voice-next',
  title: 'Voice the next chord',
  area: 'keyboard',
  description: 'Given the first chord in four parts, play the next one with good voice leading: keep common tones, move by step, resolve tendency tones.',
  levels: ['I · IV · V connections', 'Add ii and vi', 'First inversions & 6/4', 'Seventh chords', 'Minor keys'],
  generate(level, rng) {
    const cfg = VOICE_NEXT_LEVELS[Math.min(level, VOICE_NEXT_LEVELS.length - 1)];
    const key = randomKey(rng, cfg.minor);
    const symbols = rng.pick(cfg.pairs);
    // playable on a keyboard: no two voices on the same key
    const r = realize(symbols, key, { distinctNotes: true });
    return {
      key,
      symbols,
      first: r.voicings[0],
      firstNames: r.names[0],
      model: r.voicings[1],
      modelNames: r.names[1],
    };
  },
};

export function checkVoiceNext(q: VoiceNextQ, played: number[]): CheckResult & { issues: Issue[]; voicing?: Satb } {
  const notes = [...new Set(played)].sort((a, b) => a - b);
  if (notes.length !== 4) {
    return {
      correct: false,
      expected: q.modelNames.join(' – '),
      feedback: `Play exactly 4 notes — one each for bass, tenor, alto and soprano (you played ${notes.length}).`,
      issues: [],
    };
  }
  const v = notes as Satb;
  const ca = parseRoman(q.symbols[0], q.key);
  const cb = parseRoman(q.symbols[1], q.key);
  const issues = [...checkChord(v, 1, cb, q.key), ...checkPair(q.first, v, 1, ca, cb, q.key)];
  const errors = errorsOnly(issues);
  return {
    correct: errors.length === 0,
    expected: q.modelNames.join(' – '),
    feedback: issues.length
      ? issues.map((i) => `${i.severity === 'error' ? '✗' : '⚠'} ${i.message}`).join(' ')
      : 'Smooth! Common tones kept and every voice moves by the shortest path.',
    issues,
    voicing: v,
  };
}

/* ================================================================== */
/* Harmonize a melody (choose the chords)                               */
/* ================================================================== */

export interface HarmonizeQ {
  key: KeyCtx;
  melody: number[];
  melodyNames: string[];
  model: string[];
  vocabulary: string[];
  /** chord choices offered for each melody note (chords containing that note) */
  choices: string[][];
}

const HARMONIZE_LEVELS: { vocab: string[]; minor: boolean; length: number }[] = [
  { vocab: ['I', 'IV', 'V'], minor: false, length: 4 },
  { vocab: ['I', 'ii', 'IV', 'V', 'vi'], minor: false, length: 5 },
  { vocab: ['I', 'I6', 'ii', 'ii6', 'IV', 'V', 'V6', 'V7', 'vi', 'I64'], minor: false, length: 6 },
  { vocab: ['i', 'iv', 'V', 'V7', 'VI', 'ii°6', 'i6'], minor: true, length: 5 },
];

export const harmonizeMelody: ExerciseLogic<HarmonizeQ> = {
  id: 'harmonize-melody',
  title: 'Harmonize a melody',
  area: 'keyboard',
  description: 'Choose a chord for every melody note. The app voices your choice in four parts so you can hear it — there are usually several good answers.',
  levels: ['I · IV · V', 'Add ii and vi', 'Inversions, V7 & cadential 6/4', 'Minor keys'],
  generate(level, rng) {
    const cfg = HARMONIZE_LEVELS[Math.min(level, HARMONIZE_LEVELS.length - 1)];
    for (;;) {
      const key = randomKey(rng, cfg.minor);
      try {
        const model = generateProgression({ minor: cfg.minor, vocabulary: cfg.vocab, length: cfg.length, cadence: 'PAC' }, rng);
        const sopranoPc: (number | undefined)[] = model.map(() => undefined);
        sopranoPc[model.length - 1] = pcOf(key.tonic);
        const r = realize(model, key, { sopranoPc });
        const melody = r.voicings.map((v) => v[3]);
        // the melody should move mostly by step: reject very jumpy lines
        const leaps = melody.slice(1).filter((m, i) => Math.abs(m - melody[i]) > 5).length;
        if (leaps > 1) continue;
        const choices = melody.map((m) => cfg.vocab.filter((s) => parseRoman(s, key).pcs.some((p) => pcOf(p) === m % 12)));
        return { key, melody, melodyNames: r.names.map((n) => n[3]), model, vocabulary: cfg.vocab, choices };
      } catch {
        /* retry */
      }
    }
  },
};

export interface HarmonizationGrade extends CheckResult {
  problems: string[];
  realization?: ReturnType<typeof realize>;
}

/** Rule-based grading: any harmonization that follows the rules is correct. */
export function gradeHarmonization(q: HarmonizeQ, symbols: string[]): HarmonizationGrade {
  const problems: string[] = [];
  const chords = symbols.map((s) => parseRoman(s, q.key));
  chords.forEach((c, i) => {
    if (!c.pcs.some((p) => pcOf(p) === q.melody[i] % 12)) problems.push(`${prettyRoman(c.symbol)} doesn't contain the melody note ${q.melodyNames[i]}.`);
  });
  if (chords[0].degree !== 1) problems.push('Start on the tonic chord to establish the key.');
  const n = chords.length;
  const last = chords[n - 1];
  const pen = chords[n - 2];
  if (!(last.degree === 1 && last.inversion === 0)) problems.push('End on the tonic in root position.');
  if (!(pen.degree === 5 && (pen.inversion === 0 || pen.seventh))) problems.push('Approach the final tonic with V (or V7) — an authentic cadence.');
  for (let i = 1; i < n; i++) {
    const a = chords[i - 1];
    const b = chords[i];
    if ((a.degree === 5 || a.degree === 7) && (b.degree === 4 || b.degree === 2) && !(a.degree === 5 && b.degree === 4 && b.inversion === 1)) {
      problems.push(`${prettyRoman(a.symbol)} → ${prettyRoman(b.symbol)} is a retrogression: dominant chords move to the tonic (or vi), not back to the predominant.`);
    }
    if (a.symbol === 'I64' && b.degree !== 5) problems.push('The cadential 6/4 must go to V.');
    if (a.symbol === b.symbol && i === n - 1) problems.push('Change chord at the cadence.');
  }
  let realization: ReturnType<typeof realize> | undefined;
  try {
    realization = realize(symbols, q.key, { soprano: q.melody });
    const errs = errorsOnly(checkProgression(realization.voicings, realization.chords, q.key));
    for (const e of errs) problems.push(`Voice-leading: ${e.message} (between chords ${e.at} and ${e.at + 1}) — this chord choice forces it against the melody.`);
  } catch {
    problems.push('These chords can’t be voiced under this melody within normal ranges.');
  }
  return {
    correct: problems.length === 0,
    expected: q.model.map(prettyRoman).join(' – '),
    given: symbols.map(prettyRoman).join(' – '),
    feedback: problems.length ? problems.join(' ') : 'A valid harmonization — listen to how your bass line supports the melody.',
    problems,
    realization,
  };
}

export { makeOptions };
