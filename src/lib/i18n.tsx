'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DICT, type Lang } from './i18n-dict';

export type { Lang } from './i18n-dict';

const KEY = 'lb.lang';

export interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate a key; unknown keys return `fallback` (or the key itself). `{name}` placeholders are filled from `vars`. */
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string;
  dir: 'ltr' | 'rtl';
}

function translate(lang: Lang, key: string, vars?: Record<string, string | number>, fallback?: string): string {
  const entry = (DICT as Record<string, { en: string; ur: string } | undefined>)[key];
  let s = entry ? entry[lang] || entry.en : (fallback ?? key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

const ENGLISH: LangCtx = {
  lang: 'en',
  setLang: () => {},
  t: (key, vars, fallback) => translate('en', key, vars, fallback),
  dir: 'ltr',
};

const Ctx = createContext<LangCtx | null>(null);

/**
 * App-only language switch. While mounted it sets <html lang/dir> to match the choice and puts
 * back the previous values on unmount, so the marketing site stays English LTR.
 */
export function LanguageProvider({ children, initialLang = 'en' }: { children: React.ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'ur') setLangState(saved);
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const prevLang = el.getAttribute('lang');
    const prevDir = el.getAttribute('dir');
    el.setAttribute('lang', lang);
    el.setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');
    return () => {
      if (prevLang === null) el.removeAttribute('lang');
      else el.setAttribute('lang', prevLang);
      if (prevDir === null) el.removeAttribute('dir');
      else el.setAttribute('dir', prevDir);
    };
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      t: (key, vars, fallback) => translate(lang, key, vars, fallback),
      dir: lang === 'ur' ? 'rtl' : 'ltr',
    }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Current language. Outside a provider (e.g. unit tests, marketing pages) this is English. */
export function useLang(): LangCtx {
  return useContext(Ctx) ?? ENGLISH;
}
