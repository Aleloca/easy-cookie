// Tiny static server: the playground page + the core build under /static.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const dist = join(here, '../../packages/core/dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT || 5180);

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = url.pathname.startsWith('/static/') ? join(dist, url.pathname.slice(8)) : join(here, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  file = normalize(file);
  try {
    const body = await readFile(file.endsWith('/') ? file + 'index.html' : file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`playground on http://localhost:${port}`));
