import type { PrismaClient, Site } from '@prisma/client';
import { isoDate } from '../lib/util.js';
import { METHODS } from './consents.js';

type MethodCounts = Record<(typeof METHODS)[number], number>;
const zeroMethods = (): MethodCounts => ({ accept_all: 0, reject_all: 0, custom: 0, close: 0, withdraw: 0 });

/**
 * Dashboard stats over the last `days` UTC days (today included).
 * `byDay` has one entry per day, zero-filled, oldest first.
 */
export async function siteStats(prisma: PrismaClient, site: Site, days: number, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const since = new Date(today.getTime() - (days - 1) * 86_400_000);

  const dayRows = await prisma.$queryRaw<{ day: Date; method: string; n: bigint }[]>`
    SELECT date_trunc('day', "receivedAt") AS day, method, count(*) AS n
    FROM "ConsentRecord"
    WHERE "siteId" = ${site.id} AND "receivedAt" >= ${since}
    GROUP BY 1, 2`;

  const catRows = await prisma.$queryRaw<{ key: string; n: bigint }[]>`
    SELECT c.key, count(*) AS n
    FROM "ConsentRecord" r, jsonb_each(r.categories) AS c
    WHERE r."siteId" = ${site.id} AND r."receivedAt" >= ${since} AND c.value = 'true'::jsonb
    GROUP BY 1`;

  const byDayMap = new Map<string, { date: string; total: number } & MethodCounts>();
  for (let i = 0; i < days; i++) {
    const date = isoDate(new Date(since.getTime() + i * 86_400_000));
    byDayMap.set(date, { date, total: 0, ...zeroMethods() });
  }
  const byMethod = zeroMethods();
  let total = 0;
  for (const row of dayRows) {
    const n = Number(row.n);
    const date = isoDate(new Date(row.day));
    total += n;
    const entry = byDayMap.get(date);
    if (entry) entry.total += n;
    if (row.method in byMethod) {
      byMethod[row.method as keyof MethodCounts] += n;
      if (entry) entry[row.method as keyof MethodCounts] += n;
    }
  }

  const byCategory: Record<string, number> = {};
  for (const row of catRows) byCategory[row.key] = Number(row.n);

  let currentRevision: { revision: string; publishedAt: string; recordsSince: number } | null = null;
  if (site.publishedRevision) {
    const v = await prisma.policyVersion.findUnique({
      where: { siteId_revision: { siteId: site.id, revision: site.publishedRevision } },
    });
    if (v) {
      const recordsSince = await prisma.consentRecord.count({
        where: { siteId: site.id, receivedAt: { gte: v.publishedAt } },
      });
      currentRevision = { revision: v.revision, publishedAt: v.publishedAt.toISOString(), recordsSince };
    }
  }

  return { total, byMethod, byDay: [...byDayMap.values()], byCategory, currentRevision };
}
