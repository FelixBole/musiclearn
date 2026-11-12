/**
 * Four-part (SATB) voice-leading checker.
 * Voices are always ordered [bass, tenor, alto, soprano] as MIDI numbers.
 */
import { harmonicFunction, leadingTonePc, pcOf, type KeyCtx, type RomanChord } from './roman';

export type Satb = [number, number, number, number];
export const VOICE_NAMES = ['bass', 'tenor', 'alto', 'soprano'] as const;
export const VOICE_SHORT = ['B', 'T', 'A', 'S'] as const;

/** Comfortable ranges (inclusive MIDI): B E2–C4, T C3–G4, A G3–D5, S C4–G5 */
export const RANGES: [number, number][] = [
  [40, 60],
  [48, 67],
  [55, 74],
  [60, 79],
];

export type RuleId =
  | 'range'
  | 'spacing'
  | 'crossing'
  | 'wrong-note'
  | 'wrong-bass'
  | 'missing-third'
  | 'missing-seventh'
  | 'doubled-leading-tone'
  | 'doubled-seventh'
  | 'parallel-fifths'
  | 'parallel-octaves'
  | 'direct-fifths'
  | 'direct-octaves'
  | 'overlap'
  | 'leading-tone-unresolved'
  | 'seventh-unresolved'
  | 'augmented-melodic'
  | 'large-leap'
  | 'missing-tone'
  | 'doubled-tendency'
  | 'tendency-unresolved'
  | 'cross-relation';

export interface Issue {
  rule: RuleId;
  severity: 'error' | 'warning';
  /** chord index (for pair rules: the index of the SECOND chord) */
  at: number;
  voices: number[];
  message: string;
}

export const RULE_LABELS: Record<RuleId, string> = {
  range: 'Out of range',
  spacing: 'Spacing too wide',
  crossing: 'Voice crossing',
  'wrong-note': 'Note not in the chord',
  'wrong-bass': 'Wrong bass note / inversion',
  'missing-third': 'Missing 3rd',
  'missing-seventh': 'Missing 7th',
  'doubled-leading-tone': 'Doubled leading tone',
  'doubled-seventh': 'Doubled 7th',
  'parallel-fifths': 'Parallel 5ths',
  'parallel-octaves': 'Parallel octaves',
  'direct-fifths': 'Direct (hidden) 5ths',
  'direct-octaves': 'Direct (hidden) octaves',
  overlap: 'Voice overlap',
  'leading-tone-unresolved': 'Leading tone doesn’t resolve',
  'seventh-unresolved': '7th doesn’t resolve down',
  'augmented-melodic': 'Augmented melodic interval',
  'large-leap': 'Awkward leap',
  'missing-tone': 'Missing chord tone',
  'doubled-tendency': 'Doubled tendency tone',
  'tendency-unresolved': 'Tendency tone doesn’t resolve',
  'cross-relation': 'Cross-relation',
};

/** Chord qualities that act as a dominant (for secondary leading-tone rules). */
const DOMINANT_QUALITIES = new Set(['maj', 'dom7', 'dim', 'dim7', 'm7b5']);
const isAppliedDominant = (c: RomanChord) => !!c.secondaryOf && !c.kind && DOMINANT_QUALITIES.has(c.quality);
/** leading tone of the key a secondary chord tonicizes */
const localLeadingTone = (c: RomanChord) => (pcOf(c.localKey.tonic) + 11) % 12;

const pc = (m: number) => ((m % 12) + 12) % 12;
const interval = (low: number, high: number) => pc(high - low);
const vn = (i: number) => VOICE_NAMES[i];

/* ---------------- single chord ---------------- */

