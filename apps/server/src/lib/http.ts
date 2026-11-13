import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';

/**
 * Client IP. With `trustProxy`, the left-most X-Forwarded-For entry (then
 * X-Real-IP); otherwise the socket address. Never stored: only hashed.
 */
export function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const xff = c.req.header('x-forwarded-for');
    if (xff) {
      const first = xff.split(',')[0]?.trim();
      if (first) return first;
    }
    const real = c.req.header('x-real-ip');
    if (real) return real.trim();
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown'; // e.g. app.request() in tests
  }
}

/** The request's origin from `Origin`, falling back to `Referer`. */
export function requestOrigin(c: Context): string | null {
  const origin = c.req.header('origin');
  if (origin && origin !== 'null') return origin.toLowerCase();
  const referer = c.req.header('referer');
  if (referer) {
    try {
      return new URL(referer).origin.toLowerCase();
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Normalise an allow-list entry: lowercased, no trailing slash or path. */
export function normalizeOrigin(entry: string): string {
  const e = entry.trim().toLowerCase().replace(/\/+$/, '');
  if (e === '*') return e;
  return e;
}

/**
 * Allow-list match. Entries: `*`, an exact origin (`https://example.com`), or a
 * subdomain wildcard (`https://*.example.com`, which does not match the apex).
 */
export function originAllowed(origin: string | null, allowList: string[]): boolean {
  if (allowList.some((o) => normalizeOrigin(o) === '*')) return true;
  if (!origin) return false;
  const o = origin.toLowerCase();
  for (const raw of allowList) {
    const entry = normalizeOrigin(raw);
    if (entry === o) return true;
    const m = /^(https?):\/\/\*\.(.+)$/.exec(entry);
    if (m) {
      try {
        const u = new URL(o);
        const scheme = u.protocol.slice(0, -1);
        const host = u.host; // includes port
        if (scheme === m[1] && host.endsWith(`.${m[2]}`)) return true;
      } catch {
        /* ignore */
      }
    }
  }
  return false;
}

/** Validate an allow-list entry. Returns an error message or null. */
export function originEntryError(entry: unknown): string | null {
  if (typeof entry !== 'string' || !entry.trim()) return 'Must be a non-empty string';
  const e = normalizeOrigin(entry);
  if (e === '*') return null;
  const candidate = e.replace('://*.', '://wildcard.');
  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'Must be an http(s) origin';
    if (u.origin !== candidate) return 'Must be an origin like https://example.com (no path)';
  } catch {
    return 'Must be an origin like https://example.com';
  }
  return null;
}

/** Public base URL for links written into configs and scripts. */
export function baseUrl(c: Context, publicUrl: string): string {
  if (publicUrl) return publicUrl;
  const u = new URL(c.req.url);
  return u.origin;
}
