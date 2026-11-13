import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLegalDocument } from '../src/server';

const doc = {
  kind: 'privacy',
  lang: 'it',
  languages: ['it', 'en'],
  title: 'Informativa sulla privacy',
  html: '<div class="ec-legal" lang="it"></div>',
  version: '2026-11-13',
  publishedAt: '2026-11-13T10:00:00.000Z',
};

afterEach(() => vi.unstubAllGlobals());

describe('getLegalDocument', () => {
  it('fetches the published document with Next revalidation (default 300 s)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => doc });
    vi.stubGlobal('fetch', fetchMock);
    const res = await getLegalDocument({ endpoint: 'https://consent.example.com/', siteKey: 'pk_abc', kind: 'privacy', lang: 'it' });
    expect(res).toEqual(doc);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://consent.example.com/v1/sites/pk_abc/legal/privacy.json?lang=it');
    expect(init).toMatchObject({ credentials: 'omit', next: { revalidate: 300 } });
  });

  it('passes a custom revalidate and omits lang when not given', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => doc });
    vi.stubGlobal('fetch', fetchMock);
    await getLegalDocument({ endpoint: 'https://c.test', siteKey: 'pk_abc', kind: 'cookie', revalidate: 60 });
    expect(fetchMock.mock.calls[0][0]).toBe('https://c.test/v1/sites/pk_abc/legal/cookie.json');
    expect(fetchMock.mock.calls[0][1].next).toEqual({ revalidate: 60 });
  });

  it('returns null when nothing is published and throws on server errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect(await getLegalDocument({ endpoint: 'https://c.test', siteKey: 'pk_abc', kind: 'terms' })).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(getLegalDocument({ endpoint: 'https://c.test', siteKey: 'pk_abc', kind: 'terms' })).rejects.toThrow('503');
  });

  it('is exported from the root entry too', async () => {
    const root = await import('../src');
    expect(root.getLegalDocument).toBe(getLegalDocument);
  });
});

describe('getRemoteConfig', () => {
  it('fetches the published config with Next revalidation', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ revision: 'r1', categories: { necessary: { readOnly: true } } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { getRemoteConfig } = await import('../src/server');
    const cfg = await getRemoteConfig({ endpoint: 'https://consent.test/', siteKey: 'pk_x' });
    expect(cfg.revision).toBe('r1');
    expect(fetchMock).toHaveBeenCalledWith('https://consent.test/v1/sites/pk_x/config.json', { next: { revalidate: 60 } });
    vi.unstubAllGlobals();
  });

  it('throws when nothing is published', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    const { getRemoteConfig } = await import('../src/server');
    await expect(getRemoteConfig({ endpoint: 'https://consent.test', siteKey: 'pk_x' })).rejects.toThrow(/404/);
    vi.unstubAllGlobals();
  });
});
