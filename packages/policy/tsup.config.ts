import { defineConfig, type Options } from 'tsup';

const shared: Options = {
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  target: 'es2020',
  external: ['react', '@easy-cookie/core', '@easy-cookie/core/shared', '@easy-cookie/core/catalog', 'markdown-it'],
};

export default defineConfig([
  // Server-safe entries. `react` re-exports the client component from its own
  // file, kept external so its "use client" directive survives bundling.
  {
    ...shared,
    entry: { index: 'src/index.ts', react: 'src/react.tsx' },
    esbuildPlugins: [
      {
        name: 'external-client-component',
        setup(build) {
          const ext = build.initialOptions.format === 'cjs' ? '.cjs' : '.js';
          build.onResolve({ filter: /^\.\/legal-document$/ }, () => ({ path: `./legal-document${ext}`, external: true }));
        },
      },
    ],
  },
  // Client component: esbuild drops module directives when bundling, so add it back.
  { ...shared, dts: false, entry: { 'legal-document': 'src/legal-document.tsx' }, banner: { js: '"use client";' } },
]);
