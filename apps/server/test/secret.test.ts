import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, consentBody, createPublishedSite, makeApp, postConsent, prisma, resetDb } from './helpers.js';

describe('server-to-server API (secret key)', () => {
  let app: ReturnType<typeof makeApp>['app'];
  let site: { id: string; publicKey: string; secretKey: string };
  let other: { id: string; publicKey: string; secretKey: string };
  const call = (method: string, path: string, key: string, body?: unknown) =>
    app.request(path, {
      method,
      headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

  beforeEach(async () => {
    await resetDb();
    app = makeApp().app;
    const admin = await adminClient(app);
    site = await createPublishedSite(admin);
    other = await createPublishedSite(admin);
    await postConsent(app, site.publicKey, consentBody({ consentId: 'a', subjectId: 'alice' }));
    await postConsent(app, site.publicKey, consentBody({ consentId: 'a', subjectId: 'alice', method: 'withdraw' }));
    await postConsent(app, site.publicKey, consentBody({ consentId: 'b', subjectId: 'bob' }));
    await postConsent(app, other.publicKey, consentBody({ consentId: 'x', subjectId: 'alice' }));
  });

  it('rejects missing, malformed, public and unknown keys', async () => {
    expect((await app.request('/v1/consents')).status).toBe(401);
    expect((await call('GET', '/v1/consents', 'sk_short')).status).toBe(401);
    expect((await call('GET', '/v1/consents', site.publicKey)).status).toBe(401);
    expect((await call('GET', '/v1/consents', `sk_${'a'.repeat(32)}`)).status).toBe(401);
  });

  it('queries consents scoped to the key site, with filters and pagination', async () => {
    const all = (await (await call('GET', '/v1/consents', site.secretKey)).json()) as any;
    expect(all.items).toHaveLength(3);
    expect(all.nextCursor).toBeNull();
    const byConsent = (await (await call('GET', '/v1/consents?consentId=a', site.secretKey)).json()) as any;
    expect(byConsent.items.map((r: any) => r.method)).toEqual(['withdraw', 'custom']);
    const bySubject = (await (await call('GET', '/v1/consents?subjectId=bob', site.secretKey)).json()) as any;
    expect(bySubject.items).toHaveLength(1);
    const p1 = (await (await call('GET', '/v1/consents?limit=2', site.secretKey)).json()) as any;
    expect(p1.items).toHaveLength(2);
    const p2 = (await (await call('GET', `/v1/consents?limit=2&cursor=${p1.nextCursor}`, site.secretKey)).json()) as any;
    expect(p2.items).toHaveLength(1);
  });

  it('returns a subject’s records (art. 15)', async () => {
    const res = (await (await call('GET', '/v1/subjects/alice/consents', site.secretKey)).json()) as any;
    expect(res.items).toHaveLength(2);
    expect(res.items.every((r: any) => r.subjectId === 'alice')).toBe(true);
  });

  it('erases a subject’s records only on its own site (art. 17)', async () => {
    const res = await call('DELETE', '/v1/subjects/alice', site.secretKey);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 2 });
    expect(await prisma.consentRecord.count({ where: { siteId: site.id } })).toBe(1);
    expect(await prisma.consentRecord.count({ where: { siteId: other.id, subjectId: 'alice' } })).toBe(1);
    expect(await (await call('DELETE', '/v1/subjects/alice', site.secretKey)).json()).toEqual({ deleted: 0 });
  });

  describe('PUT /v1/config', () => {
    const config = {
      revision: '2026-11-13',
      categories: { necessary: { readOnly: true }, measurement: {} },
      googleConsentMode: { enabled: true },
    };

    it('rejects an invalid config with 422 and leaves the draft alone', async () => {
      const before = await prisma.site.findUniqueOrThrow({ where: { id: site.id } });
      const res = await call('PUT', '/v1/config', site.secretKey, { config: { revision: '', categories: {} } });
      expect(res.status).toBe(422);
      expect(((await res.json()) as any).error.issues.length).toBeGreaterThan(0);
      const after = await prisma.site.findUniqueOrThrow({ where: { id: site.id } });
      expect(after.draftConfig).toEqual(before.draftConfig);
    });

    it('saves the draft without publishing', async () => {
      const res = await call('PUT', '/v1/config', site.secretKey, { config });
      expect(res.status).toBe(200);
      expect(((await res.json()) as any).published).toBeNull();
      const s = await prisma.site.findUniqueOrThrow({ where: { id: site.id } });
      expect(s.draftConfig).toEqual(config);
      expect(s.publishedRevision).toBe('r1');
    });

    it('publishes under config.revision, idempotently', async () => {
      const r1 = await call('PUT', '/v1/config', site.secretKey, { config, publish: true, note: 'ci' });
      expect(r1.status).toBe(200);
      const b1 = (await r1.json()) as any;
      expect(b1.published).toMatchObject({ revision: '2026-11-13', note: 'ci', created: true });
      const r2 = (await (await call('PUT', '/v1/config', site.secretKey, { config, publish: true })).json()) as any;
      expect(r2.published).toMatchObject({ revision: '2026-11-13', created: false });

      const cfg = (await (await app.request(`/v1/sites/${site.publicKey}/config.json`)).json()) as any;
      expect(cfg.revision).toBe('2026-11-13');
      expect(Object.keys(cfg.categories)).toEqual(['necessary', 'measurement']);

      const changed = { ...config, categories: { ...config.categories, marketing: {} } };
      const r3 = await call('PUT', '/v1/config', site.secretKey, { config: changed, publish: true });
      expect(r3.status).toBe(409);
      expect(((await r3.json()) as any).error.code).toBe('revision_exists');
      const pv = await prisma.policyVersion.findFirstOrThrow({ where: { siteId: site.id, revision: '2026-11-13' } });
      expect(pv.publishedBy).toBe('api');
    });
  });
});
