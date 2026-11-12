import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { parseRoman, prettyRoman } from './roman';
import { checkPair, checkProgression, errorsOnly, type Satb } from './voiceleading';
import { realize } from './voicing';
import { generateProgression } from './progressions';
import { toMidi } from '../theory';

const C = { tonic: 'C', minor: false };
const a = { tonic: 'A', minor: true };
const satb = (s: string) => s.split(' ').map(toMidi) as Satb;

describe('roman numerals', () => {
  it('spells diatonic triads in major', () => {
    expect(parseRoman('I', C).pcs).toEqual(['C', 'E', 'G']);
    expect(parseRoman('ii', C).pcs).toEqual(['D', 'F', 'A']);
    expect(parseRoman('vii°', C).pcs).toEqual(['B', 'D', 'F']);
    expect(parseRoman('IV', { tonic: 'Eb', minor: false }).pcs).toEqual(['Ab', 'C', 'Eb']);
  });
  it('uses the raised leading tone for V and vii° in minor', () => {
    expect(parseRoman('V', a).pcs).toEqual(['E', 'G#', 'B']);
    expect(parseRoman('vii°7', a).pcs).toEqual(['G#', 'B', 'D', 'F']);
    expect(parseRoman('VII', a).pcs).toEqual(['G', 'B', 'D']);
    expect(parseRoman('VI', a).pcs).toEqual(['F', 'A', 'C']);
    expect(parseRoman('ii°6', a).bass).toBe('D');
  });
  it('handles sevenths and inversions', () => {
    const v7 = parseRoman('V7', C);
    expect(v7.quality).toBe('dom7');
    expect(v7.pcs).toEqual(['G', 'B', 'D', 'F']);
    expect(parseRoman('V65', C).bass).toBe('B');
    expect(parseRoman('V43', C).bass).toBe('D');
    expect(parseRoman('V42', C).bass).toBe('F');
    expect(parseRoman('I64', C).bass).toBe('G');
    expect(parseRoman('ii7', C).quality).toBe('min7');
    expect(parseRoman('IV7', C).quality).toBe('maj7');
    expect(parseRoman('viiø7', C).pcs).toEqual(['B', 'D', 'F', 'A']);
  });
  it('handles borrowed and secondary chords', () => {
    expect(parseRoman('bVI', C).pcs).toEqual(['Ab', 'C', 'Eb']);
    expect(parseRoman('bVII', C).pcs).toEqual(['Bb', 'D', 'F']);
    expect(parseRoman('iv', C).pcs).toEqual(['F', 'Ab', 'C']);
    expect(parseRoman('V7/V', C).pcs).toEqual(['D', 'F#', 'A', 'C']);
    expect(parseRoman('vii°7/V', C).pcs).toEqual(['F#', 'A', 'C', 'Eb']);
  });
  it('pretty prints figures', () => {
    expect(prettyRoman('V65')).toBe('V⁶₅');
    expect(prettyRoman('I64')).toBe('I⁶₄');
    expect(prettyRoman('bVI')).toBe('♭VI');
    expect(prettyRoman('V7/V')).toBe('V⁷/V');
  });
});

