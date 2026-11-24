import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { seed } from '../../src/data/seed';
import {
  buildPrepInput,
  buildReportInput,
  clip,
  decidedOn,
  hearingPrepPdf,
  inMonth,
  isMonthKey,
  lastHearings,
  lastNotesFor,
  monthLabel,
  monthOf,
  openTasksFor,
  practiceReportPdf,
  practiceStats,
  type PrepInput,
} from '../../src/lib/pdfBriefs';
import type { Case, Db } from '../../src/types';

const pages = async (b: Uint8Array) => (await PDFDocument.load(b)).getPageCount();

const prep = (over: Partial<PrepInput> = {}): PrepInput => ({
  chamberName: 'Test Chamber',
  caseTitle: 'Ahmed v. Khan',
  caseNo: 'C.S. 12/2026',
  court: 'Civil Court Lahore',
  judge: 'Civil Judge',
  stage: 'Evidence',
  status: 'adjourned',
  nextHearing: '2026-12-05T09:00:00+05:00',
  clientName: 'Bilal Ahmed',
  clientPhone: '0300 1234567',
  hearings: [
    { date: '2026-11-01', proceedings: 'Issues framed.', nextDate: '2026-11-15' },
    { date: '2026-11-15', proceedings: 'Adjourned for evidence.', nextDate: '2026-12-05' },
  ],
  tasks: [{ title: 'Collect certified copy', due: '2026-12-01', assignee: 'Sara' }],
  notes: [{ date: '2026-11-15T10:00:00+05:00', text: 'Client to bring original deed.' }],
  documents: ['Plaint.pdf', 'Written statement.pdf'],
  date: '2026-11-24',
  ...over,
});

describe('hearing prep sheet', () => {
  it('builds a one-page PDF for a normal case', async () => {
    const b = await hearingPrepPdf(prep());
    expect(b.byteLength).toBeGreaterThan(500);
    expect(await pages(b)).toBe(1);
  });

  it('still builds, on more than one page, with very long data', async () => {
    const long = 'The learned counsel argued at length about the maintainability of the suit. '.repeat(30);
    const b = await hearingPrepPdf(
      prep({
        caseTitle: 'A very long case title '.repeat(10),
        hearings: Array.from({ length: 20 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, proceedings: long, nextDate: '2026-11-01' })),
        tasks: Array.from({ length: 40 }, (_, i) => ({ title: `Task number ${i} ${long}`, due: '2026-12-01', assignee: 'Sara' })),
        notes: Array.from({ length: 12 }, () => ({ date: '2026-11-01', text: long })),
        documents: Array.from({ length: 300 }, (_, i) => `Document ${i} with a fairly long file name.pdf`),
      }),
    );
    expect(b.byteLength).toBeGreaterThan(500);
    expect(await pages(b)).toBeGreaterThanOrEqual(2);
    expect(await pages(b)).toBeLessThanOrEqual(3);
  });

  it('survives characters the standard font cannot draw', async () => {
    const b = await hearingPrepPdf(prep({ clientName: 'عروج', notes: [{ date: '2026-11-01', text: 'مقدمہ ملتوی' }] }));
    expect(b.byteLength).toBeGreaterThan(500);
  });

  it('prints the fee line only when it is passed', async () => {
    const without = await hearingPrepPdf(prep());
    const withFee = await hearingPrepPdf(prep({ fee: { agreed: 100000, received: 40000, outstanding: 60000 } }));
    expect(withFee.byteLength).toBeGreaterThan(without.byteLength);
  });

  it('buildPrepInput leaves the fee out unless billing is allowed', () => {
    const c = seed.cases.find((x) => seed.fees.some((f) => f.caseId === x.id))!;
    expect(c).toBeTruthy();
    expect(buildPrepInput(seed, c.id, { withFee: false })!.fee).toBeUndefined();
    const f = buildPrepInput(seed, c.id, { withFee: true })!.fee!;
    expect(f.agreed).toBeGreaterThan(0);
    expect(f.received + f.outstanding).toBeGreaterThanOrEqual(f.agreed);
    expect(buildPrepInput(seed, 'nope', { withFee: true })).toBeUndefined();
  });

  it('picks the newest hearings, open tasks and notes for the case', () => {
    expect(lastHearings([{ date: '2026-01-01', proceedings: 'a' }, { date: '2026-03-01', proceedings: 'c' }, { date: '2026-02-01', proceedings: 'b' }, { date: '2025-12-01', proceedings: 'z' }], 3).map((h) => h.proceedings)).toEqual(['c', 'b', 'a']);
    const tasks = [
      { id: '1', title: 'late', caseId: 'x', assigneeId: 'm', due: '2026-12-09', done: false, createdAt: '' },
      { id: '2', title: 'done', caseId: 'x', assigneeId: 'm', done: true, createdAt: '' },
      { id: '3', title: 'other case', caseId: 'y', assigneeId: 'm', done: false, createdAt: '' },
      { id: '4', title: 'undated', caseId: 'x', assigneeId: 'm', done: false, createdAt: '' },
      { id: '5', title: 'soon', caseId: 'x', assigneeId: 'm', due: '2026-12-01', done: false, createdAt: '' },
    ];
    expect(openTasksFor(tasks, 'x').map((t) => t.title)).toEqual(['soon', 'late', 'undated']);
    const diary = Array.from({ length: 8 }, (_, i) => ({ id: `d${i}`, date: `2026-11-0${i + 1}`, caseId: i === 3 ? 'y' : 'x', authorId: 'm', text: `n${i}` }));
    const notes = lastNotesFor(diary, 'x', 5);
    expect(notes).toHaveLength(5);
    expect(notes[0].text).toBe('n7');
    expect(notes.every((n) => n.caseId === 'x')).toBe(true);
  });

  it('clip shortens and tidies text', () => {
    expect(clip('a   b\n c', 20)).toBe('a b c');
    expect(clip('x'.repeat(50), 10)).toHaveLength(10);
    expect(clip('x'.repeat(50), 10).endsWith('...')).toBe(true);
  });
});

