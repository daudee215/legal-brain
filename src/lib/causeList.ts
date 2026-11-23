/**
 * Cause-list matcher: finds the chamber's cases in the text of a court's published cause list.
 *
 * Case numbers are written many ways ("W.P. 30112/2026", "WP No.30112 of 2026", "Writ Petition 30112-2026"),
 * so both sides are reduced to { type family, number, letter suffix, year } before comparing.
 * Party names give a weaker "possible" match for lines where the number is missing or mistyped.
 */
import { updateDb } from './store';
import { pktIso, pktDateKey } from './dates';
import type { Case, CauseListEntry } from '../types';

/** Squashed (letters only, lowercase) spellings of case-type prefixes → the families they belong to. */
const ALIASES: [string, string[]][] = (
  [
    ['wp', ['wp', 'writpetition', 'writpet', 'writpetn']],
    ['crlmisc', ['crlmisc', 'crlm', 'crlmiscellaneous', 'criminalmisc', 'criminalmiscellaneous', 'crlmiscapplication']],
    ['cpla', ['cpla', 'civilpetitionforleavetoappeal', 'civilpetition', 'civpet', 'cpl']],
    ['const', ['constp', 'constpet', 'constpetition', 'constitutionpetition', 'constitutionalpetition']],
    ['crlappeal', ['crlappeal', 'crla', 'crlapp', 'criminalappeal']],
    ['crlrev', ['crlrev', 'crlrevision', 'criminalrevision', 'crlr']],
    ['crlpet', ['crlpet', 'crlpetition', 'criminalpetition', 'crlp']],
    ['civilrev', ['cr', 'civilrevision', 'civilrev', 'civrev']],
    ['suit', ['suit', 'civilsuit', 'cs']],
    ['familysuit', ['familysuit', 'fs', 'famsuit']],
    ['bankingsuit', ['bankingsuit', 'bs', 'banksuit']],
    ['rentpetition', ['rentpetition', 'rentpet', 'rp', 'rentcase']],
    ['guardianpetition', ['guardianpetition', 'guardianpet', 'gp', 'guardiancase']],
    ['ica', ['ica', 'intracourtappeal']],
    ['jm', ['jm', 'judicialmisc', 'judicialmiscellaneous']],
    ['ca', ['ca', 'civilappeal']],
    ['cm', ['cm', 'civilmisc', 'civilmiscellaneous', 'cma']],
    ['rfa', ['rfa', 'regularfirstappeal']],
    ['rsa', ['rsa', 'regularsecondappeal']],
    ['fao', ['fao', 'firstappealfromorder']],
  ] as [string, string[]][]
)
  .flatMap(([family, spellings]) => spellings.map((s) => [s, [family]] as [string, string[]]))
  // "C.P." is a civil petition (leave to appeal) in the Supreme Court and a constitutional petition in Sindh.
  .concat([['cp', ['cpla', 'const']]])
  .sort((a, b) => b[0].length - a[0].length);

export interface CaseNo {
  /** Main family, e.g. 'wp'; or the squashed prefix when the type is not recognised. */
  family: string;
  /** All families the prefix could mean (usually one). */
  families: string[];
  number: string;
  suffix?: string;
  year: string;
}

const NUM = /(\d{1,6})(?:\s*-\s*([a-z]{1,2})\b)?\s*(?:\/|-|\bof\b)\s*((?:19|20)\d{2})\b/gi;

function squash(s: string): string {
  let t = s.toLowerCase().replace(/[^a-z]/g, '');
  while (t.endsWith('no')) t = t.slice(0, -2);
  return t;
}

function familiesOf(prefix: string): { families: string[]; raw: string } {
  const raw = squash(prefix.slice(-60));
  const hit = ALIASES.find(([alias]) => raw.endsWith(alias));
  return { families: hit ? hit[1] : [], raw };
}

function build(prefix: string, m: RegExpExecArray): CaseNo {
  const { families, raw } = familiesOf(prefix);
  return {
    family: families[0] ?? raw,
    families: families.length ? families : [raw],
    number: String(Number(m[1])),
    suffix: m[2]?.toUpperCase(),
    year: m[3],
  };
}

/** Every case number written on one line, each with the type prefix just before it. */
function findCaseNos(line: string): CaseNo[] {
  const out: CaseNo[] = [];
  let from = 0;
  NUM.lastIndex = 0;
  for (let m = NUM.exec(line); m; m = NUM.exec(line)) {
    out.push(build(line.slice(from, m.index), m));
    from = m.index + m[0].length;
  }
  return out;
}

export function parseCaseNo(s: string): CaseNo | null {
  return findCaseNos(s)[0] ?? null;
}

export function sameCaseNo(a: CaseNo | null, b: CaseNo | null): boolean {
  if (!a || !b) return false;
  if (a.number !== b.number || a.year !== b.year) return false;
  if (a.suffix && b.suffix && a.suffix !== b.suffix) return false;
  return a.families.some((f) => b.families.includes(f));
}

export interface CauseListHit {
  caseId: string;
  /** 'matched' = case number found; 'possible' = only the party name was found. */
  kind: 'matched' | 'possible';
  page: number;
  line: string;
  srNo?: number;
  courtRoom?: string;
  bench?: string;
}

