import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, setCsrfToken, setTransport, setUnauthorizedHandler } from './client';
import { consents, drafts, revisions, sites } from './endpoints';
import { createMockServer } from '../mock/server';

function capture(status = 200, body: unknown = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  setTransport(async (url, init) => {
    calls.push({ url, init });
    return new Response(body === null ? null : JSON.stringify(body), { status });
  });
  return calls;
}

afterEach(() => {
  setCsrfToken(null);
  setUnauthorizedHandler(null);
});

describe('api client', () => {
  it('sends the CSRF header only on mutating requests', async () => {
    const calls = capture();
    setCsrfToken('tok');
    await request('GET', '/sites');
    await request('PATCH', '/sites/a', { name: 'x' });
    expect(new Headers(calls[0].init.headers).get('X-CSRF-Token')).toBeNull();
    expect(new Headers(calls[1].init.headers).get('X-CSRF-Token')).toBe('tok');
    expect(calls[1].url).toBe('/admin/api/sites/a');
    expect(calls[1].init.body).toBe('{"name":"x"}');
  });

  it('calls the unauthorized handler on 401 outside /auth', async () => {
    const onUnauth = vi.fn();
    setUnauthorizedHandler(onUnauth);
    capture(401, { error: { code: 'unauthorized', message: 'no' } });
    await expect(request('GET', '/sites')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauth).toHaveBeenCalledTimes(1);
    await expect(request('GET', '/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(onUnauth).toHaveBeenCalledTimes(1);
  });

  it('exposes validation issues from 422 responses', async () => {
    capture(422, { error: { code: 'invalid_config', message: 'bad', issues: [{ path: 'revision', message: 'Required' }] } });
    const err = (await request('POST', '/sites/a/revisions', {}).catch((e) => e)) as ApiError;
    expect(err.status).toBe(422);
    expect(err.issues).toEqual([{ path: 'revision', message: 'Required' }]);
  });

  it('reports network failures as status 0', async () => {
    setTransport(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(request('GET', '/sites')).rejects.toMatchObject({ status: 0, code: 'network' });
  });

  it('builds consent queries without empty params', () => {
    expect(consents.csvUrl('s1', { method: 'withdraw', q: '', revision: undefined })).toBe('/admin/api/sites/s1/consents.csv?method=withdraw');
  });
});

describe('mock server (synthetic data) against the client', () => {
  const now = new Date(2026, 10, 13, 12).getTime();
  const boot = () => {
    setTransport(createMockServer({ now, latency: 0, scenario: null, loggedIn: true }));
    setCsrfToken('csrf_mock_token');
  };

  it('lists sites with 30-day totals', async () => {
    boot();
    const list = await sites.list();
    expect(list.map((s) => s.id)).toEqual(['site_fua', 'site_mv', 'site_demo']);
    expect(list[0].stats30d.total).toBeGreaterThan(1000);
  });

  it('paginates the register newest first with filters', async () => {
    boot();
    const first = await consents.list('site_fua', { method: 'withdraw' }, null, 10);
    expect(first.items).toHaveLength(10);
    expect(first.items.every((r) => r.method === 'withdraw')).toBe(true);
    expect(first.items[0].receivedAt >= first.items[9].receivedAt).toBe(true);
    const second = await consents.list('site_fua', { method: 'withdraw' }, first.nextCursor, 10);
    expect(second.items[0].receivedAt <= first.items[9].receivedAt).toBe(true);
    const detail = await consents.get('site_fua', first.items[0].id);
    expect(detail.history.length).toBeGreaterThanOrEqual(1);
    expect(detail.history.every((h) => h.consentId === detail.consentId)).toBe(true);
  });

  it('refuses to publish an invalid draft with 422 issues, then publishes once fixed', async () => {
    boot();
    const d = await drafts.get('site_demo');
    const broken = { ...d.config, categories: { measurement: {} } };
    const saved = await drafts.save('site_demo', broken);
    expect(saved.issues.some((i) => i.path === 'categories')).toBe(true);
    const err = (await revisions.publish('site_demo', {}).catch((e) => e)) as ApiError;
    expect(err.status).toBe(422);
    await drafts.save('site_demo', d.config);
    const r = await revisions.publish('site_demo', { revision: '2026-11-13', note: 'prima' });
    expect(r.revision).toBe('2026-11-13');
    const again = await revisions.publish('site_demo', { revision: '2026-11-13' });
    expect(again.revision).toBe('2026-11-13-2');
  });

  it('rejects mutations without the CSRF token', async () => {
    boot();
    setCsrfToken(null);
    await expect(sites.update('site_fua', { name: 'x' })).rejects.toMatchObject({ status: 403 });
  });
});
