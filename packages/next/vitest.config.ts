import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@easy-cookie\/core\/shared$/, replacement: here('../core/src/shared/index.ts') },
      { find: /^@easy-cookie\/core$/, replacement: here('../react/test/core-stub.ts') },
      { find: /^@easy-cookie\/react$/, replacement: here('../react/src/index.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
