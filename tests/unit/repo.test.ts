import { describe, expect, it } from 'vitest';
import { caseStats, hearingsOn, listCases, upcomingHearings, unreadCount } from '../../src/lib/repo';
import type { Case, Db } from '../../src/types';

function mkCase(p: Partial<Case> & { id: string }): Case {
  return {
    chamberId: 'ch1',
    caseNo: `W.P. ${p.id}/2026`,
    title: `Case ${p.id}`,
    category: 'Civil',
    courtId: 'lhc',
    judge: 'Mr. Justice X',
    stage: 'Arguments',
    status: 'pending',
    filedOn: '2026-01-01',
    clientId: 'c1',
    assignedTo: ['m1'],
    hearings: [],
    ...p,
  };
}

const empty: Db = {
  chamber: { id: 'ch1', name: 'Test', members: [] },
  me: { id: 'm1', name: 'A', email: 'a@x.pk', role: 'senior' },
  courts: [
    { id: 'lhc', name: 'Lahore High Court', shortName: 'LHC', level: 'HC', city: 'Lahore', statusUrl: 'https://lhc.gov.pk' },
    { id: 'sc', name: 'Supreme Court of Pakistan', shortName: 'SC', level: 'SC', city: 'Islamabad', statusUrl: 'https://supremecourt.gov.pk' },
  ],
  clients: [],
  cases: [],
  causeList: [],
  statutes: [],
  judgments: [],
  templates: [],
  diary: [],
  news: [],
  notifications: [],
  books: [],
  docs: [],
  fees: [],
  tasks: [],
  deadlines: [],
  precedents: [],
  expenses: [],
};

const db: Db = {
  ...empty,
  cases: [
    mkCase({ id: '1', title: 'Ahmed v. State', category: 'Criminal', courtId: 'lhc', nextHearing: '2026-11-23T09:00:00+05:00' }),
    mkCase({ id: '2', title: 'Bano v. Bano', category: 'Family', courtId: 'sc', nextHearing: '2026-11-23T10:00:00+05:00' }),
    mkCase({ id: '3', title: 'Khan v. WAPDA', category: 'Civil', nextHearing: '2026-11-25T09:00:00+05:00', status: 'adjourned' }),
    mkCase({ id: '4', title: 'Old matter', status: 'decided' }),
  ],
  causeList: [
    { date: '2026-11-23', courtId: 'sc', bench: 'Bench-I', courtRoom: '1', srNo: 4, caseId: '2' },
    { date: '2026-11-23', courtId: 'lhc', bench: 'DB-II', courtRoom: '7', srNo: 12, caseId: '1' },
  ],
  notifications: [
    { id: 'n1', date: '2026-11-23', kind: 'hearing', title: 'x', read: false },
    { id: 'n2', date: '2026-11-23', kind: 'news', title: 'y', read: true },
  ],
};

describe('repo', () => {
  it('hearingsOn returns only that day, sorted by court name then srNo', async () => {
    const rows = await hearingsOn('2026-11-23', db);
    expect(rows.map((r) => r.case.id)).toEqual(['1', '2']);
    expect(rows[0].court.shortName).toBe('LHC');
    expect(rows[0].entry?.srNo).toBe(12);
  });
  it('hearingsOn returns [] for an empty db', async () => {
    expect(await hearingsOn('2026-11-23', empty)).toEqual([]);
  });
  it('caseStats totals add up', async () => {
    const s = await caseStats(db);
    expect(s.total).toBe(4);
    expect(Object.values(s.byStatus).reduce((a, b) => a + b, 0)).toBe(4);
    expect(s.byStatus.decided).toBe(1);
    expect(s.byCategory.Family).toBe(1);
    expect(s.byCourt.lhc).toBe(3);
  });
  it('caseStats on empty db is zero', async () => {
    const s = await caseStats(empty);
    expect(s.total).toBe(0);
    expect(s.byStatus.pending).toBe(0);
  });
  it('listCases filters by category', async () => {
    const r = await listCases({ category: 'Family' }, db);
    expect(r.map((c) => c.id)).toEqual(['2']);
  });
  it('listCases text search is case-insensitive', async () => {
    const r = await listCases({ q: 'AHMED' }, db);
    expect(r.map((c) => c.id)).toEqual(['1']);
  });
  it('upcomingHearings returns cases within range ascending', async () => {
    const r = await upcomingHearings('2026-11-24', 7, db);
    expect(r.map((c) => c.id)).toEqual(['3']);
  });
  it('unreadCount counts unread notifications', async () => {
    expect(await unreadCount(db)).toBe(1);
  });
});
