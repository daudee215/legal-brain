'use client';

import { Lock, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AUTO_LOCK_CHOICES,
  LOCK_CHANGE_EVENT,
  PIN_MAX,
  PIN_MIN,
  clearLock,
  getAutoLockMinutes,
  isLockEnabled,
  isValidPin,
  lockNow,
  setAutoLockMinutes,
  setPin,
  verifyPin,
} from '../../lib/appLock';
import { useLang } from '../../lib/i18n';
import { btn, inputCls } from '../ui';
import { useToast } from '../ui/Toast';

type Step = 'main' | 'change' | 'off';

const digitsOnly = (s: string) => s.replace(/\D/g, '').slice(0, PIN_MAX);

function PinField({ label, value, onChange, autoFocus }: { label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]*"
        maxLength={PIN_MAX}
        minLength={PIN_MIN}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        className={`${inputCls} h-12 text-center text-lg tracking-[0.5em]`}
      />
    </div>
  );
}

/** Dialog to turn the app lock on, change the PIN or the auto-lock time, or turn it off. Opened from the account menu. */
export function AppLockSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [auto, setAuto] = useState(5);
  const [step, setStep] = useState<Step>('main');
  const [current, setCurrent] = useState('');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const autoId = useId();

  const refresh = () => {
    setEnabled(isLockEnabled());
    setAuto(getAutoLockMinutes());
  };
  const reset = () => {
    setStep('main');
    setCurrent('');
    setPin1('');
    setPin2('');
    setError('');
    setBusy(false);
  };

  useEffect(() => {
    if (!open) return;
    refresh();
    reset();
    window.addEventListener(LOCK_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(LOCK_CHANGE_EVENT, refresh);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  const checkCurrent = async (): Promise<boolean> => {
    const r = await verifyPin(current);
    if (r.ok) return true;
    setError(r.throttled ? t('lock.wait', { s: Math.ceil(r.waitMs / 1000) }) : t('lock.errCurrent'));
    setCurrent('');
    return false;
  };

  const checkNew = (): boolean => {
    if (!isValidPin(pin1)) {
      setError(t('lock.errFormat'));
      return false;
    }
    if (pin1 !== pin2) {
      setError(t('lock.errMismatch'));
      return false;
    }
    return true;
  };

  const turnOn = async () => {
    setError('');
    if (!checkNew()) return;
    setBusy(true);
    try {
      if (await setPin(pin1, { autoLockMinutes: auto })) {
        toast.show(t('lock.toastOn'));
        onClose();
      } else setError(t('lock.errStorage'));
    } catch {
      setError(t('lock.errStorage'));
    }
    setBusy(false);
  };

  const changePin = async () => {
    setError('');
    if (!checkNew()) return;
    setBusy(true);
    if (!(await checkCurrent())) return setBusy(false);
    try {
      if (await setPin(pin1)) {
        toast.show(t('lock.toastChanged'));
        onClose();
      } else setError(t('lock.errStorage'));
    } catch {
      setError(t('lock.errStorage'));
    }
    setBusy(false);
  };

  const turnOff = async () => {
    setError('');
    setBusy(true);
    if (!(await checkCurrent())) return setBusy(false);
    clearLock();
    toast.show(t('lock.toastOff'));
    onClose();
    setBusy(false);
  };

  const onAuto = (v: number) => {
    setAuto(v);
    if (enabled && setAutoLockMinutes(v)) toast.show(t('lock.toastSaved'));
  };

  const autoSelect = (
    <div>
      <label htmlFor={autoId} className="mb-1 block text-sm font-medium text-ink">
        {t('lock.autoLabel')}
      </label>
      <select id={autoId} value={auto} onChange={(e) => onAuto(Number(e.target.value))} className={`${inputCls} h-12`}>
        {AUTO_LOCK_CHOICES.map((m) => (
          <option key={m} value={m}>
            {t(`lock.after${m}`)}
          </option>
        ))}
      </select>
    </div>
  );

  const errorNode = (
    <p role="alert" className="min-h-5 text-sm text-danger">
      {error}
    </p>
  );

  const body = !enabled ? (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void turnOn();
      }}
    >
      <PinField label={t('lock.newPin')} value={pin1} onChange={setPin1} autoFocus />
      <PinField label={t('lock.again')} value={pin2} onChange={setPin2} />
      {autoSelect}
      {errorNode}
      <button type="submit" className={`${btn.bronze} h-11 w-full`} disabled={busy}>
        {t('lock.turnOn')}
      </button>
    </form>
  ) : step === 'change' ? (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void changePin();
      }}
    >
      <PinField label={t('lock.current')} value={current} onChange={setCurrent} autoFocus />
      <PinField label={t('lock.newPinChange')} value={pin1} onChange={setPin1} />
      <PinField label={t('lock.again')} value={pin2} onChange={setPin2} />
      {errorNode}
      <div className="flex gap-2">
        <button type="button" className={`${btn.ghost} h-11 flex-1`} onClick={reset}>
          {t('lock.back')}
        </button>
        <button type="submit" className={`${btn.bronze} h-11 flex-1`} disabled={busy}>
          {t('lock.save')}
        </button>
      </div>
    </form>
  ) : step === 'off' ? (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void turnOff();
      }}
    >
      <p className="text-sm text-ink-soft">{t('lock.turnOffHint')}</p>
      <PinField label={t('lock.current')} value={current} onChange={setCurrent} autoFocus />
      {errorNode}
      <div className="flex gap-2">
        <button type="button" className={`${btn.ghost} h-11 flex-1`} onClick={reset}>
          {t('lock.back')}
        </button>
        <button type="submit" className={`${btn.primary} h-11 flex-1 !bg-danger`} disabled={busy}>
          {t('lock.turnOff')}
        </button>
      </div>
    </form>
  ) : (
    <div className="space-y-4">
      {autoSelect}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={`${btn.bronze} h-11`}
          onClick={() => {
            onClose();
            lockNow();
          }}
        >
          {t('lock.lockNow')}
        </button>
        <button type="button" className={`${btn.ghost} h-11`} onClick={() => setStep('change')}>
          {t('lock.change')}
        </button>
        <button type="button" className={`${btn.ghost} h-11 !text-danger`} onClick={() => setStep('off')}>
          {t('lock.turnOff')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-night/50 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 text-ink shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h2 id={titleId} className="flex items-center gap-2 font-serif text-xl font-semibold">
                  <Lock className="h-5 w-5 text-bronze" aria-hidden /> {t('lock.settingsTitle')}
                </h2>
                <button type="button" onClick={onClose} aria-label={t('lock.close')} className="-m-2 grid h-11 w-11 place-items-center rounded-lg text-ink-soft hover:bg-line/50">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <p className="mt-1 text-sm font-medium text-ink" role="status">
                {enabled ? t('lock.statusOn') : t('lock.statusOff')}
              </p>
              {!enabled && <p className="mb-4 mt-1 text-sm text-ink-soft">{t('lock.intro')}</p>}
              <div className={enabled ? 'mt-4' : ''}>{body}</div>
            </div>
          </div>,
          document.body,
        )}
      {toast.node && typeof document !== 'undefined' && createPortal(toast.node, document.body)}
    </>
  );
}
