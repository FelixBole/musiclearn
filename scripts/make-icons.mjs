// Renders public/icon.svg to the PNG sizes Android needs for PWA install.
// Usage: node scripts/make-icons.mjs   (uses locally installed Chrome)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: fileURLToPath(new URL(`../public/icon-${size}.png`, import.meta.url)), omitBackground: true });
}
await browser.close();
console.log('icons written');
