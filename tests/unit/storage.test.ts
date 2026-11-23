import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../../src/data/seed';
import {
  bringSummary,
  getBlob,
  MAX_FILE_BYTES,
  pendingOps,
  removeShared,
  retryPending,
  safeFileName,
  setFileBackends,
  shareDocument,
  storagePathFor,
  storageUsed,
  tooBigMessage,
  uploadLocalFiles,
  uploadState,
  type LocalFiles,
  type RemoteFiles,
} from '../../src/lib/cloud/storage';
import type { Backend, Kind } from '../../src/lib/cloud/sync';
import { uploadLocal } from '../../src/lib/cloud/sync';
import type { Half } from '../../src/lib/cloud/split';
import { enterCloud, getDb, leaveCloud, resetToDemo, startFresh, updateDb } from '../../src/lib/store';
import type { Db, DocFile } from '../../src/types';

function fakeLocal() {
  const m = new Map<string, Blob>();
  const local: LocalFiles = {
    get: async (k) => m.get(k),
    put: async (k, b) => void m.set(k, b),
    remove: async (k) => void m.delete(k),
  };
  return { local, m };
}

function fakeRemote() {
  const objects = new Map<string, Blob>();
  const net = { offline: false };
  const calls = { upload: 0, download: 0, remove: [] as string[] };
  const guard = () => {
    if (net.offline) throw new TypeError('Failed to fetch');
  };
  const remote: RemoteFiles = {
    upload: async (path, blob, onProgress) => {
      calls.upload++;
      guard();
      onProgress?.(0.5);
      objects.set(path, blob);
      onProgress?.(1);
    },
    download: async (path) => {
      calls.download++;
      guard();
      const b = objects.get(path);
      if (!b) throw Object.assign(new Error('Object not found'), { statusCode: '404' });
      return b;
    },
    remove: async (path) => {
      calls.remove.push(path);
      guard();
      objects.delete(path); // a missing path is not an error, like Supabase
    },
  };
  return { remote, objects, net, calls };
}

const bytes = (s: string, type = 'application/pdf') => new Blob([s], { type });
const text = (b: Blob) => b.text();

function doc(id: string, over: Partial<DocFile> = {}): DocFile {
  return { id, name: `Petition ${id}.pdf`, folder: 'Pleadings', sizeKb: 1, uploadedOn: '2026-11-23', uploadedBy: 'u1', blobKey: `file_${id}`, mime: 'application/pdf', ...over };
}

function inChamber(docs: DocFile[] = []) {
  const db: Db = { ...structuredClone(seed), chamber: { ...seed.chamber, id: 'c1' }, docs };
  enterCloud(db, () => {});
}
const row = (id: string) => getDb().docs.find((d) => d.id === id);

let L: ReturnType<typeof fakeLocal>;
let R: ReturnType<typeof fakeRemote>;
beforeEach(() => {
  window.localStorage.clear();
  resetToDemo();
  L = fakeLocal();
  R = fakeRemote();
  setFileBackends({ local: L.local, remote: R.remote });
});
afterEach(() => {
  leaveCloud();
  setFileBackends({});
});

describe('getBlob (local cache first, then the chamber server)', () => {
  it('local hit: returns the cached bytes without touching the server', async () => {
    inChamber([doc('a', { storagePath: 'c1/a-Petition_a.pdf' })]);
    L.m.set('file_a', bytes('LOCAL'));
    const r = await getBlob(row('a')!);
    expect(r?.remote).toBe(false);
    expect(await text(r!.blob)).toBe('LOCAL');
    expect(R.calls.download).toBe(0);
  });

  it('remote fetch: downloads, caches under the synced key, and the next open is local', async () => {
    const d = doc('b', { storagePath: 'c1/b-Petition_b.pdf' });
    inChamber([d]);
    R.objects.set(d.storagePath!, bytes('%PDF-REMOTE'));
    const r = await getBlob(d);
    expect(r?.remote).toBe(true);
    expect(await text(r!.blob)).toBe('%PDF-REMOTE');
    expect(await text(L.m.get('file_b')!)).toBe('%PDF-REMOTE');
    const again = await getBlob(d);
    expect(again?.remote).toBe(false);
    expect(R.calls.download).toBe(1);
  });

  it('nowhere reachable: null when not uploaded, and never calls the server outside a chamber', async () => {
    inChamber([doc('c')]);
    expect(await getBlob(doc('c'))).toBeNull();
    leaveCloud();
    expect(await getBlob(doc('d', { storagePath: 'c1/d.pdf' }))).toBeNull();
    expect(R.calls.download).toBe(0);
  });

  it('a file removed from the server gives a sentence, not a crash', async () => {
    inChamber([doc('e', { storagePath: 'c1/e.pdf' })]);
    await expect(getBlob(row('e')!)).rejects.toThrow(/no longer on the chamber server/);
  });
});

