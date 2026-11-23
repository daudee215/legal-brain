/**
 * File bytes (PDFs, photos) kept on this device in IndexedDB. The practice data only stores the key.
 * Phase 2 moves these to Supabase Storage behind the same functions.
 */
import { createStore, del, get, set } from 'idb-keyval';
import { uid } from './store';

let store: ReturnType<typeof createStore> | null = null;
function s() {
  if (!store) store = createStore('legal-brain', 'files');
  return store;
}

export async function putFile(blob: Blob): Promise<string> {
  const key = uid('file');
  await set(key, blob, s());
  return key;
}

export async function getFile(key: string): Promise<Blob | undefined> {
  return get<Blob>(key, s());
}

export async function deleteFile(key: string): Promise<void> {
  await del(key, s());
}

/** Trigger a browser download of bytes or a blob. */
export function downloadBlob(data: Blob | Uint8Array, filename: string, mime = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
