import { expect, test } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;

for (const [name, viewport] of [
  ['phone', { width: 412, height: 915 }],
  ['desktop', { width: 1280, height: 900 }],
] as const) {
  test(`chord identifier layout does not jump (${name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#/tools');
    const kb = page.locator('.keyboard');
    const staff = page.locator('.chord-readout .staff-paper');
    await expect(staff.locator('svg')).toBeVisible();
    // document-relative position (clicks may scroll the page on small screens)
    const docY = () => kb.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const y0 = await docY();
    const h0 = (await staff.boundingBox())!.height;

    // tap 1, 2, 3, 4 notes (C4 E4 G4 Bb4) and check nothing moves
    for (const note of ['C4', 'E4', 'G4', 'A#4']) {
      await page.getByRole('button', { name: note, exact: true }).click();
      await page.waitForTimeout(150);
      expect(await docY()).toBeCloseTo(y0, 0);
      expect((await staff.boundingBox())!.height).toBeCloseTo(h0, 0);
    }
    await expect(page.locator('.chord-name')).toHaveText('C7');
    // tapped A#4, but in a C7 chord it must read as B♭ (a minor 7th, not an augmented 6th)
    await expect(page.locator('.intervals')).toContainText('B♭4 minor 7th');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/tools-${name}.png` });
  });
}
