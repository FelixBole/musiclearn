/**
 * Orchestral voicing checker: is this chord spaced like the harmonic series, or muddy?
 * Works on any number of notes (MIDI, sounding pitch).
 */
import { instrumentById } from './instruments';

export type OrchRule = 'low-interval' | 'gap' | 'inverted-spacing' | 'out-of-range' | 'awkward-range' | 'low-third';

export interface OrchIssue {
  rule: OrchRule;
  severity: 'error' | 'warning';
  /** MIDI notes involved */
  notes: number[];
  message: string;
}

export const ORCH_RULE_LABELS: Record<OrchRule, string> = {
  'low-interval': 'Muddy low interval',
  gap: 'Hole in the middle',
  'inverted-spacing': 'Upside-down spacing',
  'out-of-range': 'Out of range',
  'awkward-range': 'Awkward register',
  'low-third': 'Low doubled 3rd',
};

/**
 * Low interval limits: the lowest pitch (of the LOWER note) at which each interval
 * still sounds clear. Below it, the overtones clash and it turns to mud.
 * Index = interval in semitones (1..11). Values are the usual arranging-book limits.
 */
export const LOW_INTERVAL_LIMITS: Record<number, number> = {
  1: 52, // m2: E3
  2: 51, // M2: E♭3
  3: 48, // m3: C3
  4: 46, // M3: B♭2
  5: 45, // P4: A2
  6: 46, // tritone: B♭2
  7: 34, // P5: B♭1
  8: 41, // m6: F2
  9: 41, // M6: F2
  10: 41, // m7: F2
  11: 41, // M7: F2
};

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const noteLabel = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const INTERVAL_NAMES = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th'];

export interface OrchCheckOptions {
  /** instrument id per note (same order as `notes` after sorting low→high) */
  instruments?: (string | undefined)[];
  /** pitch class of the chord's 3rd (enables the low-3rd rule) */
  thirdPc?: number;
}

export function checkOrchestralVoicing(input: number[], opts: OrchCheckOptions = {}): OrchIssue[] {
  const notes = [...input].sort((a, b) => a - b);
  const issues: OrchIssue[] = [];

  // 1. low interval limits (adjacent notes)
  for (let i = 0; i + 1 < notes.length; i++) {
    const lo = notes[i];
    const iv = notes[i + 1] - lo;
    if (iv >= 1 && iv <= 11 && lo < LOW_INTERVAL_LIMITS[iv]) {
      issues.push({
        rule: 'low-interval',
        severity: 'error',
        notes: [lo, notes[i + 1]],
        message: `A ${INTERVAL_NAMES[iv]} starting on ${noteLabel(lo)} is too low to sound clear (limit ≈ ${noteLabel(LOW_INTERVAL_LIMITS[iv])}). Open it up to an octave or 5th.`,
      });
    }
  }

  // 2. holes: more than an octave between neighbouring upper notes (the bass may sit further away)
  for (let i = 1; i + 1 < notes.length; i++) {
    if (notes[i + 1] - notes[i] > 12) {
      issues.push({ rule: 'gap', severity: 'warning', notes: [notes[i], notes[i + 1]], message: `A hole between ${noteLabel(notes[i])} and ${noteLabel(notes[i + 1])}: the chord splits into two layers. Fill it, or let it be a deliberate effect.` });
    }
  }
  if (notes.length >= 2 && notes[1] - notes[0] > 24) {
    issues.push({ rule: 'gap', severity: 'warning', notes: [notes[0], notes[1]], message: `More than two octaves between the bass and the next note: the bass sounds detached.` });
  }

  // 3. spacing against the harmonic series: close at the bottom, wide at the top
  if (notes.length >= 4) {
    const ivs = notes.slice(1).map((m, i) => m - notes[i]);
    const bottom = ivs[0];
    const top = Math.max(...ivs.slice(-2));
    if (bottom <= 4 && top >= 9 && notes[0] < 60) {
      issues.push({
        rule: 'inverted-spacing',
        severity: 'warning',
        notes: [notes[0], notes[1], notes[notes.length - 2], notes[notes.length - 1]],
        message: 'Close intervals at the bottom and wide ones at the top: the opposite of the harmonic series. Spread the low notes, close up the high ones.',
      });
    }
  }

  // 4. the 3rd doubled in the low register
  if (opts.thirdPc !== undefined) {
    const thirds = notes.filter((m) => ((m % 12) + 12) % 12 === opts.thirdPc);
    if (thirds.length > 1 && thirds[0] < 52) {
      issues.push({ rule: 'low-third', severity: 'warning', notes: thirds, message: `The 3rd is doubled with one copy low (${noteLabel(thirds[0])}): thick and dull. Double the root or 5th low, keep the 3rd higher.` });
    }
  }

  // 5. instrument ranges
  if (opts.instruments) {
    notes.forEach((m, i) => {
      const inst = opts.instruments?.[i] ? instrumentById(opts.instruments[i]!) : undefined;
      if (!inst) return;
      if (m < inst.range[0] || m > inst.range[1]) {
        issues.push({ rule: 'out-of-range', severity: 'error', notes: [m], message: `${noteLabel(m)} is outside the ${inst.name.toLowerCase()}'s range (${noteLabel(inst.range[0])}–${noteLabel(inst.range[1])}).` });
      } else if (m < inst.comfortable[0] || m > inst.comfortable[1]) {
        issues.push({ rule: 'awkward-range', severity: 'warning', notes: [m], message: `${noteLabel(m)} is playable on the ${inst.name.toLowerCase()} but at the edge of its comfortable range.` });
      }
    });
  }
  return issues;
}
