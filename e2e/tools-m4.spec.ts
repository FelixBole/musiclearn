import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

test('progression playground: type, check, export MIDI, save', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/tools/playground');
  await expect(page.getByRole('heading', { name: 'Progression playground' })).toBeVisible();
  const input = page.getByLabel('Progression');
  await input.fill('I V65/V V7 I bVI bVII I');
  await expect(page.locator('.staff-paper svg')).toBeVisible();
  await expect(page.locator('.chorale-issues')).toBeVisible();
  await expect(page.locator('.parse-error')).toHaveCount(0);

  // palette entry
  await page.getByRole('button', { name: 'Chromatic' }).click();
  await page.locator('.roman-pad .choice', { hasText: 'N6' }).click();
  await expect(input).toHaveValue(/N6$/);

  // bad token is reported, not fatal
  await input.fill('I Q7 V I');
  await expect(page.locator('.parse-error')).toContainText('Q7');
  await input.fill('Cm Ab Eb Bb7 | c: i iv V7 i');
  await expect(page.locator('.parse-error')).toHaveCount(0);
  await shot(page, 'playground');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export MIDI/ }).click();
  const d = await download;
  expect(d.suggestedFilename()).toMatch(/\.mid$/);

  await page.getByLabel('Name').fill('Test loop');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.saved-list')).toContainText('Test loop');
  expect(errors).toEqual([]);
});

test('passing-chord explorer: options, insert back into the playground', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/tools/playground?p=I%20IV%20V%20I&k=C');
  await expect(page.locator('.staff-paper svg')).toBeVisible();
  await page.locator('.pair-links a', { hasText: 'IV → V' }).click();
  await expect(page.getByRole('heading', { name: 'Passing-chord explorer' })).toBeVisible();
  await expect(page.locator('.bridge').first()).toBeVisible({ timeout: 10_000 });
  expect(await page.locator('.bridge').count()).toBeGreaterThan(5);
  await shot(page, 'explorer');
  await page.locator('.bridge', { hasText: 'Secondary dominant' }).getByRole('button', { name: /Insert into my progression/ }).click();
  await expect(page.getByRole('heading', { name: 'Progression playground' })).toBeVisible();
  await expect(page.getByLabel('Progression')).toHaveValue(/^I IV \S+\/V V I$/);
  expect(errors).toEqual([]);
});
