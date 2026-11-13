import { beforeEach, describe, expect, it } from 'vitest';
import { importConsents } from '../src/services/import.js';
import { adminClient, createPublishedSite, makeApp, prisma, resetDb } from './helpers.js';

const line = (o: Record<string, unknown>) =>
  JSON.stringify({
    consentId: 'anon-1',
    revision: 'legacy-1.0.0',
    method: 'accept_all',
    categories: { necessary: true, measurement: true },
    clientTimestamp: '2026-04-25T12:41:20.460Z',
    ...o,
  });

describe('importConsents', () => {
  let siteId: string;
  beforeEach(async () => {
    await resetDb();
    const { app } = makeApp();
    siteId = (await createPublishedSite(await adminClient(app))).id;
  });

  it('imports records with their original timestamps and subject', async () => {
    const res = await importConsents(prisma, siteId, [
      line({ subjectId: 'user-1', ipHash: 'abc', userAgent: 'UA' }),
      '',
      line({ consentId: 'anon-2', method: 'reject_all', categories: { necessary: true, measurement: false } }),
    ]);
    expect(res).toMatchObject({ read: 2, imported: 2, skipped: 0, errors: [] });
    const rows = await prisma.consentRecord.findMany({ where: { siteId }, orderBy: { consentId: 'asc' } });
    expect(rows[0]).toMatchObject({ consentId: 'anon-1', subjectId: 'user-1', ipHash: 'abc', revision: 'legacy-1.0.0' });
    expect(rows[0].receivedAt.toISOString()).toBe('2026-04-25T12:41:20.460Z');
    expect(rows[1]).toMatchObject({ method: 'reject_all', subjectId: null });
  });

  it('is idempotent: re-running skips records already imported', async () => {
    await importConsents(prisma, siteId, [line({})]);
    const again = await importConsents(prisma, siteId, [line({})]);
    expect(again).toMatchObject({ imported: 0, skipped: 1 });
    expect(await prisma.consentRecord.count({ where: { siteId } })).toBe(1);
  });

  it('imports nothing when any line is invalid', async () => {
    const res = await importConsents(prisma, siteId, [line({}), line({ method: 'maybe' }), '{oops']);
    expect(res.errors.map((e) => e.line)).toEqual([2, 3]);
    expect(await prisma.consentRecord.count({ where: { siteId } })).toBe(0);
  });

  it('does not write on a dry run', async () => {
    const res = await importConsents(prisma, siteId, [line({})], { dryRun: true });
    expect(res.imported).toBe(1);
    expect(await prisma.consentRecord.count({ where: { siteId } })).toBe(0);
  });
});
