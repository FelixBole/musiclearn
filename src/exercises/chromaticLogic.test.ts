import { describe, expect, it } from 'vitest';
import { createRng } from '../engine/rng';
import { checkProgression, errorsOnly } from '../engine/harmony/voiceleading';
import { parseRoman } from '../engine/harmony/roman';
import {
  MODES,
  checkChromaticEar,
  checkChromaticSpelling,
  checkModeEar,
  chromaticEar,
  chromaticSpelling,
  modeEar,
  type ModeId,
} from './chromaticLogic';
import type { ExerciseLogic } from './types';

const ALL = [chromaticEar, chromaticSpelling, modeEar] as ExerciseLogic<unknown>[];

describe('chromatic drills', () => {
  for (const ex of ALL) {
    it(`${ex.id} generates at every level, deterministically`, () => {
      for (let level = 0; level < ex.levels.length; level++) {
        const rng = createRng(7 + level);
        for (let i = 0; i < 20; i++) expect(() => ex.generate(level, rng), `${ex.id} L${level}`).not.toThrow();
      }
      expect(ex.generate(2, createRng(3))).toEqual(ex.generate(2, createRng(3)));
    });
  }
  it('chromatic ear phrases are voiced cleanly and accept the right answer', () => {
    for (let level = 0; level < chromaticEar.levels.length; level++) {
      const rng = createRng(40 + level);
      for (let i = 0; i < 12; i++) {
        const q = chromaticEar.generate(level, rng);
        const chords = q.symbols.map((s) => parseRoman(s, q.key));
        expect(errorsOnly(checkProgression(q.voicings, chords, q.key)), q.symbols.join(' ')).toEqual([]);
        expect(q.options).toContain(q.target);
        expect(checkChromaticEar(q, q.target).correct).toBe(true);
      }
    }
  });
  it('spelling questions have 4 distinct options including the answer', () => {
    for (let level = 0; level < chromaticSpelling.levels.length; level++) {
      const rng = createRng(90 + level);
      for (let i = 0; i < 30; i++) {
        const q = chromaticSpelling.generate(level, rng);
        expect(new Set(q.options).size, JSON.stringify(q)).toBe(q.options.length);
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(q.options).toContain(q.answer);
        expect(checkChromaticSpelling(q, q.answer).correct).toBe(true);
      }
    }
  });
  it('spells V7/V in D as E7 and bVI in C as A♭', () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) {
      const q = chromaticSpelling.generate(0, rng);
      if (q.symbol === 'V7/V' && q.key.tonic === 'D') expect(q.name).toBe('E7');
    }
    for (let i = 0; i < 200; i++) {
      const q = chromaticSpelling.generate(1, rng);
      if (q.symbol === 'bVI' && q.key.tonic === 'C') expect(q.name).toBe('A♭');
    }
  });
  it('mode vamps are clean and scales have 8 notes', () => {
    for (const id of Object.keys(MODES) as ModeId[]) {
      const m = MODES[id];
      const key = { tonic: 'D', minor: m.minor };
      expect(() => parseRoman(m.vamp[1], key)).not.toThrow();
    }
    const rng = createRng(5);
    for (let i = 0; i < 30; i++) {
      const q = modeEar.generate(4, rng);
      expect(q.scale).toHaveLength(8);
      expect(checkModeEar(q, q.mode).correct).toBe(true);
    }
  });
});
