'use client';

import { AlertTriangle, CheckCircle2, ShieldCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { conflictCheck } from '../../lib/conflicts';
import { getDb } from '../../lib/store';
import { useData } from '../../lib/useData';
import { Badge, Card, inputCls } from '../ui';

/** Type a prospective client or opposite party; see where the name already appears. */
export function ConflictCheck() {
  const [name, setName] = useState('');
  const q = useDeferredValue(name);
  const db = useData(async () => getDb());
  const res = db && q.trim() ? conflictCheck(q, db) : null;
  const total = res ? res.clients.length + res.parties.length : 0;
  const opposing = res?.parties.filter((p) => p.opposing).length ?? 0;

  return (
    <Card className="mb-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-bronze" aria-hidden />
        <h2 className="text-lg font-semibold">Conflict check</h2>
      </div>
      <p className="mt-1 text-sm text-ink-soft">Before taking a new matter, check whether the client or the other side already appears in your files.</p>
      <input
        className={`${inputCls} mt-3 sm:max-w-md`}
        placeholder="Name of person or company…"
        aria-label="Name to check for conflicts"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {res && (
        <div className="mt-4" aria-live="polite">
          {total === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> No match for “{q.trim()}” in your clients or case titles.
            </p>
          ) : (
            <>
              <p className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${opposing ? 'border border-danger/30 bg-danger/10 text-danger' : 'border border-bronze/30 bg-bronze/10 text-ink'}`}>
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                {total} match{total === 1 ? '' : 'es'} found{opposing ? ` — ${opposing} against one of your clients` : ''}. Review before accepting.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {res.clients.map(({ client, cases }) => (
                  <li key={client.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2">
                    <UserRound className="h-4 w-4 text-bronze" aria-hidden />
                    <span className="font-medium">{client.name}</span>
                    <Badge tone="bronze">Existing client</Badge>
                    <span className="text-ink-soft">
                      {cases.length} case{cases.length === 1 ? '' : 's'}
                      {client.phone ? ` · ${client.phone}` : ''}
                    </span>
                  </li>
                ))}
                {res.parties.map((p) => (
                  <li key={`${p.case.id}-${p.side}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2">
                    <span className="font-medium">{p.party}</span>
                    <Badge tone={p.side === 'petitioner' ? 'neutral' : 'ink'}>{p.side === 'petitioner' ? 'Petitioner / plaintiff side' : 'Respondent / defendant side'}</Badge>
                    {p.opposing ? <Badge tone="danger">Against your client</Badge> : p.ourClient ? <Badge tone="ok">Same side as your client</Badge> : null}
                    <span className="w-full text-ink-soft sm:w-auto">
                      in{' '}
                      <Link href={`/app/case/?id=${p.case.id}`} className="underline-offset-2 hover:text-bronze hover:underline">
                        {p.case.title}
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

export default ConflictCheck;
