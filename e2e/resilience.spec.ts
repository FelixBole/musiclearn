import { expect, test } from '@playwright/test';

/**
 * Simulates the Android failure mode: another window of the app holds the IndexedDB
 * connection and never lets go (a frozen background tab can't react to "versionchange").
 * The app must explain what's happening instead of showing "Loading…" forever.
 */
test('blocked database shows recovery UI, not an endless spinner', async ({ page, context }) => {
  // A "rogue" page of the same origin that opens the DB raw and ignores versionchange.
  const rogue = await context.newPage();
  await rogue.goto('/#/settings');
  await expect(rogue.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await rogue.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.open('musiclearn');
        req.onsuccess = () => {
          (window as unknown as { held: IDBDatabase }).held = req.result; // keep it open, ignore versionchange
          resolve();
        };
      }),
  );

  // The rogue's own Dexie connection would close politely; only the raw handle stays.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Diagnostics & repair' })).toBeVisible();
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete local database' }).click();
  await expect(page.getByText(/another MusicLearn window\/tab is holding the database/)).toBeVisible({ timeout: 5000 });

  // Diagnostics still work while the DB is blocked
  await page.getByRole('button', { name: 'Show diagnostics' }).click();
  await expect(page.locator('pre.diag')).toContainText('userAgent', { timeout: 20000 });

  // Releasing the rogue connection lets the deletion finish and the app recover
  await rogue.evaluate(() => (window as unknown as { held: IDBDatabase }).held.close());
  await expect(page.getByRole('heading', { name: 'Today' }).or(page.getByRole('heading', { name: 'Settings' }))).toBeVisible({ timeout: 15000 });
  await page.goto('/#/');
  await expect(page.locator('.steps')).toBeVisible({ timeout: 10000 });
});

test('render errors are caught and logged, with diagnostics available', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.steps')).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem('musiclearn:errors', JSON.stringify([{ t: 'x', kind: 'test', msg: 'synthetic error for test' }]));
  });
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Show diagnostics' }).click();
  await expect(page.locator('pre.diag')).toContainText('synthetic error for test', { timeout: 20000 });
  await expect(page.locator('pre.diag')).toContainText('db open: ok');
});
