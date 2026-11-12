import { describe, expect, it } from 'vitest';
import {
  detectChord,
  describeInterval,
  diatonicStep,
  intervalNameBetween,
  intervalNumber,
  keyInfo,
  majorKeyByAlteration,
  midiToName,
  parseNote,
  prettyChordSymbol,
  samePitchClassSet,
  spellChord,
  spellForChord,
  toMidi,
  vexKey,
  voiceChord,
} from './index';

describe('notes', () => {
  it('parses and converts to midi, including enharmonic edge cases', () => {
    expect(toMidi('C4')).toBe(60);
    expect(toMidi('A4')).toBe(69);
    expect(toMidi('B#3')).toBe(60);
    expect(toMidi('Cb4')).toBe(59);
    expect(toMidi('F##4')).toBe(67);
    expect(toMidi('Fx4')).toBe(67);
    expect(parseNote('Ebb2')).toEqual({ letter: 'E', acc: -2, octave: 2 });
  });
  it('maps midi back to names', () => {
    expect(midiToName(61)).toBe('C#4');
    expect(midiToName(61, true)).toBe('Db4');
  });
  it('computes staff steps and vexflow keys', () => {
    expect(diatonicStep('C4') - diatonicStep('B3')).toBe(1);
    expect(vexKey('F#5')).toBe('f#/5');
  });
  it('compares pitch-class sets', () => {
    expect(samePitchClassSet([60, 64, 67], [52, 55, 72])).toBe(true);
    expect(samePitchClassSet([60, 64, 67], [60, 63, 67])).toBe(false);
  });
});

describe('intervals', () => {
  it('names intervals with correct quality', () => {
    expect(intervalNameBetween('C4', 'E4')).toBe('Major 3rd');
    expect(intervalNameBetween('E4', 'G4')).toBe('minor 3rd');
    expect(intervalNameBetween('F4', 'B4')).toBe('Augmented 4th');
    expect(intervalNameBetween('B3', 'F4')).toBe('diminished 5th');
    expect(intervalNameBetween('C4', 'C5')).toBe('Octave');
    expect(describeInterval('6m')).toBe('minor 6th');
    expect(intervalNumber('C4', 'A4')).toBe(6);
  });
});

describe('chords', () => {
  it('spells chords with correct letters', () => {
    expect(spellChord('Eb', 'maj7')).toEqual(['Eb', 'G', 'Bb', 'D']);
    expect(spellChord('F#', 'min')).toEqual(['F#', 'A', 'C#']);
    expect(spellChord('B', 'dim')).toEqual(['B', 'D', 'F']);
    expect(spellChord('G', 'dom7')).toEqual(['G', 'B', 'D', 'F']);
  });
  it('voices chords in ascending order with inversions', () => {
    expect(voiceChord(['C', 'E', 'G'], 4)).toEqual(['C4', 'E4', 'G4']);
    expect(voiceChord(['C', 'E', 'G'], 4, 1)).toEqual(['E4', 'G4', 'C5']);
    expect(voiceChord(['A', 'C', 'E'], 3)).toEqual(['A3', 'C4', 'E4']);
  });
  it('detects chords from midi', () => {
    expect(detectChord([60, 64, 67])).toContain('C');
    expect(detectChord([57, 60, 64])).toContain('Am');
    expect(detectChord([55, 59, 62, 65])).toContain('G7');
    expect(prettyChordSymbol('Bm7b5')).toBe('Bø7');
  });
  it('spells played notes according to the detected chord', () => {
    expect(spellForChord([60, 64, 67, 70])).toEqual(['C4', 'E4', 'G4', 'Bb4']); // C7, not A#
    expect(spellForChord([63, 66, 70], false)).toEqual(['D#4', 'F#4', 'A#4']); // D#m, consistently spelled
    expect(spellForChord([63, 66, 70], true)).toEqual(['Eb4', 'Gb4', 'Bb4']); // Ebm with "prefer flats"
    expect(spellForChord([66, 70, 73])).toEqual(['F#4', 'A#4', 'C#5']); // F#
    expect(spellForChord([61, 62])).toHaveLength(2); // no chord → fallback
  });
});

describe('keys', () => {
  it('knows signatures and relatives', () => {
    expect(keyInfo('D').alteration).toBe(2);
    expect(keyInfo('D').relative).toBe('B');
    expect(keyInfo('C', true).alteration).toBe(-3);
    expect(majorKeyByAlteration(-2)).toBe('Bb');
    expect(majorKeyByAlteration(4)).toBe('E');
  });
});
