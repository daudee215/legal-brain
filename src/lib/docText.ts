/**
 * Real document storage and PDF text search, all on this device:
 * - file bytes go to IndexedDB through files.ts; the DocFile row goes into the practice data;
 * - text pulled out of each PDF (one string per page) is kept in IndexedDB under `text:<blobKey>`.
 * pdfjs is loaded only inside the functions that need it, so nothing runs at build time.
 */
import { createStore, del, get, set } from 'idb-keyval';
import { deleteFile, putFile } from './files';
import { todayKey } from './dates';
import { uid, updateDb } from './store';
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

/** Search the stored text of every uploaded PDF. */
export async function searchDocs(docs: DocFile[], q: string): Promise<DocSearchHit[]> {
  const out: DocSearchHit[] = [];
  for (const doc of docs) {
    if (!doc.blobKey) continue;
    const pages = await getDocText(doc.blobKey);
    if (!pages) continue;
    for (const h of searchPages(pages, q)) out.push({ ...h, doc });
  }
  return out;
}

export interface DocMeta {
  folder: string;
  caseId?: string;
  uploadedBy: string;
}

/** Store bytes on this device and add the DocFile row. */
export async function saveDocument(blob: Blob, name: string, meta: DocMeta): Promise<DocFile> {
  const blobKey = await putFile(blob);
  const doc: DocFile = {
    id: uid('doc'),
    name,
    folder: meta.folder,
    caseId: meta.caseId || undefined,
    sizeKb: Math.max(1, Math.round(blob.size / 1024)),
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
  return doc;
}

/** Upload a user's file; PDFs also get their text indexed for search. Returns the row and the page count indexed. */
export async function uploadDocument(file: File, meta: DocMeta): Promise<{ doc: DocFile; pages: number }> {
  const doc = await saveDocument(file, file.name, meta);
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
  return { doc, pages };
}

/** Remove the row, its bytes and its search text. */
export async function removeDocument(doc: DocFile): Promise<void> {
  updateDb((db) => {
    db.docs = db.docs.filter((d) => d.id !== doc.id);
  });
  if (doc.blobKey) {
    await deleteFile(doc.blobKey);
    await deleteDocText(doc.blobKey);
  }
}
