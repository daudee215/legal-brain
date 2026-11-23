/**
 * Cloud sync engine: keeps this device's copy of the chamber in step with Supabase.
 *
 * - On start it shows the cached copy at once (instant, works offline), then loads the server copy.
 * - Local edits are pushed ~700 ms after the last change, half by half ("data" for everyone,
 *   "billing" for seniors only), with optimistic versioning. On a version conflict it fetches the
 *   latest row, three-way merges (base = last server-agreed copy) and retries.
 * - Offline: edits stay in the cloud cache on this device and are pushed when the connection returns
 *   (also across reloads — the last agreed copy is kept in `lb.cloud.meta.v1`).
 * - Realtime: other members' saves arrive through postgres_changes and are applied (or merged).
 *
 * Talks to the server only through a small `Backend` interface so tests can inject a fake.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Member, Role } from '../../types';
import { applyRemote, enterCloud, getDb, getMode, leaveCloud, readCloudCache } from '../store';
import { friendlyError, supabase } from './client';
import { mergeDocs } from './merge';
import { BILLING_KEYS, composeDb, DATA_KEYS, splitDb, type Half } from './split';
import { uploadLocalFiles, type BringResult } from './storage';
import type { DocFile } from '../../types';

export type Kind = 'data' | 'billing';
export interface MemberRow {
  user_id: string;
  role: Role;
  name: string;
  email: string;
}
export interface DocRow {
  data: Half;
  version: number;
}

/** Everything the engine needs from the server. */
export interface Backend {
  userId(): Promise<string | null>;
  loadChamber(chamberId: string): Promise<{ id: string; name: string } | null>;
  loadMembers(chamberId: string): Promise<MemberRow[]>;
  /** null when the row is not readable (billing for non-seniors). */
  loadDoc(chamberId: string, kind: Kind): Promise<DocRow | null>;
  /** New version, or -1 when someone else saved since `expected`. */
  saveDoc(chamberId: string, kind: Kind, data: Half, expected: number): Promise<number>;
  /** Call `fn` when a half of this chamber changes on the server. Returns an unsubscribe. */
  listen(chamberId: string, fn: (kind: Kind, version: number) => void): () => void;
}

function check<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}

export function supabaseBackend(sb: SupabaseClient): Backend {
  const table = (k: Kind) => (k === 'data' ? 'chamber_data' : 'chamber_billing');
  return {
    async userId() {
      const { data } = await sb.auth.getSession();
      return data.session?.user.id ?? null;
    },
    async loadChamber(id) {
      return check(await sb.from('chambers').select('id,name').eq('id', id).maybeSingle()) as { id: string; name: string } | null;
    },
    async loadMembers(id) {
      return (check(await sb.from('members').select('user_id,role,name,email').eq('chamber_id', id).order('joined_at')) ?? []) as MemberRow[];
    },
    async loadDoc(id, kind) {
      const row = check(await sb.from(table(kind)).select('data,version').eq('chamber_id', id).maybeSingle()) as { data: Half; version: number } | null;
      return row ? { data: row.data ?? {}, version: Number(row.version) } : null;
    },
    async saveDoc(id, kind, data, expected) {
      const v = check(await sb.rpc('save_chamber_doc', { p_chamber: id, p_kind: kind, p_data: data, p_expected: expected }));
      return Number(v);
    },
    listen(id, fn) {
      const ch = sb.channel(`chamber:${id}`);
      for (const kind of ['data', 'billing'] as Kind[]) {
        ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: table(kind), filter: `chamber_id=eq.${id}` }, (p) =>
          fn(kind, Number((p.new as { version?: number }).version ?? 0)),
        );
      }
      ch.subscribe();
      return () => {
        void sb.removeChannel(ch);
      };
    },
  };
}

