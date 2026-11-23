'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, ExternalLink, MessageCircle, Siren, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { OutcomeDialog } from '../../../components/outcome/OutcomeDialog';
import { ClientReminders } from '../../../components/reminders/ClientReminders';
import { useRole } from '../../../components/shell/RoleProvider';
import { Badge, btn, Card, CardTitle, EmptyState, StatusBadge } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { assignCover, findClashes, overdueCases } from '../../../lib/clashes';
import { addDays, formatPk, formatTime, greeting, pktDateKey, pktHour, todayKey, weekday } from '../../../lib/dates';
import { nextCourtDay, remindersFor } from '../../../lib/reminders';
import { can } from '../../../lib/permissions';
import { hearingsOn, listCases, listClients, listCourts, listMembers, type HearingRow } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import { briefingMessage, waLink } from '../../../lib/whatsapp';
import type { Case, Client, Court, Member } from '../../../types';

const EASE = [0.22, 1, 0.36, 1] as const;

function daysAgo(fromKey: string, toKey: string) {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / 86400000);
}

function HearingCard({ row, i, canEdit, onRecord, members }: { row: HearingRow; i: number; canEdit: boolean; onRecord: () => void; members: Member[] }) {
  const { case: c, court, entry } = row;
  const done = c.hearings.some((h) => pktDateKey(h.date) === todayKey());
  const people = members.filter((m) => c.assignedTo.includes(m.id));
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * i, duration: 0.4, ease: EASE }}
      className="group flex flex-col gap-4 rounded-2xl border border-line bg-paper p-4 transition hover:border-bronze/40 hover:shadow-lg hover:shadow-bronze/5 sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex shrink-0 items-center gap-3 sm:w-28 sm:flex-col sm:items-start sm:gap-0.5">
        <p className="font-serif text-2xl font-bold tabular-nums">{c.nextHearing ? formatTime(c.nextHearing) : '—'}</p>
        <p className="text-xs font-medium text-bronze">{court.shortName}</p>
        {entry && (
          <p className="text-[11px] text-ink-soft">
            Ct {entry.courtRoom} · Sr. {entry.srNo}
          </p>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/app/case/?id=${c.id}`} className="font-medium leading-snug hover:text-bronze">
          {c.title}
        </Link>
        <p className="text-xs text-ink-soft">
          {c.caseNo} · {c.stage}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={c.status} />
          {people.map((m) => (
            <Badge key={m.id}>{m.name}</Badge>
          ))}
          <a href={court.statusUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-bronze hover:underline">
            Court website <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      {done ? (
        <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="h-5 w-5" /> Outcome recorded
        </span>
      ) : canEdit ? (
        <button onClick={onRecord} className={`${btn.primary} px-5 py-3 text-base`}>
          <ClipboardCheck className="h-5 w-5" /> Record outcome
        </button>
      ) : null}
    </motion.li>
  );
}

export default function TodayPage() {
  const { member, role } = useRole();
  const toast = useToast();
  const canEdit = can(role, 'cases.edit');
  const [recording, setRecording] = useState<string | null>(null);

  const data = useData(async () => {
    const t = todayKey();
    const remindDay = nextCourtDay(t);
    const [today, tomorrow, remindRows, cases, courts, clients, members] = await Promise.all([
      hearingsOn(t),
      hearingsOn(addDays(t, 1)),
      hearingsOn(remindDay),
      listCases({}),
      listCourts(),
      listClients(),
      listMembers(),
    ]);
    return { t, today, tomorrow, remindDay, reminders: remindersFor(remindDay, remindRows, clients), cases, courts, clients, members };
  });

  if (!data) return <Loading label="Preparing your day" />;
  const { t, today, tomorrow, remindDay, reminders, cases, courts, clients, members } = data;
  const canRemind = can(role, 'diary.write');
  // From noon the evening job comes first; in the morning, today's hearings do.
  const remindFirst = pktHour() >= 12;
  const remindCard = <ClientReminders dayKey={remindDay} rows={reminders} canSend={canRemind} />;
  const clashes = findClashes(cases, courts, t);
  const overdue = overdueCases(cases, t);
  const pendingToday = today.filter((r) => !r.case.hearings.some((h) => pktDateKey(h.date) === t)).length;
  const advocates = members.filter((m) => m.role !== 'clerk');
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const courtOf = (c: Case): Court | undefined => courts.find((x) => x.id === c.courtId);
  const clientOf = (c: Case): Client | undefined => clients.find((x) => x.id === c.clientId);
  const recordingCase = recording ? cases.find((c) => c.id === recording) : undefined;

  const briefing = briefingMessage(
    t,
    today.map(({ case: c, court, entry }) => ({
      title: c.title,
      caseNo: c.caseNo,
      court: court.shortName,
      time: c.nextHearing ? formatTime(c.nextHearing) : '',
      courtRoom: entry?.courtRoom,
      srNo: entry?.srNo,
    })),
  );

  const summary =
    today.length === 0
      ? 'No hearings listed today.'
      : `${today.length} hearing${today.length === 1 ? '' : 's'} today${pendingToday < today.length ? ` · ${today.length - pendingToday} recorded` : ''}.`;

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-3xl bg-night p-6 text-ivory shadow-xl shadow-night/20 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-bronze/30 blur-3xl" aria-hidden />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-bronze-soft">
              {weekday(t)} · {formatPk(t)}
            </p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-2 text-3xl font-bold text-ivory sm:text-4xl"
            >
              {greeting()}
              {member.name ? `, ${member.name.split(' ')[0]}` : ''}
            </motion.h1>
            <p className="mt-2 text-ivory/75">
              {summary}
              {clashes.length > 0 && ` ${clashes.length} clash${clashes.length === 1 ? '' : 'es'} to sort out.`}
              {overdue.length > 0 && ` ${overdue.length} date${overdue.length === 1 ? '' : 's'} passed with no outcome.`}
            </p>
          </div>
          <a href={waLink(null, briefing)} target="_blank" rel="noopener noreferrer" className={btn.bronze}>
            <MessageCircle className="h-4 w-4" /> Share briefing on WhatsApp
          </a>
        </div>
      </section>

      {remindFirst && remindCard}

      {clashes.map((g, gi) => (
        <motion.div
          key={g.cases.map((c) => c.id).join('-')}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * gi, ease: EASE }}
          className="rounded-2xl border border-danger/40 bg-danger/5 p-5"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <Siren className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-danger">
                Clash: {g.cases.length} courts {g.reason === 'city' ? 'in different cities' : 'within two hours'}
              </p>
              <p className="text-sm text-ink-soft">
                {g.doubleBooked.length > 0 ? `${g.doubleBooked.map(name).join(', ')} cannot be in both places. ` : ''}
                Send someone to cover one of these.
              </p>
              <ul className="mt-3 space-y-2">
                {g.cases.map((c) => {
                  const free = advocates.filter((m) => !c.assignedTo.includes(m.id) && !g.cases.some((o) => o.id !== c.id && o.assignedTo.includes(m.id) && o.assignedTo.length === 1));
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-paper px-3 py-2.5 text-sm">
                      <span className="w-20 shrink-0 font-semibold tabular-nums">{c.nextHearing ? formatTime(c.nextHearing) : ''}</span>
                      <span className="w-24 shrink-0 text-xs text-bronze">
                        {courtOf(c)?.shortName} · {courtOf(c)?.city}
                      </span>
                      <Link href={`/app/case/?id=${c.id}`} className="min-w-0 flex-1 font-medium hover:text-bronze">
                        {c.title}
                        <span className="block text-xs font-normal text-ink-soft">{c.assignedTo.map(name).join(', ') || 'Nobody assigned'}</span>
                      </Link>
                      {canEdit &&
                        free.map((m) => (
                          <button
                            key={m.id}
                            className={`${btn.ghost} px-3 py-1.5 text-xs`}
                            onClick={() => {
                              assignCover(c.id, m.id);
                              toast.show(`${m.name} will cover ${c.title}`);
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Assign to {m.name.split(' ')[0]}
                          </button>
                        ))}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </motion.div>
      ))}

      {overdue.length > 0 && (
        <Card className="border-danger/40">
          <CardTitle action={<Badge tone="danger">{overdue.length}</Badge>}>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" /> Overdue — no outcome recorded
            </span>
          </CardTitle>
          <p className="-mt-2 mb-4 text-sm text-ink-soft">These dates have passed and nobody wrote what happened. Find out the next date before it is missed.</p>
          <ul className="divide-y divide-line">
            {overdue.map((c) => {
              const d = daysAgo(pktDateKey(c.nextHearing!), t);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/app/case/?id=${c.id}`} className="font-medium hover:text-bronze">
                      {c.title}
                    </Link>
                    <p className="text-xs text-ink-soft">
                      {c.caseNo} · {courtOf(c)?.shortName} · listed {formatPk(c.nextHearing!)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-danger">{d === 1 ? 'yesterday' : `${d} days ago`}</span>
                  {canEdit && (
                    <button onClick={() => setRecording(c.id)} className={`${btn.primary} px-3 py-1.5 text-xs`}>
                      <ClipboardCheck className="h-4 w-4" /> Record outcome
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
          <CalendarClock className="h-5 w-5 text-bronze" /> Today&apos;s hearings
        </h2>
        {today.length === 0 ? (
          <EmptyState title="No hearings today" body="Use the quiet day to prepare tomorrow's files." />
        ) : (
          <ol className="space-y-3">
            {today.map((r, i) => (
              <HearingCard key={r.case.id} row={r} i={i} canEdit={canEdit} members={members} onRecord={() => setRecording(r.case.id)} />
            ))}
          </ol>
        )}
      </section>

      {!remindFirst && remindCard}

      <Card>
        <CardTitle action={<span className="text-xs text-ink-soft">{formatPk(addDays(t, 1))}</span>}>Tomorrow</CardTitle>
        {tomorrow.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing listed for tomorrow.</p>
        ) : (
          <ul className="divide-y divide-line">
            {tomorrow.map(({ case: c, court, entry }) => (
              <li key={c.id} className="flex items-center gap-4 py-2.5">
                <span className="w-20 shrink-0 text-sm font-semibold tabular-nums">{c.nextHearing ? formatTime(c.nextHearing) : '—'}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/app/case/?id=${c.id}`} className="font-medium hover:text-bronze">
                    {c.title}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {court.shortName} · {c.caseNo}
                    {entry ? ` · Ct ${entry.courtRoom}, Sr. ${entry.srNo}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {recordingCase && (
        <OutcomeDialog c={recordingCase} court={courtOf(recordingCase)} client={clientOf(recordingCase)} onClose={() => setRecording(null)} />
      )}
      {toast.node}
    </div>
  );
}
