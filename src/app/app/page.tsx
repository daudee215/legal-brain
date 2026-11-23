'use client';

import { CalendarClock, CalendarDays, Scale, Wallet } from 'lucide-react';
import { HearingLoadChart } from '../../components/dashboard/charts';
import {
  ActivityFeed,
  AttentionCard,
  CaseBreakdown,
  FeesCard,
  KpiTile,
  TodayHearings,
  UpcomingList,
  WelcomeHero,
} from '../../components/dashboard/widgets';
import { Stagger, StaggerItem } from '../../components/motion';
import { useRole } from '../../components/shell/RoleProvider';
import { Card, CardTitle } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { addDays, todayKey } from '../../lib/dates';
import { can } from '../../lib/permissions';
import { caseStats, feeSummary, hearingLoad, hearingsOn, listCases, listCourts, recentActivity, upcomingHearings } from '../../lib/repo';
import { useData } from '../../lib/useData';

export default function DashboardPage() {
  const { member, role } = useRole();
  const data = useData(async () => {
    const t = todayKey();
    const [today, week, stats, courts, load, fees, activity, cases, nextUp] = await Promise.all([
      hearingsOn(t),
      upcomingHearings(addDays(t, 1), 7),
      caseStats(),
      listCourts(),
      hearingLoad(addDays(t, -30), 61),
      feeSummary(),
      recentActivity(t, 20),
      listCases({}),
      upcomingHearings(t, 60),
    ]);
    return { t, today, week, stats, courts, load, fees, activity, cases, nextUp };
  });

  if (!data) return <Loading label="Loading dashboard" />;
  const { t, today, week, stats, courts, load, fees, activity, cases, nextUp } = data;
  const active = stats.byStatus.pending + stats.byStatus.adjourned + stats.byStatus.reserved;
  const nowIso = new Date().toISOString();
  const nextCase = nextUp.find((c) => c.nextHearing! >= nowIso) ?? nextUp[0];
  const counts = load.map((d) => d.count);
  const past = counts.slice(16, 31);
  const ahead = counts.slice(30, 45);
  const seeFees = can(role, 'billing');
  const weekTotal = counts.slice(30, 37).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <WelcomeHero
        name={member.name}
        todayCount={today.length}
        weekCount={week.length}
        next={nextCase ? { case: nextCase, court: courts.find((c) => c.id === nextCase.courtId) } : undefined}
      />

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem>
          <KpiTile id="active" label="Active cases" value={active} hint={`${stats.total} on file`} icon={Scale} spark={past} href="/app/cases/" />
        </StaggerItem>
        <StaggerItem>
          <KpiTile id="today" label="Hearings today" value={today.length} hint="Across all courts" icon={CalendarDays} href="/app/cause-list/" />
        </StaggerItem>
        <StaggerItem>
          <KpiTile id="week" label="Listings this week" value={weekTotal} hint="Next 7 days" icon={CalendarClock} spark={ahead} />
        </StaggerItem>
        <StaggerItem>
          {seeFees ? (
            <KpiTile id="fees" label="Fees outstanding" value={fees.outstanding} prefix="Rs " hint={`of Rs ${fees.agreed.toLocaleString('en-PK')} agreed`} icon={Wallet} />
          ) : (
            <KpiTile id="decided" label="Decided / disposed" value={stats.byStatus.decided + stats.byStatus.disposed} hint="Closed matters" icon={Wallet} />
          )}
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <TodayHearings rows={today} />
        <UpcomingList cases={week} courts={courts} />
      </div>

      <Card>
        <CardTitle action={<span className="text-xs text-ink-soft">Last 30 days · next 30 days</span>}>Court workload</CardTitle>
        <HearingLoadChart data={load} today={t} />
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <CaseBreakdown stats={stats} courts={courts} />
        {seeFees ? <FeesCard {...fees} /> : <AttentionCard cases={cases} />}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ActivityFeed items={activity.filter((a) => seeFees || a.kind !== 'payment').slice(0, 7)} />
        {seeFees ? <AttentionCard cases={cases} /> : null}
      </div>
    </div>
  );
}
