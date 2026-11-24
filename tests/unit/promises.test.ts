import { describe, expect, it } from 'vitest';
import { mergeDocs } from '../../src/lib/cloud/merge';
import { BILLING_KEYS, splitDb } from '../../src/lib/cloud/split';
import { addPromise, autoKeep, dueToday, openPromises, overdue, promiseReminderText, promiseStatus } from '../../src/lib/promises';
import type { FeeLedger, FeePromise } from '../../src/types';

const pr = (id: string, amount: number, dueOn: string, madeOn: string, keptOn?: string): FeePromise => ({ id, amount, dueOn, madeOn, ...(keptOn ? { keptOn } : {}) });
const pay = (date: string, amount: number) => ({ date, amount, mode: 'Cash' as const });
const ledger = (promises: FeePromise[], payments = [] as ReturnType<typeof pay>[]): FeeLedger => ({ caseId: 'c1', agreed: 100000, payments, promises });

describe('promise status', () => {
  const p = pr('a', 5000, '2026-12-05', '2026-11-20');
  it('is upcoming before, today on, overdue after the date', () => {
    expect(promiseStatus(p, '2026-12-04')).toBe('upcoming');
    expect(promiseStatus(p, '2026-12-05')).toBe('today');
    expect(promiseStatus(p, '2026-12-06')).toBe('overdue');
    expect(dueToday(p, '2026-12-05')).toBe(true);
    expect(dueToday(p, '2026-12-06')).toBe(false);
    expect(overdue(p, '2026-12-06')).toBe(true);
    expect(overdue(p, '2026-12-05')).toBe(false);
  });
  it('a kept promise is neither due nor overdue', () => {
    const k = pr('k', 5000, '2026-12-01', '2026-11-20', '2026-11-25');
    expect(promiseStatus(k, '2026-12-09')).toBe('kept');
    expect(overdue(k, '2026-12-09')).toBe(false);
    expect(dueToday(k, '2026-12-01')).toBe(false);
  });
  it('openPromises lists unkept ones by due date', () => {
    const l = ledger([pr('b', 1, '2026-12-09', '2026-11-20'), pr('k', 1, '2026-12-01', '2026-11-20', '2026-11-25'), pr('a', 1, '2026-12-02', '2026-11-20')]);
    expect(openPromises(l).map((x) => x.id)).toEqual(['a', 'b']);
    expect(openPromises({})).toEqual([]);
  });
});

describe('addPromise', () => {
  it('adds without touching the original ledger', () => {
    const l: FeeLedger = { caseId: 'c1', agreed: 1, payments: [] };
    const n = addPromise(l, { id: 'p1', amount: 25000, dueOn: '2026-12-05', note: ' after harvest ' }, '2026-11-24');
    expect(l.promises).toBeUndefined();
    expect(n.promises).toEqual([{ id: 'p1', amount: 25000, dueOn: '2026-12-05', madeOn: '2026-11-24', note: 'after harvest' }]);
  });
  it('rejects a zero amount or a missing date', () => {
    const l: FeeLedger = { caseId: 'c1', agreed: 1, payments: [] };
    expect(() => addPromise(l, { id: 'x', amount: 0, dueOn: '2026-12-05' }, '2026-11-24')).toThrow();
    expect(() => addPromise(l, { id: 'x', amount: 5, dueOn: '' }, '2026-11-24')).toThrow();
  });
});

