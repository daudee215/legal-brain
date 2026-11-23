'use client';

import { Kanban, Plus, Rows3, X } from 'lucide-react';
import { KanbanBoard } from '../../../components/cases/KanbanBoard';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';
import { useRole } from '../../../components/shell/RoleProvider';
import { btn, DataTable, EmptyState, inputCls, PageHeader, StatusBadge } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { formatPk, pktIso } from '../../../lib/dates';
import { addCase, addClient, updateCase } from '../../../lib/mutations';
import { can } from '../../../lib/permissions';
import { listCases, listClients, listCourts, type CaseFilter } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import { CASE_CATEGORIES, CASE_STATUSES, type Case, type CaseCategory, type CaseStatus, type Client, type Court } from '../../../types';

const NEW_CLIENT = '__new';

function Tabs() {
  return (
    <div className="mb-5 flex gap-1 rounded-xl border border-line bg-paper p-1 text-sm sm:w-fit">
      <span className="flex-1 rounded-lg bg-night px-4 py-1.5 text-center text-ivory">Cases</span>
      <Link href="/app/clients/" className="flex-1 rounded-lg px-4 py-1.5 text-center hover:bg-line/50">
        Clients
      </Link>
    </div>
  );
}

function AddCaseModal({ courts, clients, onClose, onSaved }: { courts: Court[]; clients: Client[]; onClose: () => void; onSaved: (c: Case) => void }) {
  const [title, setTitle] = useState('');
  const [caseNo, setCaseNo] = useState('');
  const [category, setCategory] = useState<CaseCategory>(CASE_CATEGORIES[0]);
  const [courtId, setCourtId] = useState(courts[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [clientId, setClientId] = useState<string>(NEW_CLIENT);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    setError('');
    if (!title.trim()) return setError('Write the case title.');
    if (!courtId) return setError('Pick the court.');
    try {
      let cid = clientId === NEW_CLIENT ? '' : clientId;
      if (clientId === NEW_CLIENT && clientName.trim()) {
        const court = courts.find((x) => x.id === courtId);
        cid = addClient({ name: clientName, phone: clientPhone, city: court?.city }).id;
      }
      const c = addCase({ title, caseNo, category, courtId, clientId: cid, nextHearing: date ? pktIso(date, time || '09:00') : undefined });
      onSaved(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the case');
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-night/50 p-4" role="dialog" aria-modal="true" aria-label="Add case">
      <form
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add a case</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-line">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Case title</span>
            <input className={inputCls} placeholder="e.g. Ahmed v. The State" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Case no.</span>
            <input className={inputCls} placeholder="e.g. W.P. 1234/2026" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Category</span>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as CaseCategory)}>
              {CASE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Court</span>
            <select className={inputCls} value={courtId} onChange={(e) => setCourtId(e.target.value)} required>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Next hearing</span>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Time</span>
            <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Client</span>
            <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value={NEW_CLIENT}>New client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {clientId === NEW_CLIENT && (
            <>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Client name</span>
                <input className={inputCls} placeholder="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Client phone</span>
                <input className={inputCls} type="tel" inputMode="tel" placeholder="03xx-xxxxxxx" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
              </label>
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn.ghost}>
            Cancel
          </button>
          <button type="submit" className={btn.primary}>
            Save case
          </button>
        </div>
      </form>
    </div>
  );
}

function CasesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { role } = useRole();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [view, setViewState] = useState<'table' | 'board'>('table');
  useEffect(() => {
    try {
      if (window.localStorage.getItem('lb.casesView') === 'board') setViewState('board');
    } catch {
      /* ignore */
    }
  }, []);
  const setView = (v: 'table' | 'board') => {
    setViewState(v);
    try {
      window.localStorage.setItem('lb.casesView', v);
    } catch {
      /* ignore */
    }
  };
  const urlQ = params.get('q') ?? '';
  const [f, setF] = useState<CaseFilter>({ q: urlQ });
  useEffect(() => {
    setF((prev) => ({ ...prev, q: urlQ }));
  }, [urlQ]);

  const data = useData(async () => ({ rows: await listCases(f), courts: await listCourts(), clients: await listClients() }), [f.q, f.status, f.category, f.courtId]);

  return (
    <>
      <PageHeader
        title="Cases & Clients"
        subtitle="Every matter your chamber is handling."
        actions={
          can(role, 'cases.edit') ? (
            <button className={btn.primary} onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add case
            </button>
          ) : undefined
        }
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Tabs />
        <div className="mb-5 flex gap-1 rounded-xl border border-line bg-paper p-1 text-sm" role="group" aria-label="Case view">
          {([['table', 'Table', Rows3], ['board', 'Board', Kanban]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${view === v ? 'text-ivory' : 'text-ink-soft hover:text-ink'}`}
            >
              {view === v && <motion.span layoutId="case-view" className="absolute inset-0 rounded-lg bg-night" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className={inputCls}
          placeholder="Search title, case no., client…"
          aria-label="Search cases"
          value={f.q ?? ''}
          onChange={(e) => setF({ ...f, q: e.target.value })}
        />
        <select className={inputCls} aria-label="Status" value={f.status ?? ''} onChange={(e) => setF({ ...f, status: (e.target.value || undefined) as CaseStatus })}>
          <option value="">All statuses</option>
          {CASE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select className={inputCls} aria-label="Category" value={f.category ?? ''} onChange={(e) => setF({ ...f, category: (e.target.value || undefined) as CaseCategory })}>
          <option value="">All categories</option>
          {CASE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className={inputCls} aria-label="Court" value={f.courtId ?? ''} onChange={(e) => setF({ ...f, courtId: e.target.value || undefined })}>
          <option value="">All courts</option>
          {data?.courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {!data ? (
        <Loading />
      ) : view === 'board' ? (
        <KanbanBoard
          rows={data.rows}
          courts={data.courts}
          clients={data.clients}
          canEdit={can(role, 'cases.edit')}
          onMove={(c, to) => {
            updateCase(c.id, { status: to });
            toast.show(`Moved “${c.title}” to ${to}`);
          }}
        />
      ) : (
        <DataTable
          rows={data.rows}
          rowKey={(c) => c.id}
          empty={<EmptyState title="No matching cases" body="Try a different search or clear the filters." />}
          columns={[
            { header: 'Case no.', cell: (c) => <span className="whitespace-nowrap text-ink-soft">{c.caseNo}</span> },
            {
              header: 'Title',
              cell: (c) => (
                <div>
                  <Link href={`/app/case/?id=${c.id}`} className="font-medium hover:text-bronze">
                    {c.title}
                  </Link>
                  <p className="text-xs text-ink-soft">{data.clients.find((x) => x.id === c.clientId)?.name}</p>
                </div>
              ),
            },
            { header: 'Category', cell: (c) => c.category },
            { header: 'Court', cell: (c) => data.courts.find((x) => x.id === c.courtId)?.shortName },
            { header: 'Next hearing', cell: (c) => <span className="whitespace-nowrap">{c.nextHearing ? formatPk(c.nextHearing) : '—'}</span> },
            { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
          ]}
        />
      )}
      {adding && data && (
        <AddCaseModal
          courts={data.courts}
          clients={data.clients}
          onClose={() => setAdding(false)}
          onSaved={(c) => {
            setAdding(false);
            toast.show(`Saved “${c.title}”`);
            setTimeout(() => router.push(`/app/case/?id=${c.id}`), 700);
          }}
        />
      )}
      {toast.node}
    </>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CasesInner />
    </Suspense>
  );
}
