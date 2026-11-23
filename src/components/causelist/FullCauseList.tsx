'use client';

import { ChevronDown, ListOrdered, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DayFile, IndexFile } from '../../lib/autoCauseList';
import { parseCaseNo, sameCaseNo, type ListEntry } from '../../lib/causeList';
import { formatPk, weekday } from '../../lib/dates';
import type { Case, Court } from '../../types';
import { Badge, Card, CardTitle, EmptyState, inputCls } from '../ui';

const files = new Map<string, DayFile>();
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9/]/g, '');

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

interface Group {
  key: string;
  courtRoom?: string;
  bench?: string;
  entries: ListEntry[];
}

function groupEntries(entries: ListEntry[]): Group[] {
  const map = new Map<string, Group>();
  for (const e of entries) {
    const key = `${e.courtRoom ?? ''}|${e.bench ?? ''}`;
    let g = map.get(key);
    if (!g) map.set(key, (g = { key, courtRoom: e.courtRoom, bench: e.bench, entries: [] }));
    g.entries.push(e);
  }
  const roomNo = (g: Group) => (g.courtRoom && /^\d+$/.test(g.courtRoom) ? Number(g.courtRoom) : 9999);
  return [...map.values()].sort((a, b) => roomNo(a) - roomNo(b) || (a.bench ?? '').localeCompare(b.bench ?? ''));
}

