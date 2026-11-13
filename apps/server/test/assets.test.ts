import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../src/lib/rate-limit.js';
import { originAllowed } from '../src/lib/http.js';
import { makeApp } from './helpers.js';

describe('static assets, console and health', () => {
  const { app } = makeApp();

  it('serves core build assets from STATIC_DIR', async () => {
    const js = await app.request('/static/easy-cookie.iife.js');
    expect(js.status).toBe(200);
    expect(js.headers.get('content-type')).toContain('application/javascript');
    expect(await js.text()).toContain('EasyCookie');
    const css = await app.request('/static/easy-cookie.css');
    expect(css.headers.get('content-type')).toContain('text/css');
  });

  it('returns 404 for missing assets and path traversal', async () => {
    expect((await app.request('/static/missing.js')).status).toBe(404);
    expect((await app.request('/static/..%2F..%2Fetc%2Fpasswd')).status).toBe(404);
    const { app: noStatic } = makeApp({ staticDir: '/nonexistent/dir' });
    expect((await noStatic.request('/static/easy-cookie.iife.js')).status).toBe(404);
  });

  it('serves the console SPA under /admin with index.html fallback', async () => {
    expect((await app.request('/admin')).status).toBe(302);
    const index = await app.request('/admin/');
    expect(index.status).toBe(200);
    expect(await index.text()).toContain('id="root"');
    const deep = await app.request('/admin/sites/abc/consents');
    expect(deep.status).toBe(200);
    expect(deep.headers.get('content-type')).toContain('text/html');
    const asset = await app.request('/admin/assets/app.js');
    expect(asset.headers.get('cache-control')).toContain('immutable');
    expect((await app.request('/admin/assets/missing.js')).status).toBe(404);
    // Unknown API paths are JSON 404s (after auth), not the SPA.
    expect((await app.request('/admin/api/nope')).status).toBe(401);
  });

  it('reports health', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: true });
  });
});

describe('helpers', () => {
  it('rate limiter windows', () => {
    let t = 0;
    const rl = new RateLimiter(2, 60_000, () => t);
    expect(rl.hit('a')).toBe(0);
    expect(rl.hit('a')).toBe(0);
    expect(rl.hit('a')).toBe(60);
    t = 30_000;
    expect(rl.hit('a')).toBe(30);
    t = 60_000;
    expect(rl.hit('a')).toBe(0);
  });

  it('origin matching', () => {
    expect(originAllowed('https://a.com', ['https://a.com/'])).toBe(true);
    expect(originAllowed('https://a.com', ['https://b.com'])).toBe(false);
    expect(originAllowed('http://a.com', ['https://a.com'])).toBe(false);
    expect(originAllowed('https://x.a.com', ['https://*.a.com'])).toBe(true);
    expect(originAllowed('https://xa.com', ['https://*.a.com'])).toBe(false);
    expect(originAllowed(null, ['*'])).toBe(true);
    expect(originAllowed(null, ['https://a.com'])).toBe(false);
  });
});
