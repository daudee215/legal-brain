'use client';

import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, Card, DemoBadge, EmptyState, inputCls, PageHeader } from '../../../components/ui';
import { searchItems } from '../../../lib/search';
import { JURISDICTIONS, type Jurisdiction } from '../../../types';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import { Loading } from '../../../components/ui/Loading';

function LawsPageBody({ db }: { db: Snapshot }) {
  const [q, setQ] = useState('');
  const [j, setJ] = useState<Jurisdiction | ''>('');
  const rows = useMemo(
    () =>
      searchItems(
        db.statutes.filter((s) => !j || s.jurisdiction === j),
        q,
        (s) => [s.title, String(s.year), s.category, ...s.sections.flatMap((x) => [x.no, x.heading, x.text])],
      ),
    [q, j, db.statutes],
  );

  return (
    <>
      <PageHeader title="Laws & Statutes" subtitle="Federal and provincial Acts, Ordinances, Rules and the Constitution." actions={<DemoBadge />} />
      <input
        className={`${inputCls} mb-4`}
        placeholder="Search by Act, section or keyword — e.g. “497 bail”, “limitation 12”"
        aria-label="Search laws"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {(['', ...JURISDICTIONS] as const).map((x) => (
          <button
            key={x || 'all'}
            onClick={() => setJ(x)}
            aria-pressed={j === x}
            className={`rounded-full border px-3 py-1 text-sm ${j === x ? 'border-night bg-night text-ivory' : 'border-line bg-paper hover:bg-line/50'}`}
          >
            {x || 'All'}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No laws match your search" body="Try fewer words or a section number." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => (
            <Link key={s.id} href={`/app/laws/${s.id}/`} className="group">
              <Card className="h-full transition-colors group-hover:border-bronze">
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-1 h-5 w-5 shrink-0 text-bronze" />
                  <div>
                    <p className="font-serif text-lg font-semibold leading-snug">
                      {s.title}, {s.year}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="bronze">{s.jurisdiction}</Badge>
                      <Badge>{s.category}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-ink-soft">
                      {s.sections.length} key sections · e.g. {s.sections[0]?.no} {s.sections[0]?.heading}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-8 text-xs text-ink-soft">
        Phase 3 imports the full text from the Pakistan Code and provincial code portals. Section texts here are short summaries for the demo.
      </p>
    </>
  );
}

export default function LawsPage() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <LawsPageBody db={db} />;
}
