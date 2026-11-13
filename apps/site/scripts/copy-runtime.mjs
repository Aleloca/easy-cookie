// Copies the built browser runtime of @easy-cookie/core into public/static so the
// landing demo runs the real banner. Builds core first when dist is missing.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../../../packages/core/dist');
const out = resolve(here, '../public/static');
const files = ['easy-cookie.iife.js', 'easy-cookie.css'];

if (!files.every((f) => existsSync(resolve(dist, f)))) {
  console.log('[site] @easy-cookie/core dist missing, building it…');
  execSync('pnpm --filter @easy-cookie/core build', { stdio: 'inherit', cwd: resolve(here, '../../..') });
}
mkdirSync(out, { recursive: true });
for (const f of files) copyFileSync(resolve(dist, f), resolve(out, f));
console.log(`[site] copied ${files.join(', ')} → public/static`);
