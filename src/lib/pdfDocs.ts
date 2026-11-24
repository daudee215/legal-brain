/**
 * English PDFs made in the browser with pdf-lib (Times): fee receipts, case-status sheets and draft exports.
 * The standard fonts only cover Western characters, so Urdu goes through the print page instead
 * (/app/print/status/).
 */
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { formatPk, formatTime } from './dates';

export const A4: [number, number] = [595.28, 841.89];
const INK = rgb(0.11, 0.1, 0.09);
const SOFT = rgb(0.4, 0.38, 0.35);
const BRONZE = rgb(0.62, 0.45, 0.24);
const LINE = rgb(0.85, 0.82, 0.77);

const okCache = new WeakMap<PDFFont, Map<string, boolean>>();
/** Replace characters the font cannot encode with "?" so drawing never throws. */
export function pdfSafe(text: string, font: PDFFont): string {
  let cache = okCache.get(font);
  if (!cache) {
    cache = new Map();
    okCache.set(font, cache);
  }
  let out = '';
  for (const ch of text.replace(/\t/g, '    ').replace(/\r/g, '')) {
    let ok = cache.get(ch);
    if (ok === undefined) {
      try {
        font.widthOfTextAtSize(ch, 10);
        ok = true;
      } catch {
        ok = false;
      }
      cache.set(ch, ok);
    }
    out += ok ? ch : '?';
  }
  return out;
}

/** Split text into lines no wider than `width`; blank lines in the input are kept. */
export function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const safe = pdfSafe(para, font);
    if (!safe.trim()) {
      out.push('');
      continue;
    }
    const indent = safe.match(/^\s*/)?.[0] ?? '';
    let line = indent;
    for (const word of safe.trim().split(/\s+/)) {
      const tryLine = line.trim() ? `${line} ${word}` : `${line}${word}`;
      if (font.widthOfTextAtSize(tryLine, size) <= width) {
        line = tryLine;
        continue;
      }
      if (line.trim()) out.push(line);
      // A single word wider than the line is broken by characters.
      let w = word;
      while (font.widthOfTextAtSize(w, size) > width) {
        let n = w.length - 1;
        while (n > 1 && font.widthOfTextAtSize(w.slice(0, n), size) > width) n--;
        out.push(w.slice(0, n));
        w = w.slice(n);
      }
      line = w;
    }
    out.push(line);
  }
  return out;
}

const ONES = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function under100(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
}
function under1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? under100(r) : ''].filter(Boolean).join(' ');
}

