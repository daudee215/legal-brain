/**
 * Who may change which part of the shared chamber data.
 *
 * The same rules run in two places, so the app and the server always agree:
 *  - here, on the device: edits a role is not allowed to make are undone before they are sent;
 *  - in Supabase (supabase/role-guard.sql, `data_change_problem`): the real gate, which refuses a
 *    save that breaks the rules even if someone bypasses the app.
 * Keep both in step. `tests/unit/roleGuard.test.ts` holds the rule table both must follow.
 *
 * The rules are judged against the chamber's *current saved copy* (including the senior's settings),
 * never against what the sender claims.
 */
import type { ChamberSettings, Role } from '../types';
import { accessOf, type Action } from './permissions';

type Half = Record<string, unknown>;

/** Which right is needed to change each part of the shared data. `null` = any member. */
const NEEDS: Record<string, Action | 'senior' | null> = {
  cases: 'cases.edit',
  clients: 'cases.edit',
  causeList: 'cases.edit',
  deadlines: 'cases.edit',
  diary: 'diary.write',
  notifications: 'diary.write',
  docs: 'documents.upload',
  books: 'library',
  precedents: 'precedents',
  tasks: null,
  settings: 'senior',
};

const canon = (x: unknown): string =>
  JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]])) : v));
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const same = (a: unknown, b: unknown) => canon(a) === canon(b);

const OUTCOME_FIELDS = ['hearings', 'stage', 'status', 'nextHearing', 'result'];
const without = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

/**
 * Recording what happened at a hearing (what a clerk does in Munshi Mode): the same cases, in the same order,
 * where only the history grows and the stage, status, next date and result move. Nothing else.
 */
export function isOutcomeOnly(oldCases: unknown, newCases: unknown): boolean {
  const o = arr(oldCases) as Record<string, unknown>[];
  const n = arr(newCases) as Record<string, unknown>[];
  if (o.length !== n.length) return false;
  return o.every((oc, i) => {
    const nc = n[i];
    if (!nc || typeof nc !== 'object' || typeof oc !== 'object') return false;
    if (!same(without(oc, OUTCOME_FIELDS), without(nc, OUTCOME_FIELDS))) return false;
    const oh = arr(oc.hearings);
    const nh = arr(nc.hearings);
    return nh.length >= oh.length && same(nh.slice(0, oh.length), oh);
  });
}

/** The first part of the data this role may not change, or null when every change is allowed. */
export function dataChangeProblem(role: Role, saved: Half, next: Half, userId?: string): string | null {
  if (role === 'senior') return null;
  const settings = arr(saved.settings)[0] as ChamberSettings | undefined;
  const allowed = accessOf(role, settings?.access, userId ? settings?.memberAccess?.[userId] : null);
  const keys = new Set([...Object.keys(saved), ...Object.keys(next)]);
  for (const k of keys) {
    if (same(arr(saved[k]), arr(next[k]))) continue;
    if (!(k in NEEDS)) return k;
    const need = NEEDS[k];
    if (need === null) continue;
    if (need === 'senior') return k;
    if (allowed.has(need)) continue;
    // A clerk without the right to edit cases can still record what happened at a hearing.
    if (k === 'cases' && allowed.has('diary.write') && isOutcomeOnly(saved.cases, next.cases)) continue;
    return k;
  }
  return null;
}

/** Undo every change this role is not allowed to make, key by key. Returns the cleaned copy and what was undone. */
export function undoForbidden(role: Role, saved: Half, next: Half, userId?: string): { data: Half; undone: string[] } {
  const undone: string[] = [];
  let data: Half = next;
  // Each pass finds one offending key; a handful at most.
  for (let i = 0; i < 20; i++) {
    const k = dataChangeProblem(role, saved, data, userId);
    if (!k) break;
    undone.push(k);
    data = { ...data, [k]: saved[k] ?? [] };
  }
  return { data, undone };
}
