import type { PrismaClient } from '@prisma/client';

export interface PurgeResult {
  siteId: string;
  name: string;
  months: number;
  cutoff: string;
  /** Visitors (consent ids) whose whole history was removed. */
  visitors: number;
  records: number;
}

/** `now` minus `months` calendar months (UTC). */
export function retentionCutoff(now: Date, months: number): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

/**
 * Apply each site's `consentRetentionMonths`. A visitor's records (same consent id) are
 * deleted together, once their latest choice is older than the period, so the proof of a
 * visitor who keeps coming back stays complete. Counting uses `receivedAt` (server time;
 * imported records keep their original date). Sites without a period are skipped.
 */
export async function purgeExpiredConsents(
  prisma: PrismaClient,
  opts: { now?: Date; dryRun?: boolean; siteId?: string } = {},
): Promise<PurgeResult[]> {
  const now = opts.now ?? new Date();
  const sites = await prisma.site.findMany({
    where: { consentRetentionMonths: { not: null }, ...(opts.siteId ? { id: opts.siteId } : {}) },
    select: { id: true, name: true, consentRetentionMonths: true },
    orderBy: { createdAt: 'asc' },
  });
  const out: PurgeResult[] = [];
  for (const site of sites) {
    const months = site.consentRetentionMonths!;
    const cutoff = retentionCutoff(now, months);
    const [{ visitors, records }] = await prisma.$queryRaw<{ visitors: bigint; records: bigint }[]>`
      SELECT count(DISTINCT r."consentId") AS visitors, count(*) AS records
      FROM "ConsentRecord" r
      WHERE r."siteId" = ${site.id} AND r."consentId" IN (
        SELECT "consentId" FROM "ConsentRecord" WHERE "siteId" = ${site.id}
        GROUP BY "consentId" HAVING max("receivedAt") < ${cutoff})`;
    let deleted = Number(records);
    if (!opts.dryRun && deleted > 0) {
      deleted = await prisma.$executeRaw`
        DELETE FROM "ConsentRecord"
        WHERE "siteId" = ${site.id} AND "consentId" IN (
          SELECT "consentId" FROM "ConsentRecord" WHERE "siteId" = ${site.id}
          GROUP BY "consentId" HAVING max("receivedAt") < ${cutoff})`;
    }
    out.push({ siteId: site.id, name: site.name, months, cutoff: cutoff.toISOString(), visitors: Number(visitors), records: deleted });
  }
  return out;
}

const DAY = 86_400_000;

/**
 * Run the purge shortly after start-up and then once a day. Errors are logged, never thrown,
 * and the timers do not keep the process alive.
 */
export function scheduleRetention(prisma: PrismaClient, log: (msg: string) => void = console.log): () => void {
  const run = async () => {
    try {
      for (const r of await purgeExpiredConsents(prisma))
        if (r.records) log(`[easy-cookie] retention: deleted ${r.records} records of ${r.visitors} visitors from ${r.name} (older than ${r.months} months)`);
    } catch (e) {
      log(`[easy-cookie] retention failed: ${(e as Error).message}`);
    }
  };
  const first = setTimeout(run, 60_000);
  const daily = setInterval(run, DAY);
  first.unref();
  daily.unref();
  return () => {
    clearTimeout(first);
    clearInterval(daily);
  };
}
