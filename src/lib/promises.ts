/**
 * "Promised payments": a client says they will pay Rs X by a date. Pure helpers only; the store
 * writes live in promisesStore.ts. Dates are day keys ('2026-12-05').
 */
import type { FeeLedger, FeePromise } from '../types';
import { formatPk } from './dates';

type WithPromises = Pick<FeeLedger, 'payments' | 'promises'>;

export type PromiseStatus = 'kept' | 'overdue' | 'today' | 'upcoming';

const dayOf = (d: string) => d.slice(0, 10);
const byDue = (a: FeePromise, b: FeePromise) => (a.dueOn === b.dueOn ? (a.madeOn === b.madeOn ? (a.id < b.id ? -1 : 1) : a.madeOn < b.madeOn ? -1 : 1) : a.dueOn < b.dueOn ? -1 : 1);

/** A new ledger with the promise added. `id` is supplied by the caller so this stays pure. */
export function addPromise<L extends WithPromises>(ledger: L, p: { id: string; amount: number; dueOn: string; note?: string }, madeOn: string): L {
  if (!(p.amount > 0)) throw new Error('Amount must be more than zero');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.dueOn)) throw new Error('Choose the date it was promised for');
  const promise: FeePromise = { id: p.id, amount: p.amount, dueOn: p.dueOn, madeOn };
  if (p.note?.trim()) promise.note = p.note.trim();
  return { ...ledger, promises: [...(ledger.promises ?? []), promise] };
}

/** Promises not yet kept, earliest due date first. */
export function openPromises(ledger: Pick<FeeLedger, 'promises'>): FeePromise[] {
  return (ledger.promises ?? []).filter((p) => !p.keptOn).sort(byDue);
}

/** Past its date and not kept. */
export function overdue(p: FeePromise, today: string): boolean {
  return !p.keptOn && p.dueOn < today;
}

/** Due exactly today and not kept. */
export function dueToday(p: FeePromise, today: string): boolean {
  return !p.keptOn && p.dueOn === today;
}

export function promiseStatus(p: FeePromise, today: string): PromiseStatus {
  if (p.keptOn) return 'kept';
  if (p.dueOn < today) return 'overdue';
  return p.dueOn === today ? 'today' : 'upcoming';
}

/**
 * Promises to mark kept, returned as a new array (the ledger is not changed). A promise is kept when
 * payments dated on or after the day it was made add up to its amount. Each payment can only be spent
 * once: promises that are already kept claim theirs first, then open ones in due-date order, each
 * taking the oldest payments left. Safe to call again and again; a kept promise never un-keeps.
 */
export function autoKeep(ledger: WithPromises): FeePromise[] {
  const promises = ledger.promises ?? [];
  if (promises.length === 0) return promises;
  const pool = ledger.payments.map((p, i) => ({ date: dayOf(p.date), left: p.amount, i })).sort((a, b) => (a.date === b.date ? a.i - b.i : a.date < b.date ? -1 : 1));

  /** Take up to `amount` from payments on/after `since`; returns what was taken and the date of the last one used. */
  const spend = (since: string, amount: number) => {
    let need = amount;
    let last = '';
    for (const p of pool) {
      if (need <= 0) break;
      if (p.date < since || p.left <= 0) continue;
      const take = Math.min(p.left, need);
      p.left -= take;
      need -= take;
      last = p.date;
    }
    return { got: amount - need, last };
  };

  const done = new Map<string, string>();
  for (const p of [...promises].filter((x) => x.keptOn).sort(byDue)) spend(p.madeOn, p.amount);
  for (const p of [...promises].filter((x) => !x.keptOn).sort(byDue)) {
    const { got, last } = spend(p.madeOn, p.amount);
    if (got >= p.amount) done.set(p.id, last);
  }
  if (done.size === 0) return promises;
  return promises.map((p) => (done.has(p.id) ? { ...p, keptOn: done.get(p.id) } : p));
}

export interface PromiseMsg {
  clientName?: string;
  caseTitle: string;
  caseNo?: string;
  amount: number;
  dueOn: string;
  chamberName?: string;
}

const rs = (n: number) => n.toLocaleString('en-PK');

/** A polite WhatsApp reminder. `both` (default) is English, a blank line, then Urdu. */
export function promiseReminderText(m: PromiseMsg, lang: 'en' | 'ur' | 'both' = 'both'): string {
  const first = m.clientName?.trim().split(/\s+/)[0];
  const name = m.clientName?.trim();
  const ref = `${m.caseTitle}${m.caseNo ? ` (${m.caseNo})` : ''}`;
  const from = m.chamberName?.trim();
  const en = [
    `Assalam-o-Alaikum${first ? ` ${first}` : ''},`,
    `A gentle reminder${from ? ` from ${from}` : ''}: a payment of Rs ${rs(m.amount)} towards your case ${ref} was promised for ${formatPk(m.dueOn)}.`,
    'Kindly arrange it at your earliest convenience and let us know once it is sent. Thank you for your cooperation.',
  ].join('\n');
  const ur = [
    `السلام علیکم${name ? ` محترم ${name}` : ''}،`,
    `${from ? `${from} کی طرف سے ` : ''}مہربانی کر کے یاد دہانی: آپ کے کیس ${ref} کی فیس کی مد میں ${rs(m.amount)} روپے ${formatPk(m.dueOn)} تک ادا کرنے کا وعدہ ہوا تھا۔`,
    'براہِ کرم جلد ادائیگی کر کے ہمیں اطلاع دے دیجیے۔ آپ کے تعاون کا شکریہ۔',
  ].join('\n');
  return lang === 'en' ? en : lang === 'ur' ? ur : `${en}\n\n${ur}`;
}