describe('uploading', () => {
  it('records storagePath and size on the synced row', async () => {
    const d = doc('u1x', { name: 'Writ petition (final) — 2026.pdf' });
    inChamber([d]);
    const progress: number[] = [];
    expect(await shareDocument(d, bytes('12345'), (f) => progress.push(f))).toBe('uploaded');
    expect(row('u1x')).toMatchObject({ storagePath: 'c1/u1x-Writ_petition_final_2026.pdf', size: 5 });
    expect(R.objects.has('c1/u1x-Writ_petition_final_2026.pdf')).toBe(true);
    expect(progress.at(-1)).toBe(1);
    expect(pendingOps()).toEqual([]);
    expect(uploadState(row('u1x')!)).toBeNull();
  });

  it('demo / "mine" mode stays local: nothing is uploaded', async () => {
    expect(await shareDocument(doc('m'), bytes('x'))).toBe('local');
    expect(R.calls.upload).toBe(0);
  });

  it('pending retry: an offline upload is kept, marked pending, and sent when back online', async () => {
    const d = doc('p');
    inChamber([d]);
    L.m.set('file_p', bytes('%PDF-PENDING'));
    R.net.offline = true;
    expect(await shareDocument(d, L.m.get('file_p')!)).toBe('pending');
    expect(row('p')!.storagePath).toBeUndefined();
    expect(uploadState(row('p')!)).toMatchObject({ state: 'pending' });
    // Survives a reload: the queue lives in localStorage.
    expect(JSON.parse(window.localStorage.getItem('lb.files.pending.v1')!)).toEqual([{ op: 'upload', chamberId: 'c1', docId: 'p' }]);

    await retryPending(); // still offline
    expect(row('p')!.storagePath).toBeUndefined();

    R.net.offline = false;
    await retryPending();
    expect(row('p')!.storagePath).toBe('c1/p-Petition_p.pdf');
    expect(await text(R.objects.get('c1/p-Petition_p.pdf')!)).toBe('%PDF-PENDING');
    expect(pendingOps()).toEqual([]);
    expect(uploadState(row('p')!)).toBeNull();
  });

  it('retry drops queued uploads whose row was deleted meanwhile', async () => {
    inChamber([doc('gone')]);
    R.net.offline = true;
    await shareDocument(row('gone')!, bytes('x'));
    updateDb((db) => void (db.docs = []));
    R.net.offline = false;
    await retryPending();
    expect(pendingOps()).toEqual([]);
    expect(R.objects.size).toBe(0);
  });

  it('the 25 MB limit is explained before uploading — only in a chamber', () => {
    const big = { name: 'Record.pdf', size: MAX_FILE_BYTES + 1 };
    expect(tooBigMessage(big)).toBeNull();
    inChamber();
    expect(tooBigMessage(big)).toMatch(/Record\.pdf.*25 MB/);
    expect(tooBigMessage({ name: 'ok.pdf', size: MAX_FILE_BYTES })).toBeNull();
  });
});

