/**
 * Lead-sheet chord symbols ("Cm7", "Ab", "G7sus4", "C/E", "Fmaj9", "C/D") as RomanChord objects,
 * so they can go through the same voicing engine and checker as Roman numerals.
 */
import { Chord } from 'tonal';
import { LETTERS } from '../theory';
import { pcOf, type ChordQualityId, type KeyCtx, type RomanChord } from './roman';

const QUALITY_BY_TYPE: Record<string, ChordQualityId> = {
  major: 'maj',
  minor: 'min',
  diminished: 'dim',
  augmented: 'aug',
  'dominant seventh': 'dom7',
  'major seventh': 'maj7',
  'minor seventh': 'min7',
  'half-diminished': 'm7b5',
  'diminished seventh': 'dim7',
  'minor/major seventh': 'mMaj7',
};

const NOTE_RE = /^[A-G](#{1,2}|b{1,2}|♯|♭)?$/;
const norm = (s: string) => s.replace(/♯/g, '#').replace(/♭/g, 'b');

export function isChordSymbol(token: string): boolean {
  return /^[A-G]/.test(token) && !/^(Ger|Fr)(\+|\d|$)/.test(token);
}

export function parseChordSymbol(symbol: string, key: KeyCtx): RomanChord {
  const raw = norm(symbol.trim());
  const slash = raw.lastIndexOf('/');
  const hasBass = slash > 0 && NOTE_RE.test(raw.slice(slash + 1));
  const main = hasBass ? raw.slice(0, slash) : raw;
  const c = Chord.get(main);
  if (c.empty || !c.tonic) throw new Error(`Unknown chord symbol "${symbol}"`);

  const iv = c.intervals;
  const notes = c.notes;
  const find = (re: RegExp) => iv.findIndex((x) => re.test(x));
  const root = notes[0];
  const iThird = find(/^3[mM]$/);
  const iSus = iThird < 0 ? find(/^(4P|2M)$/) : -1;
  const iFifth = find(/^5[PdA]$/);
  const iSeventh = find(/^7[mMd]$/);
  // order: root, 3rd (or sus tone), 5th, 7th, then the rest (6ths, 9ths, 11ths, 13ths)
  const ordered = [0, iThird >= 0 ? iThird : iSus, iFifth, iSeventh].filter((i) => i >= 0);
  const rest = iv.map((_, i) => i).filter((i) => !ordered.includes(i));
  const pcs = [...ordered, ...rest].map((i) => notes[i]);

  let bass = root;
  if (hasBass) {
    const b = raw.slice(slash + 1);
    const inChord = pcs.find((p) => pcOf(p) === pcOf(b));
    if (inChord) bass = inChord;
    else {
      pcs.push(b); // pedal / non-chord bass (e.g. C/D)
      bass = b;
    }
  }
  const inversion = Math.max(0, pcs.findIndex((p) => p === bass));

  // Four voices: bass + three upper notes must carry the chord's identity.
  // Priority: 3rd/sus, 7th, top extension, root (when not in the bass), altered 5th.
  const ext = rest.length ? [notes[rest[rest.length - 1]]] : [];
  const prio = [
    iThird >= 0 ? notes[iThird] : iSus >= 0 ? notes[iSus] : undefined,
    iSeventh >= 0 ? notes[iSeventh] : undefined,
    ...ext,
    root,
    iFifth >= 0 && iv[iFifth] !== '5P' ? notes[iFifth] : undefined,
  ].filter((p): p is string => !!p && pcOf(p) !== pcOf(bass));
  const essential = [...new Set(prio)].slice(0, 3);

  const letterDeg = (LETTERS.indexOf(root[0] as (typeof LETTERS)[number]) - LETTERS.indexOf(key.tonic[0] as (typeof LETTERS)[number]) + 7) % 7;
  return {
    symbol,
    degree: letterDeg + 1,
    root,
    quality: QUALITY_BY_TYPE[c.type] ?? 'other',
    pcs,
    inversion,
    seventh: iSeventh >= 0,
    bass,
    localKey: key,
    key,
    kind: 'symbol',
    essential,
    // a sus tone wants to resolve to the (major) 3rd
    tendencies: iSus >= 0 ? [{ pc: notes[iSus], step: iv[iSus] === '4P' ? -1 : 2 }] : undefined,
  };
}
