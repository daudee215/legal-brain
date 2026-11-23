'use client';

import { AlertTriangle, CalendarCheck, CheckCircle2, CloudDownload, HelpCircle, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { placeOf, type Finding } from '../../lib/autoCauseList';
import { formatPk, formatTime, weekday } from '../../lib/dates';
import { Badge, btn, Card, CardTitle } from '../ui';
import { useToast } from '../ui/Toast';
import type { AutoCauseLists } from './useAutoCauseLists';

const shortDay = (key: string) => `${weekday(key).slice(0, 3)} ${formatPk(key)}`;
const when = (iso: string) => `${formatTime(iso)}, ${formatPk(iso)}`;

function FindingRow({ f, auto, kind, onDone }: { f: Finding; auto: AutoCauseLists; kind: 'other' | 'possible'; onDone: (msg: string) => void }) {
  const c = auto.cases.find((x) => x.id === f.caseId);
  const court = auto.courts.find((x) => x.id === f.court);
  if (!c) return null;
  const place = placeOf(f);
  return (
    <li className="rounded-2xl border border-line bg-paper p-4">
      <div>
        <div className="min-w-0">
          <Link href={`/app/case/?id=${c.id}`} className="font-medium hover:text-bronze">
            {c.title}
          </Link>
          <p className="text-xs text-ink-soft">
            {c.caseNo} · {court?.shortName ?? f.court}
          </p>
          {kind === 'other' ? (
            <p className="mt-2 text-sm">
              <span className="font-semibold text-ink">Listed on {shortDay(f.date)}</span>
              {place ? ` (${place})` : ''} —{' '}
              <span className="text-danger">{f.diaryDay ? `your diary says ${shortDay(f.diaryDay)}` : 'no next date in your diary'}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm">
              Party name found on the list for <span className="font-semibold">{shortDay(f.date)}</span>
              {place ? ` (${place})` : ''}, but the case number differs.
            </p>
          )}
          <p className="mt-2 truncate rounded-lg bg-cream/70 px-2 py-1 font-mono text-[11px] text-ink-soft" title={f.hit.line}>
            {f.hit.line}
          </p>
        </div>
        {auto.canEdit ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={btn.bronze}
              onClick={() => {
                auto.accept(f);
                onDone(kind === 'other' ? `Next date set to ${formatPk(f.date)}` : `Confirmed for ${formatPk(f.date)}`);
              }}
            >
              <CalendarCheck className="h-4 w-4" /> {kind === 'other' ? 'Update next date' : 'Yes, this is my case'}
            </button>
            <button type="button" className={btn.ghost} onClick={() => auto.dismiss(f)} aria-label={`Not my case: ${c.title}`}>
              <X className="h-4 w-4" /> Not mine
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <Badge>A senior or junior can confirm this</Badge>
          </div>
        )}
      </div>
    </li>
  );
}

/** Status of the automatic lists for `day`, plus everything that needs a lawyer's eye. */
export function AutoCauseListPanel({ day, auto }: { day: string; auto: AutoCauseLists }) {
  const { analysis, download, relevant, courts } = auto;
  const toast = useToast();
  const indexRows = download?.index?.files ?? [];
  const sameToday = analysis?.sameDay.filter((f) => f.date === day) ?? [];

  return (
    <Card className="mb-6">
      <CardTitle
        action={
          <button type="button" className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-bronze" onClick={auto.refresh}>
            <RefreshCw className="h-3.5 w-3.5" /> Check again
          </button>
        }
      >
        Automatic cause lists
      </CardTitle>
      {!analysis ? (
        <p className="text-sm text-ink-soft">Checking the published lists…</p>
      ) : (
        <div className="space-y-5">
          <ul className="space-y-1.5 text-sm" aria-label="Automatic cause list status">
            {relevant.length === 0 && <li className="text-ink-soft">Add cases to see their courts&apos; lists here.</li>}
            {relevant.map((id) => {
              const court = courts.find((c) => c.id === id);
              const row = indexRows.find((r) => r.court === id && r.date === day);
              const name = court?.shortName ?? id;
              const known = indexRows.some((r) => r.court === id);
              return (
                <li key={id} className="flex items-start gap-2">
                  <CloudDownload className={`mt-0.5 h-4 w-4 shrink-0 ${row ? 'text-ok' : known ? 'text-ink-soft' : 'text-ink-soft/50'}`} aria-hidden />
                  {row ? (
                    <span>
                      Fetched automatically from <span className="font-medium">{name}</span> at {when(row.fetchedAt)}{' '}
                      <span className="text-xs text-ink-soft">· {row.count} listed</span>
                    </span>
                  ) : known ? (
                    <span>
                      <span className="font-medium">{name}</span>: list for {formatPk(day)} not published yet{' '}
                      {download && <span className="text-xs text-ink-soft">· checked {formatTime(download.checkedAt)}</span>}
                    </span>
                  ) : (
                    <span>
                      <span className="font-medium">{name}</span>: not fetched automatically yet — upload its list below.
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {sameToday.length > 0 && (
            <p className="flex items-start gap-2 text-sm text-ok">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {sameToday.length} of your case{sameToday.length === 1 ? '' : 's'} found on the list for{' '}
                {formatPk(day)} — court room and serial number {auto.canEdit ? 'added' : 'shown below once a senior or junior opens the app'}.
              </span>
            </p>
          )}

          {analysis.otherDay.length > 0 && (
            <section>
              <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-danger">
                <AlertTriangle className="h-4 w-4" /> Listed on a different date than your diary
              </h3>
              <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {analysis.otherDay.map((f) => (
                  <FindingRow key={`${f.caseId}|${f.date}`} f={f} auto={auto} kind="other" onDone={toast.show} />
                ))}
              </ul>
            </section>
          )}

          {analysis.possible.length > 0 && (
            <section>
              <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-bronze">
                <HelpCircle className="h-4 w-4" /> Possible matches — please check
              </h3>
              <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {analysis.possible.map((f) => (
                  <FindingRow key={`${f.caseId}|${f.date}`} f={f} auto={auto} kind="possible" onDone={toast.show} />
                ))}
              </ul>
            </section>
          )}
          {auto.demo && (
            <p className="text-sm text-ink-soft">
              In the demo, the published lists are not matched against the invented demo cases. Start your own practice to have your cases found
              automatically.
            </p>
          )}
          <p className="text-xs text-ink-soft">
            Lists are downloaded from the courts&apos; websites a few times a day and matched on this device — your cases are not sent anywhere. Always
            double-check against the official list.
          </p>
        </div>
      )}
      {toast.node}
    </Card>
  );
}

/** One line on the Today page when the automatic lists found something to look at. */
export function AutoCauseListAlert({ auto }: { auto: AutoCauseLists }) {
  const n = (auto.analysis?.otherDay.length ?? 0) + (auto.analysis?.possible.length ?? 0);
  if (!n) return null;
  const other = auto.analysis?.otherDay.length ?? 0;
  return (
    <Link
      href="/app/cause-list/"
      className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm transition hover:border-danger/50"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
      <span className="flex-1">
        {other > 0
          ? `${other} case${other === 1 ? ' is' : 's are'} on a published cause list for a different date than your diary.`
          : `${n} possible match${n === 1 ? '' : 'es'} on the published cause lists.`}{' '}
        <span className="font-medium text-bronze">Review on the Cause List page →</span>
      </span>
    </Link>
  );
}
