import { describe, expect, it } from 'vitest';
import { ENSEMBLES, INSTRUMENTS, orchestrateFree, orchestrateSatb } from './instruments';
import { checkOrchestralVoicing } from './voicingCheck';
import { ORCHESTRA_SAMPLES } from '../audio/orchestraManifest';
import { toMidi } from '../theory';
import {
  changeMode,
  diatonicShift,
  fragment,
  harmonize,
  invert,
  padVoicing,
  parseMotif,
  retrograde,
  scaleRhythm,
  variations,
  vexDuration,
} from '../motif';

const m = (s: string) => s.split(' ').map(toMidi);
const C = { tonic: 'C', minor: false };

describe('instrument data', () => {
  it('has sane ranges and a sample set for every instrument', () => {
    for (const i of INSTRUMENTS) {
      expect(i.range[0]).toBeLessThan(i.range[1]);
      expect(i.comfortable[0]).toBeGreaterThanOrEqual(i.range[0]);
      expect(i.comfortable[1]).toBeLessThanOrEqual(i.range[1]);
      expect(ORCHESTRA_SAMPLES[i.sample], i.id).toBeDefined();
    }
  });
  it('every ensemble uses existing samples', () => {
    for (const e of Object.values(ENSEMBLES)) for (const v of e.voices) for (const p of v) expect(p.sample === 'piano' || !!ORCHESTRA_SAMPLES[p.sample]).toBe(true);
  });
  it('orchestrates SATB with doublings in range', () => {
    const parts = orchestrateSatb(m('C3 G3 E4 C5'), 'strings');
    expect(parts).toContainEqual({ midi: 48, sample: 'cellos' });
    expect(parts).toContainEqual({ midi: 36, sample: 'basses' });
    expect(parts.filter((p) => p.sample === 'violins')).toHaveLength(2);
  });
  it('assigns free voicings by register', () => {
    const parts = orchestrateFree(m('C2 G2 E4 C6'), 'brass');
    expect(parts[0].sample).toBe('tuba');
    expect(parts[3].sample).toBe('trumpet');
  });
});

describe('orchestral voicing check', () => {
  it('accepts a harmonic-series voicing', () => {
    expect(checkOrchestralVoicing(m('C2 C3 G3 C4 E4 G4'), { thirdPc: 4 })).toEqual([]);
  });
  it('flags low close intervals', () => {
    const issues = checkOrchestralVoicing(m('C2 E2 G2 C3'));
    expect(issues.some((i) => i.rule === 'low-interval')).toBe(true);
  });
  it('flags holes and upside-down spacing', () => {
    expect(checkOrchestralVoicing(m('C2 G2 E5 G5')).some((i) => i.rule === 'gap')).toBe(true);
    expect(checkOrchestralVoicing(m('C3 E3 G3 E4 C5')).some((i) => i.rule === 'inverted-spacing')).toBe(true);
  });
  it('flags ranges for given instruments', () => {
    const issues = checkOrchestralVoicing(m('B1 C4'), { instruments: ['cello', 'violin'] });
    expect(issues.find((i) => i.rule === 'out-of-range')?.notes).toEqual([35]);
  });
});

describe('motif engine', () => {
  const motif = parseMotif('E4:q G4:8 A4:8 B4:h r:q');
  it('parses notes, durations and rests', () => {
    expect(motif.map((n) => n.midi)).toEqual([64, 67, 69, 71, null]);
    expect(motif.map((n) => n.dur)).toEqual([1, 0.5, 0.5, 2, 1]);
    expect(() => parseMotif('E4:x')).toThrow();
  });
  it('sequences diatonically', () => {
    expect(diatonicShift(parseMotif('C4 D4 E4'), C, 1).map((n) => n.midi)).toEqual(m('D4 E4 F4'));
  });
  it('changes mode keeping scale degrees', () => {
    expect(changeMode(parseMotif('C4 E4 G4 A4 B4'), C, 'aeolian').map((n) => n.midi)).toEqual(m('C4 Eb4 G4 Ab4 Bb4'));
    expect(changeMode(parseMotif('F4'), C, 'lydian')[0].midi).toBe(toMidi('F#4'));
  });
  it('inverts around the first note', () => {
    expect(invert(parseMotif('E4 G4 C4'), C).map((n) => n.midi)).toEqual(m('E4 C4 G4'));
  });
  it('retrograde, augmentation, fragmentation', () => {
    expect(retrograde(motif)[0].midi).toBeNull();
    expect(scaleRhythm(motif, 2).map((n) => n.dur)).toEqual([2, 1, 1, 4, 2]);
    expect(fragment(parseMotif('C4 D4 E4 F4'), C, 2).map((n) => n.midi)).toEqual(m('C4 D4 D4 E4 E4 F4'));
  });
  it('harmonizes with chords containing the main notes', () => {
    const h = harmonize(parseMotif('C5:h E5:h F5:h D5:h C5:w'), C, 'diatonic', 2);
    expect(h.romans[0]).toBe('I');
    expect(h.romans).toHaveLength(6);
    for (const f of ['diatonic', 'modal', 'cinematic'] as const) expect(harmonize(motif, C, f).romans.length).toBeGreaterThan(0);
    expect(harmonize(motif, { tonic: 'A', minor: true }, 'cinematic').romans.length).toBeGreaterThan(0);
  });
  it('voices pads under the melody', () => {
    const v = padVoicing('IV', C, 72);
    expect(v[0] % 12).toBe(5);
    expect(Math.max(...v)).toBeLessThan(72);
  });
  it('builds a full set of variations', () => {
    const vs = variations(motif, C);
    expect(vs.length).toBeGreaterThan(8);
    for (const v of vs) expect(v.notes.length).toBeGreaterThan(0);
    expect(vexDuration(1.5)).toBe('qd');
  });
});
