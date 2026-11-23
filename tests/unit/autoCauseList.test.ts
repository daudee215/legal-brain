import { beforeEach, describe, expect, it } from 'vitest';
import { analyse, download, relevantCourts, wantedFiles, type DayFile, type IndexFile } from '../../src/lib/autoCauseList';
import { matchEntries, saveCauseListHits } from '../../src/lib/causeList';
import { addCase } from '../../src/lib/mutations';
import { getDb, resetToDemo, startFresh } from '../../src/lib/store';
import type { Case } from '../../src/types';

const TODAY = '2026-11-23';
const TOMORROW = '2026-11-24';

const mk = (id: string, caseNo: string, title: string, courtId: string, nextHearing?: string, status: Case['status'] = 'pending'): Case => ({
  id,
  chamberId: 'ch',
  caseNo,
  title,
  category: 'Civil',
  courtId,
  judge: '',
  stage: '',
  status,
  filedOn: '2026-01-01',
  nextHearing,
  clientId: '',
  assignedTo: [],
  hearings: [],
});

const ihcTomorrow: DayFile = {
  court: 'ihc',
  date: TOMORROW,
  fetchedAt: '2026-11-23T13:31:00Z',
  entries: [
    { bench: 'Bench A', courtRoom: '3', srNo: 12, caseNo: 'W.P. 5490/2026', title: 'Zahid Traders v. CIR', stage: 'NOTICE CASES' },
    { bench: 'Bench B', courtRoom: '7', srNo: 4, caseNo: 'I.C.A. 88/2026', title: 'Nadia Hussain v. NADRA' },
    { courtRoom: '2', srNo: 9, caseNo: 'W.P. 9999/2026', title: 'Sana Iqbal v. Capital Development Authority' },
  ],
};

describe('analyse', () => {
  const cases = [
    mk('same', 'WP No. 5490 of 2026', 'Zahid Traders v. Federation', 'ihc', '2026-11-24T09:00:00+05:00'),
    mk('other', 'ICA 88/2026', 'Nadia Hussain v. NADRA', 'ihc', '2026-12-03T09:00:00+05:00'),
    mk('weak', 'W.P. 2210/2026', 'Sana Iqbal v. Capital Development Authority', 'ihc', '2026-12-10T09:00:00+05:00'),
    mk('elsewhere', 'W.P. 5490/2026', 'Someone v. Other', 'lhc', '2026-11-24T09:00:00+05:00'),
    mk('closed', 'W.P. 5490/2026', 'Zahid Traders v. Federation', 'ihc', undefined, 'disposed'),
  ];

  it('sorts hits into same-day (to save), other-day and possible; only the case court counts', () => {
    const a = analyse([ihcTomorrow], cases, [], TODAY);
    expect(a.toSave).toEqual([{ date: TOMORROW, hits: [expect.objectContaining({ caseId: 'same', courtRoom: '3', srNo: 12, bench: 'Bench A', kind: 'matched' })] }]);
    expect(a.otherDay).toEqual([expect.objectContaining({ caseId: 'other', date: TOMORROW, diaryDay: '2026-12-03' })]);
    expect(a.possible).toEqual([expect.objectContaining({ caseId: 'weak', date: TOMORROW })]);
    expect([...a.sameDay, ...a.otherDay, ...a.possible].map((f) => f.caseId)).not.toContain('elsewhere');
    expect([...a.sameDay, ...a.otherDay, ...a.possible].map((f) => f.caseId)).not.toContain('closed');
  });

  it('does not ask to save again once the entry is stored, and hides dismissed findings', () => {
    const saved = [{ date: TOMORROW, courtId: 'ihc', bench: 'Bench A', courtRoom: '3', srNo: 12, caseId: 'same' }];
    const a = analyse([ihcTomorrow], cases, saved, TODAY, new Set([`other|${TOMORROW}`, `weak|${TOMORROW}`]));
    expect(a.toSave).toEqual([]);
    expect(a.sameDay).toHaveLength(1);
    expect(a.otherDay).toEqual([]);
    expect(a.possible).toEqual([]);
  });

  it('flags a case with no next date in the diary', () => {
    const a = analyse([ihcTomorrow], [mk('nodate', 'I.C.A. 88/2026', 'Nadia Hussain v. NADRA', 'ihc')], [], TODAY);
    expect(a.otherDay[0]).toMatchObject({ caseId: 'nodate', diaryDay: undefined });
  });

  it('ignores lists for past days and handles text-only lists', () => {
    const old: DayFile = { ...ihcTomorrow, date: '2026-11-20' };
    expect(analyse([old], cases, [], TODAY).sameDay).toEqual([]);
    const text: DayFile = { court: 'phc', date: TOMORROW, fetchedAt: 'x', lines: ['Court No: 4', '15. W.P 14912/2026 Said Rehman v. State'] };
    const a = analyse([text], [mk('p', 'W.P. 14912/2026', 'Said Rehman v. State', 'phc', '2026-11-24T09:00:00+05:00')], [], TODAY);
    expect(a.toSave[0].hits[0]).toMatchObject({ caseId: 'p', courtRoom: '4', srNo: 15 });
  });
});

