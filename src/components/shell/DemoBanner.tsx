'use client';

import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMode, subscribe } from '../../lib/store';

/** Tells the user they're looking at demo data and how to start their own practice. */
export function DemoBanner() {
  const [mode, setMode] = useState<'demo' | 'mine' | null>(null);
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
        You&apos;re exploring <b>demo data</b>. Your first edit saves a private copy on this device.{' '}
        <Link href="/app/settings/" className="font-medium text-bronze underline-offset-2 hover:underline">
          Start my own practice
        </Link>
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
        aria-label="Hide demo notice"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
