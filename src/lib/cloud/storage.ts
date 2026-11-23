/**
 * Shared chamber files: the bytes of every uploaded document live in the private Supabase Storage
 * bucket "chamber-files" at `<chamberId>/<docId>-<safe name>`, so every member can open them on any device.
 *
 * - This device's IndexedDB (lib/files.ts) stays the cache: a file is read from it first, and a file
 *   downloaded from the chamber is put there under its synced `blobKey`.
 * - An upload that fails (offline, server trouble) is never lost: the bytes stay on this device, the
 *   document is queued in `lb.files.pending.v1` and retried when the connection returns or the app opens.
 * - Demo and "mine" modes never touch the server.
 *
 * Talks to storage only through the small `LocalFiles` / `RemoteFiles` interfaces so tests can inject fakes.
 */
import type { DocFile } from '../../types';
import { deleteFile as idbDelete, getFile as idbGet, putFileAt as idbPut } from '../files';
import { getDb, getMode, updateDb } from '../store';
import { friendlyError, supabase, supabaseKey, supabaseUrl } from './client';

export const BUCKET = 'chamber-files';
/** Per-file limit set on the bucket (supabase/storage.sql). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
/** Supabase free plan: 1 GB of file storage for the whole project. */
export const PLAN_BYTES = 1024 * 1024 * 1024;
export const WARN_BYTES = 900 * 1024 * 1024;

export interface LocalFiles {
  get(key: string): Promise<Blob | undefined>;
  put(key: string, blob: Blob): Promise<void>;
  remove(key: string): Promise<void>;
}
export interface RemoteFiles {
  /** Upload (or overwrite) one object. `onProgress` gets 0…1. */
  upload(path: string, blob: Blob, onProgress?: (fraction: number) => void): Promise<void>;
  download(path: string): Promise<Blob>;
  /** Removing a path that is not there is not an error. */
  remove(path: string): Promise<void>;
}

const idbLocal: LocalFiles = { get: idbGet, put: idbPut, remove: idbDelete };

function storageError(e: unknown): Error {
  const err = e as { message?: string; statusCode?: string | number; status?: number };
  const m = err?.message ?? String(e);
  const code = Number(err?.statusCode ?? err?.status ?? 0);
  if (code === 413 || /maximum allowed size|Payload too large|too large/i.test(m)) return new Error('This file is larger than the 25 MB the chamber storage accepts.');
  if (code === 404 || /not found/i.test(m)) return Object.assign(new Error('This file is no longer on the chamber server.'), { notFound: true });
  if (code === 403 || /row-level security|Unauthorized|permission/i.test(m)) return new Error('You do not have access to this file.');
  return new Error(friendlyError(e));
}

/** Supabase Storage. Uploads go through XHR so we can show real progress; the rest through supabase-js. */
export function supabaseFiles(): RemoteFiles {
  const sb = supabase();
  const bucket = () => sb.storage.from(BUCKET);
  return {
    async upload(path, blob, onProgress) {
      const contentType = blob.type || 'application/octet-stream';
      if (typeof XMLHttpRequest === 'undefined') {
        const { error } = await bucket().upload(path, blob, { upsert: true, contentType });
        if (error) throw storageError(error);
        onProgress?.(1);
        return;
      }
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Please log in again.');
      const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('authorization', `Bearer ${token}`);
        xhr.setRequestHeader('apikey', supabaseKey);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.setRequestHeader('cache-control', 'max-age=3600');
        xhr.setRequestHeader('content-type', contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total) onProgress?.(e.loaded / e.total);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress?.(1);
            return resolve();
          }
          let body: { message?: string; error?: string; statusCode?: string } = {};
          try {
            body = JSON.parse(xhr.responseText);
          } catch {
            /* not JSON */
          }
          reject(storageError({ message: body.message ?? body.error ?? `Upload failed (${xhr.status})`, statusCode: body.statusCode ?? xhr.status }));
        };
        xhr.onerror = () => reject(new TypeError('Failed to fetch'));
        xhr.ontimeout = () => reject(new TypeError('Failed to fetch (timeout)'));
        xhr.send(blob);
      });
    },
    async download(path) {
      const { data, error } = await bucket().download(path);
      if (error || !data) throw storageError(error ?? new Error('not found'));
      return data;
    },
    async remove(path) {
      const { error } = await bucket().remove([path]);
      if (error && !/not found/i.test(error.message)) throw storageError(error);
    },
  };
}

