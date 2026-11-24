'use client';

import { Building2, Check, Download, ExternalLink, FolderOpen, Library, Lock, Palette, RotateCcw, ShieldCheck, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useDocFile } from '../../../components/docs/DocFiles';
import { RoleGate } from '../../../components/shell/RoleGate';
import { Badge, btn, Card, CardTitle, inputCls, Notice, PageHeader } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { formatBytes, PLAN_BYTES, storageUsed } from '../../../lib/cloud/storage';
import { ACCENTS, letterheadOf, resetAccess, saveProfile, saveSettings, setRoleAccess, settingsOf } from '../../../lib/chamberSettings';
import { formatPk } from '../../../lib/dates';
import { BOOK_FOLDER, removeDocument } from '../../../lib/docText';
import { ACTION_LABEL, ALL_ACTIONS, accessFor, ROLE_LABEL, SENIOR_ONLY, type Action } from '../../../lib/permissions';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import type { Accent, Role } from '../../../types';

type Tab = 'look' | 'profile' | 'access' | 'files';
const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'look', label: 'Look and feel', icon: Palette },
  { id: 'profile', label: 'Chamber profile', icon: Building2 },
  { id: 'access', label: 'Access rights', icon: ShieldCheck },
  { id: 'files', label: 'Files and storage', icon: FolderOpen },
];
const EDITABLE_ROLES: Role[] = ['junior', 'clerk'];

