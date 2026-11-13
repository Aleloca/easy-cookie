import { defineConfig } from 'tsup';

// The shared config/head modules of @easy-cookie/core are bundled from source
// (resolved through the tsconfig path), so the server does not need the core
// package to be built. Everything else stays external.
export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@easy-cookie\//],
});
