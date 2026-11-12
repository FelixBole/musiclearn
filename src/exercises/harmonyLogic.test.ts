import { describe, expect, it } from 'vitest';
import { createRng } from '../engine/rng';
import { checkProgression, errorsOnly } from '../engine/harmony/voiceleading';
import { parseRoman, pcOf } from '../engine/harmony/roman';
import {
  cadenceEar,
  checkAnalysis,
  checkCadence,
  checkDictation,
  checkErrorSpot,
  checkVoiceNext,
  errorSpotting,
  gradeHarmonization,
  harmonizeMelody,
  progressionEar,
  romanAnalysis,
  voiceNext,
} from './harmonyLogic';
import type { ExerciseLogic } from './types';

const ALL = [cadenceEar, progressionEar, romanAnalysis, errorSpotting, voiceNext, harmonizeMelody] as ExerciseLogic<unknown>[];

describe('harmony drill generators', () => {
  it('generate at every level', () => {
    for (const ex of ALL) {
      for (let level = 0; level < ex.levels.length; level++) {
        const rng = createRng(100 + level);
        for (let i = 0; i < 25; i++) expect(() => ex.generate(level, rng), `${ex.id} L${level}`).not.toThrow();
      }
    }
  });
  it('are deterministic per seed', () => {
    for (const ex of ALL) expect(ex.generate(1, createRng(5))).toEqual(ex.generate(1, createRng(5)));
  });
  it('cadence phrases end as labelled', () => {
    const rng = createRng(3);
    for (let i = 0; i < 40; i++) {
      const q = cadenceEar.generate(3, rng);
      const last = q.symbols[q.symbols.length - 1];
      if (q.cadence === 'HC') expect(last).toBe('V');
      if (q.cadence === 'PAC' || q.cadence === 'IAC') {
        expect(last).toBe('I');
        const sopPc = q.voicings[q.voicings.length - 1][3] % 12;
        // PAC: soprano ends on the tonic; IAC: it doesn't
        expect(sopPc === pcOf(q.key.tonic)).toBe(q.cadence === 'PAC');
      }
      expect(checkCadence(q, q.cadence).correct).toBe(true);
    }
  });
  it('error-spotting plants exactly the target error', () => {
    const rng = createRng(11);
    for (let i = 0; i < 60; i++) {
      const q = errorSpotting.generate(3, rng);
      const errs = errorsOnly(q.issues);
      if (q.target === 'none') expect(errs).toEqual([]);
      else {
        expect(errs.length).toBeGreaterThan(0);
        expect(errs.every((e) => e.rule === q.target)).toBe(true);
      }
      expect(checkErrorSpot(q, q.target).correct).toBe(true);
    }
  });
  it('dictation and analysis checkers accept the right answer', () => {
    const rng = createRng(21);
    for (let i = 0; i < 30; i++) {
      const d = progressionEar.generate(3, rng);
      expect(checkDictation(d, d.symbols).correct).toBe(true);
      const a = romanAnalysis.generate(3, rng);
      expect(a.options).toContain(a.symbol);
      expect(checkAnalysis(a, a.symbol).correct).toBe(true);
    }
  });
  it('generated progressions are voiced cleanly', () => {
    const rng = createRng(31);
    for (let i = 0; i < 30; i++) {
      const d = progressionEar.generate(i % 5, rng);
      const chords = d.symbols.map((s) => parseRoman(s, d.key));
      expect(errorsOnly(checkProgression(d.voicings, chords, d.key))).toEqual([]);
    }
  });
});

describe('voice the next chord', () => {
  it('accepts the model answer and rejects parallels / wrong counts', () => {
    const rng = createRng(41);
    for (let i = 0; i < 30; i++) {
      const q = voiceNext.generate(i % 5, rng);
      expect(checkVoiceNext(q, [...q.model]).correct, q.symbols.join('→')).toBe(true);
    }
    const q = { key: { tonic: 'C', minor: false }, symbols: ['I', 'ii'] as [string, string], first: [48, 55, 64, 72] as [number, number, number, number], firstNames: [], model: [50, 57, 65, 74] as [number, number, number, number], modelNames: ['D3', 'A3', 'F4', 'D5'] };
    // C3 G3 E4 C5 → D3 A3 F4 D5 = parallel 5ths & octaves
    expect(checkVoiceNext(q, [50, 57, 65, 74]).correct).toBe(false);
    expect(checkVoiceNext(q, [50, 57, 65]).feedback).toMatch(/exactly 4/);
  });
});

describe('harmonization grading', () => {
  it('accepts the model and rejects bad endings / retrogressions', () => {
    const rng = createRng(51);
    for (let i = 0; i < 25; i++) {
      const q = harmonizeMelody.generate(i % 4, rng);
      const g = gradeHarmonization(q, q.model);
      expect(g.correct, `${q.model.join(' ')}: ${g.feedback}`).toBe(true);
      // every model chord must be among the offered choices
      q.model.forEach((s, j) => expect(q.choices[j]).toContain(s));
    }
    const q = harmonizeMelody.generate(0, createRng(2));
    const bad = [...q.model];
    bad[bad.length - 2] = q.key.minor ? 'iv' : 'IV';
    expect(gradeHarmonization(q, bad).correct).toBe(false);
  });
});
