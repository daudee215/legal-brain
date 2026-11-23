'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatPk } from '../../lib/dates';
import { CASE_STATUSES, type Case, type CaseStatus, type Client, type Court } from '../../types';

const LABEL: Record<CaseStatus, string> = {
  pending: 'Pending',
  adjourned: 'Adjourned',
  reserved: 'Judgment reserved',
  decided: 'Decided',
  disposed: 'Disposed',
};

/**
 * Cases grouped by status. Senior/junior can drag a card to another column; in the demo the
 * move is kept on screen only (onMove reports it so the page can say so).
 */
export function KanbanBoard({
  rows,
  courts,
  clients,
  canEdit,
  onMove,
}: {
  rows: Case[];
  courts: Court[];
  clients: Client[];
  canEdit: boolean;
  onMove?: (c: Case, to: CaseStatus) => void;
}) {
  const [override, setOverride] = useState<Record<string, CaseStatus>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<CaseStatus | null>(null);
  const status = (c: Case) => override[c.id] ?? c.status;

  return (
    <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0">
      <div className="grid min-w-[1050px] grid-cols-5 gap-4">
        {CASE_STATUSES.map((s) => {
          const col = rows.filter((c) => status(c) === s);
          return (
            <section
              key={s}
              aria-label={`${LABEL[s]} column`}
              onDragOver={(e) => {
                if (!canEdit || !dragId) return;
                e.preventDefault();
                setOver(s);
              }}
              onDragLeave={() => setOver((o) => (o === s ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                const c = rows.find((r) => r.id === dragId);
                setOver(null);
                setDragId(null);
                if (!c || status(c) === s) return;
                setOverride((o) => ({ ...o, [c.id]: s }));
                onMove?.(c, s);
              }}
              className={`flex min-h-64 flex-col rounded-2xl border p-3 transition-colors ${
                over === s ? 'border-bronze bg-bronze/10' : 'border-line bg-cream/60'
              }`}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-soft">{LABEL[s]}</h2>
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-paper px-1.5 text-[11px] font-semibold tabular-nums">{col.length}</span>
              </header>
              <ul className="flex flex-1 flex-col gap-2.5">
                <AnimatePresence initial={false}>
                  {col.map((c) => (
                    <motion.li
                      key={c.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: dragId === c.id ? 0.45 : 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    >
                      <div
                        draggable={canEdit}
                        onDragStart={(e) => {
                          setDragId(c.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOver(null);
                        }}
                        className={`group rounded-xl border border-line bg-paper p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-bronze/40 hover:shadow-lg hover:shadow-bronze/10 ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[10.5px] text-ink-soft">{c.caseNo}</p>
                            <Link href={`/app/case/?id=${c.id}`} className="mt-0.5 block text-sm font-medium leading-snug hover:text-bronze">
                              {c.title}
                            </Link>
                          </div>
                          {canEdit && <GripVertical className="mt-1 h-4 w-4 shrink-0 text-ink-soft/50 group-hover:text-ink-soft" aria-hidden />}
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="rounded-full bg-bronze/10 px-2 py-0.5 font-medium text-bronze">{c.category}</span>
                          <span className="rounded-full bg-line/60 px-2 py-0.5 text-ink">{courts.find((x) => x.id === c.courtId)?.shortName}</span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between border-t border-line/70 pt-2 text-[11px] text-ink-soft">
                          <span className="truncate">{clients.find((x) => x.id === c.clientId)?.name}</span>
                          {c.nextHearing && (
                            <span className="inline-flex shrink-0 items-center gap-1">
                              <CalendarClock className="h-3 w-3" /> {formatPk(c.nextHearing).split(' ').slice(0, 2).join(' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {col.length === 0 && (
                  <li className="grid flex-1 place-items-center rounded-xl border border-dashed border-line px-3 py-8 text-center text-xs text-ink-soft">
                    {canEdit ? 'Drag a case here' : 'No cases'}
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
