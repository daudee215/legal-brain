/**
 * Data access for the whole app. Phase 0 reads the in-memory seed;
 * Phase 2 swaps these bodies for Supabase queries — pages don't change.
 */
import { seed } from '../data/seed';
import { addDays, pktDateKey } from './dates';
import { searchItems } from './search';
import type { Case, CaseCategory, CaseStats, CaseStatus, CauseListEntry, Court, Db } from '../types';
import { CASE_STATUSES } from '../types';

export interface CaseFilter {
  status?: CaseStatus;
  category?: CaseCategory;
  courtId?: string;
  q?: string;
}

export async function listCases(f: CaseFilter = {}, db: Db = seed): Promise<Case[]> {
  let rows = db.cases.filter(
    (c) =>
      (!f.status || c.status === f.status) &&
      (!f.category || c.category === f.category) &&
      (!f.courtId || c.courtId === f.courtId),
  );
  if (f.q) {
    rows = searchItems(rows, f.q, (c) => {
      const client = db.clients.find((x) => x.id === c.clientId);
      return [c.title, c.caseNo, c.category, c.judge, c.stage, client?.name ?? ''];
    });
  }
  return rows;
}

export async function getCase(id: string, db: Db = seed) {
  return db.cases.find((c) => c.id === id);
}
export async function getCourt(id: string, db: Db = seed) {
  return db.courts.find((c) => c.id === id);
}
export async function listCourts(db: Db = seed) {
  return db.courts;
}
export async function getClient(id: string, db: Db = seed) {
  return db.clients.find((c) => c.id === id);
}
export async function listClients(db: Db = seed) {
  return db.clients;
}

export interface HearingRow {
  case: Case;
  entry?: CauseListEntry;
  court: Court;
}

export async function hearingsOn(dayKey: string, db: Db = seed): Promise<HearingRow[]> {
  const rows: HearingRow[] = [];
  for (const c of db.cases) {
    if (!c.nextHearing || pktDateKey(c.nextHearing) !== dayKey) continue;
    const court = db.courts.find((x) => x.id === c.courtId);
    if (!court) continue;
    const entry = db.causeList.find((e) => e.caseId === c.id && e.date === dayKey);
    rows.push({ case: c, entry, court });
  }
  return rows.sort(
    (a, b) => a.court.shortName.localeCompare(b.court.shortName) || (a.entry?.srNo ?? 999) - (b.entry?.srNo ?? 999),
  );
}

export async function upcomingHearings(fromKey: string, days: number, db: Db = seed): Promise<Case[]> {
  const end = addDays(fromKey, days);
  return db.cases
    .filter((c) => {
      if (!c.nextHearing) return false;
      const k = pktDateKey(c.nextHearing);
      return k >= fromKey && k < end;
    })
    .sort((a, b) => (a.nextHearing! < b.nextHearing! ? -1 : 1));
}

export async function caseStats(db: Db = seed): Promise<CaseStats> {
  const byStatus = Object.fromEntries(CASE_STATUSES.map((s) => [s, 0])) as Record<CaseStatus, number>;
  const byCategory: CaseStats['byCategory'] = {};
  const byCourt: Record<string, number> = {};
  for (const c of db.cases) {
    byStatus[c.status]++;
    byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
    byCourt[c.courtId] = (byCourt[c.courtId] ?? 0) + 1;
  }
  return { total: db.cases.length, byStatus, byCategory, byCourt };
}

export async function listStatutes(db: Db = seed) {
  return db.statutes;
}
export async function getStatute(id: string, db: Db = seed) {
  return db.statutes.find((s) => s.id === id);
}
export async function listJudgments(db: Db = seed) {
  return [...db.judgments].sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function getJudgment(id: string, db: Db = seed) {
  return db.judgments.find((j) => j.id === id);
}
export async function listTemplates(db: Db = seed) {
  return db.templates;
}
export async function getTemplate(id: string, db: Db = seed) {
  return db.templates.find((t) => t.id === id);
}
export async function listDiary(dayKey?: string, db: Db = seed) {
  const rows = dayKey ? db.diary.filter((d) => pktDateKey(d.date) === dayKey) : db.diary;
  return [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function listNews(db: Db = seed) {
  return [...db.news].sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function listNotifications(db: Db = seed) {
  return [...db.notifications].sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function unreadCount(db: Db = seed) {
  return db.notifications.filter((n) => !n.read).length;
}
export async function listBooks(ownerId: string, db: Db = seed) {
  return db.books.filter((b) => b.ownerId === ownerId);
}
export async function listDocs(folder?: string, db: Db = seed) {
  return folder ? db.docs.filter((d) => d.folder === folder) : db.docs;
}
export async function listCaseDocs(caseId: string, db: Db = seed) {
  return db.docs.filter((d) => d.caseId === caseId);
}
export async function listCaseDiary(caseId: string, db: Db = seed) {
  return db.diary.filter((d) => d.caseId === caseId).sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function listMembers(db: Db = seed) {
  return db.chamber.members;
}
/**
 * Everything a demo page reads, fetched through the functions above.
 * Phase 2 replaces page-level use of this with targeted queries.
 */
export async function snapshot(db: Db = seed) {
  const me = await getMe(db);
  return {
    me,
    chamber: await getChamber(db),
    courts: await listCourts(db),
    cases: await listCases({}, db),
    clients: await listClients(db),
    statutes: await listStatutes(db),
    judgments: await listJudgments(db),
    templates: await listTemplates(db),
    diary: await listDiary(undefined, db),
    news: await listNews(db),
    notifications: await listNotifications(db),
    books: await listBooks(me.id, db),
    docs: await listDocs(undefined, db),
  };
}
export type Snapshot = Awaited<ReturnType<typeof snapshot>>;

export async function getChamber(db: Db = seed) {
  return db.chamber;
}
export async function getMe(db: Db = seed) {
  return db.me;
}