describe('deleting', () => {
  it('removes the storage object', async () => {
    const d = doc('del', { storagePath: 'c1/del-x.pdf' });
    R.objects.set('c1/del-x.pdf', bytes('x'));
    inChamber([d]);
    await removeShared(d);
    expect(R.objects.has('c1/del-x.pdf')).toBe(false);
  });

  it('ignores not-found, and queues the delete when offline', async () => {
    inChamber();
    await expect(removeShared(doc('nf', { storagePath: 'c1/missing.pdf' }))).resolves.toBeUndefined();
    R.objects.set('c1/later.pdf', bytes('x'));
    R.net.offline = true;
    await removeShared(doc('off', { storagePath: 'c1/later.pdf' }));
    expect(pendingOps()).toEqual([{ op: 'delete', chamberId: 'c1', path: 'c1/later.pdf' }]);
    R.net.offline = false;
    await retryPending();
    expect(R.objects.has('c1/later.pdf')).toBe(false);
    expect(pendingOps()).toEqual([]);
  });

  it('deleting a not-yet-uploaded file cancels its pending upload', async () => {
    inChamber([doc('q')]);
    R.net.offline = true;
    await shareDocument(row('q')!, bytes('x'));
    await removeShared(row('q')!);
    expect(pendingOps()).toEqual([]);
  });
});

describe('bringing this device’s files into a new chamber', () => {
  it('uploads each local file, continues on error and reports counts', async () => {
    L.m.set('file_1', bytes('one'));
    L.m.set('file_2', bytes('two'));
    L.m.set('file_big', new Blob([new Uint8Array(MAX_FILE_BYTES + 1)]));
    const docs = [doc('1'), doc('2'), doc('big'), doc('nobytes'), doc('demo', { blobKey: undefined })];
    let failNext = true;
    const flaky: RemoteFiles = {
      ...R.remote,
      upload: async (p, b) => {
        if (p.includes('/2-') && failNext) {
          failNext = false;
          throw new TypeError('Failed to fetch');
        }
        return R.remote.upload(p, b);
      },
    };
    setFileBackends({ local: L.local, remote: flaky });
    const seen: number[] = [];
    const r = await uploadLocalFiles('c9', docs, (p) => seen.push(p.done));
    expect(r).toMatchObject({ total: 3, uploaded: 1, pending: 1, tooBig: ['Petition big.pdf'] });
    expect(r.paths['1']).toEqual({ storagePath: 'c9/1-Petition_1.pdf', size: 3 });
    expect(pendingOps()).toEqual([{ op: 'upload', chamberId: 'c9', docId: '2' }]);
    expect(seen.at(-1)).toBe(4);
    expect(bringSummary(r)).toMatch(/Copied 1 of 3 files.*1 could not be uploaded.*Petition big\.pdf/);
  });

  it('uploadLocal sends the rows already pointing at their shared copies', async () => {
    startFresh();
    updateDb((db) => void db.docs.push(doc('mine1')));
    L.m.set('file_mine1', bytes('mine'));
    const saved: Record<Kind, Half> = { data: {}, billing: {} };
    const be = { saveDoc: async (_c: string, kind: Kind, data: Half) => ((saved[kind] = data), 2) } as unknown as Backend;
    const r = await uploadLocal('c2', { backend: be });
    expect(r.uploaded).toBe(1);
    expect((saved.data.docs as DocFile[])[0]).toMatchObject({ id: 'mine1', storagePath: 'c2/mine1-Petition_mine1.pdf', size: 4 });
  });
});

describe('helpers', () => {
  it('storage paths are <chamber>/<doc id>-<safe name>', () => {
    expect(storagePathFor('c1', { id: 'doc_1', name: 'آرڈر Order #3 (copy).PDF' })).toBe('c1/doc_1-Order_3_copy_.PDF');
    expect(safeFileName('')).toBe('file');
    expect(safeFileName(`${'x'.repeat(200)}.pdf`)).toHaveLength(100);
    expect(safeFileName(`${'x'.repeat(200)}.pdf`).endsWith('.pdf')).toBe(true);
  });

  it('storage used counts only uploaded files, by exact size when recorded', () => {
    expect(storageUsed([doc('a', { storagePath: 'p', size: 1000 }), doc('b', { storagePath: 'q', sizeKb: 2 }), doc('c', { size: 5000 })])).toBe(1000 + 2048);
  });
});
