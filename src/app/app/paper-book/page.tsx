'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, BookOpen, Download, FileText, GripVertical, Loader2, Save, Trash2, UploadCloud } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { useState } from 'react';
import { useRole } from '../../../components/shell/RoleProvider';
import { btn, Card, CardTitle, EmptyState, inputCls, PageHeader } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { downloadBlob } from '../../../lib/files';
import { isPdf } from '../../../lib/docText';
import { annexureLetter, buildPaperBook, planPaperBook, savePaperBookToCase } from '../../../lib/paperBook';
import { getChamber, listCases, listCourts } from '../../../lib/repo';
import { useData } from '../../../lib/useData';

type Kind = 'main' | 'annexure' | 'none';
interface Item {
  id: string;
  fileName: string;
  title: string;
  kind: Kind;
  /** User-typed annexure letter; empty = automatic by position. */
  letter: string;
  pages: number;
  bytes: ArrayBuffer;
}

let seq = 0;

export default function PaperBookPage() {
  const { member } = useRole();
  const toast = useToast();
  const data = useData(async () => ({ cases: await listCases({}), courts: await listCourts(), chamber: await getChamber() }));
  const [items, setItems] = useState<Item[]>([]);
  const [caseId, setCaseId] = useState('');
  const [head, setHead] = useState({ caseTitle: '', caseNo: '', court: '' });
  const [over, setOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data) return <Loading />;

  // Automatic letters follow the order of annexure items; a typed letter wins.
  let auto = 0;
  const letters = items.map((it) => (it.kind === 'annexure' ? it.letter.trim() || annexureLetter(auto++) : ''));
  const plan = planPaperBook(items.map((i) => i.pages));

  async function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    setError(null);
    const list = Array.from(files);
    const bad = list.filter((f) => !isPdf(f));
    if (bad.length) setError(`Only PDFs can go in a paper book — skipped ${bad.map((f) => f.name).join(', ')}.`);
    const added: Item[] = [];
    for (const f of list.filter(isPdf)) {
      const bytes = await f.arrayBuffer();
      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        added.push({
          id: `pb${++seq}`,
          fileName: f.name,
          title: f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '),
          kind: 'annexure',
          letter: '',
          pages: doc.getPageCount(),
          bytes,
        });
      } catch {
        setError(`Could not read ${f.name}. It may be damaged.`);
      }
    }
    setItems((cur) => {
      const next = [...cur, ...added];
      if (cur.length === 0 && next.length > 0) next[0] = { ...next[0], kind: 'main', title: 'Main petition' };
      return next;
    });
  }

  const patch = (id: string, p: Partial<Item>) => setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...p } : it)));
  const move = (from: number, to: number) =>
    setItems((cur) => {
      if (to < 0 || to >= cur.length || from === to) return cur;
      const next = [...cur];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return next;
    });

  function pickCase(id: string) {
    setCaseId(id);
    const c = data!.cases.find((x) => x.id === id);
    if (!c) return;
    setHead({ caseTitle: c.title, caseNo: c.caseNo, court: data!.courts.find((x) => x.id === c.courtId)?.name ?? '' });
  }

  async function build() {
    setError(null);
    setBusy('Building paper book…');
    try {
      return await buildPaperBook({
        caseTitle: head.caseTitle || 'Paper Book',
        caseNo: head.caseNo,
        court: head.court || 'Court',
        filedBy: data!.chamber.name,
        items: items.map((it, i) => ({ title: it.title || it.fileName, annexure: letters[i] || undefined, bytes: it.bytes })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the paper book.');
      return null;
    } finally {
      setBusy(null);
    }
  }

  const fileName = `Paper book - ${(head.caseNo || head.caseTitle || 'untitled').replace(/[\\/:*?"<>|]+/g, '-')}.pdf`;

  return (
    <>
      <PageHeader title="Paper Book" subtitle="Merge PDFs into one indexed, page-numbered paper book with annexure marks." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="self-start">
          <CardTitle>Title page</CardTitle>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1 block font-medium">Case</span>
              <select className={inputCls} value={caseId} onChange={(e) => pickCase(e.target.value)}>
                <option value="">— choose a case (optional) —</option>
                {data.cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                ['court', 'Court'],
                ['caseNo', 'Case number'],
                ['caseTitle', 'Case title'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="block">
                <span className="mb-1 block font-medium">{label}</span>
                <input className={inputCls} value={head[k]} onChange={(e) => setHead({ ...head, [k]: e.target.value })} />
              </label>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-cream/70 p-3 text-xs text-ink-soft">
            <p>
              <span className="font-semibold text-ink">{items.length}</span> documents ·{' '}
              <span className="font-semibold text-ink">{items.length ? plan.total : 0}</span> pages with title and index
            </p>
            <p className="mt-1">Every page gets “Page n of N”; each annexure gets a stamp on its first page.</p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              className={btn.bronze}
              disabled={!items.length || !!busy}
              onClick={async () => {
                const bytes = await build();
                if (bytes) {
                  downloadBlob(bytes, fileName);
                  toast.show('Paper book downloaded');
                }
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Build &amp; download PDF
            </button>
            <button
              type="button"
              className={btn.ghost}
              disabled={!items.length || !!busy}
              onClick={async () => {
                const bytes = await build();
                if (!bytes) return;
                try {
                  await savePaperBookToCase(bytes, fileName, { caseId: caseId || undefined, uploadedBy: member.id });
                  toast.show(caseId ? 'Saved to the case documents (Pleadings)' : 'Saved to Documents › Pleadings');
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not save on this device.');
                }
              }}
            >
              <Save className="h-4 w-4" /> Save to case documents
            </button>
          </div>
          {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        </Card>

        <div className="min-w-0 space-y-4">
          <div
            onDragOver={(e) => {
              if (dragIdx !== null) return;
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              if (dragIdx !== null) return;
              e.preventDefault();
              setOver(false);
              void addFiles(e.dataTransfer.files);
            }}
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${over ? 'border-bronze bg-bronze/5' : 'border-line bg-paper'}`}
          >
            <UploadCloud className="mx-auto h-8 w-8 text-bronze" />
            <p className="mt-2 text-sm font-medium">Drop PDFs here — petition first, then annexures</p>
            <label className="mt-1 inline-block cursor-pointer text-sm text-bronze hover:underline">
              or choose PDFs
              <input
                type="file"
                multiple
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => {
                  void addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            <p className="mt-1 text-xs text-ink-soft">Files stay on this device.</p>
          </div>

          {items.length === 0 ? (
            <EmptyState title="No documents yet" body="Add the main petition and its annexures. You can reorder and relabel them before building." />
          ) : (
            <Card className="p-0">
              <div className="grid grid-cols-[1fr] border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-bronze" /> Index — drag or use the arrows to reorder
                </span>
              </div>
              <ol>
                <AnimatePresence initial={false}>
                  {items.map((it, i) => (
                    <motion.li
                      key={it.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragEnd={() => setDragIdx(null)}
                      onDragOver={(e) => {
                        if (dragIdx === null) return;
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        if (dragIdx === null) return;
                        e.preventDefault();
                        move(dragIdx, i);
                        setDragIdx(null);
                      }}
                      className={`grid gap-3 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[28px_32px_1fr_auto] sm:items-center ${dragIdx === i ? 'opacity-50' : ''}`}
                    >
                      <GripVertical className="hidden h-4 w-4 cursor-grab text-ink-soft sm:block" aria-hidden />
                      <span className="font-serif text-lg font-bold text-bronze">{i + 1}.</span>
                      <div className="min-w-0 space-y-2">
                        <input
                          className={inputCls}
                          value={it.title}
                          aria-label={`Description of document ${i + 1}`}
                          onChange={(e) => patch(it.id, { title: e.target.value })}
                        />
                        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                          <select
                            className="rounded-md border border-line bg-paper px-2 py-1 text-xs"
                            value={it.kind}
                            aria-label={`Type of document ${i + 1}`}
                            onChange={(e) => patch(it.id, { kind: e.target.value as Kind })}
                          >
                            <option value="main">Main petition (no annexure)</option>
                            <option value="annexure">Annexure</option>
                            <option value="none">Other (no annexure)</option>
                          </select>
                          {it.kind === 'annexure' && (
                            <label className="inline-flex items-center gap-1">
                              Annexure-
                              <input
                                className="w-12 rounded-md border border-line bg-paper px-2 py-1 text-xs uppercase"
                                value={it.letter}
                                placeholder={letters[i]}
                                maxLength={4}
                                aria-label={`Annexure letter for document ${i + 1}`}
                                onChange={(e) => patch(it.id, { letter: e.target.value.toUpperCase() })}
                              />
                            </label>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" /> {it.fileName}
                          </span>
                          <span>
                            · {it.pages} page{it.pages === 1 ? '' : 's'} · pp. {plan.ranges[i][0]}
                            {plan.ranges[i][1] !== plan.ranges[i][0] ? `–${plan.ranges[i][1]}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" className="rounded-lg p-2 hover:bg-line/50 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 hover:bg-line/50 disabled:opacity-30"
                          disabled={i === items.length - 1}
                          onClick={() => move(i, i + 1)}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-danger hover:bg-danger/10"
                          onClick={() => setItems((cur) => cur.filter((x) => x.id !== it.id))}
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            </Card>
          )}
        </div>
      </div>
      {toast.node}
    </>
  );
}
