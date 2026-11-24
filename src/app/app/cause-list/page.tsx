'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, ExternalLink, FileSearch, HelpCircle, Loader2, Save, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AutoCauseListPanel } from '../../../components/causelist/AutoCauseListPanel';
import { FullCauseList } from '../../../components/causelist/FullCauseList';
import { useAutoCauseLists } from '../../../components/causelist/useAutoCauseLists';
import { Badge, btn, Card, CardTitle, EmptyState, inputCls, Notice, PageHeader } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { matchCauseList, saveCauseListHits, type CauseListHit } from '../../../lib/causeList';
import { addDays, formatPk, formatTime, todayKey, weekday } from '../../../lib/dates';
import { extractPdfText, isPdf } from '../../../lib/docText';
import { hearingsOn, listCases, listCourts, type HearingRow } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import type { Case, Court } from '../../../types';

function CauseListUpload({ day, cases, courts }: { day: string; cases: Case[]; courts: Court[] }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [hits, setHits] = useState<CauseListHit[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function run(text: string | string[], from: string) {
    const found = matchCauseList(text, cases);
    setHits(found);
    setSource(from);
    setPicked(new Set(found.filter((h) => h.kind === 'matched').map((h) => h.caseId)));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!isPdf(file)) {
      setError('Please choose the cause list as a PDF file, or paste its text instead.');
      return;
    }
    setBusy(`Reading ${file.name}…`);
    try {
      const pages = await extractPdfText(file);
      if (!pages.join('').trim()) {
        setError('This PDF has no readable text (it is probably a scan). Paste the text instead, or use a text PDF from the court website.');
        setHits(null);
      } else run(pages, `${file.name} · ${pages.length} page${pages.length === 1 ? '' : 's'}`);
    } catch {
      setError('Could not read this PDF. It may be damaged or password-protected.');
    } finally {
      setBusy(null);
    }
  }

  function save() {
    if (!hits) return;
    const chosen = hits.filter((h) => picked.has(h.caseId));
    const n = saveCauseListHits(day, chosen);
    toast.show(`${n} case${n === 1 ? '' : 's'} saved to the list for ${formatPk(day)}`);
  }

  const caseOf = (id: string) => cases.find((c) => c.id === id);
  const matched = hits?.filter((h) => h.kind === 'matched') ?? [];
  const possible = hits?.filter((h) => h.kind === 'possible') ?? [];
  const isToday = day === todayKey();

  const hitCard = (h: CauseListHit, i: number) => {
    const c = caseOf(h.caseId);
    if (!c) return null;
    const court = courts.find((x) => x.id === c.courtId);
    const on = picked.has(h.caseId);
    return (
      <motion.li
        key={h.caseId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04 }}
        className={`rounded-2xl border p-4 transition ${on ? 'border-bronze/50 bg-bronze/[0.06]' : 'border-line bg-paper'}`}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1.5 h-4 w-4 accent-bronze"
            checked={on}
            aria-label={`Include ${c.title}`}
            onChange={(e) => {
              const next = new Set(picked);
              if (e.target.checked) next.add(h.caseId);
              else next.delete(h.caseId);
              setPicked(next);
            }}
          />
          <div className="flex shrink-0 gap-2 text-center">
            <div className="w-14 rounded-xl bg-cream px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-ink-soft">Sr.</p>
              <p className="font-serif text-xl font-bold">{h.srNo ?? '—'}</p>
            </div>
            <div className="w-14 rounded-xl bg-cream px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-ink-soft">Court</p>
              <p className="font-serif text-xl font-bold">{h.courtRoom ?? '—'}</p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/app/case/?id=${c.id}`} className="font-medium hover:text-bronze">
              {c.title}
            </Link>
            <p className="text-xs text-ink-soft">
              {c.caseNo} · {court?.shortName ?? ''} · page {h.page}
              {h.bench ? ` · ${h.bench}` : ''}
            </p>
            <p className="mt-2 truncate rounded-lg bg-cream/70 px-2 py-1 font-mono text-[11px] text-ink-soft" title={h.line}>
              {h.line}
            </p>
          </div>
        </div>
      </motion.li>
    );
  };

  return (
    <Card className="mb-6">
      <CardTitle action={<Badge tone="bronze">Beta</Badge>}>Find my cases in a cause list</CardTitle>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void onFile(e.dataTransfer.files[0]);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${over ? 'border-bronze bg-bronze/5' : 'border-line bg-cream/40'}`}
      >
        {busy ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin text-bronze" /> {busy}
          </p>
        ) : (
          <>
            <UploadCloud className="mx-auto h-8 w-8 text-bronze" />
            <p className="mt-2 text-sm font-medium">Drop the court&apos;s cause-list PDF here</p>
            <label className="mt-1 inline-block cursor-pointer text-sm text-bronze hover:underline">
              or choose a PDF
              <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
            </label>
            <p className="mt-1 text-xs text-ink-soft">Read on this device only — the file is not uploaded anywhere.</p>
          </>
        )}
      </div>
      <button type="button" className="mt-3 text-sm text-ink-soft hover:text-bronze" onClick={() => setShowPaste(!showPaste)} aria-expanded={showPaste}>
        {showPaste ? 'Hide paste box' : 'Or paste the cause-list text'}
      </button>
      {showPaste && (
        <div className="mt-2 space-y-2">
          <textarea
            rows={6}
            className={inputCls}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={'Court No. 21\n15. WP No.30112 of 2026 Zahid Traders v. Federation …'}
            aria-label="Cause-list text"
          />
          <button type="button" className={btn.primary} disabled={!paste.trim()} onClick={() => run(paste, 'Pasted text')}>
            <FileSearch className="h-4 w-4" /> Find my cases
          </button>
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {hits && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{source}</span> — {matched.length} found, {possible.length} possible
            </p>
            <button type="button" className={btn.bronze} disabled={picked.size === 0} onClick={save}>
              <Save className="h-4 w-4" /> {isToday ? "Save to today's list" : `Save to list for ${formatPk(day)}`} ({picked.size})
            </button>
          </div>
          {hits.length === 0 && <EmptyState title="None of your cases are on this list" body="Check that it is the right court and date, or paste the text if the PDF is a scan." />}
          {matched.length > 0 && (
            <section>
              <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ok">
                <CheckCircle2 className="h-4 w-4" /> Matched by case number
              </h3>
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{matched.map(hitCard)}</ul>
            </section>
          )}
          {possible.length > 0 && (
            <section>
              <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-bronze">
                <HelpCircle className="h-4 w-4" /> Possible — party name found, number did not match
              </h3>
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{possible.map(hitCard)}</ul>
            </section>
          )}
        </div>
      )}
      {toast.node}
    </Card>
  );
}

