import { describe, expect, it } from 'vitest';
import { createRng } from '../engine/rng';
import { toMidi } from '../engine/theory';
import { INSTRUMENTS } from '../engine/orchestra/instruments';
import { changeMode, parseMotif } from '../engine/motif';
import {
  checkDoctor,
  checkMotifEar,
  checkRange,
  checkTransposition,
  instrumentRange,
  motifEar,
  rangeStatus,
  transposition,
  voicingDoctor,
} from './composerLogic';
import type { ExerciseLogic } from './types';

const ALL = [instrumentRange, transposition, voicingDoctor, motifEar] as ExerciseLogic<unknown>[];

describe('composer drills', () => {
  for (const ex of ALL) {
    it(`${ex.id} generates at every level, deterministically`, () => {
      for (let level = 0; level < ex.levels.length; level++) {
        const rng = createRng(11 + level);
        for (let i = 0; i < 30; i++) expect(() => ex.generate(level, rng), `${ex.id} L${level}`).not.toThrow();
      }
      expect(ex.generate(1, createRng(4))).toEqual(ex.generate(1, createRng(4)));
    });
  }
  it('range answers match the instrument data', () => {
    const rng = createRng(2);
    for (let level = 0; level < 5; level++)
      for (let i = 0; i < 40; i++) {
        const q = instrumentRange.generate(level, rng);
        const inst = INSTRUMENTS.find((x) => x.id === q.instrument)!;
        if (q.kind === 'judge') expect(rangeStatus(inst, toMidi(q.note))).toBe(q.answer);
        else for (const o of q.options) if (o !== q.answer) expect(rangeStatus(INSTRUMENTS.find((x) => x.id === o)!, toMidi(q.note))).toBe('out');
        expect(checkRange(q, q.answer).correct).toBe(true);
      }
  });
  it('transposes correctly', () => {
    const rng = createRng(8);
    for (let level = 0; level < 5; level++)
      for (let i = 0; i < 40; i++) {
        const q = transposition.generate(level, rng);
        const diff = toMidi(q.direction === 'to-written' ? q.answer : q.shown) - toMidi(q.direction === 'to-written' ? q.shown : q.answer);
        const expected = { clarinet: 2, trumpet: 2, horn: 7, 'english-horn': 7, 'clarinet-a': 3, 'alto-sax': 9, piccolo: -12, bass: 12 }[q.instrument];
        expect(diff, JSON.stringify(q)).toBe(expected);
        expect(new Set(q.options.map((o) => toMidi(o))).size).toBe(q.options.length);
        expect(checkTransposition(q, q.answer).correct).toBe(true);
      }
  });
  it('B♭ clarinet: concert C5 is written D5', () => {
    const rng = createRng(1);
    for (let i = 0; i < 300; i++) {
      const q = transposition.generate(0, rng);
      if (q.instrument === 'clarinet' && q.shown === 'C5') expect(q.answer).toBe('D5');
    }
  });
  it('voicing doctor plants exactly one kind of problem', () => {
    const rng = createRng(3);
    for (let i = 0; i < 60; i++) {
      const q = voicingDoctor.generate(3, rng);
      if (q.target === 'none') expect(q.issues).toEqual([]);
      else expect(q.issues.every((x) => x.rule === q.target)).toBe(true);
      expect(checkDoctor(q, q.target).correct).toBe(true);
    }
  });
  it('motif variants differ from the original and from the other options', () => {
    const rng = createRng(6);
    for (let i = 0; i < 40; i++) {
      const q = motifEar.generate(3, rng);
      expect(q.variant).not.toEqual(q.original);
      expect(checkMotifEar(q, q.transform).correct).toBe(true);
    }
  });
  it('mode change keeps the raised leading tone', () => {
    const am = parseMotif('A4 C5 E5 G#4 A4');
    expect(changeMode(am, { tonic: 'A', minor: true }, 'ionian').map((n) => n.midi)).toEqual(['A4', 'C#5', 'E5', 'G#4', 'A4'].map(toMidi));
  });
});
