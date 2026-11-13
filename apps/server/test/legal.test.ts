import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, type AdminClient, createPublishedSite, makeApp, prisma, resetDb } from './helpers.js';

let app: ReturnType<typeof makeApp>['app'];
let admin: AdminClient;

beforeEach(async () => {
  await resetDb();
  app = makeApp().app;
  admin = await adminClient(app);
});

async function createSite(body: Record<string, unknown> = {}) {
  const res = await admin.post('/sites', { name: 'Example', domain: 'example.com', origins: [], ...body });
  return (await res.json()) as { id: string; publicKey: string };
}

const content = (translations: Record<string, { title: string; body: string }>) => ({ translations });

describe('service catalog and templates (admin)', () => {
  it('serves the catalog sorted by group then label', async () => {
    const res = await admin.get('/catalog');
    expect(res.status).toBe(200);
    const list = (await res.json()) as { id: string; group: string; label: string }[];
    expect(list.length).toBeGreaterThanOrEqual(30);
    expect(list.find((e) => e.id === 'ga4')).toMatchObject({ category: 'measurement', provider: 'Google Ireland Ltd' });
    expect(list[0].group).toBe('analytics');
    expect((await app.request('/admin/api/catalog')).status).toBe(401);
  });

  it('serves the built-in templates, with site variables when siteId is given', async () => {
    const generic = (await (await admin.get('/legal-templates/privacy?lang=en')).json()) as { title: string; body: string };
    expect(generic.title).toBe('Privacy policy');
    expect(generic.body).toContain('{{site.name}}');
    const site = await createSite({ name: 'Acme Srl', domain: 'acme.it' });
    const filled = (await (await admin.get(`/legal-templates/cookie?lang=it&siteId=${site.id}`)).json()) as { body: string };
    expect(filled.body).toContain('acme.it');
    expect(filled.body).not.toContain('{{site.');
    expect((await admin.get('/legal-templates/nope')).status).toBe(404);
    expect((await admin.get('/legal-templates/terms?siteId=missing')).status).toBe(404);
  });
});

