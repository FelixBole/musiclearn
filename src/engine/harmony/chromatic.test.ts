import { describe, expect, it } from 'vitest';
import { Midi } from '@tonejs/midi';
import { parseRoman, prettyRoman } from './roman';
import { parseChordSymbol } from './symbols';
import { parseKeyName, parseProgression } from './sequence';
import { checkPair, checkProgression, errorsOnly, type Satb } from './voiceleading';
import { realize } from './voicing';
import { toMidi } from '../theory';
import { progressionToMidi } from '../midiExport';

const C = { tonic: 'C', minor: false };
const a = { tonic: 'A', minor: true };
const satb = (s: string) => s.split(' ').map(toMidi) as Satb;

describe('chromatic Roman numerals', () => {
  it('spells secondary chords in the tonicized key', () => {
    expect(parseRoman('V7/V', C).pcs).toEqual(['D', 'F#', 'A', 'C']);
    expect(parseRoman('vii°7/V', C).pcs).toEqual(['F#', 'A', 'C', 'Eb']);
    expect(parseRoman('V/vi', C).pcs).toEqual(['E', 'G#', 'B']);
    expect(parseRoman('V7/IV', C).pcs).toEqual(['C', 'E', 'G', 'Bb']);
    expect(parseRoman('V65/V', C).bass).toBe('F#');
  });
  it('spells borrowed chords from the parallel minor', () => {
    expect(parseRoman('iv', C).pcs).toEqual(['F', 'Ab', 'C']);
    expect(parseRoman('bVI', C).pcs).toEqual(['Ab', 'C', 'Eb']);
    expect(parseRoman('bVII', C).pcs).toEqual(['Bb', 'D', 'F']);
    expect(parseRoman('bIII', C).pcs).toEqual(['Eb', 'G', 'Bb']);
    expect(parseRoman('iiø7', C).pcs).toEqual(['D', 'F', 'Ab', 'C']);
    expect(parseRoman('I', a).pcs).toEqual(['A', 'C#', 'E']); // Picardy third
  });
  it('spells the Neapolitan and augmented sixths', () => {
    const n6 = parseRoman('N6', C);
    expect(n6.pcs).toEqual(['Db', 'F', 'Ab']);
    expect(n6.bass).toBe('F');
    expect(parseRoman('N6', a).pcs).toEqual(['Bb', 'D', 'F']);
    expect(parseRoman('It+6', C).pcs).toEqual(['Ab', 'C', 'F#']);
    expect(parseRoman('Fr+6', C).pcs).toEqual(['Ab', 'C', 'D', 'F#']);
    expect(parseRoman('Ger+6', C).pcs).toEqual(['Ab', 'C', 'Eb', 'F#']);
    expect(parseRoman('Ger+6', a).pcs).toEqual(['F', 'A', 'C', 'D#']);
    expect(parseRoman('It+6', C).bass).toBe('Ab');
  });
  it('spells suspensions and the common-tone diminished 7th', () => {
    expect(parseRoman('Vsus4', C).pcs).toEqual(['G', 'C', 'D']);
    expect(parseRoman('V7sus4', C).pcs).toEqual(['G', 'C', 'D', 'F']);
    const ct = parseRoman('ct°7', C);
    expect(ct.pcs).toEqual(['D#', 'F#', 'A', 'C']);
    expect(ct.bass).toBe('C');
  });
  it('pretty-prints the new symbols', () => {
    expect(prettyRoman('N6')).toBe('N⁶');
    expect(prettyRoman('Ger+6')).toBe('Ger⁺⁶');
    expect(prettyRoman('V7sus4')).toBe('V⁷sus⁴');
    expect(prettyRoman('V65/V')).toBe('V⁶₅/V');
  });
});

describe('chord symbols', () => {
  it('parses symbols, inversions and pedal basses', () => {
    const g7b = parseChordSymbol('G7/B', C);
    expect(g7b.pcs).toEqual(['G', 'B', 'D', 'F']);
    expect(g7b.bass).toBe('B');
    expect(g7b.inversion).toBe(1);
    expect(g7b.degree).toBe(5);
    const pedal = parseChordSymbol('C/D', C);
    expect(pedal.bass).toBe('D');
    expect(pedal.pcs).toContain('D');
    expect(parseChordSymbol('Ab', C).quality).toBe('maj');
    expect(parseChordSymbol('B♭m7', C).pcs).toEqual(['Bb', 'Db', 'F', 'Ab']);
    expect(parseChordSymbol('Dsus4', C).pcs).toEqual(['D', 'G', 'A']);
  });
  it('keeps the defining tones of extended chords in four voices', () => {
    const c13 = parseChordSymbol('C13', C);
    expect(c13.essential).toEqual(['E', 'Bb', 'A']);
    expect(() => parseChordSymbol('Xyz', C)).toThrow();
  });
});