export function checkChord(v: Satb, at: number, chord?: RomanChord, keyArg?: KeyCtx): Issue[] {
  const issues: Issue[] = [];
  const key = chord?.key ?? keyArg;
  v.forEach((m, i) => {
    const [lo, hi] = RANGES[i];
    if (m < lo - 2 || m > hi + 2) {
      issues.push({ rule: 'range', severity: 'error', at, voices: [i], message: `The ${vn(i)} is out of its range.` });
    } else if (m < lo || m > hi) {
      issues.push({ rule: 'range', severity: 'warning', at, voices: [i], message: `The ${vn(i)} is at the edge of its range.` });
    }
  });
  for (let i = 1; i < 4; i++) {
    if (v[i] < v[i - 1]) {
      issues.push({ rule: 'crossing', severity: 'error', at, voices: [i - 1, i], message: `The ${vn(i)} is below the ${vn(i - 1)}.` });
    }
  }
  if (v[3] - v[2] > 12) issues.push({ rule: 'spacing', severity: 'error', at, voices: [2, 3], message: 'More than an octave between soprano and alto.' });
  if (v[2] - v[1] > 12) issues.push({ rule: 'spacing', severity: 'error', at, voices: [1, 2], message: 'More than an octave between alto and tenor.' });

  if (chord) {
    const pcs = chord.pcs.map(pcOf);
    const wrong = v.map((m, i) => (pcs.includes(pc(m)) ? -1 : i)).filter((i) => i >= 0);
    if (wrong.length) {
      issues.push({ rule: 'wrong-note', severity: 'error', at, voices: wrong, message: `Not a note of ${chord.symbol} (${chord.pcs.join(' ')}).` });
    }
    if (pc(v[0]) !== pcOf(chord.bass)) {
      issues.push({ rule: 'wrong-bass', severity: 'error', at, voices: [0], message: `The bass should be ${chord.bass} for ${chord.symbol}.` });
    }
    const present = new Set(v.map(pc));
    if (chord.essential) {
      const missing = chord.essential.filter((p) => !present.has(pcOf(p)));
      if (missing.length) issues.push({ rule: 'missing-tone', severity: 'error', at, voices: [], message: `${missing.join(' and ')} must sound — it defines the chord.` });
    } else {
      if (!present.has(pcs[1])) issues.push({ rule: 'missing-third', severity: 'error', at, voices: [], message: 'The 3rd is missing — the chord loses its major/minor colour.' });
      if (chord.seventh && !present.has(pcs[3])) issues.push({ rule: 'missing-seventh', severity: 'error', at, voices: [], message: 'The 7th is missing.' });
    }
    for (const p of chord.noDouble ?? []) {
      const idx = v.map((m, i) => (pc(m) === pcOf(p) ? i : -1)).filter((i) => i >= 0);
      if (idx.length > 1) issues.push({ rule: 'doubled-tendency', severity: 'error', at, voices: idx, message: `${p} is a tendency tone — doubling it forces parallel octaves when it resolves.` });
    }
    if (isAppliedDominant(chord)) {
      const lt = localLeadingTone(chord);
      const lts = v.map((m, i) => (pc(m) === lt ? i : -1)).filter((i) => i >= 0);
      if (lts.length > 1) issues.push({ rule: 'doubled-leading-tone', severity: 'error', at, voices: lts, message: 'The leading tone of the tonicized chord is doubled.' });
    }
    if (chord.seventh) {
      const sevenths = v.map((m, i) => (pc(m) === pcs[3] ? i : -1)).filter((i) => i >= 0);
      if (sevenths.length > 1) issues.push({ rule: 'doubled-seventh', severity: 'error', at, voices: sevenths, message: 'The 7th is doubled — both copies would need to resolve down (parallel octaves).' });
    }
    if (key && harmonicFunction(chord) === 'D' && !chord.secondaryOf) {
      const lt = leadingTonePc(key);
      const lts = v.map((m, i) => (pc(m) === lt ? i : -1)).filter((i) => i >= 0);
      if (lts.length > 1) issues.push({ rule: 'doubled-leading-tone', severity: 'error', at, voices: lts, message: 'The leading tone is doubled — it wants to resolve up, so two copies create parallel octaves.' });
    }
  }
  return issues;
}

/* ---------------- chord pair ---------------- */

