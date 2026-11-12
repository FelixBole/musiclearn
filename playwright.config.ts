import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke tests. Uses the locally installed Chrome (no browser download needed).
 * Run: npm run e2e   (starts the dev server automatically if not running)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    ...devices['Pixel 7'],
    // Pixel 7 preset is chromium-based; keep channel chrome
  },
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  outputDir: './e2e/.results',
});
