/**
 * Two-voice counterpoint checker (first and second species, used loosely for countermelodies).
 * Lines use the motif syntax ("C4:w D4:w …"); the lower line's notes mark the strong beats.
 */
import type { MotifNote } from './motif';

export type CpRule = 'dissonant-downbeat' | 'parallel-perfect' | 'unprepared-dissonance' | 'crossing' | 'too-far' | 'leap-no-recovery';

export interface CpIssue {
  rule: CpRule;
  severity: 'error' | 'warning';
  /** beat position (quarter notes from the start) */
  at: number;
  message: string;
}

export const CP_LABELS: Record<CpRule, string> = {
  'dissonant-downbeat': 'Dissonance on a strong beat',
  'parallel-perfect': 'Parallel 5ths / octaves',
  'unprepared-dissonance': 'Dissonance not used as a passing tone',
  crossing: 'Voices cross',
  'too-far': 'Voices too far apart',
  'leap-no-recovery': 'Big leap not recovered by step',
};

interface Onset {
  t: number;
  midi: number;
  dur: number;
}

function onsets(line: MotifNote[]): Onset[] {
  const out: Onset[] = [];
  let t = 0;
  for (const n of line) {
    if (n.midi !== null) out.push({ t, midi: n.midi, dur: n.dur });
    t += n.dur;
  }
  return out;
}

const soundingAt = (line: Onset[], t: number) => line.find((o) => o.t <= t + 1e-9 && t < o.t + o.dur - 1e-9);
const CONSONANT = new Set([0, 3, 4, 7, 8, 9]);
const PERFECT = new Set([0, 7]);

export function checkCounterpoint(upper: MotifNote[], lower: MotifNote[]): CpIssue[] {
  const up = onsets(upper);
  const low = onsets(lower);
  const issues: CpIssue[] = [];
  let prev: { t: number; u: number; l: number } | null = null;

  // strong beats = onsets of the lower line (the cantus)
  for (const l of low) {
    const u = soundingAt(up, l.t);
    if (!u) continue;
    const iv = u.midi - l.midi;
    if (iv < 0) issues.push({ rule: 'crossing', severity: 'warning', at: l.t, message: 'The upper voice goes below the lower one.' });
    if (iv > 24) issues.push({ rule: 'too-far', severity: 'warning', at: l.t, message: 'More than two octaves apart: the voices stop sounding related.' });
    const pc = ((iv % 12) + 12) % 12;
    if (!CONSONANT.has(pc)) {
      issues.push({ rule: 'dissonant-downbeat', severity: 'error', at: l.t, message: 'A dissonance (2nd, 4th, 7th or tritone) on a strong beat. Strong beats should be consonant.' });
    }
    if (prev) {
      const ppc = (((prev.u - prev.l) % 12) + 12) % 12;
      const moved = prev.u !== u.midi && prev.l !== l.midi;
      if (moved && PERFECT.has(pc) && pc === ppc) {
        issues.push({ rule: 'parallel-perfect', severity: 'error', at: l.t, message: `${pc === 0 ? 'Octave (or unison) followed by another octave' : '5th followed by another 5th'}: the two lines fuse and lose their independence.` });
      }
    }
    prev = { t: l.t, u: u.midi, l: l.midi };
  }

  // weak-beat notes of the upper line: dissonance only as a passing tone (step in, step on, same direction)
  up.forEach((u, i) => {
    const isStrong = low.some((l) => Math.abs(l.t - u.t) < 1e-9);
    if (isStrong) return;
    const l = soundingAt(low, u.t);
    if (!l) return;
    const pc = (((u.midi - l.midi) % 12) + 12) % 12;
    if (CONSONANT.has(pc)) return;
    const a = up[i - 1];
    const b = up[i + 1];
    const stepIn = a && Math.abs(u.midi - a.midi) <= 2 && u.midi !== a.midi;
    const stepOut = b && Math.abs(b.midi - u.midi) <= 2 && b.midi !== u.midi;
    const sameDir = a && b && Math.sign(u.midi - a.midi) === Math.sign(b.midi - u.midi);
    if (!(stepIn && stepOut && sameDir)) {
      issues.push({ rule: 'unprepared-dissonance', severity: 'error', at: u.t, message: 'A weak-beat dissonance must be a passing tone: approached and left by step in the same direction.' });
    }
  });

  // melodic: leaps larger than a 5th should be followed by a step back
  up.forEach((u, i) => {
    const a = up[i - 1];
    const b = up[i + 1];
    if (!a || !b) return;
    const leap = u.midi - a.midi;
    if (Math.abs(leap) > 7) {
      const back = b.midi - u.midi;
      if (!(Math.sign(back) === -Math.sign(leap) && Math.abs(back) <= 2)) {
        issues.push({ rule: 'leap-no-recovery', severity: 'warning', at: u.t, message: 'After a leap bigger than a 5th, step back in the other direction.' });
      }
    }
  });
  return issues.sort((a, b) => a.at - b.at);
}
