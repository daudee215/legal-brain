/**
 * Two English PDFs for the chamber: a one-page "Hearing prep sheet" for one case, and a "Monthly practice report".
 * Same letterhead and Times style as pdfDocs.ts. The month/case selection logic lives in pure functions
 * below (exported) so it can be tested without drawing anything.
 */
import { PDFDocument, type PDFFont } from 'pdf-lib';
import type { Case, DiaryEntry, Db, DocFile, Hearing, Task } from '../types';
import { formatPk, formatTime, pktDateKey, todayKey } from './dates';
import { BRONZE, INK, LINE, SOFT, Writer, drawLogo, numberPages, pdfSafe, rupees, times, wrapText } from './pdfDocs';
import { letterheadOf } from './chamberSettings';

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

/** Collapse whitespace and cut long text so one note can never swallow the page. */
export function clip(s: string, max: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function letterhead(w: Writer, f: Fonts, h: { chamberName: string; tagline?: string; contact?: string }, nameSize = 16) {
  w.text(h.chamberName, { size: nameSize, font: f.bold, align: 'center' });
  w.text(h.tagline || 'Advocates & Legal Consultants', { size: 9, font: f.italic, color: SOFT, align: 'center', gap: h.contact ? 1 : 4 });
  if (h.contact) w.text(h.contact, { size: 8.5, color: SOFT, align: 'center', gap: 4 });
  w.rule(BRONZE, 1.2);
}

function heading(w: Writer, f: Fonts, text: string, size = 11) {
  w.ensure(size * 1.4 + 18);
  w.y -= 4;
  w.text(text.toUpperCase(), { size: size - 1.5, font: f.bold, color: BRONZE, gap: 1 });
}

/** One row of two label/value cells side by side. */
function kvRow(w: Writer, f: Fonts, cells: [string, string][], size = 9.5) {
  const lh = size * 1.35;
  const colW = w.width / cells.length;
  const labelW = 62;
  const wrapped = cells.map(([, v]) => wrapText(v || '-', f.regular, size, colW - labelW - 6));
  const rows = Math.max(...wrapped.map((l) => l.length));
  w.ensure(rows * lh + 2);
  cells.forEach(([k], i) => {
    const x = w.margin.left + i * colW;
    w.page.drawText(pdfSafe(k, f.bold), { x, y: w.y - size, size: size - 1, font: f.bold, color: SOFT });
    wrapped[i].forEach((l, n) => l && w.page.drawText(l, { x: x + labelW, y: w.y - size - n * lh, size, font: f.regular, color: INK }));
  });
  w.y -= rows * lh + 2;
}

/** A list item: optional bold label (or a check box) in a left gutter, wrapped text beside it. */
function item(w: Writer, f: Fonts, o: { label?: string; box?: boolean; text: string; gutter?: number; size?: number }) {
  const size = o.size ?? 9.5;
  const lh = size * 1.35;
  const gutter = o.gutter ?? (o.box ? 14 : 64);
  const lines = wrapText(o.text, f.regular, size, w.width - gutter);
  w.ensure(Math.min(lines.length, 2) * lh + 2);
  const x0 = w.margin.left;
  if (o.label) w.page.drawText(pdfSafe(o.label, f.bold), { x: x0, y: w.y - size, size: size - 1, font: f.bold, color: SOFT });
  if (o.box) w.page.drawRectangle({ x: x0, y: w.y - size + 1, width: 7, height: 7, borderColor: SOFT, borderWidth: 0.7 });
  lines.forEach((l, i) => {
    w.ensure(lh);
    if (l) w.page.drawText(l, { x: x0 + gutter, y: w.y - size, size, font: f.regular, color: INK });
    w.y -= lh;
  });
  w.y -= 1.5;
}

/* ---------------------------------------------------------------------------------------------- */
/* Hearing prep sheet                                                                              */
/* ---------------------------------------------------------------------------------------------- */

export interface PrepInput {
  chamberName: string;
  tagline?: string;
  contact?: string;
  logo?: string;
  caseTitle: string;
  caseNo: string;
  court: string;
  judge: string;
  stage: string;
  status: string;
  nextHearing?: string;
  clientName: string;
  clientPhone?: string;
  hearings: Hearing[];
  tasks: { title: string; due?: string; assignee?: string }[];
  notes: { date: string; text: string }[];
  /** File names only. */
  documents: string[];
  /** Printed only when given. The UI passes it only for people who may see billing. */
  fee?: { agreed: number; received: number; outstanding: number };
  date: string;
}

/** The newest `n` hearings, newest first. */
export function lastHearings(hearings: Hearing[], n = 3): Hearing[] {
  return [...hearings].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, n);
}

