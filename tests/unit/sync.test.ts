import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seed } from '../../src/data/seed';
import type { Backend, Kind } from '../../src/lib/cloud/sync';
import { getSyncStatus, startSync, stopSync, uploadLocal } from '../../src/lib/cloud/sync';
import type { Half } from '../../src/lib/cloud/split';
import { getDb, getMode, readCloudCache, resetToDemo, startFresh, updateDb } from '../../src/lib/store';
import type { Case, Role } from '../../src/types';

const kase = (id: string): Case => ({ ...structuredClone(seed.cases[0]), id, title: `Case ${id}` });

/** In-memory stand-in for Supabase with the same versioning rules as save_chamber_doc. */
function fakeServer(role: Role) {
  const rows: Record<Kind, { data: Half; version: number }> = {
    data: { data: { cases: [kase('A')] }, version: 3 },
    billing: { data: { fees: [], expenses: [] }, version: 2 },
  };
  const calls: { kind: Kind; expected: number; result: number | 'error' }[] = [];
  const net = { offline: false };
  const guard = () => {
    if (net.offline) throw new TypeError('Failed to fetch');
  };
  const be: Backend = {
    userId: async () => 'u1',
    loadChamber: async () => (guard(), { id: 'c1', name: 'Khan & Associates' }),
    loadMembers: async () => (guard(), [{ user_id: 'u1', role, name: 'Ayesha Khan', email: 'a@example.com' }]),
    loadDoc: async (_c, kind) => {
      guard();
      if (kind === 'billing' && role !== 'senior') return null;
      return structuredClone(rows[kind]);
    },
    saveDoc: async (_c, kind, data, expected) => {
      if (net.offline) {
        calls.push({ kind, expected, result: 'error' });
        throw new TypeError('Failed to fetch');
      }
      if (kind === 'billing' && role !== 'senior') throw new Error('only a senior can change fees');
      if (rows[kind].version !== expected) {
        calls.push({ kind, expected, result: -1 });
        return -1;
      }
      rows[kind] = { data: structuredClone(data), version: expected + 1 };
      calls.push({ kind, expected, result: expected + 1 });
      return expected + 1;
    },
    listen: () => () => {},
  };
  /** Another member saves directly on the server. */
  const otherSaves = (kind: Kind, fn: (d: Half) => void) => {
    const d = structuredClone(rows[kind].data);
    fn(d);
    rows[kind] = { data: d, version: rows[kind].version + 1 };
  };
  return { be, rows, calls, net, otherSaves };
}

const ids = (h: Half) => (h.cases as Case[]).map((c) => c.id).sort();

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  resetToDemo();
});
afterEach(() => {
  stopSync();
  vi.useRealTimers();
});

