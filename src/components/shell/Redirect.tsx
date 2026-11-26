'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loading } from '../ui/Loading';

/** A page that moved: send old links and bookmarks to its new place. */
export function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return <Loading />;
}

/** The `?tab=` of the current address, read after load (static pages have no server to read it). */
export function tabFromUrl<T extends string>(allowed: readonly T[]): T | null {
  try {
    const v = new URLSearchParams(window.location.search).get('tab');
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
  } catch {
    return null;
  }
}
