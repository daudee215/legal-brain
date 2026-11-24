/** Store reads and writes for promised payments (the logic itself is in promises.ts). */
import type { Case, Client, Db, FeePromise } from '../types';
import { todayKey } from './dates';
import { addPromise, autoKeep, dueToday, overdue } from './promises';
import { getDb, uid, updateDb } from './store';

export function addFeePromise(caseId: string, p: { amount: number; dueOn: string; note?: string }): void {
  updateDb((db) => {
    const i = db.fees.findIndex((x) => x.caseId === caseId);
    const base = i >= 0 ? db.fees[i] : { caseId, agreed: 0, payments: [] };
    const next = addPromise(base, { ...p, id: uid('promise') }, todayKey());
    if (i >= 0) db.fees[i] = next;
    else db.fees.push(next);
  });
}

export function deleteFeePromise(caseId: string, promiseId: string): void {
  updateDb((db) => {
    const f = db.fees.find((x) => x.caseId === caseId);
    if (f?.promises) f.promises = f.promises.filter((p) => p.id !== promiseId);
  });
}

export interface DuePromiseRow {
  promise: FeePromise;
  case: Case;
  client?: Client;
}

/** Promises due today or already overdue across all cases, oldest first. Run autoKeep first so paid ones drop out. */
export function promisesDue(today: string = todayKey(), db: Db = getDb()): DuePromiseRow[] {
  const rows: DuePromiseRow[] = [];
  for (const f of db.fees) {
    const c = db.cases.find((x) => x.id === f.caseId);
    if (!c) continue;
    const kept = autoKeep(f);
    for (const promise of kept) {
      if (dueToday(promise, today) || overdue(promise, today)) rows.push({ promise, case: c, client: db.clients.find((x) => x.id === c.clientId) });
    }
  }
  return rows.sort((a, b) => (a.promise.dueOn < b.promise.dueOn ? -1 : 1));
}
