import type { ConsentMethod, ConsentRecordInput } from '@easy-cookie/core/shared';
import type { ConsentRecord, Prisma, PrismaClient } from '@prisma/client';
import { badRequest } from '../lib/errors.js';
import { isObject } from '../lib/util.js';

export const METHODS: ConsentMethod[] = ['accept_all', 'reject_all', 'custom', 'close', 'withdraw'];
export const UA_MAX = 512;

const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;

/** Validate a `ConsentRecordInput` from the browser. Throws 400 with a readable message. */
export function parseConsentInput(body: unknown): ConsentRecordInput {
  if (!isObject(body)) throw badRequest('Body must be a JSON object', 'invalid_record');
  const b = body;
  const fail = (m: string) => {
    throw badRequest(m, 'invalid_record');
  };
  if (!str(b.consentId, 128)) fail('consentId: required string (max 128)');
  if (!str(b.revision, 128)) fail('revision: required string (max 128)');
  if (!METHODS.includes(b.method as ConsentMethod)) fail(`method: one of ${METHODS.join(', ')}`);
  if (!isObject(b.categories) || Object.values(b.categories).some((v) => typeof v !== 'boolean'))
    fail('categories: object of category id → boolean');
  if (Object.keys(b.categories as object).length > 100) fail('categories: too many entries');
  const services = b.services ?? {};
  if (
    !isObject(services) ||
    Object.values(services).some((v) => !Array.isArray(v) || v.some((s) => typeof s !== 'string' || s.length > 128))
  )
    fail('services: object of category id → service id[]');
  if (JSON.stringify(services).length > 8192) fail('services: too large');
  if (b.language !== undefined && b.language !== null && !str(b.language, 35)) fail('language: string (max 35)');
  if (b.pageUrl !== undefined && b.pageUrl !== null && !str(b.pageUrl, 2048)) fail('pageUrl: string (max 2048)');
  if (b.subjectId !== undefined && b.subjectId !== null && !str(b.subjectId, 256)) fail('subjectId: string (max 256)');
  if (typeof b.clientTimestamp !== 'string' || Number.isNaN(Date.parse(b.clientTimestamp)))
    fail('clientTimestamp: required ISO 8601 timestamp');
  return {
    consentId: b.consentId as string,
    revision: b.revision as string,
    method: b.method as ConsentMethod,
    categories: b.categories as Record<string, boolean>,
    services: services as Record<string, string[]>,
    language: (b.language as string | undefined) ?? undefined,
    pageUrl: (b.pageUrl as string | undefined) ?? undefined,
    subjectId: (b.subjectId as string | undefined) ?? undefined,
    clientTimestamp: b.clientTimestamp as string,
  };
}

export function serializeRecord(r: ConsentRecord) {
  return {
    id: r.id,
    consentId: r.consentId,
    subjectId: r.subjectId,
    revision: r.revision,
    method: r.method,
    categories: r.categories,
    services: r.services,
    language: r.language,
    pageUrl: r.pageUrl,
    ipHash: r.ipHash,
    userAgent: r.userAgent,
    clientTimestamp: r.clientTimestamp.toISOString(),
    receivedAt: r.receivedAt.toISOString(),
  };
}

export interface ConsentFilters {
  consentId?: string;
  subjectId?: string;
  from?: Date;
  to?: Date;
  method?: string;
  revision?: string;
  /** Prefix of consentId or subjectId. */
  q?: string;
}

/** Parse `from`/`to`. A date-only `to` (YYYY-MM-DD) includes that whole UTC day. */
export function parseDateParam(value: string | undefined, name: string, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw badRequest(`${name}: invalid date`);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(d.getTime() + 86_400_000 - 1);
  return d;
}

export function filtersFromQuery(q: Record<string, string | undefined>): ConsentFilters {
  return {
    consentId: q.consentId || undefined,
    subjectId: q.subjectId || undefined,
    from: parseDateParam(q.from, 'from'),
    to: parseDateParam(q.to, 'to', true),
    method: q.method || undefined,
    revision: q.revision || undefined,
    q: q.q?.trim() || undefined,
  };
}

