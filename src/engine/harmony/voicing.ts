/**
 * Automatic SATB realization: enumerate voicings of each chord, then pick the
 * smoothest path through the progression (dynamic programming), using the
 * voice-leading checker as the cost function.
 */
import { parseNote, toMidi } from '../theory';
import { parseRoman, pcOf, type KeyCtx, type RomanChord } from './roman';
import { RANGES, checkChord, checkPair, type Satb } from './voiceleading';

const pc = (m: number) => ((m % 12) + 12) % 12;

export interface VoicingOptions {
  /** exact soprano MIDI per chord (melody harmonization) */
  soprano?: (number | undefined)[];
  /** soprano pitch class per chord (e.g. PAC must end on the tonic) */
  sopranoPc?: (number | undefined)[];
  /** keep voicings that break rules (used to generate "spot the error" examples) */
  allowErrors?: boolean;
  /** four different keys (no unisons) — needed when the user must play the voicing */
  distinctNotes?: boolean;
}

/** All four-part voicings of a chord within SATB ranges (no crossing). */
export function enumerateVoicings(chord: RomanChord, key: KeyCtx, allowErrors = false): Satb[] {
  const pcs = chord.pcs.map(pcOf);
  const bassPc = pcOf(chord.bass);
  const notesIn = ([lo, hi]: [number, number], ok: (p: number) => boolean) => {
    const out: number[] = [];
    for (let m = lo; m <= hi; m++) if (ok(pc(m))) out.push(m);
    return out;
  };
  const basses = notesIn(RANGES[0], (p) => p === bassPc);
  const tenors = notesIn(RANGES[1], (p) => pcs.includes(p));
  const altos = notesIn(RANGES[2], (p) => pcs.includes(p));
  const sops = notesIn(RANGES[3], (p) => pcs.includes(p));
  const out: Satb[] = [];
  for (const b of basses)
    for (const t of tenors) {
      if (t < b) continue;
      for (const a of altos) {
        if (a < t || a - t > 12) continue;
        for (const s of sops) {
          if (s < a || s - a > 12) continue;
          const v: Satb = [b, t, a, s];
          if (!allowErrors && checkChord(v, 0, chord, key).some((i) => i.severity === 'error')) continue;
          out.push(v);
        }
      }
    }
  return out;
}

/** Static preference cost for one voicing (doubling, completeness, register). */
export function chordCost(v: Satb, chord: RomanChord): number {
  const pcs = chord.pcs.map(pcOf);
  const counts = pcs.map((p) => v.filter((m) => pc(m) === p).length);
  let cost = 0;
  if (!chord.seventh) {
    if (counts[2] === 0) cost += 3; // omitted 5th
    if (chord.inversion === 0) {
      if (counts[1] > 1) cost += chord.degree === 6 || chord.degree === 4 ? 2 : 4; // doubled 3rd (ok-ish in vi after V)
      else if (counts[2] > 1) cost += 1.5;
    } else if (chord.inversion === 1) {
      if (counts[1] > 1) cost += 2;
    } else if (chord.inversion === 2) {
      if (counts[2] < 2) cost += 3; // 6/4: double the bass (the 5th)
    }
  } else if (counts.some((c) => c === 0)) {
    cost += chord.inversion === 0 && counts[2] === 0 ? 1.5 : 50; // only the 5th may be omitted, in root position
  }
  // soprano register: prefer roughly E4–E5
  if (v[3] < 64) cost += (64 - v[3]) * 0.3;
  if (v[3] > 76) cost += (v[3] - 76) * 0.3;
  // tenor/bass spacing: avoid > 2 octaves... and very low close thirds
  if (v[1] - v[0] > 19) cost += 1;
  return cost;
}

function transitionCost(a: Satb, b: Satb, ca: RomanChord, cb: RomanChord, key: KeyCtx): number {
  let cost = 0;
  for (let i = 1; i < 4; i++) cost += Math.abs(b[i] - a[i]);
  cost += Math.abs(b[0] - a[0]) * 0.25;
  if (Math.abs(b[0] - a[0]) > 7) cost += 3;
  for (const issue of checkPair(a, b, 1, ca, cb, key)) cost += issue.severity === 'error' ? 200 : 5;
  return cost;
}

export interface Realization {
  key: KeyCtx;
  chords: RomanChord[];
  voicings: Satb[];
  /** spelled note names per chord, [bass, tenor, alto, soprano] */
  names: string[][];
}

export function realize(symbols: string[], key: KeyCtx, opts: VoicingOptions = {}): Realization {
  const chords = symbols.map((s) => parseRoman(s, key));
  const cands = chords.map((c, i) => {
    let list = enumerateVoicings(c, key, opts.allowErrors);
    const sm = opts.soprano?.[i];
    const sp = opts.sopranoPc?.[i];
    if (sm !== undefined) list = list.filter((v) => v[3] === sm);
    if (sp !== undefined) list = list.filter((v) => pc(v[3]) === sp);
    if (opts.distinctNotes) list = list.filter((v) => new Set(v).size === 4);
    if (!list.length) throw new Error(`No voicing for ${c.symbol} with the given soprano`);
    return list;
  });
  // DP
  let cost = cands[0].map((v) => chordCost(v, chords[0]) + Math.abs(v[3] - 69) * 0.2);
  const back: number[][] = [cands[0].map(() => -1)];
  for (let i = 1; i < chords.length; i++) {
    const next: number[] = [];
    const ptr: number[] = [];
    for (const v of cands[i]) {
      let best = Infinity;
      let arg = -1;
      const stat = chordCost(v, chords[i]);
      cands[i - 1].forEach((u, k) => {
        if (cost[k] >= best) return;
        const c = cost[k] + transitionCost(u, v, chords[i - 1], chords[i], key);
        if (c < best) {
          best = c;
          arg = k;
        }
      });
      next.push(best + stat);
      ptr.push(arg);
    }
    cost = next;
    back.push(ptr);
  }
  let k = cost.indexOf(Math.min(...cost));
  const voicings: Satb[] = [];
  for (let i = chords.length - 1; i >= 0; i--) {
    voicings[i] = cands[i][k];
    k = back[i][k];
  }
  return { key, chords, voicings, names: voicings.map((v, i) => spellVoicing(v, chords[i])) };
}

/** Name each MIDI note with the chord's own spelling (B#3 vs C4 handled). */
export function spellVoicing(v: number[], chord: RomanChord): string[] {
  return v.map((m) => spellMidi(m, chord.pcs));
}

export function spellMidi(m: number, preferredPcs: string[]): string {
  const p = preferredPcs.find((x) => pcOf(x) === pc(m));
  if (p) {
    const base = Math.floor(m / 12) - 1;
    for (const o of [base, base - 1, base + 1]) if (toMidi(`${p}${o}`) === m) return `${p}${o}`;
  }
  const sharps = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return `${sharps[pc(m)]}${Math.floor(m / 12) - 1}`;
}

export const satbFromNames = (names: string[]): Satb => names.map((n) => toMidi(n)) as Satb;
export { parseNote };
