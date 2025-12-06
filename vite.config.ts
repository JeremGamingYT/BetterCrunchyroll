import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        // Copy manifest and content script to dist
        try {
          mkdirSync('dist', { recursive: true });
          copyFileSync('public/manifest.json', 'dist/manifest.json');
          copyFileSync('public/content.js', 'dist/content.js');
          copyFileSync('public/background.js', 'dist/background.js');
          copyFileSync('public/crunchyroll-api-interceptor.js', 'dist/crunchyroll-api-interceptor.js');
          copyFileSync('public/popup.html', 'dist/popup.html');
          console.log('✓ Copied extension files to dist');
        } catch (err) {
          console.error('Error copying files:', err);
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
