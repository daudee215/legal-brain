import { describe, expect, it } from 'vitest';
import { mergeDocs, mergeList } from '../../src/lib/cloud/merge';

type R = { id: string; a?: number; b?: number; t?: string };
const key = (r: R) => r.id;

describe('mergeList (three-way, by id)', () => {
  const base: R[] = [{ id: '1', a: 1, b: 1 }, { id: '2', a: 2 }];

  it('keeps additions from both sides', () => {
    const local = [...base, { id: 'L' }];
    const remote = [...base, { id: 'R' }];
    expect(mergeList(base, local, remote, key).map(key)).toEqual(['1', '2', 'R', 'L']);
  });

  it('applies a remote edit when local did not touch the record', () => {
    const remote = [{ id: '1', a: 9, b: 1 }, base[1]];
    expect(mergeList(base, base, remote, key)[0]).toEqual({ id: '1', a: 9, b: 1 });
  });

  it('merges different fields edited on each side', () => {
    const local = [{ id: '1', a: 5, b: 1 }, base[1]];
    const remote = [{ id: '1', a: 1, b: 7 }, base[1]];
    expect(mergeList(base, local, remote, key)[0]).toEqual({ id: '1', a: 5, b: 7 });
  });

  it('same field edited on both sides: local (the newest action here) wins', () => {
    const local = [{ id: '1', a: 5, b: 1 }, base[1]];
    const remote = [{ id: '1', a: 6, b: 1 }, base[1]];
    expect(mergeList(base, local, remote, key)[0].a).toBe(5);
  });

  it('a delete on one side wins when the other side did not edit it', () => {
    expect(mergeList(base, [base[1]], base, key).map(key)).toEqual(['2']);
    expect(mergeList(base, base, [base[1]], key).map(key)).toEqual(['2']);
  });

  it('an edit beats a delete (never lose someone’s work)', () => {
    const local = [{ id: '1', a: 3, b: 1 }, base[1]];
    const remote = [base[1]];
    expect(mergeList(base, local, remote, key).map(key)).toContain('1');
  });

  it('nested arrays (e.g. hearings) are merged as whole values', () => {
    type C = { id: string; hearings: string[] };
    const b: C[] = [{ id: 'c', hearings: ['h1'] }];
    const l: C[] = [{ id: 'c', hearings: ['h1', 'h2'] }];
    expect(mergeList(b, l, b, (x) => x.id)[0].hearings).toEqual(['h1', 'h2']);
  });
});

describe('mergeDocs', () => {
  it('merges each collection and tolerates missing ones', () => {
    const base = { cases: [{ id: 'k1', stage: 'A' }], tasks: [] };
    const local = { cases: [{ id: 'k1', stage: 'B' }], tasks: [{ id: 't1' }] };
    const remote = { cases: [{ id: 'k1', stage: 'A' }, { id: 'k2', stage: 'X' }] };
    const m = mergeDocs(base, local, remote) as { cases: { id: string; stage: string }[]; tasks: { id: string }[] };
    expect(m.cases).toEqual([{ id: 'k1', stage: 'B' }, { id: 'k2', stage: 'X' }]);
    expect(m.tasks).toEqual([{ id: 't1' }]);
  });

  it('keys fees by case and cause-list entries by day + case', () => {
    const base = { fees: [{ caseId: 'k1', agreed: 1, payments: [] }], causeList: [] };
    const local = { fees: [{ caseId: 'k1', agreed: 2, payments: [] }], causeList: [{ date: 'd', caseId: 'k1', srNo: 1 }] };
    const remote = { fees: [{ caseId: 'k1', agreed: 1, payments: [{ amount: 5 }] }], causeList: [{ date: 'd', caseId: 'k1', srNo: 3 }] };
    const m = mergeDocs(base, local, remote) as { fees: { agreed: number; payments: unknown[] }[]; causeList: { srNo: number }[] };
    expect(m.fees[0]).toEqual({ caseId: 'k1', agreed: 2, payments: [{ amount: 5 }] });
    expect(m.causeList).toHaveLength(1);
  });
});