describe('progression text', () => {
  it('parses key changes and pivot chords', () => {
    const p = parseProgression('I IV vi=G:ii V7 I', C);
    expect(p.errors).toEqual([]);
    expect(p.items.map((i) => i.label)).toEqual(['I', 'IV', 'vi=G:ii', 'V⁷', 'I']);
    expect(p.items[3].chord.pcs).toEqual(['D', 'F#', 'A', 'C']);
    expect(p.endKey).toEqual({ tonic: 'G', minor: false });
    const d = parseProgression('C: I V a: V i', C);
    expect(d.items[2].label).toBe('a: V');
    expect(d.items[2].chord.pcs).toEqual(['E', 'G#', 'B']);
  });
  it('reports bad tokens and false pivots without throwing', () => {
    const p = parseProgression('I Q7 iii=G:ii V', C);
    expect(p.items.map((i) => i.token)).toEqual(['I', 'V']);
    expect(p.errors.map((e) => e.token)).toEqual(['Q7', 'iii=G:ii']);
  });
  it('mixes chord symbols and numerals', () => {
    const p = parseProgression('Cm | Ab - Eb Bb7 → i', { tonic: 'C', minor: true });
    expect(p.items.map((i) => i.label)).toEqual(['Cm', 'A♭', 'E♭', 'B♭7', 'i']);
  });
  it('parses key names', () => {
    expect(parseKeyName('bb')).toEqual({ tonic: 'Bb', minor: true });
    expect(parseKeyName('F#')).toEqual({ tonic: 'F#', minor: false });
  });
});

describe('chromatic voice leading', () => {
  const clean: [string, { tonic: string; minor: boolean }][] = [
    ['I V65/V V7 I', C],
    ['I V7/IV IV V I', C],
    ['I V/vi vi ii V I', C],
    ['I vii°7/V V I', C],
    ['I IV iv I', C],
    ['I bVI bVII I', C],
    ['I N6 V7 I', C],
    ['i N6 V i', a],
    ['I It+6 V I', C],
    ['I Fr+6 V I', C],
    ['I Ger+6 I64 V I', C],
    ['i Ger+6 i64 V i', a],
    ['I ct°7 I', C],
    ['V ct°7/V V I', C],
    ['I IV vi=G:ii V7 I', C],
    ['I Vsus4 V I', C],
    ['I iiø65 V7 I', C],
    ['i iv V i I', a],
    ['I III I', C],
    ['Cm Ab Eb Bb', { tonic: 'C', minor: true }],
    ['Dm7 G7sus4 G7 Cmaj7', C],
  ];
  for (const [text, key] of clean) {
    it(`realizes "${text}" without errors`, () => {
      const p = parseProgression(text, key);
      expect(p.errors).toEqual([]);
      const r = realize(
        p.items.map((i) => i.chord),
        key,
      );
      expect(errorsOnly(checkProgression(r.voicings, r.chords, key))).toEqual([]);
    });
  }
  it('flags a doubled #4 in an augmented sixth', () => {
    const it6 = parseRoman('It+6', C);
    const issues = checkProgression([satb('Ab2 F#3 C4 F#4')], [it6], C);
    expect(issues.some((i) => i.rule === 'doubled-tendency')).toBe(true);
  });
  it('flags an augmented sixth that does not expand to the octave', () => {
    const issues = checkPair(satb('Ab2 C3 C4 F#4'), satb('G2 D3 B3 D4'), 1, parseRoman('It+6', C), parseRoman('V', C), C);
    expect(issues.some((i) => i.rule === 'tendency-unresolved')).toBe(true);
  });
  it('flags an applied leading tone that does not rise', () => {
    // V/V → V with F# in the soprano falling to D
    const issues = checkPair(satb('D3 A3 D4 F#4'), satb('G2 B3 D4 D4'), 1, parseRoman('V/V', C), parseRoman('V', C), C);
    expect(issues.some((i) => i.rule === 'leading-tone-unresolved')).toBe(true);
  });
  it('warns about cross-relations', () => {
    // F in the soprano of ii, F# in the bass of V65/V
    const issues = checkPair(satb('D3 A3 D4 F4'), satb('F#3 A3 D4 C5'), 1, parseRoman('ii', C), parseRoman('V65/V', C), C);
    expect(issues.some((i) => i.rule === 'cross-relation' && i.severity === 'warning')).toBe(true);
  });
});

describe('MIDI export', () => {
  it('writes one track per voice and ties common tones', () => {
    const bytes = progressionToMidi(
      [
        [48, 55, 64, 72],
        [53, 57, 65, 72],
      ],
      { bpm: 90, beatsPerChord: 2, name: 'Test' },
    );
    const midi = new Midi(bytes);
    expect(midi.tracks.map((t) => t.name)).toEqual(['Bass', 'Tenor', 'Alto', 'Soprano']);
    expect(Math.round(midi.header.tempos[0].bpm)).toBe(90);
    const soprano = midi.tracks[3].notes;
    expect(soprano).toHaveLength(1); // C5 held through both chords
    expect(soprano[0].durationTicks).toBe(midi.header.ppq * 4);
    expect(midi.tracks[0].notes.map((n) => n.midi)).toEqual([48, 53]);
  });
});
