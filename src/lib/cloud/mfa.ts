/**
 * Two-step sign-in (TOTP authenticator app) on top of Supabase Auth MFA.
 * Optional per person: someone who never turns it on stays at aal1 with nextLevel aal1 and nothing changes for them.
 *
 * Errors are thrown as `MfaError`: `key` is an i18n key (`mfa.err*`, or '' for messages we pass through) and
 * `message` is the English text, so callers can show `t(e.key, undefined, e.message)`.
 */
import { friendlyError, supabase } from './client';

export interface TotpFactor {
  id: string;
  name: string;
  createdAt: string;
}

export interface Enrolment {
  factorId: string;
  /** Ready to use as an <img src>: a data:image/svg+xml URL of the QR code. */
  qr: string;
  /** The same secret as text, for people who cannot scan. */
  secret: string;
  /** otpauth:// link encoded in the QR. */
  uri: string;
}

export class MfaError extends Error {
  constructor(
    readonly key: string,
    message: string,
  ) {
    super(message);
    this.name = 'MfaError';
  }
}

const ISSUER = 'Legal Brain';
export const CODE_RE = /^\d{6}$/;
export const isTotpCode = (s: string) => CODE_RE.test(s.trim());

export const MFA_ERR = {
  code: "That code is not right or has expired. Check your phone's clock.",
  format: 'Enter the 6 digits shown in your authenticator app.',
  disabled: 'Two-step sign-in is not switched on for this app yet. Ask the app owner.',
  rate: 'Too many tries. Please wait a few minutes and try again.',
  network: 'No internet connection. Connect and try again.',
  noFactor: 'Two-step sign-in is not set up on this account.',
};

/** Map a Supabase auth error to something a lawyer can act on. */
export function toMfaError(e: unknown): MfaError {
  if (e instanceof MfaError) return e;
  const err = e as { code?: string; message?: string; status?: number };
  const code = err?.code ?? '';
  const m = err?.message ?? String(e);
  if (/mfa_verification_failed|mfa_challenge_expired|mfa_verification_rejected/.test(code) || /invalid totp|invalid code|challenge.*expired|expired.*challenge/i.test(m))
    return new MfaError('mfa.errCode', MFA_ERR.code);
  if (/mfa_.*not_enabled/.test(code) || /enroll is disabled|verification is disabled|mfa.*disabled/i.test(m)) return new MfaError('mfa.errDisabled', MFA_ERR.disabled);
  if (code === 'over_request_rate_limit' || err?.status === 429 || /rate limit|too many/i.test(m)) return new MfaError('mfa.errRate', MFA_ERR.rate);
  if (/Failed to fetch|NetworkError|network/i.test(m)) return new MfaError('mfa.errNetwork', MFA_ERR.network);
  return new MfaError('', friendlyError(e));
}

function need<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw toMfaError(r.error);
  if (r.data === null) throw new MfaError('', 'Something went wrong. Please try again.');
  return r.data;
}

function checkCode(code: string): string {
  const c = code.trim();
  if (!CODE_RE.test(c)) throw new MfaError('mfa.errFormat', MFA_ERR.format);
  return c;
}

/** Verified authenticator-app factors on this account (empty when two-step sign-in is off). */
export async function listTotpFactors(): Promise<TotpFactor[]> {
  const data = need(await supabase().auth.mfa.listFactors());
  return (data.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name ?? '', createdAt: f.created_at }));
}

/** Begin setting up an authenticator app. Clears any half-finished setup left from earlier first. */
export async function startEnrol(): Promise<Enrolment> {
  const mfa = supabase().auth.mfa;
  const all = need(await mfa.listFactors()).all ?? [];
  for (const f of all) {
    if (f.factor_type === 'totp' && f.status !== 'verified') await mfa.unenroll({ factorId: f.id }).catch(() => undefined);
  }
  const data = need(await mfa.enroll({ factorType: 'totp', issuer: ISSUER }));
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri };
}

/** Finish setup with the first code from the app. On success the factor is live and this session is aal2. */
export async function confirmEnrol(factorId: string, code: string): Promise<void> {
  const c = checkCode(code);
  const mfa = supabase().auth.mfa;
  const ch = need(await mfa.challenge({ factorId }));
  need(await mfa.verify({ factorId, challengeId: ch.id, code: c }));
}

/** Abandon a setup that was not confirmed (best effort; a leftover unverified factor does nothing). */
export async function cancelEnrol(factorId: string): Promise<void> {
  await supabase()
    .auth.mfa.unenroll({ factorId })
    .catch(() => undefined);
}

/** Turn two-step sign-in off. Needs a fresh, valid code first (that also lifts the session to aal2, which unenrol requires). */
export async function disableTotp(factorId: string, code: string): Promise<void> {
  const c = checkCode(code);
  const mfa = supabase().auth.mfa;
  need(await mfa.challengeAndVerify({ factorId, code: c }));
  need(await mfa.unenroll({ factorId }));
}

/** Current and next assurance level of this session (read from the saved session, works offline). */
export async function aal(): Promise<{ current: string | null; next: string | null }> {
  const data = need(await supabase().auth.mfa.getAuthenticatorAssuranceLevel());
  return { current: data.currentLevel, next: data.nextLevel };
}

/** True when this person has two-step sign-in on and has not entered a code in this session yet. */
export async function needsMfa(): Promise<boolean> {
  const a = await aal();
  return a.current === 'aal1' && a.next === 'aal2';
}

/** Second step of signing in: check the code against the account's authenticator app. */
export async function challengeLogin(code: string): Promise<void> {
  const c = checkCode(code);
  const factors = await listTotpFactors();
  if (!factors.length) throw new MfaError('mfa.errNoFactor', MFA_ERR.noFactor);
  let last: unknown;
  // Normally one factor; if there are several, any of them may match.
  for (const f of factors) {
    const r = await supabase().auth.mfa.challengeAndVerify({ factorId: f.id, code: c });
    if (!r.error) return;
    last = r.error;
  }
  throw toMfaError(last);
}
