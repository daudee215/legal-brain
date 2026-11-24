'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, CalendarClock, ClipboardCheck, Download, ExternalLink, FileText, Gavel, Loader2, NotebookPen, Plus, UploadCloud, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { pkr } from '../../../../components/dashboard/widgets';
import { OutcomeDialog } from '../../../../components/outcome/OutcomeDialog';
import { DeadlinesForCase } from '../../../../components/deadlines/DeadlinesForCase';
import { ExpensesPanel } from '../../../../components/fees/ExpensesPanel';
import { PaymentForm } from '../../../../components/fees/PaymentForm';
import { PromisedPayments } from '../../../../components/fees/PromisedPayments';
import { hasFile, UploadBadge, useDocFile } from '../../../../components/docs/DocFiles';
import { ScanButton } from '../../../../components/docs/ScanToPdf';
import { CaseStatusButton, FeeReceiptButton, HearingPrepButton, StatusSheetLink } from '../../../../components/pdf/PdfButtons';
import { CaseCalendarButton } from '../../../../components/reminders/CalendarButtons';
import { useRole } from '../../../../components/shell/RoleProvider';
import { Badge, btn, Card, CardTitle, EmptyState, StatusBadge } from '../../../../components/ui';
import { Loading } from '../../../../components/ui/Loading';
import { useToast } from '../../../../components/ui/Toast';
import { formatPk, formatTime, pktDateKey, todayKey } from '../../../../lib/dates';
import { tooBigMessage } from '../../../../lib/cloud/storage';
import { uploadDocument } from '../../../../lib/docText';
import { can } from '../../../../lib/permissions';
import { getMode } from '../../../../lib/store';
import { getCase, getClient, getCourt, getFeeLedger, snapshot, type Snapshot } from '../../../../lib/repo';
import { useData } from '../../../../lib/useData';

type Tab = 'overview' | 'hearings' | 'documents' | 'notes' | 'fees';

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