/** "Rupees One Lakh Fifty Thousand Only" (lakh/crore, as written on Pakistani receipts). Paisa are dropped. */
export function amountInWords(amount: number): string {
  let n = Math.floor(Math.abs(amount));
  if (n === 0) return 'Rupees Zero Only';
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${crore >= 1000 ? amountInWords(crore).replace(/^Rupees |\sOnly$/g, '') : under1000(crore)} Crore`);
  if (lakh) parts.push(`${under100(lakh)} Lakh`);
  if (thousand) parts.push(`${under100(thousand)} Thousand`);
  if (n) parts.push(under1000(n));
  return `Rupees ${parts.join(' ')} Only`;
}

export const rupees = (n: number) => `Rs ${n.toLocaleString('en-PK')}`;

/** A simple top-down writer that starts new pages as needed. */
class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    public doc: PDFDocument,
    public fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont },
    public margin = { top: 72, bottom: 72, left: 72, right: 72 },
    public size: [number, number] = A4,
  ) {
    this.newPage();
  }
  get width() {
    return this.size[0] - this.margin.left - this.margin.right;
  }
  newPage() {
    this.page = this.doc.addPage(this.size);
    this.y = this.size[1] - this.margin.top;
  }
  ensure(h: number) {
    if (this.y - h < this.margin.bottom) this.newPage();
  }
  text(t: string, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; align?: 'left' | 'center' | 'right'; gap?: number; x?: number; width?: number } = {}) {
    const size = o.size ?? 11;
    const font = o.font ?? this.fonts.regular;
    const x0 = o.x ?? this.margin.left;
    const w = o.width ?? this.width - (x0 - this.margin.left);
    const lh = size * 1.4;
    for (const line of wrapText(t, font, size, w)) {
      this.ensure(lh);
      const lw = font.widthOfTextAtSize(line, size);
      const x = o.align === 'center' ? x0 + (w - lw) / 2 : o.align === 'right' ? x0 + w - lw : x0;
      if (line) this.page.drawText(line, { x, y: this.y - size, size, font, color: o.color ?? INK });
      this.y -= lh;
    }
    this.y -= o.gap ?? 0;
  }
  rule(color = LINE, thickness = 0.8) {
    this.ensure(8);
    this.page.drawLine({ start: { x: this.margin.left, y: this.y }, end: { x: this.size[0] - this.margin.right, y: this.y }, thickness, color });
    this.y -= 10;
  }
  /** Label/value pairs in two columns. */
  pairs(rows: [string, string][], labelWidth = 130) {
    for (const [k, v] of rows) {
      const lines = wrapText(v || '—', this.fonts.regular, 11, this.width - labelWidth);
      this.ensure(lines.length * 15.4 + 2);
      this.page.drawText(pdfSafe(k, this.fonts.bold), { x: this.margin.left, y: this.y - 11, size: 10, font: this.fonts.bold, color: SOFT });
      for (const l of lines) {
        this.page.drawText(l, { x: this.margin.left + labelWidth, y: this.y - 11, size: 11, font: this.fonts.regular, color: INK });
        this.y -= 15.4;
      }
      this.y -= 2;
    }
  }
}

async function times(doc: PDFDocument) {
  return {
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };
}

/** "Page n of N" bottom-centre on every page. */
export function numberPages(doc: PDFDocument, font: PDFFont, size = 9) {
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const t = `Page ${i + 1} of ${pages.length}`;
    const { width } = p.getSize();
    p.drawText(t, { x: (width - font.widthOfTextAtSize(t, size)) / 2, y: 24, size, font, color: SOFT });
  });
}

export interface FeeReceiptInput {
  receiptNo: string;
  chamberName: string;
  /** Line under the name; defaults to "Advocates & Legal Consultants". */
  tagline?: string;
  /** Address, phone and email, printed as one line. */
  contact?: string;
  clientName: string;
  caseTitle: string;
  caseNo: string;
  amount: number;
  mode: string;
  date: string;
  note?: string;
}

export async function feeReceiptPdf(r: FeeReceiptInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Fee receipt ${r.receiptNo}`);
  const f = await times(doc);
  const w = new Writer(doc, f, { top: 64, bottom: 64, left: 64, right: 64 });
  w.text(r.chamberName, { size: 20, font: f.bold, align: 'center' });
  w.text(r.tagline || 'Advocates & Legal Consultants', { size: 10, font: f.italic, color: SOFT, align: 'center', gap: r.contact ? 2 : 10 });
  if (r.contact) w.text(r.contact, { size: 9, color: SOFT, align: 'center', gap: 10 });
  w.rule(BRONZE, 1.2);
  w.text('FEE RECEIPT', { size: 15, font: f.bold, align: 'center', gap: 8 });
  w.pairs([
    ['Receipt No.', r.receiptNo],
    ['Date', formatPk(r.date)],
  ]);
  w.y -= 8;
  w.text(`Received with thanks from ${r.clientName} the sum of ${rupees(r.amount)} (${amountInWords(r.amount)}) as professional fee in the matter noted below.`, {
    size: 12,
    gap: 12,
  });
  w.pairs([
    ['Case', r.caseTitle],
    ['Case No.', r.caseNo],
    ['Amount', rupees(r.amount)],
    ['In words', amountInWords(r.amount)],
    ['Mode of payment', r.mode],
    ...(r.note ? ([['Note', r.note]] as [string, string][]) : []),
  ]);
  w.y -= 50;
  w.ensure(40);
  const sx = A4[0] - 64 - 180;
  w.page.drawLine({ start: { x: sx, y: w.y }, end: { x: sx + 180, y: w.y }, thickness: 0.8, color: INK });
  w.page.drawText('Signature & stamp', { x: sx + 45, y: w.y - 14, size: 10, font: f.italic, color: SOFT });
  w.y -= 40;
  w.rule();
  w.text('This receipt is computer generated by Legal Brain. Please keep it for your record.', { size: 9, font: f.italic, color: SOFT, align: 'center' });
  return doc.save();
}

