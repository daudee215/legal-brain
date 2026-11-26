'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, CalendarDays, Plus, Trash2, UserRound, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRole } from '../../../components/shell/RoleProvider';
import { btn, Card, CardTitle, EmptyState, inputCls } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { addDays, formatPk, todayKey } from '../../../lib/dates';
import { addTask, deleteTask, setTaskDone } from '../../../lib/mutations';
import { listMembers } from '../../../lib/repo';
import { getDb } from '../../../lib/store';
import { useData } from '../../../lib/useData';
import type { Case, Member, Task } from '../../../types';

type View = 'person' | 'due';

function CheckBox({ done, onToggle, label }: { done: boolean; onToggle: () => void; label: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={onToggle}
      whileTap={reduce ? undefined : { scale: 0.8 }}
      animate={done && !reduce ? { scale: [1, 1.25, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${done ? 'border-ok bg-ok' : 'border-line bg-paper hover:border-bronze'}`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
        <motion.path
          d="M3 8.5 6.5 12 13 4.5"
          fill="none"
          stroke="white"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: 'easeOut' }}
        />
      </svg>
    </motion.button>
  );
}

function TaskItem({ t, today, cases, members, showAssignee, onMsg }: { t: Task; today: string; cases: Case[]; members: Member[]; showAssignee: boolean; onMsg: (m: string) => void }) {
  const reduce = useReducedMotion();
  const overdue = !t.done && !!t.due && t.due < today;
  const dueToday = !t.done && t.due === today;
  const c = cases.find((x) => x.id === t.caseId);
  const who = members.find((m) => m.id === t.assigneeId);
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: t.done ? 0.6 : 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: 24 }}
      transition={{ duration: 0.3 }}
      className={`group flex gap-3 rounded-xl border p-3 ${overdue ? 'border-danger/40 bg-danger/[0.05]' : 'border-line bg-paper'}`}
    >
      <CheckBox
        done={t.done}
        label={`${t.done ? 'Reopen' : 'Complete'}: ${t.title}`}
        onToggle={() => {
          setTaskDone(t.id, !t.done);
          if (!t.done) onMsg('Nicely done — task completed');
        }}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${t.done ? 'text-ink-soft line-through' : ''}`}>{t.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          {t.due && (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-danger' : dueToday ? 'font-semibold text-bronze' : ''}`}>
              {overdue ? <AlertTriangle className="h-3 w-3" aria-hidden /> : <CalendarDays className="h-3 w-3" aria-hidden />}
              {overdue ? `Overdue · ${formatPk(t.due)}` : dueToday ? 'Due today' : formatPk(t.due)}
            </span>
          )}
          {showAssignee && who && (
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3 w-3" aria-hidden /> {who.name}
            </span>
          )}
          {c && (
            <Link href={`/app/case/?id=${c.id}`} className="max-w-full truncate hover:text-bronze">
              {c.title}
            </Link>
          )}
        </div>
      </div>
      <button
        className="self-start rounded-md p-1 text-ink-soft opacity-60 transition hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
        aria-label={`Delete task: ${t.title}`}
        onClick={() => {
          deleteTask(t.id);
          onMsg('Task deleted');
        }}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </motion.li>
  );
}

/** Who is doing what, by when: one tab of the Deadlines & Tasks page. */
export function TasksView() {
  const { member, plan } = useRole();
  // A solo advocate is the only person: tasks are grouped by due date, with nobody else to assign to.
  const solo = plan === 'solo';
  const toast = useToast();
  const [picked, setView] = useState<View>('person');
  const view: View = solo ? 'due' : picked;
  const [mine, setMine] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', assigneeId: '', caseId: '', due: '' });
  const [err, setErr] = useState('');
  const data = useData(async () => {
    const db = getDb();
    return { tasks: db.tasks, cases: db.cases, members: await listMembers(), today: todayKey() };
  });

  if (!data) return <Loading label="Loading tasks" />;
  const { cases, members, today } = data;
  const tasks = data.tasks.filter((t) => !mine || t.assigneeId === member.id);
  const order = (a: Task, b: Task) => Number(a.done) - Number(b.done) || (a.due ?? '9999').localeCompare(b.due ?? '9999');
  const overdueCount = tasks.filter((t) => !t.done && t.due && t.due < today).length;

  const columns: { id: string; title: string; hint?: string; tone?: string; rows: Task[] }[] =
    view === 'person'
      ? members
          .filter((m) => !mine || m.id === member.id)
          .map((m) => ({ id: m.id, title: m.name, hint: m.role[0].toUpperCase() + m.role.slice(1), rows: tasks.filter((t) => t.assigneeId === m.id).sort(order) }))
      : (() => {
          const week = addDays(today, 7);
          const open = tasks.filter((t) => !t.done);
          return [
            { id: 'over', title: 'Overdue', tone: 'text-danger', rows: open.filter((t) => t.due && t.due < today) },
            { id: 'today', title: 'Today', tone: 'text-bronze', rows: open.filter((t) => t.due === today) },
            { id: 'week', title: 'Next 7 days', rows: open.filter((t) => t.due && t.due > today && t.due <= week) },
            { id: 'later', title: 'Later / no date', rows: open.filter((t) => !t.due || t.due > week) },
            { id: 'done', title: 'Done', tone: 'text-ok', rows: tasks.filter((t) => t.done) },
          ].map((c) => ({ ...c, rows: [...c.rows].sort(order) }));
        })();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      addTask({ title: form.title, assigneeId: form.assigneeId || member.id || members[0]?.id, caseId: form.caseId || undefined, due: form.due || undefined });
      setForm({ title: '', assigneeId: form.assigneeId, caseId: '', due: '' });
      setErr('');
      toast.show('Task added');
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button className={btn.primary} onClick={() => setAdding((v) => !v)}>
          {adding ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} {adding ? 'Close' : 'Add task'}
        </button>
        {!solo && (
          <div className="flex gap-1 rounded-xl border border-line bg-paper p-1 text-sm" role="tablist" aria-label="Group tasks">
            {(
              [
                ['person', 'By person', Users],
                ['due', 'By due date', CalendarDays],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${view === id ? 'bg-night text-ivory' : 'hover:bg-line/50'}`}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        )}
        {!solo && (
          <button
            aria-pressed={mine}
            onClick={() => setMine((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${mine ? 'border-bronze bg-bronze/15 text-bronze' : 'border-line bg-paper hover:border-bronze/40'}`}
          >
            <UserRound className="h-4 w-4" aria-hidden /> Mine only
          </button>
        )}
        {overdueCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-danger">
            <AlertTriangle className="h-4 w-4" aria-hidden /> {overdueCount} overdue
          </span>
        )}
      </div>

      {adding && (
        <Card className="mb-6">
          <CardTitle>New task</CardTitle>
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-ink-soft sm:col-span-2 lg:col-span-4">
              What needs doing
              <input className={`${inputCls} mt-1`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Apply for certified copy" required />
            </label>
            {!solo && (
              <label className="text-xs text-ink-soft">
                Assign to
                <select className={`${inputCls} mt-1`} value={form.assigneeId || member.id} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className={`text-xs text-ink-soft ${solo ? 'sm:col-span-1 lg:col-span-3' : 'lg:col-span-2'}`}>
              Case (optional)
              <select className={`${inputCls} mt-1`} value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })}>
                <option value="">No case</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-soft">
              Due
              <input type="date" className={`${inputCls} mt-1`} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
            </label>
            {err && <p className="text-sm text-danger sm:col-span-2 lg:col-span-4">{err}</p>}
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="submit" className={btn.primary}>
                <Plus className="h-4 w-4" aria-hidden /> Add task
              </button>
            </div>
          </form>
        </Card>
      )}

      {tasks.length === 0 && !adding ? (
        <EmptyState
          title="No tasks yet"
          body={solo ? 'Note what needs doing — collect a copy, file a reply, call a client.' : 'Give your junior or munshi something to do — collect a copy, file a reply, call a client.'}
        />
      ) : (
        <div className={`grid grid-cols-1 gap-4 ${view === 'person' ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-5'}`}>
          {columns.map((col) => (
            <section key={col.id} className="rounded-2xl border border-line bg-cream/40 p-3">
              <header className="mb-3 flex items-baseline justify-between px-1">
                <h2 className={`font-semibold ${col.tone ?? ''}`}>{col.title}</h2>
                <span className="text-xs text-ink-soft">
                  {col.hint ? `${col.hint} · ` : ''}
                  {col.rows.filter((t) => !t.done).length} open
                </span>
              </header>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {col.rows.map((t) => (
                    <TaskItem key={t.id} t={t} today={today} cases={cases} members={members} showAssignee={view === 'due'} onMsg={toast.show} />
                  ))}
                </AnimatePresence>
              </ul>
              {col.rows.length === 0 && <p className="px-1 py-4 text-center text-xs text-ink-soft">Nothing here</p>}
            </section>
          ))}
        </div>
      )}
      {toast.node}
    </>
  );
}
