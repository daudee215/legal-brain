'use client';

import { MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Card, EmptyState, inputCls, PageHeader, StatusBadge } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { listCases, listClients } from '../../../lib/repo';
import { searchItems } from '../../../lib/search';
import { useData } from '../../../lib/useData';

export default function ClientsPage() {
  const [q, setQ] = useState('');
  const data = useData(async () => ({ clients: await listClients(), cases: await listCases() }));

  const rows = data ? searchItems(data.clients, q, (c) => [c.name, c.city, c.phone]) : [];

  return (
    <>
      <PageHeader title="Cases & Clients" subtitle="Everyone your chamber represents." />
      <div className="mb-5 flex gap-1 rounded-xl border border-line bg-paper p-1 text-sm sm:w-fit">
        <Link href="/app/cases/" className="flex-1 rounded-lg px-4 py-1.5 text-center hover:bg-line/50">
          Cases
        </Link>
        <span className="flex-1 rounded-lg bg-night px-4 py-1.5 text-center text-ivory">Clients</span>
      </div>
      <input className={`${inputCls} mb-5 sm:max-w-sm`} placeholder="Search clients…" aria-label="Search clients" value={q} onChange={(e) => setQ(e.target.value)} />
      {!data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title="No matching clients" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((cl) => {
            const cs = data.cases.filter((c) => c.clientId === cl.id);
            return (
              <Card key={cl.id}>
                <p className="font-serif text-lg font-semibold">{cl.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                  <Phone className="h-3.5 w-3.5" /> {cl.phone}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-ink-soft">
                  <MapPin className="h-3.5 w-3.5" /> {cl.city} · {cl.cnicMasked}
                </p>
                <ul className="mt-4 space-y-2 border-t border-line pt-3">
                  {cs.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
                      <Link href={`/app/cases/${c.id}/`} className="min-w-0 hover:text-bronze">
                        {c.title}
                      </Link>
                      <StatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
