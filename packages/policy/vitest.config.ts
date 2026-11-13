import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@easy-cookie\/core\/shared$/, replacement: here('../core/src/shared/index.ts') }],
  },
  test: {
    // The generator is DOM-free: keep it honest by testing in plain Node.
    environment: 'node',
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