export function buildWhere(siteId: string, f: ConsentFilters): Prisma.ConsentRecordWhereInput {
  const where: Prisma.ConsentRecordWhereInput = { siteId };
  const and: Prisma.ConsentRecordWhereInput[] = [];
  if (f.consentId) where.consentId = f.consentId;
  if (f.subjectId) where.subjectId = f.subjectId;
  if (f.method) where.method = f.method;
  if (f.revision) where.revision = f.revision;
  if (f.from || f.to) where.receivedAt = { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) };
  if (f.q) and.push({ OR: [{ consentId: { startsWith: f.q } }, { subjectId: { startsWith: f.q } }] });
  if (and.length) where.AND = and;
  return where;
}

// Cursor = base64url("<receivedAt ISO>|<id>"), ordering (receivedAt desc, id desc).
export function encodeCursor(r: { receivedAt: Date; id: string }): string {
  return Buffer.from(`${r.receivedAt.toISOString()}|${r.id}`).toString('base64url');
}

function decodeCursor(cursor: string): { receivedAt: Date; id: string } {
  const raw = Buffer.from(cursor, 'base64url').toString();
  const i = raw.indexOf('|');
  const receivedAt = new Date(raw.slice(0, i));
  if (i < 0 || Number.isNaN(receivedAt.getTime())) throw badRequest('Invalid cursor');
  return { receivedAt, id: raw.slice(i + 1) };
}

export function parseLimit(value: string | undefined, def = 50, max = 500): number {
  if (!value) return def;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw badRequest('limit: positive integer');
  return Math.min(n, max);
}

/** One page, newest first. */
export async function listConsents(
  prisma: PrismaClient,
  siteId: string,
  filters: ConsentFilters,
  limit: number,
  cursor?: string,
): Promise<{ items: ConsentRecord[]; nextCursor: string | null }> {
  const where = buildWhere(siteId, filters);
  if (cursor) {
    const c = decodeCursor(cursor);
    where.AND = [
      ...((where.AND as Prisma.ConsentRecordWhereInput[]) ?? []),
      { OR: [{ receivedAt: { lt: c.receivedAt } }, { receivedAt: c.receivedAt, id: { lt: c.id } }] },
    ];
  }
  const rows = await prisma.consentRecord.findMany({
    where,
    orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });
  const items = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? encodeCursor(items[items.length - 1]) : null;
  return { items, nextCursor };
}

/** Every matching record, newest first, fetched in batches (for CSV / CLI export). */
export async function* iterateConsents(
  prisma: PrismaClient,
  siteId: string,
  filters: ConsentFilters,
  batch = 1000,
): AsyncGenerator<ConsentRecord> {
  let cursor: string | undefined;
  for (;;) {
    const page = await listConsents(prisma, siteId, filters, batch, cursor);
    for (const r of page.items) yield r;
    if (!page.nextCursor) return;
    cursor = page.nextCursor;
  }
}

// ---- CSV -------------------------------------------------------------------

export const CSV_COLUMNS = [
  'id',
  'receivedAt',
  'clientTimestamp',
  'consentId',
  'subjectId',
  'revision',
  'method',
  'grantedCategories',
  'categories',
  'services',
  'language',
  'pageUrl',
  'ipHash',
  'userAgent',
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = typeof value === 'string' ? value : JSON.stringify(value);
  // Neutralise spreadsheet formula injection (values come from browsers).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const csvHeader = () => `${CSV_COLUMNS.join(',')}\r\n`;

export function csvRow(r: ConsentRecord): string {
  const cats = (r.categories ?? {}) as Record<string, boolean>;
  const granted = Object.entries(cats)
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .join(' ');
  const values: Record<(typeof CSV_COLUMNS)[number], unknown> = {
    id: r.id,
    receivedAt: r.receivedAt.toISOString(),
    clientTimestamp: r.clientTimestamp.toISOString(),
    consentId: r.consentId,
    subjectId: r.subjectId,
    revision: r.revision,
    method: r.method,
    grantedCategories: granted,
    categories: r.categories,
    services: r.services,
    language: r.language,
    pageUrl: r.pageUrl,
    ipHash: r.ipHash,
    userAgent: r.userAgent,
  };
  return `${CSV_COLUMNS.map((c) => csvCell(values[c])).join(',')}\r\n`;
}
