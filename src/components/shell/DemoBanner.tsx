'use client';

import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cloudEnabled } from '../../lib/cloud/client';
import { useLang } from '../../lib/i18n';
import { getMode, subscribe, type Mode } from '../../lib/store';

/** Tells the user they're looking at demo data and how to start their own practice. */
export function DemoBanner() {
  const { t } = useLang();
  const [mode, setMode] = useState<Mode | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setMode(getMode());
    try {
      setHidden(window.sessionStorage.getItem('lb.demoBanner') === 'off');
    } catch {
      /* ignore */
    }
    return subscribe(() => setMode(getMode()));
  }, []);
  if (mode !== 'demo' || hidden) return null;
  return (
    <div className="flex items-center gap-3 border-b border-bronze/25 bg-bronze/10 px-4 py-2 text-sm text-ink lg:px-8">
      <Sparkles className="h-4 w-4 shrink-0 text-bronze" aria-hidden />
      <p className="min-w-0 flex-1">
        {t('demo.text')}{' '}
        <Link href="/app/settings/" className="font-medium text-bronze underline-offset-2 hover:underline">
          {t('demo.start')}
        </Link>
        {cloudEnabled && (
          <>
            {' '}
            {t('demo.or')}{' '}
            <Link href="/signup/" className="font-medium text-bronze underline-offset-2 hover:underline">
              {t('demo.shared')}
            </Link>
          </>
        )}
      </p>
      <button
        onClick={() => {
          setHidden(true);
          try {
            window.sessionStorage.setItem('lb.demoBanner', 'off');
          } catch {
            /* ignore */
          }
        }}
        className="rounded p-1 text-ink-soft hover:bg-bronze/10"
        aria-label={t('demo.hide')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
