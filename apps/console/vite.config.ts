/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Consent server the dev proxy forwards to (apps/server, `pnpm dev:server`).
const target = process.env.EASY_COOKIE_SERVER ?? 'http://localhost:8787';
const mock = process.env.VITE_MOCK === '1';

/**
 * Mock mode has no consent server, so the live preview would find no runtime.
 * Serve the core build (`pnpm --filter @easy-cookie/core build`) at the same
 * `/static` paths the server uses.
 */
function mockStatic(): Plugin {
  const dist = fileURLToPath(new URL('../../packages/core/dist/', import.meta.url));
  const files: Record<string, [string, string]> = {
    '/static/easy-cookie.css': ['easy-cookie.css', 'text/css'],
    '/static/easy-cookie.iife.js': ['easy-cookie.iife.js', 'text/javascript'],
  };
  const serve = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const hit = files[(req.url ?? '').split('?')[0]];
    if (!hit) return next();
    try {
      const body = readFileSync(dist + hit[0]);
      res.setHeader('Content-Type', `${hit[1]}; charset=utf-8`);
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end('Build @easy-cookie/core first: pnpm --filter @easy-cookie/core build');
    }
  };
  return {
    name: 'easy-cookie-mock-static',
    configureServer: (server) => void server.middlewares.use(serve),
    configurePreviewServer: (server) => void server.middlewares.use(serve),
  };
}

export default defineConfig({
  base: '/admin/',
  plugins: [react(), ...(mock ? [mockStatic()] : [])],
  server: {
    port: 5173,
    proxy: mock
      ? undefined
      : {
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
