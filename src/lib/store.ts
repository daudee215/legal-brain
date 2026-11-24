/**
 * The practice's data, kept on this device (localStorage) until Phase 2 adds cloud sync.
 *
 * - "demo" mode: nothing saved; every read returns the fresh demo seed (its dates move with today).
 * - "mine" mode: the first edit (or "Start my own practice") saves a copy; from then on that copy is the truth.
 *
 * All reads go through repo.ts (which calls getDb()); all writes go through updateDb().
 */
import { seed } from '../data/seed';
import type { Db } from '../types';

const KEY = 'lb.db.v1';
export type Mode = 'demo' | 'mine' | 'cloud';

/** When signed in to a chamber, the cloud copy replaces the device copy (see lib/cloud/sync.ts). */
let cloud: { db: Db; onLocalChange: (db: Db) => void } | null = null;
const CLOUD_CACHE = 'lb.cloud.cache.v1';

export function enterCloud(db: Db, onLocalChange: (db: Db) => void) {
  cloud = { db, onLocalChange };
  cacheCloud(db);
  listeners.forEach((fn) => fn());
}
/** A newer copy arrived from the server (or a merge finished): show it without pushing it back. */
export function applyRemote(db: Db) {
  if (!cloud) return;
  cloud.db = db;
  cacheCloud(db);
  listeners.forEach((fn) => fn());
}
export function leaveCloud() {
  cloud = null;
  try {
    window.localStorage.removeItem(CLOUD_CACHE);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}
/** Last cloud copy on this device, so the app opens instantly (and offline) before the server answers. */
export function readCloudCache(): Db | null {
  try {
    const raw = window.localStorage.getItem(CLOUD_CACHE);
    return raw ? upgrade(JSON.parse(raw) as Db) : null;
  } catch {
    return null;
  }
}
function cacheCloud(db: Db) {
  try {
    window.localStorage.setItem(CLOUD_CACHE, JSON.stringify(db));
  } catch {
    /* storage full: the server copy is the truth anyway */
  }
}

interface Saved {
  v: 1;
  mode: 'mine';
  savedAt: string;
  db: Db;
}

const listeners = new Set<() => void>();
let cache: { raw: string | null; db: Db } | null = null;

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function readRaw(): string | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function isDb(x: unknown): x is Db {
  const d = x as Db;
  return !!d && Array.isArray(d.cases) && Array.isArray(d.clients) && Array.isArray(d.courts) && !!d.chamber;
}

/**
 * Older saves lack collections added later — fill them so reads never crash.
 * Courts are reference data shipped with the app: courts added in a later release are appended.
 */
function upgrade(db: Db): Db {
  const courts = db.courts ?? [];
  return {
    ...db,
    courts: [...courts, ...seed.courts.filter((sc) => !courts.some((c) => c.id === sc.id))],
    fees: db.fees ?? [],
    tasks: db.tasks ?? [],
    deadlines: db.deadlines ?? [],
    precedents: db.precedents ?? [],
    expenses: db.expenses ?? [],
    settings: db.settings ?? [],
  };
}

export function getMode(): Mode {
  if (cloud) return 'cloud';
  const raw = readRaw();
  if (!raw) return 'demo';
  try {
    return isDb((JSON.parse(raw) as Saved).db) ? 'mine' : 'demo';
  } catch {
    return 'demo';
  }
}

export function getDb(): Db {
  if (cloud) return cloud.db;
  const raw = readRaw();
  if (!raw) return seed;
  if (cache && cache.raw === raw) return cache.db;
  try {
    const parsed = JSON.parse(raw) as Saved;
    if (!isDb(parsed.db)) return seed;
    const db = upgrade(parsed.db);
    cache = { raw, db };
    return db;
  } catch {
    return seed;
  }
}

function save(db: Db) {
  if (cloud) {
    cloud.db = db;
    cacheCloud(db);
    listeners.forEach((fn) => fn());
    cloud.onLocalChange(db);
    return;
  }
  const raw = JSON.stringify({ v: 1, mode: 'mine', savedAt: new Date().toISOString(), db } satisfies Saved);
  if (hasStorage()) {
    try {
      window.localStorage.setItem(KEY, raw);
    } catch {
      throw new Error('This device is out of storage space for Legal Brain. Export a backup and remove old files.');
    }
  }
  cache = { raw, db };
  listeners.forEach((fn) => fn());
}

/** Apply an edit to a copy of the current data and save it. The callback may mutate its argument. */
export function updateDb(fn: (db: Db) => void | Db): Db {
  const draft = structuredClone(getDb());
  const next = fn(draft) ?? draft;
  save(next);
  return next;
}

/** Keep the reference library (courts, laws, judgments, templates, news), drop all demo practice data. */
export function startFresh() {
  const base = getDb();
  save({
    ...structuredClone(base),
    cases: [],
    clients: [],
    causeList: [],
    diary: [],
    notifications: [],
    books: [],
    docs: [],
    fees: [],
    tasks: [],
    deadlines: [],
    precedents: [],
    expenses: [],
  });
}

export function resetToDemo() {
  if (hasStorage()) {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  cache = null;
  listeners.forEach((fn) => fn());
}

export function exportBackup(): string {
  return JSON.stringify({ v: 1, mode: 'mine', savedAt: new Date().toISOString(), db: getDb() } satisfies Saved, null, 2);
}

export function importBackup(json: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That file is not a Legal Brain backup.');
  }
  const db = (parsed as Saved)?.db;
  if (!isDb(db)) throw new Error('That file is not a Legal Brain backup.');
  save(upgrade(db));
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      fn();
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

let n = 0;
export function uid(prefix: string): string {
  n += 1;
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${n}`;
}
