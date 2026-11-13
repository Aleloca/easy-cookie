import { defineConfig } from 'tsup';

// The shared config/head/catalog modules of @easy-cookie/core and the legal
// renderer of @easy-cookie/policy are bundled from source (resolved through the
// tsconfig paths), so the server does not need those packages to be built.
// Everything else (markdown-it included) stays external.
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
