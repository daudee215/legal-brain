import { pktIso } from './dates';
import { updateDb } from './store';

/** 'HH:MM' of a PKT instant, or the 09:00 default when the case has no time yet. */
export function hearingTimeOf(iso?: string): string {
  const m = iso?.match(/T(\d{2}:\d{2})/);
  return m && iso?.endsWith('+05:00') ? m[1] : '09:00';
}

/** The ISO instant for `dayKey` that keeps the case's existing time of day (else 09:00). */
export function nextHearingIso(dayKey: string, current?: string): string {
  return pktIso(dayKey, hearingTimeOf(current));
}

/** Set a case's next hearing to `dayKey`, keeping its time of day. Returns false when the case is not found. */
export function setNextHearing(caseId: string, dayKey: string): boolean {
  let ok = false;
  updateDb((db) => {
    const c = db.cases.find((x) => x.id === caseId);
    if (!c) return;
    c.nextHearing = nextHearingIso(dayKey, c.nextHearing);
    ok = true;
  });
  return ok;
}
