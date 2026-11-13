import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN,
  adminClient,
  type AdminClient,
  consentBody,
  createPublishedSite,
  makeApp,
  ORIGIN,
  postConsent,
  prisma,
  resetDb,
} from './helpers.js';
import { createAdmin } from '../src/services/admins.js';
import { bootstrapAdmin } from '../src/services/admins.js';
import { isoDate } from '../src/lib/util.js';

let app: ReturnType<typeof makeApp>['app'];

beforeEach(async () => {
  await resetDb();
  app = makeApp().app;
});

describe('admin auth', () => {
  it('logs in with a session cookie and CSRF token', async () => {
    await createAdmin(prisma, ADMIN.email, ADMIN.password);
    const bad = await app.request('/admin/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN.email, password: 'wrong password!' }),
    });
    expect(bad.status).toBe(401);

    const res = await app.request('/admin/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ADMIN@example.com', password: ADMIN.password }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.user.email).toBe(ADMIN.email);
    expect(body.csrfToken).toBeTruthy();
    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toMatch(/^ec_admin=/);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Max-Age=604800');
    expect(setCookie).toContain('Secure'); // PUBLIC_URL is https in tests

    const cookie = setCookie.split(';')[0];
    const me = await app.request('/admin/api/auth/me', { headers: { Cookie: cookie } });
    expect(me.status).toBe(200);
    expect(((await me.json()) as any).csrfToken).toBe(body.csrfToken);
  });

  it('returns 401 without a session', async () => {
    expect((await app.request('/admin/api/auth/me')).status).toBe(401);
    expect((await app.request('/admin/api/sites')).status).toBe(401);
  });

  it('requires X-CSRF-Token on mutating requests', async () => {
    const admin = await adminClient(app);
    const noToken = await app.request('/admin/api/sites', {
      method: 'POST',
      headers: { Cookie: admin.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', domain: 'x.com', origins: [] }),
    });
    expect(noToken.status).toBe(403);
    expect(((await noToken.json()) as any).error.code).toBe('csrf');
    const wrong = await admin.call('POST', '/sites', { name: 'X', domain: 'x.com', origins: [] }, { 'X-CSRF-Token': 'nope' });
    expect(wrong.status).toBe(403);
    // GETs do not need it.
    expect((await app.request('/admin/api/sites', { headers: { Cookie: admin.cookie } })).status).toBe(200);
  });

  it('logs out', async () => {
    const admin = await adminClient(app);
    expect((await admin.post('/auth/logout')).status).toBe(204);
    expect((await admin.get('/auth/me')).status).toBe(401);
  });

  it('bootstraps the first admin from env only when none exists', async () => {
    expect(await bootstrapAdmin(prisma, 'first@example.com', 'long enough password')).toBe('first@example.com');
    expect(await bootstrapAdmin(prisma, 'second@example.com', 'long enough password')).toBeNull();
    expect(await prisma.adminUser.count()).toBe(1);
  });
});

