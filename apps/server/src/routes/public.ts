import { renderHeadScript, type EasyCookieConfig } from '@easy-cookie/core/shared';
import type { PolicyVersion, Site } from '@prisma/client';
import { Hono, type Context } from 'hono';
import { PUBLIC_KEY_RE, sha256 } from '../lib/crypto.js';
import { ApiError, badRequest, forbidden, notFound, unauthorized } from '../lib/errors.js';
import { baseUrl, clientIp, originAllowed, requestOrigin } from '../lib/http.js';
import { isObject, jsonForScript } from '../lib/util.js';
import { parseConsentInput, UA_MAX } from '../services/consents.js';
import { deliveredConfig } from '../services/sites.js';
import type { AppDeps, AppEnv } from '../types.js';

const MAX_BODY = 32 * 1024;
const CORS_METHODS = 'GET, POST, OPTIONS';
const CORS_HEADERS = 'Content-Type, X-Site-Key';

function setCors(c: Context, origin: string) {
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Vary', 'Origin');
}

/** Read the body as JSON whatever the content type (sendBeacon sends text/plain). */
async function readJson(c: Context): Promise<unknown> {
  const len = Number(c.req.header('content-length') ?? 0);
  if (len > MAX_BODY) throw new ApiError(413, 'payload_too_large', 'Body too large');
  const text = await c.req.text();
  if (text.length > MAX_BODY) throw new ApiError(413, 'payload_too_large', 'Body too large');
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest('Body must be JSON', 'invalid_json');
  }
}

