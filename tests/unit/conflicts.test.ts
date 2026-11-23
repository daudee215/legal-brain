import { describe, expect, it } from 'vitest';
import { conflictCheck, splitTitle, tokens } from '../../src/lib/conflicts';
import { seed } from '../../src/data/seed';

describe('conflict check helpers', () => {
  it('tokenises and drops honorifics and company suffixes', () => {
    expect(tokens('Mst. Rukhsana')).toEqual(['rukhsana']);
    expect(tokens('M/s Pak Agro Industries (Pvt) Ltd')).toEqual(['pak', 'agro', 'industries']);
  });
  it('splits titles on v. / vs / versus and drops trailing descriptors', () => {
    expect(splitTitle('Fatima Bibi v. Kamran Ali (Maintenance)')).toEqual(['Fatima Bibi', 'Kamran Ali']);
    expect(splitTitle('A vs B')).toEqual(['A', 'B']);
    expect(splitTitle('A versus B')).toEqual(['A', 'B']);
  });
});

describe('conflictCheck', () => {
  it('finds an existing client and their cases, case-insensitively', () => {
    const r = conflictCheck('muhammad usman', seed);
    expect(r.clients.map((c) => c.client.id)).toEqual(['c1']);
    expect(r.clients[0].cases.length).toBeGreaterThan(0);
  });

  it('flags a name that appears against our client', () => {
    const r = conflictCheck('Kamran Ali', seed);
    expect(r.clients).toHaveLength(0);
    const hit = r.parties.find((p) => p.case.id === 'k2')!;
    expect(hit).toMatchObject({ side: 'respondent', opposing: true });
  });

  it('ignores Mst. in the query and the title', () => {
    const r = conflictCheck('Mst Rukhsana', seed);
    expect(r.parties.some((p) => p.case.id === 'k11' && p.side === 'respondent')).toBe(true);
  });

  it('matches company names without (Pvt) Ltd', () => {
    const r = conflictCheck('Zahid Traders (Pvt) Ltd', seed);
    const sides = r.parties.map((p) => `${p.case.id}:${p.side}`);
    expect(sides).toContain('k3:petitioner');
    expect(sides).toContain('k10:respondent');
  });

  it('returns nothing for an empty or noise-only query', () => {
    expect(conflictCheck('  ', seed)).toEqual({ clients: [], parties: [] });
    expect(conflictCheck('Mst. v.', seed)).toEqual({ clients: [], parties: [] });
  });
});
