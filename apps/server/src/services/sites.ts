import { validateConfig, type EasyCookieConfig } from '@easy-cookie/core/shared';
import { Prisma, type PolicyVersion, type PrismaClient, type Site } from '@prisma/client';
import { newPublicKey, newSecretKey, randomToken, sha256 } from '../lib/crypto.js';
import { ApiError, badRequest } from '../lib/errors.js';
import { normalizeOrigin, originEntryError } from '../lib/http.js';
import { starterConfig } from '../lib/starter.js';
import { isObject, isoDate, stableStringify } from '../lib/util.js';

export function serializeSite(site: Site, total30d = 0) {
  return {
    id: site.id,
    name: site.name,
    domain: site.domain,
    publicKey: site.publicKey,
    origins: site.origins,
    publishedRevision: site.publishedRevision,
    createdAt: site.createdAt.toISOString(),
    stats30d: { total: total30d },
  };
}

/** Records received in the last 30 days, per site id. */
export async function totals30d(prisma: PrismaClient, siteIds: string[]): Promise<Map<string, number>> {
  if (!siteIds.length) return new Map();
  const rows = await prisma.consentRecord.groupBy({
    by: ['siteId'],
    where: { siteId: { in: siteIds }, receivedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.siteId, r._count._all]));
}

export interface SiteInput {
  name?: unknown;
  domain?: unknown;
  origins?: unknown;
}

/** Validate site fields. `partial` allows missing fields (PATCH). */
export function parseSiteInput(body: SiteInput, partial: boolean): { name?: string; domain?: string; origins?: string[] } {
  const out: { name?: string; domain?: string; origins?: string[] } = {};
  if (body.name !== undefined || !partial) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200)
      throw badRequest('name: required string (max 200)', 'invalid_site');
    out.name = body.name.trim();
  }
  if (body.domain !== undefined || !partial) {
    if (typeof body.domain !== 'string' || !body.domain.trim() || body.domain.length > 253)
      throw badRequest('domain: required string', 'invalid_site');
    out.domain = body.domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
  }
  if (body.origins !== undefined || !partial) {
    const list = body.origins ?? [];
    if (!Array.isArray(list) || list.length > 100) throw badRequest('origins: array of origins', 'invalid_site');
    for (const [i, o] of list.entries()) {
      const err = originEntryError(o);
      if (err) throw badRequest(`origins.${i}: ${err}`, 'invalid_site');
    }
    out.origins = [...new Set(list.map((o: string) => normalizeOrigin(o)))];
  }
  return out;
}

/** Create a site with fresh keys and the starter draft. Returns the one-time secret key. */
export async function createSite(
  prisma: PrismaClient,
  input: { name: string; domain: string; origins: string[] },
): Promise<{ site: Site; secretKey: string }> {
  const secretKey = newSecretKey();
  const site = await prisma.site.create({
    data: {
      name: input.name,
      domain: input.domain,
      origins: input.origins,
      publicKey: newPublicKey(),
      secretKeyHash: sha256(secretKey),
      ipHashSalt: randomToken(32),
      draftConfig: starterConfig() as unknown as Prisma.InputJsonValue,
    },
  });
  return { site, secretKey };
}

export async function rotateSecret(prisma: PrismaClient, siteId: string): Promise<string> {
  const secretKey = newSecretKey();
  await prisma.site.update({ where: { id: siteId }, data: { secretKeyHash: sha256(secretKey) } });
  return secretKey;
}

export const REVISION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function serializeRevision(v: PolicyVersion) {
  return { revision: v.revision, note: v.note, publishedAt: v.publishedAt.toISOString(), config: v.config };
}

/** Next free default revision for today: `YYYY-MM-DD`, then `-2`, `-3`… */
export async function defaultRevision(prisma: PrismaClient, siteId: string, now = new Date()): Promise<string> {
  const base = isoDate(now);
  const taken = new Set(
    (
      await prisma.policyVersion.findMany({
        where: { siteId, revision: { startsWith: base } },
        select: { revision: true },
      })
    ).map((v) => v.revision),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/**
 * Snapshot `config` as an immutable PolicyVersion and make it the published one.
 * The revision is written into the snapshot. The `log` endpoint/key are
 * overwritten with this server's when the config is delivered.
 */
export async function publishRevision(
  prisma: PrismaClient,
  site: Site,
  config: unknown,
  opts: { revision?: string; note?: string | null; publishedBy?: string | null },
): Promise<PolicyVersion> {
  const issues = validateConfig(config);
  if (issues.length) throw new ApiError(422, 'invalid_config', 'The config has validation issues', issues);
  if (opts.revision !== undefined && !REVISION_RE.test(opts.revision))
    throw badRequest('revision: 1-64 characters, letters, digits, ".", "_" or "-"', 'invalid_revision');
  if (opts.note !== undefined && opts.note !== null && (typeof opts.note !== 'string' || opts.note.length > 2000))
    throw badRequest('note: string (max 2000)');

  for (let attempt = 0; attempt < 5; attempt++) {
    const revision = opts.revision ?? (await defaultRevision(prisma, site.id));
    const snapshot = { ...(config as EasyCookieConfig), revision };
    try {
      return await prisma.$transaction(async (tx) => {
        const v = await tx.policyVersion.create({
          data: {
            siteId: site.id,
            revision,
            note: opts.note ?? null,
            config: snapshot as unknown as Prisma.InputJsonValue,
            publishedBy: opts.publishedBy ?? null,
          },
        });
        await tx.site.update({ where: { id: site.id }, data: { publishedRevision: revision } });
        return v;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        if (opts.revision !== undefined)
          throw new ApiError(409, 'revision_exists', `Revision "${revision}" is already published`);
        continue; // concurrent default revision: pick the next suffix
      }
      throw e;
    }
  }
  throw new ApiError(409, 'revision_exists', 'Could not allocate a revision id');
}

/** The published config as delivered to browsers, with this server's `log` block. */
export function deliveredConfig(version: PolicyVersion, site: Site, base: string): EasyCookieConfig {
  const cfg = version.config as unknown as EasyCookieConfig;
  const requireLog = isObject(cfg.log) ? cfg.log.requireLog : undefined;
  return {
    ...cfg,
    log: { endpoint: base, siteKey: site.publicKey, ...(requireLog !== undefined ? { requireLog } : {}) },
  };
}

/** True when two configs are the same JSON (ignoring key order). */
export const sameConfig = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);
