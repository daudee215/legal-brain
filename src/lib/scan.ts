/**
 * Pure helpers for "Scan with camera": clean up a photographed page and bind pages into one A4 PDF.
 * Nothing here touches the DOM, so it is unit-tested without a canvas.
 */
import { PDFDocument } from 'pdf-lib';

export type ScanMode = 'original' | 'document';

/** Longest side, in pixels, a scanned page is kept at. Enough to read a court order; keeps PDFs small. */
export const SCAN_MAX_SIDE = 1800;
/** JPEG quality used when a page is encoded from the canvas. */
export const SCAN_JPEG_QUALITY = 0.8;

/** Downscale (never upscale) so the longest side is at most `max`. */
export function fitSize(w: number, h: number, max = SCAN_MAX_SIDE): { width: number; height: number } {
  if (!(w > 0) || !(h > 0)) return { width: 0, height: 0 };
  const long = Math.max(w, h);
  if (long <= max) return { width: Math.round(w), height: Math.round(h) };
  const k = max / long;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

function percentile(hist: Uint32Array, total: number, p: number): number {
  const target = total * p;
  let seen = 0;
  for (let v = 0; v < 256; v++) {
    seen += hist[v];
    if (seen > target) return v;
  }
  return 255;
}

/**
 * Make a phone photo of paper look like a scan, in place on an RGBA array.
 * 'document': grayscale, stretch levels so the 2nd percentile goes black and the 98th goes white,
 * then a gentle gamma lift so shadowed paper reads as white. Alpha is never changed.
 * 'original': leaves the data untouched.
 */
export function enhancePixels(data: Uint8ClampedArray, mode: ScanMode): Uint8ClampedArray {
  if (mode !== 'document') return data;
  const n = Math.floor(data.length / 4);
  if (!n) return data;
  const lum = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; p < n; i += 4, p++) {
    const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    lum[p] = y;
    hist[lum[p]]++;
  }
  let lo = percentile(hist, n, 0.02);
  const hi = Math.max(1, percentile(hist, n, 0.98));
  // A nearly flat page (blank sheet, or all one grey): treat its level as paper, not as ink.
  if (hi - lo < 24) lo = 0;
  const range = Math.max(1, hi - lo);
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const x = Math.min(1, Math.max(0, (v - lo) / range));
    lut[v] = Math.round(255 * Math.pow(x, 0.85));
  }
  for (let i = 0, p = 0; p < n; i += 4, p++) {
    const v = lut[lum[p]];
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  return data;
}

export interface ScanPage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/** A4 portrait in PDF points, and the margin kept around each page image. */
const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 24;

/** Bind JPEG pages into one PDF: one A4 portrait page per image, scaled to fit inside a 24pt margin, centred. */
export async function imagesToPdf(pages: ScanPage[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setProducer('Scan to PDF');
  pdf.setCreator('Scan to PDF');
  for (const pg of pages) {
    const img = await pdf.embedJpg(pg.bytes);
    const w = pg.width > 0 ? pg.width : img.width;
    const h = pg.height > 0 ? pg.height : img.height;
    const k = Math.min((A4.w - 2 * MARGIN) / w, (A4.h - 2 * MARGIN) / h);
    const dw = w * k;
    const dh = h * k;
    const page = pdf.addPage([A4.w, A4.h]);
    page.drawImage(img, { x: (A4.w - dw) / 2, y: (A4.h - dh) / 2, width: dw, height: dh });
  }
  return pdf.save();
}

/** "Scan 24 Nov 2026" style default name, from a dd Mon yyyy date label. */
export function defaultScanName(dateLabel: string): string {
  return `Scan ${dateLabel}`;
}

/** A safe .pdf file name from what the user typed. */
export function scanFileName(name: string, fallback: string): string {
  const clean = name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || fallback;
  return /\.pdf$/i.test(clean) ? clean : `${clean}.pdf`;
}

/** Move item `i` by `dir` (-1 up, +1 down); returns a new array, unchanged if out of range. */
export function movePage<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (i < 0 || i >= list.length || j < 0 || j >= list.length) return list;
  const out = list.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
