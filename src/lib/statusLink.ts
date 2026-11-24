/**
 * Pure helpers for the client status link (no network, no React).
 * The public page imports this file, so it must stay small: only the shipped courts list and date helpers.
 */
import { courts } from '../data/courts';
import { pktDateKey, todayKey } from './dates';
import type { Lang } from './i18n-dict';
import { STATUS } from './i18n-status';

/** A status token: 32 random bytes as url-safe base64 without padding (see supabase/status-links.sql). */
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const isStatusToken = (t: string | null | undefined): t is string => typeof t === 'string' && TOKEN_RE.test(t);

/** The expiry choices offered in the app. The server clamps any value to 1..90 days anyway. */
export const EXPIRY_DAYS = [7, 30, 90] as const;

export function statusUrl(token: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/status/?t=${token}`;
}

function fill(s: string, vars: Record<string, string | number>): string {
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/**
 * Courteous WhatsApp message with an English and an Urdu paragraph. `lang` decides which comes first;
 * both are always included because the client may read either.
 */
export function shareText(p: { chamberName: string; caseTitle: string; url: string; days: number }, lang: Lang): string {
  const vars = { case: p.caseTitle.trim(), chamber: p.chamberName.trim() || 'your advocate', url: p.url, days: p.days };
  const body = STATUS['status.share.body'];
  const en = fill(body.en, vars);
  const ur = fill(body.ur, { ...vars, chamber: p.chamberName.trim() || 'آپ کے وکیل' });
  return lang === 'ur' ? `${ur}\n\n${en}` : `${en}\n\n${ur}`;
}

/** Whole days from today (Pakistan time) to the day of `iso`; negative when it has passed. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const [y1, m1, d1] = todayKey(now).split('-').map(Number);
  const [y2, m2, d2] = pktDateKey(iso).split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** 'Expires in 6 days' / 'Expires today' / 'Expired' (and the Urdu equivalents). */
export function expiryLabel(expiresAt: string, lang: Lang, now: Date = new Date()): string {
  const e = STATUS;
  if (Date.parse(expiresAt) <= now.getTime()) return e['status.expiry.expired'][lang];
  const n = daysUntil(expiresAt, now);
  if (n <= 0) return e['status.expiry.today'][lang];
  if (n === 1) return e['status.expiry.tomorrow'][lang];
  return fill(e['status.expiry.days'][lang], { n });
}

/** Court name for an id from the shipped list; '' when unknown (never echo an unknown id back). */
export function courtName(courtId: string | null | undefined): string {
  return courts.find((c) => c.id === courtId)?.name ?? '';
}
