import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      mediabunny: resolve(import.meta.dirname, 'vendor/mediabunny/mediabunny.min.mjs'),
    },
  },
  build: {
    rolldownOptions: {
      input: ['index.html', 'studio.html', 'privacy.html'].map(page => resolve(import.meta.dirname, page)),
    },
  },
});
