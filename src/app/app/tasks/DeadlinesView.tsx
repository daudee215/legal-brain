'use client';

import { AlarmClock, AlertOctagon, CheckCircle2, Hourglass, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { DeadlineCard, DeadlineForm, VERIFY_NOTE } from '../../../components/deadlines/DeadlinesForCase';
import { btn, Card, CardTitle, EmptyState, Notice, StatTile } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { todayKey } from '../../../lib/dates';
import { computeDeadline, sortByUrgency } from '../../../lib/deadlines';
import { REMEDIES } from '../../../lib/limitation';
import { getDb } from '../../../lib/store';
import { useData } from '../../../lib/useData';

/** Limitation countdowns: one tab of the Deadlines & Tasks page. */
export function DeadlinesView() {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [showFiled, setShowFiled] = useState(false);
  const data = useData(async () => {
    const t = todayKey();
    const db = getDb();
    const rows = db.deadlines
      .filter((d) => REMEDIES.some((r) => r.id === d.remedyId))
      .map((d) => ({ d, info: computeDeadline(d, t), title: db.cases.find((c) => c.id === d.caseId)?.title ?? 'Case removed' }));
    return { rows: sortByUrgency(rows), cases: db.cases };
  });

  if (!data) return <Loading label="Loading deadlines" />;
  const open = data.rows.filter((r) => r.info.status !== 'filed');
  const filed = data.rows.filter((r) => r.info.status === 'filed');
  const count = (s: string) => open.filter((r) => r.info.status === s).length;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">Limitation countdowns for every decided matter.</p>
        <button className={btn.primary} onClick={() => setAdding((v) => !v)}>
            {adding ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} {adding ? 'Close' : 'Start a countdown'}
          </button>
      </div>
      <Notice>
        <strong>Verify before relying.</strong> {VERIFY_NOTE}
      </Notice>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Overdue" value={count('overdue')} icon={AlertOctagon} hint="Past the last day" />
        <StatTile label="Urgent" value={count('urgent')} icon={AlarmClock} hint="7 days or less" />
        <StatTile label="Due soon" value={count('soon')} icon={Hourglass} hint="Within 30 days" />
        <StatTile label="Filed" value={filed.length} icon={CheckCircle2} hint="Done" />
      </div>

      {adding && (
        <Card className="mb-6">
          <CardTitle>Start a limitation countdown</CardTitle>
          <DeadlineForm
            cases={data.cases}
            onDone={(m) => {
              setAdding(false);
              toast.show(m);
            }}
          />
          <p className="mt-3 text-xs text-ink-soft">Time taken to obtain the certified copy (applied → ready) is excluded under s.12 when both dates are entered.</p>
        </Card>
      )}

      {open.length === 0 ? (
        <EmptyState
          title="No open countdowns"
          body="When a judgment or order is passed, start a countdown so the appeal is never time-barred."
          action={
            <button className={btn.bronze} onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Start a countdown
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {open.map(({ d, info, title }) => (
            <DeadlineCard key={d.id} d={d} info={info} caseTitle={title} onMsg={toast.show} />
          ))}
        </div>
      )}

      {filed.length > 0 && (
        <div className="mt-8">
          <button className="text-sm font-medium text-ink-soft hover:text-bronze" onClick={() => setShowFiled((v) => !v)} aria-expanded={showFiled}>
            {showFiled ? 'Hide' : 'Show'} filed ({filed.length})
          </button>
          {showFiled && (
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {filed.map(({ d, info, title }) => (
                <DeadlineCard key={d.id} d={d} info={info} caseTitle={title} onMsg={toast.show} />
              ))}
            </div>
          )}
        </div>
      )}
      {toast.node}
    </>
  );
}
