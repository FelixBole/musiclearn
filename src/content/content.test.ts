import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { realize } from '../engine/harmony/voicing';
import { parseRoman } from '../engine/harmony/roman';
import { checkProgression, errorsOnly, type Satb } from '../engine/harmony/voiceleading';
import { toMidi } from '../engine/theory';
import { ALL_LESSONS } from './curriculum';

const dir = join(__dirname, 'lessons');
const files = readdirSync(dir).filter((f) => f.endsWith('.mdx'));
const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];

describe('lesson content', () => {
  it('every curriculum lesson has a body and every body is in the curriculum', () => {
    const ids = new Set(ALL_LESSONS.map((l) => l.id));
    for (const l of ALL_LESSONS) expect(files, l.id).toContain(`${l.id}.mdx`);
    for (const f of files) expect(ids.has(f.replace('.mdx', '')), f).toBe(true);
  });

  for (const f of files) {
    const src = readFileSync(join(dir, f), 'utf8');
    const progressions = [...src.matchAll(/<Progression[^>]*\/>/g)].map((m) => m[0]);
    for (const tag of progressions) {
      it(`${f}: ${tag.slice(0, 70)} voices cleanly`, () => {
        const key = { tonic: attr(tag, 'tonic') ?? 'C', minor: /\sminor[\s/]/.test(tag) };
        const symbols = attr(tag, 'romans')!.trim().split(/\s+/);
        const r = realize(symbols, key);
        expect(errorsOnly(checkProgression(r.voicings, r.chords, key))).toEqual([]);
      });
    }
    const chorales = [...src.matchAll(/<Chorale[^>]*\/>/g)].map((m) => m[0]).filter((t) => /\scheck[\s/]/.test(t));
    for (const tag of chorales) {
      it(`${f}: chorale "${attr(tag, 'label')}" check result`, () => {
        const key = { tonic: attr(tag, 'tonic') ?? 'C', minor: /\sminor[\s/]/.test(tag) };
        const voicings = attr(tag, 'notes')!.trim().split(/\s+/).map((c) => c.split(',').map(toMidi) as Satb);
        const chords = attr(tag, 'romans')!.trim().split(/\s+/).map((s) => parseRoman(s, key));
        const issues = checkProgression(voicings, chords, key);
        console.log(`[${f}] ${attr(tag, 'label')} → ${issues.map((i) => `${i.severity}:${i.rule}`).join(', ') || 'clean'}`);
      });
    }
  }
});
