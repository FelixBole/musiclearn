/**
 * Roman numeral parsing and chord spelling in a key.
 *
 * Syntax:  [b|#] numeral [°|ø|+] [7] [figure] [/ secondary]
 *   numeral: I II III IV V VI VII (major triad) or lowercase (minor triad)
 *   figures: 6, 64 (triads)  ·  7, 65, 43, 42 / 2 (sevenths)
 *   examples: I  V6  ii65  vii°7  V7/V  bVI  iv6  I64  V42  viiø7
 *
 * Accidental prefixes are relative to the MAJOR scale of the tonic (bVI = lowered 6th),
 * the common modern convention. In minor keys, unprefixed numerals use natural minor,
 * except vii° (and V) which use the raised leading tone.
 */
import { LETTERS, accidentalString, parseNote } from '../theory';
import { Note } from 'tonal';

export interface KeyCtx {
  tonic: string; // pitch class, e.g. "C", "F#", "Bb"
  minor: boolean;
}

export type TriadQuality = 'maj' | 'min' | 'dim' | 'aug';
export type ChordQualityId = TriadQuality | 'dom7' | 'maj7' | 'min7' | 'm7b5' | 'dim7' | 'mMaj7';

export interface RomanChord {
  symbol: string;
  degree: number; // 1..7 (of the key the numeral is read in)
  root: string; // spelled pitch class
  quality: ChordQualityId;
  /** spelled pitch classes in root position (root, 3rd, 5th[, 7th]) */
  pcs: string[];
  inversion: number; // 0 = root position
  seventh: boolean;
  /** pitch class of the bass note */
  bass: string;
  /** secondary target numeral (e.g. "V" in V7/V) */
  secondaryOf?: string;
  /** key the chord was spelled in (secondary chords tonicize another key) */
  localKey: KeyCtx;
}

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const TRIAD_INTERVALS: Record<TriadQuality, [number, number]> = {
  maj: [4, 7],
  min: [3, 7],
  dim: [3, 6],
  aug: [4, 8],
};

const SEVENTH_QUALITIES: Record<string, { triad: TriadQuality; seventh: number }> = {
  dom7: { triad: 'maj', seventh: 10 },
  maj7: { triad: 'maj', seventh: 11 },
  min7: { triad: 'min', seventh: 10 },
  m7b5: { triad: 'dim', seventh: 10 },
  dim7: { triad: 'dim', seventh: 9 },
  mMaj7: { triad: 'min', seventh: 11 },
};

const pcOf = (name: string) => Note.chroma(name) as number;

/** Spell the note `letterSteps` letters and `semis` semitones above `root` (pitch classes). */
export function spellAbove(root: string, letterSteps: number, semis: number): string {
  const r = parseNote(`${root}4`);
  const letter = LETTERS[(LETTERS.indexOf(r.letter) + letterSteps) % 7];
  const target = (((pcOf(root) + semis) % 12) + 12) % 12;
  const natural = pcOf(letter);
  let acc = target - natural;
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  return `${letter}${accidentalString(acc)}`;
}

/** Pitch class of scale degree (1..7) in key, with an alteration. */
function degreeRoot(key: KeyCtx, degree: number, alter: number, raisedLeadingTone: boolean): string {
  const steps = key.minor && alter === 0 ? MINOR_STEPS : MAJOR_STEPS;
  let semis = steps[degree - 1] + alter;
  if (key.minor && alter === 0 && degree === 7 && raisedLeadingTone) semis = 11;
  return spellAbove(key.tonic, degree - 1, semis);
}

/** Key scale semitone offsets (harmonic-minor 7th when requested). */
function scaleSemis(key: KeyCtx, raised7: boolean): number[] {
  if (!key.minor) return MAJOR_STEPS;
  return raised7 ? [0, 2, 3, 5, 7, 8, 11] : MINOR_STEPS;
}

const FIGURES: Record<string, { inversion: number; seventh: boolean }> = {
  '': { inversion: 0, seventh: false },
  '6': { inversion: 1, seventh: false },
  '64': { inversion: 2, seventh: false },
  '7': { inversion: 0, seventh: true },
  '65': { inversion: 1, seventh: true },
  '43': { inversion: 2, seventh: true },
  '42': { inversion: 3, seventh: true },
  '2': { inversion: 3, seventh: true },
};

