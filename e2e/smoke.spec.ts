import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

test('daily loop: lesson → review → drill, progress persists', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByText('Welcome')).toBeVisible();
  await shot(page, '01-today');

  // Lesson 1
  await page.getByRole('link', { name: 'Start lesson' }).click();
  await expect(page.getByRole('heading', { name: 'The staff & treble clef' })).toBeVisible();
  await expect(page.locator('.staff-paper svg').first()).toBeVisible();
  await shot(page, '02-lesson');
  const quizzes = page.locator('.quiz');
  const n = await quizzes.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await quizzes.nth(i).locator('.choice').first().click();
  await page.getByRole('button', { name: /Complete lesson/ }).click();
  await expect(page).toHaveURL(/a1-bass-grand/);

  // Review the new cards
  await page.goto('/#/');
  await expect(page.getByText(/4 cards due/)).toBeVisible();
  await page.getByRole('link', { name: 'Start review' }).click();
  // new cards go through short learning steps, so they come back within the session
  for (let i = 0; i < 20; i++) {
    const show = page.getByRole('button', { name: 'Show answer' });
    const done = page.getByText(/reviews done/);
    await expect(show.or(done)).toBeVisible();
    if (await done.isVisible()) break;
    await show.click();
    if (i === 0) await shot(page, '03-review');
    await page.getByRole('button', { name: i < 4 ? /^Good/ : /^Easy/ }).click();
  }
  await expect(page.getByText(/reviews done/)).toBeVisible();

  // Note reading drill (answer by note-name buttons)
  await page.goto('/#/practice/note-reading');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('.staff-paper svg')).toBeVisible();
  await shot(page, '04-drill');
  for (let i = 0; i < 10; i++) {
    await page.locator('.note-pad .letter').nth(i % 7).click();
    const next = page.getByRole('button', { name: /Next|Finish/ });
    // correct answers auto-advance; wrong ones need a click
    await Promise.race([
      next.click({ timeout: 2500 }).catch(() => {}),
      page.waitForTimeout(1500),
    ]);
    if (await page.getByText(/Another round/).isVisible()) break;
  }
  await expect(page.getByRole('button', { name: 'Another round' })).toBeVisible({ timeout: 10_000 });
  await shot(page, '05-drill-done');

  // Persistence
  await page.reload();
  await page.goto('/#/learn');
  await expect(page.locator('.lesson-list a.done')).toHaveCount(1);
  await shot(page, '06-learn');

  expect(errors.filter((e) => !/AudioContext|autoplay/i.test(e))).toEqual([]);
});

test('every lesson renders without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ids = [
    'a1-staff-treble', 'a1-bass-grand', 'a1-accidentals', 'a1-c-clefs', 'a2-note-values', 'a2-meter',
    'a3-interval-size', 'a3-interval-quality', 'a4-major-scale', 'a4-key-signatures', 'a4-minor',
    'a5-triads', 'a5-diatonic', 'a5-inversions', 'a5-sevenths',
  ];
  for (const id of ids) {
    await page.goto(`/#/learn/${id}`);
    await expect(page.locator('.prose')).toBeVisible();
    await expect(page.locator('.prose')).not.toContainText('notation error');
    if (id === 'a5-sevenths' || id === 'a1-c-clefs') await shot(page, `lesson-${id}`);
  }
  expect(errors).toEqual([]);
});

test('every drill starts and renders a question at each level', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const drills: [string, number][] = [
    ['note-reading', 7], ['key-signatures', 5], ['interval-reading', 4], ['interval-ear', 6],
    ['chord-quality-ear', 6], ['scale-degree-ear', 4], ['chord-spelling', 5], ['sight-reading', 6],
  ];
  for (const [id, levels] of drills) {
    for (let l = 0; l < levels; l++) {
      await page.goto(`/#/practice/${id}?level=${l}`);
      await page.getByRole('button', { name: 'Start' }).click();
      await expect(page.locator('.ex')).toBeVisible();
      await expect(page.locator('.ex')).not.toContainText('notation error');
    }
    await shot(page, `drill-${id}`);
  }
  expect(errors).toEqual([]);
});
