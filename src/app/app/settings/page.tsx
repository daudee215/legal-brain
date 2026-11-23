'use client';

import { CheckCircle2, Cloud, CloudOff, Database, Download, FileSpreadsheet, HardDrive, RotateCcw, Sparkles, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Badge, btn, Card, CardTitle, inputCls, PageHeader } from '../../../components/ui';
import { ConfirmDialog, type Confirm } from '../../../components/ui/ConfirmDialog';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { formatPk, formatTime } from '../../../lib/dates';
import { cellText, FIELDS, guessMapping, parseCsv, planImport, runImport, type Cell, type Field, type ImportSummary, type Mapping } from '../../../lib/importCases';
import { exportBackup, getDb, getMode, importBackup, resetToDemo, startFresh } from '../../../lib/store';
import { useData } from '../../../lib/useData';
import { cloudEnabled } from '../../../lib/cloud/client';
import { storageUsed } from '../../../lib/cloud/storage';
import { CloudSignInCard, CloudSyncCard } from './CloudCards';

function savedAt(): string | null {
  try {
    const raw = window.localStorage.getItem('lb.db.v1');
    return raw ? ((JSON.parse(raw) as { savedAt?: string }).savedAt ?? null) : null;
  } catch {
    return null;
  }
}

function downloadText(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ImportCases({ onDone }: { onDone: (m: string) => void }) {
  const [file, setFile] = useState<string>('');
  const [rows, setRows] = useState<Cell[][] | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<(ImportSummary & { skipped: number }) | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setErr('');
    setSummary(null);
    setBusy(true);
    try {
      let data: Cell[][];
      if (/\.csv$/i.test(f.name) || f.type === 'text/csv') data = parseCsv(await f.text());
      else if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import('read-excel-file/browser');
        data = (await readSheet(f)) as Cell[][];
      } else throw new Error('Choose an Excel (.xlsx) or CSV file. Old .xls files: open in Excel and “Save as” .xlsx first.');
      data = data.filter((r) => r.some((c) => cellText(c) !== ''));
      if (data.length < 2) throw new Error('The file needs a header row and at least one case.');
      setFile(f.name);
      setRows(data);
      setMapping(guessMapping(data[0].map(cellText)));
    } catch (x) {
      setErr((x as Error).message || 'Could not read that file.');
      setRows(null);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const headers = rows?.[0].map(cellText) ?? [];
  const body = rows?.slice(1) ?? [];
  const plan = rows && mapping ? planImport(body, mapping, getDb().courts) : null;

  const doImport = () => {
    if (!plan) return;
    try {
      const s = runImport(plan.rows, getDb());
      setSummary({ ...s, skipped: plan.skipped });
      setRows(null);
      setMapping(null);
      onDone(`${s.cases} cases imported`);
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <Card>
      <CardTitle>
        <span className="inline-flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-bronze" aria-hidden /> Import cases from Excel / CSV
        </span>
      </CardTitle>
      <p className="text-sm text-ink-soft">Bring in your existing case register. One row per case; the first row must be column headings. Dates like 01/12/2026 are read as day/month/year.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className={`${btn.primary} cursor-pointer`}>
          <Upload className="h-4 w-4" aria-hidden /> {busy ? 'Reading…' : 'Choose file'}
          <input ref={input} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {file && rows && <span className="text-sm text-ink-soft">{file} · {body.length} rows</span>}
      </div>
      {err && <p className="mt-3 text-sm text-danger">{err}</p>}

      {rows && mapping && plan && (
        <div className="mt-5 space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold">1. Match your columns</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FIELDS.map((f) => (
                <label key={f.id} className="text-xs text-ink-soft">
                  {f.label}
                  {f.required ? ' *' : ''}
                  <select className={`${inputCls} mt-1`} value={mapping[f.id]} onChange={(e) => setMapping({ ...mapping, [f.id as Field]: Number(e.target.value) })}>
                    <option value={-1}>— not in file —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">2. Check the first rows</h3>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-cream/60 uppercase tracking-wide text-ink-soft">
                  <tr>
                    {['Title', 'Case no.', 'Court', 'Category', 'Next hearing', 'Client'].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-3 py-2 font-medium">{r.title}</td>
                      <td className="px-3 py-2">{r.caseNo || '—'}</td>
                      <td className="px-3 py-2">{r.courtName}</td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2">{r.nextHearing ? formatPk(r.nextHearing) : '—'}</td>
                      <td className="px-3 py-2">
                        {r.clientName || '—'}
                        {r.clientPhone ? ` · ${r.clientPhone}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {plan.rows.length} case{plan.rows.length === 1 ? '' : 's'} ready{plan.skipped ? ` · ${plan.skipped} row(s) without a title will be skipped` : ''}. Courts not recognised go to the first district court — you can change them later.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className={btn.bronze} disabled={plan.rows.length === 0} onClick={doImport}>
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Import {plan.rows.length} case{plan.rows.length === 1 ? '' : 's'}
            </button>
            <button
              className={btn.ghost}
              onClick={() => {
                setRows(null);
                setMapping(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {summary && (
        <div className="mt-5 rounded-xl border border-ok/30 bg-ok/10 p-4 text-sm" role="status">
          <p className="flex items-center gap-2 font-semibold text-ok">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Import complete
          </p>
          <ul className="mt-2 space-y-0.5 text-ink">
            <li>{summary.cases} cases added</li>
            <li>{summary.newClients} new clients created</li>
            {summary.existingClients > 0 && <li>{summary.existingClients} existing clients linked</li>}
            {summary.skipped > 0 && <li>{summary.skipped} rows skipped (no title)</li>}
          </ul>
          <Link href="/app/cases/" className="mt-2 inline-block font-medium text-bronze hover:underline">
            View your cases →
          </Link>
        </div>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [err, setErr] = useState('');
  const restoreInput = useRef<HTMLInputElement>(null);
  const data = useData(async () => {
    const db = getDb();
    return { mode: getMode(), savedAt: savedAt(), cases: db.cases.length, clients: db.clients.length, chamber: db.chamber.name, storage: storageUsed(db.docs) };
  });

  if (!data) return <Loading label="Loading settings" />;
  const mine = data.mode === 'mine';
  const inCloud = data.mode === 'cloud';

  const download = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`legal-brain-backup-${stamp}.json`, exportBackup());
    toast.show('Backup downloaded');
  };

  const onRestore = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    if (restoreInput.current) restoreInput.current.value = '';
    setConfirm({
      title: 'Restore this backup?',
      body: (
        <>
          <p>
            Everything currently on this device will be replaced by <strong className="text-ink">{f.name}</strong>.
          </p>
          <p>If you have changes you want to keep, download a backup first.</p>
        </>
      ),
      confirm: 'Restore backup',
      danger: true,
      run: () => {
        try {
          importBackup(text);
          setErr('');
          toast.show('Backup restored');
        } catch (x) {
          setErr((x as Error).message);
        }
      },
    });
  };

  return (
    <>
      <PageHeader title="Data & Backup" subtitle="Where your data lives, and how to back it up." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {inCloud ? (
            <CloudSyncCard chamber={data.chamber} cases={data.cases} clients={data.clients} storageBytes={data.storage} />
          ) : (
          <Card>
            <div className="flex flex-wrap items-start gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${mine ? 'bg-ok/15 text-ok' : 'bg-bronze/15 text-bronze'}`}>
                {mine ? <HardDrive className="h-6 w-6" aria-hidden /> : <Sparkles className="h-6 w-6" aria-hidden />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{mine ? 'Your practice — saved on this device' : 'Demo practice'}</h2>
                  <Badge tone={mine ? 'ok' : 'bronze'}>{mine ? 'Saved' : 'Demo'}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {mine
                    ? data.savedAt
                      ? `Last saved ${formatPk(data.savedAt)} at ${formatTime(data.savedAt)} · ${data.cases} cases, ${data.clients} clients`
                      : `${data.cases} cases, ${data.clients} clients`
                    : 'You are exploring sample cases. Nothing is saved until you make your first change or start your own practice.'}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className={btn.bronze}
                onClick={() =>
                  setConfirm({
                    title: 'Start your own practice?',
                    body: (
                      <>
                        <p>All demo cases, clients, diary entries, fees, tasks and documents will be removed so you can enter your own.</p>
                        <p>Laws, judgments, drafting templates, courts and news stay — they are your reference library.</p>
                      </>
                    ),
                    confirm: 'Start fresh',
                    run: () => {
                      startFresh();
                      toast.show('Fresh practice ready — add your first case');
                    },
                  })
                }
              >
                <Sparkles className="h-4 w-4" aria-hidden /> Start my own practice
              </button>
              {mine && (
                <button
                  className={btn.ghost}
                  onClick={() =>
                    setConfirm({
                      title: 'Go back to the demo?',
                      body: (
                        <>
                          <p>
                            <strong className="text-danger">This deletes your saved practice from this device.</strong> It cannot be undone.
                          </p>
                          <p>Download a backup first if you may want it back.</p>
                        </>
                      ),
                      confirm: 'Delete and show demo',
                      danger: true,
                      run: () => {
                        resetToDemo();
                        toast.show('Back to the demo practice');
                      },
                    })
                  }
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Back to demo
                </button>
              )}
            </div>
          </Card>
          )}
          {!inCloud && cloudEnabled && <CloudSignInCard />}

          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Database className="h-5 w-5 text-bronze" aria-hidden /> Backup
              </span>
            </CardTitle>
            <p className="text-sm text-ink-soft">A backup is a single file with all your cases, clients, diary, fees and tasks. Keep it on a USB or in your email. (Uploaded document files are not inside it.)</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className={btn.primary} onClick={download}>
                <Download className="h-4 w-4" aria-hidden /> Download backup
              </button>
              {!inCloud && (
                <label className={`${btn.ghost} cursor-pointer`}>
                  <Upload className="h-4 w-4" aria-hidden /> Restore backup
                  <input ref={restoreInput} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => onRestore(e.target.files?.[0])} />
                </label>
              )}
            </div>
            {err && <p className="mt-3 text-sm text-danger">{err}</p>}
          </Card>

          <ImportCases onDone={toast.show} />
        </div>

        <Card className="h-fit">
          <CardTitle>Where is my data?</CardTitle>
          {inCloud ? (
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-bronze" aria-hidden />
                <p>
                  <strong>Shared with your chamber.</strong> Cases, clients, diary, tasks and uploaded documents are stored on the chamber&apos;s private server and appear on every member&apos;s devices. Fees are visible to seniors only.
                </p>
              </li>
              <li className="flex gap-3">
                <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-bronze" aria-hidden />
                <p>
                  <strong>Works offline.</strong> A copy stays on this device; changes made without internet are sent when you are back online.
                </p>
              </li>
              <li className="flex gap-3">
                <Download className="mt-0.5 h-5 w-5 shrink-0 text-bronze" aria-hidden />
                <p>
                  <strong>Your own backup</strong> is still a good habit — download one from time to time.
                </p>
              </li>
            </ul>
          ) : (
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-bronze" aria-hidden />
              <p>
                <strong>Saved privately in this browser, on this device.</strong> It is not sent to any server. Clearing your browser data, or using a different browser, will not show it.
              </p>
            </li>
            <li className="flex gap-3">
              <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-bronze" aria-hidden />
              <p>
                <strong>Not shared.</strong> {cloudEnabled ? 'Sign in to share one copy with your chamber across phones and laptops.' : 'Each device has its own copy.'}
              </p>
            </li>
            <li className="flex gap-3">
              <Download className="mt-0.5 h-5 w-5 shrink-0 text-bronze" aria-hidden />
              <p>
                <strong>Back up regularly</strong> — once a week is a good habit. Restore the file on another device to move your practice there.
              </p>
            </li>
          </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog c={confirm} onClose={() => setConfirm(null)} />
      {toast.node}
    </>
  );
}
