'use client';

import { useEffect, useState } from 'react';
import { subscribe } from './store';

/**
 * Loads data on the client after mount, and reloads whenever the practice data changes
 * (an edit on this page, another page, or another tab). The site is a static export, so
 * anything date-relative ("today") must be computed in the browser, not at build time.
 */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []): T | null {
  const [data, setData] = useState<T | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => subscribe(() => setVersion((v) => v + 1)), []);
  useEffect(() => {
    let alive = true;
    loader().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  return data;
}
