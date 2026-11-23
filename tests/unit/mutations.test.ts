import { beforeEach, describe, expect, it } from 'vitest';
import { addCase, addClient, addDiary, addExpense, addPayment, addTask, recordOutcome, setTaskDone, upsertFee } from '../../src/lib/mutations';
import { getDb, resetToDemo, startFresh } from '../../src/lib/store';

beforeEach(() => {
  window.localStorage.clear();
  resetToDemo();
  startFresh();
});

describe('mutations', () => {
  it('addClient + addCase link both ways', () => {
    const cl = addClient({ name: 'Ali Raza', phone: '0300-1234567', city: 'Lahore' });
    const c = addCase({ title: 'Ali Raza v. State', caseNo: 'Crl. Misc. 1/2026', category: 'Criminal', courtId: 'lhc', clientId: cl.id, nextHearing: '2026-11-30T09:00:00+05:00' });
    const db = getDb();
    expect(db.cases.find((x) => x.id === c.id)?.status).toBe('pending');
    expect(db.clients.find((x) => x.id === cl.id)?.caseIds).toEqual([c.id]);
  });

  it('recordOutcome appends a hearing, moves the next date, and writes a diary line', () => {
    const c = addCase({ title: 'X v. Y', caseNo: 'S. 1/2026', category: 'Civil', courtId: 'lhc', nextHearing: '2026-11-23T09:00:00+05:00' });
    recordOutcome(c.id, { date: '2026-11-23T09:00:00+05:00', proceedings: 'Adjourned on request of respondent.', nextDate: '2026-12-12T09:00:00+05:00', stage: 'Evidence', authorId: 'm1' });
    const after = getDb().cases.find((x) => x.id === c.id)!;
    expect(after.hearings).toHaveLength(1);
    expect(after.hearings[0].nextDate).toBe('2026-12-12T09:00:00+05:00');
    expect(after.nextHearing).toBe('2026-12-12T09:00:00+05:00');
    expect(after.stage).toBe('Evidence');
    expect(after.status).toBe('adjourned');
    expect(getDb().diary.some((d) => d.caseId === c.id && d.text.includes('Adjourned on request'))).toBe(true);
  });

  it('recordOutcome with a decision clears the next date and stores the result', () => {
    const c = addCase({ title: 'A v. B', caseNo: 'S. 2/2026', category: 'Civil', courtId: 'lhc', nextHearing: '2026-11-23T09:00:00+05:00' });
    recordOutcome(c.id, { date: '2026-11-23T09:00:00+05:00', proceedings: 'Suit decreed.', status: 'decided', result: 'Decreed with costs', authorId: 'm1' });
    const after = getDb().cases.find((x) => x.id === c.id)!;
    expect(after.nextHearing).toBeUndefined();
    expect(after.status).toBe('decided');
    expect(after.result).toBe('Decreed with costs');
  });

  it('recordOutcome on an unknown case throws', () => {
    expect(() => recordOutcome('nope', { date: '2026-11-23', proceedings: 'x', authorId: 'm1' })).toThrow();
  });

  it('fees, payments and expenses', () => {
    const c = addCase({ title: 'F v. G', caseNo: 'S. 3/2026', category: 'Civil', courtId: 'lhc' });
    upsertFee(c.id, 100000);
    addPayment(c.id, { date: '2026-11-01', amount: 30000, mode: 'Cash' });
    addExpense({ caseId: c.id, date: '2026-11-02', amount: 500, kind: 'Photocopies' });
    const db = getDb();
    expect(db.fees.find((f) => f.caseId === c.id)?.payments).toHaveLength(1);
    expect(db.expenses.filter((e) => e.caseId === c.id && !e.reimbursed)).toHaveLength(1);
    expect(() => addPayment(c.id, { date: '2026-11-01', amount: -5, mode: 'Cash' })).toThrow();
  });

  it('tasks and diary', () => {
    const t = addTask({ title: 'Apply certified copy', assigneeId: 'm3' });
    setTaskDone(t.id, true);
    addDiary({ text: 'Bar meeting at 4', authorId: 'm1' });
    expect(getDb().tasks[0].done).toBe(true);
    expect(getDb().diary).toHaveLength(1);
  });
});
