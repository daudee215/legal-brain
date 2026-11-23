'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AlarmClock, AlertOctagon, CalendarCheck, CheckCircle2, Hourglass, Pencil, Plus, Trash2, Undo2, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatPk, todayKey } from '../../lib/dates';
import { addDeadline, computeDeadline, deleteDeadline, markFiled, sortByUrgency, updateDeadline, type DeadlineInfo, type DeadlineStatus } from '../../lib/deadlines';
import { REMEDIES } from '../../lib/limitation';
import { getDb } from '../../lib/store';
import { useData } from '../../lib/useData';
import type { Case, Deadline } from '../../types';
import { btn, Card, CardTitle, EmptyState, inputCls } from '../ui';
import { useToast } from '../ui/Toast';

export const VERIFY_NOTE = 'Limitation periods are demo values — verify against the Limitation Act 1908 and the relevant rules before relying on them.';

const LOOK: Record<DeadlineStatus, { icon: LucideIcon; label: string; ring: string; text: string; chip: string }> = {
  overdue: { icon: AlertOctagon, label: 'Overdue', ring: 'border-danger/50 bg-danger/[0.06]', text: 'text-danger', chip: 'bg-danger text-ivory' },
  urgent: { icon: AlarmClock, label: 'Urgent', ring: 'border-danger/40 bg-danger/[0.04]', text: 'text-danger', chip: 'bg-danger/15 text-danger' },
  soon: { icon: Hourglass, label: 'Due soon', ring: 'border-bronze/40 bg-bronze/[0.05]', text: 'text-bronze', chip: 'bg-bronze/15 text-bronze' },
  ok: { icon: CalendarCheck, label: 'On track', ring: 'border-line bg-paper', text: 'text-ok', chip: 'bg-ok/15 text-ok' },
  filed: { icon: CheckCircle2, label: 'Filed', ring: 'border-ok/30 bg-ok/[0.04]', text: 'text-ok', chip: 'bg-ok/15 text-ok' },
};

function countdownText(info: DeadlineInfo, d: Deadline) {
  if (info.status === 'filed') return { big: '✓', small: d.filedOn ? `Filed ${formatPk(d.filedOn)}` : 'Filed' };
  if (info.daysLeft < 0) return { big: String(-info.daysLeft), small: `day${info.daysLeft === -1 ? '' : 's'} overdue` };
  if (info.daysLeft === 0) return { big: '0', small: 'Last day is today' };
  return { big: String(info.daysLeft), small: `day${info.daysLeft === 1 ? '' : 's'} left` };
}

