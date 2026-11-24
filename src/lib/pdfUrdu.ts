/**
 * Urdu on the browser-made PDFs.
 *
 * pdf-lib cannot join or reorder Arabic-script letters, so any string with Urdu in it is drawn by the browser
 * on a canvas (which shapes Nastaliq and runs the bidi algorithm, so mixed Urdu/English/numbers come out right)
 * and placed in the PDF as a transparent PNG. Latin-only text keeps using pdf-lib's vector Times fonts.
 *
 * The renderer is injectable (`ArabicRenderer`) so unit tests, where jsdom has no canvas, can pass a fake.
 * Also here: Urdu amount-in-words, Urdu dates and the Urdu wording of the client-facing PDFs.
 */
import { pktDateKey } from './dates';

/** Arabic, Arabic Supplement and the two presentation-form blocks. */
export const ARABIC_RE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
export const hasArabic = (s: string | undefined | null): boolean => !!s && ARABIC_RE.test(s);

export type PdfLang = 'en' | 'ur' | 'both';

export interface ArabicRenderOpts {
  sizePt: number;
  /** 0..1 each, like pdf-lib's rgb(). */
  color: [number, number, number];
  maxWidthPt: number;
  align: 'left' | 'center' | 'right';
  bold?: boolean;
}
export interface ArabicRendered {
  png: Uint8Array;
  widthPt: number;
  heightPt: number;
  /** Optional: distance from the top of the image to the first line's baseline, so it can sit level with vector text. */
  baselinePt?: number;
}
/** Draws one paragraph (it may wrap to several lines) and returns it as a PNG sized in points. */
export type ArabicRenderer = (text: string, opts: ArabicRenderOpts) => Promise<ArabicRendered>;

/** Options every PDF builder accepts. */
export interface PdfBuildOpts {
  /** Draws Urdu text; defaults to the browser canvas. Tests inject a fake. */
  renderer?: ArabicRenderer;
}

/* ---------------------------------------------------------------------------------------------- */
/* Default renderer: the browser's canvas                                                         */
/* ---------------------------------------------------------------------------------------------- */

/** Canvas pixels per PDF point: 3x a 96-dpi screen (96/72 px per pt), so print stays sharp. */
const PX_PER_PT = 3 * (96 / 72);
const URDU_STACK = '"Noto Nastaliq Urdu", "Urdu Typesetting", "Jameel Noori Nastaleeq", "Noto Naskh Arabic", serif';
const FONT_WAIT_MS = 6000;
/** Same stylesheet globals.css imports. */
const URDU_CSS = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400..700&display=swap';

/**
 * Make sure a @font-face for Noto Nastaliq Urdu exists. The @import in globals.css can end up below other rules
 * in the bundled CSS, where browsers ignore it, so add the stylesheet as a <link> when the face is missing.
 */
function linkUrduCss(): Promise<void> {
  let has = false;
  document.fonts.forEach((f) => {
    if (/Noto Nastaliq Urdu/i.test(f.family)) has = true;
  });
  if (has || document.querySelector('link[data-urdu-font]')) return Promise.resolve();
  return new Promise((resolve) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = URDU_CSS;
    l.dataset.urduFont = '1';
    l.onload = () => resolve();
    l.onerror = () => resolve();
    document.head.appendChild(l);
  });
}

let fontReady: Promise<void> | undefined;
/** Wait (at most a few seconds) for the Nastaliq web font; on timeout the system fallbacks are used and the next PDF tries again. */
export function ensureUrduFont(sample = 'اردو'): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (!fonts?.load) return Promise.resolve();
  if (!fontReady) {
    let timedOut = false;
    fontReady = Promise.race([
      linkUrduCss()
        .then(() => Promise.all([fonts.load('400 16px "Noto Nastaliq Urdu"', sample), fonts.load('700 16px "Noto Nastaliq Urdu"', sample)]))
        .then(
          () => undefined,
          () => undefined,
        ),
      new Promise<void>((r) =>
        setTimeout(() => {
          timedOut = true;
          r();
        }, FONT_WAIT_MS),
      ),
    ]).then(() => {
      if (timedOut) fontReady = undefined;
    });
  }
  return fontReady;
}

/** Right-to-left mark: put first in Urdu wording that may begin with an English name. */
export const RLM = '‏';
/** Mark a string as right-to-left even if it starts with English (e.g. a client named in English). */
export const rtl = (s: string) => (s.startsWith(RLM) ? s : RLM + s);

/** Direction of the first strong character (or an explicit RLM/LRM mark): an English sentence holding one Urdu name stays left-to-right. */
export function baseDirection(text: string): 'rtl' | 'ltr' {
  for (const ch of text) {
    if (ch === RLM || ARABIC_RE.test(ch)) return 'rtl';
    if (ch === '‎') return 'ltr';
    if (/[A-Za-zÀ-ɏ]/.test(ch)) return 'ltr';
  }
  return 'rtl';
}

