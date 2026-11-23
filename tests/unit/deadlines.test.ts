import { beforeEach, describe, expect, it } from 'vitest';
import { addDeadline, computeDeadline, deleteDeadline, markFiled, sortByUrgency, updateDeadline } from '../../src/lib/deadlines';
import { getDb, resetToDemo, startFresh } from '../../src/lib/store';
import type { Deadline } from '../../src/types';

const base: Deadline = { id: 'x', caseId: 'k1', remedyId: 'appeal-dc-decree', orderDate: '2026-11-01' };

describe('computeDeadline', () => {
  it('counts the period from the order date with no copy dates', () => {
    const r = computeDeadline(base, '2026-11-23');
    expect(r).toMatchObject({ lastDay: '2026-12-01', daysLeft: 8, excludedDays: 0, status: 'soon', basis: 'Limitation Act 1908, Art. 152' });
  });

  it('excludes certified-copy time (s.12)', () => {
    const r = computeDeadline({ ...base, copyAppliedOn: '2026-11-03', copyReadyOn: '2026-11-13' }, '2026-11-23');
    expect(r.excludedDays).toBe(10);
    expect(r.lastDay).toBe('2026-12-11');
    expect(r.daysLeft).toBe(18);
  });

  it('ignores copy time when only one date is set', () => {
    expect(computeDeadline({ ...base, copyAppliedOn: '2026-11-03' }, '2026-11-23').excludedDays).toBe(0);
    expect(computeDeadline({ ...base, copyReadyOn: '2026-11-13' }, '2026-11-23').excludedDays).toBe(0);
  });

  it('ignores copy applied before the order date', () => {
    expect(computeDeadline({ ...base, copyAppliedOn: '2026-10-20', copyReadyOn: '2026-11-13' }, '2026-11-23').excludedDays).toBe(0);
  });

  it('classifies status by days left', () => {
    expect(computeDeadline(base, '2026-12-02').status).toBe('overdue');
    expect(computeDeadline(base, '2026-12-01')).toMatchObject({ status: 'urgent', daysLeft: 0 });
    expect(computeDeadline(base, '2026-11-24').status).toBe('urgent'); // 7 left
    expect(computeDeadline(base, '2026-11-23').status).toBe('soon'); // 8 left
    expect(computeDeadline({ ...base, remedyId: 'appeal-hc-decree' }, '2026-11-02').status).toBe('ok');
    expect(computeDeadline({ ...base, filedOn: '2026-11-20' }, '2026-12-20').status).toBe('filed');
  });

  it('sorts by urgency with filed last', () => {
    const rows = [
      { id: 'filed', info: computeDeadline({ ...base, filedOn: '2026-11-10' }, '2026-11-23') },
      { id: 'ok', info: computeDeadline({ ...base, remedyId: 'appeal-hc-decree' }, '2026-11-23') },
      { id: 'over', info: computeDeadline(base, '2026-12-05') },
      { id: 'soon', info: computeDeadline(base, '2026-11-23') },
    ];
    expect(sortByUrgency(rows).map((r) => r.id)).toEqual(['over', 'soon', 'ok', 'filed']);
  });

  it('throws for an unknown remedy', () => {
    expect(() => computeDeadline({ ...base, remedyId: 'nope' }, '2026-11-23')).toThrow('Unknown remedy');
  });
});

describe('deadline writers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetToDemo();
    startFresh();
  });

  it('add, update copy dates, mark filed, delete', () => {
    const d = addDeadline({ caseId: 'k1', remedyId: 'civil-revision', orderDate: '2026-11-01', copyAppliedOn: '' });
    expect(getDb().deadlines).toHaveLength(1);
    expect(getDb().deadlines[0].copyAppliedOn).toBeUndefined();

    updateDeadline(d.id, { copyAppliedOn: '2026-11-02', copyReadyOn: '2026-11-05' });
    expect(getDb().deadlines[0]).toMatchObject({ copyAppliedOn: '2026-11-02', copyReadyOn: '2026-11-05' });

    markFiled(d.id, '2026-11-20');
    expect(getDb().deadlines[0].filedOn).toBe('2026-11-20');
    markFiled(d.id, null);
    expect(getDb().deadlines[0].filedOn).toBeUndefined();

    deleteDeadline(d.id);
    expect(getDb().deadlines).toHaveLength(0);
  });

  it('rejects bad input', () => {
    expect(() => addDeadline({ caseId: '', remedyId: 'civil-revision', orderDate: '2026-11-01' })).toThrow('Pick a case');
    expect(() => addDeadline({ caseId: 'k1', remedyId: 'x', orderDate: '2026-11-01' })).toThrow('Pick a remedy');
    expect(() => addDeadline({ caseId: 'k1', remedyId: 'civil-revision', orderDate: '' })).toThrow('Order date');
    expect(() => addDeadline({ caseId: 'k1', remedyId: 'civil-revision', orderDate: '2026-11-01', copyAppliedOn: '2026-11-05', copyReadyOn: '2026-11-02' })).toThrow('before');
  });
});
