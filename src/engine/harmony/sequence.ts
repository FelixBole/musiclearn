/**
 * Progression text → chords. One language for lessons, the playground and the explorer:
 *
 *   I vi ii65 V7 I            Roman numerals (see roman.ts)
 *   Cm Ab Eb Bb/D             chord symbols, mixed freely with numerals
 *   G: ii V7 I                key change (uppercase = major, lowercase = minor: "e:", "bb:")
 *   vi=G:ii                   pivot chord: vi in the old key = ii in G, continues in G
 *   | - – →  ,                separators, ignored
 */
import { prettyChordSymbol } from '../theory';
import { parseRoman, pcOf, prettyRoman, type KeyCtx, type RomanChord } from './roman';
import { isChordSymbol, parseChordSymbol } from './symbols';
import { realize, type Realization, type VoicingOptions } from './voicing';

export interface ProgressionItem {
  chord: RomanChord;
  label: string;
  token: string;
  /** index in tokenize(text) (for editing the text around a chord) */
  tokenIndex: number;
}

/** Whitespace/comma split, separators kept (they are skipped when parsing). */
export const tokenize = (text: string) => text.split(/[\s,]+/).filter(Boolean);
export const isSeparator = (t: string) => SEPARATORS.has(t);

export interface ParsedProgression {
  items: ProgressionItem[];
  errors: { token: string; message: string }[];
  /** key in force at the end (after modulations) */
  endKey: KeyCtx;
}

const KEY_RE = /^([A-Ga-g])(#|b|♯|♭)?:$/;
const PIVOT_KEY_RE = /^([A-Ga-g](?:#|b|♯|♭)?):(.+)$/;
const SEPARATORS = new Set(['|', '||', '-', '–', '—', '→', '->']);

/** "G" → G major, "g" → G minor, "bb" → B♭ minor, "F#" → F♯ major. */
export function parseKeyName(s: string): KeyCtx {
  const m = /^([A-Ga-g])(#|b|♯|♭)?$/.exec(s.trim());
  if (!m) throw new Error(`Unknown key "${s}"`);
  const acc = m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : (m[2] ?? '');
  return { tonic: m[1].toUpperCase() + acc, minor: m[1] === m[1].toLowerCase() };
}

/** Short key label for analysis: "C:", "f♯:" */
export function keyShort(k: KeyCtx): string {
  const t = k.tonic.replace('#', '♯').replace(/b$/, '♭');
  return `${k.minor ? t.toLowerCase() : t}:`;
}

export function parseChordToken(token: string, key: KeyCtx): RomanChord {
  return isChordSymbol(token) ? parseChordSymbol(token, key) : parseRoman(token, key);
}

export function labelFor(token: string): string {
  return isChordSymbol(token) ? prettyChordSymbol(token.replace(/♯/g, '#').replace(/♭/g, 'b')) : prettyRoman(token);
}

const samePcs = (a: RomanChord, b: RomanChord) =>
  a.pcs.length === b.pcs.length && a.pcs.every((p) => b.pcs.some((q) => pcOf(q) === pcOf(p)));

export function parseProgression(text: string, start: KeyCtx): ParsedProgression {
  const tokens = tokenize(text);
  const items: ProgressionItem[] = [];
  const errors: { token: string; message: string }[] = [];
  let key = start;
  let prefix = '';
  for (const [tokenIndex, token] of tokens.entries()) {
    if (SEPARATORS.has(token)) continue;
    try {
      const km = KEY_RE.exec(token);
      if (km) {
        key = parseKeyName(token.slice(0, -1));
        prefix = `${keyShort(key)} `;
        continue;
      }
      if (token.includes('=')) {
        const [left, right] = token.split('=');
        const chord = parseChordToken(left, key);
        const pm = PIVOT_KEY_RE.exec(right);
        const newKey = pm ? parseKeyName(pm[1]) : key;
        const rightSym = pm ? pm[2] : right;
        const other = parseChordToken(rightSym, newKey);
        if (!samePcs(chord, other)) {
          throw new Error(`${left} and ${rightSym}${pm ? ` in ${pm[1]}` : ''} are different chords — a pivot must be both`);
        }
        items.push({ chord: { ...other, symbol: token }, label: `${prefix}${labelFor(left)}=${pm ? keyShort(newKey) : ''}${labelFor(rightSym)}`, token, tokenIndex });
        key = newKey;
        prefix = '';
        continue;
      }
      items.push({ chord: parseChordToken(token, key), label: `${prefix}${labelFor(token)}`, token, tokenIndex });
      prefix = '';
    } catch (e) {
      errors.push({ token, message: (e as Error).message });
    }
  }
  return { items, errors, endKey: key };
}

export interface RealizedText {
  parsed: ParsedProgression;
  realization: Realization | null;
  error?: string;
}

/** Parse + voice a progression text in one go (lessons, playground, tests). */
export function realizeProgression(text: string, key: KeyCtx, opts?: VoicingOptions): RealizedText {
  const parsed = parseProgression(text, key);
  if (parsed.errors.length) return { parsed, realization: null, error: parsed.errors.map((e) => `“${e.token}”: ${e.message}`).join(' · ') };
  if (!parsed.items.length) return { parsed, realization: null, error: 'Empty progression' };
  try {
    const chords = parsed.items.map((i) => i.chord);
    return { parsed, realization: realize(chords, key, opts) };
  } catch (e) {
    return { parsed, realization: null, error: (e as Error).message };
  }
}
