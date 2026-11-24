/**
 * Every write to the practice data. Pages call these; they never touch the store directly.
 * Phase 2 swaps the bodies for Supabase calls (with the same signatures).
 */
import type { Case, CaseCategory, CaseStatus, Client, DiaryEntry, Expense, FeePayment, Precedent, Task } from '../types';
import { autoKeep } from './promises';
import { getDb, uid, updateDb } from './store';

const nowIso = () => new Date().toISOString();

export function addClient(p: { name: string; phone?: string; city?: string; cnicMasked?: string }): Client {
  const c: Client = { id: uid('client'), name: p.name.trim(), phone: p.phone?.trim() ?? '', city: p.city?.trim() ?? '', cnicMasked: p.cnicMasked ?? '', caseIds: [] };
  if (!c.name) throw new Error('Client name is required');
  updateDb((db) => void db.clients.push(c));
  return c;
}

export function addCase(p: {
  title: string;
  caseNo: string;
  category: CaseCategory;
  courtId: string;
  clientId?: string;
  nextHearing?: string;
  judge?: string;
  stage?: string;
  filedOn?: string;
  assignedTo?: string[];
}): Case {
  if (!p.title.trim()) throw new Error('Case title is required');
  const db0 = getDb();
  const c: Case = {
    id: uid('case'),
    chamberId: db0.chamber.id,
    caseNo: p.caseNo.trim(),
    title: p.title.trim(),
    category: p.category,
    courtId: p.courtId,
    judge: p.judge?.trim() ?? '',
    stage: p.stage?.trim() || 'Fresh',
    status: 'pending',
    filedOn: p.filedOn ?? nowIso().slice(0, 10),
    nextHearing: p.nextHearing || undefined,
    clientId: p.clientId ?? '',
    assignedTo: p.assignedTo ?? [db0.me.id],
    hearings: [],
  };
  updateDb((db) => {
    db.cases.push(c);
    const cl = db.clients.find((x) => x.id === c.clientId);
    if (cl && !cl.caseIds.includes(c.id)) cl.caseIds.push(c.id);
  });
  return c;
}

export function updateCase(id: string, patch: Partial<Omit<Case, 'id' | 'hearings'>>) {
  updateDb((db) => {
    const c = db.cases.find((x) => x.id === id);
    if (!c) throw new Error('Case not found');
    Object.assign(c, patch);
  });
}

export function deleteCase(id: string) {
  updateDb((db) => {
    db.cases = db.cases.filter((c) => c.id !== id);
    db.clients.forEach((cl) => (cl.caseIds = cl.caseIds.filter((x) => x !== id)));
    db.causeList = db.causeList.filter((e) => e.caseId !== id);
    db.fees = db.fees.filter((f) => f.caseId !== id);
    db.deadlines = db.deadlines.filter((d) => d.caseId !== id);
  });
}

export interface Outcome {
  date: string;
  proceedings: string;
  nextDate?: string;
  stage?: string;
  status?: CaseStatus;
  result?: string;
  authorId: string;
}

/** What happened at a hearing: adds it to the history, moves the next date, notes it in the diary. */
export function recordOutcome(caseId: string, o: Outcome) {
  if (!o.proceedings.trim()) throw new Error('Write what happened at the hearing');
  updateDb((db) => {
    const c = db.cases.find((x) => x.id === caseId);
    if (!c) throw new Error('Case not found');
    c.hearings.push({ date: o.date, proceedings: o.proceedings.trim(), nextDate: o.nextDate || undefined });
    if (o.stage?.trim()) c.stage = o.stage.trim();
    const closed = o.status === 'decided' || o.status === 'disposed';
    c.status = o.status ?? (o.nextDate ? 'adjourned' : c.status);
    c.nextHearing = closed ? undefined : o.nextDate || undefined;
    if (o.result?.trim()) c.result = o.result.trim();
    db.diary.push({
      id: uid('diary'),
      date: nowIso(),
      caseId,
      authorId: o.authorId,
      text: `${o.proceedings.trim()}${o.nextDate && !closed ? ` — next date ${o.nextDate.slice(0, 10)}` : ''}`,
    });
  });
}

export function addDiary(p: { text: string; authorId: string; caseId?: string; date?: string }): DiaryEntry {
  if (!p.text.trim()) throw new Error('Note is empty');
  const e: DiaryEntry = { id: uid('diary'), date: p.date ?? nowIso(), text: p.text.trim(), authorId: p.authorId, caseId: p.caseId };
  updateDb((db) => void db.diary.push(e));
  return e;
}

export function upsertFee(caseId: string, agreed: number) {
  if (!(agreed >= 0)) throw new Error('Fee must be a positive amount');
  updateDb((db) => {
    const f = db.fees.find((x) => x.caseId === caseId);
    if (f) f.agreed = agreed;
    else db.fees.push({ caseId, agreed, payments: [] });
  });
}

export function addPayment(caseId: string, p: FeePayment) {
  if (!(p.amount > 0)) throw new Error('Amount must be more than zero');
  updateDb((db) => {
    let f = db.fees.find((x) => x.caseId === caseId);
    if (!f) {
      f = { caseId, agreed: 0, payments: [] };
      db.fees.push(f);
    }
    f.payments.push(p);
    if (f.promises?.length) f.promises = autoKeep(f);
  });
}

export function addExpense(p: Omit<Expense, 'id' | 'reimbursed'> & { reimbursed?: boolean }): Expense {
  if (!(p.amount > 0)) throw new Error('Amount must be more than zero');
  const e: Expense = { ...p, id: uid('exp'), reimbursed: p.reimbursed ?? false };
  updateDb((db) => void db.expenses.push(e));
  return e;
}

export function setExpenseReimbursed(id: string, reimbursed: boolean) {
  updateDb((db) => {
    const e = db.expenses.find((x) => x.id === id);
    if (e) e.reimbursed = reimbursed;
  });
}

export function addTask(p: { title: string; assigneeId: string; caseId?: string; due?: string }): Task {
  if (!p.title.trim()) throw new Error('Task is empty');
  const t: Task = { id: uid('task'), title: p.title.trim(), assigneeId: p.assigneeId, caseId: p.caseId, due: p.due, done: false, createdAt: nowIso() };
  updateDb((db) => void db.tasks.push(t));
  return t;
}

export function setTaskDone(id: string, done: boolean) {
  updateDb((db) => {
    const t = db.tasks.find((x) => x.id === id);
    if (t) t.done = done;
  });
}

export function deleteTask(id: string) {
  updateDb((db) => void (db.tasks = db.tasks.filter((t) => t.id !== id)));
}

export function addPrecedent(p: Omit<Precedent, 'id'>): Precedent {
  if (!p.citation.trim()) throw new Error('Citation is required');
  const x: Precedent = { ...p, id: uid('prec') };
  updateDb((db) => void db.precedents.push(x));
  return x;
}

export function deletePrecedent(id: string) {
  updateDb((db) => void (db.precedents = db.precedents.filter((p) => p.id !== id)));
}