/** Not-done tasks for one case, soonest due first (undated last). */
export function openTasksFor(tasks: Task[], caseId: string): Task[] {
  return tasks
    .filter((t) => t.caseId === caseId && !t.done)
    .sort((a, b) => (a.due && b.due ? (a.due < b.due ? -1 : a.due > b.due ? 1 : 0) : a.due ? -1 : b.due ? 1 : 0));
}

/** The newest `n` diary notes for one case, newest first. */
export function lastNotesFor(diary: DiaryEntry[], caseId: string, n = 5): DiaryEntry[] {
  return diary
    .filter((d) => d.caseId === caseId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, n);
}

/** Everything the prep sheet prints, gathered from the data (fee only when `withFee`). */
export function buildPrepInput(db: Db, caseId: string, opts: { withFee: boolean; today?: string }): PrepInput | undefined {
  const c = db.cases.find((x) => x.id === caseId);
  if (!c) return undefined;
  const client = db.clients.find((x) => x.id === c.clientId);
  const court = db.courts.find((x) => x.id === c.courtId);
  const ledger = db.fees.find((x) => x.caseId === caseId);
  const received = ledger ? ledger.payments.reduce((a, p) => a + p.amount, 0) : 0;
  const nameOf = (id: string) => db.chamber.members.find((m) => m.id === id)?.name;
  return {
    chamberName: db.chamber.name,
    ...letterheadOf(db),
    caseTitle: c.title,
    caseNo: c.caseNo,
    court: court?.name ?? '-',
    judge: c.judge,
    stage: c.stage,
    status: c.status,
    nextHearing: c.nextHearing,
    clientName: client?.name ?? '-',
    clientPhone: client?.phone,
    hearings: c.hearings,
    tasks: openTasksFor(db.tasks, caseId).map((t) => ({ title: t.title, due: t.due, assignee: nameOf(t.assigneeId) })),
    notes: lastNotesFor(db.diary, caseId).map((d) => ({ date: d.date, text: d.text })),
    documents: db.docs.filter((d: DocFile) => d.caseId === caseId).map((d) => d.name),
    ...(opts.withFee && ledger ? { fee: { agreed: ledger.agreed, received, outstanding: Math.max(0, ledger.agreed - received) } } : {}),
    date: opts.today ?? todayKey(),
  };
}

const MAX_TASKS = 10;
const MAX_DOCS = 40;

