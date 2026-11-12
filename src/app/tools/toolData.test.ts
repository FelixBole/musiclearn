import { describe, expect, it } from 'vitest';
import { realizeProgression } from '../../engine/harmony/sequence';
import { checkProgression, errorsOnly } from '../../engine/harmony/voiceleading';
import { KEY_CODES, PRESETS, keyFromCode, palettes } from './toolData';
import { parseProgression } from '../../engine/harmony/sequence';

describe('playground data', () => {
  for (const p of PRESETS) {
    it(`preset "${p.name}" voices cleanly`, () => {
      const key = keyFromCode(p.key);
      const res = realizeProgression(p.text, key);
      expect(res.error).toBeUndefined();
      const r = res.realization!;
      expect(errorsOnly(checkProgression(r.voicings, r.chords, key))).toEqual([]);
    });
  }
  it('every palette chord parses in every key', () => {
    for (const code of KEY_CODES) {
      const key = keyFromCode(code);
      for (const pal of palettes(key.minor)) {
        const p = parseProgression(pal.chords.filter((c) => !c.endsWith(':')).join(' '), key);
        expect(p.errors, `${code} ${pal.id}`).toEqual([]);
      }
    }
  });
});
