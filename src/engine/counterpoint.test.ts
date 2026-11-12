import { describe, expect, it } from 'vitest';
import { checkCounterpoint } from './counterpoint';
import { parseMotif } from './motif';

const cantus = parseMotif('D3:w F3:w E3:w D3:w G3:w F3:w A3:w G3:w F3:w E3:w D3:w');

describe('counterpoint checker', () => {
  it('accepts a correct first-species counterpoint', () => {
    const cp = parseMotif('A3:w A3:w C4:w D4:w B3:w D4:w C#4:w D4:w');
    const c = parseMotif('D3:w F3:w A3:w F3:w G3:w F3:w A3:w D3:w');
    expect(checkCounterpoint(cp, c)).toEqual([]);
  });
  it('flags parallel fifths and strong-beat dissonance', () => {
    const r = checkCounterpoint(parseMotif('A3:w C4:w B3:w'), parseMotif('D3:w F3:w E3:w'));
    expect(r.some((i) => i.rule === 'parallel-perfect')).toBe(true);
    expect(checkCounterpoint(parseMotif('E3:w'), parseMotif('D3:w')).some((i) => i.rule === 'dissonant-downbeat')).toBe(true);
  });
  it('allows passing tones but not other weak-beat dissonances (second species)', () => {
    // D–E–F over D: E is a passing 9th → fine
    expect(checkCounterpoint(parseMotif('D4:h E4:h F4:w'), parseMotif('D3:w D3:w'))).toEqual([]);
    // leaping into a dissonance on the weak beat
    expect(checkCounterpoint(parseMotif('D4:h G4:h F4:w'), parseMotif('D3:w D3:w')).some((i) => i.rule === 'unprepared-dissonance')).toBe(true);
  });
  it('handles a long cantus', () => {
    expect(() => checkCounterpoint(parseMotif('F4:w'), cantus)).not.toThrow();
  });
});