let injected: { local?: LocalFiles; remote?: RemoteFiles } = {};
/** Tests: use fake storage. Pass {} to go back to IndexedDB + Supabase. */
export function setFileBackends(b: { local?: LocalFiles; remote?: RemoteFiles }) {
  injected = b;
}
const local = () => injected.local ?? idbLocal;
const remote = () => injected.remote ?? supabaseFiles();

// ── Helpers ──────────────────────────────────────────────────────────────────
function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const m = String((e as { message?: string })?.message ?? e);
  return /Failed to fetch|NetworkError|network|Load failed|fetch failed|timeout|ECONN|ENOTFOUND/i.test(m);
}

/** The chamber this device is signed in to, or null in demo / "mine" mode. */
export function cloudChamberId(): string | null {
  return getMode() === 'cloud' ? getDb().chamber.id : null;
}

/** Storage keys allow few characters safely: keep letters, digits, dot, dash, underscore. */
export function safeFileName(name: string): string {
  const clean = name
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.]+|_+$/g, '');
  if (clean.length <= 100) return clean || 'file';
  const dot = clean.lastIndexOf('.');
  const ext = dot > 0 && clean.length - dot <= 10 ? clean.slice(dot) : '';
  return clean.slice(0, 100 - ext.length) + ext;
}

export function storagePathFor(chamberId: string, doc: Pick<DocFile, 'id' | 'name'>): string {
  return `${chamberId}/${doc.id}-${safeFileName(doc.name)}`;
}

