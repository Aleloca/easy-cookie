import type { PrismaClient } from '@prisma/client';

const METHODS = new Set(['accept_all', 'reject_all', 'custom', 'close', 'withdraw']);
const REVISION = /^[A-Za-z0-9._-]{1,64}$/;

/** One historical record, as written in an import file (one JSON object per line). */
export interface ImportRecord {
  consentId: string;
  subjectId?: string | null;
  revision: string;
  method: string;
  categories: Record<string, boolean>;
  services?: Record<string, string[]>;
  language?: string | null;
  pageUrl?: string | null;
  /** Kept as-is: hashes from another system are not comparable with this server's. */
  ipHash?: string | null;
  userAgent?: string | null;
  /** When the visitor chose (ISO). */
  clientTimestamp: string;
  /** When the original system stored it (ISO). Defaults to clientTimestamp. */
  receivedAt?: string;
}

export interface ImportResult {
  read: number;
  imported: number;
  skipped: number;
  errors: { line: number; message: string }[];
}

function check(r: unknown): string | null {
  if (!r || typeof r !== 'object') return 'not an object';
  const x = r as Record<string, unknown>;
  if (typeof x.consentId !== 'string' || !x.consentId) return 'consentId is required';
  if (typeof x.revision !== 'string' || !REVISION.test(x.revision)) return 'revision must match [A-Za-z0-9._-]{1,64}';
  if (typeof x.method !== 'string' || !METHODS.has(x.method)) return `method must be one of ${[...METHODS].join(', ')}`;
  if (!x.categories || typeof x.categories !== 'object' || Object.values(x.categories).some((v) => typeof v !== 'boolean'))
    return 'categories must be an object of booleans';
  if (typeof x.clientTimestamp !== 'string' || Number.isNaN(Date.parse(x.clientTimestamp))) return 'clientTimestamp must be an ISO date';
  if (x.receivedAt !== undefined && (typeof x.receivedAt !== 'string' || Number.isNaN(Date.parse(x.receivedAt))))
    return 'receivedAt must be an ISO date';
  return null;
}

/**
 * Import historical consent records into a site's register (e.g. from a previous
 * home-made consent log). Records keep their original timestamps. Re-running the
 * same file is safe: a record with the same consentId, clientTimestamp and method
 * already in the register is skipped.
 */
export async function importConsents(
  prisma: PrismaClient,
  siteId: string,
  lines: string[],
  opts: { dryRun?: boolean } = {},
): Promise<ImportResult> {
  const result: ImportResult = { read: 0, imported: 0, skipped: 0, errors: [] };
  const valid: { line: number; r: ImportRecord }[] = [];
  lines.forEach((raw, i) => {
    if (!raw.trim()) return;
    result.read++;
    try {
      const r = JSON.parse(raw);
      const err = check(r);
      if (err) result.errors.push({ line: i + 1, message: err });
      else valid.push({ line: i + 1, r });
    } catch {
      result.errors.push({ line: i + 1, message: 'invalid JSON' });
    }
  });
  if (result.errors.length) return result;

  for (const { r } of valid) {
    const clientTimestamp = new Date(r.clientTimestamp);
    const exists = await prisma.consentRecord.findFirst({
      where: { siteId, consentId: r.consentId, clientTimestamp, method: r.method },
      select: { id: true },
    });
    if (exists) {
      result.skipped++;
      continue;
    }
    if (!opts.dryRun)
      await prisma.consentRecord.create({
        data: {
          siteId,
          consentId: r.consentId,
          subjectId: r.subjectId ?? null,
          revision: r.revision,
          method: r.method,
          categories: r.categories,
          services: r.services ?? {},
          language: r.language ?? null,
          pageUrl: r.pageUrl ?? null,
          ipHash: r.ipHash ?? null,
          userAgent: r.userAgent ? r.userAgent.slice(0, 512) : null,
          clientTimestamp,
          receivedAt: new Date(r.receivedAt ?? r.clientTimestamp),
        },
      });
    result.imported++;
  }
  return result;
}