// ── Status store ─────────────────────────────────────────────────────────────
export type SyncStatus = 'off' | 'loading' | 'saved' | 'saving' | 'offline' | 'error';
export interface SyncState {
  status: SyncStatus;
  /** Last error, in words a lawyer can act on ('' when none). */
  error: string;
  chamberId: string | null;
  /** True when the server says this user is no longer a member of the chamber. */
  removed: boolean;
}
let state: SyncState = { status: 'off', error: '', chamberId: null, removed: false };
const syncListeners = new Set<() => void>();
function setState(p: Partial<SyncState>) {
  state = { ...state, ...p };
  syncListeners.forEach((fn) => fn());
}
export function getSyncStatus(): SyncState {
  return state;
}
export function subscribeSync(fn: () => void): () => void {
  syncListeners.add(fn);
  return () => {
    syncListeners.delete(fn);
  };
}

// ── Engine ───────────────────────────────────────────────────────────────────
const META = 'lb.cloud.meta.v1';
export const DEBOUNCE_MS = 700;
const MAX_TRIES = 5;

interface Meta {
  chamberId: string;
  base: { data: Half; billing: Half | null };
  versions: { data: number; billing: number };
}

let injected: Backend | null = null;
/** Tests: use a fake server. Pass null to go back to Supabase. */
export function setBackend(b: Backend | null) {
  injected = b;
}
function backend(): Backend {
  return injected ?? supabaseBackend(supabase());
}

/** Canonical comparison: Postgres jsonb re-orders object keys, so compare with sorted keys. */
function canon(x: unknown): string {
  return JSON.stringify(x, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]])) : v,
  );
}
const same = (a: unknown, b: unknown) => canon(a) === canon(b);

/** A server half with every collection present (a new chamber starts as {}). */
function norm(kind: Kind, h: Half | null | undefined): Half {
  const out: Half = {};
  for (const k of kind === 'data' ? DATA_KEYS : BILLING_KEYS) out[k] = Array.isArray(h?.[k]) ? (h![k] as unknown[]) : [];
  return out;
}

interface Session {
  chamberId: string;
  be: Backend;
  chamber: { id: string; name: string };
  members: MemberRow[];
  me: Member | null;
  base: { data: Half; billing: Half | null };
  versions: { data: number; billing: number };
  loaded: boolean;
  pushing: boolean;
  dirty: boolean;
  refreshAfterPush: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  retry: ReturnType<typeof setTimeout> | null;
  backoff: number;
  unlisten: (() => void) | null;
  cleanup: (() => void)[];
  stopped: boolean;
}
let s: Session | null = null;

function readMeta(chamberId: string): Meta | null {
  try {
    const raw = window.localStorage.getItem(META);
    const m = raw ? (JSON.parse(raw) as Meta) : null;
    return m && m.chamberId === chamberId ? m : null;
  } catch {
    return null;
  }
}
function writeMeta() {
  if (!s || !s.loaded) return;
  try {
    window.localStorage.setItem(META, JSON.stringify({ chamberId: s.chamberId, base: s.base, versions: s.versions } satisfies Meta));
  } catch {
    /* storage full — sync still works for this session */
  }
}
function clearMeta() {
  try {
    window.localStorage.removeItem(META);
  } catch {
    /* ignore */
  }
}

const isSenior = () => s?.me?.role === 'senior';

function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const m = String((e as { message?: string })?.message ?? e);
  return /Failed to fetch|NetworkError|network|Load failed|fetch failed|timeout|ECONN|ENOTFOUND/i.test(m);
}

/** Show a new copy built from the two halves (without pushing it back). */
function show(data: Half, billing: Half | null) {
  if (!s || !s.me) return;
  const db = composeDb({
    chamber: { id: s.chamber.id, name: s.chamber.name, members: s.members.map(toMember) },
    me: s.me,
    data,
    billing,
  });
  if (getMode() === 'cloud') applyRemote(db);
  else enterCloud(db, onLocalChange);
}

