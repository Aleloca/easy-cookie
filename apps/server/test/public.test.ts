import { createHash } from 'node:crypto';
import { renderHeadScript } from '@easy-cookie/core/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  adminClient,
  consentBody,
  createPublishedSite,
  makeApp,
  ORIGIN,
  postConsent,
  prisma,
  resetDb,
} from './helpers.js';

describe('public /v1 API', () => {
  let app: ReturnType<typeof makeApp>['app'];
  let site: { id: string; publicKey: string; secretKey: string };

  beforeEach(async () => {
    await resetDb();
    app = makeApp().app;
    site = await createPublishedSite(await adminClient(app));
  });

  describe('POST /v1/consents', () => {
    it('records a consent from an allowed origin (text/plain body, X-Site-Key)', async () => {
      const body = consentBody({ subjectId: 'user-1' });
      const ua = 'Mozilla/5.0 ' + 'x'.repeat(1000);
      const res = await postConsent(app, site.publicKey, body, { ip: '203.0.113.7', ua });
      expect(res.status).toBe(201);
      expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
      const json = (await res.json()) as { id: string; receivedAt: string };
      expect(json.id).toBeTruthy();
      expect(new Date(json.receivedAt).toISOString()).toBe(json.receivedAt);

      const rec = await prisma.consentRecord.findUniqueOrThrow({ where: { id: json.id } });
      const dbSite = await prisma.site.findUniqueOrThrow({ where: { id: site.id } });
      expect(rec.consentId).toBe(body.consentId);
      expect(rec.subjectId).toBe('user-1');
      expect(rec.method).toBe('custom');
      expect(rec.categories).toEqual(body.categories);
      // Privacy: salted hash, never the raw IP; UA truncated.
      expect(rec.ipHash).toBe(createHash('sha256').update(dbSite.ipHashSalt + '203.0.113.7').digest('hex'));
      expect(JSON.stringify(rec)).not.toContain('203.0.113.7');
      expect(rec.userAgent).toHaveLength(512);
      expect(rec.clientTimestamp.toISOString()).toBe(body.clientTimestamp);
    });

    it('accepts the key in the ?key= query (sendBeacon / CORS simple request)', async () => {
      const res = await postConsent(app, site.publicKey, consentBody(), { viaQuery: true });
      expect(res.status).toBe(201);
    });

    it('prefers the header key over the query key', async () => {
      const res = await app.request(`/v1/consents?key=pk_${'0'.repeat(24)}`, {
        method: 'POST',
        headers: { Origin: ORIGIN, 'X-Site-Key': site.publicKey, 'Content-Type': 'text/plain' },
        body: JSON.stringify(consentBody()),
      });
      expect(res.status).toBe(201);
    });

    it('accepts application/json bodies too', async () => {
      const res = await postConsent(app, site.publicKey, consentBody(), { contentType: 'application/json' });
      expect(res.status).toBe(201);
    });

    it('rejects a disallowed origin with 403 and no CORS header', async () => {
      const res = await postConsent(app, site.publicKey, consentBody(), { origin: 'https://evil.example' });
      expect(res.status).toBe(403);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
      expect(((await res.json()) as any).error.code).toBe('origin_not_allowed');
    });

    it('rejects a request without Origin unless the site allows *', async () => {
      expect((await postConsent(app, site.publicKey, consentBody(), { origin: null })).status).toBe(403);
      await prisma.site.update({ where: { id: site.id }, data: { origins: ['*'] } });
      expect((await postConsent(app, site.publicKey, consentBody(), { origin: null })).status).toBe(201);
    });

    it('supports subdomain wildcards in the allow-list', async () => {
      await prisma.site.update({ where: { id: site.id }, data: { origins: ['https://*.example.org'] } });
      expect((await postConsent(app, site.publicKey, consentBody(), { origin: 'https://a.example.org' })).status).toBe(201);
      expect((await postConsent(app, site.publicKey, consentBody(), { origin: 'https://example.org' })).status).toBe(403);
    });

    it('rejects an invalid or unknown key with 401', async () => {
      expect((await postConsent(app, 'pk_nope', consentBody())).status).toBe(401);
      expect((await postConsent(app, `pk_${'A'.repeat(24)}`, consentBody())).status).toBe(401);
      expect((await postConsent(app, site.secretKey, consentBody())).status).toBe(401);
    });

    it('validates the record', async () => {
      const bad = await postConsent(app, site.publicKey, consentBody({ method: 'maybe' }));
      expect(bad.status).toBe(400);
      expect(((await bad.json()) as any).error.code).toBe('invalid_record');
      const notJson = await app.request('/v1/consents', {
        method: 'POST',
        headers: { Origin: ORIGIN, 'X-Site-Key': site.publicKey, 'X-Forwarded-For': '1.1.1.1' },
        body: '{nope',
      });
      expect(notJson.status).toBe(400);
    });

    it('rate limits to 60 records per minute per IP per site', async () => {
      const ip = '198.51.100.1';
      for (let i = 0; i < 60; i++) expect((await postConsent(app, site.publicKey, consentBody(), { ip })).status).toBe(201);
      const limited = await postConsent(app, site.publicKey, consentBody(), { ip });
      expect(limited.status).toBe(429);
      expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
      // Other IPs are unaffected.
      expect((await postConsent(app, site.publicKey, consentBody(), { ip: '198.51.100.2' })).status).toBe(201);
    });

    it('answers CORS preflight for allowed origins only (when the key is known)', async () => {
      const ok = await app.request(`/v1/consents?key=${site.publicKey}`, {
        method: 'OPTIONS',
        headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' },
      });
      expect(ok.status).toBe(204);
      expect(ok.headers.get('access-control-allow-origin')).toBe(ORIGIN);
      expect(ok.headers.get('access-control-allow-headers')).toContain('X-Site-Key');
      const denied = await app.request(`/v1/consents?key=${site.publicKey}`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' },
      });
      expect(denied.status).toBe(403);
      expect(denied.headers.get('access-control-allow-origin')).toBeNull();
    });
  });

  describe('POST /v1/consents/:consentId/subject', () => {
    it('links every record of the consent id to a subject', async () => {
      const body = consentBody();
      await postConsent(app, site.publicKey, body);
      await postConsent(app, site.publicKey, { ...body, method: 'accept_all' });
      const other = consentBody();
      await postConsent(app, site.publicKey, other);

      const res = await app.request(`/v1/consents/${body.consentId}/subject?key=${site.publicKey}`, {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'text/plain;charset=UTF-8', 'X-Forwarded-For': '9.9.9.9' },
        body: JSON.stringify({ subjectId: 'user-42' }),
      });
      expect(res.status).toBe(204);
      const linked = await prisma.consentRecord.findMany({ where: { subjectId: 'user-42' } });
      expect(linked).toHaveLength(2);
      expect(linked.every((r) => r.consentId === body.consentId)).toBe(true);
    });

    it('enforces origin and key', async () => {
      const req = (headers: Record<string, string>) =>
        app.request(`/v1/consents/abc/subject`, { method: 'POST', headers, body: JSON.stringify({ subjectId: 'u' }) });
      expect((await req({ Origin: ORIGIN })).status).toBe(401);
      expect((await req({ Origin: 'https://evil.example', 'X-Site-Key': site.publicKey })).status).toBe(403);
      expect((await req({ Origin: ORIGIN, 'X-Site-Key': site.publicKey })).status).toBe(204);
    });
  });

  describe('config delivery', () => {
    it('serves the published config.json with the log block filled in', async () => {
      const res = await app.request(`/v1/sites/${site.publicKey}/config.json`, { headers: { Origin: ORIGIN } });
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('public, max-age=60');
      expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
      const cfg = (await res.json()) as any;
      expect(cfg.revision).toBe('r1');
      expect(cfg.log).toEqual({ endpoint: 'https://consent.test', siteKey: site.publicKey });
      expect(Object.keys(cfg.categories)).toEqual(['necessary', 'measurement', 'marketing']);
      expect(cfg.categories.necessary.readOnly).toBe(true);
      expect(cfg.googleConsentMode.enabled).toBe(true);
      expect(cfg.language).toEqual({ default: 'it', available: ['it', 'en'] });
    });

    it('returns 404 when nothing is published or the key is unknown', async () => {
      const admin = await adminClient(app);
      const fresh = (await (await admin.post('/sites', { name: 'B', domain: 'b.com', origins: [] })).json()) as any;
      expect((await app.request(`/v1/sites/${fresh.publicKey}/config.json`)).status).toBe(404);
      expect((await app.request(`/v1/sites/${fresh.publicKey}/head.js`)).status).toBe(404);
      expect((await app.request(`/v1/sites/pk_unknown/embed.js`)).status).toBe(404);
    });

    it('serves head.js = renderHeadScript(published config)', async () => {
      const res = await app.request(`/v1/sites/${site.publicKey}/head.js`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/javascript');
      expect(res.headers.get('cache-control')).toBe('public, max-age=60');
      const version = await prisma.policyVersion.findFirstOrThrow({ where: { siteId: site.id } });
      expect(await res.text()).toBe(renderHeadScript(version.config as any));
    });

    it('serves embed.js with head script, inline config and loader', async () => {
      const res = await app.request(`/v1/sites/${site.publicKey}/embed.js`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/javascript');
      const js = await res.text();
      expect(js).toContain("gtag('consent','default'");
      expect(js).toContain("'/static/easy-cookie.css'");
      expect(js).toContain("'/static/easy-cookie.iife.js'");
      expect(js).toContain('EasyCookie.run(cfg)');
      expect(js).toContain(`"siteKey":"${site.publicKey}"`);
      expect(js).toContain('"https://consent.test"');
      // It must be valid JS.
      expect(() => new Function(js)).not.toThrow();
    });
  });
});