export function publicRoutes(deps: AppDeps) {
  const { prisma, config } = deps;
  const app = new Hono<AppEnv>();

  const findByPublicKey = (key: string | undefined) =>
    key && PUBLIC_KEY_RE.test(key) ? prisma.site.findUnique({ where: { publicKey: key } }) : Promise.resolve(null);

  /**
   * Public-key auth for browser writes: `X-Site-Key` header, or `?key=` (CORS
   * simple requests / sendBeacon cannot set headers). Header wins. The request
   * Origin (or Referer) must be in the site's allow-list.
   */
  async function sitePublicAuth(c: Context<AppEnv>): Promise<Site> {
    const origin = requestOrigin(c);
    const key = c.req.header('x-site-key') || c.req.query('key');
    const site = await findByPublicKey(key);
    if (!site) throw unauthorized('Invalid or missing site key');
    if (!originAllowed(origin, site.origins)) throw forbidden('Origin not allowed for this site', 'origin_not_allowed');
    if (origin) setCors(c, origin);
    return site;
  }

  function rateLimit(c: Context, site: Site): string {
    const ipHash = sha256(site.ipHashSalt + clientIp(c, config.trustProxy));
    const retry = deps.consentLimiter.hit(`${site.id}:${ipHash}`);
    if (retry) {
      c.header('Retry-After', String(retry));
      throw new ApiError(429, 'rate_limited', 'Too many requests');
    }
    return ipHash;
  }

  // CORS preflight. When the key is known (query or path) the allow-list is
  // checked here too; otherwise the actual request enforces it.
  app.options('/v1/*', async (c) => {
    const origin = requestOrigin(c);
    if (!origin) return c.body(null, 204);
    const pathKey = /^\/v1\/sites\/([^/]+)\//.exec(c.req.path)?.[1];
    const key = c.req.query('key') || pathKey;
    if (key) {
      const site = await findByPublicKey(key);
      if (site && !originAllowed(origin, site.origins)) return c.body(null, 403);
    }
    setCors(c, origin);
    c.header('Access-Control-Allow-Methods', CORS_METHODS);
    c.header('Access-Control-Allow-Headers', CORS_HEADERS);
    c.header('Access-Control-Max-Age', '86400');
    return c.body(null, 204);
  });

  app.post('/v1/consents', async (c) => {
    const site = await sitePublicAuth(c);
    const ipHash = rateLimit(c, site);
    const input = parseConsentInput(await readJson(c));
    const ua = c.req.header('user-agent');
    const rec = await prisma.consentRecord.create({
      data: {
        siteId: site.id,
        consentId: input.consentId,
        subjectId: input.subjectId ?? null,
        revision: input.revision,
        method: input.method,
        categories: input.categories,
        services: input.services,
        language: input.language ?? null,
        pageUrl: input.pageUrl ?? null,
        ipHash,
        userAgent: ua ? ua.slice(0, UA_MAX) : null,
        clientTimestamp: new Date(input.clientTimestamp),
      },
      select: { id: true, receivedAt: true },
    });
    return c.json({ id: rec.id, receivedAt: rec.receivedAt.toISOString() }, 201);
  });

  app.post('/v1/consents/:consentId/subject', async (c) => {
    const site = await sitePublicAuth(c);
    rateLimit(c, site);
    const body = await readJson(c);
    const subjectId = isObject(body) ? body.subjectId : undefined;
    if (typeof subjectId !== 'string' || !subjectId || subjectId.length > 256)
      throw badRequest('subjectId: required string (max 256)');
    const consentId = c.req.param('consentId');
    if (consentId.length > 128) throw badRequest('consentId too long');
    await prisma.consentRecord.updateMany({ where: { siteId: site.id, consentId }, data: { subjectId } });
    return c.body(null, 204);
  });

  // ---- config delivery ------------------------------------------------------

  async function published(c: Context): Promise<{ site: Site; version: PolicyVersion } | null> {
    const site = await findByPublicKey(c.req.param('publicKey'));
    if (!site?.publishedRevision) return null;
    const version = await prisma.policyVersion.findUnique({
      where: { siteId_revision: { siteId: site.id, revision: site.publishedRevision } },
    });
    return version ? { site, version } : null;
  }

  const js = (c: Context, body: string, status: 200 | 404 = 200) => {
    c.header('Content-Type', 'application/javascript; charset=utf-8');
    c.header('Cache-Control', status === 200 ? 'public, max-age=60' : 'no-store');
    return c.body(body, status);
  };

  app.get('/v1/sites/:publicKey/config.json', async (c) => {
    const p = await published(c);
    if (!p) throw notFound('No published config for this site');
    const origin = requestOrigin(c);
    if (origin && originAllowed(origin, p.site.origins)) setCors(c, origin);
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(deliveredConfig(p.version, p.site, baseUrl(c, config.publicUrl)));
  });

  app.get('/v1/sites/:publicKey/head.js', async (c) => {
    const p = await published(c);
    if (!p) return js(c, '/* easy-cookie: no published config for this site */', 404);
    return js(c, renderHeadScript(p.version.config as unknown as EasyCookieConfig));
  });

  app.get('/v1/sites/:publicKey/embed.js', async (c) => {
    const p = await published(c);
    if (!p) return js(c, '/* easy-cookie: no published config for this site */', 404);
    const base = baseUrl(c, config.publicUrl);
    const cfg = deliveredConfig(p.version, p.site, base);
    return js(c, renderEmbedScript(cfg, base));
  });

  return app;
}

/**
 * Head script (synchronous Consent Mode defaults) + inline config + loader
 * that injects the runtime CSS/JS from /static and calls EasyCookie.run(config).
 */
export function renderEmbedScript(cfg: EasyCookieConfig, base: string): string {
  return `/* easy-cookie embed, revision ${cfg.revision.replace(/\*\//g, '* /')} */
${renderHeadScript(cfg)}
(function(w,d,cfg,base){
if(w.__easyCookieEmbed)return;w.__easyCookieEmbed=true;w.__easyCookieConfig=cfg;
var h=d.head||d.documentElement;
var l=d.createElement('link');l.rel='stylesheet';l.href=base+'/static/easy-cookie.css';h.appendChild(l);
function start(){try{var p=w.EasyCookie.run(cfg);if(p&&p.catch)p.catch(function(e){console.error('[easy-cookie]',e);});}catch(e){console.error('[easy-cookie]',e);}}
if(w.EasyCookie&&w.EasyCookie.run){start();return;}
var s=d.createElement('script');s.src=base+'/static/easy-cookie.iife.js';s.async=true;s.onload=start;
s.onerror=function(){console.error('[easy-cookie] failed to load '+s.src);};h.appendChild(s);
})(window,document,${jsonForScript(cfg)},${jsonForScript(base)});
`;
}
