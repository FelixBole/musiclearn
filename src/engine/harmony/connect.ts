/**
 * Passing-chord explorer: given chord A and chord B in a key, list the classic ways to get
 * from one to the other (applied dominants, passing chords, borrowed chords, chromatic
 * mediants, suspensions…). Every suggestion is voiced and must pass the voice-leading checker.
 */
import { chordName, parseRoman, pcOf, type KeyCtx, type RomanChord } from './roman';
import { realize, type Realization } from './voicing';
import { checkProgression, errorsOnly } from './voiceleading';
import { prettyPc } from '../theory';

const P = (p: string) => prettyPc(p);

export type BridgeFamily = 'direct' | 'dominant' | 'diatonic' | 'borrowed' | 'chromatic' | 'cinematic' | 'suspension';

export const FAMILY_LABELS: Record<BridgeFamily, string> = {
  direct: 'Direct',
  dominant: 'Dominant pull',
  diatonic: 'Diatonic passing',
  borrowed: 'Borrowed (modal mixture)',
  chromatic: 'Chromatic',
  cinematic: 'Cinematic',
  suspension: 'Suspension',
};

export interface Bridge {
  id: string;
  family: BridgeFamily;
  title: string;
  /** chords inserted between A and B */
  insert: string[];
  explain: string;
}

export interface RealizedBridge extends Bridge {
  symbols: string[];
  realization: Realization;
  warnings: number;
  /** total semitones moved by the upper voices (lower = smoother) */
  motion: number;
}

