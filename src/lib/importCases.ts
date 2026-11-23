/**
 * Import a case register from Excel (.xlsx) or CSV: parse, guess which column is which,
 * match courts, then create clients + cases through the normal mutations.
 */
import type { CaseCategory, Court, Db } from '../types';
import { CASE_CATEGORIES } from '../types';
import { pktIso } from './dates';
import { addCase, addClient } from './mutations';

export type Cell = string | number | boolean | Date | null | undefined;

/** RFC 4180-ish CSV: quoted fields, "" escapes, commas/newlines inside quotes, CRLF, BOM. Blank lines dropped. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== '')).map((r) => r.map((c) => c.trim()));
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');

function key(y: number, m: number, d: number): string | undefined {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1) return undefined;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return undefined;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * A day key ('YYYY-MM-DD') from a spreadsheet cell. Slashed/dashed/dotted numeric dates are read
 * day-first (dd/mm/yyyy, the Pakistani convention). Also '1 Dec 2026', 'Dec 1, 2026', Excel serials and Dates.
 */
export function parseDate(v: Cell): string | undefined {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : key(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  if (typeof v === 'number') {
    if (v < 1 || v > 2958465) return undefined;
    const dt = new Date(Math.round((v - 25569) * 86_400_000));
    return key(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (m) return key(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) return key(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,})\.?,?[\s-]+(\d{2}|\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    return mi < 0 ? undefined : key(+m[3], mi + 1, +m[1]);
  }
  m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    return mi < 0 ? undefined : key(+m[3], mi + 1, +m[2]);
  }
  return undefined;
}

export function cellText(v: Cell): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return parseDate(v) ?? '';
  return String(v).trim();
}

export type Field = 'title' | 'caseNo' | 'court' | 'category' | 'nextHearing' | 'client' | 'clientPhone';
export const FIELDS: { id: Field; label: string; required?: boolean }[] = [
  { id: 'title', label: 'Title', required: true },
  { id: 'caseNo', label: 'Case no.' },
  { id: 'court', label: 'Court' },
  { id: 'category', label: 'Category' },
  { id: 'nextHearing', label: 'Next hearing' },
  { id: 'client', label: 'Client' },
  { id: 'clientPhone', label: 'Client phone' },
];
/** Column index per field; -1 = not imported. */
export type Mapping = Record<Field, number>;

const GUESS: [Field, RegExp][] = [
  ['clientPhone', /(client.*(phone|mobile|cell|contact|number))|^(phone|mobile|cell|contact)( ?no\.?)?$/],
  ['client', /client|party|customer/],
  ['caseNo', /case ?(no|number|#)|^no\.?$|suit ?no|petition ?no|^number$|ref/],
  ['nextHearing', /next|hearing|date/],
  ['court', /court|forum|bench/],
  ['category', /category|type|nature|kind/],
  ['title', /title|case ?name|parties|^case$|matter|name/],
];

export function guessMapping(headers: string[]): Mapping {
  const map = Object.fromEntries(FIELDS.map((f) => [f.id, -1])) as Mapping;
  const used = new Set<number>();
  for (const [field, re] of GUESS) {
    const i = headers.findIndex((h, idx) => !used.has(idx) && re.test(h.toLowerCase().trim()));
    if (i >= 0) {
      map[field] = i;
      used.add(i);
    }
  }
  return map;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Court by name or short name (exact, then partial); otherwise the first district court. */
export function matchCourt(text: string, courts: Court[]): Court | undefined {
  const fallback = courts.find((c) => c.level === 'District') ?? courts[0];
  const t = norm(text);
  if (!t) return fallback;
  return (
    courts.find((c) => norm(c.name) === t || norm(c.shortName) === t) ??
    courts.find((c) => norm(c.name).includes(t) || t.includes(norm(c.name)) || (norm(c.shortName).length > 2 && t.includes(norm(c.shortName)))) ??
    fallback
  );
}

export function matchCategory(text: string): CaseCategory {
  const t = text.toLowerCase();
  return CASE_CATEGORIES.find((c) => t.includes(c.toLowerCase())) ?? (/(crl|crim|bail)/.test(t) ? 'Criminal' : /(writ|w\.p|const)/.test(t) ? 'Constitutional' : 'Civil');
}

export interface PlannedRow {
  title: string;
  caseNo: string;
  courtId: string;
  courtName: string;
  category: CaseCategory;
  nextHearing?: string;
  clientName: string;
  clientPhone: string;
}

/** Turn data rows (header row excluded) into cases to create; rows without a title are skipped. */
export function planImport(rows: Cell[][], mapping: Mapping, courts: Court[]): { rows: PlannedRow[]; skipped: number } {
  const get = (r: Cell[], f: Field) => (mapping[f] >= 0 ? r[mapping[f]] : undefined);
  const out: PlannedRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    const title = cellText(get(r, 'title'));
    if (!title) {
      skipped++;
      continue;
    }
    const court = matchCourt(cellText(get(r, 'court')), courts);
    out.push({
      title,
      caseNo: cellText(get(r, 'caseNo')),
      courtId: court?.id ?? '',
      courtName: court?.shortName ?? '',
      category: matchCategory(cellText(get(r, 'category')) || cellText(get(r, 'caseNo'))),
      nextHearing: parseDate(get(r, 'nextHearing')),
      clientName: cellText(get(r, 'client')),
      clientPhone: cellText(get(r, 'clientPhone')),
    });
  }
  return { rows: out, skipped };
}

export interface ImportSummary {
  cases: number;
  newClients: number;
  existingClients: number;
}

/** Create clients (reusing ones with the same name) and cases. */
export function runImport(plan: PlannedRow[], db: Pick<Db, 'clients'>): ImportSummary {
  const byName = new Map(db.clients.map((c) => [c.name.trim().toLowerCase(), c.id]));
  const fresh = new Set<string>();
  const reused = new Set<string>();
  let cases = 0;
  for (const p of plan) {
    let clientId: string | undefined;
    if (p.clientName) {
      const k = p.clientName.toLowerCase();
      clientId = byName.get(k);
      if (clientId) {
        if (!fresh.has(clientId)) reused.add(clientId);
      } else {
        clientId = addClient({ name: p.clientName, phone: p.clientPhone }).id;
        byName.set(k, clientId);
        fresh.add(clientId);
      }
    }
    addCase({
      title: p.title,
      caseNo: p.caseNo,
      category: p.category,
      courtId: p.courtId,
      clientId,
      nextHearing: p.nextHearing ? pktIso(p.nextHearing) : undefined,
    });
    cases++;
  }
  return { cases, newClients: fresh.size, existingClients: reused.size };
}