describe('matchEntries', () => {
  it('prefers number matches and keeps court room / serial from the entry', () => {
    const hits = matchEntries(ihcTomorrow.entries!, [{ id: 'a', caseNo: 'Writ Petition 5490-2026', title: 'X v. Y' }]);
    expect(hits).toEqual([expect.objectContaining({ caseId: 'a', kind: 'matched', courtRoom: '3', srNo: 12, line: 'W.P. 5490/2026 Zahid Traders v. CIR' })]);
  });
});

describe('download', () => {
  const index: IndexFile = {
    generatedAt: 'x',
    files: [
      { court: 'ihc', date: TOMORROW, count: 3, fetchedAt: ihcTomorrow.fetchedAt, path: 'ihc/2026-11-24.json' },
      { court: 'ihc', date: '2026-11-20', count: 3, fetchedAt: 'x', path: 'ihc/2026-11-20.json' },
      { court: 'phc', date: TOMORROW, count: 1, fetchedAt: 'x', path: 'phc/2026-11-24.json' },
      { court: 'ihc', date: TOMORROW, count: 1, fetchedAt: 'x', path: '../../evil.json' },
    ],
  };

  it('asks only for future days of the chamber courts, same origin', async () => {
    expect(wantedFiles(index, ['ihc'], TODAY).map((f) => f.path)).toEqual(['ihc/2026-11-24.json']);
    const asked: string[] = [];
    const fake = (async (url: string) => {
      asked.push(url);
      if (url === '/cause-lists/index.json') return new Response(JSON.stringify(index));
      if (url === '/cause-lists/ihc/2026-11-24.json') return new Response(JSON.stringify(ihcTomorrow));
      return new Response('', { status: 404 });
    }) as unknown as typeof fetch;
    const d = await download(['ihc'], TODAY, fake);
    expect(asked).toEqual(['/cause-lists/index.json', '/cause-lists/ihc/2026-11-24.json']);
    expect(d.files).toHaveLength(1);
  });

  it('treats a missing index (not deployed yet / offline) as nothing to do', async () => {
    const d = await download(['ihc'], TODAY, (async () => new Response('', { status: 404 })) as unknown as typeof fetch);
    expect(d).toMatchObject({ index: null, files: [] });
    const off = await download(['ihc'], TODAY, (async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch);
    expect(off.files).toEqual([]);
  });
});

describe('index → match → save (practice data on this device)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetToDemo();
    startFresh();
  });

  it('saves same-day hits without moving the date, and "Update next date" moves a mismatched case', () => {
    const same = addCase({ title: 'Zahid Traders v. Federation', caseNo: 'W.P. 5490/2026', category: 'Tax', courtId: 'ihc', nextHearing: '2026-11-24T10:30:00+05:00' });
    const other = addCase({ title: 'Nadia Hussain v. NADRA', caseNo: 'I.C.A. 88/2026', category: 'Service', courtId: 'ihc', nextHearing: '2026-12-03T09:00:00+05:00' });
    expect(relevantCourts(getDb().cases)).toEqual(['ihc']);

    let a = analyse([ihcTomorrow], getDb().cases, getDb().causeList, TODAY);
    for (const g of a.toSave) saveCauseListHits(g.date, g.hits);
    let db = getDb();
    expect(db.causeList).toEqual([{ date: TOMORROW, courtId: 'ihc', bench: 'Bench A', courtRoom: '3', srNo: 12, caseId: same.id }]);
    expect(db.cases.find((c) => c.id === same.id)?.nextHearing).toBe('2026-11-24T10:30:00+05:00'); // time kept

    a = analyse([ihcTomorrow], db.cases, db.causeList, TODAY);
    expect(a.toSave).toEqual([]);
    expect(a.otherDay.map((f) => f.caseId)).toEqual([other.id]);

    // One tap: "Update next date"
    saveCauseListHits(a.otherDay[0].date, [a.otherDay[0].hit]);
    db = getDb();
    expect(db.cases.find((c) => c.id === other.id)?.nextHearing).toBe('2026-11-24T09:00:00+05:00');
    expect(db.causeList.find((e) => e.caseId === other.id)).toMatchObject({ courtRoom: '7', srNo: 4 });
    expect(analyse([ihcTomorrow], db.cases, db.causeList, TODAY).otherDay).toEqual([]);
  });
});
