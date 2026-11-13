import { validateConfig } from '@easy-cookie/core/shared';
import type { Prisma } from '@prisma/client';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { SECRET_KEY_RE, sha256 } from '../lib/crypto.js';
import { ApiError, badRequest, unauthorized } from '../lib/errors.js';
import { isObject } from '../lib/util.js';
import { filtersFromQuery, listConsents, parseLimit, serializeRecord } from '../services/consents.js';
import { publishRevision, sameConfig, serializeRevision } from '../services/sites.js';
import type { AppDeps, AppEnv } from '../types.js';

/** Server-to-server API, authenticated with `Authorization: Bearer sk_…`. */
export function secretRoutes(deps: AppDeps) {
  const { prisma } = deps;
  const app = new Hono<AppEnv>();

  const auth = createMiddleware<AppEnv>(async (c, next) => {
    const m = /^Bearer\s+(\S+)$/i.exec(c.req.header('authorization') ?? '');
    const key = m?.[1];
    if (!key || !SECRET_KEY_RE.test(key)) throw unauthorized('Missing or invalid secret key');
    const site = await prisma.site.findUnique({ where: { secretKeyHash: sha256(key) } });
    if (!site) throw unauthorized('Missing or invalid secret key');
    c.set('site', site);
    c.header('Cache-Control', 'no-store');
    await next();
  });

  app.get('/v1/consents', auth, async (c) => {
    const q = c.req.query();
    const page = await listConsents(prisma, c.get('site').id, filtersFromQuery({
      consentId: q.consentId,
      subjectId: q.subjectId,
      from: q.from,
      to: q.to,
    }), parseLimit(q.limit), q.cursor);
    return c.json({ items: page.items.map(serializeRecord), nextCursor: page.nextCursor });
  });

  app.get('/v1/subjects/:subjectId/consents', auth, async (c) => {
    const q = c.req.query();
    const page = await listConsents(
      prisma,
      c.get('site').id,
      { subjectId: c.req.param('subjectId') },
      parseLimit(q.limit),
      q.cursor,
    );
    return c.json({ items: page.items.map(serializeRecord), nextCursor: page.nextCursor });
  });

  app.delete('/v1/subjects/:subjectId', auth, async (c) => {
    const { count } = await prisma.consentRecord.deleteMany({
      where: { siteId: c.get('site').id, subjectId: c.req.param('subjectId') },
    });
    return c.json({ deleted: count });
  });

  /**
   * Push a code-defined config (CI). Invalid → 422, nothing saved. Valid →
   * saved as the draft; with `publish: true` it is also published under its own
   * `config.revision`. Re-publishing an identical config is a no-op (idempotent
   * CI runs); the same revision with different content is a 409.
   */
  app.put('/v1/config', auth, async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw badRequest('Body must be JSON', 'invalid_json');
    }
    if (!isObject(body) || !('config' in body)) throw badRequest('Body must be { config, publish?, note? }');
    const { config, publish, note } = body;
    if (publish !== undefined && typeof publish !== 'boolean') throw badRequest('publish: boolean');
    if (note !== undefined && note !== null && typeof note !== 'string') throw badRequest('note: string');
    const issues = validateConfig(config);
    if (issues.length) throw new ApiError(422, 'invalid_config', 'The config has validation issues', issues);

    let site = c.get('site');
    site = await prisma.site.update({
      where: { id: site.id },
      data: { draftConfig: config as Prisma.InputJsonValue, draftUpdatedAt: new Date() },
    });

    let published: (ReturnType<typeof serializeRevision> & { created: boolean }) | null = null;
    if (publish) {
      const revision = (config as { revision: string }).revision;
      const existing = await prisma.policyVersion.findUnique({
        where: { siteId_revision: { siteId: site.id, revision } },
      });
      if (existing) {
        if (!sameConfig(existing.config, config))
          throw new ApiError(
            409,
            'revision_exists',
            `Revision "${revision}" is already published with a different config. Bump config.revision.`,
          );
        if (site.publishedRevision !== revision)
          await prisma.site.update({ where: { id: site.id }, data: { publishedRevision: revision } });
        published = { ...serializeRevision(existing), created: false };
      } else {
        const v = await publishRevision(prisma, site, config, {
          revision,
          note: (note as string | undefined) ?? null,
          publishedBy: 'api',
        });
        published = { ...serializeRevision(v), created: true };
      }
    }

    return c.json({ draft: { updatedAt: site.draftUpdatedAt.toISOString(), issues: [] }, published });
  });

  return app;
}