const toMember = (m: MemberRow): Member => ({ id: m.user_id, name: m.name, email: m.email, role: m.role });

function localHalves(): { data: Half; billing: Half | null } {
  const { data, billing } = splitDb(getDb());
  return { data, billing: isSenior() ? billing : (s?.base.billing ?? null) };
}

function hasLocalChanges(): boolean {
  if (!s || !s.loaded || getMode() !== 'cloud') return false;
  const l = localHalves();
  return !same(l.data, s.base.data) || (isSenior() && !same(l.billing, s.base.billing));
}

function onLocalChange() {
  if (!s) return;
  // Pending edits are "Saving…" from the first keystroke, not only once the debounce fires.
  if (state.status === 'saved') setState({ status: 'saving' });
  schedulePush();
}

function schedulePush(delay = DEBOUNCE_MS) {
  if (!s || s.stopped) return;
  if (s.timer) clearTimeout(s.timer);
  s.timer = setTimeout(() => {
    if (s) s.timer = null;
    void push();
  }, delay);
}

function scheduleRetry() {
  if (!s || s.stopped) return;
  if (s.retry) clearTimeout(s.retry);
  const wait = s.backoff;
  s.backoff = Math.min(s.backoff * 2, 60_000);
  s.retry = setTimeout(() => {
    if (!s) return;
    s.retry = null;
    void (s.loaded ? push() : pull());
  }, wait);
}

function fail(e: unknown) {
  if (!s) return;
  if (isNetworkError(e)) setState({ status: 'offline', error: 'Offline — changes kept on this device' });
  else setState({ status: 'error', error: friendlyError(e) });
  scheduleRetry();
}

/**
 * Load chamber, members and both halves from the server and reconcile with this device:
 * unsynced local edits (local ≠ last agreed base) are merged on top of the server copy.
 */
async function pull(): Promise<void> {
  const cur = s;
  if (!cur || cur.stopped) return;
  if (cur.pushing) {
    cur.refreshAfterPush = true;
    return;
  }
  try {
    const uid = await cur.be.userId();
    const [chamber, members, dataRow] = await Promise.all([cur.be.loadChamber(cur.chamberId), cur.be.loadMembers(cur.chamberId), cur.be.loadDoc(cur.chamberId, 'data')]);
    const mine = members.find((m) => m.user_id === uid);
    if (s !== cur || cur.stopped) return;
    if (!uid || !chamber || !dataRow || !mine) {
      setState({ status: 'error', error: 'You are not a member of this chamber any more.', removed: true });
      return;
    }
    const billingRow = mine.role === 'senior' ? await cur.be.loadDoc(cur.chamberId, 'billing') : null;
    if (s !== cur || cur.stopped) return;

    // What this device has that the server hasn't seen yet.
    const meta = cur.loaded ? { base: cur.base } : readMeta(cur.chamberId);
    const hadLocal = getMode() === 'cloud' && !!meta;
    const local = hadLocal ? splitDb(getDb()) : null;

    cur.chamber = chamber;
    cur.members = members;
    cur.me = toMember(mine);
    const remote = { data: norm('data', dataRow.data), billing: billingRow ? norm('billing', billingRow.data) : null };
    const data = local && meta ? (mergeDocs(meta.base.data, local.data, remote.data) as Half) : remote.data;
    const billing =
      remote.billing && local && meta?.base.billing ? (mergeDocs(meta.base.billing, local.billing, remote.billing) as Half) : remote.billing;
    cur.base = remote;
    cur.versions = { data: dataRow.version, billing: billingRow?.version ?? 0 };
    cur.loaded = true;
    cur.backoff = 2000;
    show(data, billing);
    writeMeta();
    if (hasLocalChanges()) {
      setState({ status: 'saving', error: '' });
      schedulePush(0);
    } else setState({ status: 'saved', error: '', removed: false });
  } catch (e) {
    if (s === cur) fail(e);
  }
}

