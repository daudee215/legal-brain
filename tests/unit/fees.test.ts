import { describe, expect, it } from 'vitest';
import { feeSummary, getFeeLedger, hearingLoad, recentActivity } from '../../src/lib/repo';
import { seed } from '../../src/data/seed';
import type { Case, Db } from '../../src/types';

function mkCase(p: Partial<Case> & { id: string }): Case {
  return {
    chamberId: 'ch1',
    caseNo: `W.P. ${p.id}/2026`,
    title: `Case ${p.id}`,
    category: 'Civil',
    courtId: 'lhc',
    judge: 'Hon. Judge',
    stage: 'Arguments',
    status: 'pending',
    filedOn: '2026-01-01',
    clientId: 'c1',
    assignedTo: ['m1'],
    hearings: [],
    ...p,
  };
}

const db: Db = {
  ...seed,
  cases: [
    mkCase({ id: 'a', nextHearing: '2026-11-25T09:00:00+05:00', hearings: [{ date: '2026-11-10T09:00:00+05:00', proceedings: 'Adjourned.', nextDate: '2026-11-25T09:00:00+05:00' }] }),
    mkCase({ id: 'b', nextHearing: '2026-11-25T11:00:00+05:00' }),
    mkCase({ id: 'c' }),
  ],
  fees: [
    { caseId: 'a', agreed: 100000, payments: [{ date: '2026-10-01', amount: 40000, mode: 'Cash' }, { date: '2026-11-01', amount: 10000, mode: 'Bank transfer' }] },
    { caseId: 'b', agreed: 50000, payments: [{ date: '2026-11-02', amount: 50000, mode: 'Cheque' }] },
  ],
  diary: [{ id: 'd1', date: '2026-11-20T18:00:00+05:00', caseId: 'a', authorId: 'm1', text: 'Prepare written arguments.' }],
  docs: [],
};

describe('fees', () => {
  it('getFeeLedger totals received and outstanding', async () => {
    const l = await getFeeLedger('a', db);
    expect(l?.received).toBe(50000);
    expect(l?.outstanding).toBe(50000);
  });
  it('getFeeLedger is undefined for a case with no fee agreed', async () => {
    expect(await getFeeLedger('c', db)).toBeUndefined();
  });
  it('feeSummary adds up and sorts rows by outstanding, largest first', async () => {
    const s = await feeSummary(db);
    expect(s.agreed).toBe(150000);
    expect(s.received).toBe(100000);
    expect(s.outstanding).toBe(50000);
    expect(s.rows.map((r) => r.case.id)).toEqual(['a', 'b']);
  });
  it('feeSummary on no fees is all zero', async () => {
    const s = await feeSummary({ ...db, fees: [] });
    expect(s).toMatchObject({ agreed: 0, received: 0, outstanding: 0, rows: [] });
  });
  it('outstanding never goes negative when overpaid', async () => {
    const l = await getFeeLedger('x', { ...db, cases: [mkCase({ id: 'x' })], fees: [{ caseId: 'x', agreed: 100, payments: [{ date: '2026-11-01', amount: 150, mode: 'Cash' }] }] });
    expect(l?.outstanding).toBe(0);
  });
});

describe('hearingLoad', () => {
  it('returns one bucket per day and counts each case once per day', async () => {
    const load = await hearingLoad('2026-11-09', 20, db);
    expect(load).toHaveLength(20);
    expect(load[0].date).toBe('2026-11-09');
    expect(load.find((x) => x.date === '2026-11-10')?.count).toBe(1);
    // case a: nextHearing and hearing.nextDate are the same day → counted once; plus case b
    expect(load.find((x) => x.date === '2026-11-25')?.count).toBe(2);
  });
});

describe('recentActivity', () => {
  it('lists past events newest first and skips the future', async () => {
    const items = await recentActivity('2026-11-23', 10, db);
    expect(items.map((i) => i.kind)).toEqual(['diary', 'hearing', 'payment', 'payment', 'payment']);
    expect(items.every((i) => i.date.slice(0, 10) <= '2026-11-23')).toBe(true);
  });
  it('respects the limit', async () => {
    expect(await recentActivity('2026-11-23', 2, db)).toHaveLength(2);
  });
});
