import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@easy-cookie\/core\/shared$/, replacement: here('../core/src/shared/index.ts') },
      // The browser runtime is developed separately: tests use a fake implementing EasyCookieApi.
      { find: /^@easy-cookie\/core$/, replacement: here('./test/core-stub.ts') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
