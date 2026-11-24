/**
 * PDFs made in the browser with pdf-lib (Times): fee receipts, case-status sheets and draft exports.
 * The standard fonts only cover Western characters, so any string with Urdu in it is drawn by the browser on a
 * canvas and placed as an image (see pdfUrdu.ts); `Writer.textAuto` / `pairsAuto` / `block` pick per string.
 * The fee receipt and case-status sheet can also be printed with Urdu wording (`lang: 'ur' | 'both'`).
 */
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { formatPk, formatTime } from './dates';
import {
  UR,
  amountInWordsUrdu,
  baseDirection,
  canvasArabicRenderer,
  fill,
  formatPkUrdu,
  hasArabic,
  modeUrdu,
  rtl,
  rupeesUrdu,
  statusUrdu,
  urduClock,
  type ArabicRenderer,
  type PdfBuildOpts,
  type PdfLang,
} from './pdfUrdu';

export type { ArabicRenderer, PdfBuildOpts, PdfLang } from './pdfUrdu';

export const A4: [number, number] = [595.28, 841.89];
export const INK = rgb(0.11, 0.1, 0.09);
export const SOFT = rgb(0.4, 0.38, 0.35);
export const BRONZE = rgb(0.62, 0.45, 0.24);
export const LINE = rgb(0.85, 0.82, 0.77);

type Color = ReturnType<typeof rgb>;

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

/** A measured piece of text, ready to draw with its top-left corner at (x, yTop). */
export interface Block {
  width: number;
  height: number;
  draw: (x: number, yTop: number, page?: PDFPage) => void;
}
export interface BlockOpts {
  /** Space the text is wrapped and aligned in. */
  width: number;
  size?: number;
  font?: PDFFont;
  /** Bold for Urdu (vector text takes `font`). */
  bold?: boolean;
  color?: Color;
  align?: 'left' | 'center' | 'right';
  /** Vector line height; default 1.4 × size. */
  lineHeight?: number;
  /** Distance from the top of a vector line to its baseline; default = size. */
  ascent?: number;
  /**
   * Level the first Urdu line with vector text drawn beside it (table rows, label/value pairs). Tall letters may
   * then rise a few points above the top, so leave it off for text stacked right under another line.
   */
  alignBaseline?: boolean;
}
type TextOpts = { size?: number; font?: PDFFont; color?: Color; align?: 'left' | 'center' | 'right'; gap?: number; x?: number; width?: number };
/** A pair label: one string, or several stacked (English over Urdu). */
export type PairLabel = string | string[];

/** Several blocks one under the other. */
export function stackBlocks(parts: Block[]): Block {
  return {
    width: Math.max(0, ...parts.map((p) => p.width)),
    height: parts.reduce((a, p) => a + p.height, 0),
    draw: (x, yTop, page) => {
      let y = yTop;
      for (const p of parts) {
        p.draw(x, y, page);
        y -= p.height;
      }
    },
  };
}

