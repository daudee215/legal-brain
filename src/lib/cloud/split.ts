/**
 * The cloud stores only the chamber's own practice data, in two halves:
 *  - "data" (every member):  cases, clients, cause list, diary, notifications, books, documents, tasks, deadlines, precedents
 *  - "billing" (seniors only): fees, expenses
 * The reference library (courts, laws, judgments, templates, news) ships with the app and is never uploaded.
 */
import { seed } from '../../data/seed';
import type { Chamber, Db, Member } from '../../types';

export const DATA_KEYS = ['cases', 'clients', 'causeList', 'diary', 'notifications', 'books', 'docs', 'tasks', 'deadlines', 'precedents'] as const;
export const BILLING_KEYS = ['fees', 'expenses'] as const;

export type Half = Record<string, unknown[]>;

export function splitDb(db: Db): { data: Half; billing: Half } {
  const data: Half = {};
  const billing: Half = {};
  for (const k of DATA_KEYS) data[k] = db[k] as unknown[];
  for (const k of BILLING_KEYS) billing[k] = db[k] as unknown[];
  return { data, billing };
}

export function composeDb(p: { chamber: Chamber; me: Member; data: Half; billing: Half | null }): Db {
  const arr = <T,>(h: Half | null, k: string) => ((h?.[k] as T[] | undefined) ?? []) as T[];
  return {
    chamber: p.chamber,
    me: p.me,
    courts: seed.courts,
    statutes: seed.statutes,
    judgments: seed.judgments,
    templates: seed.templates,
    news: seed.news,
    cases: arr(p.data, 'cases'),
    clients: arr(p.data, 'clients'),
    causeList: arr(p.data, 'causeList'),
    diary: arr(p.data, 'diary'),
    notifications: arr(p.data, 'notifications'),
    books: arr(p.data, 'books'),
    docs: arr(p.data, 'docs'),
    tasks: arr(p.data, 'tasks'),
    deadlines: arr(p.data, 'deadlines'),
    precedents: arr(p.data, 'precedents'),
    fees: arr(p.billing, 'fees'),
    expenses: arr(p.billing, 'expenses'),
  };
}