function Look({ accent }: { accent: Accent }) {
  const toast = useToast();
  return (
    <Card>
      <CardTitle>Colour scheme</CardTitle>
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">
        Pick the colours your whole chamber sees. It restyles every screen, in both light and dark. Each person still chooses light or dark for themselves with the moon button
        at the top.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACCENTS.map((a) => {
          const on = a.id === accent;
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                saveSettings({ accent: a.id });
                toast.show(`${a.label} colour scheme applied for everyone`);
              }}
              className={`card-fx lift rounded-2xl border p-4 text-start ${on ? 'border-bronze ring-2 ring-bronze/30' : 'border-line'} bg-paper`}
            >
              <span className="flex items-center gap-2">
                <span className="h-9 w-9 rounded-xl shadow-inner" style={{ background: `linear-gradient(135deg, ${a.light}, ${a.dark})` }} aria-hidden />
                <span className="font-serif text-lg font-semibold">{a.label}</span>
                {on && <Check className="ms-auto h-4 w-4 text-bronze" aria-label="In use" />}
              </span>
              <span className="mt-2 block text-xs text-ink-soft">{a.note}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Profile({ db }: { db: Snapshot }) {
  const toast = useToast();
  const cur = settingsOf(db)?.profile ?? {};
  const [tagline, setTagline] = useState(cur.tagline ?? '');
  const [address, setAddress] = useState(cur.address ?? '');
  const [phone, setPhone] = useState(cur.phone ?? '');
  const [email, setEmail] = useState(cur.email ?? '');
  const preview = letterheadOf({ settings: [{ id: 'main', accent: 'bronze', updatedOn: '', profile: { tagline, address, phone, email } }] });
  const field = 'block text-sm';
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardTitle>Letterhead details</CardTitle>
        <p className="mb-4 text-sm text-ink-soft">Printed at the top of fee receipts and case status reports your chamber sends to clients.</p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile({ tagline, address, phone, email });
            toast.show('Letterhead saved');
          }}
        >
          <label className={field}>
            <span className="mb-1 block font-medium">Line under the name</span>
            <input className={inputCls} value={tagline} maxLength={80} placeholder="Advocates & Legal Consultants" onChange={(e) => setTagline(e.target.value)} />
          </label>
          <label className={field}>
            <span className="mb-1 block font-medium">Address</span>
            <input className={inputCls} value={address} maxLength={120} placeholder="Office 4, Court Road, Lahore" onChange={(e) => setAddress(e.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={field}>
              <span className="mb-1 block font-medium">Phone</span>
              <input className={inputCls} value={phone} maxLength={40} placeholder="0300 1234567" onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className={field}>
              <span className="mb-1 block font-medium">Email</span>
              <input className={inputCls} type="email" value={email} maxLength={80} placeholder="chamber@example.pk" onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <button type="submit" className={btn.bronze}>
            Save letterhead
          </button>
        </form>
      </Card>
      <Card>
        <CardTitle>Preview</CardTitle>
        <div className="rounded-xl border border-line bg-white p-6 text-center text-[#2a2a2a] shadow-inner">
          <p className="font-serif text-xl font-bold">{db.chamber.name}</p>
          <p className="text-xs italic text-[#666]">{preview.tagline}</p>
          {preview.contact && <p className="mt-0.5 text-[11px] text-[#666]">{preview.contact}</p>}
          <div className="mx-auto my-3 h-px bg-bronze" />
          <p className="font-serif text-sm font-bold tracking-wide">FEE RECEIPT</p>
        </div>
      </Card>
    </div>
  );
}

function Access() {
  const toast = useToast();
  const [, force] = useState(0);
  const sets: Record<Role, ReadonlySet<Action>> = { senior: accessFor('senior'), junior: accessFor('junior'), clerk: accessFor('clerk') };

  const toggle = (role: Role, action: Action) => {
    const cur = new Set(sets[role]);
    if (cur.has(action)) cur.delete(action);
    else cur.add(action);
    setRoleAccess(role, ALL_ACTIONS.filter((a) => cur.has(a)));
    force((n) => n + 1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>What each role can do</CardTitle>
        <p className="mb-5 max-w-2xl text-sm text-ink-soft">
          Tick what your juniors and clerks are allowed to do. Changes reach everyone the next time their app syncs. You, as senior advocate, always keep full access.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-sm">
            <thead>
              <tr className="text-start text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 text-start font-medium">Right</th>
                <th className="py-2 text-center font-medium">{ROLE_LABEL.senior}</th>
                {EDITABLE_ROLES.map((r) => (
                  <th key={r} className="py-2 text-center font-medium">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_ACTIONS.map((a) => {
                const locked = SENIOR_ONLY.includes(a);
                return (
                  <tr key={a} className="border-t border-line">
                    <td className="py-3 pe-3">
                      <span className="block font-medium">{ACTION_LABEL[a].title}</span>
                      <span className="block text-xs text-ink-soft">{ACTION_LABEL[a].hint}</span>
                    </td>
                    <td className="py-3 text-center">
                      <Check className="mx-auto h-4 w-4 text-ok" aria-label="Senior always has this" />
                    </td>
                    {EDITABLE_ROLES.map((r) => (
                      <td key={r} className="py-3 text-center">
                        {locked ? (
                          <Lock className="mx-auto h-4 w-4 text-ink-soft/50" aria-label="Only the senior advocate" />
                        ) : (
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--bronze)]"
                            checked={sets[r].has(a)}
                            onChange={() => toggle(r, a)}
                            aria-label={`${ROLE_LABEL[r]}: ${ACTION_LABEL[a].title}`}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            className={btn.ghost}
            onClick={() => {
              resetAccess();
              force((n) => n + 1);
              toast.show('Access rights set back to the defaults');
            }}
          >
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </button>
          <Link href="/app/chamber/" className={btn.ghost}>
            <Users className="h-4 w-4" /> Invite people or change someone&apos;s role
          </Link>
        </div>
      </Card>
      <Notice>
        These rights control what each person sees and can do in the app. Fees and billing files are also protected on the server for everyone except seniors. A clerk who is
        technically skilled could still change other shared data outside the app, so only add people you trust to the chamber.
      </Notice>
    </div>
  );
}

function Files({ db }: { db: Snapshot }) {
  const toast = useToast();
  const { open, download } = useDocFile(toast);
  const used = storageUsed(db.docs);
  const pct = Math.min(100, Math.round((used / PLAN_BYTES) * 100));
  const folders = [...new Set(db.docs.map((d) => d.folder))].sort();
  const biggest = [...db.docs].sort((a, b) => (b.size ?? b.sizeKb * 1024) - (a.size ?? a.sizeKb * 1024)).slice(0, 8);

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Storage</CardTitle>
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span>
            <strong className="font-serif text-2xl">{formatBytes(used)}</strong> shared with your chamber
          </span>
          <span className="text-ink-soft">of {formatBytes(PLAN_BYTES)}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-line/60" role="img" aria-label={`${pct}% of storage used`}>
          <div className="h-full rounded-full bg-bronze" style={{ width: `${Math.max(pct, used ? 2 : 0)}%` }} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/app/documents/" className={btn.bronze}>
            <FolderOpen className="h-4 w-4" /> Upload PDFs and files
          </Link>
          <Link href="/app/library/" className={btn.ghost}>
            <Library className="h-4 w-4" /> Upload law books
          </Link>
        </div>
      </Card>
      <Card>
        <CardTitle>By folder</CardTitle>
        {folders.length === 0 ? (
          <p className="text-sm text-ink-soft">No files uploaded yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {folders.map((f) => (
              <li key={f}>
                <Badge tone={f === BOOK_FOLDER ? 'bronze' : 'neutral'}>
                  {f}: {db.docs.filter((d) => d.folder === f).length}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {biggest.length > 0 && (
        <Card>
          <CardTitle>Largest files</CardTitle>
          <ul className="divide-y divide-line">
            {biggest.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{d.name}</span>
                  <span className="text-xs text-ink-soft">
                    {d.folder} · {formatBytes(d.size ?? d.sizeKb * 1024)} · {formatPk(d.uploadedOn)}
                  </span>
                </span>
                <button className="rounded-lg p-1.5 text-ink-soft hover:bg-line/50 hover:text-ink" aria-label={`Open ${d.name}`} onClick={() => void open(d)}>
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-1.5 text-ink-soft hover:bg-line/50 hover:text-ink" aria-label={`Download ${d.name}`} onClick={() => void download(d)}>
                  <Download className="h-4 w-4" />
                </button>
                {d.folder !== BOOK_FOLDER && (
                  <button
                    className="rounded-lg p-1.5 text-ink-soft hover:bg-danger/10 hover:text-danger"
                    aria-label={`Delete ${d.name}`}
                    onClick={async () => {
                      if (!window.confirm(`Delete "${d.name}" for everyone in your chamber? This cannot be undone.`)) return;
                      await removeDocument(d);
                      toast.show('File deleted');
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StudioBody({ db }: { db: Snapshot }) {
  const [tab, setTab] = useState<Tab>('look');
  const accent = settingsOf(db)?.accent ?? 'bronze';
  return (
    <RoleGate action="studio">
      <PageHeader title="Chamber Studio" subtitle="Colours, who can do what, and your files — set up once for the whole chamber." />
      <div role="tablist" aria-label="Studio sections" className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              tab === id ? 'border-bronze bg-bronze text-ivory shadow-sm' : 'border-line bg-paper text-ink hover:border-bronze/40'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      {tab === 'look' && <Look accent={accent} />}
      {tab === 'profile' && <Profile db={db} />}
      {tab === 'access' && <Access />}
      {tab === 'files' && <Files db={db} />}
    </RoleGate>
  );
}

export default function StudioPage() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <StudioBody db={db} />;
}
