'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue } from 'react';
import { conflictCheck, splitTitle, tokens, type ConflictResult } from '../../lib/conflicts';
import { useLang } from '../../lib/i18n';
import { getDb } from '../../lib/store';
import { useData } from '../../lib/useData';

const MIN_LEN = 3;
const MAX_SHOWN = 3;
/** Government parties appear on almost every title; flagging them would be noise. */
const GENERIC = new Set(['state', 'government', 'govt', 'punjab', 'sindh', 'pakistan', 'federation', 'province']);

interface Item {
  key: string;
  kind: 'client' | 'party';
  opposing: boolean;
  name: string;
  caseId?: string;
  caseTitle?: string;
}

function collect(queries: string[], db: ReturnType<typeof getDb>, ignoreClientId?: string): Item[] {
  const items = new Map<string, Item>();
  for (const q of queries) {
    const tk = tokens(q);
    if (q.trim().length < MIN_LEN || tk.length === 0 || tk.every((t) => GENERIC.has(t))) continue;
    const res: ConflictResult = conflictCheck(q, db);
    for (const { client, cases } of res.clients) {
      if (client.id === ignoreClientId) continue;
      const first = cases[0];
      items.set(`c:${client.id}`, { key: `c:${client.id}`, kind: 'client', opposing: false, name: client.name, caseId: first?.id, caseTitle: first?.title });
    }
    for (const p of res.parties) {
      // A name that is simply the selected client's own side of their own case is not news.
      if (ignoreClientId && p.ourClient?.id === ignoreClientId && !p.opposing) continue;
      if (!p.opposing && p.ourClient && res.clients.some((h) => h.client.id === p.ourClient?.id)) continue;
      const key = `p:${p.case.id}:${p.side}`;
      items.set(key, { key, kind: 'party', opposing: p.opposing, name: p.party, caseId: p.case.id, caseTitle: p.case.title });
    }
  }
  return [...items.values()].sort((a, b) => Number(b.opposing) - Number(a.opposing));
}

/**
 * Inline, non-blocking conflict warning for the add-case / add-client forms. Pass the client name
 * in `names` and/or the case title in `title` ('X v. Y' is split into its two sides). Renders
 * nothing for new or very short names, and never prevents saving.
 */
export function ConflictHint({ names = [], title = '', ignoreClientId }: { names?: string[]; title?: string; ignoreClientId?: string }) {
  const { t } = useLang();
  const deferred = useDeferredValue(JSON.stringify([names, title]));
  const db = useData(async () => getDb());
  if (!db) return null;
  const [dNames, dTitle] = JSON.parse(deferred) as [string[], string];
  const queries = [...dNames, ...(dTitle.trim() ? splitTitle(dTitle) : [])];
  const items = collect(queries, db, ignoreClientId);
  if (items.length === 0) return null;
  const shown = items.slice(0, MAX_SHOWN);

  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-bronze/40 bg-bronze/10 px-3 py-2 text-sm text-ink sm:col-span-2">
      <p className="flex items-start gap-2 font-medium">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bronze" aria-hidden />
        <span>{t('conflict.heading')}</span>
      </p>
      <ul className="mt-1.5 space-y-1 ps-6">
        {shown.map((it) => (
          <li key={it.key} className={it.opposing ? 'font-semibold' : undefined}>
            {it.kind === 'client'
              ? t(it.caseId ? 'conflict.clientCase' : 'conflict.client', { name: it.name })
              : t(it.opposing ? 'conflict.opposing' : 'conflict.party', { name: it.name })}{' '}
            {it.caseId && (
              <Link href={`/app/case/?id=${it.caseId}`} className="underline underline-offset-2 hover:text-bronze">
                {it.caseTitle}
              </Link>
            )}
          </li>
        ))}
      </ul>
      {items.length > shown.length && <p className="mt-1 ps-6 text-ink-soft">{t('conflict.more', { n: items.length - shown.length })}</p>}
      <p className="mt-1.5 ps-6 text-xs text-ink-soft">{t('conflict.note')}</p>
    </div>
  );
}

export default ConflictHint;
