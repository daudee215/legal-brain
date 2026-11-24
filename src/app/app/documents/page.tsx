'use client';

import { Download, ExternalLink, FileText, Folder, Loader2, Lock, Search, Trash2, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRole } from '../../../components/shell/RoleProvider';
import { Badge, DataTable, EmptyState, inputCls, PageHeader } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { formatPk } from '../../../lib/dates';
import { hasFile, UploadBadge, useDocFile } from '../../../components/docs/DocFiles';
import { BOOK_FOLDER, removeDocument, searchDocs, uploadDocument, type DocSearchHit } from '../../../lib/docText';
import { can } from '../../../lib/permissions';
import { getMode } from '../../../lib/store';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import { useLang } from '../../../lib/i18n';
import { Loading } from '../../../components/ui/Loading';
import type { DocFile } from '../../../types';
import { tooBigMessage } from '../../../lib/cloud/storage';
import { DOC_FOLDERS, ScanToPdf } from '../../../components/docs/ScanToPdf';
import { Camera } from 'lucide-react';

const FOLDERS = ['All', ...DOC_FOLDERS];

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
  const { t } = useLang();
  const [folder, setFolder] = useState('All');
  const [over, setOver] = useState(false);
  const [upFolder, setUpFolder] = useState('Pleadings');
  const [upCase, setUpCase] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<DocSearchHit[] | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  // Law-book PDFs belong to a private shelf, not the chamber's case files.
  const files = db.docs.filter((d) => d.folder !== BOOK_FOLDER);
  const rows = files.filter((d) => folder === 'All' || d.folder === folder);
  const canUpload = can(role, 'documents.upload');
  const inCloud = getMode() === 'cloud';
  const { open, download, fetching } = useDocFile(toast);
  // Folder names are stored as data in English; only the label shown is translated.
  const folderLabel = (f: string) => t(`docs.folder.${f}`, undefined, f);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits(null);
      return;
    }
    let alive = true;
    const timer = setTimeout(() => {
      searchDocs(files, q, { fetchMissing: inCloud }).then((h) => {
        if (alive) setHits(h);
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, db.docs, inCloud]);

  async function upload(files: FileList | File[] | null) {
    if (!files || !files.length) return;
    setError(null);
    const list = Array.from(files);
    const errors: string[] = [];
    // Too big for the chamber storage: say so before anything is saved or sent.
    const ok = list.filter((f) => {
      const big = tooBigMessage(f);
      if (big) errors.push(big);
      return !big;
    });
    let done = 0;
    let indexed = 0;
    let pending = 0;
    for (const [i, f] of ok.entries()) {
      const label = t(
        inCloud ? 'docs.uploading' : 'docs.saving',
        { name: f.name, i: i + 1, n: ok.length },
        `${inCloud ? 'Uploading' : 'Saving'} ${f.name} (${i + 1} of ${ok.length})`,
      );
      setBusy(`${label}…`);
      try {
        const r = await uploadDocument(f, { folder: upFolder, caseId: upCase || undefined, uploadedBy: member.id }, (p) => setBusy(`${label} · ${Math.round(p * 100)}%`));
        done++;
        if (r.pages) indexed++;
        if (r.shared === 'pending') pending++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : t('docs.couldNotSave', { name: f.name }, `Could not save ${f.name}.`));
      }
    }
    setBusy(null);
    setError(errors.length ? errors.join(' ') : null);
    if (!done) return;
    const what = t('docs.nFiles', { n: done, s: done === 1 ? '' : 's' }, `${done} file${done === 1 ? '' : 's'}`);
    const searchable = indexed
      ? t('docs.nPdfsSearchable', { n: indexed, s: indexed === 1 ? '' : 's' }, ` · ${indexed} PDF${indexed === 1 ? '' : 's'} searchable`)
      : '';
    if (!inCloud) toast.show(t('docs.toastSaved', { what, searchable }, `${what} saved${searchable}`));
    else if (pending) toast.show(t('docs.toastPending', { what, pending }, `${what} saved on this device · ${pending} not yet uploaded — will retry when online`));
    else toast.show(t('docs.toastShared', { what, searchable }, `${what} shared with your chamber${searchable}`));
  }

  async function remove(d: DocFile) {
    const where = inCloud ? t('docs.whereCloud', undefined, 'for everyone in your chamber') : t('docs.whereLocal', undefined, 'from this device');
    if (!window.confirm(t('docs.confirmDelete', { name: d.name, where }, `Delete "${d.name}" ${where}? This cannot be undone.`))) return;
    await removeDocument(d);
    toast.show(t('docs.fileDeleted', undefined, 'File deleted'));
  }

  const iconBtn = 'rounded-lg p-1.5 text-ink-soft transition hover:bg-line/50 hover:text-ink';

  return (
    <>
      <PageHeader title={t('docs.title', undefined, 'Documents')} subtitle={t('docs.subtitle', undefined, 'Pleadings, orders and evidence for every case.')} />
      <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-ok/10 px-3 py-1 text-sm text-ok">
        <Lock className="h-4 w-4" />{' '}
        {inCloud
          ? t('docs.lockCloud', undefined, 'Shared privately with your chamber · a copy stays on this device for offline use')
          : t('docs.lockLocal', undefined, 'Stored privately on this device')}
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label={t('docs.folders', undefined, 'Folders')} className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {FOLDERS.map((f) => {
            const n = f === 'All' ? files.length : files.filter((d) => d.folder === f).length;
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
                <span className="flex-1 text-start">{folderLabel(f)}</span>
                <span className="text-xs opacity-70">{n}</span>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              className={`${inputCls} ps-9`}
              placeholder={t('docs.searchPlaceholder', undefined, 'Search inside your PDFs — e.g. “489-F” or a party name')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t('docs.searchAria', undefined, 'Search inside PDFs')}
            />
          </div>
          {hits && (
            <div className="rounded-2xl border border-line bg-paper p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
                {t('docs.results', { n: hits.length, s: hits.length === 1 ? '' : 's' }, `${hits.length} result${hits.length === 1 ? '' : 's'} inside uploaded PDFs`)}
              </p>
              {hits.length === 0 ? (
                <p className="text-sm text-ink-soft">{t('docs.noMatches', undefined, 'No matches. Only PDFs you uploaded (with selectable text) are searchable.')}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {hits.slice(0, 50).map((h) => (
                    <li key={`${h.doc.id}-${h.page}`} className="py-2.5">
                      <button type="button" onClick={() => void open(h.doc)} className="inline-flex items-center gap-2 text-sm font-medium hover:text-bronze">
                        <FileText className="h-4 w-4 text-bronze" /> {h.doc.name}
                        <Badge tone="bronze">{t('docs.page', { page: h.page }, `p. ${h.page}`)}</Badge>
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
                  <p className="mt-2 text-sm font-medium">{t('docs.drag', undefined, 'Drag files here to upload')}</p>
                  <label className="mt-1 inline-block cursor-pointer text-sm text-bronze hover:underline">
                    {t('docs.choose', undefined, 'or choose files')}
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
                  <div className="mt-3">
                    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-medium text-ink hover:border-bronze/40 hover:bg-line/40" onClick={() => setScanOpen(true)}>
                      <Camera className="h-4 w-4 text-bronze" aria-hidden /> {t('scan.button', undefined, 'Scan with camera')}
                    </button>
                  </div>
                </>
              )}
              <div className="mx-auto mt-4 grid max-w-md gap-2 text-start text-sm sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs text-ink-soft">{t('docs.folderLabel', undefined, 'Folder')}</span>
                  <select className={inputCls} value={upFolder} onChange={(e) => setUpFolder(e.target.value)}>
                    {FOLDERS.slice(1).map((f) => (
                      <option key={f} value={f}>
                        {folderLabel(f)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs text-ink-soft">{t('docs.caseOptional', undefined, 'Case (optional)')}</span>
                  <select className={inputCls} value={upCase} onChange={(e) => setUpCase(e.target.value)}>
                    <option value="">{t('docs.none', undefined, '— none —')}</option>
                    {db.cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                {inCloud
                  ? t('docs.hintCloud', undefined, 'Files are shared with your chamber (up to 25 MB each).')
                  : t('docs.hintLocal', undefined, 'Files are kept on this device.')}{' '}
                {t('docs.hintPdf', undefined, 'PDFs with text become searchable.')}
              </p>
              {error && <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            </div>
          )}
          <DataTable
            rows={rows}
            rowKey={(d) => d.id}
            empty={<EmptyState title={t('docs.emptyFolder', undefined, 'This folder is empty')} />}
            columns={[
              {
                header: t('docs.colName', undefined, 'Name'),
                cell: (d) => (
                  <span className="inline-flex flex-wrap items-center gap-2 font-medium">
                    <FileText className="h-4 w-4 shrink-0 text-bronze" /> <span className="break-all">{d.name}</span>
                    {!hasFile(d) && <Badge>{t('docs.demoFile', undefined, 'demo file')}</Badge>}
                    <UploadBadge doc={d} />
                  </span>
                ),
              },
              {
                header: t('docs.colCase', undefined, 'Case'),
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
              { header: t('docs.colSize', undefined, 'Size'), cell: (d) => size(d.sizeKb) },
              {
                header: t('docs.colUploaded', undefined, 'Uploaded'),
                cell: (d) => (
                  <span className="whitespace-nowrap text-ink-soft">
                    {formatPk(d.uploadedOn)} · {db.chamber.members.find((m) => m.id === d.uploadedBy)?.name.split(' ')[0]}
                  </span>
                ),
              },
              {
                header: t('docs.colActions', undefined, 'Actions'),
                cell: (d) =>
                  hasFile(d) ? (
                    <span className="inline-flex gap-1">
                      <button
                        type="button"
                        className={iconBtn}
                        onClick={() => void open(d)}
                        aria-label={t('docs.openFile', { name: d.name }, `Open ${d.name}`)}
                        title={t('docs.open', undefined, 'Open')}
                      >
                        {fetching === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        className={iconBtn}
                        onClick={() => void download(d)}
                        aria-label={t('docs.downloadFile', { name: d.name }, `Download ${d.name}`)}
                        title={t('docs.download', undefined, 'Download')}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {canUpload && (
                        <button
                          type="button"
                          className={`${iconBtn} hover:bg-danger/10 hover:text-danger`}
                          onClick={() => void remove(d)}
                          aria-label={t('docs.deleteFile', { name: d.name }, `Delete ${d.name}`)}
                          title={t('docs.delete', undefined, 'Delete')}
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
      <ScanToPdf open={scanOpen} onClose={() => setScanOpen(false)} defaultFolder={upFolder} caseId={upCase || undefined} onSaved={toast.show} />
      {toast.node}
    </>
  );
}

export default function DocumentsPage() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <DocumentsPageBody db={db} />;
}
