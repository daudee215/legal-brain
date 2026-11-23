'use client';

import { CheckCircle2, CircleDashed, Plus, Receipt } from 'lucide-react';
import { useState } from 'react';
import { formatPk, todayKey } from '../../lib/dates';
import { addExpense, setExpenseReimbursed } from '../../lib/mutations';
import { getDb } from '../../lib/store';
import { useData } from '../../lib/useData';
import type { Expense } from '../../types';
import { btn, Card, CardTitle, EmptyState, inputCls } from '../ui';
import { useToast } from '../ui/Toast';

const KINDS: Expense['kind'][] = ['Court fee', 'Stamp paper', 'Photocopies', 'Certified copy', 'Travel', 'Munshi', 'Other'];
const rs = (n: number) => `Rs ${n.toLocaleString('en-PK')}`;

/** Out-of-pocket costs on one case, and how much the client still owes back. */
export function ExpensesPanel({ caseId }: { caseId: string }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ kind: KINDS[0], amount: '', date: '', note: '' });
  const [err, setErr] = useState('');
  const rows = useData(async () => getDb().expenses.filter((e) => e.caseId === caseId).sort((a, b) => (a.date < b.date ? 1 : -1)), [caseId]);

  const owed = rows?.filter((e) => !e.reimbursed).reduce((a, e) => a + e.amount, 0) ?? 0;
  const spent = rows?.reduce((a, e) => a + e.amount, 0) ?? 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      addExpense({ caseId, kind: form.kind, amount: Number(form.amount), date: form.date || todayKey(), note: form.note.trim() || undefined });
      setForm({ kind: form.kind, amount: '', date: '', note: '' });
      setErr('');
      setAdding(false);
      toast.show('Expense added');
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <Card>
      <CardTitle
        action={
          <button className={btn.ghost} onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden /> {adding ? 'Close' : 'Add expense'}
          </button>
        }
      >
        Expenses
      </CardTitle>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-cream/50 p-3">
          <p className="text-xs uppercase tracking-wide text-ink-soft">To recover</p>
          <p className={`font-serif text-2xl font-bold ${owed ? 'text-danger' : 'text-ok'}`}>{rs(owed)}</p>
        </div>
        <div className="rounded-xl border border-line bg-cream/50 p-3">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Spent in total</p>
          <p className="font-serif text-2xl font-bold">{rs(spent)}</p>
        </div>
      </div>

      {adding && (
        <form onSubmit={submit} className="mb-4 grid gap-3 rounded-xl border border-line bg-cream/40 p-4 sm:grid-cols-2">
          <label className="text-xs text-ink-soft">
            Kind
            <select className={`${inputCls} mt-1`} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Expense['kind'] })}>
              {KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-soft">
            Amount (Rs)
            <input type="number" min="1" inputMode="numeric" className={`${inputCls} mt-1`} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </label>
          <label className="text-xs text-ink-soft">
            Date
            <input type="date" className={`${inputCls} mt-1`} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label className="text-xs text-ink-soft">
            Note
            <input className={`${inputCls} mt-1`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="optional" />
          </label>
          {err && <p className="text-sm text-danger sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2">
            <button type="submit" className={btn.primary}>
              Save expense
            </button>
          </div>
        </form>
      )}

      {rows && rows.length === 0 ? (
        <EmptyState title="No expenses yet" body="Record court fee, stamp paper, photocopies and the like to recover them from the client." />
      ) : (
        <ul className="divide-y divide-line">
          {rows?.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
              <Receipt className="h-4 w-4 shrink-0 text-bronze" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {e.kind} <span className="font-normal text-ink-soft">· {formatPk(e.date)}</span>
                </p>
                {e.note && <p className="truncate text-xs text-ink-soft">{e.note}</p>}
              </div>
              <span className="font-semibold tabular-nums">{rs(e.amount)}</span>
              <button
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${e.reimbursed ? 'bg-ok/15 text-ok' : 'bg-line/70 text-ink hover:bg-bronze/15'}`}
                aria-pressed={e.reimbursed}
                title={e.reimbursed ? 'Mark as not reimbursed' : 'Mark as reimbursed'}
                onClick={() => setExpenseReimbursed(e.id, !e.reimbursed)}
              >
                {e.reimbursed ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <CircleDashed className="h-3.5 w-3.5" aria-hidden />}
                {e.reimbursed ? 'Reimbursed' : 'Unpaid'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {toast.node}
    </Card>
  );
}

export default ExpensesPanel;
