import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

/**
 * Vite build for the BetterCR Chrome extension (MV3).
 *
 * - `@crxjs/vite-plugin` bundles the manifest-referenced entries (content
 *   script, background service worker, injected page script) with the correct
 *   output formats and rewrites their runtime paths.
 * - The redesigned SPA (`src/app/index.html`) is added as an explicit Rollup
 *   input so it ships inside the extension and is loaded in an iframe overlay
 *   via `chrome.runtime.getURL` — no dev server is required at runtime.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
      '@injected': fileURLToPath(new URL('./src/injected', import.meta.url)),
      '@background': fileURLToPath(new URL('./src/background', import.meta.url)),
      '@watch': fileURLToPath(new URL('./src/watch', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  plugins: [react(), crx({ manifest })],
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      input: {
        app: 'src/app/index.html',
      },
    },
  },
  server: { port: 5173, strictPort: true },
});