describe('sites', () => {
  let admin: AdminClient;
  beforeEach(async () => {
    admin = await adminClient(app);
  });

  it('creates a site with keys, secret shown once, and a starter draft', async () => {
    const res = await admin.post('/sites', {
      name: 'Shop',
      domain: 'https://Shop.example.com/',
      origins: ['https://shop.example.com/', 'https://*.example.com'],
    });
    expect(res.status).toBe(201);
    const site = (await res.json()) as any;
    expect(site.publicKey).toMatch(/^pk_[0-9A-Za-z]{24}$/);
    expect(site.secretKey).toMatch(/^sk_[0-9A-Za-z]{32}$/);
    expect(site.domain).toBe('shop.example.com');
    expect(site.origins).toEqual(['https://shop.example.com', 'https://*.example.com']);
    expect(site.publishedRevision).toBeNull();
    expect(site.secretKeyHash).toBeUndefined();
    expect(site.ipHashSalt).toBeUndefined();

    const list = (await (await admin.get('/sites')).json()) as any[];
    expect(list).toHaveLength(1);
    expect(list[0].secretKey).toBeUndefined();
    expect(list[0].stats30d).toEqual({ total: 0 });

    const draft = (await (await admin.get(`/sites/${site.id}/draft`)).json()) as any;
    expect(draft.issues).toEqual([]);
    expect(draft.config.categories.necessary.readOnly).toBe(true);
    expect(Object.keys(draft.config.categories)).toEqual(['necessary', 'measurement', 'marketing']);
    expect(draft.config.googleConsentMode.enabled).toBe(true);
    expect(draft.config.language).toEqual({ default: 'it', available: ['it', 'en'] });
  });

  it('validates site input', async () => {
    expect((await admin.post('/sites', { name: '', domain: 'x.com', origins: [] })).status).toBe(400);
    expect((await admin.post('/sites', { name: 'X', domain: 'x.com', origins: ['not a url'] })).status).toBe(400);
    expect((await admin.post('/sites', { name: 'X', domain: 'x.com', origins: ['https://x.com/path'] })).status).toBe(400);
  });

  it('gets, patches and deletes a site (cascading its data)', async () => {
    const site = await createPublishedSite(admin);
    await postConsent(app, site.publicKey, consentBody());
    const patched = await admin.patch(`/sites/${site.id}`, { name: 'Renamed', origins: ['*'] });
    expect(patched.status).toBe(200);
    const body = (await patched.json()) as any;
    expect(body.name).toBe('Renamed');
    expect(body.origins).toEqual(['*']);
    expect(body.stats30d.total).toBe(1);
    expect((await admin.get(`/sites/${site.id}`)).status).toBe(200);
    expect((await admin.del(`/sites/${site.id}`)).status).toBe(204);
    expect((await admin.get(`/sites/${site.id}`)).status).toBe(404);
    expect(await prisma.consentRecord.count()).toBe(0);
    expect(await prisma.policyVersion.count()).toBe(0);
  });
});

