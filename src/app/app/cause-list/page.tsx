'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, EmptyState, inputCls, Notice, PageHeader } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { addDays, formatPk, formatTime, todayKey, weekday } from '../../../lib/dates';
import { hearingsOn, type HearingRow } from '../../../lib/repo';
import { useData } from '../../../lib/useData';

export default function CauseListPage() {
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => {
    setDay(todayKey());
  }, []);
  const rows = useData(async () => (day ? hearingsOn(day) : []), [day]);

  if (!day || !rows) return <Loading />;
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
        Automatic sync with the courts&apos; published cause lists arrives in Phase 4. Until then, dates come from your case entries — use the
        official link for each court to double-check.
      </Notice>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-line bg-paper p-1">
          {tab(t, 'Today')}
          {tab(addDays(t, 1), 'Tomorrow')}
        </div>
        <input type="date" className={`${inputCls} w-auto`} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Pick a date" />
      </div>

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
                        <p className="font-medium">{entry?.bench ?? 'Bench not listed'}</p>
                        <p className="text-xs text-ink-soft">
                          {entry ? `Court room ${entry.courtRoom}` : '—'} · {c.nextHearing ? formatTime(c.nextHearing) : ''}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="text-xs text-ink-soft">Sr. </span>
                        <span className="font-serif text-xl font-bold">{entry?.srNo ?? '—'}</span>
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
    </>
  );
}
