import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const banner = {
  js: `/*! @easy-cookie/core ${pkg.version} | MIT | includes vanilla-cookieconsent v3.3.0 (c) Orest Bida, MIT */`,
};

export default defineConfig([
  {
    entry: { index: 'src/index.ts', shared: 'src/shared/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2019',
    banner,
  },
  {
    entry: { 'easy-cookie.iife': 'src/iife.ts' },
    format: ['iife'],
    minify: true,
    sourcemap: true,
    target: 'es2017',
    outExtension: () => ({ js: '.js' }),
    banner,
  },
]);