/** A simple top-down writer that starts new pages as needed. */
export class Writer {
  page!: PDFPage;
  y = 0;
  /** Draws Urdu text as images. Without one, Urdu falls back to "?" like before. */
  renderer?: ArabicRenderer;
  private images = new Map<string, Promise<{ img: PDFImage; widthPt: number; heightPt: number; baselinePt?: number } | null>>();
  constructor(
    public doc: PDFDocument,
    public fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont },
    public margin = { top: 72, bottom: 72, left: 72, right: 72 },
    public size: [number, number] = A4,
    renderer?: ArabicRenderer,
  ) {
    this.renderer = renderer;
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
  text(t: string, o: TextOpts = {}) {
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

  /** Vector lines (Latin text). */
  private vectorBlock(t: string, o: BlockOpts): Block {
    const size = o.size ?? 11;
    const font = o.font ?? this.fonts.regular;
    const lh = o.lineHeight ?? size * 1.4;
    const asc = o.ascent ?? size;
    const lines = wrapText(t, font, size, o.width);
    const widths = lines.map((l) => font.widthOfTextAtSize(l, size));
    return {
      width: Math.max(0, ...widths),
      height: lines.length * lh,
      draw: (x0, yTop, page = this.page) => {
        lines.forEach((line, i) => {
          if (!line) return;
          const x = o.align === 'center' ? x0 + (o.width - widths[i]) / 2 : o.align === 'right' ? x0 + o.width - widths[i] : x0;
          page.drawText(line, { x, y: yTop - asc - i * lh, size, font, color: o.color ?? INK });
        });
      },
    };
  }

  /** One Urdu (or mixed) paragraph as a picture; a failed render falls back to vector text. */
  private async urduBlock(t: string, o: BlockOpts): Promise<Block> {
    const size = o.size ?? 11;
    const color = o.color ?? INK;
    const align = o.align ?? 'left';
    const key = [t, size, o.bold ? 1 : 0, color.red, color.green, color.blue, o.width, align].join('|');
    let got = this.images.get(key);
    if (!got) {
      const renderer = this.renderer ?? canvasArabicRenderer;
      got = renderer(t, { sizePt: size, color: [color.red, color.green, color.blue], maxWidthPt: o.width, align, bold: o.bold })
        .then(async (r) => ({ img: await this.doc.embedPng(r.png), widthPt: r.widthPt, heightPt: r.heightPt, baselinePt: r.baselinePt }))
        .catch(() => null);
      this.images.set(key, got);
    }
    const r = await got;
    if (!r) return this.vectorBlock(t, o);
    // Never wider than the space, never taller than a page.
    const k = Math.min(1, o.width / r.widthPt, (this.size[1] - this.margin.top - this.margin.bottom) / r.heightPt);
    const iw = r.widthPt * k;
    const ih = r.heightPt * k;
    // Sit the first line on the same baseline a vector line would use (tall Nastaliq letters may rise a little
    // above the top); without a baseline from the renderer the picture simply hangs from the top.
    const asc = o.ascent ?? size;
    const lift = !o.alignBaseline || r.baselinePt === undefined ? 0 : Math.max(-size, Math.min(size * 0.6, r.baselinePt * k - asc));
    return {
      width: iw,
      height: Math.max(0, ih - lift),
      draw: (x0, yTop, page = this.page) => {
        const x = align === 'center' ? x0 + (o.width - iw) / 2 : align === 'right' ? x0 + o.width - iw : x0;
        page.drawImage(r.img, { x, y: yTop + lift - ih, width: iw, height: ih });
      },
    };
  }

  /** Measure text without drawing it: Latin paragraphs as vector lines, Urdu ones through the renderer. */
  async block(t: string, o: BlockOpts): Promise<Block> {
    if (!hasArabic(t)) return this.vectorBlock(t, o);
    const parts: Block[] = [];
    for (const [i, para] of t.split('\n').entries()) {
      const po = i ? { ...o, alignBaseline: false } : o;
      parts.push(hasArabic(para) ? await this.urduBlock(para, po) : this.vectorBlock(para, po));
    }
    return stackBlocks(parts);
  }

  /** Like `text`, but Urdu paragraphs are drawn by the renderer instead of printing "?". */
  async textAuto(t: string, o: TextOpts & { bold?: boolean } = {}) {
    if (!hasArabic(t)) return this.text(t, o);
    const size = o.size ?? 11;
    const x0 = o.x ?? this.margin.left;
    const w = o.width ?? this.width - (x0 - this.margin.left);
    for (const para of t.split('\n')) {
      if (!hasArabic(para)) {
        this.text(para, { ...o, gap: 0 });
        continue;
      }
      const b = await this.block(para, { width: w, size, font: o.font, bold: o.bold ?? o.font === this.fonts.bold, color: o.color, align: o.align });
      this.ensure(b.height);
      b.draw(x0, this.y);
      this.y -= b.height;
    }
    this.y -= o.gap ?? 0;
  }
  /** Alias of `textAuto`. */
  textRich(t: string, o: TextOpts & { bold?: boolean } = {}) {
    return this.textAuto(t, o);
  }

  /**
   * Label/value pairs that may hold Urdu. `rtl` puts the labels on the right and right-aligns everything
   * (for the Urdu PDFs); a label given as several strings is stacked (English over Urdu).
   */
  async pairsAuto(rows: [PairLabel, string][], labelWidth = 130, o: { rtl?: boolean } = {}) {
    const align = o.rtl ? 'right' : 'left';
    const labelW = labelWidth - 6;
    const valueW = this.width - labelWidth;
    for (const [k, v] of rows) {
      const labels = Array.isArray(k) ? k : [k];
      const lab = stackBlocks(
        await Promise.all(
          labels.map((l, i) => this.block(l, { width: labelW, size: 10, font: this.fonts.bold, bold: true, color: SOFT, align, lineHeight: 14, ascent: 11, alignBaseline: i === 0 })),
        ),
      );
      const val = await this.block(v || '—', { width: valueW, size: 11, align, lineHeight: 15.4, ascent: 11, alignBaseline: true });
      const h = Math.max(lab.height, val.height);
      this.ensure(h + 2);
      if (o.rtl) {
        lab.draw(this.margin.left + this.width - labelW, this.y);
        val.draw(this.margin.left, this.y);
      } else {
        lab.draw(this.margin.left, this.y);
        val.draw(this.margin.left + labelWidth, this.y);
      }
      this.y -= h + 2;
    }
  }
}

/** Draw the chamber logo (a PNG/JPEG data URL) centred at the top of the page. A bad image is skipped, never an error. */
export async function drawLogo(w: Writer, dataUrl?: string, maxH = 46) {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl ?? '');
  if (!m) return;
  try {
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const img = /png/i.test(m[1]) ? await w.doc.embedPng(bytes) : await w.doc.embedJpg(bytes);
    const scale = Math.min(maxH / img.height, 160 / img.width, 1);
    const iw = img.width * scale;
    const ih = img.height * scale;
    w.ensure(ih + 6);
    w.page.drawImage(img, { x: w.margin.left + (w.width - iw) / 2, y: w.y - ih, width: iw, height: ih });
    w.y -= ih + 6;
  } catch {
    /* unreadable image: print the letterhead without it */
  }
}