const RE = /^([b#♭♯]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)([°oø+]?)(maj7|7|65|64|6|43|42|2)?$/;

export function parseRoman(symbol: string, key: KeyCtx): RomanChord {
  const [primary, target] = symbol.split('/');
  if (target) {
    // Secondary chord: read the primary in the key of the target degree.
    const t = parseRoman(target, key);
    const local: KeyCtx = { tonic: t.root, minor: t.quality === 'min' || t.quality === 'dim' };
    const c = parseRoman(primary, local);
    return { ...c, symbol, secondaryOf: target, localKey: local };
  }
  const m = RE.exec(primary.trim());
  if (!m) throw new Error(`Cannot parse Roman numeral "${symbol}"`);
  const [, accStr, numeral, mark, figRaw = ''] = m;
  const alter = accStr === 'b' || accStr === '♭' ? -1 : accStr === '#' || accStr === '♯' ? 1 : 0;
  const upper = numeral === numeral.toUpperCase();
  const degree = NUMERALS.indexOf(numeral.toUpperCase()) + 1;
  const isMaj7 = figRaw === 'maj7';
  const fig = FIGURES[isMaj7 ? '7' : figRaw];

  let triad: TriadQuality = upper ? 'maj' : 'min';
  if (mark === '°' || mark === 'o' || mark === 'ø') triad = 'dim';
  if (mark === '+') triad = 'aug';

  // Leading tone: vii° in minor (and dominant V) use the raised 7th.
  const raised = key.minor && (degree === 5 || (degree === 7 && triad === 'dim'));
  const root = degreeRoot(key, degree, alter, raised);

  let quality: ChordQualityId = triad;
  if (fig.seventh) {
    if (mark === 'ø') quality = 'm7b5';
    else if (isMaj7) quality = triad === 'min' ? 'mMaj7' : 'maj7';
    else if (mark === '°' || mark === 'o') quality = 'dim7';
    else {
      // diatonic seventh from the scale (dominant-type for V, and for altered/borrowed majors)
      const semis = scaleSemis(key, raised);
      const rootSemis = (pcOf(root) - pcOf(key.tonic) + 12) % 12;
      const seventhSemis = alter === 0 ? semis[(degree + 5) % 7] : -1;
      const interval = seventhSemis < 0 ? 10 : (seventhSemis - rootSemis + 12) % 12;
      if (triad === 'maj') quality = degree === 5 || interval === 10 ? 'dom7' : 'maj7';
      else if (triad === 'min') quality = interval === 11 ? 'mMaj7' : 'min7';
      else if (triad === 'dim') quality = interval === 9 ? 'dim7' : 'm7b5';
      else quality = 'maj7';
    }
  }

  const [third, fifth] = fig.seventh ? TRIAD_INTERVALS[SEVENTH_QUALITIES[quality].triad] : TRIAD_INTERVALS[triad];
  const pcs = [root, spellAbove(root, 2, third), spellAbove(root, 4, fifth)];
  if (fig.seventh) pcs.push(spellAbove(root, 6, SEVENTH_QUALITIES[quality].seventh));

  return {
    symbol,
    degree,
    root,
    quality,
    pcs,
    inversion: fig.inversion,
    seventh: fig.seventh,
    bass: pcs[fig.inversion],
    localKey: key,
  };
}

/** Pretty display: "V65" → "V⁶₅", "I64" → "I⁶₄", "vii°7" stays, "bVI" → "♭VI". */
export function prettyRoman(symbol: string): string {
  return symbol
    .split('/')
    .map((part) =>
      part
        .replace(/^b/, '♭')
        .replace(/^#/, '♯')
        .replace(/65$/, '⁶₅')
        .replace(/43$/, '⁴₃')
        .replace(/42$/, '⁴₂')
        .replace(/64$/, '⁶₄')
        .replace(/(?<![⁶⁴])6$/, '⁶')
        .replace(/(?<=[IVvi°ø+])7$/, '⁷'),
    )
    .join('/');
}

/** Function of a diatonic chord (major-key thinking; minor equivalent by degree). */
export type HarmonicFunction = 'T' | 'PD' | 'D';
export function harmonicFunction(c: RomanChord): HarmonicFunction {
  if (c.secondaryOf) return 'D';
  switch (c.degree) {
    case 1:
    case 6:
    case 3:
      return c.degree === 1 && c.inversion === 2 && !c.seventh ? 'D' : 'T'; // cadential 6/4 behaves as dominant
    case 2:
    case 4:
      return 'PD';
    default:
      return 'D';
  }
}

/** Leading tone (raised 7th) of a key as a pitch class number. */
export function leadingTonePc(key: KeyCtx): number {
  return (pcOf(key.tonic) + 11) % 12;
}

export { pcOf };
