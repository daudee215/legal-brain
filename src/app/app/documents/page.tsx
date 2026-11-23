'use client';

import { Download, ExternalLink, FileText, Folder, Loader2, Lock, Search, Trash2, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRole } from '../../../components/shell/RoleProvider';
import { Badge, DataTable, EmptyState, inputCls, PageHeader } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { formatPk } from '../../../lib/dates';
import { removeDocument, searchDocs, uploadDocument, type DocSearchHit } from '../../../lib/docText';
import { downloadBlob, getFile } from '../../../lib/files';
import { can } from '../../../lib/permissions';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import { Loading } from '../../../components/ui/Loading';
import type { DocFile } from '../../../types';

const FOLDERS = ['All', 'Pleadings', 'Orders', 'Evidence', 'Correspondence', 'Personal'];

function size(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function Highlight({ text, q }: { text: string; q: string }) {
  const at = text.toLowerCase().indexOf(q.trim().toLowerCase());
  if (at < 0 || !q.trim()) return <>{text}</>;
  const n = q.trim().length;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-bronze/25 px-0.5 text-ink">{text.slice(at, at + n)}</mark>
      {text.slice(at + n)}
    </>
  );
}

function DocumentsPageBody({ db }: { db: Snapshot }) {
  const { role, member } = useRole();
  const toast = useToast();
  const [folder, setFolder] = useState('All');
  const [over, setOver] = useState(false);
  const [upFolder, setUpFolder] = useState('Pleadings');
  const [upCase, setUpCase] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<DocSearchHit[] | null>(null);
  const rows = db.docs.filter((d) => folder === 'All' || d.folder === folder);
  const canUpload = can(role, 'documents.upload');

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      searchDocs(db.docs, q).then((h) => {
        if (alive) setHits(h);
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, db.docs]);

  async function upload(files: FileList | File[] | null) {
    if (!files || !files.length) return;
    setError(null);
    const list = Array.from(files);
    let done = 0;
    let indexed = 0;
    for (const f of list) {
      setBusy(`Saving ${f.name} (${done + 1} of ${list.length})…`);
      try {
        const r = await uploadDocument(f, { folder: upFolder, caseId: upCase || undefined, uploadedBy: member.id });
        done++;
        if (r.pages) indexed++;
      } catch (e) {
        setError(e instanceof Error ? e.message : `Could not save ${f.name}.`);
      }
    }
    setBusy(null);
    if (done) toast.show(`${done} file${done === 1 ? '' : 's'} saved${indexed ? ` · ${indexed} PDF${indexed === 1 ? '' : 's'} searchable` : ''}`);
  }

  async function blobOf(d: DocFile) {
    const b = d.blobKey ? await getFile(d.blobKey) : undefined;
    if (!b) toast.show('This file is not on this device');
    return b;
  }

  async function open(d: DocFile) {
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
  }

  async function remove(d: DocFile) {
    if (!window.confirm(`Delete "${d.name}" from this device? This cannot be undone.`)) return;
    await removeDocument(d);
    toast.show('File deleted');
  }

  const iconBtn = 'rounded-lg p-1.5 text-ink-soft transition hover:bg-line/50 hover:text-ink';

  return (
    <>
      <PageHeader title="Documents" subtitle="Pleadings, orders and evidence for every case." />
      <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-ok/10 px-3 py-1 text-sm text-ok">
        <Lock className="h-4 w-4" /> Stored privately on this device · cloud sync arrives in Phase 2
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Folders" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {FOLDERS.map((f) => {
            const n = f === 'All' ? db.docs.length : db.docs.filter((d) => d.folder === f).length;
            return (
              <button
                key={f}
                onClick={() => {
                  setFolder(f);
                  if (f !== 'All') setUpFolder(f);
                }}
                aria-pressed={folder === f}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm ${folder === f ? 'bg-night text-ivory' : 'bg-paper hover:bg-line/50'}`}
              >
                <Folder className="h-4 w-4" />
                <span className="flex-1 text-left">{f}</span>
                <span className="text-xs opacity-70">{n}</span>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              className={`${inputCls} pl-9`}
              placeholder="Search inside your PDFs — e.g. “489-F” or a party name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search inside PDFs"
            />
          </div>
          {hits && (
            <div className="rounded-2xl border border-line bg-paper p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
                {hits.length} result{hits.length === 1 ? '' : 's'} inside uploaded PDFs
              </p>
              {hits.length === 0 ? (
                <p className="text-sm text-ink-soft">No matches. Only PDFs you uploaded (with selectable text) are searchable.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {hits.slice(0, 50).map((h) => (
                    <li key={`${h.doc.id}-${h.page}`} className="py-2.5">
                      <button type="button" onClick={() => void open(h.doc)} className="inline-flex items-center gap-2 text-sm font-medium hover:text-bronze">
                        <FileText className="h-4 w-4 text-bronze" /> {h.doc.name}
                        <Badge tone="bronze">p. {h.page}</Badge>
                      </button>
                      <p className="mt-1 text-sm text-ink-soft">
                        <Highlight text={h.snippet} q={q} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {canUpload && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                void upload(e.dataTransfer.files);
              }}
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${over ? 'border-bronze bg-bronze/5' : 'border-line bg-paper'}`}
            >
              {busy ? (
                <p className="inline-flex items-center gap-2 text-sm text-ink-soft">
                  <Loader2 className="h-4 w-4 animate-spin text-bronze" /> {busy}
                </p>
              ) : (
                <>
                  <UploadCloud className="mx-auto h-8 w-8 text-bronze" />
                  <p className="mt-2 text-sm font-medium">Drag files here to upload</p>
                  <label className="mt-1 inline-block cursor-pointer text-sm text-bronze hover:underline">
                    or choose files
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        void upload(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </>
              )}
              <div className="mx-auto mt-4 grid max-w-md gap-2 text-left text-sm sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs text-ink-soft">Folder</span>
                  <select className={inputCls} value={upFolder} onChange={(e) => setUpFolder(e.target.value)}>
                    {FOLDERS.slice(1).map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs text-ink-soft">Case (optional)</span>
                  <select className={inputCls} value={upCase} onChange={(e) => setUpCase(e.target.value)}>
                    <option value="">— none —</option>
                    {db.cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-xs text-ink-soft">Files are kept on this device. PDFs with text become searchable.</p>
              {error && <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            </div>
          )}
          <DataTable
            rows={rows}
            rowKey={(d) => d.id}
            empty={<EmptyState title="This folder is empty" />}
            columns={[
              {
                header: 'Name',
                cell: (d) => (
                  <span className="inline-flex flex-wrap items-center gap-2 font-medium">
                    <FileText className="h-4 w-4 shrink-0 text-bronze" /> <span className="break-all">{d.name}</span>
                    {!d.blobKey && <Badge>demo file</Badge>}
                  </span>
                ),
              },
              {
                header: 'Case',
                cell: (d) => {
                  const c = db.cases.find((x) => x.id === d.caseId);
                  return c ? (
                    <Link href={`/app/case/?id=${c.id}`} className="text-ink-soft hover:text-bronze">
                      {c.title}
                    </Link>
                  ) : (
                    <span className="text-ink-soft">—</span>
                  );
                },
              },
              { header: 'Size', cell: (d) => size(d.sizeKb) },
              {
                header: 'Uploaded',
                cell: (d) => (
                  <span className="whitespace-nowrap text-ink-soft">
                    {formatPk(d.uploadedOn)} · {db.chamber.members.find((m) => m.id === d.uploadedBy)?.name.split(' ')[0]}
                  </span>
                ),
              },
              {
                header: 'Actions',
                cell: (d) =>
                  d.blobKey ? (
                    <span className="inline-flex gap-1">
                      <button type="button" className={iconBtn} onClick={() => void open(d)} aria-label={`Open ${d.name}`} title="Open">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className={iconBtn}
                        onClick={async () => {
                          const b = await blobOf(d);
                          if (b) downloadBlob(b, d.name);
                        }}
                        aria-label={`Download ${d.name}`}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {canUpload && (
                        <button
                          type="button"
                          className={`${iconBtn} hover:bg-danger/10 hover:text-danger`}
                          onClick={() => void remove(d)}
                          aria-label={`Delete ${d.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-soft">—</span>
                  ),
              },
            ]}
          />
        </div>
      </div>
      {toast.node}
    </>
  );
}

export default function DocumentsPage() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <DocumentsPageBody db={db} />;
}
