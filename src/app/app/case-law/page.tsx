'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, Card, DemoBadge, EmptyState, inputCls, PageHeader } from '../../../components/ui';
import { formatPk } from '../../../lib/dates';
import { searchItems } from '../../../lib/search';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import { Loading } from '../../../components/ui/Loading';

function CaseLawPageBody({ db }: { db: Snapshot }) {
  const [q, setQ] = useState('');
  const [court, setCourt] = useState('');
  const [year, setYear] = useState('');
  const years = [...new Set(db.judgments.map((j) => j.date.slice(0, 4)))].sort().reverse();
  const rows = useMemo(
    () =>
      searchItems(
        db.judgments.filter((j) => (!court || j.courtId === court) && (!year || j.date.startsWith(year))).sort((a, b) => (a.date < b.date ? 1 : -1)),
        q,
        (j) => [j.title, j.caseNo, j.summary, ...j.tags, ...j.judges],
      ),
    [q, court, year, db.judgments],
  );

  return (
    <>
      <PageHeader title="Case Law" subtitle="Judgments from the Supreme Court, FCC and High Courts." actions={<DemoBadge />} />
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_200px_140px]">
        <input className={inputCls} placeholder="Search issue, section, party — e.g. “bail further inquiry”" aria-label="Search judgments" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls} aria-label="Court" value={court} onChange={(e) => setCourt(e.target.value)}>
          <option value="">All courts</option>
          {db.courts
            .filter((c) => c.level !== 'District')
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
      {rows.length === 0 ? (
        <EmptyState title="No judgments match" body="Try different words, or clear the court and year filters." />
      ) : (
        <div className="space-y-4">
          {rows.map((j) => (
            <Card key={j.id}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                <Badge tone="ink">{db.courts.find((c) => c.id === j.courtId)?.shortName}</Badge>
                <span>{j.caseNo}</span>
                <span>·</span>
                <span>{formatPk(j.date)}</span>
              </div>
              <Link href={`/app/case-law/${j.id}/`} className="mt-2 block font-serif text-lg font-semibold hover:text-bronze">
                {j.title}
              </Link>
              <p className="mt-1 font-reading text-sm text-ink-soft">{j.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {j.tags.map((t) => (
                  <Badge key={t} tone="bronze">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-8 text-xs text-ink-soft">
        Demo judgments are invented. Phase 3 imports judgments published on official court websites. Reported law journals (PLD, SCMR etc.) are not included —
        they are owned by their publishers.
      </p>
    </>
  );
}

export default function CaseLawPage() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <CaseLawPageBody db={db} />;
}
