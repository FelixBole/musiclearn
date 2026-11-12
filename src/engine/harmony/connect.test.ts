import { describe, expect, it } from 'vitest';
import { candidateBridges, findBridges } from './connect';
import { checkProgression, errorsOnly } from './voiceleading';

const C = { tonic: 'C', minor: false };

describe('passing-chord explorer', () => {
  it('offers the classic families for I → V', () => {
    const r = findBridges('I', 'V', C);
    const ids = r.map((b) => b.id);
    for (const id of ['direct', 'sec-dom', 'lt-dim', 'iv6', 'bVI-V', 'N6', 'It6', 'sus', 'tritone']) expect(ids).toContain(id);
    expect(r.find((b) => b.id === 'sec-dom')!.insert[0]).toMatch(/\/V$/);
  });
  it('only keeps suggestions with clean voice leading', () => {
    for (const [a, b] of [['I', 'V'], ['I', 'vi'], ['vi', 'IV'], ['IV', 'I'], ['I', 'I6']]) {
      for (const br of findBridges(a, b, C)) {
        if (br.family === 'direct') continue;
        const r = br.realization;
        expect(errorsOnly(checkProgression(r.voicings, r.chords, C)), `${br.symbols.join(' ')}`).toEqual([]);
      }
    }
  });
  it('finds stepwise passing chords and rejects the falling leading tone', () => {
    const ids = findBridges('I', 'I6', C).map((b) => b.id);
    expect(ids).toContain('pass-ii');
    // V6 between I and vi would make the leading tone fall in the bass
    expect(findBridges('I', 'vi', { tonic: 'G', minor: false }).map((b) => b.id)).not.toContain('pass-V6');
  });
  it('never repeats chord A or B as the inserted chord', () => {
    for (const br of candidateBridges('iv', 'i', { tonic: 'D', minor: true })) expect(br.insert[0]).not.toBe('iv');
  });
  it('uses minor-key options in minor', () => {
    const ids = findBridges('iv', 'i', { tonic: 'D', minor: true }).map((b) => b.id);
    expect(ids).toContain('VII-i');
    expect(ids).not.toContain('bVII-I');
  });
});