const COURT_RE = /\bcourt\s*(?:room\s*)?(?:no\.?\s*)?[:#-]?\s*(\d{1,3}[a-z]?)\b/i;
const BENCH_RE = /^\s*(?:before|bench)\b\s*(?:no\.?)?\s*[:\-–]?\s*(.+)$/i;
const SR_RE = /\bsr\.?\s*(?:no\.?)?\s*[:#-]?\s*(\d{1,4})\b/i;
const LEAD_RE = /^\s*(\d{1,4})\s*[.)]\s+/;

function serial(line: string): number | undefined {
  const m = SR_RE.exec(line) ?? LEAD_RE.exec(line);
  return m ? Number(m[1]) : undefined;
}

const STOP = new Set([
  'the', 'state', 'and', 'others', 'other', 'etc', 'through', 'thr', 'versus', 'vs', 'mst', 'ltd', 'limited', 'pvt', 'private',
  'federation', 'pakistan', 'government', 'govt', 'province', 'punjab', 'sindh', 'balochistan', 'khyber', 'pakhtunkhwa', 'islamabad',
]);

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean);
}

/** Distinctive words of the first party in a title ("Zahid Traders v. Federation" → ['zahid','traders']). */
export function partyTokens(title: string): string[] {
  const first = title.replace(/\(.*?\)/g, ' ').split(/\s+(?:v\.?|vs\.?|versus)\s+/i)[0] ?? '';
  return words(first).filter((w) => w.length >= 3 && !STOP.has(w));
}

type CaseLike = Pick<Case, 'id' | 'caseNo' | 'title'>;

/**
 * Find each case in the cause list. `text` is one string per page (or one string with "\f" page breaks).
 * Returns at most one hit per case, a number match preferred over a name match.
 */
export function matchCauseList(text: string | string[], cases: CaseLike[]): CauseListHit[] {
  const pages = typeof text === 'string' ? text.split('\f') : text;
  const wanted = cases.map((c) => ({ c, no: parseCaseNo(c.caseNo), tokens: partyTokens(c.title) }));
  const strong = new Map<string, CauseListHit>();
  const possible = new Map<string, CauseListHit>();
  const lines: { page: number; line: string; courtRoom?: string; bench?: string; nos: CaseNo[] }[] = [];

  let courtRoom: string | undefined;
  let bench: string | undefined;
  pages.forEach((p, i) => {
    for (const raw of p.split(/\r?\n/)) {
      const line = raw.replace(/\s+/g, ' ').trim();
      if (!line) continue;
      const nos = findCaseNos(line);
      const court = COURT_RE.exec(line);
      if (court && nos.length === 0) {
        courtRoom = court[1].toUpperCase();
        bench = undefined;
      }
      const b = BENCH_RE.exec(line);
      if (b && nos.length === 0) bench = b[1].trim();
      lines.push({ page: i + 1, line, courtRoom, bench, nos });
    }
  });

  const strongLines = new Set<number>();
  lines.forEach((l, idx) => {
    for (const w of wanted) {
      if (strong.has(w.c.id) || !w.no) continue;
      if (l.nos.some((n) => sameCaseNo(n, w.no))) {
        strong.set(w.c.id, { caseId: w.c.id, kind: 'matched', page: l.page, line: l.line, srNo: serial(l.line), courtRoom: l.courtRoom, bench: l.bench });
        strongLines.add(idx);
      }
    }
  });

  lines.forEach((l, idx) => {
    if (strongLines.has(idx)) return;
    const lw = new Set(words(l.line));
    for (const w of wanted) {
      if (strong.has(w.c.id) || possible.has(w.c.id) || w.tokens.length === 0) continue;
      if (w.tokens.every((t) => lw.has(t))) {
        possible.set(w.c.id, { caseId: w.c.id, kind: 'possible', page: l.page, line: l.line, srNo: serial(l.line), courtRoom: l.courtRoom, bench: l.bench });
      }
    }
  });

  return [...strong.values(), ...possible.values()];
}

/**
 * Save hits as cause-list entries for `dayKey` (replacing any entry for the same case and day), and move each
 * case's next hearing to that day if it was not already fixed for it, so it appears in that day's list.
 */
export function saveCauseListHits(dayKey: string, hits: CauseListHit[]): number {
  let saved = 0;
  updateDb((db) => {
    for (const h of hits) {
      const c = db.cases.find((x) => x.id === h.caseId);
      if (!c) continue;
      const entry: CauseListEntry = {
        date: dayKey,
        courtId: c.courtId,
        bench: h.bench ?? '',
        courtRoom: h.courtRoom ?? '',
        srNo: h.srNo ?? 0,
        caseId: c.id,
      };
      db.causeList = db.causeList.filter((e) => !(e.caseId === c.id && e.date === dayKey));
      db.causeList.push(entry);
      if (!c.nextHearing || pktDateKey(c.nextHearing) !== dayKey) c.nextHearing = pktIso(dayKey, '09:00');
      saved++;
    }
  });
  return saved;
}
