import { describe, expect, it } from 'vitest';
import { seed } from '../../src/data/seed';
import { composeDb, splitDb } from '../../src/lib/cloud/split';

describe('split / compose', () => {
  it('round-trips the practice data and never uploads the reference library', () => {
    const { data, billing } = splitDb(seed);
    expect(Object.keys(data)).not.toContain('statutes');
    expect(Object.keys(data)).not.toContain('fees');
    expect(Object.keys(billing).sort()).toEqual(['expenses', 'fees']);
    const back = composeDb({ chamber: seed.chamber, me: seed.me, data, billing });
    expect(back.cases).toEqual(seed.cases);
    expect(back.fees).toEqual(seed.fees);
    expect(back.statutes).toBe(seed.statutes);
  });

  it('a member without billing access gets empty fees, not a crash', () => {
    const { data } = splitDb(seed);
    const db = composeDb({ chamber: seed.chamber, me: seed.me, data, billing: null });
    expect(db.fees).toEqual([]);
    expect(db.expenses).toEqual([]);
  });

  it('an empty new chamber composes to empty collections', () => {
    const db = composeDb({ chamber: { id: 'c', name: 'X', members: [] }, me: seed.me, data: {}, billing: {} });
    expect(db.cases).toEqual([]);
    expect(db.courts.length).toBeGreaterThan(0);
  });
});
