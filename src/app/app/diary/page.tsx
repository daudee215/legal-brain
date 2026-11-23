'use client';

import { ChevronLeft, ChevronRight, Gavel, NotebookPen } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRole } from '../../../components/shell/RoleProvider';
import { btn, Card, CardTitle, EmptyState, inputCls, PageHeader } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { seed } from '../../../data/seed';
import { formatPk, formatTime, pktDateKey, todayKey, weekday } from '../../../lib/dates';
import { can } from '../../../lib/permissions';
import type { DiaryEntry } from '../../../types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = Sun
  const offset = (first + 6) % 7; // Monday-first
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export default function DiaryPage() {
  const { role, member } = useRole();
  const toast = useToast();
  const [today, setToday] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [ym, setYm] = useState<[number, number] | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>(seed.diary);
  const [text, setText] = useState('');
  const [caseId, setCaseId] = useState('');

  useEffect(() => {
    const t = todayKey();
    setToday(t);
    setSel(t);
    setYm([Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1]);
  }, []);

  const hearingDays = useMemo(() => new Set(seed.cases.filter((c) => c.nextHearing).map((c) => pktDateKey(c.nextHearing!))), []);
  const noteDays = useMemo(() => new Set(entries.map((e) => pktDateKey(e.date))), [entries]);

  if (!today || !sel || !ym) return <Loading />;
  const [y, m] = ym;
  const cells = monthGrid(y, m);
  const dayHearings = seed.cases.filter((c) => c.nextHearing && pktDateKey(c.nextHearing) === sel);
  const dayNotes = entries.filter((e) => pktDateKey(e.date) === sel).sort((a, b) => (a.date < b.date ? 1 : -1));
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m + n, 1));
    setYm([d.getUTCFullYear(), d.getUTCMonth()]);
  };

  return (
    <>
      <PageHeader title="Digital Diary" subtitle="Your court diary — hearings, notes and follow-ups, day by day." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="self-start">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => shift(-1)} className="rounded p-1.5 hover:bg-line" aria-label="Previous month">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="font-serif text-lg font-semibold">
              {MONTHS[m]} {y}
            </p>
            <button onClick={() => shift(1)} className="rounded p-1.5 hover:bg-line" aria-label="Next month">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-soft">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
            {cells.map((k, i) =>
              k ? (
                <button
                  key={k}
                  onClick={() => setSel(k)}
                  aria-pressed={sel === k}
                  aria-label={formatPk(k)}
                  className={`relative aspect-square rounded-lg text-sm ${
                    sel === k ? 'bg-ink text-cream' : k === today ? 'border border-bronze text-ink' : 'text-ink hover:bg-line/60'
                  }`}
                >
                  {Number(k.slice(8))}
                  <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                    {hearingDays.has(k) && <span className="h-1 w-1 rounded-full bg-bronze" />}
                    {noteDays.has(k) && <span className={`h-1 w-1 rounded-full ${sel === k ? 'bg-cream' : 'bg-ink-soft'}`} />}
                  </span>
                </button>
              ) : (
                <span key={`e${i}`} />
              ),
            )}
          </div>
          <p className="mt-3 flex gap-4 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-bronze" /> Hearing
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-soft" /> Note
            </span>
          </p>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle>
              {weekday(sel)}, {formatPk(sel)}
            </CardTitle>
            <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-ink-soft">Hearings</h3>
            {dayHearings.length === 0 ? (
              <p className="mb-4 text-sm text-ink-soft">No hearings.</p>
            ) : (
              <ul className="mb-4 space-y-2">
                {dayHearings.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <Gavel className="h-4 w-4 text-bronze" />
                    <span className="w-16 text-ink-soft">{formatTime(c.nextHearing!)}</span>
                    <Link href={`/app/cases/${c.id}/`} className="min-w-0 truncate hover:text-bronze">
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-ink-soft">Notes</h3>
            {dayNotes.length === 0 ? (
              <EmptyState title="No notes for this day" />
            ) : (
              <ul className="space-y-3">
                {dayNotes.map((n) => {
                  const c = seed.cases.find((x) => x.id === n.caseId);
                  const author = seed.chamber.members.find((x) => x.id === n.authorId);
                  return (
                    <li key={n.id} className="rounded-xl border border-line bg-cream/50 p-3 text-sm">
                      <p>{n.text}</p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {author?.name} · {formatTime(n.date)}
                        {c && (
                          <>
                            {' · '}
                            <Link href={`/app/cases/${c.id}/`} className="text-bronze hover:underline">
                              {c.title}
                            </Link>
                          </>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {can(role, 'diary.write') && (
            <Card>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <NotebookPen className="h-5 w-5 text-bronze" /> Add a note for {formatPk(sel)}
                </span>
              </CardTitle>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!text.trim()) return;
                  setEntries([
                    { id: `local-${Date.now()}`, date: `${sel}T${new Date().toTimeString().slice(0, 5)}:00+05:00`, caseId: caseId || undefined, authorId: member.id, text: text.trim() },
                    ...entries,
                  ]);
                  setText('');
                  toast.show('Saved in demo only — real saving arrives in Phase 2');
                }}
              >
                <textarea rows={3} className={inputCls} placeholder="Comments, follow-ups, feedback…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Note" />
                <div className="flex flex-wrap gap-2">
                  <select className={`${inputCls} sm:w-auto sm:flex-1`} value={caseId} onChange={(e) => setCaseId(e.target.value)} aria-label="Link to case">
                    <option value="">Not linked to a case</option>
                    {seed.cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={btn.primary} disabled={!text.trim()}>
                    Save note
                  </button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
      {toast.node}
    </>
  );
}