export async function hearingPrepPdf(p: PrepInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Hearing prep - ${p.caseTitle}`);
  const f = await times(doc);
  const w = new Writer(doc, f, { top: 40, bottom: 44, left: 48, right: 48 });
  await drawLogo(w, p.logo, 34);
  letterhead(w, f, p);
  w.text('HEARING PREPARATION SHEET', { size: 12, font: f.bold, color: BRONZE, align: 'center', gap: 0 });
  w.text(`Prepared ${formatPk(p.date)}`, { size: 8.5, font: f.italic, color: SOFT, align: 'center', gap: 4 });

  const next = p.nextHearing ? `${formatPk(p.nextHearing)}${/T/.test(p.nextHearing) ? `, ${formatTime(p.nextHearing)}` : ''}` : 'Not fixed';
  kvRow(w, f, [['Case', clip(p.caseTitle, 120)]]);
  kvRow(w, f, [
    ['Case No.', p.caseNo],
    ['Court', p.court],
  ]);
  kvRow(w, f, [
    ['Judge / Bench', p.judge],
    ['Stage', p.stage],
  ]);
  kvRow(w, f, [
    ['Status', cap(p.status)],
    ['Next hearing', next],
  ]);
  kvRow(w, f, [
    ['Client', p.clientName],
    ['Phone', p.clientPhone || '-'],
  ]);
  if (p.fee) kvRow(w, f, [['Fee', `Agreed ${rupees(p.fee.agreed)}  |  Received ${rupees(p.fee.received)}  |  Outstanding ${rupees(p.fee.outstanding)}`]]);

  heading(w, f, 'Last hearings');
  const hs = lastHearings(p.hearings, 3);
  if (!hs.length) item(w, f, { text: 'No hearings recorded yet.' });
  for (const h of hs) item(w, f, { label: formatPk(h.date), text: clip(h.proceedings, 260) + (h.nextDate ? ` Next date: ${formatPk(h.nextDate)}.` : '') });

  heading(w, f, 'Open tasks');
  if (!p.tasks.length) item(w, f, { text: 'None open for this case.' });
  for (const t of p.tasks.slice(0, MAX_TASKS)) {
    const extra = [t.due ? `due ${formatPk(t.due)}` : '', t.assignee ?? ''].filter(Boolean).join(', ');
    item(w, f, { box: true, text: clip(t.title, 140) + (extra ? ` (${extra})` : '') });
  }
  if (p.tasks.length > MAX_TASKS) item(w, f, { text: `...and ${p.tasks.length - MAX_TASKS} more open tasks.`, gutter: 14 });

  heading(w, f, 'Recent diary notes');
  const notes = [...p.notes].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  if (!notes.length) item(w, f, { text: 'No notes for this case.' });
  for (const n of notes) item(w, f, { label: formatPk(n.date), text: clip(n.text, 220) });

  heading(w, f, `Documents on file (${p.documents.length})`);
  if (!p.documents.length) item(w, f, { text: 'No documents filed against this case.' });
  else {
    const names = p.documents.slice(0, MAX_DOCS).map((d) => clip(d, 48));
    const more = p.documents.length > MAX_DOCS ? `; ...and ${p.documents.length - MAX_DOCS} more` : '';
    item(w, f, { text: names.join('; ') + more, gutter: 0, size: 9 });
  }

  // Ruled blank areas for handwriting. Two sections of at least 3 lines each; if they do not fit on this
  // page they go together onto a fresh page and fill it.
  const lineGap = 21;
  const block = (lines: number) => 2 * (22 + lines * lineGap);
  if (w.y - w.margin.bottom < block(3)) w.newPage();
  const room = w.y - w.margin.bottom;
  const lines = Math.max(3, Math.min(14, Math.floor((room / 2 - 22) / lineGap)));
  for (const title of ['Points to argue', 'Notes from court']) {
    heading(w, f, title);
    w.y -= 4;
    for (let i = 0; i < lines; i++) {
      w.y -= lineGap;
      w.page.drawLine({ start: { x: w.margin.left, y: w.y }, end: { x: w.size[0] - w.margin.right, y: w.y }, thickness: 0.5, color: LINE });
    }
    w.y -= 6;
  }
  numberPages(doc, f.regular);
  return doc.save();
}

/* ---------------------------------------------------------------------------------------------- */
/* Monthly practice report                                                                         */
/* ---------------------------------------------------------------------------------------------- */

/** 'YYYY-MM' with a real month. */
export const isMonthKey = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

/** 'YYYY-MM' of an ISO instant or day key, in Pakistan time. */
export const monthOf = (iso: string) => pktDateKey(iso).slice(0, 7);

/** Is this date (instant or day key) inside the month? Missing dates are never inside. */
export function inMonth(iso: string | undefined, month: string): boolean {
  return !!iso && monthOf(iso) === month;
}

/** The month the user is in right now ('YYYY-MM'). */
export const currentMonth = (now?: Date) => todayKey(now).slice(0, 7);

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** '2026-11' -> 'November 2026'. */
export function monthLabel(month: string): string {
  if (!isMonthKey(month)) return month;
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

const isClosed = (c: Pick<Case, 'status'>) => c.status === 'decided' || c.status === 'disposed';

/**
 * The day a closed case was decided. The app does not store a separate decision date, so this is the date of the
 * latest hearing entry (recording the outcome of the final hearing is what closes a case).
 */
export function decidedOn(c: Pick<Case, 'hearings' | 'status'>): string | undefined {
  if (!isClosed(c) || !c.hearings.length) return undefined;
  return c.hearings.map((h) => pktDateKey(h.date)).sort().at(-1);
}

export interface ReportRow {
  caseNo: string;
  title: string;
  court: string;
  category: string;
  status: string;
  /** Filing date, hearing date(s) or decision date depending on the table. */
  date: string;
  detail: string;
}
export interface PracticeStats {
  month: string;
  filed: ReportRow[];
  heard: ReportRow[];
  decided: ReportRow[];
  pendingTotal: number;
  byCategory: [string, number][];
  byCourt: [string, number][];
  fees?: { received: number; outstanding: number; payments: { date: string; caseNo: string; mode: string; amount: number }[] };
}

/** Everything the report shows for one month. Fee data is included only when `withFees`. */
export function practiceStats(db: Pick<Db, 'cases' | 'courts' | 'fees'>, month: string, withFees: boolean): PracticeStats {
  const courtName = (id: string) => db.courts.find((c) => c.id === id)?.shortName || db.courts.find((c) => c.id === id)?.name || '-';
  const row = (c: Case, date: string, detail = ''): ReportRow => ({
    caseNo: c.caseNo,
    title: c.title,
    court: courtName(c.courtId),
    category: c.category,
    status: cap(c.status),
    date,
    detail,
  });
  const byDate = (a: ReportRow, b: ReportRow) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.caseNo.localeCompare(b.caseNo));

  const filed = db.cases.filter((c) => inMonth(c.filedOn, month)).map((c) => row(c, pktDateKey(c.filedOn))).sort(byDate);
  const heard = db.cases
    .map((c) => ({ c, hs: c.hearings.filter((h) => inMonth(h.date, month)) }))
    .filter((x) => x.hs.length)
    .map(({ c, hs }) => {
      const days = [...new Set(hs.map((h) => pktDateKey(h.date)))].sort();
      return row(c, days[0], days.map((d) => formatPk(d)).join(', '));
    })
    .sort(byDate);
  const decided = db.cases
    .filter((c) => inMonth(decidedOn(c), month))
    .map((c) => row(c, decidedOn(c)!, c.result ?? ''))
    .sort(byDate);

  const pending = db.cases.filter((c) => !isClosed(c));
  const tally = (key: (c: Case) => string) => {
    const m = new Map<string, number>();
    for (const c of pending) m.set(key(c), (m.get(key(c)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };

  let fees: PracticeStats['fees'];
  if (withFees) {
    const payments = db.fees.flatMap((l) =>
      l.payments
        .filter((p) => inMonth(p.date, month))
        .map((p) => ({ date: pktDateKey(p.date), caseNo: db.cases.find((c) => c.id === l.caseId)?.caseNo ?? '-', mode: p.mode, amount: p.amount })),
    );
    payments.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const outstanding = db.fees.reduce((a, l) => a + Math.max(0, l.agreed - l.payments.reduce((s, p) => s + p.amount, 0)), 0);
    fees = { received: payments.reduce((a, p) => a + p.amount, 0), outstanding, payments };
  }
  return { month, filed, heard, decided, pendingTotal: pending.length, byCategory: tally((c) => c.category), byCourt: tally((c) => courtName(c.courtId)), fees };
}

export interface PracticeReportInput {
  chamberName: string;
  tagline?: string;
  contact?: string;
  logo?: string;
  stats: PracticeStats;
  date: string;
}

interface Col {
  head: string;
  width: number;
  align?: 'left' | 'right';
}

/** A plain ruled table that breaks across pages and repeats its header. */
function table(w: Writer, f: Fonts, cols: Col[], rows: string[][], empty: string, size = 9) {
  const lh = size * 1.3;
  const pad = 4;
  const total = cols.reduce((a, c) => a + c.width, 0);
  const scale = w.width / total;
  const widths = cols.map((c) => c.width * scale);
  const drawHead = () => {
    w.ensure(lh + 8);
    let x = w.margin.left;
    cols.forEach((c, i) => {
      const t = pdfSafe(c.head, f.bold);
      const tw = f.bold.widthOfTextAtSize(t, size);
      w.page.drawText(t, { x: c.align === 'right' ? x + widths[i] - pad - tw : x + pad, y: w.y - size, size, font: f.bold, color: SOFT });
      x += widths[i];
    });
    w.y -= lh + 3;
    w.page.drawLine({ start: { x: w.margin.left, y: w.y }, end: { x: w.margin.left + w.width, y: w.y }, thickness: 0.8, color: BRONZE });
    w.y -= 2;
  };
  drawHead();
  if (!rows.length) {
    w.text(empty, { size, font: f.italic, color: SOFT, gap: 4 });
    return;
  }
  for (const r of rows) {
    const cells = r.map((v, i) => wrapText(v || '-', f.regular, size, widths[i] - 2 * pad));
    const n = Math.max(...cells.map((c) => c.length));
    if (w.y - n * lh - 4 < w.margin.bottom) {
      w.newPage();
      drawHead();
    }
    let x = w.margin.left;
    cells.forEach((lines, i) => {
      lines.forEach((l, k) => {
        if (!l) return;
        const tw = f.regular.widthOfTextAtSize(l, size);
        w.page.drawText(l, { x: cols[i].align === 'right' ? x + widths[i] - pad - tw : x + pad, y: w.y - size - k * lh, size, font: f.regular, color: INK });
      });
      x += widths[i];
    });
    w.y -= n * lh + 3;
    w.page.drawLine({ start: { x: w.margin.left, y: w.y + 1 }, end: { x: w.margin.left + w.width, y: w.y + 1 }, thickness: 0.4, color: LINE });
  }
  w.y -= 4;
}

export async function practiceReportPdf(r: PracticeReportInput): Promise<Uint8Array> {
  const s = r.stats;
  const doc = await PDFDocument.create();
  doc.setTitle(`Practice report - ${monthLabel(s.month)}`);
  const f = await times(doc);
  const w = new Writer(doc, f, { top: 48, bottom: 52, left: 52, right: 52 });
  await drawLogo(w, r.logo, 40);
  letterhead(w, f, r, 18);
  w.text('MONTHLY PRACTICE REPORT', { size: 13, font: f.bold, color: BRONZE, align: 'center', gap: 0 });
  w.text(`${monthLabel(s.month)}  |  Prepared ${formatPk(r.date)}`, { size: 9, font: f.italic, color: SOFT, align: 'center', gap: 6 });

  heading(w, f, 'Summary', 12);
  const summary: string[][] = [
    ['New cases filed', String(s.filed.length)],
    ['Cases heard (with a hearing entry)', String(s.heard.length)],
    ['Decided / disposed', String(s.decided.length)],
    ['Pending now (all courts)', String(s.pendingTotal)],
  ];
  if (s.fees) summary.push(['Fees received in the month', rupees(s.fees.received)], ['Total fees outstanding (all cases)', rupees(s.fees.outstanding)]);
  table(w, f, [{ head: 'Measure', width: 4 }, { head: 'Figure', width: 1.5, align: 'right' }], summary, '', 10);

  heading(w, f, `New cases filed (${s.filed.length})`, 12);
  table(
    w,
    f,
    [{ head: 'Filed', width: 1.1 }, { head: 'Case No.', width: 1.6 }, { head: 'Title', width: 3.4 }, { head: 'Court', width: 1.3 }, { head: 'Category', width: 1.2 }],
    s.filed.map((x) => [formatPk(x.date), x.caseNo, x.title, x.court, x.category]),
    'No cases were filed this month.',
  );

  heading(w, f, `Hearings held (${s.heard.length} cases)`, 12);
  table(
    w,
    f,
    [{ head: 'Date(s)', width: 1.8 }, { head: 'Case No.', width: 1.6 }, { head: 'Title', width: 3 }, { head: 'Court', width: 1.3 }],
    s.heard.map((x) => [x.detail, x.caseNo, x.title, x.court]),
    'No hearings were recorded this month.',
  );

  heading(w, f, `Decided / disposed (${s.decided.length})`, 12);
  table(
    w,
    f,
    [{ head: 'Date', width: 1.1 }, { head: 'Case No.', width: 1.6 }, { head: 'Title', width: 2.6 }, { head: 'Court', width: 1.2 }, { head: 'Outcome', width: 2 }],
    s.decided.map((x) => [formatPk(x.date), x.caseNo, x.title, x.court, `${x.status}${x.detail ? `: ${clip(x.detail, 90)}` : ''}`]),
    'No cases were decided this month.',
  );

  heading(w, f, `Pending now by category (${s.pendingTotal})`, 12);
  table(w, f, [{ head: 'Category', width: 4 }, { head: 'Cases', width: 1.2, align: 'right' }], s.byCategory.map(([k, n]) => [k, String(n)]), 'No pending cases.');
  heading(w, f, 'Pending now by court', 12);
  table(w, f, [{ head: 'Court', width: 4 }, { head: 'Cases', width: 1.2, align: 'right' }], s.byCourt.map(([k, n]) => [k, String(n)]), 'No pending cases.');

  if (s.fees) {
    heading(w, f, `Fee receipts in ${monthLabel(s.month)}`, 12);
    table(
      w,
      f,
      [{ head: 'Date', width: 1.2 }, { head: 'Case No.', width: 2 }, { head: 'Mode', width: 1.4 }, { head: 'Amount', width: 1.4, align: 'right' }],
      s.fees.payments.map((p) => [formatPk(p.date), p.caseNo, p.mode, rupees(p.amount)]),
      'No payments were received this month.',
    );
  }
  w.text('Figures come from the case records. A decision is dated by the last hearing entry on the case.', { size: 8.5, font: f.italic, color: SOFT });
  numberPages(doc, f.regular);
  return doc.save();
}

/** Letterhead plus stats for the report, ready for practiceReportPdf. */
export function buildReportInput(db: Db, month: string, opts: { withFees: boolean; today?: string }): PracticeReportInput {
  return { chamberName: db.chamber.name, ...letterheadOf(db), stats: practiceStats(db, month, opts.withFees), date: opts.today ?? todayKey() };
}