/** Push the halves that differ from the last agreed copy; merge and retry on conflict. */
async function push(): Promise<void> {
  const cur = s;
  if (!cur || cur.stopped) return;
  if (!cur.loaded) return void pull();
  if (cur.pushing) {
    cur.dirty = true;
    return;
  }
  if (!hasLocalChanges()) {
    if (state.status !== 'saved') setState({ status: 'saved', error: '' });
    return;
  }
  cur.pushing = true;
  setState({ status: 'saving', error: '' });
  try {
    for (let attempt = 0; ; attempt++) {
      if (attempt >= MAX_TRIES) throw new Error('Could not save after several tries — someone else is editing a lot. Will try again shortly.');
      const local = localHalves();
      const kinds: Kind[] = [];
      if (!same(local.data, cur.base.data)) kinds.push('data');
      if (isSenior() && local.billing && !same(local.billing, cur.base.billing)) kinds.push('billing');
      if (kinds.length === 0) break;
      let conflict = false;
      for (const kind of kinds) {
        const sent = local[kind] as Half;
        const v = await cur.be.saveDoc(cur.chamberId, kind, sent, cur.versions[kind]);
        if (s !== cur || cur.stopped) return;
        if (v !== -1) {
          cur.base[kind] = sent;
          cur.versions[kind] = v;
          writeMeta();
          continue;
        }
        conflict = true;
        const row = await cur.be.loadDoc(cur.chamberId, kind);
        if (s !== cur || cur.stopped) return;
        if (!row) throw new Error('This chamber is no longer available.');
        // Merge against what is on screen *now* (edits made while we were waiting included).
        const now = localHalves();
        const remote = norm(kind, row.data);
        const merged = mergeDocs(cur.base[kind] ?? {}, (now[kind] ?? {}) as Half, remote) as Half;
        cur.base[kind] = remote;
        cur.versions[kind] = row.version;
        writeMeta();
        show(kind === 'data' ? merged : now.data, kind === 'billing' ? merged : now.billing);
      }
      if (!conflict) break;
    }
    cur.backoff = 2000;
    setState({ status: hasLocalChanges() ? 'saving' : 'saved', error: '' });
  } catch (e) {
    if (s === cur) fail(e);
  } finally {
    cur.pushing = false;
  }
  if (s !== cur || cur.stopped) return;
  if (cur.refreshAfterPush) {
    cur.refreshAfterPush = false;
    void pull();
  } else if (cur.dirty || (state.status === 'saving' && hasLocalChanges())) {
    cur.dirty = false;
    schedulePush();
  }
}

async function onRemote(kind: Kind, version: number) {
  const cur = s;
  if (!cur || cur.stopped || !cur.loaded) return;
  if (version <= cur.versions[kind]) return;
  if (kind === 'billing' && !isSenior()) return;
  if (cur.pushing) {
    cur.refreshAfterPush = true;
    return;
  }
  try {
    const row = await cur.be.loadDoc(cur.chamberId, kind);
    if (s !== cur || cur.stopped || !row || row.version <= cur.versions[kind]) return;
    if (cur.pushing) {
      cur.refreshAfterPush = true;
      return;
    }
    const now = localHalves();
    const localChanged = !same(now[kind], cur.base[kind]);
    const remote = norm(kind, row.data);
    const next = localChanged ? (mergeDocs(cur.base[kind] ?? {}, (now[kind] ?? {}) as Half, remote) as Half) : remote;
    cur.base[kind] = remote;
    cur.versions[kind] = row.version;
    writeMeta();
    show(kind === 'data' ? next : now.data, kind === 'billing' ? next : now.billing);
    if (localChanged) schedulePush();
  } catch (e) {
    if (s === cur) fail(e);
  }
}

