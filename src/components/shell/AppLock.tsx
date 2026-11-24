'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Delete } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  LOCK_CHANGE_EVENT,
  LOCK_KEY,
  LOCK_NOW_EVENT,
  clearLock,
  getAutoLockMinutes,
  isLockEnabled,
  lockWaitMs,
  pinLength,
  shouldLock,
  verifyPin,
} from '../../lib/appLock';
import { useLang } from '../../lib/i18n';
import { btn } from '../ui';
import { useCloud } from './CloudProvider';
import { Logo } from './Logo';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const INACTIVITY_CHECK_MS = 10_000;

/**
 * Guards the app on this device. While the lock is on and engaged, only the unlock screen is
 * rendered: `children` are not mounted at all, so no client data sits in the page.
 */
export function AppLock({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const minutes = useRef(5);
  const lastActive = useRef<number | null>(null);
  const hiddenAt = useRef<number | null>(null);

  // Before the first paint: if a PIN was set on this device, start locked.
  useIsoLayoutEffect(() => {
    const on = isLockEnabled();
    minutes.current = getAutoLockMinutes();
    lastActive.current = Date.now();
    setEnabled(on);
    setLocked(on);
  }, []);

  // The settings dialog (or another tab) changed the lock.
  useEffect(() => {
    const refresh = () => {
      const on = isLockEnabled();
      minutes.current = getAutoLockMinutes();
      setEnabled(on);
      if (!on) setLocked(false);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCK_KEY || e.key === null) refresh();
    };
    window.addEventListener(LOCK_CHANGE_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(LOCK_CHANGE_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // While the app is open and unlocked: lock when it was away too long, or idle too long.
  useEffect(() => {
    if (!enabled || locked) return;
    lastActive.current = Date.now();
    hiddenAt.current = null;
    const touch = () => {
      lastActive.current = Date.now();
    };
    const onVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = now;
        return;
      }
      const away = hiddenAt.current;
      hiddenAt.current = null;
      if (away !== null && shouldLock({ now, lastActiveAt: lastActive.current, hiddenAt: away, autoLockMinutes: minutes.current })) setLocked(true);
      else lastActive.current = now;
    };
    const idle = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (shouldLock({ now: Date.now(), lastActiveAt: lastActive.current, hiddenAt: null, autoLockMinutes: minutes.current })) setLocked(true);
    }, INACTIVITY_CHECK_MS);
    const lockNow = () => setLocked(true);
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;
    for (const ev of events) window.addEventListener(ev, touch, { passive: true, capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener(LOCK_NOW_EVENT, lockNow);
    return () => {
      for (const ev of events) window.removeEventListener(ev, touch, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener(LOCK_NOW_EVENT, lockNow);
      window.clearInterval(idle);
    };
  }, [enabled, locked]);

  if (enabled && locked) return <UnlockScreen onUnlock={() => setLocked(false)} />;
  return <>{children}</>;
}

const PAD: (string | null)[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'del'];

function UnlockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useLang();
  const cloud = useCloud();
  const reduce = useReducedMotion();
  const isCloud = cloud.enabled && cloud.view !== 'off';
  const [len] = useState(() => pinLength());
  const [digits, setDigits] = useState('');
  const [wrong, setWrong] = useState(false);
  const [shake, setShake] = useState(0);
  const [waitUntil, setWaitUntil] = useState(() => Date.now() + lockWaitMs());
  const [now, setNow] = useState(() => Date.now());
  const [forgot, setForgot] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const [working, setWorking] = useState(false);
  const digitsRef = useRef('');
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const waitLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  const waiting = waitLeft > 0;

  useEffect(() => {
    heading.current?.focus();
  }, []);

  // Count the wait down.
  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    setNow(Date.now());
    const id = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= waitUntil) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [waitUntil]);

  const submit = useCallback(
    async (pin: string) => {
      busy.current = true;
      const r = await verifyPin(pin);
      busy.current = false;
      if (r.ok) {
        onUnlock();
        return;
      }
      digitsRef.current = '';
      setDigits('');
      setShake((s) => s + 1);
      if (r.throttled) {
        setWaitUntil(Date.now() + r.waitMs);
        setWrong(false);
      } else setWrong(true);
    },
    [onUnlock],
  );

  const press = useCallback(
    (d: string) => {
      if (busy.current || forgot || Date.now() < waitUntil || digitsRef.current.length >= len) return;
      const next = digitsRef.current + d;
      digitsRef.current = next;
      setDigits(next);
      setWrong(false);
      if (next.length === len) void submit(next);
    },
    [forgot, len, submit, waitUntil],
  );
  const back = useCallback(() => {
    if (busy.current || forgot) return;
    digitsRef.current = digitsRef.current.slice(0, -1);
    setDigits(digitsRef.current);
  }, [forgot]);

  // Keyboard digits work too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, back]);

  const confirmForgot = async () => {
    setSignOutError(false);
    if (!isCloud) {
      clearLock();
      return;
    }
    setWorking(true);
    try {
      await cloud.signOut();
      clearLock();
    } catch {
      setSignOutError(true);
      setWorking(false);
    }
  };

  const message = waiting ? t('lock.wait', { s: waitLeft }) : wrong ? t('lock.wrong') : '';

  return (
    <div role="dialog" aria-modal="true" aria-label={t('lock.screen')} className="fixed inset-0 z-[100] overflow-y-auto bg-night text-ivory">
      <div className="mx-auto flex min-h-dvh w-full max-w-xs flex-col items-center justify-center gap-5 px-5 py-8">
        <Logo light />
        <div className="text-center">
          <h1 ref={heading} tabIndex={-1} className="font-serif text-2xl font-semibold outline-none">
            {forgot ? t('lock.forgotTitle') : t('lock.title')}
          </h1>
          {!forgot && <p className="mt-1 text-sm text-ivory/70">{t('lock.subtitle')}</p>}
        </div>

        {forgot ? (
          <div className="w-full space-y-4">
            <p className="text-center text-sm text-ivory/80">{t(isCloud ? 'lock.forgotBodyCloud' : 'lock.forgotBodyDemo')}</p>
            {signOutError && (
              <p role="alert" className="text-center text-sm text-bronze-soft">
                {t('lock.signOutFailed')}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <button type="button" className={`${btn.primary} !bg-danger !text-ivory h-12`} disabled={working} onClick={() => void confirmForgot()}>
                {t(isCloud ? 'lock.forgotConfirmCloud' : 'lock.forgotConfirmDemo')}
              </button>
              <button type="button" className={`${btn.ghost} h-12 !border-white/20 !bg-white/10 !text-ivory`} disabled={working} onClick={() => setForgot(false)}>
                {t('lock.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <motion.div
              key={shake}
              animate={shake && !reduce ? { x: [0, -12, 12, -8, 8, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              role="img"
              aria-label={t('lock.entered', { n: digits.length, total: len })}
              className="flex h-5 items-center gap-3"
            >
              {Array.from({ length: len }, (_, i) => (
                <span key={i} className={`h-3.5 w-3.5 rounded-full border border-ivory/60 transition-colors ${i < digits.length ? 'border-bronze-soft bg-bronze-soft' : ''}`} />
              ))}
            </motion.div>

            <div role="alert" aria-live="assertive" className="min-h-5 text-center text-sm text-bronze-soft">
              {message}
            </div>

            <div dir="ltr" className="grid w-full grid-cols-3 gap-3">
              {PAD.map((k, i) =>
                k === null ? (
                  <span key={i} aria-hidden />
                ) : (
                  <button
                    key={k}
                    type="button"
                    disabled={waiting}
                    onClick={() => (k === 'del' ? back() : press(k))}
                    aria-label={k === 'del' ? t('lock.delete') : k}
                    className="grid h-16 w-full select-none place-items-center rounded-2xl bg-white/10 text-2xl font-semibold tabular-nums text-ivory transition hover:bg-white/15 active:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze-soft disabled:opacity-40"
                  >
                    {k === 'del' ? <Delete className="h-6 w-6" aria-hidden /> : k}
                  </button>
                ),
              )}
            </div>

            <button type="button" onClick={() => setForgot(true)} className="min-h-11 px-3 text-sm text-ivory/70 underline-offset-4 hover:text-ivory hover:underline">
              {t(isCloud ? 'lock.forgotCloud' : 'lock.forgotDemo')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
