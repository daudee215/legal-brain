'use client';

import { useEffect } from 'react';

/** Registers /sw.js (offline cache) in production builds only — never during development. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline cache is a bonus; ignore failures */
      });
    }
  }, []);
  return null;
}
