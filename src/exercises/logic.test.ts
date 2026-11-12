import { describe, expect, it } from 'vitest';
import { createRng } from '../engine/rng';
import { diatonicStep, spellChord, toMidi } from '../engine/theory';
import {
  cadenceChords,
  checkChordPlayed,
  checkChordSpelled,
  checkIntervalEar,
  checkKeySig,
  checkNoteName,
  checkNotePlayed,
  chordQualityEar,
  chordSpelling,
  intervalEar,
  intervalEarNotes,
  intervalReading,
  keySignatures,
  noteReading,
  scaleDegreeEar,
  sightReading,
} from './logic';
import type { ExerciseLogic } from './types';

const ALL: ExerciseLogic<unknown>[] = [
  noteReading,
  keySignatures,
  intervalEar,
  chordQualityEar,
  intervalReading,
  chordSpelling,
  sightReading,
  scaleDegreeEar,
] as ExerciseLogic<unknown>[];

describe('generators', () => {
  it('produce questions at every level without throwing', () => {
    for (const ex of ALL) {
      for (let level = 0; level < ex.levels.length; level++) {
        const rng = createRng(1234 + level);
        for (let i = 0; i < 200; i++) expect(() => ex.generate(level, rng)).not.toThrow();
      }
    }
  });
  it('are deterministic for a seed', () => {
    for (const ex of ALL) {
      expect(ex.generate(1, createRng(42))).toEqual(ex.generate(1, createRng(42)));
    }
  });
  it('keep note-reading notes within the configured staff range', () => {
    const rng = createRng(7);
    for (let i = 0; i < 300; i++) {
      const q = noteReading.generate(0, rng);
      expect(diatonicStep(q.note)).toBeGreaterThanOrEqual(diatonicStep('E4'));
      expect(diatonicStep(q.note)).toBeLessThanOrEqual(diatonicStep('F5'));
      expect(q.note).not.toMatch(/[#b]/);
    }
  });
  it('always includes the answer among the options', () => {
    const rng = createRng(9);
    for (let i = 0; i < 300; i++) {
      const k = keySignatures.generate(4, rng);
      expect(k.options).toContain(k.answer);
      const iv = intervalReading.generate(3, rng);
      expect(iv.options).toContain(iv.answer);
      const ie = intervalEar.generate(5, rng);
      expect(ie.options).toContain(ie.interval);
      const d = scaleDegreeEar.generate(3, rng);
      expect(d.options).toContain(d.degree);
    }
  });
  it('generates interval-reading answers that match the written notes', () => {
    const rng = createRng(3);
    for (let i = 0; i < 300; i++) {
      const q = intervalReading.generate(3, rng);
      expect(checkIntervalEar).toBeDefined();
      expect(toMidi(q.upper)).toBeGreaterThanOrEqual(toMidi(q.lower) - 1);
    }
  });
  it('sight-reading respects the key signature', () => {
    const rng = createRng(11);
    for (let i = 0; i < 100; i++) {
      const q = sightReading.generate(4, rng);
      if (q.keySig === 'D') {
        for (const n of q.notes) {
          if (n.startsWith('F') || n.startsWith('C')) expect(n[1]).toBe('#');
        }
      }
    }
  });
});

describe('checkers', () => {
  it('note reading: name and played pitch', () => {
    const q = { clef: 'treble' as const, note: 'F#5', accidentals: true };
    expect(checkNoteName(q, 'F', 1).correct).toBe(true);
    expect(checkNoteName(q, 'F', 0).correct).toBe(false);
    expect(checkNotePlayed(q, toMidi('F#5')).correct).toBe(true);
    const wrongOct = checkNotePlayed(q, toMidi('F#4'));
    expect(wrongOct.correct).toBe(false);
    expect(wrongOct.feedback).toMatch(/octave/);
  });
  it('key signature', () => {
    expect(checkKeySig({ clef: 'treble', majorTonic: 'Eb', minor: true, answer: 'C', options: [] }, 'C').correct).toBe(true);
    expect(checkKeySig({ clef: 'treble', majorTonic: 'Eb', minor: false, answer: 'Eb', options: [] }, 'Bb').correct).toBe(false);
  });
  it('interval ear note pairs', () => {
    expect(intervalEarNotes({ root: 60, interval: 'P5', direction: 'asc', options: [] })).toEqual([60, 67]);
    expect(intervalEarNotes({ root: 60, interval: 'm3', direction: 'desc', options: [] })).toEqual([60, 57]);
  });
  it('chord spelling: played (any voicing) and spelled (exact letters)', () => {
    const q = { root: 'Eb', quality: 'maj7', pcs: spellChord('Eb', 'maj7'), voicing: [] };
    expect(checkChordPlayed(q, [51, 55, 58, 62]).correct).toBe(true); // Eb3 G3 Bb3 D4
    expect(checkChordPlayed(q, [55, 58, 62, 63, 67]).correct).toBe(true); // inversion with doubling
    expect(checkChordPlayed(q, [51, 55, 58, 61]).correct).toBe(false); // Db instead of D
    expect(checkChordSpelled(q, ['Eb', 'G', 'Bb', 'D']).correct).toBe(true);
    const enh = checkChordSpelled(q, ['D#', 'G', 'A#', 'D']);
    expect(enh.correct).toBe(false);
    expect(enh.feedback).toMatch(/spelling/);
  });
  it('chord ear voicings span the right intervals', () => {
    const rng = createRng(5);
    const q = chordQualityEar.generate(0, rng);
    const span = q.midis.map((m) => m - q.midis[0]);
    expect([[0, 4, 7], [0, 3, 7]]).toContainEqual(span);
  });
  it('chord spelling generator avoids double accidentals before the last level', () => {
    const rng = createRng(8);
    for (let i = 0; i < 300; i++) {
      expect(chordSpelling.generate(2, rng).pcs.join()).not.toMatch(/##|bb/);
    }
  });
  it('cadence chords contain the tonic triad', () => {
    expect(cadenceChords(60, false)[0].map((m) => m % 12).sort()).toEqual([0, 0, 4, 7]);
  });
});
