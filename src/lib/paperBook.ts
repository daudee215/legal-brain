/**
 * Paper-book builder: title page + index + every document merged, "Page n of N" on every page and an
 * "Annexure-X" stamp on the first page of each annexure. Runs entirely in the browser with pdf-lib.
 */
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { saveDocument } from './docText';
import { formatPk, todayKey } from './dates';
import { A4, pdfSafe, wrapText } from './pdfDocs';
import type { DocFile } from '../types';

export interface PaperBookItem {
  title: string;
  /** Annexure letter ("A"); leave empty for the main petition or other unmarked documents. */
  annexure?: string;
  bytes: Uint8Array | ArrayBuffer;
}

export interface PaperBookInput {
  caseTitle: string;
  caseNo: string;
  court: string;
  /** Optional line under the title, e.g. the chamber filing it. */
  filedBy?: string;
  items: PaperBookItem[];
}

/** 0 → A, 25 → Z, 26 → AA. */
export function annexureLetter(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const ROWS_PER_INDEX_PAGE = 24;

/** Where each document lands once the title page and index pages are put in front. 1-based, inclusive. */
export function planPaperBook(pageCounts: number[]) {
  const indexPages = Math.max(1, Math.ceil(pageCounts.length / ROWS_PER_INDEX_PAGE));
  const frontPages = 1 + indexPages;
  let next = frontPages + 1;
  const ranges = pageCounts.map((n) => {
    const r: [number, number] = [next, next + n - 1];
    next += n;
    return r;
  });
  return { indexPages, frontPages, ranges, total: next - 1 };
}

const INK = rgb(0.08, 0.08, 0.08);
const SOFT = rgb(0.35, 0.35, 0.35);

function centre(page: PDFPage, text: string, y: number, font: PDFFont, size: number) {
  const { width } = page.getSize();
  const t = pdfSafe(text, font);
  page.drawText(t, { x: (width - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color: INK });
}

function fit(text: string, font: PDFFont, size: number, width: number): string {
  let t = pdfSafe(text, font);
  if (font.widthOfTextAtSize(t, size) <= width) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

export async function buildPaperBook(input: PaperBookInput): Promise<Uint8Array> {
  if (!input.items.length) throw new Error('Add at least one PDF to the paper book.');
  const sources: PDFDocument[] = [];
  for (const item of input.items) {
    try {
      sources.push(await PDFDocument.load(item.bytes, { ignoreEncryption: true }));
    } catch {
      throw new Error(`Could not read "${item.title}". It may be damaged or not a PDF.`);
    }
  }
  const plan = planPaperBook(sources.map((d) => d.getPageCount()));

  const out = await PDFDocument.create();
  out.setTitle(`Paper book - ${input.caseTitle}`);
  const regular = await out.embedFont(StandardFonts.TimesRoman);
  const bold = await out.embedFont(StandardFonts.TimesRomanBold);
  const italic = await out.embedFont(StandardFonts.TimesRomanItalic);

  // (a) Title page
  const title = out.addPage(A4);
  const [W, H] = A4;
  title.drawRectangle({ x: 36, y: 36, width: W - 72, height: H - 72, borderColor: INK, borderWidth: 1.5 });
  title.drawRectangle({ x: 42, y: 42, width: W - 84, height: H - 84, borderColor: INK, borderWidth: 0.5 });
  let y = H - 130;
  for (const l of wrapText(`IN THE ${input.court.toUpperCase().replace(/^IN THE /, '')}`, bold, 18, W - 160)) {
    centre(title, l, y, bold, 18);
    y -= 26;
  }
  y -= 20;
  centre(title, input.caseNo, y, bold, 14);
  y -= 60;
  const [pet, resp] = input.caseTitle.split(/\s+v(?:s)?\.?\s+/i);
  for (const l of wrapText(pet ?? input.caseTitle, bold, 16, W - 160)) {
    centre(title, l, y, bold, 16);
    y -= 22;
  }
  if (resp) {
    centre(title, '……Petitioner(s)', y, italic, 11);
    y -= 40;
    centre(title, 'VERSUS', y, bold, 13);
    y -= 40;
    for (const l of wrapText(resp, bold, 16, W - 160)) {
      centre(title, l, y, bold, 16);
      y -= 22;
    }
    centre(title, '……Respondent(s)', y, italic, 11);
  }
  centre(title, 'PAPER BOOK', 300, bold, 26);
  centre(title, `Containing ${input.items.length} document${input.items.length === 1 ? '' : 's'} · ${plan.total} pages`, 270, regular, 12);
  if (input.filedBy) centre(title, `Filed through: ${input.filedBy}`, 150, regular, 12);
  centre(title, formatPk(todayKey()), 128, regular, 11);

  // (b) Index
  const cols = { sr: 60, desc: 100, ann: 400, pages: 475, end: W - 60 };
  for (let p = 0; p < plan.indexPages; p++) {
    const page = out.addPage(A4);
    let iy = H - 80;
    centre(page, p === 0 ? 'INDEX' : 'INDEX (continued)', iy, bold, 18);
    iy -= 36;
    page.drawLine({ start: { x: cols.sr, y: iy + 14 }, end: { x: cols.end, y: iy + 14 }, thickness: 1, color: INK });
    for (const [x, t] of [
      [cols.sr, 'Sr.'],
      [cols.desc, 'Description of documents'],
      [cols.ann, 'Annexure'],
      [cols.pages, 'Pages'],
    ] as const)
      page.drawText(t, { x, y: iy, size: 11, font: bold, color: INK });
    iy -= 8;
    page.drawLine({ start: { x: cols.sr, y: iy }, end: { x: cols.end, y: iy }, thickness: 0.6, color: INK });
    iy -= 20;
    const start = p * ROWS_PER_INDEX_PAGE;
    input.items.slice(start, start + ROWS_PER_INDEX_PAGE).forEach((item, k) => {
      const i = start + k;
      const [a, b] = plan.ranges[i];
      page.drawText(`${i + 1}.`, { x: cols.sr, y: iy, size: 11, font: regular, color: INK });
      page.drawText(fit(item.title, regular, 11, cols.ann - cols.desc - 10), { x: cols.desc, y: iy, size: 11, font: regular, color: INK });
      page.drawText(item.annexure ? pdfSafe(item.annexure, regular) : '—', { x: cols.ann + 12, y: iy, size: 11, font: regular, color: INK });
      page.drawText(a === b ? `${a}` : `${a} – ${b}`, { x: cols.pages, y: iy, size: 11, font: regular, color: INK });
      iy -= 24;
    });
    page.drawLine({ start: { x: cols.sr, y: iy + 12 }, end: { x: cols.end, y: iy + 12 }, thickness: 0.6, color: INK });
  }

  // (c) Documents, with (e) the annexure stamp on each annexure's first page
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((pg, k) => {
      out.addPage(pg);
      const ann = input.items[i].annexure?.trim();
      if (k === 0 && ann) {
        const label = pdfSafe(`Annexure-${ann.replace(/^annexure[-\s]*/i, '')}`, bold);
        const size = 13;
        const tw = bold.widthOfTextAtSize(label, size);
        const { width, height } = pg.getSize();
        const bx = width - tw - 24 - 28;
        const by = height - 28 - 26;
        pg.drawRectangle({ x: bx, y: by, width: tw + 24, height: 26, color: rgb(1, 1, 1), borderColor: INK, borderWidth: 1.2 });
        pg.drawText(label, { x: bx + 12, y: by + 8, size, font: bold, color: INK });
      }
    });
  }

  // (d) Page numbers
  const pages = out.getPages();
  pages.forEach((pg, i) => {
    const t = `Page ${i + 1} of ${pages.length}`;
    const size = 10;
    const tw = regular.widthOfTextAtSize(t, size);
    const { width } = pg.getSize();
    const x = (width - tw) / 2;
    pg.drawRectangle({ x: x - 6, y: 14, width: tw + 12, height: 16, color: rgb(1, 1, 1), opacity: 0.85 });
    pg.drawText(t, { x, y: 18, size, font: regular, color: i < plan.frontPages ? SOFT : INK });
  });

  return out.save();
}

/** Save a built paper book to the case's documents (folder "Pleadings"). */
export async function savePaperBookToCase(bytes: Uint8Array, name: string, meta: { caseId?: string; uploadedBy: string }): Promise<DocFile> {
  return saveDocument(new Blob([bytes as BlobPart], { type: 'application/pdf' }), name, { folder: 'Pleadings', ...meta });
}
