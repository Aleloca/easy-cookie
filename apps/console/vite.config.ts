/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Consent server the dev proxy forwards to (apps/server, `pnpm dev:server`).
const target = process.env.EASY_COOKIE_SERVER ?? 'http://localhost:8787';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/admin/api': { target },
      '/v1': { target },
      // Built core runtime, loaded by the live preview iframe.
      '/static': { target },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
});
