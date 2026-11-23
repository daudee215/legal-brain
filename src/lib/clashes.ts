/**
 * Clash detector: the same chamber listed in two different courts too close together to attend both.
 * Pure functions take data in; assignCover writes through updateCase.
 */
import type { Case, Court } from '../types';
import { pktDateKey } from './dates';
import { updateCase } from './mutations';
import { getDb } from './store';

const TWO_HOURS = 2 * 60 * 60 * 1000;
const CLOSED: Case['status'][] = ['decided', 'disposed'];

export interface ClashGroup {
  dayKey: string;
  /** Cases in the clash, earliest first. */
  cases: Case[];
  /** Everyone assigned to any case in the group. */
  members: string[];
  /** Members assigned to more than one case in the group — they cannot be in both places. */
  doubleBooked: string[];
  /** 'city' when the courts are in different cities (can't attend both that day), else 'time'. */
  reason: 'time' | 'city';
}

const isOpen = (c: Case) => !CLOSED.includes(c.status);

/** Groups of ≥2 open cases listed on `dayKey` (PKT) in different courts, within 2 hours or in different cities. */
export function findClashes(cases: Case[], courts: Court[], dayKey: string): ClashGroup[] {
  const day = cases
    .filter((c) => isOpen(c) && c.nextHearing && pktDateKey(c.nextHearing) === dayKey)
    .sort((a, b) => Date.parse(a.nextHearing!) - Date.parse(b.nextHearing!));
  const city = (c: Case) => courts.find((x) => x.id === c.courtId)?.city ?? '';

  // union–find over the day's cases
  const parent = day.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const cityClash = new Set<number>();
  for (let i = 0; i < day.length; i++)
    for (let j = i + 1; j < day.length; j++) {
      const a = day[i];
      const b = day[j];
      if (a.courtId === b.courtId) continue;
      const otherCity = city(a) !== city(b);
      const close = Math.abs(Date.parse(a.nextHearing!) - Date.parse(b.nextHearing!)) <= TWO_HOURS;
      if (!otherCity && !close) continue;
      const root = find(j);
      parent[root] = find(i);
      if (otherCity) {
        cityClash.add(i);
        cityClash.add(j);
      }
    }

  const groups = new Map<number, number[]>();
  day.forEach((_, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), i]);
  });

  const out: ClashGroup[] = [];
  for (const idx of groups.values()) {
    if (idx.length < 2) continue;
    const gc = idx.map((i) => day[i]);
    const count = new Map<string, number>();
    for (const c of gc) for (const m of new Set(c.assignedTo)) count.set(m, (count.get(m) ?? 0) + 1);
    out.push({
      dayKey,
      cases: gc,
      members: [...count.keys()],
      doubleBooked: [...count.entries()].filter(([, n]) => n > 1).map(([m]) => m),
      reason: idx.some((i) => cityClash.has(i)) ? 'city' : 'time',
    });
  }
  return out;
}

/** Open cases whose listed date is before `dayKey` — the date passed and nobody recorded what happened. Oldest first. */
export function overdueCases(cases: Case[], dayKey: string): Case[] {
  return cases
    .filter((c) => isOpen(c) && c.nextHearing && pktDateKey(c.nextHearing) < dayKey)
    .sort((a, b) => Date.parse(a.nextHearing!) - Date.parse(b.nextHearing!));
}

/** Send another chamber member to cover a case (adds them to its assigned list). */
export function assignCover(caseId: string, memberId: string) {
  const c = getDb().cases.find((x) => x.id === caseId);
  if (!c) throw new Error('Case not found');
  if (c.assignedTo.includes(memberId)) return;
  updateCase(caseId, { assignedTo: [...c.assignedTo, memberId] });
}
