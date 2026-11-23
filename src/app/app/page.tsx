'use client';

import { CalendarClock, CalendarDays, CheckCircle2, Scale } from 'lucide-react';
import { CaseBreakdown, RecentNotifications, TodayHearings, UpcomingList, WelcomeHero } from '../../components/dashboard/widgets';
import { useRole } from '../../components/shell/RoleProvider';
import { StatTile } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { addDays, todayKey } from '../../lib/dates';
import { caseStats, hearingsOn, listCourts, listNotifications, upcomingHearings } from '../../lib/repo';
import { useData } from '../../lib/useData';

export default function DashboardPage() {
  const { member } = useRole();
  const data = useData(async () => {
    const t = todayKey();
    const [today, week, stats, courts, notes] = await Promise.all([
      hearingsOn(t),
      upcomingHearings(addDays(t, 1), 7),
      caseStats(),
      listCourts(),
      listNotifications(),
    ]);
    return { today, week, stats, courts, notes };
  });

  if (!data) return <Loading label="Loading dashboard" />;
  const { today, week, stats, courts, notes } = data;
  const active = stats.byStatus.pending + stats.byStatus.adjourned + stats.byStatus.reserved;

  return (
    <div className="space-y-6">
      <WelcomeHero name={member.name} todayCount={today.length} weekCount={week.length} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Active cases" value={active} hint={`${stats.total} total`} icon={Scale} />
        <StatTile label="Hearings today" value={today.length} icon={CalendarDays} />
        <StatTile label="Next 7 days" value={week.length} icon={CalendarClock} />
        <StatTile label="Decided / disposed" value={stats.byStatus.decided + stats.byStatus.disposed} icon={CheckCircle2} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <TodayHearings rows={today} />
        <UpcomingList cases={week} courts={courts} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <CaseBreakdown stats={stats} courts={courts} />
        <RecentNotifications items={notes.slice(0, 5)} />
      </div>
    </div>
  );
}
