/**
 * Limitation countdowns. A deadline starts when an order is passed; time spent obtaining the
 * certified copy is excluded (s.12 Limitation Act 1908). Period lengths are demo values — verify.
 */
import type { Deadline } from '../types';
import { limitationDeadline, REMEDIES, type Remedy } from './limitation';
import { uid, updateDb } from './store';

export type DeadlineStatus = 'filed' | 'overdue' | 'urgent' | 'soon' | 'ok';

export interface DeadlineInfo {
  lastDay: string;
  daysLeft: number;
  excludedDays: number;
  status: DeadlineStatus;
  basis: string;
  remedy: Remedy;
}

const DAY = /^\d{4}-\d{2}-\d{2}/;

/** Whole days from day key `a` to day key `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (k: string) => {
    const [y, m, d] = k.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** Days excluded under s.12: copy ready − copy applied, only when both are set and applied on/after the order. */
export function copyExclusion(d: Pick<Deadline, 'orderDate' | 'copyAppliedOn' | 'copyReadyOn'>): number {
  if (!d.copyAppliedOn || !d.copyReadyOn) return 0;
  if (!DAY.test(d.copyAppliedOn) || !DAY.test(d.copyReadyOn)) return 0;
  if (d.copyAppliedOn.slice(0, 10) < d.orderDate.slice(0, 10)) return 0;
  return Math.max(0, daysBetween(d.copyAppliedOn, d.copyReadyOn));
}

export function computeDeadline(d: Deadline, today: string): DeadlineInfo {
  const remedy = REMEDIES.find((r) => r.id === d.remedyId);
  if (!remedy) throw new Error('Unknown remedy');
  const excludedDays = copyExclusion(d);
  const { deadlineKey } = limitationDeadline(d.orderDate.slice(0, 10), d.remedyId, excludedDays);
  const daysLeft = daysBetween(today, deadlineKey);
  const status: DeadlineStatus = d.filedOn ? 'filed' : daysLeft < 0 ? 'overdue' : daysLeft <= 7 ? 'urgent' : daysLeft <= 30 ? 'soon' : 'ok';
  return { lastDay: deadlineKey, daysLeft, excludedDays, status, basis: remedy.basis, remedy };
}

const RANK: Record<DeadlineStatus, number> = { overdue: 0, urgent: 1, soon: 2, ok: 3, filed: 4 };

/** Most urgent first: overdue, then fewest days left; filed last. */
export function sortByUrgency<T extends { info: DeadlineInfo }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => RANK[a.info.status] - RANK[b.info.status] || a.info.daysLeft - b.info.daysLeft);
}

function check(p: Partial<Deadline>) {
  if (p.remedyId !== undefined && !REMEDIES.some((r) => r.id === p.remedyId)) throw new Error('Pick a remedy');
  if (p.orderDate !== undefined && !DAY.test(p.orderDate)) throw new Error('Order date is required');
  if (p.copyAppliedOn && p.copyReadyOn && p.copyReadyOn < p.copyAppliedOn) throw new Error('Copy ready date is before the date applied');
}

export function addDeadline(p: Omit<Deadline, 'id'>): Deadline {
  if (!p.caseId) throw new Error('Pick a case');
  check(p);
  const d: Deadline = { ...p, id: uid('dl'), copyAppliedOn: p.copyAppliedOn || undefined, copyReadyOn: p.copyReadyOn || undefined, note: p.note?.trim() || undefined };
  updateDb((db) => void db.deadlines.push(d));
  return d;
}

export function updateDeadline(id: string, patch: Partial<Omit<Deadline, 'id'>>) {
  updateDb((db) => {
    const d = db.deadlines.find((x) => x.id === id);
    if (!d) throw new Error('Deadline not found');
    const next = { ...d, ...patch };
    for (const k of ['copyAppliedOn', 'copyReadyOn', 'filedOn', 'note'] as const) if (!next[k]) delete next[k];
    check(next);
    Object.keys(d).forEach((k) => delete (d as unknown as Record<string, unknown>)[k]);
    Object.assign(d, next);
  });
}

/** Mark the appeal/petition as filed on `filedOn` (a day key), or pass null to undo. */
export function markFiled(id: string, filedOn: string | null) {
  updateDeadline(id, { filedOn: filedOn ?? undefined });
}

export function deleteDeadline(id: string) {
  updateDb((db) => void (db.deadlines = db.deadlines.filter((d) => d.id !== id)));
}
