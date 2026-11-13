import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Resolve `relPath` inside `root` and return a streaming Response, or null when
 * the file does not exist (or the path escapes the root).
 */
export async function serveFile(root: string, relPath: string, headers: Record<string, string> = {}): Promise<Response | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(relPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const base = resolve(root);
  const full = resolve(base, `.${sep}${decoded.replace(/^\/+/, '')}`);
  if (full !== base && !full.startsWith(base + sep)) return null;
  try {
    const s = await stat(full);
    if (!s.isFile()) return null;
    const body = Readable.toWeb(createReadStream(full)) as ReadableStream;
    return new Response(body, {
      headers: {
        'Content-Type': TYPES[extname(full).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': String(s.size),
        'Last-Modified': s.mtime.toUTCString(),
        ...headers,
      },
    });
  } catch {
    return null;
  }
}