const HEAD_RE = /^([b#♭♯]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)([°oø+]?)/;
const MAJOR_NUMERALS = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10, 11]; // natural minor + raised 7th

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const stepDist = (a: number, b: number) => Math.min(mod12(a - b), mod12(b - a));

/** "V7" → "V", "ii65" → "ii", "bVI" → "bVI": the triad to tonicize. */
function targetOf(symbol: string): string | null {
  if (symbol.includes('/')) return null;
  const m = HEAD_RE.exec(symbol);
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3] === 'o' ? '°' : m[3]}`;
}

function isDiatonic(c: RomanChord, key: KeyCtx): boolean {
  const scale = key.minor ? MINOR_SCALE : MAJOR_SCALE;
  const t = pcOf(key.tonic);
  return c.pcs.every((p) => scale.includes(mod12(pcOf(p) - t)));
}

function safeParse(s: string, key: KeyCtx): RomanChord | null {
  try {
    return parseRoman(s, key);
  } catch {
    return null;
  }
}

/** Pick the inversion of `base` (e.g. "V7/V") whose bass moves most smoothly from A to B. */
function bestInversion(base: string, figures: string[], a: RomanChord, b: RomanChord, key: KeyCtx): string {
  const [head, target] = base.split('/');
  let best = base;
  let bestScore = Infinity;
  for (const f of figures) {
    const sym = `${head.replace(/7$/, '')}${f}${target ? `/${target}` : ''}`;
    const c = safeParse(sym, key);
    if (!c) continue;
    const bp = pcOf(c.bass);
    const score = stepDist(pcOf(a.bass), bp) + stepDist(bp, pcOf(b.bass)) * 1.5 + (f === '7' || f === '' ? -0.5 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = sym;
    }
  }
  return best;
}

export function candidateBridges(aSym: string, bSym: string, key: KeyCtx): Bridge[] {
  const a = parseRoman(aSym, key);
  const b = parseRoman(bSym, key);
  const t = targetOf(bSym);
  const tChord = t ? safeParse(t, key) : null;
  const isTonic = !!t && /^[Ii]$/.test(t);
  const applied = (x: string) => (isTonic ? x : `${x}/${t}`);
  const canTonicize = !!tChord && !b.kind && (tChord.quality === 'maj' || tChord.quality === 'min');
  const bName = chordName(b, false);
  const out: Bridge[] = [];
  const add = (br: Bridge) => {
    if (br.insert.length && (br.insert[0] === aSym || br.insert[br.insert.length - 1] === bSym)) return;
    if (!out.some((o) => o.insert.join(' ') === br.insert.join(' '))) out.push(br);
  };

  add({ id: 'direct', family: 'direct', title: 'Straight there', insert: [], explain: 'The plain connection, for comparison. Listen to it first, then hear what each option below adds.' });

  if (canTonicize) {
    const V = bestInversion(applied('V7'), ['7', '65', '43', '42'], a, b, key);
    const vc = parseRoman(V, key);
    const lt = P(parseRoman(applied('V'), key).pcs[1]);
    add({
      id: 'sec-dom',
      family: 'dominant',
      title: isTonic ? 'Dominant 7th' : `Secondary dominant (${V.split('/')[0].replace(/\d+/, '7')}/${t})`,
      insert: [V],
      explain: `${chordName(vc)} is the dominant of ${bName}: its 3rd (${lt}) is a temporary leading tone pulling up into ${bName}. The strongest, most “classical” approach.`,
    });
    const vii = bestInversion(applied('vii°7'), ['7', '65', '43', '42'], a, b, key);
    add({
      id: 'lt-dim',
      family: 'dominant',
      title: isTonic ? 'Leading-tone diminished 7th' : `Leading-tone °7 (vii°7/${t})`,
      insert: [vii],
      explain: `${chordName(parseRoman(vii, key))}: every note sits a half or whole step from a note of ${bName}, so it melts into it. More tension and drama than a V7.`,
    });
    if (tChord.quality === 'maj' || !isTonic) {
      const ii = tChord.quality === 'maj' ? applied('ii7') : applied('iiø7');
      add({
        id: 'ii-v',
        family: 'dominant',
        title: isTonic ? 'ii–V' : `Applied ii–V into ${t}`,
        insert: [ii, applied('V7')],
        explain: `A miniature cadence in the key of ${bName}: its own predominant, then its own dominant. Jazz standards and film scores use this to “aim” at a chord.`,
      });
    }
  }

  // Diatonic passing / neighbour chords: the bass walks by step from A's bass to B's bass.
  const diatonic = key.minor
    ? ['i', 'i6', 'ii°6', 'III', 'iv', 'iv6', 'V', 'V6', 'V43', 'V65', 'V42', 'VI', 'vii°6', 'vii°7', 'i64', 'iv64']
    : ['I', 'I6', 'ii', 'ii6', 'iii', 'IV', 'IV6', 'V', 'V6', 'V43', 'V65', 'V42', 'vi', 'vii°6', 'I64', 'IV64', 'V64'];
  const ab = pcOf(a.bass);
  const bb = pcOf(b.bass);
  let passing = 0;
  for (const x of diatonic) {
    if (passing >= 2 || x === aSym || x === bSym) continue;
    const c = parseRoman(x, key);
    if (c.root === b.root && c.quality === b.quality) continue;
    const xb = pcOf(c.bass);
    const d1 = mod12(xb - ab);
    const d2 = mod12(bb - xb);
    const up = d1 >= 1 && d1 <= 2 && d2 >= 1 && d2 <= 2;
    const down = mod12(ab - xb) >= 1 && mod12(ab - xb) <= 2 && mod12(xb - bb) >= 1 && mod12(xb - bb) <= 2;
    const pedal = ab === bb && xb === ab && c.root !== a.root;
    if (!up && !down && !pedal) continue;
    passing++;
    add({
      id: `pass-${x}`,
      family: 'diatonic',
      title: pedal ? `Pedal / neighbour chord (${x})` : `Passing chord (${x})`,
      insert: [x],
      explain: pedal
        ? `The bass holds ${P(a.bass)} while the upper voices step out to ${chordName(c, false)} and back. Pure “glue”: it adds motion without changing the harmony's direction.`
        : `The bass walks ${P(a.bass)} → ${P(c.bass)} → ${P(b.bass)} by step. The ear hears a line rather than a new harmony, so it feels smooth and inevitable.`,
    });
  }

  const bIsDominant = b.degree === 5 && !b.secondaryOf && (b.quality === 'maj' || b.quality === 'dom7') && !b.kind;
  const bIsTonic = isTonic && b.inversion === 0 && !b.kind;
  const bIsCad64 = b.degree === 1 && b.inversion === 2 && !b.secondaryOf;
  if (!key.minor) {
    if (bIsDominant) {
      add({ id: 'iv6', family: 'borrowed', title: 'Minor iv⁶ (borrowed)', insert: ['iv6'], explain: `Borrow iv from the parallel minor and put its 3rd (${P(parseRoman('iv', key).pcs[1])}) in the bass: it sinks a half step onto the dominant. Dark, lamenting, very “film”.` });
      add({ id: 'bVI-V', family: 'borrowed', title: '♭VI (borrowed)', insert: ['bVI'], explain: `${chordName(parseRoman('bVI', key))} → ${bName}: the bass drops a half step onto the dominant. The epic, heavy pre-dominant of trailer music.` });
      add({ id: 'iio65', family: 'borrowed', title: 'Half-diminished ii (borrowed)', insert: ['iiø65'], explain: 'ii⁷ with the minor key\'s ♭6: a darker, more yearning pre-dominant than plain ii⁶₅.' });
    }
    if (bIsTonic) {
      add({ id: 'iv-I', family: 'borrowed', title: 'Minor plagal (iv → I)', insert: ['iv'], explain: `IV turned minor: ${P(parseRoman('iv', key).pcs[1])} sinks to ${P(parseRoman('I', key).pcs[2])} as the major tonic arrives. Bittersweet, nostalgic: the “sunset” cadence.` });
      add({ id: 'bVII-I', family: 'borrowed', title: '♭VII → I (backdoor)', insert: ['bVII'], explain: `${chordName(parseRoman('bVII', key))} → ${bName}: a heroic, Mixolydian arrival with no leading tone. Rock anthems and adventure themes.` });
      add({ id: 'bVI-bVII-I', family: 'cinematic', title: '♭VI – ♭VII – I (Aeolian cadence)', insert: ['bVI', 'bVII'], explain: 'Two major chords borrowed from minor climb by step into the major tonic: the triumphant “victory” cadence of games and epic scores.' });
    }
  } else if (bIsTonic) {
    add({ id: 'VII-i', family: 'borrowed', title: 'Subtonic VII → i', insert: ['VII'], explain: `The natural-minor VII (${chordName(parseRoman('VII', key))}) instead of V: modal, ancient, no leading tone. Celtic and folk colour.` });
    add({ id: 'VI-VII-i', family: 'cinematic', title: 'VI – VII – i (Aeolian)', insert: ['VI', 'VII'], explain: 'Stepwise climb into the minor tonic without a dominant: dark, epic, inevitable. A staple of battle themes.' });
    add({ id: 'iv-i', family: 'borrowed', title: 'Minor plagal (iv → i)', insert: ['iv'], explain: 'The plagal cadence in minor: a solemn, hymn-like close.' });
  }
  if (bIsDominant || bIsCad64) {
    add({ id: 'N6', family: 'chromatic', title: 'Neapolitan (N⁶)', insert: ['N6'], explain: `${chordName(parseRoman('N6', key))}: the lowered 2nd degree as a major chord over the 4th degree. Its ${P(parseRoman('N', key).root)} falls to the leading tone — tragic, operatic.` });
  }
  if (bIsDominant) {
    add({ id: 'It6', family: 'chromatic', title: 'Italian augmented 6th', insert: ['It+6'], explain: `${parseRoman('It+6', key).pcs.map(P).join('–')}: the outer notes form an augmented 6th that expands outward to the octave on ${P(b.root)}. Maximum pull into the dominant.` });
    add({ id: 'Fr6', family: 'chromatic', title: 'French augmented 6th', insert: ['Fr+6'], explain: 'The augmented 6th with an added 2nd degree: whole-tone, misty colour (Debussy and fantasy scores).' });
  }
  if (bIsCad64) {
    add({ id: 'Ger6', family: 'chromatic', title: 'German augmented 6th', insert: ['Ger+6'], explain: 'Sounds like a dominant 7th but spelled to expand outward: ♭6 falls, ♯4 rises, landing on the cadential 6/4.' });
  }
  if (canTonicize && tChord.quality === 'maj' && b.inversion === 0) {
    const ct = isTonic ? 'ct°7' : `ct°7/${t}`;
    add({ id: 'ctdim', family: 'cinematic', title: 'Common-tone diminished 7th', insert: [ct], explain: `${bName}'s root is held in the bass while the other voices slide by half step around it. Shimmering and nostalgic, very “Golden-Age Hollywood”.` });
  }

  // Chromatic mediants: a major triad a 3rd away from B, sharing a note with both A and B.
  const tonicPc = pcOf(key.tonic);
  const bPcs = new Set(b.pcs.map(pcOf));
  const aPcs = new Set(a.pcs.map(pcOf));
  let mediants = 0;
  for (const off of [3, 4, 8, 9]) {
    if (mediants >= 2) break;
    const rootSemis = mod12(pcOf(b.root) + off - tonicPc);
    const sym = MAJOR_NUMERALS[rootSemis];
    const c = safeParse(sym, key);
    if (!c || isDiatonic(c, key) || sym === aSym) continue;
    const shared = c.pcs.filter((p) => bPcs.has(pcOf(p)));
    if (!shared.length || !c.pcs.some((p) => aPcs.has(pcOf(p)))) continue;
    mediants++;
    add({
      id: `med-${sym}`,
      family: 'cinematic',
      title: `Chromatic mediant (${sym.replace(/^b/, '♭').replace(/^#/, '♯')})`,
      insert: [sym],
      explain: `${chordName(c)} sits a third from ${bName} and shares ${shared.map(P).join(' & ')} with it: that common tone is the hinge. Unexpected but smooth: the “wonder” sound of film scores.`,
    });
  }

  if (b.inversion === 0 && !b.kind && !b.secondaryOf && (b.quality === 'maj' || b.quality === 'min' || b.quality === 'dom7') && t) {
    const sus = `${t}${b.seventh ? '7' : ''}sus4`;
    const sc = safeParse(sus, key);
    if (sc) {
      add({ id: 'sus', family: 'suspension', title: 'Suspension (4–3)', insert: [sus], explain: `Arrive at ${bName}'s root but hold ${P(sc.pcs[1])} (a 4th above) before it falls to the 3rd. Delays the resolution: the emotional climax trick.` });
    }
  }
  if (canTonicize && (tChord.quality === 'maj' || tChord.quality === 'min')) {
    const tt = applied('bII7');
    const c = safeParse(tt, key);
    if (c) {
      add({ id: 'tritone', family: 'chromatic', title: 'Tritone substitution', insert: [tt], explain: `${chordName(c)} replaces the dominant of ${bName}: same tritone, but the bass slides down a half step. Jazzy, noir, slyly sophisticated.` });
    }
  }
  return out;
}

/** Voice every candidate; keep only those with clean voice leading. */
export function findBridges(aSym: string, bSym: string, key: KeyCtx): RealizedBridge[] {
  const out: RealizedBridge[] = [];
  for (const br of candidateBridges(aSym, bSym, key)) {
    const symbols = [aSym, ...br.insert, bSym];
    try {
      const r = realize(symbols, key);
      const issues = checkProgression(r.voicings, r.chords, key);
      if (errorsOnly(issues).length && br.family !== 'direct') continue;
      let motion = 0;
      for (let i = 1; i < r.voicings.length; i++) for (let v = 1; v < 4; v++) motion += Math.abs(r.voicings[i][v] - r.voicings[i - 1][v]);
      out.push({ ...br, symbols, realization: r, warnings: issues.filter((i) => i.severity === 'warning').length, motion });
    } catch {
      /* not voiceable — skip */
    }
  }
  return out;
}
