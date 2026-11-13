import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import type { ServerConfig } from '../src/env.js';
import { createAdmin } from '../src/services/admins.js';

export const prisma = new PrismaClient();

export const ADMIN = { email: 'admin@example.com', password: 'correct horse battery' };
export const ORIGIN = 'https://www.example.com';

/** Fake core build + console build in a temp dir. */
function fixtureDirs() {
  const root = mkdtempSync(join(tmpdir(), 'easy-cookie-test-'));
  const staticDir = join(root, 'static');
  const consoleDir = join(root, 'console');
  const policyDir = join(root, 'policy');
  mkdirSync(staticDir);
  mkdirSync(policyDir);
  writeFileSync(join(policyDir, 'easy-cookie-legal.css'), '.ec-legal{}');
  writeFileSync(join(policyDir, 'index.js'), 'export {}');
  mkdirSync(join(consoleDir, 'assets'), { recursive: true });
  writeFileSync(join(staticDir, 'easy-cookie.iife.js'), 'window.EasyCookie={run:function(){}};');
  writeFileSync(join(staticDir, 'easy-cookie.css'), ':root{}');
  writeFileSync(join(consoleDir, 'index.html'), '<!doctype html><div id="root"></div>');
  writeFileSync(join(consoleDir, 'assets', 'app.js'), 'console.log(1)');
  return { staticDir, consoleDir, policyDir };
}

export function makeApp(overrides: Partial<ServerConfig> = {}) {
  const config: ServerConfig = {
    databaseUrl: process.env.DATABASE_URL!,
    port: 0,
    publicUrl: 'https://consent.test',
    trustProxy: true,
    rateLimitPerMinute: 60,
    ...fixtureDirs(),
    ...overrides,
  };
  return createApp({ config, prisma });
}

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "LegalDocumentVersion", "LegalDocument", "ConsentRecord", "PolicyVersion", "Site", "AdminSession", "AdminUser" RESTART IDENTITY CASCADE',
  );
}

type App = ReturnType<typeof makeApp>['app'];

/** Logged-in admin client: keeps the session cookie and sends the CSRF token. */
export async function adminClient(app: App) {
  await createAdmin(prisma, ADMIN.email, ADMIN.password).catch(() => {});
  const res = await app.request('/admin/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  const { csrfToken } = (await res.json()) as { csrfToken: string };
  const cookie = res.headers.get('set-cookie')!.split(';')[0];
  const call = (method: string, path: string, body?: unknown, extra: Record<string, string> = {}) =>
    app.request(`/admin/api${path}`, {
      method,
      headers: {
        Cookie: cookie,
        'X-CSRF-Token': csrfToken,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...extra,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  return {
    cookie,
    csrfToken,
    get: (p: string) => call('GET', p),
    post: (p: string, b?: unknown) => call('POST', p, b ?? {}),
    put: (p: string, b: unknown) => call('PUT', p, b),
    patch: (p: string, b: unknown) => call('PATCH', p, b),
    del: (p: string) => call('DELETE', p),
    call,
  };
}

export type AdminClient = Awaited<ReturnType<typeof adminClient>>;

/** Create a site through the admin API and publish its starter draft. */
export async function createPublishedSite(admin: AdminClient, origins = [ORIGIN]) {
  const res = await admin.post('/sites', { name: 'Example', domain: 'example.com', origins });
  const site = (await res.json()) as { id: string; publicKey: string; secretKey: string };
  const pub = await admin.post(`/sites/${site.id}/revisions`, { revision: 'r1', note: 'first' });
  if (pub.status !== 201) throw new Error(`publish failed: ${pub.status} ${await pub.text()}`);
  return site;
}

let ipCounter = 0;
/** A fresh client IP per call site, so rate limits do not leak across tests. */
export const freshIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

export function consentBody(over: Record<string, unknown> = {}) {
  return {
    consentId: 'c-' + Math.random().toString(36).slice(2),
    revision: 'r1',
    categories: { necessary: true, measurement: true, marketing: false },
    services: {},
    method: 'custom',
    language: 'it',
    pageUrl: 'https://www.example.com/page',
    clientTimestamp: new Date().toISOString(),
    ...over,
  };
}

export function postConsent(
  app: App,
  key: string,
  body: unknown,
  opts: { origin?: string | null; ip?: string; viaQuery?: boolean; contentType?: string; ua?: string } = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': opts.contentType ?? 'text/plain;charset=UTF-8',
    'X-Forwarded-For': opts.ip ?? freshIp(),
  };
  if (opts.origin !== null) headers.Origin = opts.origin ?? ORIGIN;
  if (!opts.viaQuery) headers['X-Site-Key'] = key;
  if (opts.ua) headers['User-Agent'] = opts.ua;
  const url = opts.viaQuery ? `/v1/consents?key=${key}` : '/v1/consents';
  return app.request(url, { method: 'POST', headers, body: JSON.stringify(body) });
}