/** Start syncing a chamber. Shows the cached copy first when it belongs to the same chamber. */
export async function startSync(chamberId: string, opts: { backend?: Backend } = {}): Promise<void> {
  if (s && s.chamberId === chamberId && !s.stopped) return;
  teardown();
  const be = opts.backend ?? backend();
  const cur: Session = {
    chamberId,
    be,
    chamber: { id: chamberId, name: '' },
    members: [],
    me: null,
    base: { data: {}, billing: null },
    versions: { data: 0, billing: 0 },
    loaded: false,
    pushing: false,
    dirty: false,
    refreshAfterPush: false,
    timer: null,
    retry: null,
    backoff: 2000,
    unlisten: null,
    cleanup: [],
    stopped: false,
  };
  s = cur;
  setState({ status: 'loading', error: '', chamberId, removed: false });

  const cached = readCloudCache();
  if (cached && cached.chamber.id === chamberId && readMeta(chamberId)) enterCloud(cached, onLocalChange);

  if (typeof window !== 'undefined') {
    const online = () => {
      if (s !== cur) return;
      cur.backoff = 2000;
      void (cur.loaded ? (hasLocalChanges() ? push() : pull()) : pull());
    };
    const focus = () => {
      if (s === cur && cur.loaded && !cur.pushing && !hasLocalChanges()) void pull();
    };
    window.addEventListener('online', online);
    window.addEventListener('focus', focus);
    cur.cleanup.push(() => window.removeEventListener('online', online), () => window.removeEventListener('focus', focus));
  }
  try {
    cur.unlisten = be.listen(chamberId, (kind, version) => void onRemote(kind, version));
  } catch {
    /* realtime unavailable — focus/online refresh still keeps us current */
  }
  await pull();
}

/** Re-load chamber, members and data now (e.g. after changing members). */
export function refreshSync(): Promise<void> {
  return pull();
}

/** Push pending changes now and wait for them (used before signing out). */
export async function flushSync(): Promise<void> {
  if (!s) return;
  if (s.timer) {
    clearTimeout(s.timer);
    s.timer = null;
  }
  await push();
}

/** True when this device has edits the server hasn't accepted yet. */
export function hasUnsyncedChanges(): boolean {
  return hasLocalChanges();
}

function teardown() {
  if (!s) return;
  s.stopped = true;
  if (s.timer) clearTimeout(s.timer);
  if (s.retry) clearTimeout(s.retry);
  s.unlisten?.();
  s.cleanup.forEach((fn) => fn());
  s = null;
}

/** Stop syncing and go back to this device's own data (demo or "mine"). Clears the cloud cache. */
export function stopSync() {
  teardown();
  clearMeta();
  leaveCloud();
  setState({ status: 'off', error: '', chamberId: null, removed: false });
}

/**
 * Copy this device's own practice ("mine" mode) into a brand-new chamber (both rows at version 1).
 * Uploaded files go first (continue on error; failures are retried later from this device), so the
 * document rows arrive already pointing at their shared copies. Returns the file counts.
 */
export async function uploadLocal(
  chamberId: string,
  opts: { backend?: Backend; onFileProgress?: (p: { done: number; total: number; name: string }) => void } = {},
): Promise<BringResult> {
  const none: BringResult = { total: 0, uploaded: 0, pending: 0, tooBig: [], paths: {} };
  const be = opts.backend ?? backend();
  if (getMode() !== 'mine') return none;
  const { data, billing } = splitDb(getDb());
  const docs = data.docs as DocFile[];
  const files = docs.some((d) => d.blobKey) ? await uploadLocalFiles(chamberId, docs, opts.onFileProgress) : none;
  data.docs = docs.map((d) => (files.paths[d.id] ? { ...d, ...files.paths[d.id] } : d));
  const v1 = await be.saveDoc(chamberId, 'data', data, 1);
  const v2 = await be.saveDoc(chamberId, 'billing', billing, 1);
  if (v1 === -1 || v2 === -1) throw new Error('The new chamber already has data — nothing was copied.');
  return files;
}
