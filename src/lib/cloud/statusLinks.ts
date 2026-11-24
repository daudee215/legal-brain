/**
 * Client status links (supabase/status-links.sql).
 * create / revoke / list run as the signed-in member. getCaseStatus is used by the public /status/ page:
 * it runs on a separate client that never reads or stores a login, and it never throws — every failure
 * comes back as 'invalid' or 'network', with no server text passed on.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isStatusToken } from '../statusLink';
import { cloudEnabled, supabase, supabaseKey, supabaseUrl } from './client';

export interface StatusLink {
  token: string;
  case_id: string;
  label: string;
  created_at: string;
  expires_at: string;
  show_last_note: boolean;
}

/** Exactly what the public page may show. */
export interface PublicCaseStatus {
  chamberName: string;
  caseTitle: string;
  caseNo: string;
  courtId: string;
  stage: string;
  status: 'pending' | 'adjourned' | 'reserved' | 'decided' | 'disposed' | null;
  nextHearing: string | null;
  lastHearing?: { date: string; proceedings: string };
}

export type StatusResult = { ok: true; status: PublicCaseStatus } | { ok: false; reason: 'invalid' | 'network' };

function check<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}

export async function createStatusLink(chamberId: string, caseId: string, opts: { days: number; showLastNote: boolean; label?: string }): Promise<string> {
  const token = check(
    await supabase().rpc('create_status_link', {
      p_chamber: chamberId,
      p_case_id: caseId,
      p_days: Math.round(opts.days),
      p_show_last_note: opts.showLastNote,
      p_label: (opts.label ?? '').trim().slice(0, 80),
    }),
  );
  if (!isStatusToken(String(token))) throw new Error('The server did not return a link.');
  return String(token);
}

export async function revokeStatusLink(token: string): Promise<void> {
  check(await supabase().rpc('revoke_status_link', { p_token: token }));
}

export async function listStatusLinks(chamberId: string, caseId: string): Promise<StatusLink[]> {
  return ((check(await supabase().rpc('list_status_links', { p_chamber: chamberId, p_case_id: caseId })) ?? []) as StatusLink[]).filter((l) => isStatusToken(l.token));
}

/** What went wrong, in the dialog's terms. */
export function statusLinkProblem(e: unknown): 'forbidden' | 'notSetUp' | 'error' {
  const m = String((e as { message?: string })?.message ?? e);
  const code = (e as { code?: string })?.code;
  if (code === '42501' || /forbidden/i.test(m)) return 'forbidden';
  if (code === 'PGRST202' || /Could not find the function/i.test(m)) return 'notSetUp';
  return 'error';
}

// ── Public reader ──────────────────────────────────────────────────────────────
let anon: SupabaseClient | null = null;
function anonClient(): SupabaseClient {
  if (!anon) {
    anon = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'lb.status' },
    });
  }
  return anon;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const STATUSES = ['pending', 'adjourned', 'reserved', 'decided', 'disposed'] as const;

/** Keep only the known fields, as plain strings — anything else the server might send is dropped. */
export function pickPublicStatus(raw: unknown): PublicCaseStatus | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const status = STATUSES.find((s) => s === r.status) ?? null;
  const out: PublicCaseStatus = {
    chamberName: str(r.chamberName, 120),
    caseTitle: str(r.caseTitle, 300),
    caseNo: str(r.caseNo, 120),
    courtId: str(r.courtId, 60),
    stage: str(r.stage, 120),
    status,
    nextHearing: str(r.nextHearing, 40) || null,
  };
  if (out.nextHearing && Number.isNaN(Date.parse(out.nextHearing))) out.nextHearing = null;
  const lh = r.lastHearing as Record<string, unknown> | undefined;
  if (lh && typeof lh === 'object' && !Array.isArray(lh) && str(lh.date, 40) && !Number.isNaN(Date.parse(str(lh.date, 40)))) {
    out.lastHearing = { date: str(lh.date, 40), proceedings: str(lh.proceedings, 1500) };
  }
  return out;
}

export async function getCaseStatus(token: string): Promise<StatusResult> {
  if (!cloudEnabled || !isStatusToken(token)) return { ok: false, reason: 'invalid' };
  try {
    const { data, error } = await anonClient().rpc('get_case_status', { p_token: token });
    if (error) {
      const m = String(error.message ?? '');
      return { ok: false, reason: /Failed to fetch|NetworkError|network|timeout/i.test(m) ? 'network' : 'invalid' };
    }
    const status = pickPublicStatus(data);
    return status ? { ok: true, status } : { ok: false, reason: 'invalid' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
