'use client';

import { AlertTriangle, Check, Copy, ShieldCheck, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cancelEnrol, confirmEnrol, disableTotp, listTotpFactors, startEnrol, toMfaError, type Enrolment, type TotpFactor } from '../../lib/cloud/mfa';
import { useLang } from '../../lib/i18n';
import { btn, inputCls } from '../ui';

type Step = 'loading' | 'failed' | 'off' | 'setup' | 'done' | 'on' | 'disable';

const digits = (s: string) => s.replace(/\D/g, '').slice(0, 6);
/** "JBSWY3DPEHPK3PXP" -> "JBSW Y3DP EHPK 3PXP" (easier to type into a phone). */
const groupKey = (s: string) => s.replace(/(.{4})/g, '$1 ').trim();

function CodeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        autoFocus
        dir="ltr"
        placeholder="000000"
        value={value}
        onChange={(e) => onChange(digits(e.target.value))}
        className={`${inputCls} h-12 text-center font-mono !text-xl tracking-[0.4em]`}
      />
    </div>
  );
}

/** Dialog to turn two-step sign-in (authenticator app) on or off. Opened from the account menu; cloud accounts only. */
export function TwoStepSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useLang();
  const [step, setStep] = useState<Step>('loading');
  const [factor, setFactor] = useState<TotpFactor | null>(null);
  const [enrol, setEnrol] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const titleId = useId();
  const pending = useRef<string | null>(null);

  const showErr = (e: unknown) => {
    const m = toMfaError(e);
    setError(t(m.key, undefined, m.message));
  };

  const load = async () => {
    setStep('loading');
    setError('');
    try {
      const f = (await listTotpFactors())[0] ?? null;
      setFactor(f);
      setStep(f ? 'on' : 'off');
    } catch {
      setError(t('mfa.errLoad'));
      setStep('failed');
    }
  };

  // A setup that was started but not confirmed is thrown away.
  const dropPending = () => {
    if (pending.current) void cancelEnrol(pending.current);
    pending.current = null;
  };

  const close = () => {
    dropPending();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    setEnrol(null);
    setCode('');
    setBusy(false);
    setCopied(false);
    setNotice('');
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const begin = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const e = await startEnrol();
      pending.current = e.factorId;
      setEnrol(e);
      setCode('');
      setStep('setup');
    } catch (x) {
      showErr(x);
    }
    setBusy(false);
  };

  const confirm = async () => {
    if (!enrol) return;
    setBusy(true);
    setError('');
    try {
      await confirmEnrol(enrol.factorId, code);
      pending.current = null;
      setStep('done');
    } catch (x) {
      showErr(x);
      setCode('');
    }
    setBusy(false);
  };

  const turnOff = async () => {
    if (!factor) return;
    setBusy(true);
    setError('');
    try {
      await disableTotp(factor.id, code);
      setFactor(null);
      setCode('');
      setNotice(t('mfa.turnedOff'));
      setStep('off');
    } catch (x) {
      showErr(x);
      setCode('');
    }
    setBusy(false);
  };

  const copyKey = async () => {
    if (!enrol) return;
    try {
      await navigator.clipboard.writeText(enrol.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the key is on screen to copy by hand */
    }
  };

  const since = factor?.createdAt
    ? new Date(factor.createdAt).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const errorNode = (
    <p role="alert" className="min-h-5 text-sm text-danger">
      {error}
    </p>
  );

  const keyBox = enrol && (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-cream/60 p-2">
      <code dir="ltr" className="min-w-0 flex-1 select-all break-all px-1 font-mono text-sm text-ink">
        {groupKey(enrol.secret)}
      </code>
      <button type="button" onClick={() => void copyKey()} className={`${btn.ghost} h-11 shrink-0`} aria-label={t('mfa.copy')}>
        {copied ? <Check className="h-4 w-4 text-bronze" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        <span className="hidden sm:inline">{copied ? t('mfa.copied') : t('mfa.copy')}</span>
      </button>
    </div>
  );

  let body: React.ReactNode;
  if (step === 'loading') body = <p className="text-sm text-ink-soft">{t('mfa.loading')}</p>;
  else if (step === 'failed')
    body = (
      <div className="space-y-3">
        {errorNode}
        <button type="button" className={`${btn.ghost} h-11 w-full`} onClick={() => void load()}>
          {t('mfa.retry')}
        </button>
      </div>
    );
  else if (step === 'off')
    body = (
      <div className="space-y-4">
        {notice && (
          <p role="status" className="rounded-lg bg-cream/70 px-3 py-2 text-sm text-ink">
            {notice}
          </p>
        )}
        <p className="text-sm text-ink-soft">{t('mfa.intro')}</p>
        {errorNode}
        <button type="button" className={`${btn.bronze} h-11 w-full`} disabled={busy} onClick={() => void begin()}>
          {busy ? t('mfa.starting') : t('mfa.setUp')}
        </button>
      </div>
    );
  else if (step === 'setup' && enrol)
    body = (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void confirm();
        }}
      >
        <p className="text-sm text-ink">{t('mfa.step1')}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrol.qr} alt={t('mfa.qrAlt')} width={192} height={192} className="mx-auto h-48 w-48 rounded-lg bg-white p-2" />
        <div className="space-y-1">
          <p className="text-sm text-ink-soft">{t('mfa.cantScan')}</p>
          {keyBox}
        </div>
        <CodeField label={t('mfa.step2')} value={code} onChange={setCode} />
        {errorNode}
        <div className="flex gap-2">
          <button
            type="button"
            className={`${btn.ghost} h-11 flex-1`}
            onClick={() => {
              dropPending();
              setEnrol(null);
              setError('');
              setStep('off');
            }}
          >
            {t('mfa.cancel')}
          </button>
          <button type="submit" className={`${btn.bronze} h-11 flex-1`} disabled={busy || code.length !== 6}>
            {busy ? t('mfa.checking') : t('mfa.turnOn')}
          </button>
        </div>
      </form>
    );
  else if (step === 'done')
    body = (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-base font-semibold text-ink" role="status">
          <Check className="h-5 w-5 text-bronze" aria-hidden /> {t('mfa.turnedOn')}
        </p>
        <p className="text-sm text-ink-soft">{t('mfa.turnedOnBody')}</p>
        {keyBox}
        <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
          <span>{t('mfa.warning')}</span>
        </p>
        <button type="button" className={`${btn.primary} h-11 w-full`} onClick={onClose}>
          {t('mfa.done')}
        </button>
      </div>
    );
  else if (step === 'on')
    body = (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          {t('mfa.onBody')} {since && t('mfa.onSince', { date: since })}
        </p>
        <button
          type="button"
          className={`${btn.ghost} h-11 w-full !text-danger`}
          onClick={() => {
            setCode('');
            setError('');
            setStep('disable');
          }}
        >
          {t('mfa.turnOff')}
        </button>
      </div>
    );
  else if (step === 'disable')
    body = (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void turnOff();
        }}
      >
        <p className="text-sm text-ink-soft">{t('mfa.turnOffHint')}</p>
        <CodeField label={t('mfa.codeLabel')} value={code} onChange={setCode} />
        {errorNode}
        <div className="flex gap-2">
          <button
            type="button"
            className={`${btn.ghost} h-11 flex-1`}
            onClick={() => {
              setError('');
              setStep('on');
            }}
          >
            {t('mfa.back')}
          </button>
          <button type="submit" className={`${btn.primary} h-11 flex-1 !bg-danger`} disabled={busy || code.length !== 6}>
            {busy ? t('mfa.checking') : t('mfa.turnOff')}
          </button>
        </div>
      </form>
    );

  const isOn = step === 'on' || step === 'disable' || step === 'done';

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-night/50 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 text-ink shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 font-serif text-xl font-semibold">
            <ShieldCheck className="h-5 w-5 text-bronze" aria-hidden /> {t('mfa.menu')}
          </h2>
          <button type="button" onClick={close} aria-label={t('mfa.close')} className="-m-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-line/50">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {step !== 'loading' && step !== 'failed' && (
          <p className="mb-4 mt-1 text-sm font-medium text-ink">{isOn ? t('mfa.statusOn') : t('mfa.statusOff')}</p>
        )}
        <div className={step === 'loading' || step === 'failed' ? 'mt-4' : ''}>{body}</div>
      </div>
    </div>,
    document.body,
  );
}