describe('cloud sync', () => {
  it('loads the server copy into cloud mode', async () => {
    const srv = fakeServer('senior');
    await startSync('c1', { backend: srv.be });
    expect(getMode()).toBe('cloud');
    expect(getDb().cases.map((c) => c.id)).toEqual(['A']);
    expect(getDb().me).toMatchObject({ id: 'u1', role: 'senior' });
    expect(getSyncStatus().status).toBe('saved');
  });

  it('on a version conflict it merges with the newer server copy and retries', async () => {
    const srv = fakeServer('senior');
    await startSync('c1', { backend: srv.be });
    updateDb((db) => void db.cases.push(kase('L')));
    srv.otherSaves('data', (d) => void (d.cases as Case[]).push(kase('R')));

    await vi.advanceTimersByTimeAsync(800);

    expect(srv.calls.map((c) => c.result)).toEqual([-1, 5]);
    expect(ids(srv.rows.data.data)).toEqual(['A', 'L', 'R']);
    expect(getDb().cases.map((c) => c.id).sort()).toEqual(['A', 'L', 'R']);
    expect(getSyncStatus().status).toBe('saved');
  });

  it('pushes only the half that changed (debounced)', async () => {
    const srv = fakeServer('senior');
    await startSync('c1', { backend: srv.be });
    updateDb((db) => void db.cases.push(kase('X')));
    updateDb((db) => void db.cases.push(kase('Y')));
    await vi.advanceTimersByTimeAsync(300);
    expect(srv.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(500);
    expect(srv.calls.map((c) => c.kind)).toEqual(['data']);
    expect(ids(srv.rows.data.data)).toEqual(['A', 'X', 'Y']);
  });

  it('a junior never pushes billing and never receives it', async () => {
    const srv = fakeServer('junior');
    await startSync('c1', { backend: srv.be });
    expect(getDb().fees).toEqual([]);
    updateDb((db) => {
      db.cases.push(kase('J'));
      db.fees.push({ caseId: 'J', agreed: 50000, payments: [] } as unknown as (typeof db.fees)[number]);
    });
    await vi.advanceTimersByTimeAsync(800);
    expect(srv.calls.map((c) => c.kind)).toEqual(['data']);
    expect(srv.rows.billing.version).toBe(2);
    expect(getSyncStatus().status).toBe('saved');
  });

  it('offline: keeps the edit on this device and pushes it when back online', async () => {
    const srv = fakeServer('senior');
    await startSync('c1', { backend: srv.be });
    srv.net.offline = true;
    updateDb((db) => void db.cases.push(kase('OFF')));
    await vi.advanceTimersByTimeAsync(800);

    expect(getSyncStatus().status).toBe('offline');
    expect(readCloudCache()?.cases.map((c) => c.id)).toContain('OFF');
    expect(ids(srv.rows.data.data)).toEqual(['A']);

    srv.net.offline = false;
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(10);
    expect(ids(srv.rows.data.data)).toEqual(['A', 'OFF']);
    expect(getSyncStatus().status).toBe('saved');
  });

  it('offline across a reload: unsynced edits in the cache are merged and pushed on the next start', async () => {
    const srv = fakeServer('senior');
    await startSync('c1', { backend: srv.be });
    srv.net.offline = true;
    updateDb((db) => void db.cases.push(kase('KEEP')));
    await vi.advanceTimersByTimeAsync(800);
    // "Reload": engine state is gone, but the cloud cache + last agreed base stay on the device.
    const cache = readCloudCache();
    stopSyncKeepingCache();
    srv.otherSaves('data', (d) => void (d.cases as Case[]).push(kase('R')));
    srv.net.offline = false;
    window.localStorage.setItem('lb.cloud.cache.v1', JSON.stringify(cache));
    await startSync('c1', { backend: srv.be });
    await vi.advanceTimersByTimeAsync(10);
    expect(ids(srv.rows.data.data)).toEqual(['A', 'KEEP', 'R']);
  });

  it('uploadLocal copies this device’s own practice into a new chamber', async () => {
    startFresh();
    updateDb((db) => void db.cases.push(kase('MINE')));
    const srv = fakeServer('senior');
    srv.rows.data = { data: {}, version: 1 };
    srv.rows.billing = { data: {}, version: 1 };
    await uploadLocal('c1', { backend: srv.be });
    expect(ids(srv.rows.data.data)).toEqual(['MINE']);
    expect(srv.rows.billing.version).toBe(2);
  });
});

/** Simulate closing the tab: drop the in-memory engine but keep what localStorage holds. */
function stopSyncKeepingCache() {
  const meta = window.localStorage.getItem('lb.cloud.meta.v1');
  stopSync();
  if (meta) window.localStorage.setItem('lb.cloud.meta.v1', meta);
}

describe('role rules in sync', () => {
  it('a clerk\u2019s forbidden edit is undone and never sent, while an allowed one is saved', async () => {
    const srv = fakeServer('clerk');
    await startSync('c1', { backend: srv.be });
    updateDb((db) => {
      db.cases.push(kase('NEW'));
      db.diary.push({ id: 'd1', date: '2026-11-24T10:00:00Z', text: 'Spoke to client', authorId: 'u1' });
    });
    await vi.advanceTimersByTimeAsync(800);

    expect(ids(srv.rows.data.data)).toEqual(['A']);
    expect((srv.rows.data.data.diary as unknown[]).length).toBe(1);
    expect(getDb().cases.map((c) => c.id)).toEqual(['A']);
    expect(getSyncStatus().undone).toEqual(['cases']);
    expect(getSyncStatus().status).toBe('saved');
  });
});
