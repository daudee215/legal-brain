'use client';

import { CloudOff, Loader2 } from 'lucide-react';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { subscribeUploads, uploadState, uploadsVersion } from '../../lib/cloud/storage';
import { docBlob } from '../../lib/docText';
import { downloadBlob } from '../../lib/files';
import { getMode } from '../../lib/store';
import type { DocFile } from '../../types';
import { Badge } from '../ui';

/** Re-render when any upload's state changes. */
export function useUploads(): number {
  return useSyncExternalStore(subscribeUploads, uploadsVersion, () => 0);
}

/** True when the row points at real bytes (on this device or on the chamber server). */
export const hasFile = (d: DocFile) => !!(d.blobKey || d.storagePath);

/** "Uploading 40%" / "Not yet uploaded — will retry" / "Not uploaded yet" (someone else's pending file). */
export function UploadBadge({ doc }: { doc: DocFile }) {
  useUploads();
  const st = uploadState(doc);
  if (st?.state === 'uploading')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bronze/10 px-2 py-0.5 text-xs text-bronze" data-upload="uploading">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Uploading {Math.round(st.progress * 100)}%
      </span>
    );
  if (st?.state === 'pending')
    return (
      <span title={st.error ? `Last try: ${st.error}` : undefined} data-upload="pending">
        <Badge tone="bronze">
          <CloudOff className="mr-1 inline h-3 w-3" aria-hidden />
          Not yet uploaded — will retry
        </Badge>
      </span>
    );
  if (getMode() === 'cloud' && doc.blobKey && !doc.storagePath)
    return (
      <span title="The member who added this file has not been online since — it will appear when their device uploads it." data-upload="elsewhere">
        <Badge>Not uploaded yet</Badge>
      </span>
    );
  return null;
}

/** Open (new tab) and download a document, from this device or the chamber server. */
export function useDocFile(toast: { show: (m: string) => void }) {
  const [fetching, setFetching] = useState<string | null>(null);
  const { show } = toast;

  const blobOf = useCallback(
    async (d: DocFile) => {
      setFetching(d.id);
      try {
        const b = await docBlob(d);
        if (!b) show(getMode() === 'cloud' ? 'This file has not been uploaded to the chamber yet' : 'This file is not on this device');
        return b ?? undefined;
      } catch (e) {
        show(e instanceof Error ? e.message : 'Could not get this file');
        return undefined;
      } finally {
        setFetching(null);
      }
    },
    [show],
  );

  const open = useCallback(
    async (d: DocFile) => {
      const w = window.open('', '_blank');
      const b = await blobOf(d);
      if (!b) {
        w?.close();
        return;
      }
      const url = URL.createObjectURL(b.type ? b : new Blob([b], { type: d.mime ?? 'application/octet-stream' }));
      if (w) w.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    [blobOf],
  );

  const download = useCallback(
    async (d: DocFile) => {
      const b = await blobOf(d);
      if (b) downloadBlob(b, d.name, d.mime);
    },
    [blobOf],
  );

  return { open, download, fetching };
}
