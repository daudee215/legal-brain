'use client';

import { CalendarPlus } from 'lucide-react';
import { pktDateKey, todayKey } from '../../lib/dates';
import { useLang } from '../../lib/i18n';
import { downloadIcs, hearingsToIcs, type IcsItem } from '../../lib/ics';
import { getChamber, listCourts, upcomingHearings } from '../../lib/repo';
import { getDb } from '../../lib/store';
import type { Case, Court } from '../../types';
import { btn } from '../ui';
import { useToast } from '../ui/Toast';

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-');

function itemFor(c: Case, courts: Court[], label: (title: string) => string): IcsItem {
  const court = courts.find((x) => x.id === c.courtId);
  const key = pktDateKey(c.nextHearing!);
  return {
    uid: `${c.id}-${key}`,
    title: label(`${c.caseNo} ${c.title}`),
    start: c.nextHearing!,
    location: court ? `${court.name}, ${court.city}` : undefined,
    description: [c.caseNo, c.title, c.stage, c.judge].filter(Boolean).join('\n'),
  };
}

/** "Add to calendar" for one case's next hearing. */
export function CaseCalendarButton({ c, className = btn.ghost }: { c: Case; className?: string }) {
  const { t } = useLang();
  if (!c.nextHearing) return null;
  return (
    <button
      type="button"
      className={`${className} min-h-11`}
      title={t('cause.calendarHint', undefined, 'A .ics file for Google Calendar, Outlook or your phone, with reminders a day and an hour before.')}
      onClick={async () => {
        const [chamber, courts] = [await getChamber(), await listCourts()];
        const item = itemFor(c, courts, (title) => t('cause.hearingOf', { title }, `Hearing: ${title}`));
        downloadIcs(hearingsToIcs([item], chamber?.name ?? ''), `Hearing - ${safeName(c.caseNo)}.ics`);
      }}
    >
      <CalendarPlus className="h-4 w-4" /> {t('cause.addToCalendar', undefined, 'Add to calendar')}
    </button>
  );
}

/** "Export hearings to calendar": every pending case with a hearing in the next 60 days. */
export function ExportHearingsButton({ className = btn.ghost }: { className?: string }) {
  const { t } = useLang();
  const toast = useToast();
  return (
    <>
      <button
        type="button"
        className={`${className} min-h-11`}
        title={t('cause.calendarHint', undefined, 'A .ics file for Google Calendar, Outlook or your phone, with reminders a day and an hour before.')}
        onClick={async () => {
          const db = getDb();
          const list = (await upcomingHearings(todayKey(), 60, db)).filter((c) => c.status !== 'decided' && c.status !== 'disposed');
          if (!list.length) {
            toast.show(t('cause.calendarNone', undefined, 'No hearings in the next 60 days'));
            return;
          }
          const courts = await listCourts(db);
          const chamber = await getChamber(db);
          const items = list.map((c) => itemFor(c, courts, (title) => t('cause.hearingOf', { title }, `Hearing: ${title}`)));
          downloadIcs(hearingsToIcs(items, chamber?.name ?? ''), `Hearings ${todayKey()}.ics`);
          toast.show(t('cause.calendarDone', { n: items.length }, `Calendar file saved — open it to add ${items.length} hearings`));
        }}
      >
        <CalendarPlus className="h-4 w-4" /> {t('cause.exportCalendar', undefined, 'Export hearings to calendar')}
      </button>
      {toast.node}
    </>
  );
}
