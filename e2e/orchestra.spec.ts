import { expect, test } from '@playwright/test';
import { ORCHESTRA_SAMPLES } from '../src/engine/audio/orchestraManifest';

test('every orchestral sample decodes in the browser', async ({ page }) => {
  await page.goto('/');
  const urls = Object.entries(ORCHESTRA_SAMPLES).flatMap(([id, notes]) => Object.values(notes).map((f) => `samples/orchestra/${id}/${f}`));
  const result = await page.evaluate(async (list) => {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const bad: string[] = [];
    let seconds = 0;
    for (const u of list) {
      try {
        const buf = await (await fetch(u)).arrayBuffer();
        const audio = await ctx.decodeAudioData(buf);
        seconds += audio.duration;
        if (audio.duration < 2) bad.push(`${u} too short (${audio.duration})`);
      } catch (e) {
        bad.push(`${u}: ${(e as Error).message}`);
      }
    }
    return { bad, avg: seconds / list.length };
  }, urls);
  expect(result.bad).toEqual([]);
  expect(result.avg).toBeGreaterThan(3);
});

test('playground plays with strings (samples load, playback starts)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const loaded = new Set<string>();
  page.on('response', (r) => {
    if (r.url().includes('/samples/orchestra/') && r.ok()) loaded.add(r.url().split('/samples/orchestra/')[1].split('/')[0]);
  });
  await page.goto('/#/tools/playground?p=I%20IV%20V%20I&k=C');
  await page.getByLabel('Sound').selectOption('strings');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect(page.getByRole('button', { name: '■ Stop' })).toBeVisible();
  await expect.poll(() => [...loaded].sort().join(','), { timeout: 15_000 }).toContain('violins');
  expect([...loaded]).toEqual(expect.arrayContaining(['cellos', 'violas', 'violins', 'basses']));
  await page.getByRole('button', { name: '■ Stop' }).click();
  expect(errors).toEqual([]);
});