function CaseDetailBody({ id, db }: { id: string; db: Snapshot }) {
  const { role, member } = useRole();
  const toast = useToast();
  const seeFees = can(role, 'billing');
  const canUpload = can(role, 'documents.upload');
  const files = useDocFile(toast);
  const [upBusy, setUpBusy] = useState<string | null>(null);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [paying, setPaying] = useState(false);
  const [payFor, setPayFor] = useState<{ id: string; amount: number; note: string } | null>(null);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    if (t && ['overview', 'hearings', 'documents', 'notes', 'fees'].includes(t)) setTab(t);
  }, []);

  const data = useData(async () => {
    const c = await getCase(id);
    if (!c) return { c: undefined } as const;
    return { c, court: await getCourt(c.courtId), client: await getClient(c.clientId), fee: await getFeeLedger(c.id) };
  }, [id]);

  if (!data) return <Loading />;
  const { c } = data;
  if (!c) return <EmptyState title="Case not found" action={<Link href="/app/cases/">Back to cases</Link>} />;
  const { court, client, fee } = data;
  const docs = db.docs.filter((d) => d.caseId === c.id);
  const inCloud = getMode() === 'cloud';

  async function addFiles(list: File[]) {
    setUpErr(null);
    const errors: string[] = [];
    let pending = 0;
    let done = 0;
    for (const [i, f] of list.entries()) {
      const big = tooBigMessage(f);
      if (big) {
        errors.push(big);
        continue;
      }
      const label = `${inCloud ? 'Uploading' : 'Saving'} ${f.name}${list.length > 1 ? ` (${i + 1} of ${list.length})` : ''}`;
      setUpBusy(`${label}…`);
      try {
        const r = await uploadDocument(f, { folder: 'Pleadings', caseId: id, uploadedBy: member.id }, (p) => setUpBusy(`${label} · ${Math.round(p * 100)}%`));
        done++;
        if (r.shared === 'pending') pending++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : `Could not save ${f.name}.`);
      }
    }
    setUpBusy(null);
    if (errors.length) setUpErr(errors.join(' '));
    if (done) toast.show(pending ? 'Saved on this device · not yet uploaded — will retry when online' : inCloud ? 'File shared with your chamber' : 'File saved');
  }
  const notes = db.diary.filter((d) => d.caseId === c.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const members = db.chamber.members.filter((m) => c.assignedTo.includes(m.id));
  const hearings = [...c.hearings].sort((a, b) => (a.date < b.date ? 1 : -1));
  const today = todayKey();
  const daysToNext = c.nextHearing ? daysBetween(today, pktDateKey(c.nextHearing)) : null;

  const tabs: { key: Tab; label: string; count?: number; icon: typeof Gavel }[] = [
    { key: 'overview', label: 'Overview', icon: Gavel },
    { key: 'hearings', label: 'Hearings', count: hearings.length, icon: CalendarClock },
    { key: 'documents', label: 'Documents', count: docs.length, icon: FileText },
    { key: 'notes', label: 'Notes', count: notes.length, icon: NotebookPen },
    ...(seeFees ? [{ key: 'fees' as Tab, label: 'Fees', icon: Wallet }] : []),
  ];
  const active = tabs.some((t) => t.key === tab) ? tab : 'overview';

  return (
    <div className="space-y-6">
      <Link href="/app/cases/" className="group inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> All cases
      </Link>

      <section className="relative isolate overflow-hidden rounded-3xl bg-night p-6 text-ivory shadow-xl shadow-night/20 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-bronze/25 blur-3xl" aria-hidden />
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <Badge tone="bronze">{c.category}</Badge>
          <span className="font-mono text-sm text-ivory/60">{c.caseNo}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-ivory sm:text-3xl">{c.title}</h1>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-ivory/50">Court</dt>
            <dd>{court?.name}</dd>
          </div>
          <div>
            <dt className="text-ivory/50">Judge / Bench</dt>
            <dd>{c.judge}</dd>
          </div>
          <div>
            <dt className="text-ivory/50">Stage</dt>
            <dd>{c.stage}</dd>
          </div>
          <div>
            <dt className="text-ivory/50">Next hearing</dt>
            <dd className="font-semibold text-bronze-soft">{c.nextHearing ? `${formatPk(c.nextHearing)}, ${formatTime(c.nextHearing)}` : 'Not fixed'}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {can(role, 'cases.edit') && c.status !== 'decided' && c.status !== 'disposed' && (
            <button
              onClick={() => setRecording(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-bronze px-4 py-2 text-sm font-medium text-ivory shadow-sm shadow-bronze/30 transition hover:-translate-y-0.5 hover:bg-bronze/90"
            >
              <ClipboardCheck className="h-4 w-4" /> Record outcome
            </button>
          )}
          {court && (
            <a
              href={court.statusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-ivory px-4 py-2 text-sm font-medium text-night transition hover:-translate-y-0.5"
            >
              Check status on {court.shortName} website <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {daysToNext !== null && daysToNext >= 0 && (
            <CaseCalendarButton c={c} className="inline-flex items-center gap-2 rounded-lg bg-ivory px-4 py-2 text-sm font-medium text-night transition hover:-translate-y-0.5" />
          )}
          {daysToNext !== null && daysToNext >= 0 && (
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-ivory/80">
              {daysToNext === 0 ? 'Listed today' : daysToNext === 1 ? 'Listed tomorrow' : `Listed in ${daysToNext} days`}
            </span>
          )}
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-ivory/80">
            {daysBetween(c.filedOn, today)} days since filing
          </span>
        </div>
      </section>

      <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <div role="tablist" aria-label="Case sections" className="flex w-max gap-1 rounded-xl border border-line bg-paper p-1 text-sm">
          {tabs.map((t) => {
            const Icon = t.icon;
            const on = active === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.key)}
                className={`relative inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition ${on ? 'text-ivory' : 'text-ink-soft hover:text-ink'}`}
              >
                {on && <motion.span layoutId="case-tab" className="absolute inset-0 rounded-lg bg-night" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{t.label}</span>
                {t.count !== undefined && (
                  <span className={`relative rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${on ? 'bg-white/15' : 'bg-line'}`}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div key={active} role="tabpanel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {active === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              {c.result && (
                <Card className="border-ok/40 bg-ok/5">
                  <CardTitle>Result</CardTitle>
                  <p>{c.result}</p>
                </Card>
              )}
              <Card>
                <CardTitle action={<button onClick={() => setTab('hearings')} className="text-sm text-bronze hover:underline">All hearings</button>}>Latest proceedings</CardTitle>
                {hearings[0] ? (
                  <div>
                    <p className="text-sm font-semibold">{formatPk(hearings[0].date)}</p>
                    <p className="mt-1 font-reading">{hearings[0].proceedings}</p>
                    {hearings[0].nextDate && <p className="mt-2 text-xs text-ink-soft">Adjourned to {formatPk(hearings[0].nextDate)}</p>}
                  </div>
                ) : (
                  <EmptyState title="No hearings recorded yet" />
                )}
              </Card>
              {notes[0] && (
                <Card>
                  <CardTitle action={<button onClick={() => setTab('notes')} className="text-sm text-bronze hover:underline">All notes</button>}>Latest note</CardTitle>
                  <p>{notes[0].text}</p>
                  <p className="mt-1 text-xs text-ink-soft">{formatPk(notes[0].date)}</p>
                </Card>
              )}
              <DeadlinesForCase caseId={c.id} />
            </div>
            <Card>
              <CardTitle>Client</CardTitle>
              {client ? (
                <div className="flex items-start gap-3 text-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-bronze/15 font-semibold text-bronze">
                    {client.name
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-ink-soft">{client.phone}</p>
                    <p className="text-ink-soft">
                      {client.cnicMasked} · {client.city}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-soft">No client linked.</p>
              )}
              <p className="mt-5 flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-soft">
                <Users className="h-3.5 w-3.5" /> Assigned
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <Badge key={m.id}>{m.name}</Badge>
                ))}
              </div>
              <p className="mt-5 text-xs text-ink-soft">Filed on {formatPk(c.filedOn)}</p>
              <p className="mt-5 text-xs uppercase tracking-wide text-ink-soft">Share with client</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusSheetLink caseId={c.id} />
                <CaseStatusButton caseId={c.id} className={btn.ghost} />
                <HearingPrepButton caseId={c.id} className={btn.ghost} withFee={seeFees} />
              </div>
            </Card>
          </div>
        )}

        {active === 'hearings' && (
          <Card>
            <CardTitle>Hearing history</CardTitle>
            {hearings.length === 0 ? (
              <EmptyState title="No hearings recorded yet" />
            ) : (
              <ol className="relative space-y-6 border-l-2 border-line pl-6">
                {c.nextHearing && pktDateKey(c.nextHearing) >= today && (
                  <li className="relative">
                    <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-paper bg-bronze ring-4 ring-bronze/20" />
                    <p className="text-sm font-semibold text-bronze">
                      {formatPk(c.nextHearing)} · {formatTime(c.nextHearing)} — upcoming
                    </p>
                    <p className="text-sm text-ink-soft">{c.stage}</p>
                  </li>
                )}
                {hearings.map((h, i) => (
                  <motion.li key={h.date} className="relative" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                    <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-paper bg-ink-soft" />
                    <p className="text-sm font-semibold">{formatPk(h.date)}</p>
                    <p className="font-reading text-sm">{h.proceedings}</p>
                    {h.nextDate && <p className="text-xs text-ink-soft">Next date: {formatPk(h.nextDate)}</p>}
                  </motion.li>
                ))}
              </ol>
            )}
          </Card>
        )}

        {active === 'documents' && (
          <Card>
            <CardTitle
              action={
                <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                  <ScanButton caseId={id} onSaved={toast.show} />
                  {canUpload && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-bronze hover:underline">
                      <UploadCloud className="h-4 w-4" aria-hidden /> Upload file
                      <input
                        type="file"
                        multiple
                        className="sr-only"
                        aria-label="Upload a file to this case"
                        disabled={!!upBusy}
                        onChange={(e) => {
                          void addFiles(Array.from(e.target.files ?? []));
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  <Link href="/app/documents/" className="text-sm text-bronze hover:underline">
                    Open documents
                  </Link>
                </span>
              }
            >
              Files
            </CardTitle>
            {upBusy && (
              <p className="mb-3 inline-flex items-center gap-2 text-sm text-ink-soft" role="status">
                <Loader2 className="h-4 w-4 animate-spin text-bronze" aria-hidden /> {upBusy}
              </p>
            )}
            {upErr && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{upErr}</p>}
            {docs.length === 0 ? (
              <EmptyState title="No files yet" body="Pleadings, orders and evidence for this case will appear here." />
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-bronze/40">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-bronze/10 text-bronze">
                      <FileText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.name}</span>
                      <span className="text-xs text-ink-soft">
                        {d.folder} · {d.sizeKb >= 1024 ? `${(d.sizeKb / 1024).toFixed(1)} MB` : `${d.sizeKb} KB`} · {formatPk(d.uploadedOn)}
                      </span>
                      <span className="mt-1 block empty:hidden">
                        <UploadBadge doc={d} />
                      </span>
                    </span>
                    {hasFile(d) && (
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-ink-soft transition hover:bg-line/50 hover:text-ink"
                          onClick={() => void files.open(d)}
                          aria-label={`Open ${d.name}`}
                          title="Open"
                        >
                          {files.fetching === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-ink-soft transition hover:bg-line/50 hover:text-ink"
                          onClick={() => void files.download(d)}
                          aria-label={`Download ${d.name}`}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {active === 'notes' && (
          <Card>
            <CardTitle action={<Link href="/app/diary/" className="text-sm text-bronze hover:underline">Diary</Link>}>Notes</CardTitle>
            {notes.length === 0 ? (
              <EmptyState title="No diary notes for this case" />
            ) : (
              <ul className="space-y-4">
                {notes.map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
                    <div>
                      <p>{n.text}</p>
                      <p className="text-xs text-ink-soft">
                        {formatPk(n.date)} · {db.chamber.members.find((m) => m.id === n.authorId)?.name}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {active === 'fees' && seeFees && (
          <Card>
            <CardTitle
              action={
                <button className={btn.primary} onClick={() => { setPayFor(null); setPaying((v) => !v); }} aria-expanded={paying}>
                  <Plus className="h-4 w-4" /> Record payment
                </button>
              }
            >
              Fees
            </CardTitle>
            {paying && (
              <PaymentForm
                key={payFor?.id ?? 'new'}
                caseId={c.id}
                agreed={fee?.agreed}
                initialAmount={payFor?.amount}
                initialNote={payFor?.note}
                onDone={(m) => {
                  setPaying(false);
                  setPayFor(null);
                  toast.show(m);
                }}
              />
            )}
            {!fee ? (
              <EmptyState title="No fee recorded" body="Record the fee agreed with the client to track payments against it." />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    ['Agreed', fee.agreed, ''],
                    ['Received', fee.received, 'text-ok'],
                    ['Outstanding', fee.outstanding, fee.outstanding ? 'text-danger' : 'text-ok'],
                  ].map(([label, v, cls]) => (
                    <div key={label as string} className="rounded-xl border border-line bg-cream/50 p-4">
                      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
                      <p className={`mt-1 font-serif text-2xl font-bold ${cls}`}>{pkr(v as number)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <div className="mb-1 flex justify-between text-xs text-ink-soft">
                    <span>Collected</span>
                    <span className="tabular-nums">{Math.round((fee.received / Math.max(1, fee.agreed)) * 100)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-line/60">
                    <motion.div
                      className="h-full rounded-full bg-bronze"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (fee.received / Math.max(1, fee.agreed)) * 100)}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
                <h3 className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-wide text-ink-soft">Payments</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-ink-soft">
                        <th className="py-2 font-medium">Date</th>
                        <th className="py-2 font-medium">Mode</th>
                        <th className="py-2 font-medium">Note</th>
                        <th className="py-2 text-right font-medium">Amount</th>
                        <th className="py-2 text-right font-medium"><span className="sr-only">Receipt</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fee.payments
                        .map((p, i) => ({ p, i }))
                        .sort((a, b) => (a.p.date < b.p.date ? 1 : -1))
                        .map(({ p, i }) => (
                          <tr key={i} className="border-b border-line/60">
                            <td className="whitespace-nowrap py-2.5">{formatPk(p.date)}</td>
                            <td className="py-2.5">{p.mode}</td>
                            <td className="py-2.5 text-ink-soft">{p.note ?? '—'}</td>
                            <td className="py-2.5 text-right font-medium tabular-nums">{pkr(p.amount)}</td>
                            <td className="py-2.5 pl-3 text-right">
                              <FeeReceiptButton caseId={c.id} paymentIndex={i} className="text-xs font-medium text-bronze hover:underline" />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        )}
        {active === 'fees' && seeFees && (
          <div className="mt-6">
            <PromisedPayments
              caseId={c.id}
              promises={fee?.promises}
              client={client}
              caseTitle={c.title}
              caseNo={c.caseNo}
              chamberName={db.chamber.name}
              notify={toast.show}
              onMarkReceived={(p, note) => {
                setPayFor({ id: p.id, amount: p.amount, note });
                setPaying(true);
                setTimeout(() => document.getElementById('payment-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
              }}
            />
          </div>
        )}
        {active === 'fees' && seeFees && (
          <div className="mt-6">
            <ExpensesPanel caseId={c.id} />
          </div>
        )}
      </motion.div>
      {recording && <OutcomeDialog c={c} court={court} client={client} onClose={() => setRecording(false)} />}
      {toast.node}
    </div>
  );
}

export function CaseDetail({ id }: { id: string }) {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <CaseDetailBody id={id} db={db} />;
}