describe('voice-leading checker', () => {
  const I = parseRoman('I', C);
  const ii = parseRoman('ii', C);
  const V = parseRoman('V', C);
  const V7 = parseRoman('V7', C);
  it('accepts a textbook I–V', () => {
    const issues = checkProgression([satb('C3 G3 E4 C5'), satb('G2 G3 D4 B4')], [I, V], C);
    expect(errorsOnly(issues)).toEqual([]);
  });
  it('detects parallel fifths and octaves', () => {
    // C–D in bass and G–A in tenor: parallel 5ths
    const p5 = checkPair(satb('C3 G3 E4 C5'), satb('D3 A3 F4 D5'), 1, I, ii, C).map((i) => i.rule);
    expect(p5).toContain('parallel-fifths');
    expect(p5).toContain('parallel-octaves'); // bass & soprano C–D in octaves too
  });
  it('detects spacing, crossing, doubled leading tone', () => {
    const rules = checkProgression([satb('G2 B3 B3 D5')], [V], C).map((i) => i.rule);
    expect(rules).toContain('doubled-leading-tone');
    expect(rules).toContain('spacing');
    expect(checkProgression([satb('C3 E4 C4 G4')], [I], C).map((i) => i.rule)).toContain('crossing');
  });
  it('detects unresolved leading tone and seventh', () => {
    const rules = checkPair(satb('G2 F3 D4 B4'), satb('C3 E3 C4 G4'), 1, V7, I, C).map((i) => i.rule);
    expect(rules).toContain('leading-tone-unresolved'); // B4 → G4
    const ok = checkPair(satb('G2 F3 D4 B4'), satb('C3 E3 C4 C5'), 1, V7, I, C).map((i) => i.rule);
    expect(ok).not.toContain('leading-tone-unresolved');
    expect(ok).not.toContain('seventh-unresolved');
    const bad7 = checkPair(satb('G2 F3 D4 B4'), satb('C3 G3 E4 C5'), 1, V7, I, C).map((i) => i.rule);
    expect(bad7).toContain('seventh-unresolved'); // F3 → G3
  });
  it('flags wrong notes, missing 3rd and wrong bass', () => {
    const rules = checkProgression([satb('E3 G3 C4 G4')], [I], C).map((i) => i.rule);
    expect(rules).toContain('wrong-bass');
    expect(checkProgression([satb('C3 G3 C4 G4')], [I], C).map((i) => i.rule)).toContain('missing-third');
    expect(checkProgression([satb('C3 G3 D4 G4')], [I], C).map((i) => i.rule)).toContain('wrong-note');
  });
});

describe('voicing engine', () => {
  const progressions: [string[], typeof C][] = [
    [['I', 'IV', 'V', 'I'], C],
    [['I', 'vi', 'ii6', 'V7', 'I'], C],
    [['I', 'ii65', 'I64', 'V7', 'I'], C],
    [['I', 'V6', 'I', 'IV', 'V', 'vi'], { tonic: 'G', minor: false }],
    [['i', 'iv', 'V', 'i'], a],
    [['i', 'VI', 'ii°6', 'V7', 'i'], { tonic: 'D', minor: true }],
    [['I', 'IV', 'V7', 'I'], { tonic: 'Eb', minor: false }],
  ];
  for (const [syms, key] of progressions) {
    it(`realizes ${syms.join(' ')} in ${key.tonic}${key.minor ? 'm' : ''} without errors`, () => {
      const r = realize(syms, key);
      const issues = checkProgression(r.voicings, r.chords, key);
      expect(errorsOnly(issues)).toEqual([]);
      expect(r.names.every((n) => n.length === 4)).toBe(true);
    });
  }
  it('respects a soprano constraint (PAC ends on the tonic)', () => {
    const r = realize(['I', 'IV', 'V', 'I'], C, { sopranoPc: [undefined, undefined, undefined, 0] });
    expect(r.voicings[3][3] % 12).toBe(0);
  });
  it('spells with the chord’s letters', () => {
    const r = realize(['i', 'V', 'i'], a);
    expect(r.names[1].some((n) => n.startsWith('G#'))).toBe(true);
  });
  it('voices random generated progressions without errors', () => {
    const rng = createRng(77);
    for (let i = 0; i < 40; i++) {
      const minor = i % 3 === 0;
      const syms = generateProgression(
        {
          minor,
          length: 5,
          vocabulary: minor ? ['i', 'iv', 'V', 'VI', 'ii°6', 'V7', 'i6'] : ['I', 'IV', 'V', 'vi', 'ii', 'ii6', 'V7', 'I6', 'V6', 'I64'],
          cadence: rng.pick(['PAC', 'HC', 'deceptive'] as const),
        },
        rng,
      );
      const key = { tonic: rng.pick(['C', 'G', 'F', 'D', 'Bb']), minor };
      const r = realize(syms, key);
      expect(errorsOnly(checkProgression(r.voicings, r.chords, key)), syms.join(' ')).toEqual([]);
    }
  });
});