export function checkPair(a: Satb, b: Satb, at: number, ca?: RomanChord, cb?: RomanChord, keyArg?: KeyCtx): Issue[] {
  const issues: Issue[] = [];
  const key = ca?.key ?? keyArg;
  // parallels (any voice pair), both voices must move
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (a[i] === b[i] && a[j] === b[j]) continue;
      const i1 = interval(a[i], a[j]);
      const i2 = interval(b[i], b[j]);
      const moved = a[i] !== b[i] && a[j] !== b[j];
      if (!moved) continue;
      if (i1 === 7 && i2 === 7) {
        issues.push({ rule: 'parallel-fifths', severity: 'error', at, voices: [i, j], message: `Parallel 5ths between ${vn(i)} and ${vn(j)}.` });
      } else if (i1 === 0 && i2 === 0) {
        issues.push({ rule: 'parallel-octaves', severity: 'error', at, voices: [i, j], message: `Parallel octaves/unisons between ${vn(i)} and ${vn(j)}.` });
      }
    }
  }
  // direct 5ths/8ves: outer voices, similar motion into a perfect interval, soprano leaps
  const bassDir = Math.sign(b[0] - a[0]);
  const sopDir = Math.sign(b[3] - a[3]);
  const sopLeap = Math.abs(b[3] - a[3]) > 2;
  if (bassDir !== 0 && bassDir === sopDir && sopLeap) {
    const iv = interval(b[0], b[3]);
    const prev = interval(a[0], a[3]);
    if (iv === 7 && prev !== 7) issues.push({ rule: 'direct-fifths', severity: 'warning', at, voices: [0, 3], message: 'Outer voices move in the same direction into a 5th with a leap in the soprano.' });
    if (iv === 0 && prev !== 0) issues.push({ rule: 'direct-octaves', severity: 'warning', at, voices: [0, 3], message: 'Outer voices move in the same direction into an octave with a leap in the soprano.' });
  }
  // overlap
  for (let i = 0; i < 3; i++) {
    if (b[i] > a[i + 1] || b[i + 1] < a[i]) {
      issues.push({ rule: 'overlap', severity: 'warning', at, voices: [i, i + 1], message: `The ${vn(i)} and ${vn(i + 1)} overlap (one passes the other's previous note).` });
    }
  }
  // melodic intervals
  for (let i = 0; i < 4; i++) {
    const leap = Math.abs(b[i] - a[i]);
    if (leap > 12) issues.push({ rule: 'large-leap', severity: 'error', at, voices: [i], message: `The ${vn(i)} leaps more than an octave.` });
    else if (i > 0 && i < 3 && leap > 7) issues.push({ rule: 'large-leap', severity: 'warning', at, voices: [i], message: `Big leap in the ${vn(i)} — inner voices should move smoothly.` });
    if (leap === 3 && ca && cb && isAugmentedSecond(a[i], b[i], ca, cb)) {
      issues.push({ rule: 'augmented-melodic', severity: 'error', at, voices: [i], message: `Augmented 2nd in the ${vn(i)} — hard to sing.` });
    }
    if (leap === 6 && i > 0 && i < 3) {
      issues.push({ rule: 'augmented-melodic', severity: 'warning', at, voices: [i], message: `Tritone leap in the ${vn(i)}.` });
    }
  }
  // tendency tones (skipped when the harmony just changes inversion, e.g. V7 → V65)
  if (ca && cb && key && ca.root !== cb.root) {
    const lt = leadingTonePc(key);
    const tonicPc = pcOf(key.tonic);
    const resolvesToTonicChord = cb.degree === 1 || cb.degree === 6;
    if (harmonicFunction(ca) === 'D' && !ca.secondaryOf && resolvesToTonicChord && !cb.secondaryOf) {
      for (const i of [0, 3]) {
        if (pc(a[i]) === lt && !(pc(b[i]) === tonicPc && b[i] - a[i] === 1)) {
          issues.push({ rule: 'leading-tone-unresolved', severity: 'error', at, voices: [i], message: `The leading tone in the ${vn(i)} should rise a half step to the tonic.` });
        }
      }
    }
    // A 7th may be held into a cadential 6/4 (delayed resolution, e.g. ii65 → I64 → V).
    const cadential64 = cb.degree === 1 && cb.inversion === 2 && !cb.seventh;
    // The common-tone °7's "7th" is the held tonic, not a dissonance that must fall.
    if (ca.seventh && !cadential64 && ca.kind !== 'ctdim') {
      const sev = pcOf(ca.pcs[3]);
      // a 7th may also be held to become a suspension (ii7 → V7sus4 → V7)
      const heldAsSuspension = (cb.tendencies ?? []).some((t) => pcOf(t.pc) === sev);
      const tritoneSub = ca.quality === 'dom7' && pc(pcOf(ca.root) - pcOf(cb.root)) === 1;
      for (let i = 0; i < 4; i++) {
        if (pc(a[i]) === sev) {
          const d = a[i] - b[i];
          if (d === 0 && heldAsSuspension) continue;
          // tritone substitution (♭II7 → I): the 7th is an enharmonic leading tone and rises
          if (d === -1 && tritoneSub) continue;
          if (d !== 1 && d !== 2) {
            issues.push({ rule: 'seventh-unresolved', severity: 'error', at, voices: [i], message: `The chordal 7th in the ${vn(i)} should resolve down by step.` });
          }
        }
      }
    }
  }
  if (ca && cb) {
    // applied dominants: the borrowed leading tone rises into the chord it tonicizes
    if (isAppliedDominant(ca) && pcOf(cb.root) === pcOf(ca.localKey.tonic)) {
      const lt = localLeadingTone(ca);
      for (const i of [0, 3]) {
        if (pc(a[i]) === lt && b[i] - a[i] !== 1) {
          issues.push({ rule: 'leading-tone-unresolved', severity: 'error', at, voices: [i], message: `The ${vn(i)} has the leading tone of ${ca.secondaryOf} — it should rise a half step into it.` });
        }
      }
    }
    // tendency tones of special chords (augmented 6ths, Neapolitan, suspensions)
    const bPcs = ca.tendencies ? new Set(cb.pcs.map(pcOf)) : new Set<number>();
    for (const t of ca.tendencies ?? []) {
      const target = pc(pcOf(t.pc) + t.step);
      if (!bPcs.has(target) || ca.root === cb.root && ca.kind !== 'sus') continue;
      for (let i = 0; i < 4; i++) {
        if (pc(a[i]) === pcOf(t.pc) && b[i] - a[i] !== t.step) {
          issues.push({ rule: 'tendency-unresolved', severity: 'error', at, voices: [i], message: `${t.pc} in the ${vn(i)} should move ${t.step > 0 ? 'up' : 'down'} by step to its resolution.` });
        }
      }
    }
    issues.push(...crossRelations(a, b, at, ca, cb));
  }
  return issues;
}