export async function times(doc: PDFDocument) {
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

/** "صفحہ n از N" bottom-centre on every page (Urdu PDFs). */
async function numberPagesUrdu(w: Writer, size = 9) {
  const pages = w.doc.getPages();
  for (const [i, p] of pages.entries()) {
    const { width } = p.getSize();
    const b = await w.block(fill(UR.page, { n: i + 1, total: pages.length }), { width: width - 40, size, color: SOFT, align: 'center' });
    b.draw(20, 14 + b.height, p);
  }
}

export interface FeeReceiptInput {
  receiptNo: string;
  chamberName: string;
  /** Line under the name; defaults to "Advocates & Legal Consultants". */
  tagline?: string;
  /** Address, phone and email, printed as one line. */
  contact?: string;
  /** Logo as a PNG/JPEG data URL. */
  logo?: string;
  clientName: string;
  caseTitle: string;
  caseNo: string;
  amount: number;
  mode: string;
  date: string;
  note?: string;
  /** Wording of the receipt: English (default), Urdu (right-to-left) or both. */
  lang?: PdfLang;
}

const DEFAULT_TAGLINE = 'Advocates & Legal Consultants';

/** Label in the chosen language: English, Urdu, or English stacked over Urdu. */
const pick = (lang: PdfLang, en: string, ur: string): PairLabel => (lang === 'ur' ? ur : lang === 'both' ? [en, ur] : en);

export async function feeReceiptPdf(r: FeeReceiptInput, opts: PdfBuildOpts = {}): Promise<Uint8Array> {
  const lang = r.lang ?? 'en';
  const ur = lang === 'ur';
  const both = lang === 'both';
  const L = (en: string, u: string) => pick(lang, en, u);
  const doc = await PDFDocument.create();
  doc.setTitle(`Fee receipt ${r.receiptNo}`);
  const f = await times(doc);
  const w = new Writer(doc, f, { top: 64, bottom: 64, left: 64, right: 64 }, A4, opts.renderer);
  await drawLogo(w, r.logo);
  await w.textAuto(r.chamberName, { size: 20, font: f.bold, align: 'center' });
  const tagline = ur && (!r.tagline || r.tagline === DEFAULT_TAGLINE) ? UR.tagline : r.tagline || DEFAULT_TAGLINE;
  await w.textAuto(tagline, { size: 10, font: f.italic, color: SOFT, align: 'center', gap: r.contact ? 2 : 10 });
  if (r.contact) await w.textAuto(r.contact, { size: 9, color: SOFT, align: 'center', gap: 10 });
  w.rule(BRONZE, 1.2);
  if (!ur) w.text('FEE RECEIPT', { size: 15, font: f.bold, align: 'center', gap: both ? 0 : 8 });
  if (ur || both) await w.textAuto(UR.feeReceipt, { size: 15, font: f.bold, align: 'center', gap: 8 });

  const date = ur ? formatPkUrdu(r.date) : both ? `${formatPk(r.date)}\n${formatPkUrdu(r.date)}` : formatPk(r.date);
  await w.pairsAuto(
    [
      [L('Receipt No.', UR.receiptNo), r.receiptNo],
      [L('Date', UR.date), date],
    ],
    130,
    { rtl: ur },
  );
  w.y -= 8;
  if (!ur) {
    await w.textAuto(`Received with thanks from ${r.clientName} the sum of ${rupees(r.amount)} (${amountInWords(r.amount)}) as professional fee in the matter noted below.`, {
      size: 12,
      gap: 12,
    });
  }
  if (ur || both) {
    await w.textAuto(rtl(fill(UR.receivedSentence, { client: r.clientName, amount: rupeesUrdu(r.amount), words: amountInWordsUrdu(r.amount) })), {
      size: 12,
      align: 'right',
      gap: 12,
    });
  }
  const urMode = modeUrdu(r.mode);
  const amount = ur ? rupeesUrdu(r.amount) : rupees(r.amount);
  const words = ur ? amountInWordsUrdu(r.amount) : both ? `${amountInWords(r.amount)}\n${amountInWordsUrdu(r.amount)}` : amountInWords(r.amount);
  const mode = ur ? urMode : both && urMode !== r.mode ? `${r.mode}\n${urMode}` : r.mode;
  await w.pairsAuto(
    [
      [L('Case', UR.case), r.caseTitle],
      [L('Case No.', UR.caseNo), r.caseNo],
      [L('Amount', UR.amount), amount],
      [L('In words', UR.inWords), words],
      [L('Mode of payment', UR.mode), mode],
      ...(r.note ? ([[L('Note', UR.note), r.note]] as [PairLabel, string][]) : []),
    ],
    130,
    { rtl: ur },
  );
  w.y -= 50;
  w.ensure(40);
  // The signature goes at the end of the reading direction: bottom right in English, bottom left in Urdu.
  const sx = ur ? 64 : A4[0] - 64 - 180;
  w.page.drawLine({ start: { x: sx, y: w.y }, end: { x: sx + 180, y: w.y }, thickness: 0.8, color: INK });
  let sy = w.y - 4;
  if (!ur) {
    w.page.drawText('Signature & stamp', { x: sx + 45, y: w.y - 14, size: 10, font: f.italic, color: SOFT });
    sy -= 14;
  }
  if (ur || both) {
    const b = await w.block(UR.signature, { width: 180, size: 10, color: SOFT, align: 'center' });
    b.draw(sx, sy);
    sy -= b.height;
  }
  w.y = Math.min(w.y - 40, sy - 8);
  w.rule();
  if (!ur) w.text('This receipt is computer generated by Legal Brain. Please keep it for your record.', { size: 9, font: f.italic, color: SOFT, align: 'center' });
  if (ur || both) await w.textAuto(UR.receiptFooter, { size: 9, color: SOFT, align: 'center' });
  return doc.save();
}

export interface CaseStatusInput {
  chamberName: string;
  tagline?: string;
  contact?: string;
  logo?: string;
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
  /** Wording of the report: English (default), Urdu (right-to-left) or both. */
  lang?: PdfLang;
}

/** Date | proceedings | next date, right-to-left, repeating its header on each new page. */
async function hearingsTableUrdu(w: Writer, rows: string[][]) {
  const shares = [0.2, 0.6, 0.2];
  const widths = shares.map((k) => k * w.width);
  const pad = 4;
  const xOf = (i: number) => w.margin.left + w.width - widths.slice(0, i + 1).reduce((a, b) => a + b, 0);
  const cells = (vals: string[], head: boolean) =>
    Promise.all(
      vals.map((v, i) =>
        w.block(v || '—', head ? { width: widths[i] - 2 * pad, size: 10, font: w.fonts.bold, bold: true, color: SOFT, align: 'right' } : { width: widths[i] - 2 * pad, size: 10.5, align: 'right', lineHeight: 14 }),
      ),
    );
  const header = await cells([UR.colDate, UR.colProceedings, UR.colNextDate], true);
  const headH = Math.max(...header.map((b) => b.height));
  const drawHead = () => {
    w.ensure(headH + 24);
    header.forEach((b, i) => b.draw(xOf(i) + pad, w.y));
    w.y -= headH + 2;
    w.page.drawLine({ start: { x: w.margin.left, y: w.y }, end: { x: w.margin.left + w.width, y: w.y }, thickness: 0.8, color: BRONZE });
    w.y -= 3;
  };
  drawHead();
  for (const r of rows) {
    const bs = await cells(r, false);
    const h = Math.max(...bs.map((b) => b.height));
    if (w.y - h - 4 < w.margin.bottom) {
      w.newPage();
      drawHead();
    }
    bs.forEach((b, i) => b.draw(xOf(i) + pad, w.y));
    w.y -= h + 2;
    w.page.drawLine({ start: { x: w.margin.left, y: w.y }, end: { x: w.margin.left + w.width, y: w.y }, thickness: 0.4, color: LINE });
    w.y -= 3;
  }
}

export async function caseStatusPdf(c: CaseStatusInput, opts: PdfBuildOpts = {}): Promise<Uint8Array> {
  const lang = c.lang ?? 'en';
  const ur = lang === 'ur';
  const both = lang === 'both';
  const L = (en: string, u: string) => pick(lang, en, u);
  const doc = await PDFDocument.create();
  doc.setTitle(`Case status - ${c.caseTitle}`);
  const f = await times(doc);
  const w = new Writer(doc, f, undefined, A4, opts.renderer);
  const date = (iso: string) => (ur ? formatPkUrdu(iso) : formatPk(iso));
  await drawLogo(w, c.logo);
  await w.textAuto(c.chamberName, { size: 18, font: f.bold, align: 'center' });
  if (c.tagline) await w.textAuto(ur && c.tagline === DEFAULT_TAGLINE ? UR.tagline : c.tagline, { size: 10, font: f.italic, color: SOFT, align: 'center', gap: c.contact ? 2 : 6 });
  if (c.contact) await w.textAuto(c.contact, { size: 9, color: SOFT, align: 'center', gap: 6 });
  if (!ur) w.text('CASE STATUS REPORT', { size: 12, font: f.bold, color: BRONZE, align: 'center', gap: both ? 0 : 6 });
  if (ur || both) await w.textAuto(UR.caseStatus, { size: 12, font: f.bold, color: BRONZE, align: 'center', gap: 6 });
  w.rule(BRONZE, 1.2);

  const statusEn = c.status[0]?.toUpperCase() + c.status.slice(1);
  const status = ur ? statusUrdu(c.status) : both && statusUrdu(c.status) !== c.status ? `${statusEn}\n${statusUrdu(c.status)}` : statusEn;
  const time = c.nextHearing && /T/.test(c.nextHearing) ? (ur ? `، ${urduClock(formatTime(c.nextHearing))}` : `, ${formatTime(c.nextHearing)}`) : '';
  const next = c.nextHearing ? `${date(c.nextHearing)}${time}` : ur ? UR.notFixed : both ? `Not fixed\n${UR.notFixed}` : 'Not fixed';
  const rtl = { rtl: ur };
  await w.pairsAuto(
    [
      [L('Client', UR.client), c.clientName],
      [L('Case', UR.case), c.caseTitle],
      [L('Case No.', UR.caseNo), c.caseNo],
      [L('Court', UR.court), c.court],
      [L('Judge / Bench', UR.judge), c.judge],
      [L('Stage', UR.stage), c.stage],
      [L('Status', UR.status), status],
      [L('Next hearing', UR.nextHearing), next],
      [L('Report date', UR.reportDate), date(c.date)],
    ],
    130,
    rtl,
  );
  const sectionHead = async (en: string, u: string, gap: number) => {
    if (!ur) w.text(en, { size: 13, font: f.bold, gap: both ? 0 : gap });
    if (ur || both) await w.textAuto(u, { size: 13, font: f.bold, align: ur ? 'right' : 'left', gap });
  };
  if (c.fee) {
    const money = ur ? rupeesUrdu : rupees;
    w.y -= 6;
    await sectionHead('Fee', UR.fee, 2);
    await w.pairsAuto(
      [
        [L('Agreed', UR.agreed), money(c.fee.agreed)],
        [L('Received', UR.received), money(c.fee.received)],
        [L('Outstanding', UR.outstanding), money(c.fee.outstanding)],
      ],
      130,
      rtl,
    );
  }
  w.y -= 6;
  await sectionHead('Hearing history', UR.hearingHistory, 4);
  const sorted = [...c.hearings].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (ur) {
    if (!sorted.length) await w.textAuto(UR.noHearings, { color: SOFT, align: 'right' });
    else await hearingsTableUrdu(w, sorted.map((h) => [date(h.date), h.proceedings, h.nextDate ? date(h.nextDate) : '—']));
  } else {
    if (!sorted.length) w.text('No hearings recorded yet.', { font: f.italic, color: SOFT });
    if (!sorted.length && both) await w.textAuto(UR.noHearings, { color: SOFT });
    for (const h of sorted) {
      w.ensure(32);
      w.text(formatPk(h.date), { size: 10, font: f.bold, color: SOFT });
      await w.textAuto(h.proceedings + (h.nextDate ? ` Next date: ${formatPk(h.nextDate)}.` : ''), { x: w.margin.left + 12, gap: 4 });
    }
  }
  w.y -= 10;
  if (!ur) w.text('Prepared for the client’s information. Dates may change by order of the court.', { size: 9, font: f.italic, color: SOFT });
  if (ur || both) await w.textAuto(UR.statusFooter, { size: 9, color: SOFT, align: ur ? 'right' : 'left' });
  if (ur) await numberPagesUrdu(w);
  else numberPages(doc, f.regular);
  return doc.save();
}

/** A drafted document on A4 with 1.5" left / 1" other margins, Times 12, numbered pages. Urdu paragraphs are right-aligned images. */
export async function draftPdf(title: string, text: string, opts: PdfBuildOpts = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  const f = await times(doc);
  const w = new Writer(doc, f, { top: 72, bottom: 72, left: 108, right: 72 }, A4, opts.renderer);
  const lh = 12 * 1.5;
  const latin = (chunk: string) => {
    for (const line of wrapText(chunk, f.regular, 12, w.width)) {
      w.ensure(lh);
      const isHeading = !!line.trim() && line.trim() === line.trim().toUpperCase() && /[A-Z]/.test(line) && line.trim().length < 90;
      const font = isHeading ? f.bold : f.regular;
      const lw = font.widthOfTextAtSize(line.trim(), 12);
      const x = isHeading ? w.margin.left + (w.width - lw) / 2 : w.margin.left;
      if (line.trim()) w.page.drawText(isHeading ? line.trim() : line, { x, y: w.y - 12, size: 12, font, color: INK });
      w.y -= lh;
    }
  };
  if (!hasArabic(text)) latin(text);
  else {
    for (const para of text.split('\n')) {
      if (!hasArabic(para)) {
        latin(para);
        continue;
      }
      const b = await w.block(para.trim(), { width: w.width, size: 12, align: baseDirection(para) === 'rtl' ? 'right' : 'left' });
      w.ensure(b.height);
      b.draw(w.margin.left, w.y);
      w.y -= b.height + 2;
    }
  }
  numberPages(doc, f.regular);
  return doc.save();
}