/** The whole published list for a court and day: grouped by court room, searchable, with the chamber's own cases marked. */
export function FullCauseList({ day, cases, courts }: { day: string; cases: Case[]; courts: Court[] }) {
  const [index, setIndex] = useState<IndexFile | null | undefined>(undefined);
  const [court, setCourt] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [file, setFile] = useState<DayFile | null | undefined>(undefined);
  const [q, setQ] = useState('');

  useEffect(() => {
    getJson<IndexFile>('/cause-lists/index.json').then((ix) => setIndex(ix));
  }, []);

  const available = useMemo(() => index?.files ?? [], [index]);
  const courtIds = useMemo(() => [...new Set(available.map((r) => r.court))], [available]);
  const dates = useMemo(() => available.filter((r) => r.court === court).map((r) => r.date).sort(), [available, court]);

  // Pick a court (one the chamber has cases in, if any) and the page's day when it is published.
  useEffect(() => {
    if (!courtIds.length || (court && courtIds.includes(court))) return;
    setCourt(courtIds.find((id) => cases.some((c) => c.courtId === id)) ?? courtIds[0]);
  }, [courtIds, court, cases]);
  useEffect(() => {
    if (!dates.length) return;
    setDate(dates.includes(day) ? day : (dates.find((d) => d >= day) ?? dates[dates.length - 1]));
  }, [dates, day]);

  useEffect(() => {
    const row = available.find((r) => r.court === court && r.date === date);
    if (!row) return;
    const key = `${row.path}@${row.fetchedAt}`;
    const hit = files.get(key);
    if (hit) return setFile(hit);
    setFile(undefined);
    let live = true;
    getJson<DayFile>(`/cause-lists/${row.path}`).then((f) => {
      if (f) files.set(key, f);
      if (live) setFile(f);
    });
    return () => {
      live = false;
    };
  }, [available, court, date]);

  const mine = useMemo(() => cases.map((c) => parseCaseNo(c.caseNo)).filter(Boolean), [cases]);
  const isMine = (e: ListEntry) => {
    const n = parseCaseNo(e.caseNo);
    return mine.some((m) => sameCaseNo(m, n));
  };

  const entries = file?.entries ?? [];
  const needle = q.trim().toLowerCase();
  const squashedNeedle = squash(needle);
  const shown = needle
    ? entries.filter(
        (e) =>
          [e.caseNo, e.title, e.bench, e.stage, e.courtRoom && `court ${e.courtRoom}`].some((s) => s?.toLowerCase().includes(needle)) ||
          // case numbers: ignore dots and spaces, so "WP 16697" finds "W.P 16697/2026"
          (squashedNeedle.length > 2 && squash(e.caseNo).includes(squashedNeedle)),
      )
    : entries;
  const groups = groupEntries(shown);
  const courtName = (id: string) => courts.find((c) => c.id === id)?.name ?? id.toUpperCase();
  const mineCount = entries.filter(isMine).length;

  return (
    <section id="full-list" className="mt-8 scroll-mt-24">
      <Card>
        <CardTitle action={file?.fetchedAt ? <span className="text-xs text-ink-soft">Fetched {new Date(file.fetchedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}</span> : null}>
          <span className="inline-flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-bronze" /> Full cause lists
          </span>
        </CardTitle>

        {index === undefined ? (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : !courtIds.length ? (
          <EmptyState title="No lists published yet" body="Lists are fetched every evening and morning. Check back later." />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto_1fr]">
              <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-paper p-1" role="group" aria-label="Court">
                {courtIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => setCourt(id)}
                    aria-pressed={court === id}
                    className={`rounded-lg px-3 py-1.5 text-sm ${court === id ? 'bg-night text-ivory' : 'hover:bg-line/50'}`}
                  >
                    {courtName(id)}
                  </button>
                ))}
              </div>
              <select className={`${inputCls} w-auto`} value={date} onChange={(e) => setDate(e.target.value)} aria-label="List date">
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {weekday(d)}, {formatPk(d)}
                  </option>
                ))}
              </select>
              <label className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                <input
                  className={`${inputCls} ps-9`}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search case no., party, judge or court room"
                  aria-label="Search the cause list"
                />
              </label>
            </div>

            {file === undefined ? (
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading the list…
              </p>
            ) : file === null ? (
              <p className="text-sm text-danger">Could not load this list. Check your connection and try again.</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-ink-soft">
                  {courtName(court)} · {weekday(date)}, {formatPk(date)} · {needle ? `${shown.length} of ${entries.length}` : entries.length} cases in {groups.length} bench{groups.length === 1 ? "" : "es"}
                  {mineCount > 0 && (
                    <>
                      {' '}
                      · <b className="text-bronze">{mineCount} yours</b>
                    </>
                  )}
                </p>
                {groups.length === 0 ? (
                  <EmptyState title="Nothing matches" body="Try a case number like 1652/2026 or a party name." />
                ) : (
                  <div className="space-y-2">
                    {groups.map((g) => {
                      const ownHere = g.entries.filter(isMine).length;
                      return (
                        <details key={g.key} open={!!needle || ownHere > 0} className="group rounded-xl border border-line bg-paper">
                          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                            <span className="grid h-9 min-w-9 shrink-0 place-items-center rounded-lg bg-night px-2 font-serif text-sm font-bold text-ivory">
                              {g.courtRoom ?? '—'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{g.bench ?? 'Bench not named'}</span>
                              <span className="text-xs text-ink-soft">
                                {g.courtRoom ? `Court room ${g.courtRoom} · ` : ''}
                                {g.entries.length} case{g.entries.length === 1 ? '' : 's'}
                              </span>
                            </span>
                            {ownHere > 0 && <Badge tone="bronze">{ownHere} yours</Badge>}
                            <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft transition group-open:rotate-180" aria-hidden />
                          </summary>
                          <ol className="divide-y divide-line border-t border-line">
                            {g.entries.map((e, i) => {
                              const own = isMine(e);
                              return (
                                <li key={`${e.caseNo}-${i}`} className={`grid grid-cols-[3rem_1fr] gap-x-3 px-4 py-2.5 text-sm ${own ? 'bg-bronze/10' : ''}`}>
                                  <span className="font-serif text-base font-bold tabular-nums text-ink-soft">{e.srNo ?? '—'}</span>
                                  <span className="min-w-0">
                                    <span className="font-medium">{e.caseNo}</span>
                                    {own && (
                                      <span className="ms-2 align-middle">
                                        <Badge tone="bronze">Your case</Badge>
                                      </span>
                                    )}
                                    {e.title && <span className="block text-ink">{e.title}</span>}
                                    {e.stage && <span className="block text-xs text-ink-soft">{e.stage}</span>}
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        </details>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Card>
    </section>
  );
}
