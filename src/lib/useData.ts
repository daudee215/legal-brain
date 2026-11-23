'use client';

import { useEffect, useState } from 'react';

/**
 * Loads data on the client after mount. The site is a static export, so
 * anything date-relative ("today") must be computed in the browser, not at build time.
 */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    loader().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return data;
}
