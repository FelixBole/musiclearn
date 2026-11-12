/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the build works on GitHub Pages sub-paths and locally.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
  plugins: [
    { enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react', remarkPlugins: [remarkGfm] }) },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/samples/'),
            handler: 'CacheFirst',
            options: { cacheName: 'samples', expiration: { maxEntries: 500 } },
          },
        ],
      },
      manifest: {
        name: 'MusicLearn – Harmony & Ear Trainer',
        short_name: 'MusicLearn',
        description: 'Daily lessons and drills in music theory, harmony, ear training and orchestration.',
        theme_color: '#14121a',
        background_color: '#14121a',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // vendor chunks change rarely, so app updates stay small for the PWA cache
        manualChunks(id) {
          if (id.includes('node_modules/vexflow')) return 'vexflow';
          if (id.includes('node_modules/tone') || id.includes('standardized-audio-context')) return 'tone';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // CI runners are several times slower than a dev machine; harmony tests run the voicing search a lot
    testTimeout: 30_000,
  },
});
