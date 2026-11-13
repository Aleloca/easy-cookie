import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ServerConfig } from './env.js';
import { ApiError, notFound } from './lib/errors.js';
import { serveFile } from './lib/files.js';
import { RateLimiter } from './lib/rate-limit.js';
import { adminRoutes } from './routes/admin.js';
import { legalRoutes } from './routes/legal.js';
import { publicRoutes } from './routes/public.js';
import { secretRoutes } from './routes/secret.js';
import type { AppDeps, AppEnv } from './types.js';

const LEGAL_CSS = 'easy-cookie-legal.css';

export function createApp(opts: { config: ServerConfig; prisma?: PrismaClient; deps?: Partial<AppDeps> }) {
  const deps: AppDeps = {
    config: opts.config,
    prisma: opts.prisma ?? new PrismaClient(),
    consentLimiter: opts.deps?.consentLimiter ?? new RateLimiter(opts.config.rateLimitPerMinute),
    loginLimiter: opts.deps?.loginLimiter ?? new RateLimiter(10),
  };
  const { config, prisma } = deps;
  const app = new Hono<AppEnv>();

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json(err.toJSON(), err.status);
    if (err instanceof HTTPException) {
      const res = err.getResponse();
      return c.json({ error: { code: 'http_error', message: err.message || res.statusText } }, err.status);
    }
    console.error(err);
    return c.json({ error: { code: 'internal', message: 'Internal server error' } }, 500);
  });

  app.notFound((c) => c.json(notFound().toJSON(), 404));

  app.get('/health', async (c) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return c.json({ ok: true, db: true });
    } catch {
      return c.json({ ok: false, db: false }, 503);
    }
  });

  app.route('/', publicRoutes(deps));
  app.route('/', legalRoutes(deps));
  app.route('/', secretRoutes(deps));
  app.route('/admin/api', adminRoutes(deps));

  // Built assets of @easy-cookie/core. The legal stylesheet comes from
  // @easy-cookie/policy: STATIC_DIR wins (the Docker image copies it there),
  // then POLICY_DIR (the policy package build, for dev and source installs).
  app.get('/static/*', async (c) => {
    const rel = c.req.path.slice('/static/'.length);
    const headers = { 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' };
    let res = await serveFile(config.staticDir, rel, headers);
    if (!res && rel === LEGAL_CSS) res = await serveFile(config.policyDir, LEGAL_CSS, headers);
    return res ?? c.json(notFound('Asset not found').toJSON(), 404);
  });

  // Console SPA under /admin, with index.html fallback for client-side routes.
  const consoleHandler = async (c: any) => {
    const rel = c.req.path.replace(/^\/admin\/?/, '');
    if (rel) {
      const file = await serveFile(config.consoleDir, rel, {
        'Cache-Control': rel.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      });
      if (file) return file;
      // Missing asset-looking paths are real 404s, not SPA routes.
      if (/\.[a-z0-9]+$/i.test(rel)) return c.json(notFound('File not found').toJSON(), 404);
    }
    const index = await serveFile(config.consoleDir, 'index.html', { 'Cache-Control': 'no-cache' });
    if (index) return index;
    return c.text(`Console not built: ${join(config.consoleDir, 'index.html')} not found.`, 404);
  };
  app.get('/admin', (c) => c.redirect('/admin/'));
  app.get('/admin/*', consoleHandler);
  app.get('/', (c) => c.redirect('/admin/'));

  return { app, deps };
}