/** Greedy word wrap with the canvas's own measurements. A word wider than the line stays whole (scaled later). */
function wrapCanvas(measure: (s: string) => number, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r/g, '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (!line || measure(next) <= maxW) line = next;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const fromDataUrl = () => {
      const url = canvas.toDataURL('image/png');
      const b64 = url.slice(url.indexOf(',') + 1);
      resolve(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    };
    try {
      if (!canvas.toBlob) return fromDataUrl();
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Could not draw Urdu text'));
        blob.arrayBuffer().then((b) => resolve(new Uint8Array(b)), reject);
      }, 'image/png');
    } catch (e) {
      reject(e);
    }
  });
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}

/** The real renderer: browser canvas, Nastaliq web font, 3x scale, transparent background. */
export const canvasArabicRenderer: ArabicRenderer = async (text, o) => {
  if (typeof document === 'undefined') throw new Error('Urdu text needs a browser');
  await ensureUrduFont(text.slice(0, 40));
  const canvas = document.createElement('canvas');
  const ctx = context2d(canvas);
  if (!ctx) throw new Error('Canvas is not available');
  const px = o.sizePt * PX_PER_PT;
  const dir = baseDirection(text);
  const setup = (c: CanvasRenderingContext2D) => {
    c.font = `${o.bold ? 700 : 400} ${px}px ${URDU_STACK}`;
    c.direction = dir;
    c.textBaseline = 'alphabetic';
  };
  setup(ctx);
  const maxW = o.maxWidthPt * PX_PER_PT;
  const padX = Math.ceil(px * 0.3); // Nastaliq swashes overhang the advance width
  const padY = Math.ceil(px * 0.1);
  const lines = wrapCanvas((s) => ctx.measureText(s).width, text, maxW - 2 * padX);
  // Nastaliq stacks letters high and drops low: take the real ink extents, with a floor so lines stay even.
  let asc = px * 1.05;
  let desc = px * 0.55;
  let widest = 1;
  for (const l of lines) {
    const m = ctx.measureText(l || ' ');
    asc = Math.max(asc, m.actualBoundingBoxAscent || 0);
    desc = Math.max(desc, m.actualBoundingBoxDescent || 0);
    widest = Math.max(widest, m.width);
  }
  const lh = asc + desc + px * 0.12;
  canvas.width = Math.ceil(widest + 2 * padX);
  canvas.height = Math.ceil(lines.length * lh + 2 * padY);
  setup(ctx); // resizing a canvas resets its state
  const [r, g, b] = o.color.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.textAlign = o.align;
  const x = o.align === 'right' ? canvas.width - padX : o.align === 'center' ? canvas.width / 2 : padX;
  lines.forEach((l, i) => l && ctx.fillText(l, x, padY + i * lh + asc));
  const png = await canvasPng(canvas);
  // one unbreakable word wider than the space: shrink the picture to fit
  const k = Math.min(1, o.maxWidthPt / (canvas.width / PX_PER_PT));
  return { png, widthPt: (canvas.width / PX_PER_PT) * k, heightPt: (canvas.height / PX_PER_PT) * k, baselinePt: ((padY + asc) / PX_PER_PT) * k };
};

/* ---------------------------------------------------------------------------------------------- */
/* Amount in words (Urdu, Pakistani system)                                                        */
/* ---------------------------------------------------------------------------------------------- */

/** 0-99 in Urdu. Every number up to a hundred has its own word; they are not built from parts. */
export const URDU_0_99 = [
  'صفر', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو',
  'دس', 'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'سترہ', 'اٹھارہ', 'انیس',
  'بیس', 'اکیس', 'بائیس', 'تئیس', 'چوبیس', 'پچیس', 'چھبیس', 'ستائیس', 'اٹھائیس', 'انتیس',
  'تیس', 'اکتیس', 'بتیس', 'تینتیس', 'چونتیس', 'پینتیس', 'چھتیس', 'سینتیس', 'اڑتیس', 'انتالیس',
  'چالیس', 'اکتالیس', 'بیالیس', 'تینتالیس', 'چوالیس', 'پینتالیس', 'چھیالیس', 'سینتالیس', 'اڑتالیس', 'انچاس',
  'پچاس', 'اکیاون', 'باون', 'ترپن', 'چون', 'پچپن', 'چھپن', 'ستاون', 'اٹھاون', 'انسٹھ',
  'ساٹھ', 'اکسٹھ', 'باسٹھ', 'تریسٹھ', 'چونسٹھ', 'پینسٹھ', 'چھیاسٹھ', 'سڑسٹھ', 'اڑسٹھ', 'انہتر',
  'ستر', 'اکہتر', 'بہتر', 'تہتر', 'چوہتر', 'پچھتر', 'چھہتر', 'ستتر', 'اٹھہتر', 'اناسی',
  'اسی', 'اکیاسی', 'بیاسی', 'تراسی', 'چوراسی', 'پچاسی', 'چھیاسی', 'ستاسی', 'اٹھاسی', 'نواسی',
  'نوے', 'اکانوے', 'بانوے', 'ترانوے', 'چورانوے', 'پچانوے', 'چھیانوے', 'ستانوے', 'اٹھانوے', 'ننانوے',
] as const;

function urduUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${URDU_0_99[h]} سو` : '', r ? URDU_0_99[r] : ''].filter(Boolean).join(' ');
}

/** Words for a whole number in the hazar / lakh / crore system ("ایک لاکھ تئیس ہزار چار سو چھپن"). */
export function numberInWordsUrdu(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return URDU_0_99[0];
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${crore >= 1000 ? numberInWordsUrdu(crore) : urduUnder1000(crore)} کروڑ`);
  if (lakh) parts.push(`${URDU_0_99[lakh]} لاکھ`);
  if (thousand) parts.push(`${URDU_0_99[thousand]} ہزار`);
  if (n) parts.push(urduUnder1000(n));
  return parts.join(' ');
}

/** "پچیس ہزار روپے صرف" as written on a Pakistani receipt. Paisa are dropped; exactly one rupee is "ایک روپیہ صرف". */
export function amountInWordsUrdu(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  return `${numberInWordsUrdu(n)} ${n === 1 ? 'روپیہ' : 'روپے'} صرف`;
}

/* ---------------------------------------------------------------------------------------------- */
/* Urdu wording for the client-facing PDFs                                                         */
/* ---------------------------------------------------------------------------------------------- */

const URDU_MONTHS = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'];
/** '23 نومبر 2026' (Pakistan time). */
export function formatPkUrdu(iso: string): string {
  const [y, m, d] = pktDateKey(iso).split('-').map(Number);
  return `${d} ${URDU_MONTHS[m - 1]} ${y}`;
}

/** '09:00 AM' -> '09:00 قبل دوپہر' (the clock time from formatTime, with the Urdu a.m./p.m.). */
export function urduClock(time12: string): string {
  const m = /^(\d{1,2}:\d{2})\s*([AP])\.?M\.?$/i.exec(time12.trim());
  if (!m) return time12;
  return `${m[1]} ${m[2].toUpperCase() === 'A' ? 'قبل دوپہر' : 'بعد دوپہر'}`;
}

/** 'Rs 25,000' in Urdu wording: '25,000 روپے'. */
export const rupeesUrdu = (n: number) => `${n.toLocaleString('en-PK')} روپے`;

export const UR = {
  tagline: 'ایڈووکیٹس و قانونی مشیران',
  // Fee receipt
  feeReceipt: 'رسیدِ فیس',
  receiptNo: 'رسید نمبر',
  date: 'تاریخ',
  /** {client} {amount} {words} */
  receivedSentence: '{client} سے مبلغ {amount} ({words}) بطور فیسِ وکالت، درج ذیل مقدمے کی بابت، شکریہ کے ساتھ وصول پائے۔',
  case: 'مقدمہ',
  caseNo: 'مقدمہ نمبر',
  amount: 'رقم',
  inWords: 'رقم بالفاظ',
  mode: 'طریقۂ ادائیگی',
  note: 'نوٹ',
  signature: 'دستخط و مہر',
  receiptFooter: 'یہ رسید لیگل برین (Legal Brain) سے کمپیوٹر پر تیار کی گئی ہے۔ براہِ کرم اسے اپنے ریکارڈ کے لیے محفوظ رکھیں۔',
  // Case status report
  caseStatus: 'مقدمے کی صورتحال کی رپورٹ',
  client: 'موکل',
  court: 'عدالت',
  judge: 'جج / بینچ',
  stage: 'مرحلہ',
  status: 'حیثیت',
  nextHearing: 'اگلی پیشی',
  notFixed: 'مقرر نہیں',
  reportDate: 'تاریخِ رپورٹ',
  fee: 'فیس',
  agreed: 'طے شدہ',
  received: 'وصول شدہ',
  outstanding: 'بقایا',
  hearingHistory: 'پیشیوں کی تفصیل',
  colDate: 'تاریخ',
  colProceedings: 'کارروائی',
  colNextDate: 'اگلی تاریخ',
  noHearings: 'ابھی کوئی پیشی درج نہیں۔',
  nextDate: 'اگلی تاریخ:',
  statusFooter: 'یہ رپورٹ موکل کی معلومات کے لیے تیار کی گئی ہے۔ عدالت کے حکم سے تاریخیں تبدیل ہو سکتی ہیں۔',
  /** {n} {total} */
  page: 'صفحہ {n} از {total}',
} as const;

const STATUS_UR: Record<string, string> = {
  pending: 'زیرِ سماعت',
  adjourned: 'ملتوی',
  reserved: 'فیصلہ محفوظ',
  decided: 'فیصل شدہ',
  disposed: 'نمٹایا گیا',
};
export const statusUrdu = (s: string) => STATUS_UR[s.toLowerCase()] ?? s;

const MODE_UR: Record<string, string> = {
  cash: 'نقد',
  cheque: 'چیک',
  check: 'چیک',
  'bank transfer': 'بینک ٹرانسفر',
  online: 'آن لائن',
};
/** Known payment modes in Urdu; anything else is printed as entered. */
export const modeUrdu = (m: string) => MODE_UR[m.trim().toLowerCase()] ?? m;

/** Fill `{name}` placeholders. */
export const fill = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.split(`{${k}}`).join(String(v)), s);