describe('draft and revisions', () => {
  let admin: AdminClient;
  let siteId: string;
  beforeEach(async () => {
    admin = await adminClient(app);
    siteId = ((await (await admin.post('/sites', { name: 'S', domain: 's.com', origins: [ORIGIN] })).json()) as any).id;
  });

  it('saves an invalid draft and returns its issues', async () => {
    const res = await admin.put(`/sites/${siteId}/draft`, {
      config: { revision: 'x', categories: { measurement: { gcm: ['nope'] } } },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.issues.map((i: any) => i.path)).toEqual(
      expect.arrayContaining(['categories', 'categories.measurement.gcm.0']),
    );
    const again = (await (await admin.get(`/sites/${siteId}/draft`)).json()) as any;
    expect(again.config.categories.measurement.gcm).toEqual(['nope']);
    expect(again.issues.length).toBe(body.issues.length);
  });

  it('refuses to publish an invalid draft with 422 + issues', async () => {
    await admin.put(`/sites/${siteId}/draft`, { config: { revision: 'x', categories: {} } });
    const res = await admin.post(`/sites/${siteId}/revisions`, {});
    expect(res.status).toBe(422);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('invalid_config');
    expect(body.error.issues.length).toBeGreaterThan(0);
    expect(await prisma.policyVersion.count()).toBe(0);
  });

  it('publishes immutable revisions with YYYY-MM-DD default and -2 suffix', async () => {
    const today = isoDate(new Date());
    const first = await admin.post(`/sites/${siteId}/revisions`, { note: 'launch' });
    expect(first.status).toBe(201);
    const v1 = (await first.json()) as any;
    expect(v1.revision).toBe(today);
    expect(v1.config.revision).toBe(today);
    expect(v1.note).toBe('launch');

    // Edit the draft: the published snapshot must not change.
    const draft = (await (await admin.get(`/sites/${siteId}/draft`)).json()) as any;
    draft.config.categories.functionality = {};
    await admin.put(`/sites/${siteId}/draft`, { config: draft.config });
    const snap = (await (await admin.get(`/sites/${siteId}/revisions/${today}`)).json()) as any;
    expect(snap.config.categories.functionality).toBeUndefined();

    const second = (await (await admin.post(`/sites/${siteId}/revisions`, {})).json()) as any;
    expect(second.revision).toBe(`${today}-2`);
    expect(second.config.categories.functionality).toEqual({});
    const third = (await (await admin.post(`/sites/${siteId}/revisions`, {})).json()) as any;
    expect(third.revision).toBe(`${today}-3`);

    // Explicit revision; duplicates are 409.
    expect((await admin.post(`/sites/${siteId}/revisions`, { revision: 'v2' })).status).toBe(201);
    expect((await admin.post(`/sites/${siteId}/revisions`, { revision: 'v2' })).status).toBe(409);
    expect((await admin.post(`/sites/${siteId}/revisions`, { revision: 'bad rev!' })).status).toBe(400);

    const site = (await (await admin.get(`/sites/${siteId}`)).json()) as any;
    expect(site.publishedRevision).toBe('v2');

    const list = (await (await admin.get(`/sites/${siteId}/revisions`)).json()) as any[];
    expect(list.map((r) => r.revision)).toEqual(['v2', `${today}-3`, `${today}-2`, today]);
    expect(list[0].publishedBy).toBe(ADMIN.email);
    expect(list[0].recordCount).toBe(0);

    expect((await admin.get(`/sites/${siteId}/revisions/nope`)).status).toBe(404);
  });

  it('counts records per revision', async () => {
    await admin.post(`/sites/${siteId}/revisions`, { revision: 'r1' });
    const pk = ((await (await admin.get(`/sites/${siteId}`)).json()) as any).publicKey;
    await postConsent(app, pk, consentBody({ revision: 'r1' }));
    await postConsent(app, pk, consentBody({ revision: 'r1' }));
    const list = (await (await admin.get(`/sites/${siteId}/revisions`)).json()) as any[];
    expect(list[0]).toMatchObject({ revision: 'r1', recordCount: 2 });
  });
});

describe('consents register, CSV and stats', () => {
  let admin: AdminClient;
  let site: { id: string; publicKey: string };
  let ids: string[];

  beforeEach(async () => {
    admin = await adminClient(app);
    site = await createPublishedSite(admin);
    ids = [];
    const methods = ['accept_all', 'reject_all', 'custom', 'accept_all', 'close'];
    for (const [i, method] of methods.entries()) {
      const res = await postConsent(
        app,
        site.publicKey,
        consentBody({
          consentId: i < 2 ? 'same-consent' : `consent-${i}`,
          subjectId: i === 4 ? 'user-7' : undefined,
          method,
          categories: { necessary: true, measurement: method === 'accept_all' || method === 'custom', marketing: method === 'accept_all' },
          pageUrl: i === 3 ? '=HYPERLINK("http://evil")' : 'https://www.example.com/',
        }),
      );
      ids.push(((await res.json()) as any).id);
    }
  });

  it('lists newest first with cursor pagination', async () => {
    const p1 = (await (await admin.get(`/sites/${site.id}/consents?limit=2`)).json()) as any;
    expect(p1.items.map((r: any) => r.id)).toEqual([ids[4], ids[3]]);
    expect(p1.nextCursor).toBeTruthy();
    expect(Object.keys(p1.items[0]).sort()).toEqual(
      [
        'id', 'consentId', 'subjectId', 'revision', 'method', 'categories', 'services', 'language',
        'pageUrl', 'ipHash', 'userAgent', 'clientTimestamp', 'receivedAt',
      ].sort(),
    );
    const p2 = (await (await admin.get(`/sites/${site.id}/consents?limit=2&cursor=${p1.nextCursor}`)).json()) as any;
    expect(p2.items.map((r: any) => r.id)).toEqual([ids[2], ids[1]]);
    const p3 = (await (await admin.get(`/sites/${site.id}/consents?limit=2&cursor=${p2.nextCursor}`)).json()) as any;
    expect(p3.items.map((r: any) => r.id)).toEqual([ids[0]]);
    expect(p3.nextCursor).toBeNull();
  });

  it('filters by method, revision, q and date range', async () => {
    const get = async (qs: string) =>
      ((await (await admin.get(`/sites/${site.id}/consents?${qs}`)).json()) as any).items as any[];
    expect((await get('method=accept_all')).map((r) => r.id)).toEqual([ids[3], ids[0]]);
    expect(await get('revision=r1')).toHaveLength(5);
    expect(await get('revision=zzz')).toHaveLength(0);
    expect((await get('q=same-')).map((r) => r.id)).toEqual([ids[1], ids[0]]);
    expect((await get('q=user-')).map((r) => r.id)).toEqual([ids[4]]);
    const today = isoDate(new Date());
    expect(await get(`from=${today}&to=${today}`)).toHaveLength(5);
    expect(await get(`to=2000-01-01`)).toHaveLength(0);
    expect((await admin.get(`/sites/${site.id}/consents?from=garbage`)).status).toBe(400);
  });

  it('returns a record with its consentId history', async () => {
    const res = await admin.get(`/sites/${site.id}/consents/${ids[0]}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.id).toBe(ids[0]);
    expect(body.history.map((r: any) => r.id)).toEqual([ids[1], ids[0]]);
    expect((await admin.get(`/sites/${site.id}/consents/nope`)).status).toBe(404);
  });

  it('streams a CSV with the same filters', async () => {
    const res = await admin.get(`/sites/${site.id}/consents.csv?method=accept_all`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    const text = (await res.text()).replace(/^﻿/, '');
    const lines = text.trim().split('\r\n');
    expect(lines[0].split(',')[0]).toBe('id');
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith(ids[3])).toBe(true);
    // Formula injection is neutralised.
    expect(text).toContain(`"'=HYPERLINK(""http://evil"")"`);
    const header = lines[0].split(',');
    const granted = lines[1].split(',')[header.indexOf('grantedCategories')];
    expect(granted.split(' ').sort()).toEqual(['marketing', 'measurement', 'necessary']);
  });

  it('computes stats', async () => {
    const res = await admin.get(`/sites/${site.id}/stats?days=7`);
    expect(res.status).toBe(200);
    const s = (await res.json()) as any;
    expect(s.total).toBe(5);
    expect(s.byMethod).toEqual({ accept_all: 2, reject_all: 1, custom: 1, close: 1, withdraw: 0 });
    expect(s.byDay).toHaveLength(7);
    expect(s.byDay[6]).toEqual({
      date: isoDate(new Date()),
      total: 5,
      accept_all: 2,
      reject_all: 1,
      custom: 1,
      close: 1,
      withdraw: 0,
    });
    expect(s.byDay[0].total).toBe(0);
    expect(s.byCategory).toEqual({ necessary: 5, measurement: 3, marketing: 2 });
    expect(s.currentRevision).toMatchObject({ revision: 'r1', recordsSince: 5 });
    expect((await admin.get(`/sites/${site.id}/stats?days=0`)).status).toBe(400);
  });

  it('reports 30-day totals in the site list', async () => {
    const list = (await (await admin.get('/sites')).json()) as any[];
    expect(list[0].stats30d).toEqual({ total: 5 });
  });

  it('rotates the secret key', async () => {
    const res = await admin.post(`/sites/${site.id}/rotate-secret`);
    expect(res.status).toBe(200);
    const { secretKey } = (await res.json()) as any;
    expect(secretKey).toMatch(/^sk_/);
    const old = (site as any).secretKey;
    const auth = (k: string) => app.request('/v1/consents', { headers: { Authorization: `Bearer ${k}` } });
    expect((await auth(old)).status).toBe(401);
    expect((await auth(secretKey)).status).toBe(200);
  });
});
