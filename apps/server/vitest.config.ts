import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Integration tests run against a real Postgres (see README "Tests").
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:test@localhost:54329/easycookie?schema=public';
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  resolve: {
    alias: {
      '@easy-cookie/core/shared': fileURLToPath(new URL('../../packages/core/src/shared/index.ts', import.meta.url)),
    },
  },
  test: {
    globalSetup: ['./test/global-setup.ts'],
    env: { DATABASE_URL: TEST_DATABASE_URL },
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
