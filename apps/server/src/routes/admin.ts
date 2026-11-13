import { validateConfig } from '@easy-cookie/core/shared';
import type { Prisma, Site } from '@prisma/client';
import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { stream } from 'hono/streaming';
import { randomToken, safeEqual, verifyPassword } from '../lib/crypto.js';
import { ApiError, badRequest, forbidden, notFound, unauthorized } from '../lib/errors.js';
import { clientIp } from '../lib/http.js';
import { isObject, isoDate } from '../lib/util.js';
import {
  csvHeader,
  csvRow,
  filtersFromQuery,
  iterateConsents,
  listConsents,
  parseLimit,
  serializeRecord,
} from '../services/consents.js';
import {
  parseSiteInput,
  publishRevision,
  rotateSecret,
  createSite,
  serializeRevision,
  serializeSite,
  totals30d,
} from '../services/sites.js';
import { siteStats } from '../services/stats.js';
import type { AppDeps, AppEnv } from '../types.js';

export const SESSION_COOKIE = 'ec_admin';
const SESSION_TTL_MS = 7 * 86_400_000;
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function jsonBody(c: Context): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw badRequest('Body must be JSON', 'invalid_json');
  }
  if (!isObject(body)) throw badRequest('Body must be a JSON object');
  return body;
}

