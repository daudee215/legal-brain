'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'lb.theme';

interface ThemeCtx {
  pref: ThemePref;
  resolved: 'light' | 'dark';
  setPref: (p: ThemePref) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function systemDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/**
 * Dark mode for the app only: the class is put on <html> while the app is mounted (so portalled
 * overlays inherit it) and removed on unmount, so the marketing pages always stay light.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [sysDark, setSysDark] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') setPrefState(saved);
    } catch {
      /* storage unavailable */
    }
    setSysDark(systemDark());
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq?.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);

  const resolved: 'light' | 'dark' = pref === 'system' ? (sysDark ? 'dark' : 'light') : pref;

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle('dark', resolved === 'dark');
    return () => el.classList.remove('dark');
  }, [resolved]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      window.localStorage.setItem(KEY, p);
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = useCallback(() => setPref(resolved === 'dark' ? 'light' : 'dark'), [resolved, setPref]);

  const value = useMemo(() => ({ pref, resolved, setPref, toggle }), [pref, resolved, setPref, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside <ThemeProvider>');
  return v;
}