/** Local cache key for a document's bytes. */
export const cacheKey = (doc: Pick<DocFile, 'id' | 'blobKey'>) => doc.blobKey ?? `doc:${doc.id}`;

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${Number((n / 1024 / 1024 / 1024).toFixed(2))} GB`;
  if (n >= 1024 * 1024) return `${Number((n / 1024 / 1024).toFixed(1))} MB`;
  return n <= 0 ? '0 KB' : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** A friendly sentence when a file is too big for the chamber storage, else null. Only applies in cloud mode. */
export function tooBigMessage(file: { name: string; size: number }): string | null {
  if (!cloudChamberId() || file.size <= MAX_FILE_BYTES) return null;
  return `“${file.name}” is ${formatBytes(file.size)} — shared chamber files can be up to 25 MB each. Compress or split the PDF (or scan at a lower resolution) and upload it again.`;
}

/** Bytes this chamber's uploaded files take on the server. */
export function storageUsed(docs: DocFile[]): number {
  return docs.filter((d) => d.storagePath).reduce((n, d) => n + (d.size ?? d.sizeKb * 1024), 0);
}

// ── Pending queue (survives reloads) ─────────────────────────────────────────
const PENDING = 'lb.files.pending.v1';
export type PendingOp = { op: 'upload'; chamberId: string; docId: string } | { op: 'delete'; chamberId: string; path: string };

function readQueue(): PendingOp[] {
  try {
    const raw = window.localStorage.getItem(PENDING);
    const q = raw ? (JSON.parse(raw) as PendingOp[]) : [];
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}
function writeQueue(q: PendingOp[]) {
  try {
    if (q.length) window.localStorage.setItem(PENDING, JSON.stringify(q));
    else window.localStorage.removeItem(PENDING);
  } catch {
    /* storage full — the retry will just not survive a reload */
  }
  emit();
}
const sameOp = (a: PendingOp, b: PendingOp) =>
  a.op === b.op && a.chamberId === b.chamberId && (a.op === 'upload' ? a.docId === (b as typeof a).docId : a.path === (b as typeof a).path);
function enqueue(op: PendingOp) {
  const q = readQueue();
  if (!q.some((x) => sameOp(x, op))) writeQueue([...q, op]);
}
function dequeue(op: PendingOp) {
  writeQueue(readQueue().filter((x) => !sameOp(x, op)));
}
export function pendingOps(): PendingOp[] {
  return readQueue();
}

// ── Upload state (for badges and progress) ───────────────────────────────────
export type UploadState = { state: 'uploading'; progress: number } | { state: 'pending'; error: string };
const live = new Map<string, { state: 'uploading'; progress: number } | { state: 'failed'; error: string }>();
const listeners = new Set<() => void>();
let version = 0;
function emit() {
  version++;
  listeners.forEach((fn) => fn());
}
export function subscribeUploads(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
/** Changes whenever any upload state changes (for useSyncExternalStore). */
export function uploadsVersion(): number {
  return version;
}
/** null when the file is uploaded (or this is not a cloud chamber). */
export function uploadState(doc: Pick<DocFile, 'id' | 'storagePath'>): UploadState | null {
  const l = live.get(doc.id);
  if (l?.state === 'uploading') return l;
  const chamberId = cloudChamberId();
  if (!chamberId || doc.storagePath) return null;
  if (readQueue().some((o) => o.op === 'upload' && o.chamberId === chamberId && o.docId === doc.id)) return { state: 'pending', error: l?.state === 'failed' ? l.error : '' };
  return null;
}

// ── Upload / download / delete ───────────────────────────────────────────────
/** Record where the file landed on the server (synced to every member). False if the row is gone. */
function recordUploaded(chamberId: string, docId: string, path: string, size: number): boolean {
  if (cloudChamberId() !== chamberId) return false;
  if (!getDb().docs.some((d) => d.id === docId)) return false;
  updateDb((db) => {
    const d = db.docs.find((x) => x.id === docId);
    if (d) {
      d.storagePath = path;
      d.size = size;
    }
  });
  return true;
}

async function uploadOne(chamberId: string, doc: DocFile, blob: Blob, onProgress?: (fraction: number) => void): Promise<boolean> {
  const op: PendingOp = { op: 'upload', chamberId, docId: doc.id };
  enqueue(op); // before trying: a crash or closed tab mid-upload is retried next time
  const path = storagePathFor(chamberId, doc);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    live.set(doc.id, { state: 'failed', error: 'Offline' });
    emit();
    return false;
  }
  live.set(doc.id, { state: 'uploading', progress: 0 });
  emit();
  try {
    await remote().upload(path, blob, (f) => {
      live.set(doc.id, { state: 'uploading', progress: f });
      onProgress?.(f);
      emit();
    });
    live.delete(doc.id);
    if (recordUploaded(chamberId, doc.id, path, blob.size)) dequeue(op);
    else if (cloudChamberId() === chamberId) {
      // Deleted while it was uploading: don't leave the object behind.
      dequeue(op);
      await remote().remove(path).catch(() => {});
    } else emit(); // signed out / switched chamber mid-upload: keep it queued for that chamber
    return true;
  } catch (e) {
    live.set(doc.id, { state: 'failed', error: isNetworkError(e) ? 'Offline' : storageError(e).message });
    emit();
    return false;
  }
}

/**
 * In a cloud chamber, put a just-saved document's bytes on the chamber server.
 * Returns 'local' outside cloud mode, 'uploaded' on success, 'pending' when it will be retried.
 */
export async function shareDocument(doc: DocFile, blob: Blob, onProgress?: (fraction: number) => void): Promise<'local' | 'uploaded' | 'pending'> {
  const chamberId = cloudChamberId();
  if (!chamberId) return 'local';
  return (await uploadOne(chamberId, doc, blob, onProgress)) ? 'uploaded' : 'pending';
}

let retrying: Promise<void> | null = null;

async function runPending(): Promise<void> {
  const chamberId = cloudChamberId();
  if (!chamberId) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  for (const op of readQueue()) {
    if (op.chamberId !== chamberId || cloudChamberId() !== chamberId) continue;
    if (op.op === 'delete') {
      try {
        await remote().remove(op.path);
        dequeue(op);
      } catch (e) {
        if (!isNetworkError(e)) dequeue(op); // permission etc.: retrying will not help
      }
      continue;
    }
    const doc = getDb().docs.find((d) => d.id === op.docId);
    if (!doc || doc.storagePath) {
      dequeue(op);
      continue;
    }
    if (live.get(doc.id)?.state === 'uploading') continue; // first try still running
    const blob = await local().get(cacheKey(doc));
    if (!blob) {
      dequeue(op); // bytes gone from this device: nothing left to send
      continue;
    }
    await uploadOne(chamberId, doc, blob);
  }
}

/** Retry every queued upload/delete for the chamber this device is in now (one run at a time). */
export function retryPending(): Promise<void> {
  // .finally, not try/finally inside: a run with nothing to await must not clear this before it is set.
  retrying ??= runPending().finally(() => {
    retrying = null;
  });
  return retrying;
}

/**
 * The bytes of a document: this device's cache first; otherwise, in a cloud chamber, download from
 * the chamber server and cache them. null when the file is nowhere this device can reach.
 */
export async function getBlob(doc: DocFile): Promise<{ blob: Blob; remote: boolean } | null> {
  const key = cacheKey(doc);
  const hit = await local().get(key).catch(() => undefined);
  if (hit) return { blob: hit, remote: false };
  if (!doc.storagePath || !cloudChamberId()) return null;
  let blob: Blob;
  try {
    blob = await remote().download(doc.storagePath);
  } catch (e) {
    throw isNetworkError(e) ? new Error('No internet connection — this file is not on this device yet. Try again when you are online.') : storageError(e);
  }
  if (!blob.type && doc.mime) blob = new Blob([blob], { type: doc.mime });
  await local()
    .put(key, blob)
    .catch(() => {}); // cache full: still open it
  return { blob, remote: true };
}

/** In a cloud chamber, remove a deleted document's object from the server (queued if offline). */
export async function removeShared(doc: DocFile): Promise<void> {
  const chamberId = cloudChamberId();
  if (!chamberId) return;
  dequeue({ op: 'upload', chamberId, docId: doc.id });
  live.delete(doc.id);
  if (!doc.storagePath) return;
  try {
    await remote().remove(doc.storagePath);
  } catch (e) {
    if ((e as { notFound?: boolean }).notFound) return;
    if (isNetworkError(e)) enqueue({ op: 'delete', chamberId, path: doc.storagePath });
    else console.warn('Could not remove the shared file', doc.storagePath, e);
  }
}

export interface BringResult {
  total: number;
  uploaded: number;
  /** Will be retried from this device once it is in the chamber. */
  pending: number;
  /** Over 25 MB: kept on this device only. */
  tooBig: string[];
  /** storagePath and size for each uploaded document. */
  paths: Record<string, { storagePath: string; size: number }>;
}

/** One sentence for the person who just brought their files into a chamber. */
export function bringSummary(r: BringResult): string {
  const parts = [`Copied ${r.uploaded} of ${r.total} file${r.total === 1 ? '' : 's'} to the chamber.`];
  if (r.pending) parts.push(`${r.pending} could not be uploaded just now — they stay on this device and will be retried automatically.`);
  if (r.tooBig.length) parts.push(`Over 25 MB, kept on this device only: ${r.tooBig.join(', ')}.`);
  return parts.join(' ');
}

/**
 * Moving this device's own practice into a new chamber: upload every local file (continue on error).
 * Failures are queued for the new chamber and retried once this device is signed in to it.
 */
export async function uploadLocalFiles(chamberId: string, docs: DocFile[], onProgress?: (p: { done: number; total: number; name: string }) => void): Promise<BringResult> {
  const withBytes = docs.filter((d) => d.blobKey);
  const res: BringResult = { total: withBytes.length, uploaded: 0, pending: 0, tooBig: [], paths: {} };
  let done = 0;
  for (const doc of withBytes) {
    onProgress?.({ done, total: withBytes.length, name: doc.name });
    const blob = await local()
      .get(cacheKey(doc))
      .catch(() => undefined);
    if (!blob) {
      res.total--; // listed, but its bytes are not on this device
    } else if (blob.size > MAX_FILE_BYTES) {
      res.tooBig.push(doc.name);
    } else {
      const path = storagePathFor(chamberId, doc);
      try {
        await remote().upload(path, blob);
        res.paths[doc.id] = { storagePath: path, size: blob.size };
        res.uploaded++;
      } catch {
        enqueue({ op: 'upload', chamberId, docId: doc.id });
        res.pending++;
      }
    }
    done++;
  }
  onProgress?.({ done, total: withBytes.length, name: '' });
  return res;
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
let stopWatch: (() => void) | null = null;
/** Call when the app is showing a cloud chamber: retry now ("next app open") and whenever we come back online. */
export function watchPendingUploads(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (!stopWatch) {
    const online = () => void retryPending();
    window.addEventListener('online', online);
    stopWatch = () => {
      window.removeEventListener('online', online);
      stopWatch = null;
    };
  }
  void retryPending();
  return () => stopWatch?.();
}
