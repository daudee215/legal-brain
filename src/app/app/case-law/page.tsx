'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge, btn, Card, DemoBadge, EmptyState, inputCls, PageHeader } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { LIBRARY_COURTS, libraryCourt, loadOfficialJudgments, officialHref, type LibraryCourtId, type OfficialJudgment } from '../../../lib/caselaw';
import { formatPk } from '../../../lib/dates';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { searchItems } from '../../../lib/search';
import { useData } from '../../../lib/useData';
import type { Judgment } from '../../../types';

const PAGE = 25;
type Source = 'all' | LibraryCourtId | 'demo';
const SOURCES: Source[] = ['all', ...LIBRARY_COURTS.map((court) => court.id), 'demo'];

function readParams() {
  try {
    const p = new URLSearchParams(window.location.search);
    return { q: p.get('q') || '', law: p.get('law') || '', subject: p.get('subject') || '', source: (SOURCES.find((x) => x === p.get('source')) ?? 'all') as Source };
  } catch {
    return { q: '', law: '', subject: '', source: 'all' as Source };
  }
}

type Row = Judgment & Partial<Pick<OfficialJudgment, 'dateKnown' | 'citation' | 'outcome' | 'seat' | 'reported' | 'courtSummary'>>;

function JudgmentCard({ j, court, href, demo }: { j: Row; court?: string; href: string; demo?: boolean }) {
  const dateKnown = j.dateKnown ?? true;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <Badge tone="ink">{court}</Badge>
        {j.caseNo && j.caseNo.toLowerCase() !== j.title.toLowerCase() && <span>{j.caseNo}</span>}
        {j.date && (
          <>
            <span aria-hidden>·</span>
            <span>{dateKnown ? formatPk(j.date) : j.date.slice(0, 4)}</span>
          </>
        )}
        {j.citation && (
          <>
            <span aria-hidden>·</span>
            <span className="font-medium text-ink">{j.citation}</span>
          </>
        )}
        {j.seat && <span>({j.seat})</span>}
        {demo && <DemoBadge text="Demo example" />}
      </div>
      <Link href={href} className="mt-2 block font-serif text-lg font-semibold hover:text-bronze">
        {j.title}
      </Link>
      {j.judges.length > 0 && <p className="mt-0.5 text-xs text-ink-soft">{j.judges.join(', ')}</p>}
      <p className="mt-2 font-reading text-sm text-ink-soft">{j.summary}</p>
      {j.outcome && <p className="mt-2 text-xs text-ink-soft">Result: <span className="font-medium text-ink">{j.outcome}</span></p>}
      {j.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {j.tags.map((t) => (
            <Badge key={t} tone="bronze">
              {t}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function CaseLawPageBody({ db }: { db: Snapshot }) {
  const [official, setOfficial] = useState<OfficialJudgment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState<Source>('all');
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [subject, setSubject] = useState('');
  const [law, setLaw] = useState('');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    const p = readParams();
    setQ(p.q);
    setLaw(p.law);
    setSubject(p.subject);
    setSource(p.source);
    loadOfficialJudgments()
      .then(setOfficial)
      .catch(() => setFailed(true));
  }, []);

  // A fresh search starts from the top of the list again.
  useEffect(() => setShown(PAGE), [q, year, subject, law, source]);

  const list = useMemo<Row[]>(
    () => (source === 'demo' ? db.judgments : (official ?? []).filter((j) => source === 'all' || j.courtId === source)),
    [source, official, db.judgments],
  );
  const count = (c: string) => (official ?? []).filter((j) => j.courtId === c).length;
  const years = useMemo(() => [...new Set(list.map((j) => j.date.slice(0, 4)).filter(Boolean))].sort().reverse(), [list]);
  const subjects = useMemo(() => {
    const n = new Map<string, number>();
    list.forEach((j) => j.tags.forEach((t) => n.set(t, (n.get(t) || 0) + 1)));
    return [...n.entries()].filter(([, c]) => c >= 3 || source === 'demo').sort((a, b) => b[1] - a[1]);
  }, [list, source]);
  const rows = useMemo(
    () =>
      searchItems(
        list
          .filter((j) => (!year || j.date.startsWith(year)) && (!subject || j.tags.includes(subject)) && (!law || j.statutesCited.includes(law)))
          .sort((a, b) => (a.date < b.date ? 1 : -1)),
        q,
        (j) => [j.title, j.caseNo, j.summary, j.citation ?? '', j.seat ?? '', j.outcome ?? '', ...j.tags, ...j.judges],
      ),
    [q, year, subject, law, list],
  );
  const lawName = law ? db.statutes.find((s) => s.id === law)?.title : '';
  const courtName = (id: string) => db.courts.find((c) => c.id === id)?.shortName ?? id.toUpperCase();
  const fmt = (n: number) => n.toLocaleString('en-US');
  const tabCls = (on: boolean) => `shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm sm:px-4 font-semibold transition ${on ? 'bg-night text-ivory' : 'text-ink hover:bg-line/50'}`;

  return (
    <>
      <PageHeader
        title="Case Law"
        subtitle={
          official
            ? `${fmt(official.length)} judgments from Pakistan’s Supreme Court and High Courts, sourced from the courts’ own websites.`
            : 'Judgments from Pakistan’s Supreme Court and High Courts, sourced from the courts’ own websites.'
        }
      />
      <div role="tablist" aria-label="Judgments" className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto border-b border-line px-4 pb-3 sm:mx-0 sm:flex-wrap sm:gap-2 sm:px-0">
        <button role="tab" aria-selected={source === 'all'} className={tabCls(source === 'all')} onClick={() => setSource('all')}>
          All courts{official ? ` (${fmt(official.length)})` : ''}
        </button>
        {LIBRARY_COURTS.map((c) => (
          <button key={c.id} role="tab" aria-selected={source === c.id} className={tabCls(source === c.id)} onClick={() => setSource(c.id)}>
            {c.short}
            {official ? ` (${fmt(count(c.id))})` : ''}
          </button>
        ))}
        <button role="tab" aria-selected={source === 'demo'} className={tabCls(source === 'demo')} onClick={() => setSource('demo')}>
          Demo examples ({db.judgments.length})
        </button>
      </div>
      <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_190px_120px]">
        <input
          className={inputCls}
          placeholder="Search parties, case no., judge, subject — e.g. “bail 497”"
          aria-label="Search judgments"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className={inputCls} aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map(([t, c]) => (
            <option key={t} value={t}>
              {t} ({c})
            </option>
          ))}
        </select>
        <select className={inputCls} aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Any year</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>
      {lawName && (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          Citing <Badge tone="bronze">{lawName}</Badge>
          <button className="text-ink-soft underline hover:text-ink" onClick={() => setLaw('')}>
            Clear
          </button>
        </p>
      )}
      {source !== 'demo' && !official && !failed ? (
        <Loading />
      ) : source !== 'demo' && failed ? (
        <EmptyState title="Couldn’t load the judgments" body="Check your internet connection and open this page again." />
      ) : rows.length === 0 ? (
        <EmptyState title="No judgments match" body="Try different words, or clear the subject and year filters." />
      ) : (
        <>
          <p className="mb-3 text-xs text-ink-soft" aria-live="polite">
            {rows.length.toLocaleString('en-US')} {rows.length === 1 ? 'judgment' : 'judgments'}
          </p>
          <div className="space-y-4">
            {rows.slice(0, shown).map((j) => (
              <JudgmentCard
                key={j.id}
                j={j}
                court={courtName(j.courtId)}
                href={source === 'demo' ? `/app/case-law/${j.id}/` : officialHref(j.id)}
                demo={source === 'demo'}
              />
            ))}
          </div>
          {rows.length > shown && (
            <div className="mt-6 text-center">
              <button className={btn.ghost} onClick={() => setShown((n) => n + PAGE)}>
                Show more ({(rows.length - shown).toLocaleString('en-US')} left)
              </button>
            </div>
          )}
        </>
      )}
      <p className="mt-8 text-xs text-ink-soft">
        Judgments are public documents published by the courts on their own websites:{' '}
        {LIBRARY_COURTS.map((c, i) => (
          <span key={c.id}>
            {i > 0 && ' and '}
            <a href={c.site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
              {libraryCourt(c.id)?.name} <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </span>
        ))}
        . Text was taken from the courts&rsquo; PDFs and may contain conversion errors — check the original before citing. Search covers parties, case numbers,
        citations, bench, subjects and the summary of each judgment. Reported law journals (PLD, SCMR etc.) are not included; they belong to their publishers.
      </p>
    </>
  );
}

export default function CaseLawPage() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <CaseLawPageBody db={db} />;
}
