'use client';

import { ShieldCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { challengeLogin, toMfaError } from '../../lib/cloud/mfa';
import { useLang } from '../../lib/i18n';
import { btn, inputCls } from '../ui';
import { useCloud } from './CloudProvider';

const digits = (s: string) => s.replace(/\D/g, '').slice(0, 6);

/**
 * Second step of signing in: the 6-digit code from the person's authenticator app.
 * Used on the login page (after the password) and at app start (a saved session that has not passed the code yet).
 * Submits by itself once 6 digits are in.
 */
export function MfaChallenge({
  email,
  onVerified,
  onSignOut,
  verify = challengeLogin,
}: {
  email?: string;
  onVerified: () => void;
  onSignOut: () => void | Promise<void>;
  /** Checks the code; defaults to Supabase. Throws on a wrong code. */
  verify?: (code: string) => Promise<void>;
}) {
  const { t } = useLang();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const inputId = useId();
  const errId = useId();
  const tried = useRef('');

  const submit = async (c: string) => {
    if (busy || c.length !== 6) return;
    tried.current = c;
    setBusy(true);
    setError('');
    try {
      await verify(c);
      onVerified();
    } catch (e) {
      const m = toMfaError(e);
      setError(t(m.key, undefined, m.message));
      setCode('');
      setBusy(false);
      setTimeout(() => input.current?.focus(), 0);
    }
  };

  // Submit on the 6th digit (once per code, so a failed code is not re-sent).
  useEffect(() => {
    if (code.length === 6 && code !== tried.current) void submit(code);
    if (code.length < 6) tried.current = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bronze/15 text-bronze">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="font-serif text-xl font-semibold text-ink">
            {t('mfa.title')}
          </h2>
          {email && <p className="truncate text-sm text-ink-soft">{t('mfa.promptFor', { email })}</p>}
        </div>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
      >
        <label htmlFor={inputId} className="block text-sm font-medium text-ink">
          {t('mfa.prompt')}
        </label>
        <input
          ref={input}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          autoFocus
          aria-label={t('mfa.codeLabel')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          disabled={busy}
          value={code}
          onChange={(e) => setCode(digits(e.target.value))}
          placeholder="000000"
          dir="ltr"
          className={`${inputCls} h-14 text-center font-mono !text-2xl tracking-[0.4em] ${error ? '!border-danger' : ''}`}
        />
        <p id={errId} role="alert" className="min-h-5 text-sm text-danger">
          {error}
        </p>
        <button type="submit" disabled={busy || code.length !== 6} className={`${btn.primary} h-11 w-full`}>
          {busy ? t('mfa.checking') : t('mfa.verify')}
        </button>
      </form>
      <button
        type="button"
        disabled={leaving}
        onClick={async () => {
          setLeaving(true);
          try {
            await onSignOut();
          } finally {
            setLeaving(false);
          }
        }}
        className="flex min-h-11 w-full items-center justify-center rounded-lg px-3 text-sm font-medium text-bronze hover:bg-line/40"
      >
        {t('mfa.otherAccount')}
      </button>
      <p className="text-xs text-ink-soft">{t('mfa.lostPhone')}</p>
    </section>
  );
}

/** In the app: while the session still needs the code, show only the challenge (no chamber data is loaded or rendered). */
export function MfaGate({ children }: { children: React.ReactNode }) {
  const cloud = useCloud();
  if (cloud.view !== 'mfa') return <>{children}</>;
  return (
    <div className="flex min-h-dvh items-start justify-center bg-cream px-4 py-10 text-ink sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl shadow-bronze/5">
        <MfaChallenge email={cloud.email} onVerified={cloud.restart} onSignOut={cloud.signOut} />
      </div>
    </div>
  );
}
