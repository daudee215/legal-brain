/**
 * Find the "next hearing" date in text read from a photographed court order (OCR output).
 * Pure and deterministic: no DOM, no clock (the caller passes today's day key).
 * Dates are always day-first (Pakistan): 05/12/2026 is 5 December.
 */

export interface DateSuggestion {
  /** YYYY-MM-DD */
  date: string;
  /** the line of the order the date was found on (keyword line included when it sits just above) */
  line: string;
  /** 'keyword': led by "adjourned to", "next date" and the like; 'plain': any other future date */
  strength: 'keyword' | 'plain';
}

const MAX_SUGGESTIONS = 3;
/** Plain dates further out than this are almost never a hearing date. */
const PLAIN_MAX_DAYS = 2 * 366;
const KEYWORD_MAX_DAYS = 5 * 366;

// ---- keyword phrases -----------------------------------------------------------------------------

/** Phrases that point forward: "adjourned to 12.12.2026". */
const FORWARD_KEYS = [
  String.raw`adjou(?:rn|m)ed(?:\s*(?:to|till|til|until|for|upto|up\s*to|on))?`,
  String.raw`adjd?\.?\s*(?:to|till|until|for|on)`,
  String.raw`next\s+(?:date|hearing)`,
  String.raw`date\s+of\s+next\s+hearing`,
  String.raw`n\.?\s?d\.?\s?(?:o\.?\s?)?h\.?`,
  String.raw`put[\s-]*up(?:\s+(?:on|for|at))?`,
  String.raw`fixed\s+(?:for|on|at)`,
  String.raw`re[\s-]*list(?:ed)?(?:\s+(?:on|for))?`,
  String.raw`come\s+up(?:\s+(?:on|for))?`,
  String.raw`listed\s+(?:on|for)`,
];
/** Phrases that may name the hearing being recorded today ("date of hearing"): the date must be after today. */
const HEARING_KEYS = [String.raw`date\s+of\s+hearing`, String.raw`hearing\s+date`, String.raw`hearing\s+on`];

const FILLER = String.raw`(?:on|at|for|the|is|dated?|of|hearing|further|proceedings|arguments?|evidence|orders?|consideration|now|to|be|case|matter|fixed|listed|put|up|and|next|date|till|until)`;
const GAP = String.raw`[\s:;,.\-–—=]`;
const tail = (keys: string[]) => new RegExp(String.raw`(?:^|[^a-z])(?:${keys.join('|')})(?:${GAP}+${FILLER})*${GAP}*$`, 'i');
const FORWARD_TAIL = tail(FORWARD_KEYS);
const HEARING_TAIL = tail(HEARING_KEYS);

/** What a date is NOT: the order's own date, filing date, a case number. Applied to plain dates only. */
const NOT_A_HEARING =
  /(?:(?:dated|filed|filing|institut\w*|decided|decision|announced|registered|judg(?:e)?ment|received|signed|presented|issued|dob|born)(?:\s+(?:on|at|by))?|date\s+of\s+(?:filing|institution|order|decision|judg(?:e)?ment|birth|registration|presentation))\s*[:\-]?\s*$/i;
/** "Case No. 12/11/2026": a number, not a date. */
const CASE_NUMBER = /(?:\bno|\bnos|\bnumber|#|\bcase|\bpetition|\bappeal|\bsuit)\s*\.?\s*[:.#]?\s*$/i;

// ---- date tokens ---------------------------------------------------------------------------------

/** Digits as OCR misreads them: O/o for 0, l/I/| for 1. Only ever applied inside date-shaped tokens. */
const D = String.raw`[0-9OoIl|]`;
const Y = String.raw`[0-9Oo]`;
const cleanDigits = (s: string) => s.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1');
const realDigits = (s: string) => (s.match(/[0-9]/g) ?? []).length;

const MONTH_RE = String.raw`(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|[o0]ct(?:ober)?|nov(?:ember)?|de[ce](?:ember)?)`;
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function monthNo(name: string): number {
  const k = name.toLowerCase().replace(/^0/, 'o').slice(0, 3);
  return k === 'dee' ? 12 : (MONTHS[k] ?? 0);
}

// 12.12.2026  12-12-2026  12/12/2026  12 . 12 . 26   (same separator twice, stray spaces allowed)
const NUMERIC = new RegExp(String.raw`(${D}{1,2})[ \t]*([./-])[ \t]*(${D}{1,2})[ \t]*\2[ \t]*(${Y}{4}|${Y}{2})(?![0-9])`, 'g');
// 12 Dec 2026  12th December, 2026  12th of Dec. 26
const DAY_MONTH = new RegExp(String.raw`(${D}{1,2})[ \t]*(?:st|nd|rd|th)?[ \t]*(?:of[ \t]+)?(${MONTH_RE})(?![a-z])\.?[ \t]*,?[ \t]*(${Y}{4}|${Y}{2})(?![0-9])`, 'gi');
// December 12, 2026  (month first; the year must be four digits)
const MONTH_DAY = new RegExp(String.raw`(${MONTH_RE})(?![a-z])\.?[ \t]+(${D}{1,2})[ \t]*(?:st|nd|rd|th)?[ \t]*,?[ \t]*(${Y}{4})(?![0-9])`, 'gi');

function toDayKey(day: number, month: number, year: number): string | null {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1) return null;
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > dim) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const t = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86400000);
}