describe('legal documents (admin)', () => {
  it('lazily creates the three documents with one translation per site language', async () => {
    const site = await createSite({ name: 'Acme', domain: 'acme.it' }); // starter config: it + en
    const res = await admin.get(`/sites/${site.id}/legal`);
    expect(res.status).toBe(200);
    const list = (await res.json()) as any[];
    expect(list.map((d) => d.kind)).toEqual(['cookie', 'privacy', 'terms']);
    expect(list[1]).toMatchObject({
      kind: 'privacy',
      title: 'Informativa sulla privacy', // default language it
      languages: ['it', 'en'],
      publishedVersion: null,
      publishedAt: null,
    });
    expect(list[1].placeholders).toBeGreaterThan(5);
    // Idempotent.
    await admin.get(`/sites/${site.id}/legal`);
    expect(await prisma.legalDocument.count({ where: { siteId: site.id } })).toBe(3);

    const detail = (await (await admin.get(`/sites/${site.id}/legal/terms`)).json()) as any;
    expect(detail.draft.translations.it.body).toContain('acme.it');
    expect(detail.versions).toEqual([]);
    expect((await admin.get(`/sites/${site.id}/legal/other`)).status).toBe(404);
  });

  it('uses language.default, then it, when available is not set', async () => {
    const site = await createSite();
    const draft = (await (await admin.get(`/sites/${site.id}/draft`)).json()) as any;
    await admin.put(`/sites/${site.id}/draft`, { config: { ...draft.config, language: { default: 'en' } } });
    const d = (await (await admin.get(`/sites/${site.id}/legal/cookie`)).json()) as any;
    expect(Object.keys(d.draft.translations)).toEqual(['en']);

    const other = await createSite();
    await admin.put(`/sites/${other.id}/draft`, { config: { ...draft.config, language: undefined } });
    const d2 = (await (await admin.get(`/sites/${other.id}/legal/cookie`)).json()) as any;
    expect(Object.keys(d2.draft.translations)).toEqual(['it']);
  });

  it('saves the draft, publishes versions and returns them', async () => {
    const site = await createSite();
    const draft = content({ it: { title: 'Termini', body: 'Corpo [[da compilare]]' }, en: { title: 'Terms', body: 'Body' } });
    const put = await admin.put(`/sites/${site.id}/legal/terms/draft`, { draft });
    expect(put.status).toBe(200);
    const saved = (await put.json()) as any;
    expect(saved.draft).toEqual(draft);
    expect(Object.keys(saved.draft.translations)).toEqual(['it', 'en']); // order kept (json column)
    expect(saved.placeholders).toBe(1);

    expect((await admin.put(`/sites/${site.id}/legal/terms/draft`, { draft: { translations: { it: { title: 1 } } } })).status).toBe(400);
    expect((await admin.put(`/sites/${site.id}/legal/terms/draft`, {})).status).toBe(400);

    const pub = await admin.post(`/sites/${site.id}/legal/terms/versions`, { note: 'first' });
    expect(pub.status).toBe(201);
    const v1 = (await pub.json()) as any;
    expect(v1.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(v1.note).toBe('first');
    const v2 = (await (await admin.post(`/sites/${site.id}/legal/terms/versions`, {})).json()) as any;
    expect(v2.version).toBe(`${v1.version}-2`);
    const explicit = await admin.post(`/sites/${site.id}/legal/terms/versions`, { version: 'v3.0' });
    expect(explicit.status).toBe(201);
    const dup = await admin.post(`/sites/${site.id}/legal/terms/versions`, { version: 'v3.0' });
    expect(dup.status).toBe(409);
    expect(((await dup.json()) as any).error.code).toBe('version_exists');
    expect((await admin.post(`/sites/${site.id}/legal/terms/versions`, { version: 'bad id!' })).status).toBe(400);

    const detail = (await (await admin.get(`/sites/${site.id}/legal/terms`)).json()) as any;
    expect(detail.publishedVersion).toBe('v3.0');
    expect(detail.versions.map((v: any) => v.version)).toEqual(['v3.0', v2.version, v1.version]);
    expect(detail.versions[0].publishedBy).toBe('admin@example.com');

    const one = (await (await admin.get(`/sites/${site.id}/legal/terms/versions/${v1.version}`)).json()) as any;
    expect(one).toMatchObject({ version: v1.version, note: 'first', content: draft });
    expect((await admin.get(`/sites/${site.id}/legal/terms/versions/nope`)).status).toBe(404);

    // Versions are immutable snapshots: editing the draft does not change them.
    await admin.put(`/sites/${site.id}/legal/terms/draft`, { draft: content({ it: { title: 'X', body: 'Y' } }) });
    const again = (await (await admin.get(`/sites/${site.id}/legal/terms/versions/${v1.version}`)).json()) as any;
    expect(again.content).toEqual(draft);

    const list = (await (await admin.get(`/sites/${site.id}/legal`)).json()) as any[];
    expect(list.find((d) => d.kind === 'terms')).toMatchObject({ publishedVersion: 'v3.0', title: 'X', languages: ['it'] });
    expect(list.find((d) => d.kind === 'terms').publishedAt).toBeTruthy();
  });

  it('refuses to publish an empty document', async () => {
    const site = await createSite();
    await admin.put(`/sites/${site.id}/legal/cookie/draft`, { draft: content({}) });
    const res = await admin.post(`/sites/${site.id}/legal/cookie/versions`, {});
    expect(res.status).toBe(422);
    expect(((await res.json()) as any).error.code).toBe('empty_document');
  });

  it('requires CSRF on mutations', async () => {
    const site = await createSite();
    const res = await app.request(`/admin/api/sites/${site.id}/legal/cookie/versions`, {
      method: 'POST',
      headers: { Cookie: admin.cookie, 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(403);
  });

  it('renders a preview against the draft banner config', async () => {
    const site = await createSite({ name: 'Acme', domain: 'acme.it' });
    const draft = (await (await admin.get(`/sites/${site.id}/draft`)).json()) as any;
    const config = {
      ...draft.config,
      services: { ga4: { category: 'measurement', label: 'GA4', provider: 'Google Ireland Ltd', cookies: [{ name: '_ga' }], from: 'ga4' } },
    };
    await admin.put(`/sites/${site.id}/draft`, { config });
    const res = await admin.post(`/sites/${site.id}/legal/cookie/render`, {
      content: content({ it: { title: 'Cookie {{site.name}}', body: '{{cookie-table}}\n\n{{services-list}}\n\n[[todo]] <b>x</b>' } }),
      lang: 'it',
    });
    expect(res.status).toBe(200);
    const r = (await res.json()) as { title: string; html: string };
    expect(r.title).toBe('Cookie Acme');
    expect(r.html).toContain('<code class="ec-policy__cookie">_ga</code>');
    expect(r.html).toContain('data-service="ga4"');
    expect(r.html).toContain('Stati Uniti');
    expect(r.html).toContain('<mark class="ec-legal__todo">todo</mark>');
    expect(r.html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect((await admin.post(`/sites/${site.id}/legal/cookie/render`, { content: 'nope' })).status).toBe(400);
  });

  it('deletes documents and versions with the site', async () => {
    const site = await createSite();
    await admin.post(`/sites/${site.id}/legal/cookie/versions`, {});
    expect(await prisma.legalDocumentVersion.count()).toBe(1);
    expect((await admin.del(`/sites/${site.id}`)).status).toBe(204);
    expect(await prisma.legalDocument.count()).toBe(0);
    expect(await prisma.legalDocumentVersion.count()).toBe(0);
  });
});

describe('legal documents (public)', () => {
  it('returns 404 not_published before publishing, with CORS', async () => {
    const site = await createPublishedSite(admin);
    for (const path of [`/v1/sites/${site.publicKey}/legal/cookie.json`, `/v1/sites/${site.publicKey}/legal/cookie.html`]) {
      const res = await app.request(path);
      expect(res.status).toBe(404);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    }
    const json = await app.request(`/v1/sites/${site.publicKey}/legal/cookie.json`);
    expect(((await json.json()) as any).error.code).toBe('not_published');
    expect((await app.request('/v1/sites/pk_unknown/legal/cookie.json')).status).toBe(404);
    expect((await app.request(`/v1/sites/${site.publicKey}/legal/other.json`)).status).toBe(404);
    expect((await app.request(`/p/${site.publicKey}/cookie`)).status).toBe(404);
  });

  it('serves the published version with directives expanded from the published banner config', async () => {
    const site = await createPublishedSite(admin); // banner r1 published, no services
    const draft = (await (await admin.get(`/sites/${site.id}/draft`)).json()) as any;
    const withGa = {
      ...draft.config,
      services: { ga4: { category: 'measurement', label: 'GA4', provider: 'Google', cookies: [{ name: '_ga' }] } },
    };
    // The draft banner has GA4, the published one does not (yet).
    await admin.put(`/sites/${site.id}/draft`, { config: withGa });
    await admin.put(`/sites/${site.id}/legal/cookie/draft`, {
      draft: content({
        it: { title: 'Cookie policy', body: '{{cookie-table}}\n\n{{preferences-link}}\n\n{{last-updated}}' },
        en: { title: 'Cookie policy EN', body: 'English {{cookie-table}}' },
      }),
    });
    await admin.post(`/sites/${site.id}/legal/cookie/versions`, { version: 'v1' });

    const res = await app.request(`/v1/sites/${site.publicKey}/legal/cookie.json?lang=it`, { headers: { Origin: 'https://other.example' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    const doc = (await res.json()) as any;
    expect(doc).toMatchObject({ kind: 'cookie', lang: 'it', languages: ['it', 'en'], title: 'Cookie policy', version: 'v1' });
    expect(doc.publishedAt).toBeTruthy();
    expect(doc.html).toMatch(/^<div class="ec-legal" lang="it" data-version="v1">/);
    expect(doc.html).toContain('<section class="ec-policy__category"'); // tables from the published config
    expect(doc.html).not.toContain('_ga'); // published config has no GA4
    expect(doc.html).toContain('data-ec-open-preferences');

    // Publishing the banner updates the expanded tables without republishing the document.
    await admin.post(`/sites/${site.id}/revisions`, { revision: 'r2' });
    const after = (await (await app.request(`/v1/sites/${site.publicKey}/legal/cookie.json?lang=it`)).json()) as any;
    expect(after.html).toContain('<code class="ec-policy__cookie">_ga</code>');

    const html = await app.request(`/v1/sites/${site.publicKey}/legal/cookie.html?lang=en`);
    expect(html.headers.get('content-type')).toContain('text/html');
    expect(html.headers.get('access-control-allow-origin')).toBe('*');
    const fragment = await html.text();
    expect(fragment).toMatch(/^<div class="ec-legal" lang="en"/);
    expect(fragment).toContain('English');
  });

  it('falls back to the config default language, then to the first translation', async () => {
    const site = await createPublishedSite(admin); // default language it
    await admin.put(`/sites/${site.id}/legal/privacy/draft`, {
      draft: content({ en: { title: 'EN', body: 'en' }, it: { title: 'IT', body: 'it' } }),
    });
    await admin.post(`/sites/${site.id}/legal/privacy/versions`, {});
    const get = async (q: string) => (await (await app.request(`/v1/sites/${site.publicKey}/legal/privacy.json${q}`)).json()) as any;
    expect((await get('?lang=en')).lang).toBe('en');
    expect((await get('?lang=de')).lang).toBe('it');
    expect((await get('')).lang).toBe('it');
    expect((await get('?lang=en-GB')).lang).toBe('en');

    await admin.put(`/sites/${site.id}/legal/terms/draft`, { draft: content({ fr: { title: 'FR', body: 'fr' }, en: { title: 'EN', body: 'en' } }) });
    await admin.post(`/sites/${site.id}/legal/terms/versions`, {});
    const terms = (await (await app.request(`/v1/sites/${site.publicKey}/legal/terms.json?lang=de`)).json()) as any;
    expect(terms.lang).toBe('fr');
  });

  it('serves the legal.js loader', async () => {
    const site = await createPublishedSite(admin);
    const res = await app.request(`/v1/sites/${site.publicKey}/legal.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/javascript');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const js = await res.text();
    expect(js).toContain('"https://consent.test"');
    expect(js).toContain(JSON.stringify(site.publicKey));
    expect(js).toContain('/static/easy-cookie-legal.css');
    expect(js).toContain('data-easy-cookie-legal');
    expect(js).toContain('data-no-style');
    expect(() => new Function(js)).not.toThrow();
    expect((await app.request('/v1/sites/pk_unknown/legal.js')).status).toBe(404);
  });

  it('serves the hosted page with language links, other documents and escaping', async () => {
    const site = await createPublishedSite(admin);
    await admin.patch(`/sites/${site.id}`, { name: 'Acme <script>alert(1)</script> & "co"' });
    await admin.put(`/sites/${site.id}/legal/privacy/draft`, {
      draft: content({
        it: { title: 'Privacy <img src=x onerror=alert(1)>', body: '# Ciao\n\n<script>alert(2)</script>\n\n{{preferences-link}}' },
        en: { title: 'Privacy EN', body: 'Hello' },
      }),
    });
    await admin.post(`/sites/${site.id}/legal/privacy/versions`, {});
    await admin.put(`/sites/${site.id}/legal/cookie/draft`, { draft: content({ it: { title: 'La cookie policy', body: 'x' } }) });
    await admin.post(`/sites/${site.id}/legal/cookie/versions`, {});

    const res = await app.request(`/p/${site.publicKey}/privacy?lang=it`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const page = await res.text();
    expect(page).toMatch(/^<!doctype html>/);
    expect(page).toContain('<html lang="it">');
    expect(page).toContain('<meta name="robots" content="index">');
    expect(page).toContain('<title>Privacy &lt;img src=x onerror=alert(1)&gt; · Acme &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;co&quot;</title>');
    expect(page).not.toContain('<script>alert');
    expect(page).not.toContain('<img src=x');
    expect(page).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(page).toContain('Generato con <a href="https://github.com/easy-cookie/easy-cookie"');
    expect(page).toContain('href="https://consent.test/static/easy-cookie-legal.css"');
    // Language switcher and the other published document (terms is not published).
    expect(page).toContain(`href="https://consent.test/p/${site.publicKey}/privacy?lang=en"`);
    expect(page).toContain('aria-current="true"');
    expect(page).toContain(`<a href="https://consent.test/p/${site.publicKey}/cookie?lang=it">La cookie policy</a>`);
    expect(page).not.toContain('/terms?');
    // No banner on the hosted page: the preferences link goes back to the site.
    expect(page).toContain('<a href="https://example.com/" class="ec-legal__preferences">');

    const en = await (await app.request(`/p/${site.publicKey}/privacy?lang=en`)).text();
    expect(en).toContain('<html lang="en">');
    expect(en).toContain('Other documents');
    expect(en).toContain('Generated with');
  });

  it('serves the legal stylesheet under /static', async () => {
    const css = await app.request('/static/easy-cookie-legal.css');
    expect(css.status).toBe(200);
    expect(css.headers.get('content-type')).toContain('text/css');
    expect(await css.text()).toContain('.ec-legal');
    // Only that file falls back to the policy build.
    expect((await app.request('/static/index.js')).status).toBe(404);
  });
});
