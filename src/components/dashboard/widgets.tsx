import { ArrowRight, Bell, ExternalLink, Gavel, Landmark, Newspaper, Settings } from 'lucide-react';
import Link from 'next/link';
import { formatPk, formatTime } from '../../lib/dates';
import type { HearingRow } from '../../lib/repo';
import type { AppNotification, Case, CaseCategory, CaseStats, Court } from '../../types';
import { Badge, Card, CardTitle, EmptyState, StatusBadge, btn } from '../ui';

export function WelcomeHero({ name, todayCount, weekCount }: { name: string; todayCount: number; weekCount: number }) {
  const first = name.split(' ')[0];
  const todayText =
    todayCount === 0 ? 'You have no hearings today' : `You have ${todayCount} hearing${todayCount === 1 ? '' : 's'} today`;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-cream sm:p-8">
      <Landmark className="pointer-events-none absolute -bottom-6 -right-4 h-48 w-48 text-white/[0.06] sm:h-64 sm:w-64" aria-hidden />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-cream/80">
        <span className="h-1.5 w-1.5 rounded-full bg-bronze-soft" /> Legal Brain · Demo
      </span>
      <h1 className="mt-4 text-3xl font-bold leading-tight text-cream sm:text-4xl">
        Welcome back,
        <br />
        Advocate {first}
      </h1>
      <p className="mt-3 max-w-xl text-cream/75">
        {todayText} and {weekCount} more coming up this week. Your chamber has drafts waiting and new case-law updates relevant to your matters.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/app/cause-list/" className="inline-flex items-center gap-2 rounded-lg bg-cream px-4 py-2 text-sm font-medium text-ink hover:bg-white">
          Open today&apos;s cause list <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/app/assistant/" className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2 text-sm font-medium text-cream hover:bg-white/10">
          Ask AI Assistant
        </Link>
      </div>
    </section>
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
        <ul className="divide-y divide-line">
          {rows.map(({ case: c, court, entry }) => (
            <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="w-24 shrink-0 text-sm">
                <p className="font-semibold">{c.nextHearing ? formatTime(c.nextHearing) : '—'}</p>
                <p className="text-xs text-ink-soft">
                  {court.shortName}
                  {entry ? ` · Ct ${entry.courtRoom}` : ''}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/app/cases/${c.id}/`} className="font-medium hover:text-bronze">
                  {c.title}
                </Link>
                <p className="text-xs text-ink-soft">
                  {c.caseNo} · {c.stage}
                  {entry ? ` · Sr. ${entry.srNo}` : ''}
                </p>
              </div>
              <a href={court.statusUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-bronze hover:underline">
                Check on court website <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
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
        <ul className="space-y-3">
          {cases.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <div className="w-14 shrink-0 rounded-lg bg-cream py-1 text-center">
                <p className="text-[10px] uppercase text-ink-soft">{formatPk(c.nextHearing!).split(' ')[1]}</p>
                <p className="font-serif text-lg font-bold leading-none">{formatPk(c.nextHearing!).split(' ')[0]}</p>
              </div>
              <div className="min-w-0">
                <Link href={`/app/cases/${c.id}/`} className="text-sm font-medium hover:text-bronze">
                  {c.title}
                </Link>
                <p className="text-xs text-ink-soft">
                  {courts.find((x) => x.id === c.courtId)?.shortName} · {c.stage}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[110px_1fr_28px] items-center gap-3 text-sm">
          <span className="truncate text-ink-soft">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-cream">
            <span className="block h-full rounded-full bg-bronze" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-medium tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
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
      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(stats.byStatus) as (keyof CaseStats['byStatus'])[]).map((s) =>
          stats.byStatus[s] ? (
            <span key={s} className="inline-flex items-center gap-1.5">
              <StatusBadge status={s} />
              <span className="text-sm font-medium">{stats.byStatus[s]}</span>
            </span>
          ) : null,
        )}
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-ink-soft">By category</h3>
          <Bars rows={cat} />
        </div>
        <div>
          <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-ink-soft">By court</h3>
          <Bars rows={court} />
        </div>
      </div>
    </Card>
  );
}

const KIND_ICON = { hearing: Gavel, judgment: Landmark, news: Newspaper, system: Settings } as const;

export function RecentNotifications({ items }: { items: AppNotification[] }) {
  return (
    <Card>
      <CardTitle action={<Link href="/app/news/?tab=notifications" className="text-sm text-bronze hover:underline">See all</Link>}>
        Notifications
      </CardTitle>
      {items.length === 0 ? (
        <EmptyState title="You're all caught up" />
      ) : (
        <ul className="space-y-3">
          {items.map((n) => {
            const Icon = KIND_ICON[n.kind] ?? Bell;
            const inner = (
              <>
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-bronze" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${n.read ? '' : 'font-semibold'}`}>{n.title}</span>
                  <span className="text-xs text-ink-soft">{formatPk(n.date)}</span>
                </span>
                {!n.read && <Badge tone="danger">New</Badge>}
              </>
            );
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} className="flex items-start gap-3 rounded-lg hover:text-bronze">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
