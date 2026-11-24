'use client';

import { BookMarked, ExternalLink, Loader2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useLang } from '../../../lib/i18n';
import { hasFile, useDocFile } from '../../../components/docs/DocFiles';
import { RoleGate } from '../../../components/shell/RoleGate';
import { useRole } from '../../../components/shell/RoleProvider';
import { btn, EmptyState, inputCls, Notice, PageHeader } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { tooBigMessage } from '../../../lib/cloud/storage';
import { todayKey, formatPk } from '../../../lib/dates';
import { BOOK_FOLDER, isPdf, removeDocument, uploadDocument } from '../../../lib/docText';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { searchItems } from '../../../lib/search';
import { uid, updateDb } from '../../../lib/store';
import { useData } from '../../../lib/useData';

const SPINES = ['bg-night', 'bg-bronze', 'bg-[#5b3b22]', 'bg-[#2f3b2a]'];

function LibraryPageBody({ db }: { db: Snapshot }) {
  const { member } = useRole();
  const toast = useToast();
  const { t } = useLang();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const { open } = useDocFile(toast);
  const books = searchItems(
    db.books.filter((b) => b.ownerId === db.me.id),
    q,
    (b) => [b.title, b.author],
  );

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setErr('');
    const problems: string[] = [];
    let added = 0;
    for (const f of Array.from(files)) {
      if (!isPdf(f)) {
        problems.push(t('library.notPdf', { name: f.name }, `${f.name} is not a PDF.`));
        continue;
      }
      const big = tooBigMessage(f);
      if (big) {
        problems.push(big);
        continue;
      }
      setBusy(t('library.adding', { name: f.name }, `Adding ${f.name}…`));
      try {
        const { doc, pages } = await uploadDocument(f, { folder: BOOK_FOLDER, uploadedBy: member.id }, (p) => setBusy(t('library.addingPct', { name: f.name, pct: Math.round(p * 100) }, `Adding ${f.name} · ${Math.round(p * 100)}%`)));
        updateDb((d) => {
          d.books.unshift({
            id: uid('book'),
            title: f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim(),
            author: '',
            ownerId: d.me.id,
            pages,
            addedOn: todayKey(),
            docId: doc.id,
          });
        });
        added++;
      } catch (e) {
        problems.push(e instanceof Error ? e.message : t('library.couldNotAdd', { name: f.name }, `Could not add ${f.name}.`));
      }
    }
    setBusy(null);
    if (input.current) input.current.value = '';
    setErr(problems.join(' '));
    if (added)
      toast.show(
        added === 1
          ? t('library.addedOne', undefined, '1 book added to your shelf')
          : t('library.addedMany', { n: added }, `${added} books added to your shelf`),
      );
  }

  async function remove(id: string) {
    const b = db.books.find((x) => x.id === id);
    if (!b || !window.confirm(t('library.confirmRemove', { title: b.title }, `Remove "${b.title}" from your shelf? The PDF will be deleted.`))) return;
    const doc = b.docId ? db.docs.find((d) => d.id === b.docId) : undefined;
    updateDb((d) => {
      d.books = d.books.filter((x) => x.id !== id);
    });
    if (doc) await removeDocument(doc);
    toast.show(t('library.removed', undefined, 'Book removed'));
  }

  return (
    <RoleGate action="library">
      <PageHeader
        title={t('library.title', undefined, 'Law Books')}
        subtitle={t('library.subtitle', undefined, 'Your private shelf — books you own, searchable from court.')}
        actions={
          <>
            <input ref={input} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => void upload(e.target.files)} />
            <button className={btn.bronze} disabled={!!busy} onClick={() => input.current?.click()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {t('library.upload', undefined, 'Upload a book (PDF)')}
            </button>
          </>
        }
      />
      <Notice>
        {t('library.noticeA', undefined, "Law books are copyrighted, so each lawyer's shelf is ")}
        <strong>{t('library.noticeStrong', undefined, 'private to them')}</strong>
        {t('library.noticeB', undefined, ' — only books you own and upload. Pages of a book are searchable when its text can be read; scanned books are stored but not searchable yet.')}
      </Notice>
      {busy && <p className="mb-4 text-sm text-ink-soft" role="status">{busy}</p>}
      {err && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {err}
        </p>
      )}
      <input className={`${inputCls} mb-6 sm:max-w-md`} placeholder={t('library.searchPlaceholder', undefined, 'Search your books…')} aria-label={t('library.searchAria', undefined, 'Search books')} value={q} onChange={(e) => setQ(e.target.value)} />
      {books.length === 0 ? (
        <EmptyState
          title={t('library.emptyTitle', undefined, 'No books found')}
          body={t('library.emptyBody', undefined, 'Upload a PDF of a law book you own and it appears on your shelf.')}
        />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b, i) => {
            const doc = b.docId ? db.docs.find((d) => d.id === b.docId) : undefined;
            const openable = !!doc && hasFile(doc);
            return (
              <div key={b.id} className="group">
                <button
                  type="button"
                  disabled={!openable}
                  onClick={() => doc && void open(doc)}
                  className={`${SPINES[i % SPINES.length]} relative flex aspect-[3/4] w-full flex-col justify-between rounded-l-sm rounded-r-xl p-4 text-start text-ivory shadow-lg transition enabled:hover:-translate-y-1 enabled:hover:shadow-2xl`}
                  aria-label={openable ? t('library.openAria', { title: b.title }, `Open ${b.title}`) : b.title}
                >
                  <span className="absolute inset-y-0 start-2 w-px bg-white/20" />
                  <BookMarked className="h-5 w-5 text-bronze-soft" />
                  <p className="font-serif text-base font-semibold leading-snug text-ivory">{b.title.replace(' (my copy)', '')}</p>
                </button>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <p className="text-xs text-ink-soft">
                    {b.pages ? t('library.pagesDot', { n: b.pages.toLocaleString() }, `${b.pages.toLocaleString()} pages · `) : ''}
                    {t('library.addedOn', { date: formatPk(b.addedOn) }, `added ${formatPk(b.addedOn)}`)}
                  </p>
                  <span className="flex shrink-0 gap-1 opacity-70 transition group-hover:opacity-100">
                    {openable && doc && (
                      <button type="button" className="rounded p-1 hover:bg-line/50" aria-label={t('library.openAria', { title: b.title }, `Open ${b.title}`)} onClick={() => void open(doc)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" className="rounded p-1 hover:bg-danger/10 hover:text-danger" aria-label={t('library.removeAria', { title: b.title }, `Remove ${b.title}`)} onClick={() => void remove(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </RoleGate>
  );
}

export default function LibraryPage() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <LibraryPageBody db={db} />;
}
