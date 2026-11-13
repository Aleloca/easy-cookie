import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  external: ['react', 'react-dom', '@easy-cookie/core', '@easy-cookie/core/shared'],
  // Every export is a client component or a hook: mark the whole bundle as a
  // client module so Next.js server components can import it directly.
  banner: { js: '"use client";' },
});