interface Found {
  index: number;
  end: number;
  date: string;
  twoDigitYear: boolean;
}

function scan(text: string): Found[] {
  const out: Found[] = [];
  const push = (index: number, end: number, dayS: string, month: number, yearS: string) => {
    // stray letters count as digits only when the token is mostly real digits
    if (realDigits(dayS) < 1 || realDigits(yearS) < yearS.length - 1) return;
    // not the tail of a longer number or the middle of a longer date ("1234/12/12/2026")
    const before = text.slice(Math.max(0, index - 2), index);
    if (/\d$/.test(before) || /\d[./-]$/.test(before)) return;
    if (/^[./-]\d/.test(text.slice(end, end + 2))) return;
    const two = yearS.length === 2;
    const year = two ? 2000 + Number(cleanDigits(yearS)) : Number(cleanDigits(yearS));
    const date = toDayKey(Number(cleanDigits(dayS)), month, year);
    if (date) out.push({ index, end, date, twoDigitYear: two });
  };
  for (const m of text.matchAll(NUMERIC)) {
    const [whole, d, , mo, y] = m;
    if (realDigits(mo) < 1) continue;
    push(m.index!, m.index! + whole.length, d, Number(cleanDigits(mo)), y);
  }
  for (const m of text.matchAll(DAY_MONTH)) {
    const [whole, d, mon, y] = m;
    push(m.index!, m.index! + whole.length, d, monthNo(mon), y);
  }
  for (const m of text.matchAll(MONTH_DAY)) {
    const [whole, mon, d, y] = m;
    push(m.index!, m.index! + whole.length, d, monthNo(mon), y);
  }
  return out.sort((a, b) => a.index - b.index);
}

function lineOf(text: string, from: number, to: number): string {
  const start = text.lastIndexOf('\n', from - 1) + 1;
  let end = text.indexOf('\n', to);
  if (end < 0) end = text.length;
  let line = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (line.length > 120) {
    const at = Math.max(0, from - start - 50);
    line = `${at > 0 ? '…' : ''}${text.slice(start + at, start + at + 110).replace(/\s+/g, ' ').trim()}…`;
  }
  return line;
}

/**
 * Up to 3 candidate next-hearing dates in `text`, strongest first.
 * Keyword-led dates ("Adjourned to 12.12.2026", "NDOH 12 Dec 2026") come before plain future dates.
 * Past dates are never returned; two-digit years are accepted only after a keyword.
 */
export function findNextDates(text: string, today: string): DateSuggestion[] {
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return [];
  const best = new Map<string, DateSuggestion & { rank: number }>();

  for (const f of scan(text)) {
    // up to 90 characters before the date, across a line break, as one line
    const prefix = text.slice(Math.max(0, f.index - 90), f.index).replace(/\s+/g, ' ');
    const ahead = daysBetween(today, f.date);
    if (CASE_NUMBER.test(prefix)) continue;

    let strength: 'keyword' | 'plain';
    let rank: number;
    if (FORWARD_TAIL.test(prefix)) {
      if (ahead < 0 || ahead > KEYWORD_MAX_DAYS) continue;
      strength = 'keyword';
      rank = 0;
    } else if (HEARING_TAIL.test(prefix)) {
      // "date of hearing" often names the hearing being recorded, so it must lie ahead of today
      if (ahead <= 0 || ahead > KEYWORD_MAX_DAYS) continue;
      strength = 'keyword';
      rank = 1;
    } else {
      if (f.twoDigitYear || NOT_A_HEARING.test(prefix) || ahead <= 0 || ahead > PLAIN_MAX_DAYS) continue;
      strength = 'plain';
      rank = 2;
    }

    // show the line above too when the keyword sits there ("Adjourned to" / "12.12.2026")
    const lineStart = text.lastIndexOf('\n', f.index - 1) + 1;
    const own = text.slice(lineStart, f.index).replace(/\s+/g, ' ');
    const needsAbove = strength === 'keyword' && !(rank === 0 ? FORWARD_TAIL : HEARING_TAIL).test(own);
    const line = lineOf(text, needsAbove && lineStart > 1 ? lineStart - 2 : lineStart, f.end);

    const prev = best.get(f.date);
    if (!prev || rank < prev.rank) best.set(f.date, { date: f.date, line, strength, rank });
  }

  return [...best.values()]
    .sort((a, b) => a.rank - b.rank || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ date, line, strength }) => ({ date, line, strength }));
}