export default function CauseListPage() {
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => {
    setDay(todayKey());
  }, []);
  const rows = useData(async () => (day ? hearingsOn(day) : []), [day]);
  const lib = useData(async () => ({ cases: await listCases({}), courts: await listCourts() }));
  const auto = useAutoCauseLists();

  if (!day || !rows || !lib) return <Loading />;
  const t = todayKey();
  const groups = new Map<string, HearingRow[]>();
  for (const r of rows) groups.set(r.court.id, [...(groups.get(r.court.id) ?? []), r]);

  const tab = (key: string, label: string) => (
    <button
      key={label}
      onClick={() => setDay(key)}
      aria-pressed={day === key}
      className={`rounded-lg px-4 py-1.5 text-sm ${day === key ? 'bg-night text-ivory' : 'hover:bg-line/50'}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <PageHeader title="Daily Cause List" subtitle={`${weekday(day)}, ${formatPk(day)} — ${rows.length} of your cases fixed`} />
      <Notice>
        Lists for the Islamabad and Peshawar High Courts are fetched automatically. For other courts, upload the court&apos;s published cause list
        below to find your cases with serial number and court room. Always double-check against the official list.{' '}
        <a href="#full-list" className="font-medium text-bronze underline-offset-2 hover:underline">
          Browse the full Islamabad and Peshawar lists ↓
        </a>
      </Notice>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-line bg-paper p-1">
          {tab(t, 'Today')}
          {tab(addDays(t, 1), 'Tomorrow')}
        </div>
        <input type="date" className={`${inputCls} w-auto`} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Pick a date" />
      </div>

      <AutoCauseListPanel day={day} auto={auto} />

      <CauseListUpload day={day} cases={lib.cases} courts={lib.courts} />


      {rows.length === 0 ? (
        <EmptyState title="No cases fixed on this date" body="Pick another date or check the court's own cause list." />
      ) : (
        <div className="space-y-6">
          {[...groups.values()].map((list) => {
            const court = list[0].court;
            return (
              <Card key={court.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{court.name}</h2>
                    <p className="text-xs text-ink-soft">{court.city}</p>
                  </div>
                  <a href={court.statusUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-bronze hover:underline">
                    Open official cause list <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <ul className="divide-y divide-line">
                  {list.map(({ case: c, entry }) => (
                    <li key={c.id} className="grid gap-2 py-3 sm:grid-cols-[150px_70px_1fr] sm:items-center">
                      <div className="text-sm">
                        <p className="font-medium">{entry?.bench || 'Bench not listed'}</p>
                        <p className="text-xs text-ink-soft">
                          {entry?.courtRoom ? `Court room ${entry.courtRoom}` : '—'} · {c.nextHearing ? formatTime(c.nextHearing) : ''}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="text-xs text-ink-soft">Sr. </span>
                        <span className="font-serif text-xl font-bold">{entry?.srNo || '—'}</span>
                      </p>
                      <div className="min-w-0">
                        <Link href={`/app/case/?id=${c.id}`} className="font-medium hover:text-bronze">
                          {c.title}
                        </Link>
                        <p className="text-xs text-ink-soft">
                          {c.caseNo} · {c.stage}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <FullCauseList day={day} cases={lib.cases} courts={lib.courts} />
    </>
  );
}
