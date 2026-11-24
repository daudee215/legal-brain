/**
 * Real document storage and PDF text search:
 * - file bytes go to IndexedDB through files.ts; the DocFile row goes into the practice data;
 * - in a cloud chamber the bytes are also uploaded to the chamber's storage (cloud/storage.ts), and a
 *   file opened on another device is downloaded and cached through the same `docBlob` path;
 * - text pulled out of each PDF (one string per page) is kept in IndexedDB under `text:<blobKey>`.
 * pdfjs is loaded only inside the functions that need it, so nothing runs at build time.
 */
import { createStore, del, get, set } from 'idb-keyval';
import { getBlob, removeShared, shareDocument, tooBigMessage } from './cloud/storage';
import { deleteFile, putFile } from './files';
import { todayKey } from './dates';
import { getDb, getMode, uid, updateDb } from './store';
import type { DocFile } from '../types';

let store: ReturnType<typeof createStore> | null = null;
function s() {
  // A separate database: idb-keyval opens one object store per database.
  if (!store) store = createStore('legal-brain-text', 'text');
  return store;
}

export async function setDocText(blobKey: string, pages: string[]): Promise<void> {
  await set(`text:${blobKey}`, pages, s());
}
export async function getDocText(blobKey: string): Promise<string[] | undefined> {
  return get<string[]>(`text:${blobKey}`, s());
}
export async function deleteDocText(blobKey: string): Promise<void> {
  await del(`text:${blobKey}`, s());
}

export function isPdf(file: { name: string; type?: string }): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

/** Text of each page of a PDF, with lines rebuilt from the position of each text run. Browser only. */
export async function extractPdfText(data: ArrayBuffer | Uint8Array | Blob): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  }
  const buf = data instanceof Blob ? await data.arrayBuffer() : data;
  // pdfjs takes ownership of the buffer it is given, so hand it a copy.
  const bytes = new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).slice();
  const task = pdfjs.getDocument({ data: bytes });
  const doc = await task.promise;
  const pages: string[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const rows: { y: number; parts: { x: number; s: string }[] }[] = [];
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const x = Number(item.transform[4]);
        const y = Number(item.transform[5]);
        let row = rows.find((r) => Math.abs(r.y - y) < 3);
        if (!row) {
          row = { y, parts: [] };
          rows.push(row);
        }
        row.parts.push({ x, s: item.str });
      }
      rows.sort((a, b) => b.y - a.y);
      pages.push(rows.map((r) => r.parts.sort((a, b) => a.x - b.x).map((q) => q.s).join(' ')).join('\n'));
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return pages;
}

export interface TextHit {
  page: number;
  snippet: string;
}

/** Each page containing `q` (case-insensitive), with ~60 characters of context either side of the first hit. */
export function searchPages(pages: string[], q: string): TextHit[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const out: TextHit[] = [];
  pages.forEach((text, i) => {
    const flat = text.replace(/\s+/g, ' ');
    const at = flat.toLowerCase().indexOf(needle);
    if (at < 0) return;
    const start = Math.max(0, at - 60);
    const end = Math.min(flat.length, at + needle.length + 60);
    out.push({ page: i + 1, snippet: `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}` });
  });
  return out;
}

export interface DocSearchHit extends TextHit {
  doc: DocFile;
}

/**
 * Search the stored text of every uploaded PDF. With `fetchMissing` (cloud chambers), PDFs shared by
 * other members whose text is not on this device yet are downloaded and indexed first.
 */
export async function searchDocs(docs: DocFile[], q: string, opts: { fetchMissing?: boolean } = {}): Promise<DocSearchHit[]> {
  if (opts.fetchMissing) await indexMissing(docs);
  const out: DocSearchHit[] = [];
  for (const doc of docs) {
    if (!doc.blobKey) continue;
    const pages = await getDocText(doc.blobKey);
    if (!pages) continue;
    for (const h of searchPages(pages, q)) out.push({ ...h, doc });
  }
  return out;
}

/** Law-book PDFs live in this folder; the general Documents page hides it so a shelf stays private. */
export const BOOK_FOLDER = 'Law Books';