/** Same letter, different accidental, in different voices (e.g. F in the tenor, then F♯ in the soprano). */
function crossRelations(a: Satb, b: Satb, at: number, ca: RomanChord, cb: RomanChord): Issue[] {
  // fast path: only chords with the same letter under different accidentals can cross-relate
  if (!ca.pcs.some((x) => cb.pcs.some((y) => x[0] === y[0] && x !== y))) return [];
  const nameIn = (m: number, c: RomanChord) => c.pcs.find((p) => pcOf(p) === pc(m));
  const na = a.map((m) => nameIn(m, ca));
  const nb = b.map((m) => nameIn(m, cb));
  const out: Issue[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const x = na[i];
      const y = nb[j];
      if (!x || !y || x[0] !== y[0] || x === y || seen.has(x + y)) continue;
      seen.add(x + y);
      const inflectedInOneVoice = [0, 1, 2, 3].some((k) => na[k] === x && nb[k] === y);
      if (!inflectedInOneVoice) {
        out.push({ rule: 'cross-relation', severity: 'warning', at, voices: [i, j], message: `${x} becomes ${y} in a different voice — keep chromatic changes in one voice.` });
      }
    }
  return out;
}

function isAugmentedSecond(from: number, to: number, ca: RomanChord, cb: RomanChord): boolean {
  // 3 semitones spelled as a 2nd: letters one step apart
  const name = (m: number, c: RomanChord) => c.pcs.find((p) => pcOf(p) === pc(m));
  const n1 = name(from, ca);
  const n2 = name(to, cb);
  if (!n1 || !n2) return false;
  const letters = 'CDEFGAB';
  const d = Math.abs(letters.indexOf(n1[0]) - letters.indexOf(n2[0]));
  return d === 1 || d === 6;
}

/* ---------------- whole progression ---------------- */

export function checkProgression(voicings: Satb[], chords?: RomanChord[], key?: KeyCtx): Issue[] {
  const issues: Issue[] = [];
  voicings.forEach((v, i) => issues.push(...checkChord(v, i, chords?.[i], key)));
  for (let i = 1; i < voicings.length; i++) {
    issues.push(...checkPair(voicings[i - 1], voicings[i], i, chords?.[i - 1], chords?.[i], key));
  }
  return issues;
}

export const errorsOnly = (issues: Issue[]) => issues.filter((i) => i.severity === 'error');