describe('month logic', () => {
  it('validates and labels months', () => {
    expect(isMonthKey('2026-11')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-1')).toBe(false);
    expect(isMonthKey('')).toBe(false);
    expect(monthLabel('2026-11')).toBe('November 2026');
    expect(monthLabel('bad')).toBe('bad');
  });

  it('puts a date in a month using Pakistan time', () => {
    expect(inMonth('2026-11-30', '2026-11')).toBe(true);
    expect(inMonth('2026-12-01', '2026-11')).toBe(false);
    expect(inMonth(undefined, '2026-11')).toBe(false);
    // 19:30 UTC on 30 Nov is already 1 Dec in Pakistan (UTC+5)
    expect(monthOf('2026-11-30T19:30:00Z')).toBe('2026-12');
    expect(inMonth('2026-11-30T19:30:00Z', '2026-12')).toBe(true);
  });

  const mk = (over: Partial<Case> & { id: string }): Case => ({
    chamberId: 'ch',
    caseNo: `No ${over.id}`,
    title: `Case ${over.id}`,
    category: 'Civil',
    courtId: 'c1',
    judge: 'J',
    stage: 's',
    status: 'pending',
    filedOn: '2026-01-01',
    clientId: 'cl',
    assignedTo: [],
    hearings: [],
    ...over,
  });
  const db: Pick<Db, 'cases' | 'courts' | 'fees'> = {
    courts: [
      { id: 'c1', name: 'Court One', shortName: 'C1', level: 'District', city: 'Lahore', statusUrl: '' },
      { id: 'c2', name: 'Court Two', shortName: 'C2', level: 'HC', city: 'Lahore', statusUrl: '' },
    ],
    cases: [
      mk({ id: 'a', filedOn: '2026-11-03', hearings: [{ date: '2026-11-10', proceedings: 'x' }, { date: '2026-11-20', proceedings: 'y' }] }),
      mk({ id: 'b', filedOn: '2026-10-31', category: 'Family', courtId: 'c2', status: 'adjourned', hearings: [{ date: '2026-10-31', proceedings: 'x' }] }),
      mk({ id: 'c', filedOn: '2026-05-01', status: 'decided', result: 'Decreed', hearings: [{ date: '2026-09-01', proceedings: 'x' }, { date: '2026-11-12', proceedings: 'Decreed' }] }),
      mk({ id: 'd', filedOn: '2026-11-30', status: 'disposed', courtId: 'c2', hearings: [{ date: '2026-10-05', proceedings: 'x' }] }),
      mk({ id: 'e', filedOn: '2026-11-15', category: 'Family', status: 'reserved' }),
    ],
    fees: [
      { caseId: 'a', agreed: 100000, payments: [{ date: '2026-11-05', amount: 30000, mode: 'Cash' }, { date: '2026-10-05', amount: 20000, mode: 'Cheque' }] },
      { caseId: 'c', agreed: 50000, payments: [{ date: '2026-11-25', amount: 50000, mode: 'Online' }] },
    ],
  };

  it('finds cases filed, heard and decided in the month', () => {
    const s = practiceStats(db, '2026-11', false);
    expect(s.filed.map((r) => r.caseNo)).toEqual(['No a', 'No e', 'No d']);
    expect(s.heard.map((r) => r.caseNo)).toEqual(['No a', 'No c']);
    expect(s.heard[0].detail).toBe('10 Nov 2026, 20 Nov 2026');
    expect(s.decided.map((r) => r.caseNo)).toEqual(['No c']); // d was last heard in October, a is not closed
    expect(decidedOn(db.cases[3])).toBe('2026-10-05');
    expect(decidedOn(db.cases[0])).toBeUndefined();
  });

  it('counts what is pending now by category and court', () => {
    const s = practiceStats(db, '2026-11', false);
    expect(s.pendingTotal).toBe(3); // a, b, e
    expect(Object.fromEntries(s.byCategory)).toEqual({ Civil: 1, Family: 2 });
    expect(Object.fromEntries(s.byCourt)).toEqual({ C1: 2, C2: 1 });
  });

  it('adds fee figures only on request', () => {
    expect(practiceStats(db, '2026-11', false).fees).toBeUndefined();
    const f = practiceStats(db, '2026-11', true).fees!;
    expect(f.received).toBe(80000);
    expect(f.outstanding).toBe(50000); // a: 100000 - 50000
    expect(f.payments.map((p) => p.caseNo)).toEqual(['No a', 'No c']);
  });
});

describe('practice report PDF', () => {
  it('builds for the seed data, with and without fees', async () => {
    const month = seed.cases[0].filedOn.slice(0, 7);
    const plain = await practiceReportPdf(buildReportInput(seed, month, { withFees: false, today: '2026-11-24' }));
    const withFees = await practiceReportPdf(buildReportInput(seed, month, { withFees: true, today: '2026-11-24' }));
    expect(plain.byteLength).toBeGreaterThan(500);
    expect(withFees.byteLength).toBeGreaterThan(plain.byteLength);
  });

  it('builds for an empty month and for a very large one', async () => {
    const empty = await practiceReportPdf(buildReportInput(seed, '1999-01', { withFees: true }));
    expect(empty.byteLength).toBeGreaterThan(500);
    const many: Case[] = Array.from({ length: 150 }, (_, i) => ({
      ...seed.cases[0],
      id: `big${i}`,
      caseNo: `C.S. ${i}/2026`,
      title: `Long title for a big month ${i} `.repeat(3),
      filedOn: '2026-11-10',
      hearings: [{ date: '2026-11-12', proceedings: 'x' }],
    }));
    const big = await practiceReportPdf(buildReportInput({ ...seed, cases: many, fees: [] }, '2026-11', { withFees: true }));
    expect(await pages(big)).toBeGreaterThan(2);
  });
});
