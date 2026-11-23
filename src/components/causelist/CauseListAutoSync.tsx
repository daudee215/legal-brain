'use client';

import { useEffect, useState } from 'react';
import { sinceLastSync, useAutoCauseLists } from './useAutoCauseLists';

const HOUR = 60 * 60 * 1000;

/** Quietly checks the published cause lists when the app opens — at most once an hour on this device. */
export function CauseListAutoSync() {
  const [due, setDue] = useState(false);
  useEffect(() => setDue(sinceLastSync() > HOUR), []);
  useAutoCauseLists({ enabled: due, maxAgeMs: HOUR });
  return null;
}