export function DeadlineCard({ d, info, caseTitle, showCase = true, onMsg }: { d: Deadline; info: DeadlineInfo; caseTitle?: string; showCase?: boolean; onMsg: (m: string) => void }) {
  const look = LOOK[info.status];
  const Icon = look.icon;
  const cd = countdownText(info, d);
  const [editing, setEditing] = useState(false);
  const [applied, setApplied] = useState(d.copyAppliedOn ?? '');
  const [ready, setReady] = useState(d.copyReadyOn ?? '');
  const [err, setErr] = useState('');
  const reduce = useReducedMotion();

  const save = () => {
    try {
      updateDeadline(d.id, { copyAppliedOn: applied || undefined, copyReadyOn: ready || undefined });
      setEditing(false);
      setErr('');
      onMsg('Copy dates saved — countdown updated');
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <motion.article
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 transition-shadow hover:shadow-lg hover:shadow-bronze/5 ${look.ring}`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex min-w-[5.5rem] flex-col items-center rounded-xl border border-line bg-paper px-3 py-2 ${look.text}`}>
          <span className="font-serif text-4xl font-bold leading-none tabular-nums">{cd.big}</span>
          <span className="mt-1 text-center text-[11px] font-medium leading-tight">{cd.small}</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${look.chip}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden /> {look.label}
          </span>
          <h3 className="mt-1.5 font-semibold leading-snug">{info.remedy.label}</h3>
          {showCase && caseTitle && (
            <Link href={`/app/case/?id=${d.caseId}`} className="block truncate text-sm text-ink-soft hover:text-bronze">
              {caseTitle}
            </Link>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-soft sm:grid-cols-3">
            <div>
              <dt>Order passed</dt>
              <dd className="font-medium text-ink">{formatPk(d.orderDate)}</dd>
            </div>
            <div>
              <dt>Last day to file</dt>
              <dd className={`font-semibold ${look.text}`}>{formatPk(info.lastDay)}</dd>
            </div>
            <div>
              <dt>Copy time excluded</dt>
              <dd className="font-medium text-ink">{info.excludedDays ? `${info.excludedDays} days (s.12)` : 'None'}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-ink-soft">
            {info.remedy.days} days · {info.basis}
            {d.note ? ` · ${d.note}` : ''}
          </p>
        </div>
      </div>

      {editing && (
        <div className="mt-4 grid gap-3 rounded-xl border border-line bg-cream/50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs text-ink-soft">
            Copy applied on
            <input type="date" className={`${inputCls} mt-1`} value={applied} onChange={(e) => setApplied(e.target.value)} />
          </label>
          <label className="text-xs text-ink-soft">
            Copy ready on
            <input type="date" className={`${inputCls} mt-1`} value={ready} onChange={(e) => setReady(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button className={btn.primary} onClick={save}>
              Save
            </button>
            <button className={btn.ghost} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          {err && <p className="text-xs text-danger sm:col-span-3">{err}</p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line/70 pt-3">
        {d.filedOn ? (
          <button
            className={btn.ghost}
            onClick={() => {
              markFiled(d.id, null);
              onMsg('Marked as not filed');
            }}
          >
            <Undo2 className="h-4 w-4" aria-hidden /> Undo filed
          </button>
        ) : (
          <>
            <button
              className={btn.bronze}
              onClick={() => {
                markFiled(d.id, todayKey());
                onMsg('Marked as filed');
              }}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Mark filed
            </button>
            <button className={btn.ghost} onClick={() => setEditing((v) => !v)}>
              <Pencil className="h-4 w-4" aria-hidden /> Copy dates
            </button>
          </>
        )}
        <button
          className={`${btn.ghost} ml-auto text-danger`}
          aria-label="Delete countdown"
          onClick={() => {
            if (window.confirm('Delete this countdown?')) {
              deleteDeadline(d.id);
              onMsg('Countdown deleted');
            }
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </motion.article>
  );
}

/** Form to start a limitation countdown. Pass `caseId` to fix the case (case page). */
export function DeadlineForm({ cases, caseId, onDone }: { cases: Case[]; caseId?: string; onDone: (msg: string) => void }) {
  const [form, setForm] = useState({ caseId: caseId ?? '', remedyId: REMEDIES[0].id, orderDate: '', copyAppliedOn: '', copyReadyOn: '', note: '' });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      addDeadline({ ...form, caseId: caseId ?? form.caseId });
      setForm((f) => ({ ...f, orderDate: '', copyAppliedOn: '', copyReadyOn: '', note: '' }));
      setErr('');
      onDone('Countdown started');
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {!caseId && (
        <label className="text-xs text-ink-soft sm:col-span-2">
          Case
          <select className={`${inputCls} mt-1`} value={form.caseId} onChange={set('caseId')} required>
            <option value="">Pick a case…</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.caseNo ? `(${c.caseNo})` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="text-xs text-ink-soft sm:col-span-2">
        Remedy
        <select className={`${inputCls} mt-1`} value={form.remedyId} onChange={set('remedyId')}>
          {REMEDIES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} — {r.days} days
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-ink-soft">
        Order / judgment date
        <input type="date" className={`${inputCls} mt-1`} value={form.orderDate} onChange={set('orderDate')} required />
      </label>
      <label className="text-xs text-ink-soft">
        Note (optional)
        <input className={`${inputCls} mt-1`} value={form.note} onChange={set('note')} placeholder="e.g. against conviction" />
      </label>
      <label className="text-xs text-ink-soft">
        Certified copy applied on
        <input type="date" className={`${inputCls} mt-1`} value={form.copyAppliedOn} onChange={set('copyAppliedOn')} />
      </label>
      <label className="text-xs text-ink-soft">
        Certified copy ready on
        <input type="date" className={`${inputCls} mt-1`} value={form.copyReadyOn} onChange={set('copyReadyOn')} />
      </label>
      {err && <p className="text-sm text-danger sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className={btn.primary}>
          <Plus className="h-4 w-4" aria-hidden /> Start countdown
        </button>
      </div>
    </form>
  );
}

/** Limitation countdowns for one case — drop into the case page. */
export function DeadlinesForCase({ caseId }: { caseId: string }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const data = useData(async () => {
    const t = todayKey();
    const db = getDb();
    const rows = db.deadlines
      .filter((d) => d.caseId === caseId && REMEDIES.some((r) => r.id === d.remedyId))
      .map((d) => ({ d, info: computeDeadline(d, t) }));
    return { rows: sortByUrgency(rows), cases: db.cases };
  }, [caseId]);

  return (
    <Card>
      <CardTitle
        action={
          <button className={btn.ghost} onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden /> {adding ? 'Close' : 'Start countdown'}
          </button>
        }
      >
        Limitation deadlines
      </CardTitle>
      {adding && data && (
        <div className="mb-4 rounded-xl border border-line bg-cream/40 p-4">
          <DeadlineForm
            cases={data.cases}
            caseId={caseId}
            onDone={(m) => {
              setAdding(false);
              toast.show(m);
            }}
          />
        </div>
      )}
      {data && data.rows.length === 0 && !adding && <EmptyState title="No limitation countdowns" body="When an order is passed, start a countdown for the appeal or revision." />}
      <div className="space-y-3">
        {data?.rows.map(({ d, info }) => (
          <DeadlineCard key={d.id} d={d} info={info} showCase={false} onMsg={toast.show} />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-ink-soft">{VERIFY_NOTE}</p>
      {toast.node}
    </Card>
  );
}

export default DeadlinesForCase;
