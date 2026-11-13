import { defineConfig, type Options } from 'tsup';

const shared: Options = {
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  target: 'es2020',
  external: ['react', 'next', '@easy-cookie/react', '@easy-cookie/core', '@easy-cookie/core/shared', '@easy-cookie/policy/client'],
};

export default defineConfig([
  // Server-safe entries (no directive): head component + server consent readers.
  { ...shared, clean: true, entry: { index: 'src/index.ts', server: 'src/server.ts' } },
  // Client entry: esbuild drops module directives when bundling, so add it back.
  { ...shared, entry: { client: 'src/client.ts' }, banner: { js: '"use client";' } },
]);
