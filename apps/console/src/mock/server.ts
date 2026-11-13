/**
 * In-memory Admin API for mock mode (`VITE_MOCK=1`). It follows docs/api.md
 * closely enough that the console code paths are the real ones: same URLs,
 * same shapes, CSRF header, 401s, 422 with issues, cursor pagination.
 *
 * All data is SYNTHETIC (see ./data.ts). Scenarios for screenshots and manual
 * checks are picked with `localStorage['ec-mock-scenario']`:
 *   - `empty`  no sites at all
 *   - `error`  every request to /sites fails with 500
 *   - `slow`   2 s latency
 * and `sessionStorage['ec-mock-session'] = '0'` starts logged out.
 */
import { validateConfig, type ConsentMethod, type EasyCookieConfig } from '@easy-cookie/core/shared';
import type { ConsentRecord, CreatedSite, Stats } from '../api/types';
import { METHODS } from '../api/types';
import { base62, createMockDb, dateId, ensureRecords, mulberry32, starterConfig, type MockSite } from './data';

const DAY = 86_400_000;

function storage(kind: 'local' | 'session', key: string): string | null {
  try {
    return (kind === 'local' ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}
function setSession(v: '0' | '1') {
  try {
    sessionStorage.setItem('ec-mock-session', v);
  } catch {
    /* ignore */
  }
}

export interface MockServerOptions {
  now?: number;
  latency?: number;
  scenario?: 'empty' | 'error' | 'slow' | null;
  loggedIn?: boolean;
}

export function createMockServer(opts: MockServerOptions = {}) {
  const now = () => opts.now ?? Date.now();
  const scenario = opts.scenario !== undefined ? opts.scenario : (storage('local', 'ec-mock-scenario') as MockServerOptions['scenario']);
  let db: MockSite[] = scenario === 'empty' ? [] : createMockDb(now());
  let loggedIn = opts.loggedIn ?? storage('session', 'ec-mock-session') !== '0';
  const csrf = 'csrf_mock_token';
  const user = { id: 'usr_1', email: 'admin@esempio.it' };
  const rand = mulberry32(99);
  const latency = opts.latency ?? (scenario === 'slow' ? 2000 : 220);

  const json = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  const fail = (status: number, code: string, message: string, issues?: unknown) =>
    json(status, { error: { code, message, ...(issues ? { issues } : {}) } });

  const find = (id: string) => db.find((e) => e.site.id === id);

  function stats(entry: MockSite, days: number): Stats {
    const recs = ensureRecords(entry, now());
    const end = new Date(now());
    end.setHours(0, 0, 0, 0);
    const startDay = end.getTime() - (days - 1) * DAY;
    const inRange = recs.filter((r) => new Date(r.receivedAt).getTime() >= startDay);
    const byMethod = Object.fromEntries(METHODS.map((m) => [m, 0])) as Stats['byMethod'];
    const byDayMap = new Map<string, Stats['byDay'][number]>();
    for (let i = 0; i < days; i++) {
      const date = dateId(new Date(startDay + i * DAY + 3_600_000));
      byDayMap.set(date, { date, total: 0, accept_all: 0, reject_all: 0, custom: 0, close: 0, withdraw: 0 });
    }
    const byCategory: Record<string, number> = {};
    for (const r of inRange) {
      byMethod[r.method]++;
      const day = byDayMap.get(dateId(new Date(r.receivedAt)));
      if (day) {
        day.total++;
        day[r.method]++;
      }
      for (const [c, g] of Object.entries(r.categories)) {
        byCategory[c] ??= 0;
        if (g) byCategory[c]++;
      }
    }
    const current = entry.revisions[0];
    return {
      total: inRange.length,
      byMethod,
      byDay: [...byDayMap.values()],
      byCategory,
      currentRevision: current
        ? {
            revision: current.revision,
            publishedAt: current.publishedAt,
            recordsSince: recs.filter((r) => r.receivedAt >= current.publishedAt).length,
          }
        : null,
    };
  }

  function filterRecords(entry: MockSite, q: URLSearchParams): ConsentRecord[] {
    const from = q.get('from');
    const to = q.get('to');
    const method = q.get('method');
    const revision = q.get('revision');
    const text = q.get('q')?.toLowerCase().replace(/-/g, '');
    return ensureRecords(entry, now()).filter(
      (r) =>
        (!from || r.receivedAt >= from) &&
        (!to || r.receivedAt <= to) &&
        (!method || r.method === method) &&
        (!revision || r.revision === revision) &&
        (!text || r.consentId.replace(/-/g, '').startsWith(text) || (r.subjectId ?? '').toLowerCase().startsWith(text)),
    );
  }

  function csv(records: ConsentRecord[]): string {
    const head = 'id,consentId,subjectId,revision,method,categories,services,language,pageUrl,ipHash,userAgent,clientTimestamp,receivedAt';
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      head,
      ...records.map((r) =>
        [r.id, r.consentId, r.subjectId, r.revision, r.method, r.categories, r.services, r.language, r.pageUrl, r.ipHash, r.userAgent, r.clientTimestamp, r.receivedAt]
          .map(esc)
          .join(','),
      ),
    ].join('\n');
  }

  async function handle(url: URL, init: RequestInit): Promise<Response> {
    const method = (init.method ?? 'GET').toUpperCase();
    const path = url.pathname.replace(/^\/admin\/api/, '');
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const headers = new Headers(init.headers);

    // Auth
    if (path === '/auth/login' && method === 'POST') {
      if (!body?.email || !body?.password || body.password === 'sbagliata' || body.password === 'wrong')
        return fail(401, 'invalid_credentials', 'Invalid email or password');
      loggedIn = true;
      setSession('1');
      return json(200, { user: { ...user, email: body.email }, csrfToken: csrf });
    }
    if (path === '/auth/me' && method === 'GET') {
      return loggedIn ? json(200, { user, csrfToken: csrf }) : fail(401, 'unauthorized', 'Not signed in');
    }
    if (!loggedIn) return fail(401, 'unauthorized', 'Not signed in');
    if (method !== 'GET' && headers.get('X-CSRF-Token') !== csrf) return fail(403, 'csrf', 'Missing or invalid CSRF token');
    if (path === '/auth/logout' && method === 'POST') {
      loggedIn = false;
      setSession('0');
      return new Response(null, { status: 204 });
    }

    if (scenario === 'error' && path.startsWith('/sites')) return fail(500, 'internal', 'Database unavailable');

    // Sites
    if (path === '/sites' && method === 'GET') {
      for (const e of db) ensureRecords(e, now());
      return json(200, db.map((e) => e.site));
    }
    if (path === '/sites' && method === 'POST') {
      if (!body?.name || !body?.domain) return fail(400, 'invalid', 'name and domain are required');
      const secretKey = `sk_${base62(rand, 32)}`;
      const site: CreatedSite = {
        id: `site_${base62(rand, 8)}`,
        name: body.name,
        domain: body.domain,
        publicKey: `pk_${base62(rand, 24)}`,
        origins: body.origins ?? [],
        publishedRevision: null,
        createdAt: new Date(now()).toISOString(),
        stats30d: { total: 0 },
        secretKey,
      };
      const { secretKey: _omit, ...stored } = site;
      db = [...db, { site: stored, draft: { config: starterConfig(), updatedAt: site.createdAt }, revisions: [], records: [], gen: null }];
      return json(201, site);
    }

    const m = /^\/sites\/([^/]+)(?:\/(.*))?$/.exec(path);
    if (!m) return fail(404, 'not_found', 'Not found');
    const entry = find(decodeURIComponent(m[1]));
    if (!entry) return fail(404, 'not_found', 'Site not found');
    const rest = m[2] ?? '';

    if (rest === '') {
      if (method === 'GET') {
        ensureRecords(entry, now());
        return json(200, entry.site);
      }
      if (method === 'PATCH') {
        entry.site = { ...entry.site, ...pick(body, ['name', 'domain', 'origins']) };
        return json(200, entry.site);
      }
      if (method === 'DELETE') {
        db = db.filter((e) => e !== entry);
        return new Response(null, { status: 204 });
      }
    }
    if (rest === 'rotate-secret' && method === 'POST') return json(200, { secretKey: `sk_${base62(rand, 32)}` });

    if (rest === 'draft') {
      if (method === 'GET') return json(200, { ...entry.draft, issues: validateConfig(entry.draft.config) });
      if (method === 'PUT') {
        entry.draft = { config: body.config as EasyCookieConfig, updatedAt: new Date(now()).toISOString() };
        return json(200, { ...entry.draft, issues: validateConfig(entry.draft.config) });
      }
    }

    if (rest === 'revisions') {
      if (method === 'GET') {
        ensureRecords(entry, now());
        return json(200, entry.revisions.map(({ config: _c, ...r }) => r));
      }
      if (method === 'POST') {
        const issues = validateConfig(entry.draft.config);
        if (issues.length) return fail(422, 'invalid_config', 'The draft is invalid', issues);
        let revision = (body?.revision as string | undefined)?.trim() || dateId(new Date(now()));
        const base = revision;
        for (let i = 2; entry.revisions.some((r) => r.revision === revision); i++) revision = `${base}-${i}`;
        const rev = {
          revision,
          note: (body?.note as string | undefined)?.trim() || null,
          publishedAt: new Date(now()).toISOString(),
          publishedBy: user.email,
          recordCount: 0,
          config: { ...structuredClone(entry.draft.config), revision },
        };
        entry.revisions = [rev, ...entry.revisions];
        entry.site = { ...entry.site, publishedRevision: revision };
        const { config: _c, ...summary } = rev;
        return json(201, summary);
      }
    }
    const rm = /^revisions\/(.+)$/.exec(rest);
    if (rm && method === 'GET') {
      const r = entry.revisions.find((x) => x.revision === decodeURIComponent(rm[1]));
      if (!r) return fail(404, 'not_found', 'Revision not found');
      return json(200, { revision: r.revision, note: r.note, publishedAt: r.publishedAt, config: r.config });
    }

    if (rest === 'consents' && method === 'GET') {
      const all = filterRecords(entry, url.searchParams);
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
      const offset = Number(url.searchParams.get('cursor') ? atob(url.searchParams.get('cursor')!) : 0);
      const items = all.slice(offset, offset + limit);
      const next = offset + limit < all.length ? btoa(String(offset + limit)) : null;
      return json(200, { items, nextCursor: next });
    }
    if (rest === 'consents.csv' && method === 'GET') {
      return new Response(csv(filterRecords(entry, url.searchParams)), { status: 200, headers: { 'Content-Type': 'text/csv' } });
    }
    const cm = /^consents\/(.+)$/.exec(rest);
    if (cm && method === 'GET') {
      const recs = ensureRecords(entry, now());
      const r = recs.find((x) => x.id === decodeURIComponent(cm[1]));
      if (!r) return fail(404, 'not_found', 'Record not found');
      return json(200, { ...r, history: recs.filter((x) => x.consentId === r.consentId) });
    }
    if (rest === 'stats' && method === 'GET') {
      return json(200, stats(entry, Number(url.searchParams.get('days') ?? 30)));
    }
    return fail(404, 'not_found', 'Not found');
  }

  return async function mockFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const url = new URL(input, 'http://mock.local');
    if (latency) await new Promise((r) => setTimeout(r, latency * (0.6 + Math.random() * 0.8)));
    return handle(url, init);
  };
}

function pick(obj: Record<string, unknown> | undefined, keys: string[]) {
  const out: Record<string, unknown> = {};
  if (!obj) return out;
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export type MockFetch = ReturnType<typeof createMockServer>;
export type { ConsentMethod };