export interface CaseStatusInput {
  chamberName: string;
  tagline?: string;
  contact?: string;
  clientName: string;
  caseTitle: string;
  caseNo: string;
  court: string;
  judge: string;
  stage: string;
  status: string;
  nextHearing?: string;
  hearings: { date: string; proceedings: string; nextDate?: string }[];
  fee?: { agreed: number; received: number; outstanding: number };
  date: string;
}

export async function caseStatusPdf(c: CaseStatusInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Case status - ${c.caseTitle}`);
  const f = await times(doc);
  const w = new Writer(doc, f);
  w.text(c.chamberName, { size: 18, font: f.bold, align: 'center' });
  if (c.tagline) w.text(c.tagline, { size: 10, font: f.italic, color: SOFT, align: 'center', gap: c.contact ? 2 : 6 });
  if (c.contact) w.text(c.contact, { size: 9, color: SOFT, align: 'center', gap: 6 });
  w.text('CASE STATUS REPORT', { size: 12, font: f.bold, color: BRONZE, align: 'center', gap: 6 });
  w.rule(BRONZE, 1.2);
  w.pairs([
    ['Client', c.clientName],
    ['Case', c.caseTitle],
    ['Case No.', c.caseNo],
    ['Court', c.court],
    ['Judge / Bench', c.judge],
    ['Stage', c.stage],
    ['Status', c.status[0]?.toUpperCase() + c.status.slice(1)],
    ['Next hearing', c.nextHearing ? `${formatPk(c.nextHearing)}${/T/.test(c.nextHearing) ? `, ${formatTime(c.nextHearing)}` : ''}` : 'Not fixed'],
    ['Report date', formatPk(c.date)],
  ]);
  if (c.fee) {
    w.y -= 6;
    w.text('Fee', { size: 13, font: f.bold, gap: 2 });
    w.pairs([
      ['Agreed', rupees(c.fee.agreed)],
      ['Received', rupees(c.fee.received)],
      ['Outstanding', rupees(c.fee.outstanding)],
    ]);
  }
  w.y -= 6;
  w.text('Hearing history', { size: 13, font: f.bold, gap: 4 });
  const sorted = [...c.hearings].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!sorted.length) w.text('No hearings recorded yet.', { font: f.italic, color: SOFT });
  for (const h of sorted) {
    w.ensure(32);
    w.text(formatPk(h.date), { size: 10, font: f.bold, color: SOFT });
    w.text(h.proceedings + (h.nextDate ? ` Next date: ${formatPk(h.nextDate)}.` : ''), { x: w.margin.left + 12, gap: 4 });
  }
  w.y -= 10;
  w.text('Prepared for the client’s information. Dates may change by order of the court.', { size: 9, font: f.italic, color: SOFT });
  numberPages(doc, f.regular);
  return doc.save();
}

/** A drafted document on A4 with 1.5" left / 1" other margins, Times 12, numbered pages. */
export async function draftPdf(title: string, text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  const f = await times(doc);
  const w = new Writer(doc, f, { top: 72, bottom: 72, left: 108, right: 72 });
  const lh = 12 * 1.5;
  for (const line of wrapText(text, f.regular, 12, w.width)) {
    w.ensure(lh);
    const isHeading = !!line.trim() && line.trim() === line.trim().toUpperCase() && /[A-Z]/.test(line) && line.trim().length < 90;
    const font = isHeading ? f.bold : f.regular;
    const lw = font.widthOfTextAtSize(line.trim(), 12);
    const x = isHeading ? w.margin.left + (w.width - lw) / 2 : w.margin.left;
    if (line.trim()) w.page.drawText(isHeading ? line.trim() : line, { x, y: w.y - 12, size: 12, font, color: INK });
    w.y -= lh;
  }
  numberPages(doc, f.regular);
  return doc.save();
}