describe('autoKeep', () => {
  it('keeps a promise covered by a later payment, with that payment date', () => {
    const out = autoKeep(ledger([pr('a', 25000, '2026-12-05', '2026-11-20')], [pay('2026-12-02', 25000)]));
    expect(out[0].keptOn).toBe('2026-12-02');
  });
  it('ignores payments from before the promise was made', () => {
    const out = autoKeep(ledger([pr('a', 25000, '2026-12-05', '2026-11-20')], [pay('2026-11-19', 25000)]));
    expect(out[0].keptOn).toBeUndefined();
  });
  it('counts payments made on the same day', () => {
    const out = autoKeep(ledger([pr('a', 10000, '2026-12-05', '2026-11-20')], [pay('2026-11-20', 10000)]));
    expect(out[0].keptOn).toBe('2026-11-20');
  });
  it('adds several smaller payments together', () => {
    const out = autoKeep(ledger([pr('a', 30000, '2026-12-05', '2026-11-20')], [pay('2026-11-22', 10000), pay('2026-11-25', 10000), pay('2026-11-30', 10000)]));
    expect(out[0].keptOn).toBe('2026-11-30');
  });
  it('stays open when payments fall short', () => {
    const out = autoKeep(ledger([pr('a', 30000, '2026-12-05', '2026-11-20')], [pay('2026-11-22', 10000), pay('2026-11-25', 10000)]));
    expect(out[0].keptOn).toBeUndefined();
  });
  it('never counts one payment for two promises', () => {
    const ps = [pr('a', 20000, '2026-12-01', '2026-11-20'), pr('b', 20000, '2026-12-10', '2026-11-20')];
    const one = autoKeep(ledger(ps, [pay('2026-11-28', 25000)]));
    expect(one.find((p) => p.id === 'a')?.keptOn).toBe('2026-11-28');
    expect(one.find((p) => p.id === 'b')?.keptOn).toBeUndefined();
    const two = autoKeep(ledger(ps, [pay('2026-11-28', 25000), pay('2026-12-03', 15000)]));
    expect(two.every((p) => p.keptOn)).toBe(true);
    expect(two.find((p) => p.id === 'b')?.keptOn).toBe('2026-12-03');
  });
  it('an already kept promise keeps its payment, so a newer one cannot reuse it', () => {
    const ps = [pr('a', 20000, '2026-12-01', '2026-11-20', '2026-11-28'), pr('b', 20000, '2026-12-10', '2026-11-25')];
    const out = autoKeep(ledger(ps, [pay('2026-11-28', 20000)]));
    expect(out.find((p) => p.id === 'a')?.keptOn).toBe('2026-11-28');
    expect(out.find((p) => p.id === 'b')?.keptOn).toBeUndefined();
  });
  it('is idempotent and never un-keeps', () => {
    const l = ledger([pr('a', 20000, '2026-12-01', '2026-11-20')], [pay('2026-11-28', 20000)]);
    const once = autoKeep(l);
    const twice = autoKeep({ ...l, promises: once });
    expect(twice).toEqual(once);
    expect(autoKeep({ ...l, payments: [], promises: once })[0].keptOn).toBe('2026-11-28');
  });
  it('does not change the ledger it is given, and handles no promises', () => {
    const l = ledger([pr('a', 20000, '2026-12-01', '2026-11-20')], [pay('2026-11-28', 20000)]);
    autoKeep(l);
    expect(l.promises![0].keptOn).toBeUndefined();
    expect(autoKeep({ payments: [pay('2026-11-28', 1)] })).toEqual([]);
  });
});

describe('promiseReminderText', () => {
  const m = { clientName: 'Bilal Ahmed', caseTitle: 'Ahmed v. Khan', caseNo: 'C.S. 12/2026', amount: 25000, dueOn: '2026-12-05', chamberName: 'Arooj Law Chamber' };
  it('English names the client, amount and date', () => {
    const t = promiseReminderText(m, 'en');
    expect(t).toContain('Bilal');
    expect(t).toContain('Rs 25,000');
    expect(t).toContain('5 Dec 2026');
    expect(t).toContain('Ahmed v. Khan (C.S. 12/2026)');
    expect(t).toContain('Arooj Law Chamber');
    expect(t).not.toMatch(/[؀-ۿ]/);
  });
  it('Urdu is in Urdu script and carries the amount and date', () => {
    const t = promiseReminderText(m, 'ur');
    expect(t).toMatch(/[؀-ۿ]/);
    expect(t).toContain('25,000');
    expect(t).toContain('5 Dec 2026');
    expect(t).toContain('Bilal Ahmed');
  });
  it('both = English then Urdu', () => {
    const t = promiseReminderText(m);
    expect(t.indexOf('Assalam-o-Alaikum')).toBeLessThan(t.indexOf('السلام علیکم'));
    expect(t).toContain('\n\n');
  });
  it('works without a client name, case number or chamber', () => {
    const t = promiseReminderText({ caseTitle: 'X v. Y', amount: 1000, dueOn: '2026-12-05' });
    expect(t).toContain('Assalam-o-Alaikum,');
    expect(t).not.toContain('undefined');
  });
});

describe('cloud sync keeps promises', () => {
  it('billing half passes whole ledgers through, promises included', () => {
    const db = { fees: [ledger([pr('a', 1, '2026-12-01', '2026-11-20')])], expenses: [] } as never;
    const { billing } = splitDb(db);
    expect(BILLING_KEYS.includes('fees')).toBe(true);
    expect((billing.fees[0] as FeeLedger).promises).toHaveLength(1);
  });
  it('merge keeps promises added on either side', () => {
    const base = { fees: [{ caseId: 'c1', agreed: 1, payments: [] }] };
    const local = { fees: [{ caseId: 'c1', agreed: 1, payments: [], promises: [pr('a', 5, '2026-12-01', '2026-11-20')] }] };
    const remote = { fees: [{ caseId: 'c1', agreed: 2, payments: [] }] };
    const m = mergeDocs(base, local, remote) as { fees: FeeLedger[] };
    expect(m.fees[0].agreed).toBe(2);
    expect(m.fees[0].promises?.map((p) => p.id)).toEqual(['a']);
    const flipped = mergeDocs(base, remote, local) as { fees: FeeLedger[] };
    expect(flipped.fees[0].promises?.map((p) => p.id)).toEqual(['a']);
  });
});