/** Admin API for the console, mounted at /admin/api. */
export function adminRoutes(deps: AppDeps) {
  const { prisma, config } = deps;
  const app = new Hono<AppEnv>();
  const secureCookie = config.publicUrl.startsWith('https://');

  app.use('*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });

  // ---- auth -----------------------------------------------------------------

  app.post('/auth/login', async (c) => {
    const retry = deps.loginLimiter.hit(clientIp(c, config.trustProxy));
    if (retry) {
      c.header('Retry-After', String(retry));
      throw new ApiError(429, 'rate_limited', 'Too many login attempts');
    }
    const body = await jsonBody(c);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const user = email ? await prisma.adminUser.findUnique({ where: { email } }) : null;
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      throw new ApiError(401, 'invalid_credentials', 'Wrong email or password');

    await prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    const session = await prisma.adminSession.create({
      data: {
        id: randomToken(32),
        userId: user.id,
        csrfToken: randomToken(32),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    setCookie(c, SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: 'Strict',
      secure: secureCookie,
      path: '/admin',
      maxAge: SESSION_TTL_MS / 1000,
    });
    return c.json({ user: { id: user.id, email: user.email }, csrfToken: session.csrfToken });
  });

  // Session + CSRF for everything below.
  app.use(
    '*',
    createMiddleware<AppEnv>(async (c, next) => {
      const sid = getCookie(c, SESSION_COOKIE);
      const session = sid
        ? await prisma.adminSession.findUnique({ where: { id: sid }, include: { user: true } })
        : null;
      if (!session || session.expiresAt < new Date()) {
        if (session) await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
        throw unauthorized('Not signed in');
      }
      if (MUTATING.has(c.req.method)) {
        const token = c.req.header('x-csrf-token') ?? '';
        if (!safeEqual(token, session.csrfToken)) throw forbidden('Missing or invalid CSRF token', 'csrf');
      }
      c.set('session', session);
      c.set('admin', { id: session.user.id, email: session.user.email });
      await next();
    }),
  );

  app.get('/auth/me', (c) => c.json({ user: c.get('admin'), csrfToken: c.get('session').csrfToken }));

  app.post('/auth/logout', async (c) => {
    await prisma.adminSession.delete({ where: { id: c.get('session').id } }).catch(() => {});
    deleteCookie(c, SESSION_COOKIE, { path: '/admin', secure: secureCookie });
    return c.body(null, 204);
  });

  // ---- sites ----------------------------------------------------------------

  const loadSite = async (c: Context<AppEnv>): Promise<Site> => {
    const site = await prisma.site.findUnique({ where: { id: c.req.param('id') } });
    if (!site) throw notFound('Site not found');
    return site;
  };

  app.get('/sites', async (c) => {
    const sites = await prisma.site.findMany({ orderBy: { createdAt: 'desc' } });
    const totals = await totals30d(prisma, sites.map((s) => s.id));
    return c.json(sites.map((s) => serializeSite(s, totals.get(s.id) ?? 0)));
  });

  app.post('/sites', async (c) => {
    const input = parseSiteInput(await jsonBody(c), false) as { name: string; domain: string; origins: string[] };
    const { site, secretKey } = await createSite(prisma, input);
    return c.json({ ...serializeSite(site), secretKey }, 201);
  });

  app.get('/sites/:id', async (c) => {
    const site = await loadSite(c);
    const totals = await totals30d(prisma, [site.id]);
    return c.json(serializeSite(site, totals.get(site.id) ?? 0));
  });

  app.patch('/sites/:id', async (c) => {
    const site = await loadSite(c);
    const data = parseSiteInput(await jsonBody(c), true);
    const updated = await prisma.site.update({ where: { id: site.id }, data });
    const totals = await totals30d(prisma, [site.id]);
    return c.json(serializeSite(updated, totals.get(site.id) ?? 0));
  });

  app.delete('/sites/:id', async (c) => {
    const site = await loadSite(c);
    await prisma.site.delete({ where: { id: site.id } }); // cascades versions + records
    return c.body(null, 204);
  });

  app.post('/sites/:id/rotate-secret', async (c) => {
    const site = await loadSite(c);
    return c.json({ secretKey: await rotateSecret(prisma, site.id) });
  });

  // ---- draft / revisions ----------------------------------------------------

  const draftResponse = (site: Site) => ({
    config: site.draftConfig,
    updatedAt: site.draftUpdatedAt.toISOString(),
    issues: validateConfig(site.draftConfig),
  });

  app.get('/sites/:id/draft', async (c) => c.json(draftResponse(await loadSite(c))));

  app.put('/sites/:id/draft', async (c) => {
    const site = await loadSite(c);
    const body = await jsonBody(c);
    if (body.config === undefined || body.config === null) throw badRequest('Body must be { config }');
    const updated = await prisma.site.update({
      where: { id: site.id },
      data: { draftConfig: body.config as Prisma.InputJsonValue, draftUpdatedAt: new Date() },
    });
    return c.json(draftResponse(updated));
  });

  app.get('/sites/:id/revisions', async (c) => {
    const site = await loadSite(c);
    const [versions, counts] = await Promise.all([
      prisma.policyVersion.findMany({ where: { siteId: site.id }, orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }] }),
      prisma.consentRecord.groupBy({ by: ['revision'], where: { siteId: site.id }, _count: { _all: true } }),
    ]);
    const byRev = new Map(counts.map((r) => [r.revision, r._count._all]));
    return c.json(
      versions.map((v) => ({
        revision: v.revision,
        note: v.note,
        publishedAt: v.publishedAt.toISOString(),
        publishedBy: v.publishedBy,
        recordCount: byRev.get(v.revision) ?? 0,
      })),
    );
  });

  app.post('/sites/:id/revisions', async (c) => {
    const site = await loadSite(c);
    const body = await jsonBody(c).catch(() => ({}) as Record<string, unknown>);
    if (body.revision !== undefined && body.revision !== null && typeof body.revision !== 'string')
      throw badRequest('revision: string');
    const v = await publishRevision(prisma, site, site.draftConfig, {
      revision: (body.revision as string | null | undefined) || undefined,
      note: (body.note as string | undefined) ?? null,
      publishedBy: c.get('admin').email,
    });
    return c.json(serializeRevision(v), 201);
  });

  app.get('/sites/:id/revisions/:revision', async (c) => {
    const site = await loadSite(c);
    const v = await prisma.policyVersion.findUnique({
      where: { siteId_revision: { siteId: site.id, revision: c.req.param('revision') } },
    });
    if (!v) throw notFound('Revision not found');
    return c.json(serializeRevision(v));
  });

  // ---- consents -------------------------------------------------------------

  app.get('/sites/:id/consents', async (c) => {
    const site = await loadSite(c);
    const q = c.req.query();
    const page = await listConsents(prisma, site.id, filtersFromQuery(adminFilters(q)), parseLimit(q.limit), q.cursor);
    return c.json({ items: page.items.map(serializeRecord), nextCursor: page.nextCursor });
  });

  app.get('/sites/:id/consents.csv', async (c) => {
    const site = await loadSite(c);
    const filters = filtersFromQuery(adminFilters(c.req.query()));
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="consents-${site.id}-${isoDate(new Date())}.csv"`);
    return stream(c, async (s) => {
      await s.write('﻿' + csvHeader()); // BOM so Excel reads UTF-8
      for await (const r of iterateConsents(prisma, site.id, filters)) await s.write(csvRow(r));
    });
  });

  app.get('/sites/:id/consents/:recordId', async (c) => {
    const site = await loadSite(c);
    const rec = await prisma.consentRecord.findFirst({ where: { id: c.req.param('recordId'), siteId: site.id } });
    if (!rec) throw notFound('Record not found');
    const history = await prisma.consentRecord.findMany({
      where: { siteId: site.id, consentId: rec.consentId },
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
      take: 500,
    });
    return c.json({ ...serializeRecord(rec), history: history.map(serializeRecord) });
  });

  app.get('/sites/:id/stats', async (c) => {
    const site = await loadSite(c);
    const days = c.req.query('days') ? Number(c.req.query('days')) : 30;
    if (!Number.isInteger(days) || days < 1 || days > 366) throw badRequest('days: integer between 1 and 366');
    return c.json(await siteStats(prisma, site, days));
  });

  app.all('*', () => {
    throw notFound();
  });

  return app;
}

const adminFilters = (q: Record<string, string>) => ({
  from: q.from,
  to: q.to,
  method: q.method,
  revision: q.revision,
  q: q.q,
});
