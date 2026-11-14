import { beforeEach, describe, expect, it } from 'vitest';
import { purgeExpiredConsents, retentionCutoff } from '../src/services/retention.js';
import { adminClient, createPublishedSite, makeApp, prisma, resetDb } from './helpers.js';

const NOW = new Date('2026-11-14T03:00:00Z');

async function record(siteId: string, consentId: string, receivedAt: string) {
  await prisma.consentRecord.create({
    data: {
      siteId,
      consentId,
      revision: 'r1',
      method: 'accept_all',
      categories: { necessary: true },
      services: {},
      clientTimestamp: new Date(receivedAt),
      receivedAt: new Date(receivedAt),
    },
  });
}

describe('consent retention', () => {
  let admin: Awaited<ReturnType<typeof adminClient>>;
  let siteId: string;
  beforeEach(async () => {
    await resetDb();
    const { app } = makeApp();
    admin = await adminClient(app);
    siteId = (await createPublishedSite(admin)).id;
  });

  it('counts calendar months back from now', () => {
    expect(retentionCutoff(NOW, 24).toISOString()).toBe('2024-11-14T03:00:00.000Z');
  });

  it('keeps everything while the site has no retention period', async () => {
    await record(siteId, 'old', '2020-01-01T00:00:00Z');
    expect(await purgeExpiredConsents(prisma, { now: NOW })).toEqual([]);
    expect(await prisma.consentRecord.count()).toBe(1);
  });

  it('deletes a visitor only when their latest choice is past the period, with all their history', async () => {
    const res = await admin.patch(`/sites/${siteId}`, { consentRetentionMonths: 24 });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ consentRetentionMonths: 24 });
    // Gone: both choices older than 24 months.
    await record(siteId, 'gone', '2023-01-01T00:00:00Z');
    await record(siteId, 'gone', '2024-06-01T00:00:00Z');
    // Kept: first choice is old, but the visitor chose again recently.
    await record(siteId, 'returning', '2022-01-01T00:00:00Z');
    await record(siteId, 'returning', '2026-03-01T00:00:00Z');
    // Kept: just inside the period.
    await record(siteId, 'recent', '2024-12-01T00:00:00Z');

    const dry = await purgeExpiredConsents(prisma, { now: NOW, dryRun: true });
    expect(dry).toMatchObject([{ siteId, months: 24, visitors: 1, records: 2 }]);
    expect(await prisma.consentRecord.count()).toBe(5);

    const [r] = await purgeExpiredConsents(prisma, { now: NOW });
    expect(r).toMatchObject({ visitors: 1, records: 2 });
    const left = await prisma.consentRecord.findMany({ select: { consentId: true }, orderBy: { receivedAt: 'asc' } });
    expect(left.map((x) => x.consentId)).toEqual(['returning', 'recent', 'returning']);
  });

  it('only touches the site it applies to', async () => {
    const other = (await createPublishedSite(admin)).id;
    await admin.patch(`/sites/${siteId}`, { consentRetentionMonths: 12 });
    await record(siteId, 'a', '2020-01-01T00:00:00Z');
    await record(other, 'b', '2020-01-01T00:00:00Z');
    await purgeExpiredConsents(prisma, { now: NOW });
    expect(await prisma.consentRecord.count({ where: { siteId } })).toBe(0);
    expect(await prisma.consentRecord.count({ where: { siteId: other } })).toBe(1);
  });

  it('validates the setting and can switch it off', async () => {
    for (const bad of [0, 1.5, 241, '24'])
      expect((await admin.patch(`/sites/${siteId}`, { consentRetentionMonths: bad })).status).toBe(400);
    await admin.patch(`/sites/${siteId}`, { consentRetentionMonths: 6 });
    const off = await admin.patch(`/sites/${siteId}`, { consentRetentionMonths: null });
    expect(await off.json()).toMatchObject({ consentRetentionMonths: null });
  });
});
