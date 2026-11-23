import { beforeEach, describe, expect, it } from 'vitest';
import { assignCover, findClashes, overdueCases } from '../../src/lib/clashes';
import { addCase } from '../../src/lib/mutations';
import { getDb, resetToDemo, startFresh } from '../../src/lib/store';
import type { Case, Court } from '../../src/types';

const courts: Court[] = [
  { id: 'lhc', name: 'Lahore High Court', shortName: 'LHC', level: 'HC', city: 'Lahore', statusUrl: '' },
  { id: 'cjl', name: 'Civil Courts Lahore', shortName: 'Civil Lhr', level: 'District', city: 'Lahore', statusUrl: '' },
  { id: 'ihc', name: 'Islamabad High Court', shortName: 'IHC', level: 'HC', city: 'Islamabad', statusUrl: '' },
];

function mk(id: string, courtId: string, nextHearing: string | undefined, assignedTo: string[] = ['m1'], status: Case['status'] = 'pending'): Case {
  return { id, chamberId: 'ch1', caseNo: id, title: `Case ${id}`, category: 'Civil', courtId, judge: '', stage: 'Fresh', status, filedOn: '2026-01-01', nextHearing, clientId: '', assignedTo, hearings: [] };
}

const DAY = '2026-11-23';

describe('findClashes', () => {
  it('flags two cases in different courts within 2 hours', () => {
    const groups = findClashes([mk('a', 'lhc', `${DAY}T09:00:00+05:00`), mk('b', 'cjl', `${DAY}T10:30:00+05:00`, ['m1', 'm2'])], courts, DAY);
    expect(groups).toHaveLength(1);
    expect(groups[0].cases.map((c) => c.id).sort()).toEqual(['a', 'b']);
    expect(groups[0].members.sort()).toEqual(['m1', 'm2']);
    expect(groups[0].doubleBooked).toEqual(['m1']);
    expect(groups[0].reason).toBe('time');
  });

  it('ignores cases in the same court', () => {
    expect(findClashes([mk('a', 'lhc', `${DAY}T09:00:00+05:00`), mk('b', 'lhc', `${DAY}T09:30:00+05:00`)], courts, DAY)).toEqual([]);
  });

  it('ignores same-city courts more than 2 hours apart', () => {
    expect(findClashes([mk('a', 'lhc', `${DAY}T09:00:00+05:00`), mk('b', 'cjl', `${DAY}T12:00:00+05:00`)], courts, DAY)).toEqual([]);
  });

  it('flags different cities on the same day regardless of time', () => {
    const groups = findClashes([mk('a', 'lhc', `${DAY}T09:00:00+05:00`), mk('b', 'ihc', `${DAY}T14:00:00+05:00`)], courts, DAY);
    expect(groups).toHaveLength(1);
    expect(groups[0].reason).toBe('city');
  });

  it('only looks at the given PKT day', () => {
    // 2026-11-22T20:00Z is 23 Nov 01:00 PKT — counts for the 23rd
    const groups = findClashes([mk('a', 'lhc', '2026-11-22T20:00:00Z'), mk('b', 'ihc', `${DAY}T09:00:00+05:00`), mk('c', 'cjl', '2026-11-24T09:00:00+05:00')], courts, DAY);
    expect(groups).toHaveLength(1);
    expect(groups[0].cases.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('merges overlapping clashes into one group, sorted by time', () => {
    const groups = findClashes(
      [mk('c', 'ihc', `${DAY}T11:00:00+05:00`), mk('a', 'lhc', `${DAY}T09:00:00+05:00`), mk('b', 'cjl', `${DAY}T10:00:00+05:00`)],
      courts,
      DAY,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].cases.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('skips closed cases', () => {
    expect(findClashes([mk('a', 'lhc', `${DAY}T09:00:00+05:00`), mk('b', 'cjl', `${DAY}T09:30:00+05:00`, ['m1'], 'decided')], courts, DAY)).toEqual([]);
  });
});

describe('overdueCases', () => {
  it('lists open cases whose listed date has passed, oldest first', () => {
    const rows = overdueCases(
      [
        mk('a', 'lhc', '2026-11-20T09:00:00+05:00'),
        mk('b', 'lhc', '2026-11-10T09:00:00+05:00'),
        mk('c', 'lhc', `${DAY}T09:00:00+05:00`),
        mk('d', 'lhc', '2026-11-01T09:00:00+05:00', ['m1'], 'disposed'),
        mk('e', 'lhc', undefined),
      ],
      DAY,
    );
    expect(rows.map((c) => c.id)).toEqual(['b', 'a']);
  });
});

describe('assignCover', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetToDemo();
    startFresh();
  });

  it('adds the member to the case once', () => {
    const c = addCase({ title: 'X v. Y', caseNo: '1', category: 'Civil', courtId: 'lhc', assignedTo: ['m1'] });
    assignCover(c.id, 'm2');
    assignCover(c.id, 'm2');
    expect(getDb().cases.find((x) => x.id === c.id)?.assignedTo).toEqual(['m1', 'm2']);
  });
});
