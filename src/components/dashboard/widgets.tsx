'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  ExternalLink,
  FileText,
  Hourglass,
  NotebookPen,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { formatPk, formatTime, greeting, todayKey, weekday } from '../../lib/dates';
import type { FeeRow, HearingRow } from '../../lib/repo';
import type { ActivityItem, Case, CaseCategory, CaseStats, Court } from '../../types';
import { CountUp } from '../motion';
import { IMG } from '../marketing/images';
import { Card, CardTitle, EmptyState, StatusBadge, btn } from '../ui';
import { BarList, Ring, Sparkline } from './charts';

export const pkr = (n: number) => `Rs ${n.toLocaleString('en-PK')}`;
export const pkrShort = (n: number) => (n >= 100000 ? `Rs ${(n / 100000).toFixed(n >= 1000000 ? 1 : 2).replace(/\.?0+$/, '')} lakh` : pkr(n));

export function WelcomeHero({
  name,
  todayCount,
  weekCount,
  next,
}: {
  name: string;
  todayCount: number;
  weekCount: number;
  next?: { case: Case; court?: Court };
}) {
  const first = name.split(' ')[0];
  const t = todayKey();
  const todayText =
    todayCount === 0 ? 'You have no hearings today' : `You have ${todayCount} hearing${todayCount === 1 ? '' : 's'} today`;
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-night p-6 text-ivory shadow-xl shadow-night/20 sm:p-8">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-20 mix-blend-luminosity"
        style={{ backgroundImage: `url(${IMG.library})` }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night via-night/95 to-night/60" aria-hidden />
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-bronze/30 blur-3xl" aria-hidden />

      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-bronze-soft">
            {weekday(t)} · {formatPk(t)}
          </p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 text-3xl font-bold leading-tight text-ivory sm:text-4xl"
          >
            {greeting()},
            <br />
            <span className="bronze-text">Advocate {first}</span>
          </motion.h1>
          <p className="mt-3 max-w-xl text-ivory/75">
            {todayText} and {weekCount} more coming up this week.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/app/cause-list/"
              className="group inline-flex items-center gap-2 rounded-lg bg-ivory px-4 py-2.5 text-sm font-medium text-night shadow-lg transition hover:-translate-y-0.5"
            >
              Open today&apos;s cause list <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/app/assistant/"
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-medium text-ivory backdrop-blur transition hover:bg-white/10"
            >
              <Sparkles className="h-4 w-4 text-bronze-soft" /> Ask AI Assistant
            </Link>
          </div>
        </div>
        {next && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full rounded-2xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur-md lg:w-72"
          >
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-bronze-soft">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bronze-soft/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-bronze-soft" />
              </span>
              Next up
            </p>
            <Link href={`/app/case/?id=${next.case.id}`} className="mt-2 block font-serif text-lg font-semibold leading-snug text-ivory hover:underline">
              {next.case.title}
            </Link>
            <p className="mt-1 text-xs text-ivory/65">
              {formatPk(next.case.nextHearing!)} · {formatTime(next.case.nextHearing!)} · {next.court?.shortName}
            </p>
            <p className="mt-2 text-xs text-ivory/80">{next.case.stage}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

export function KpiTile({
  label,
  value,
  prefix,
  hint,
  icon: Icon,
  spark,
  id,
  href,
}: {
  label: string;
  value: number;
  prefix?: string;
  hint?: string;
  icon: LucideIcon;
  spark?: number[];
  id: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-bronze/10 text-bronze transition group-hover:bg-bronze group-hover:text-ivory">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className={`mt-2 whitespace-nowrap font-serif font-bold ${prefix ? "text-2xl xl:text-[1.7rem]" : "text-3xl"}`}>
        <CountUp to={value} prefix={prefix} />
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      {spark && <div className="mt-2">{<Sparkline data={spark} id={id} />}</div>}
    </>
  );
  const cls =
    'group relative block overflow-hidden rounded-2xl border border-line bg-paper p-4 transition duration-300 hover:-translate-y-0.5 hover:border-bronze/40 hover:shadow-xl hover:shadow-bronze/10';
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function TodayHearings({ rows }: { rows: HearingRow[] }) {
  return (
    <Card>
      <CardTitle action={<Link href="/app/cause-list/" className="text-sm text-bronze hover:underline">Full cause list</Link>}>
        Today&apos;s hearings
      </CardTitle>
      {rows.length === 0 ? (
        <EmptyState title="No hearings today" body="Enjoy the quiet — use it to prepare for the week ahead." />
      ) : (
        <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[4.6rem] before:top-3 before:w-px before:bg-line">
          {rows.map(({ case: c, court, entry }, i) => (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.4 }}
              className="group relative grid grid-cols-[4rem_1fr] gap-5 rounded-xl py-2.5 pr-2 transition hover:bg-cream/70"
            >
              <div className="pt-0.5 text-right">
                <p className="text-sm font-semibold tabular-nums">{c.nextHearing ? formatTime(c.nextHearing) : '—'}</p>
                <p className="text-[11px] text-ink-soft">{court.shortName}</p>
              </div>
              <span className="absolute left-[4.6rem] top-4 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-paper bg-bronze ring-2 ring-bronze/30" aria-hidden />
              <div className="min-w-0 pl-2">
                <Link href={`/app/case/?id=${c.id}`} className="font-medium leading-snug hover:text-bronze">
                  {c.title}
                </Link>
                <p className="text-xs text-ink-soft">
                  {c.caseNo} · {c.stage}
                  {entry ? ` · Ct ${entry.courtRoom}, Sr. ${entry.srNo}` : ''}
                </p>
                <a
                  href={court.statusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-bronze opacity-80 hover:underline group-hover:opacity-100"
                >
                  Check on court website <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function UpcomingList({ cases, courts }: { cases: Case[]; courts: Court[] }) {
  return (
    <Card>
      <CardTitle>Next 7 days</CardTitle>
      {cases.length === 0 ? (
        <EmptyState title="Nothing scheduled" body="No hearings in the coming week." />
      ) : (
        <ul className="space-y-2">
          {cases.map((c) => {
            const [day, mon] = formatPk(c.nextHearing!).split(' ');
            return (
              <li key={c.id}>
                <Link href={`/app/case/?id=${c.id}`} className="group flex items-start gap-3 rounded-xl p-1.5 transition hover:bg-cream/70">
                  <div className="w-12 shrink-0 rounded-lg border border-line bg-cream py-1 text-center transition group-hover:border-bronze/40">
                    <p className="text-[10px] uppercase text-ink-soft">{mon}</p>
                    <p className="font-serif text-lg font-bold leading-none">{day}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium group-hover:text-bronze">{c.title}</p>
                    <p className="text-xs text-ink-soft">
                      {courts.find((x) => x.id === c.courtId)?.shortName} · {c.stage}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function CaseBreakdown({ stats, courts }: { stats: CaseStats; courts: Court[] }) {
  if (stats.total === 0) {
    return (
      <Card>
        <CardTitle>Your cases</CardTitle>
        <EmptyState
          title="No cases yet"
          body="Add your first case to see it broken down by category, court and status."
          action={<Link href="/app/cases/" className={btn.primary}>Add a case</Link>}
        />
      </Card>
    );
  }
  const cat = (Object.entries(stats.byCategory) as [CaseCategory, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
  const court = Object.entries(stats.byCourt)
    .sort((a, b) => b[1] - a[1])
    .map(([id, value]) => ({ label: courts.find((c) => c.id === id)?.shortName ?? id, value }));
  return (
    <Card>
      <CardTitle action={<Link href="/app/cases/" className="text-sm text-bronze hover:underline">All cases</Link>}>Your cases</CardTitle>
      <div className="mb-5 flex flex-wrap gap-x-4 gap-y-2">
        {(Object.keys(stats.byStatus) as (keyof CaseStats['byStatus'])[]).map((s) =>
          stats.byStatus[s] ? (
            <span key={s} className="inline-flex items-center gap-1.5">
              <StatusBadge status={s} />
              <span className="text-sm font-medium tabular-nums">{stats.byStatus[s]}</span>
            </span>
          ) : null,
        )}
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-ink-soft">By category</h3>
          <BarList rows={cat} />
        </div>
        <div>
          <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-ink-soft">By court</h3>
          <BarList rows={court} />
        </div>
      </div>
    </Card>
  );
}

export function FeesCard({ agreed, received, outstanding, rows }: { agreed: number; received: number; outstanding: number; rows: (FeeRow & { case: Case })[] }) {
  if (agreed === 0) {
    return (
      <Card>
        <CardTitle>Fees</CardTitle>
        <EmptyState title="No fees recorded" body="Record the fee agreed on a case to track what clients have paid." />
      </Card>
    );
  }
  const due = rows.filter((r) => r.outstanding > 0).slice(0, 4);
  return (
    <Card>
      <CardTitle action={<Link href="/app/cases/" className="text-sm text-bronze hover:underline">By case</Link>}>Fees</CardTitle>
      <div className="flex items-center gap-5">
        <Ring value={received / agreed} label="collected" />
        <dl className="min-w-0 space-y-2 text-sm">
          <div>
            <dt className="text-xs text-ink-soft">Received</dt>
            <dd className="font-serif text-xl font-bold">{pkrShort(received)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Outstanding</dt>
            <dd className="font-serif text-xl font-bold text-danger">{pkrShort(outstanding)}</dd>
          </div>
        </dl>
      </div>
      {due.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 font-sans text-xs font-semibold uppercase tracking-wide text-ink-soft">Largest balances</h3>
          <ul className="divide-y divide-line">
            {due.map((r) => (
              <li key={r.caseId}>
                <Link href={`/app/case/?id=${r.caseId}&tab=fees`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-bronze">
                  <span className="min-w-0 truncate">{r.case.title}</span>
                  <span className="shrink-0 font-medium tabular-nums">{pkr(r.outstanding)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

const ACT_ICON: Record<ActivityItem['kind'], LucideIcon> = { hearing: CalendarClock, diary: NotebookPen, document: FileText, payment: Wallet };

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardTitle>Chamber activity</CardTitle>
      {items.length === 0 ? (
        <EmptyState title="Nothing yet" body="Hearings, notes, documents and payments will appear here." />
      ) : (
        <ul className="space-y-4">
          {items.map((a, i) => {
            const Icon = ACT_ICON[a.kind];
            const inner = (
              <>
                <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bronze/10 text-bronze">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.title}</span>
                  <span className="line-clamp-1 text-xs text-ink-soft">{a.detail}</span>
                </span>
                <span className="shrink-0 text-[11px] text-ink-soft">{formatPk(a.date).split(' ').slice(0, 2).join(' ')}</span>
              </>
            );
            return (
              <motion.li key={`${a.kind}-${a.date}-${i}`} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.04 * i }}>
                {a.href ? (
                  <Link href={a.href} className="flex items-center gap-3 hover:text-bronze">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">{inner}</div>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Matters that need a decision: judgments reserved, and live cases with no next date fixed. */
export function AttentionCard({ cases }: { cases: Case[] }) {
  const reserved = cases.filter((c) => c.status === 'reserved');
  const noDate = cases.filter((c) => !c.nextHearing && (c.status === 'pending' || c.status === 'adjourned'));
  const items = [
    ...reserved.map((c) => ({ c, icon: Hourglass, why: 'Judgment reserved — watch for the announcement' })),
    ...noDate.map((c) => ({ c, icon: AlertTriangle, why: 'No next date fixed — check the court website' })),
  ];
  return (
    <Card>
      <CardTitle>Needs attention</CardTitle>
      {items.length === 0 ? (
        <EmptyState title="All clear" body="Every live case has its next date." />
      ) : (
        <ul className="space-y-2">
          {items.map(({ c, icon: Icon, why }) => (
            <li key={c.id}>
              <Link href={`/app/case/?id=${c.id}`} className="group flex items-start gap-3 rounded-xl border border-line p-3 transition hover:border-bronze/40 hover:bg-cream/60">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-bronze" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.title}</span>
                  <span className="text-xs text-ink-soft">{why}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-soft transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bronze" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
