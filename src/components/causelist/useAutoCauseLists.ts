'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { analyse, download, findingKey, relevantCourts, type Analysis, type Downloaded, type Finding } from '../../lib/autoCauseList';
import { saveCauseListHits } from '../../lib/causeList';
import { todayKey } from '../../lib/dates';
import { can } from '../../lib/permissions';
import { listCases, listCauseList, listCourts } from '../../lib/repo';
import { getMode } from '../../lib/store';
import { useData } from '../../lib/useData';
import type { Case, Court } from '../../types';
import { useRole } from '../shell/RoleProvider';

const LAST_SYNC = 'lb.causelists.lastSync';
const DISMISSED = 'lb.causelists.dismissed';

/** One download shared by every page in this tab. */
let shared: { key: string; at: number; data: Downloaded } | null = null;
let inflight: { key: string; p: Promise<Downloaded> } | null = null;

function ensure(courts: string[], maxAgeMs: number, force = false): Promise<Downloaded> {
  const today = todayKey();
  const key = `${today}|${[...courts].sort().join(',')}`;
  if (!force && shared && shared.key === key && Date.now() - shared.at < maxAgeMs) return Promise.resolve(shared.data);
  if (inflight && inflight.key === key) return inflight.p;
  const p = download(courts, today).then((data) => {
    shared = { key, at: Date.now(), data };
    inflight = null;
    try {
      window.localStorage.setItem(LAST_SYNC, String(Date.now()));
    } catch {
      /* ignore */
    }
    return data;
  });
  inflight = { key, p };
  return p;
}

function readDismissed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISMISSED);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Milliseconds since the last automatic check on this device (Infinity if never). */
export function sinceLastSync(): number {
  try {
    const at = Number(window.localStorage.getItem(LAST_SYNC));
    return at ? Date.now() - at : Infinity;
  } catch {
    return Infinity;
  }
}

export interface AutoCauseLists {
  ready: boolean;
  /** Showing the demo: lists are downloaded for the status line but not matched. */
  demo: boolean;
  analysis: Analysis | null;
  download: Downloaded | null;
  cases: Case[];
  courts: Court[];
  /** Courts the chamber has live cases in. */
  relevant: string[];
  canEdit: boolean;
  /** Save a finding as confirmed: entry for its day + next date moved to that day. */
  accept: (f: Finding) => void;
  dismiss: (f: Finding) => void;
  refresh: () => void;
}

/**
 * Downloads the published cause lists for the courts the chamber practises in (at most once per `maxAgeMs`),
 * matches them on this device, and saves same-day matches automatically for members who may edit cases.
 * Never writes in the demo (that would turn the demo into a saved practice).
 */
export function useAutoCauseLists({ enabled = true, maxAgeMs = 10 * 60 * 1000 }: { enabled?: boolean; maxAgeMs?: number } = {}): AutoCauseLists {
  const { role } = useRole();
  const canEdit = can(role, 'cases.edit');
  const data = useData(async () => ({ cases: await listCases({}), causeList: await listCauseList(), courts: await listCourts(), demo: getMode() === 'demo' }));
  const [dl, setDl] = useState<Downloaded | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [tick, setTick] = useState(0);

  useEffect(() => setDismissed(readDismissed()), []);

  const relevant = useMemo(() => (data ? relevantCourts(data.cases) : []), [data]);
  const courtsKey = relevant.join(',');

  useEffect(() => {
    if (!enabled || !data) return;
    let alive = true;
    ensure(relevant, maxAgeMs, tick > 0).then((d) => {
      if (alive) setDl(d);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, courtsKey, maxAgeMs, tick, !!data]);

  const analysis = useMemo(
    // The demo's invented cases are never matched against real lists (a coincidence would look like a real finding).
    () => (dl && data ? analyse(data.demo ? [] : dl.files, data.cases, data.causeList, todayKey(), dismissed) : null),
    [dl, data, dismissed],
  );

  // Same-day matches: add court room and serial number without asking (the date itself does not change).
  useEffect(() => {
    if (!analysis || !canEdit || data?.demo) return;
    for (const g of analysis.toSave) saveCauseListHits(g.date, g.hits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, canEdit]);

  const dismiss = useCallback((f: Finding) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(findingKey(f));
      try {
        window.localStorage.setItem(DISMISSED, JSON.stringify([...next].slice(-300)));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const accept = useCallback(
    (f: Finding) => {
      if (!canEdit) return;
      saveCauseListHits(f.date, [{ ...f.hit, kind: 'matched' }]);
    },
    [canEdit],
  );

  return {
    ready: !!analysis || (!!data && !enabled),
    demo: !!data?.demo,
    analysis,
    download: dl,
    cases: data?.cases ?? [],
    courts: data?.courts ?? [],
    relevant,
    canEdit,
    accept,
    dismiss,
    refresh: () => setTick((t) => t + 1),
  };
}
