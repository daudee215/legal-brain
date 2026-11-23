/**
 * Automatic cause lists: the deploy job (scripts/causelists) publishes the courts' lists as static JSON under
 * /cause-lists/ on this same site. This module downloads the days that matter, matches them against the
 * chamber's cases ON THIS DEVICE (nothing about the practice is sent anywhere) and sorts the results into:
 *  - same-day matches: the case is on the list for the day the diary already shows → court room / serial
 *    number are saved automatically (seniors and juniors only, never in the demo);
 *  - other-day matches: listed on a different day than the diary says → shown for a one-tap date update;
 *  - possible matches: only the party name was found → shown for a one-tap confirmation.
 */
import { matchCauseList, matchEntries, type CauseListHit, type ListEntry } from './causeList';
import { pktDateKey } from './dates';
import type { Case, CauseListEntry } from '../types';

export interface DayFile {
  court: string;
  date: string;
  fetchedAt: string;
  source?: string;
  entries?: ListEntry[];
  lines?: string[];
}
export interface IndexRow {
  court: string;
  date: string;
  count: number;
  fetchedAt: string;
  path: string;
}
export interface IndexFile {
  generatedAt: string;
  files: IndexRow[];
}

export interface Finding {
  caseId: string;
  court: string;
  /** Day of the list the case was found in. */
  date: string;
  hit: CauseListHit;
  /** Day the diary has for the case (undefined = no next date). */
  diaryDay?: string;
}

export interface Analysis {
  /** Same-day matches whose court room / serial number are not yet saved. */
  toSave: { date: string; hits: CauseListHit[] }[];
  /** Same-day matches (saved or not), per list day. */
  sameDay: Finding[];
  otherDay: Finding[];
  possible: Finding[];
}

const ACTIVE = (c: Case) => c.status !== 'decided' && c.status !== 'disposed';

/** Courts the chamber has live cases in. */
export function relevantCourts(cases: Case[]): string[] {
  return [...new Set(cases.filter(ACTIVE).map((c) => c.courtId))];
}

/** Index rows worth downloading: today onwards, for the given courts. */
export function wantedFiles(index: IndexFile | null, courts: string[], today: string): IndexRow[] {
  if (!index?.files) return [];
  return index.files.filter((f) => courts.includes(f.court) && f.date >= today && /^[a-z][a-z0-9-]*\/\d{4}-\d{2}-\d{2}\.json$/.test(f.path));
}

export const findingKey = (f: Pick<Finding, 'caseId' | 'date'>) => `${f.caseId}|${f.date}`;

function sameEntry(e: CauseListEntry | undefined, h: CauseListHit): boolean {
  return !!e && e.courtRoom === (h.courtRoom ?? '') && e.srNo === (h.srNo ?? 0) && e.bench === (h.bench ?? '');
}

/** Match every downloaded day against the chamber's cases and sort the results (see the module comment). */
export function analyse(files: DayFile[], cases: Case[], causeList: CauseListEntry[], today: string, dismissed: Set<string> = new Set()): Analysis {
  const strong = new Map<string, Finding[]>();
  const weak = new Map<string, Finding[]>();
  const active = cases.filter(ACTIVE);
  for (const f of [...files].filter((x) => x.date >= today).sort((a, b) => a.date.localeCompare(b.date))) {
    const inCourt = active.filter((c) => c.courtId === f.court);
    if (!inCourt.length) continue;
    const hits = f.entries ? matchEntries(f.entries, inCourt) : matchCauseList((f.lines ?? []).join('\n'), inCourt);
    for (const hit of hits) {
      const c = inCourt.find((x) => x.id === hit.caseId)!;
      const finding: Finding = { caseId: c.id, court: f.court, date: f.date, hit, diaryDay: c.nextHearing ? pktDateKey(c.nextHearing) : undefined };
      const map = hit.kind === 'matched' ? strong : weak;
      map.set(c.id, [...(map.get(c.id) ?? []), finding]);
    }
  }

  const out: Analysis = { toSave: [], sameDay: [], otherDay: [], possible: [] };
  const save = new Map<string, CauseListHit[]>();
  for (const [caseId, list] of strong) {
    const same = list.find((f) => f.date === f.diaryDay);
    if (same) {
      out.sameDay.push(same);
      const saved = causeList.find((e) => e.caseId === caseId && e.date === same.date);
      if (!sameEntry(saved, same.hit)) save.set(same.date, [...(save.get(same.date) ?? []), same.hit]);
    } else if (!dismissed.has(findingKey(list[0]))) {
      out.otherDay.push(list[0]);
    }
  }
  for (const [caseId, list] of weak) {
    if (strong.has(caseId)) continue;
    const f = list[0];
    // Already confirmed on this device or another one (a saved entry for that day), or set aside.
    if (causeList.some((e) => e.caseId === caseId && e.date === f.date) || dismissed.has(findingKey(f))) continue;
    out.possible.push(f);
  }
  out.toSave = [...save].map(([date, hits]) => ({ date, hits }));
  return out;
}

/* ------------------------------ download (same origin, cached in memory) ------------------------------ */

export interface Downloaded {
  index: IndexFile | null;
  files: DayFile[];
  checkedAt: string;
}

const fileCache = new Map<string, DayFile>();

/** Fetch /cause-lists/index.json and the wanted day files. Never throws: a missing index means "nothing yet". */
export async function download(courts: string[], today: string, fetchImpl: typeof fetch = fetch): Promise<Downloaded> {
  const checkedAt = new Date().toISOString();
  let index: IndexFile | null = null;
  try {
    const res = await fetchImpl('/cause-lists/index.json', { cache: 'no-cache' });
    if (res.ok) index = (await res.json()) as IndexFile;
  } catch {
    index = null;
  }
  const files: DayFile[] = [];
  for (const row of wantedFiles(index, courts, today)) {
    const key = `${row.path}@${row.fetchedAt}`;
    const cached = fileCache.get(key);
    if (cached) {
      files.push(cached);
      continue;
    }
    try {
      const res = await fetchImpl(`/cause-lists/${row.path}`, { cache: 'no-cache' });
      if (!res.ok) continue;
      const day = (await res.json()) as DayFile;
      if (day.court !== row.court || day.date !== row.date) continue;
      fileCache.set(key, day);
      files.push(day);
    } catch {
      /* offline or a half-published deploy: try again next time */
    }
  }
  return { index, files, checkedAt };
}

/** Where in the list a finding sits, e.g. "Court 3 · Sr. 12". */
export function placeOf(f: Finding): string {
  return [f.hit.courtRoom ? `Court ${f.hit.courtRoom}` : '', f.hit.srNo ? `Sr. ${f.hit.srNo}` : ''].filter(Boolean).join(' · ');
}

