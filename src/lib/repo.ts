/**
 * Data access for the whole app. Phase 0 reads the in-memory seed;
 * Phase 2 swaps these bodies for Supabase queries — pages don't change.
 */
import { getDb } from './store';
import { addDays, pktDateKey } from './dates';
import { searchItems } from './search';
import type { ActivityItem, Case, CaseCategory, CaseStats, CaseStatus, CauseListEntry, Court, Db, FeeLedger } from '../types';
import { CASE_STATUSES } from '../types';

export interface CaseFilter {
  status?: CaseStatus;
  category?: CaseCategory;
  courtId?: string;
  q?: string;
}

export async function listCases(f: CaseFilter = {}, db: Db = getDb()): Promise<Case[]> {
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

export async function getCase(id: string, db: Db = getDb()) {
  return db.cases.find((c) => c.id === id);
}
export async function getCourt(id: string, db: Db = getDb()) {
  return db.courts.find((c) => c.id === id);
}
export async function listCourts(db: Db = getDb()) {
  return db.courts;
}
export async function getClient(id: string, db: Db = getDb()) {
  return db.clients.find((c) => c.id === id);
}
export async function listClients(db: Db = getDb()) {
  return db.clients;
}

export interface HearingRow {
  case: Case;
  entry?: CauseListEntry;
  court: Court;
}

export async function hearingsOn(dayKey: string, db: Db = getDb()): Promise<HearingRow[]> {
  const rows: HearingRow[] = [];
  for (const c of db.cases) {
    const listed = (c.nextHearing && pktDateKey(c.nextHearing) === dayKey) || c.hearings.some((h) => pktDateKey(h.date) === dayKey);
    if (!listed) continue;
    const court = db.courts.find((x) => x.id === c.courtId);
    if (!court) continue;
    const entry = db.causeList.find((e) => e.caseId === c.id && e.date === dayKey);
    rows.push({ case: c, entry, court });
  }
  return rows.sort(
    (a, b) => a.court.shortName.localeCompare(b.court.shortName) || (a.entry?.srNo ?? 999) - (b.entry?.srNo ?? 999),
  );
}

export async function upcomingHearings(fromKey: string, days: number, db: Db = getDb()): Promise<Case[]> {
  const end = addDays(fromKey, days);
  return db.cases
    .filter((c) => {
      if (!c.nextHearing) return false;
      const k = pktDateKey(c.nextHearing);
      return k >= fromKey && k < end;
    })
    .sort((a, b) => (a.nextHearing! < b.nextHearing! ? -1 : 1));
}

export async function caseStats(db: Db = getDb()): Promise<CaseStats> {
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

export async function listStatutes(db: Db = getDb()) {
  return db.statutes;
}
export async function getStatute(id: string, db: Db = getDb()) {
  return db.statutes.find((s) => s.id === id);
}
export async function listJudgments(db: Db = getDb()) {
  return [...db.judgments].sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function getJudgment(id: string, db: Db = getDb()) {
  return db.judgments.find((j) => j.id === id);
}
export async function listTemplates(db: Db = getDb()) {
  return db.templates;
}
export async function getTemplate(id: string, db: Db = getDb()) {
  return db.templates.find((t) => t.id === id);
}
export async function listDiary(dayKey?: string, db: Db = getDb()) {
  const rows = dayKey ? db.diary.filter((d) => pktDateKey(d.date) === dayKey) : db.diary;
  return [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function listNews(db: Db = getDb()) {
  return [...db.news].sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function listNotifications(db: Db = getDb()) {
  return [...db.notifications].sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function unreadCount(db: Db = getDb()) {
  return db.notifications.filter((n) => !n.read).length;
}
export async function listBooks(ownerId: string, db: Db = getDb()) {
  return db.books.filter((b) => b.ownerId === ownerId);
}
export async function listDocs(folder?: string, db: Db = getDb()) {
  return folder ? db.docs.filter((d) => d.folder === folder) : db.docs;
}
export async function listCaseDocs(caseId: string, db: Db = getDb()) {
  return db.docs.filter((d) => d.caseId === caseId);
}
export async function listCaseDiary(caseId: string, db: Db = getDb()) {
  return db.diary.filter((d) => d.caseId === caseId).sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function listMembers(db: Db = getDb()) {
  return db.chamber.members;
}
/**
 * Everything a demo page reads, fetched through the functions above.
 * Phase 2 replaces page-level use of this with targeted queries.
 */
export async function snapshot(db: Db = getDb()) {
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
    fees: db.fees,
  };
}
export type Snapshot = Awaited<ReturnType<typeof snapshot>>;

export async function getChamber(db: Db = getDb()) {
  return db.chamber;
}
export async function getMe(db: Db = getDb()) {
  return db.me;
}

export interface FeeRow extends FeeLedger {
  received: number;
  outstanding: number;
}
function toRow(l: FeeLedger): FeeRow {
  const received = l.payments.reduce((a, p) => a + p.amount, 0);
  return { ...l, received, outstanding: Math.max(0, l.agreed - received) };
}

/** The fee agreed for one case and what has been paid against it, or undefined if no fee is recorded. */
export async function getFeeLedger(caseId: string, db: Db = getDb()): Promise<FeeRow | undefined> {
  const l = db.fees.find((f) => f.caseId === caseId);
  return l ? toRow(l) : undefined;
}

/** Chamber-wide fee totals plus one row per case, largest outstanding first. */
export async function feeSummary(db: Db = getDb()) {
  const rows = db.fees
    .map((l) => ({ ...toRow(l), case: db.cases.find((c) => c.id === l.caseId) }))
    .filter((r): r is FeeRow & { case: Case } => !!r.case)
    .sort((a, b) => b.outstanding - a.outstanding);
  const sum = (f: (r: FeeRow) => number) => rows.reduce((a, r) => a + f(r), 0);
  return { agreed: sum((r) => r.agreed), received: sum((r) => r.received), outstanding: sum((r) => r.outstanding), rows };
}

/** Number of cases listed per day (past hearings, adjourned-to dates and next dates), one bucket per day. */
export async function hearingLoad(fromKey: string, days: number, db: Db = getDb()): Promise<{ date: string; count: number }[]> {
  const perDay = new Map<string, Set<string>>();
  const add = (iso: string | undefined, caseId: string) => {
    if (!iso) return;
    const k = pktDateKey(iso);
    if (!perDay.has(k)) perDay.set(k, new Set());
    perDay.get(k)!.add(caseId);
  };
  for (const c of db.cases) {
    add(c.nextHearing, c.id);
    for (const h of c.hearings) {
      add(h.date, c.id);
      add(h.nextDate, c.id);
    }
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(fromKey, i);
    return { date, count: perDay.get(date)?.size ?? 0 };
  });
}

/** What happened in the chamber up to and including `todayKey`, newest first. */
export async function recentActivity(todayKey: string, limit: number, db: Db = getDb()): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];
  const title = (id?: string) => db.cases.find((c) => c.id === id)?.title ?? '';
  for (const c of db.cases)
    for (const h of c.hearings) items.push({ date: h.date, kind: 'hearing', title: c.title, detail: h.proceedings, href: `/app/case/?id=${c.id}` });
  for (const e of db.diary)
    items.push({ date: e.date, kind: 'diary', title: e.caseId ? title(e.caseId) : 'Diary note', detail: e.text, href: '/app/diary/' });
  for (const f of db.docs)
    items.push({ date: f.uploadedOn, kind: 'document', title: f.name, detail: f.caseId ? title(f.caseId) : f.folder, href: '/app/documents/' });
  for (const l of db.fees)
    for (const p of l.payments)
      items.push({
        date: p.date,
        kind: 'payment',
        title: `Rs ${p.amount.toLocaleString('en-PK')} received`,
        detail: `${title(l.caseId)} · ${p.mode}`,
        href: `/app/case/?id=${l.caseId}`,
      });
  return items
    .filter((i) => pktDateKey(i.date) <= todayKey)
    .sort((a, b) => (pktDateKey(a.date) === pktDateKey(b.date) ? (a.date < b.date ? 1 : -1) : pktDateKey(a.date) < pktDateKey(b.date) ? 1 : -1))
    .slice(0, limit);
}