export interface DocMeta {
  folder: string;
  caseId?: string;
  uploadedBy: string;
}

/**
 * Store bytes on this device and add the DocFile row; in a cloud chamber also upload the bytes (a failed
 * upload stays on this device and is retried). The returned row has `storagePath` when the upload finished.
 */
export async function saveDocument(blob: Blob, name: string, meta: DocMeta, onProgress?: (fraction: number) => void): Promise<DocFile> {
  const big = tooBigMessage({ name, size: blob.size });
  if (big) throw new Error(big);
  const blobKey = await putFile(blob);
  const doc: DocFile = {
    id: uid('doc'),
    name,
    folder: meta.folder,
    caseId: meta.caseId || undefined,
    sizeKb: Math.max(1, Math.round(blob.size / 1024)),
    size: blob.size,
    uploadedOn: todayKey(),
    uploadedBy: meta.uploadedBy,
    blobKey,
    mime: blob.type || undefined,
  };
  try {
    updateDb((db) => {
      db.docs.unshift(doc);
    });
  } catch (e) {
    await deleteFile(blobKey);
    throw e;
  }
  if ((await shareDocument(doc, blob, onProgress)) === 'uploaded') return getDocRow(doc.id) ?? doc;
  return doc;
}

const getDocRow = (id: string) => getDb().docs.find((d) => d.id === id);

/** Index a PDF's text on this device if it is not indexed yet. */
async function indexText(doc: DocFile, blob: Blob): Promise<void> {
  if (!doc.blobKey || !isPdf({ name: doc.name, type: doc.mime ?? blob.type })) return;
  if (await getDocText(doc.blobKey)) return;
  try {
    await setDocText(doc.blobKey, await extractPdfText(blob));
  } catch {
    /* scanned or protected PDF */
  }
}

/**
 * The bytes of a document from wherever they are: this device first, then the chamber server
 * (cached on this device afterwards, and a downloaded PDF gets its text indexed for search).
 * Used by open/download, the paper-book builder and search, so they all work on every member's device.
 */
export async function docBlob(doc: DocFile): Promise<Blob | null> {
  const r = await getBlob(doc);
  if (!r) return null;
  if (r.remote) void indexText(doc, r.blob);
  return r.blob;
}

const tried = new Set<string>();
/** Download and index shared PDFs whose text is not on this device yet (each tried once per session). */
export async function indexMissing(docs: DocFile[]): Promise<void> {
  for (const doc of docs) {
    if (!doc.blobKey || !doc.storagePath || tried.has(doc.id) || !isPdf({ name: doc.name, type: doc.mime })) continue;
    tried.add(doc.id);
    if (await getDocText(doc.blobKey)) continue;
    try {
      const r = await getBlob(doc);
      if (r) await indexText(doc, r.blob);
    } catch {
      /* offline or gone — skip */
    }
  }
}

/**
 * Upload a user's file; PDFs also get their text indexed for search. Returns the row, the page count
 * indexed and whether the bytes reached the chamber ('local' outside a cloud chamber).
 */
export async function uploadDocument(
  file: File,
  meta: DocMeta,
  onProgress?: (fraction: number) => void,
): Promise<{ doc: DocFile; pages: number; shared: 'local' | 'uploaded' | 'pending' }> {
  const doc = await saveDocument(file, file.name, meta, onProgress);
  const shared = doc.storagePath ? 'uploaded' : getMode() === 'cloud' ? 'pending' : 'local';
  let pages = 0;
  if (isPdf(file) && doc.blobKey) {
    try {
      const text = await extractPdfText(file);
      await setDocText(doc.blobKey, text);
      pages = text.length;
    } catch {
      /* scanned or protected PDF — stored, but not searchable */
    }
  }
  return { doc, pages, shared };
}

/** Remove the row, its bytes and its search text (and, in a cloud chamber, the file on the server). */
export async function removeDocument(doc: DocFile): Promise<void> {
  updateDb((db) => {
    db.docs = db.docs.filter((d) => d.id !== doc.id);
  });
  await removeShared(doc);
  if (doc.blobKey) {
    await deleteFile(doc.blobKey);
    await deleteDocText(doc.blobKey);
  }
}
