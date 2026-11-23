import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seed } from '../../src/data/seed';
import { exportBackup, getDb, getMode, importBackup, resetToDemo, startFresh, subscribe, uid, updateDb } from '../../src/lib/store';
import { listCases } from '../../src/lib/repo';

beforeEach(() => {
  window.localStorage.clear();
  resetToDemo();
});

describe('store', () => {
  it('starts in demo mode with the seed', () => {
    expect(getMode()).toBe('demo');
    expect(getDb().cases).toHaveLength(seed.cases.length);
  });

  it('an edit switches to "mine", persists, and repo reads see it', async () => {
    updateDb((db) => {
      db.cases[0].stage = 'Final arguments';
    });
    expect(getMode()).toBe('mine');
    expect(JSON.parse(window.localStorage.getItem('lb.db.v1')!).db.cases[0].stage).toBe('Final arguments');
    expect((await listCases())[0].stage).toBe('Final arguments');
    expect(seed.cases[0].stage).not.toBe('Final arguments'); // seed never mutated
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const fn = vi.fn();
    const off = subscribe(fn);
    updateDb((db) => void db.diary.push({ id: 'x', date: '2026-11-23', authorId: 'm1', text: 'hi' }));
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    updateDb(() => {});
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('startFresh empties practice data but keeps the reference library', () => {
    startFresh();
    const db = getDb();
    expect(db.cases).toEqual([]);
    expect(db.clients).toEqual([]);
    expect(db.fees).toEqual([]);
    expect(db.statutes.length).toBeGreaterThan(0);
    expect(db.courts.length).toBeGreaterThan(0);
    expect(getMode()).toBe('mine');
  });

  it('backup round-trips and rejects garbage', () => {
    updateDb((db) => void (db.cases[0].stage = 'Evidence'));
    const json = exportBackup();
    resetToDemo();
    expect(getDb().cases[0].stage).not.toBe('Evidence');
    importBackup(json);
    expect(getDb().cases[0].stage).toBe('Evidence');
    expect(() => importBackup('{"nope":1}')).toThrow();
  });

  it('survives corrupt storage by falling back to the demo', () => {
    window.localStorage.setItem('lb.db.v1', '{not json');
    expect(getDb().cases).toHaveLength(seed.cases.length);
  });

  it('uid makes distinct ids with a prefix', () => {
    const a = uid('case');
    expect(a).toMatch(/^case_/);
    expect(uid('case')).not.toBe(a);
  });
});
