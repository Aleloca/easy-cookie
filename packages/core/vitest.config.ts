import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'], exclude: ['test/engine/**'],
    onConsoleLog: () => false,
    // Jest fakes these by default; the engine schedules UI work on rAF.
    fakeTimers: {
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask'],
    },
  },
});
