import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseProgression, realizeProgression } from '../engine/harmony/sequence';
import { checkProgression, errorsOnly, type Satb } from '../engine/harmony/voiceleading';
import { toMidi } from '../engine/theory';
import { ALL_LESSONS } from './curriculum';
import { instrumentById } from '../engine/orchestra/instruments';
import { parseMotif } from '../engine/motif';
import { checkCounterpoint } from '../engine/counterpoint';
import { checkOrchestralVoicing } from '../engine/orchestra/voicingCheck';

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
        const res = realizeProgression(attr(tag, 'romans')!, key);
        expect(res.error).toBeUndefined();
        const r = res.realization!;
        expect(errorsOnly(checkProgression(r.voicings, r.chords, key))).toEqual([]);
      });
    }
    const chorales = [...src.matchAll(/<Chorale[^>]*\/>/g)].map((m) => m[0]).filter((t) => /\scheck[\s/]/.test(t));
    for (const tag of chorales) {
      it(`${f}: chorale "${attr(tag, 'label')}" check result`, () => {
        const key = { tonic: attr(tag, 'tonic') ?? 'C', minor: /\sminor[\s/]/.test(tag) };
        const voicings = attr(tag, 'notes')!.trim().split(/\s+/).map((c) => c.split(',').map(toMidi) as Satb);
        const parsed = parseProgression(attr(tag, 'romans')!, key);
        expect(parsed.errors).toEqual([]);
        const chords = parsed.items.map((i) => i.chord);
        expect(chords.length).toBe(voicings.length);
        const issues = checkProgression(voicings, chords, key);
        console.log(`[${f}] ${attr(tag, 'label')} → ${issues.map((i) => `${i.severity}:${i.rule}`).join(', ') || 'clean'}`);
      });
    }
    for (const tag of [...src.matchAll(/<Instrument[^>]*\/>/g)].map((m) => m[0])) {
      it(`${f}: ${tag} exists`, () => expect(instrumentById(attr(tag, 'id')!)).toBeDefined());
    }
    for (const tag of [...src.matchAll(/<Motif[^>]*\/>/g)].map((m) => m[0])) {
      it(`${f}: motif parses`, () => expect(parseMotif(attr(tag, 'notes')!).length).toBeGreaterThan(1));
    }
    for (const tag of [...src.matchAll(/<Layers[^>]*\/>/g)].map((m) => m[0])) {
      it(`${f}: layers loop voices cleanly`, () => {
        const key = { tonic: attr(tag, 'tonic') ?? 'C', minor: /\sminor[\s/]/.test(tag) };
        const res = realizeProgression(attr(tag, 'romans')!, key);
        expect(res.error).toBeUndefined();
        const mel = attr(tag, 'melody');
        if (mel) expect(parseMotif(mel).reduce((s, n) => s + n.dur, 0)).toBe(res.parsed.items.length * 4);
      });
    }
    for (const tag of [...src.matchAll(/<Counterpoint[^>]*\/>/g)].map((m) => m[0])) {
      it(`${f}: counterpoint "${attr(tag, 'label')}"`, () => {
        const u = parseMotif(attr(tag, 'upper')!);
        const l = parseMotif(attr(tag, 'lower')!);
        const total = (m: typeof u) => m.reduce((s, n) => s + n.dur, 0);
        expect(total(u)).toBe(total(l));
        if (/\scheck[\s/]/.test(tag)) console.log(`[${f}] ${attr(tag, 'label')} → ${checkCounterpoint(u, l).map((i) => i.rule).join(', ') || 'clean'}`);
      });
    }
    for (const tag of [...src.matchAll(/<OrchVoicing[^>]*\/>/g)].map((m) => m[0])) {
      it(`${f}: orchestral voicing "${attr(tag, 'labels') ?? ''}"`, () => {
        const chords = attr(tag, 'notes')!.trim().split(/\s+/).map((c) => c.split(',').map(toMidi));
        for (const c of chords) for (const n of c) expect(Number.isFinite(n)).toBe(true);
        const labels = attr(tag, 'labels');
        if (labels) expect(labels.split('|').length).toBe(chords.length);
        if (/\scheck[\s/]/.test(tag)) console.log(`[${f}] ${labels} → ${chords.map((c) => checkOrchestralVoicing(c).map((i) => i.rule).join('+') || 'clean').join(' | ')}`);
      });
    }
    const voicingTags = [...src.matchAll(/<Voicings[^>]*\/>/g)].map((m) => m[0]);
    for (const tag of voicingTags) {
      it(`${f}: voicings "${attr(tag, 'labels') ?? ''}" are valid notes`, () => {
        const chords = attr(tag, 'notes')!.trim().split(/\s+/);
        for (const c of chords) for (const n of c.split(',')) expect(Number.isFinite(toMidi(n)), n).toBe(true);
        const labels = attr(tag, 'labels');
        if (labels) expect(labels.split('|').length).toBe(chords.length);
      });
    }
  }
});
