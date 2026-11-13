// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import libretto from './src/lib/libretto-shiki.json' with { type: 'json' };
import { rehypeBaseLinks } from './src/lib/rehype-base-links.mjs';

// GitHub Pages serves a project site under /<repo>/: build with
//   SITE_BASE=/easy-cookie/ SITE_URL=https://aleloca.github.io pnpm --filter @easy-cookie/site build
const base = process.env.SITE_BASE ?? '/';
const site = process.env.SITE_URL ?? 'https://aleloca.github.io';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [mdx()],
  markdown: {
    shikiConfig: { theme: /** @type {any} */ (libretto), wrap: false },
    processor: unified({ rehypePlugins: [[rehypeBaseLinks, { base }]] }),
  },
});
