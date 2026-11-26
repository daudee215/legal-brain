'use client';

import { Bell, Building2, History, Check, Download, ExternalLink, FolderOpen, Library, Lock, Palette, RotateCcw, ShieldCheck, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useDocFile } from '../../../components/docs/DocFiles';
import { Badge, btn, Card, CardTitle, inputCls, Notice } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { sendMyDigest } from '../../../lib/cloud/chamber';
import { getSyncStatus } from '../../../lib/cloud/sync';
import { useRole } from '../../../components/shell/RoleProvider';
import { formatBytes, PLAN_BYTES, storageUsed } from '../../../lib/cloud/storage';
import { ACCENTS, letterheadOf, logoFromFile, resetAccess, saveProfile, saveSettings, setEmailReminders, setLogo, setMemberAccess, setRoleAccess, settingsOf } from '../../../lib/chamberSettings';
import { formatPk } from '../../../lib/dates';
import { BOOK_FOLDER, removeDocument } from '../../../lib/docText';
import { ACTION_LABEL, ALL_ACTIONS, accessFor, accessOf, ROLE_LABEL, SENIOR_ONLY, type Action } from '../../../lib/permissions';
import { listMembers, snapshot, type Snapshot } from '../../../lib/repo';
import { backupSummaryText, lineText, type ActivityRow, type BackupRow } from '../../../lib/activityText';
import { listActivity, listBackups, restoreBackup, takeBackupNow } from '../../../lib/cloud/safety';
import { useLang } from '../../../lib/i18n';
import { useData } from '../../../lib/useData';
import type { Accent, Member, Role } from '../../../types';

type Tab = 'look' | 'profile' | 'access' | 'reminders' | 'safety' | 'files';
const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'look', label: 'Look and feel', icon: Palette },
  { id: 'profile', label: 'Chamber profile', icon: Building2 },
  { id: 'access', label: 'Access rights', icon: ShieldCheck },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'safety', label: 'Safety', icon: History },
  { id: 'files', label: 'Files and storage', icon: FolderOpen },
];
const EDITABLE_ROLES: Role[] = ['junior', 'clerk'];

function Look({ accent, solo }: { accent: Accent; solo: boolean }) {
  const toast = useToast();
  const { t } = useLang();
  return (
    <Card>
      <CardTitle>{t('studio.look.title', undefined, 'Colour scheme')}</CardTitle>
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">
        {solo
          ? t('studio.look.introSolo', undefined, 'Pick your colours. It restyles every screen, in both light and dark. Choose light or dark with the moon button at the top.')
          : t('studio.look.intro', undefined, "Pick the colours your whole chamber sees. It restyles every screen, in both light and dark. Each person still chooses light or dark for themselves with the moon button at the top.")}
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
                toast.show(
                  solo
                    ? t('studio.look.appliedSolo', { name: t(`studio.accent.${a.id}`, undefined, a.label) }, `${a.label} colour scheme applied`)
                    : t('studio.look.applied', { name: t(`studio.accent.${a.id}`, undefined, a.label) }, `${a.label} colour scheme applied for everyone`),
                );
              }}
              className={`card-fx lift rounded-2xl border p-4 text-start ${on ? 'border-bronze ring-2 ring-bronze/30' : 'border-line'} bg-paper`}
            >
              <span className="flex items-center gap-2">
                <span className="h-9 w-9 rounded-xl shadow-inner" style={{ background: `linear-gradient(135deg, ${a.light}, ${a.dark})` }} aria-hidden />
                <span className="font-serif text-lg font-semibold">{t(`studio.accent.${a.id}`, undefined, a.label)}</span>
                {on && <Check className="ms-auto h-4 w-4 text-bronze" aria-label={t('studio.inUse', undefined, 'In use')} />}
              </span>
              <span className="mt-2 block text-xs text-ink-soft">{t(`studio.accent.${a.id}.note`, undefined, a.note)}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Profile({ db, solo = false }: { db: Snapshot; solo?: boolean }) {
  const toast = useToast();
  const { t } = useLang();
  const cur = settingsOf(db)?.profile ?? {};
  const [tagline, setTagline] = useState(cur.tagline ?? '');
  const [address, setAddress] = useState(cur.address ?? '');
  const [phone, setPhone] = useState(cur.phone ?? '');
  const [email, setEmail] = useState(cur.email ?? '');
  const logo = cur.logo;
  const preview = letterheadOf({ settings: [{ id: 'main', accent: 'bronze', updatedOn: '', profile: { tagline, address, phone, email } }] });
  const field = 'block text-sm';
  // A solo advocate has no chamber: it is their own logo and letterhead.
  const logoLabel = solo ? t('studio.logo.yours', undefined, 'Your logo') : t('studio.logo.alt', undefined, 'Chamber logo');
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardTitle>{solo ? t('studio.profile.letterheadSolo', undefined, 'Your logo & letterhead') : t('studio.profile.letterhead', undefined, 'Letterhead details')}</CardTitle>
        <p className="mb-4 text-sm text-ink-soft">{solo
            ? t('studio.profile.introSolo', undefined, 'Printed at the top of the fee receipts and case status reports you send to clients.')
            : t('studio.profile.intro', undefined, "Printed at the top of fee receipts and case status reports your chamber sends to clients.")}</p>
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-paper p-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={logoLabel} className="max-h-full max-w-full object-contain" />
            ) : (
              <Building2 className="h-6 w-6 text-ink-soft/50" aria-hidden />
            )}
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-medium">{logoLabel}</span>
            <span className="block text-xs text-ink-soft">{t('studio.logo.help', undefined, "A PNG or JPEG picture. It is shrunk to fit and printed at the top of receipts and case reports.")}</span>
          </span>
          <label className={`${btn.ghost} cursor-pointer`}>
            {logo ? t('studio.logo.change', undefined, 'Change logo') : t('studio.logo.upload', undefined, 'Upload logo')}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-label={solo ? t('studio.logo.uploadAriaSolo', undefined, 'Upload your logo') : t('studio.logo.uploadAria', undefined, 'Upload chamber logo')}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  setLogo(await logoFromFile(f));
                  toast.show(t('studio.logo.saved', undefined, 'Logo saved'));
                } catch (err) {
                  toast.show(err instanceof Error ? err.message : t('studio.logo.unreadable', undefined, 'That picture could not be read'));
                }
              }}
            />
          </label>
          {logo && (
            <button
              type="button"
              className={btn.ghost}
              onClick={() => {
                setLogo(null);
                toast.show(t('studio.logo.removed', undefined, 'Logo removed'));
              }}
            >
              {t('studio.remove', undefined, 'Remove')}
            </button>
          )}
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile({ tagline, address, phone, email });
            toast.show(t('studio.profile.saved', undefined, 'Letterhead saved'));
          }}
        >
          <label className={field}>
            <span className="mb-1 block font-medium">{t('studio.profile.tagline', undefined, 'Line under the name')}</span>
            <input className={inputCls} value={tagline} maxLength={80} placeholder="Advocates & Legal Consultants" onChange={(e) => setTagline(e.target.value)} />
          </label>
          <label className={field}>
            <span className="mb-1 block font-medium">{t('studio.profile.address', undefined, 'Address')}</span>
            <input className={inputCls} value={address} maxLength={120} placeholder="Office 4, Court Road, Lahore" onChange={(e) => setAddress(e.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={field}>
              <span className="mb-1 block font-medium">{t('studio.profile.phone', undefined, 'Phone')}</span>
              <input className={inputCls} value={phone} maxLength={40} placeholder="0300 1234567" onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className={field}>
              <span className="mb-1 block font-medium">{t('studio.profile.email', undefined, 'Email')}</span>
              <input className={inputCls} type="email" value={email} maxLength={80} placeholder={solo ? 'you@example.pk' : 'chamber@example.pk'} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <button type="submit" className={btn.bronze}>
            {t('studio.profile.save', undefined, 'Save letterhead')}
          </button>
        </form>
      </Card>
      <Card>
        <CardTitle>{t('studio.profile.preview', undefined, 'Preview')}</CardTitle>
        <div className="rounded-xl border border-line bg-white p-6 text-center text-[#2a2a2a] shadow-inner">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="mx-auto mb-2 max-h-12 max-w-[160px] object-contain" />
          )}
          <p className="font-serif text-xl font-bold">{db.chamber.name}</p>
          <p className="text-xs italic text-[#666]">{preview.tagline}</p>
          {preview.contact && <p className="mt-0.5 text-[11px] text-[#666]">{preview.contact}</p>}
          <div className="mx-auto my-3 h-px bg-bronze" />
          <p className="font-serif text-sm font-bold tracking-wide">{t('studio.profile.feeReceipt', undefined, 'FEE RECEIPT')}</p>
        </div>
      </Card>
    </div>
  );
}

function People({ db }: { db: Snapshot }) {
  const toast = useToast();
  const { t } = useLang();
  const members = useData(() => listMembers());
  const [open, setOpen] = useState<string | null>(null);
  const settings = settingsOf(db);
  const others = (members ?? []).filter((m: Member) => m.role !== 'senior');
  if (!members) return null;
  return (
    <Card>
      <CardTitle>{t('studio.people.title', undefined, 'Rights for one person')}</CardTitle>
      <p className="mb-4 max-w-2xl text-sm text-ink-soft">
        {t('studio.people.intro', undefined, 'Need a clerk who can also edit cases, or a junior who must not see the law books? Give that one person their own rights. It replaces their role\'s rights for them alone; everyone else keeps following their role.')}
      </p>
      {others.length === 0 ? (
        <p className="text-sm text-ink-soft">{t('studio.people.none', undefined, 'Nobody else has joined your chamber yet. Invite people from the Chamber page.')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {others.map((m: Member) => {
            const own = settings?.memberAccess?.[m.id];
            const eff = accessOf(m.role, settings?.access, own);
            const isOpen = open === m.id;
            return (
              <li key={m.id} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.name || m.email}</span>
                    <span className="text-xs text-ink-soft">{t(`role.${m.role}`, undefined, ROLE_LABEL[m.role])}</span>
                  </span>
                  {own ? <Badge tone="bronze">{t('studio.people.own', undefined, 'Own rights')}</Badge> : <Badge tone="neutral">{t('studio.people.follows', undefined, 'Follows role')}</Badge>}
                  <button className={btn.ghost} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.id)}>
                    {isOpen ? t('studio.people.close', undefined, 'Close') : t('studio.people.set', undefined, 'Set rights')}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3 rounded-xl border border-line bg-paper p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ALL_ACTIONS.filter((a) => !SENIOR_ONLY.includes(a)).map((a) => (
                        <label key={a} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-[var(--bronze)]"
                            checked={eff.has(a)}
                            aria-label={`${m.name || m.email}: ${t(`studio.act.${a}.title`, undefined, ACTION_LABEL[a].title)}`}
                            onChange={() => {
                              const next = new Set(eff);
                              if (next.has(a)) next.delete(a);
                              else next.add(a);
                              setMemberAccess(m.id, ALL_ACTIONS.filter((x) => next.has(x)));
                            }}
                          />
                          <span>
                            <span className="block font-medium">{t(`studio.act.${a}.title`, undefined, ACTION_LABEL[a].title)}</span>
                            <span className="block text-xs text-ink-soft">{t(`studio.act.${a}.hint`, undefined, ACTION_LABEL[a].hint)}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {own && (
                      <button
                        className={`${btn.ghost} mt-4`}
                        onClick={() => {
                          setMemberAccess(m.id, null);
                          toast.show(t('studio.people.nowFollows', { name: m.name || m.email, role: t(`role.${m.role}`, undefined, ROLE_LABEL[m.role]) }, `${m.name || m.email} now follows the ${ROLE_LABEL[m.role]} rights`));
                        }}
                      >
                        <RotateCcw className="h-4 w-4" /> {t('studio.people.back', { role: t(`role.${m.role}`, undefined, ROLE_LABEL[m.role]) }, `Back to the ${ROLE_LABEL[m.role]} rights`)}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Access({ db }: { db: Snapshot }) {
  const toast = useToast();
  const { t } = useLang();
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
        <CardTitle>{t('studio.access.title', undefined, 'What each role can do')}</CardTitle>
        <p className="mb-5 max-w-2xl text-sm text-ink-soft">
          {t('studio.access.intro', undefined, "Tick what your juniors and clerks are allowed to do. Changes reach everyone the next time their app syncs. You, as senior advocate, always keep full access.")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-sm">
            <thead>
              <tr className="text-start text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 text-start font-medium">{t('studio.access.right', undefined, 'Right')}</th>
                <th className="py-2 text-center font-medium">{t('role.senior', undefined, ROLE_LABEL.senior)}</th>
                {EDITABLE_ROLES.map((r) => (
                  <th key={r} className="py-2 text-center font-medium">
                    {t(`role.${r}`, undefined, ROLE_LABEL[r])}
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
                      <span className="block font-medium">{t(`studio.act.${a}.title`, undefined, ACTION_LABEL[a].title)}</span>
                      <span className="block text-xs text-ink-soft">{t(`studio.act.${a}.hint`, undefined, ACTION_LABEL[a].hint)}</span>
                    </td>
                    <td className="py-3 text-center">
                      <Check className="mx-auto h-4 w-4 text-ok" aria-label={t('studio.access.seniorAlways', undefined, 'Senior always has this')} />
                    </td>
                    {EDITABLE_ROLES.map((r) => (
                      <td key={r} className="py-3 text-center">
                        {locked ? (
                          <Lock className="mx-auto h-4 w-4 text-ink-soft/50" aria-label={t('studio.access.seniorOnly', undefined, 'Only the senior advocate')} />
                        ) : (
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--bronze)]"
                            checked={sets[r].has(a)}
                            onChange={() => toggle(r, a)}
                            aria-label={`${t(`role.${r}`, undefined, ROLE_LABEL[r])}: ${t(`studio.act.${a}.title`, undefined, ACTION_LABEL[a].title)}`}
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
              toast.show(t('studio.access.resetDone', undefined, 'Access rights set back to the defaults'));
            }}
          >
            <RotateCcw className="h-4 w-4" /> {t('studio.access.reset', undefined, 'Reset to defaults')}
          </button>
          <Link href="/app/chamber/" className={btn.ghost}>
            <Users className="h-4 w-4" /> {t('studio.access.invite', undefined, "Invite people or change someone's role")}
          </Link>
        </div>
      </Card>
      <People db={db} />
      <Notice>
        {t('studio.access.note', undefined, "These rights control what each person sees and can do in the app. Fees and billing files are also protected on the server for everyone except seniors, and the other shared data is checked on the server against each person's rights. Only add people you trust to the chamber.")}
      </Notice>
    </div>
  );
}

function Reminders({ db }: { db: Snapshot }) {
  const toast = useToast();
  const { t } = useLang();
  const { cloud, plan } = useRole();
  const solo = plan === 'solo';
  const [busy, setBusy] = useState(false);
  const on = settingsOf(db)?.emailReminders === true;
  const test = async () => {
    const id = getSyncStatus().chamberId;
    if (!id) return;
    setBusy(true);
    try {
      const r = await sendMyDigest(id);
      toast.show(
        r === 'sent'
          ? t('studio.rem.sent', undefined, 'Test email sent to you. Check your inbox (and spam).')
          : r === 'nothing'
            ? t('studio.rem.nothing', undefined, 'No hearings today or tomorrow, so there was nothing to email.')
            : t('studio.rem.nokey', undefined, 'Email is not switched on at the server yet.'),
      );
    } catch (e) {
      toast.show(e instanceof Error ? e.message : t('studio.rem.fail', undefined, 'Could not send the test email'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>{t('studio.rem.title', undefined, 'Morning hearing emails')}</CardTitle>
        <p className="mb-4 max-w-2xl text-sm text-ink-soft">
          {solo
            ? t('studio.rem.introSolo', undefined, 'Every morning at 7:30 (Pakistan time) you get one email listing your hearings today and tomorrow, even if you never open the app. No hearings, no email.')
            : t('studio.rem.intro', undefined, "Every morning at 7:30 (Pakistan time) each member of your chamber gets one email listing the hearings today and tomorrow, even if they never open the app. No hearings, no email.")}
        </p>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-[var(--bronze)]" checked={on} onChange={(e) => setEmailReminders(e.target.checked)} aria-label={t('studio.rem.aria', undefined, 'Send morning hearing emails')} />
          {solo ? t('studio.rem.labelSolo', undefined, 'Send me morning hearing emails') : t('studio.rem.label', undefined, 'Send morning hearing emails to the whole chamber')}
        </label>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className={btn.ghost} disabled={!cloud || busy} onClick={() => void test()}>
            <Bell className="h-4 w-4" /> {busy ? t('studio.rem.sending', undefined, 'Sending…') : t('studio.rem.now', undefined, "Email me today's hearings now")}
          </button>
          {!cloud && <span className="text-xs text-ink-soft">{solo ? t('studio.rem.needCloudSolo', undefined, 'Available once you are signed in to your account.') : t('studio.rem.needCloud', undefined, 'Available once you are signed in to your shared chamber.')}</span>}
        </div>
      </Card>
      <Notice>
        {solo
          ? t('studio.rem.noteSolo', undefined, 'Emails go to the address you signed up with. They are sent from reminders@wakeelpropk.com.')
          : t('studio.rem.note', undefined, 'Emails go to the address each person signed up with. They are sent from reminders@wakeelpropk.com.')}
      </Notice>
    </div>
  );
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

function Safety() {
  const toast = useToast();
  const { t } = useLang();
  const { cloud, plan } = useRole();
  const solo = plan === 'solo';
  const [backups, setBackups] = useState<BackupRow[] | null>(null);
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = getSyncStatus().chamberId;
    if (!id) return;
    try {
      const [b, a] = await Promise.all([listBackups(id), listActivity(id)]);
      setBackups(b);
      setActivity(a);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    if (cloud) void load();
  }, [cloud, load]);

  if (!cloud)
    return (
      <Notice>
        {solo
          ? t('studio.safe.needCloudSolo', undefined, 'Restore points and the activity log are available once you are signed in to your account.')
          : t('studio.safe.needCloud', undefined, 'Restore points and the activity log are available once you are signed in to your shared chamber.')}
      </Notice>
    );

  const saveNow = async () => {
    const id = getSyncStatus().chamberId;
    if (!id) return;
    setBusy('save');
    try {
      const n = await takeBackupNow(id);
      toast.show(n > 0 ? t('studio.safe.saved', undefined, 'Restore point saved') : t('studio.safe.unchanged', undefined, 'Nothing changed since the last restore point'));
      await load();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : t('studio.safe.error', undefined, 'Could not load this yet.'));
    } finally {
      setBusy(null);
    }
  };
  const restore = async (b: BackupRow) => {
    if (!window.confirm(solo
          ? t('studio.safe.confirmSolo', { when: stamp(b.taken_at) }, 'Put your practice back to ' + stamp(b.taken_at) + '?')
          : t('studio.safe.confirm', { when: stamp(b.taken_at) }, 'Put your chamber back to ' + stamp(b.taken_at) + '?'))) return;
    setBusy(b.id);
    try {
      await restoreBackup(b.id);
      toast.show(t('studio.safe.restoredToast', undefined, 'Restored. Reloading…'));
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not restore');
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {failed && <Notice>{t('studio.safe.error', undefined, 'Could not load this yet. The safety tables may not be set up on the server.')}</Notice>}
      <Card>
        <CardTitle>{t('studio.safe.pointsTitle', undefined, 'Restore points')}</CardTitle>
        <p className="mb-4 max-w-2xl text-sm text-ink-soft">
          {solo
            ? t('studio.safe.pointsIntroSolo', undefined, 'Every night a copy of all your data is saved, and the last 40 are kept. If a case is deleted or something goes wrong, go back to an earlier copy here. Going back saves the current state first, so you can undo it too.')
            : t('studio.safe.pointsIntro', undefined, 'Every night the chamber saves a copy of all its data, and keeps the last 40. If a case is deleted or something goes wrong, go back to an earlier copy here. Going back saves the current state first, so you can undo it too.')}
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <button className={btn.bronze} disabled={busy !== null} onClick={() => void saveNow()}>
            <History className="h-4 w-4" /> {busy === 'save' ? t('studio.safe.saving', undefined, 'Saving…') : t('studio.safe.saveNow', undefined, 'Save a restore point now')}
          </button>
          <button className={btn.ghost} onClick={() => void load()}>
            {t('studio.safe.refresh', undefined, 'Refresh')}
          </button>
        </div>
        {backups === null ? (
          !failed && <p className="text-sm text-ink-soft">{t('studio.safe.loading', undefined, 'Loading…')}</p>
        ) : backups.length === 0 ? (
          <p className="text-sm text-ink-soft">{t('studio.safe.none', undefined, 'No restore points yet. The first one is saved tonight.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {backups.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {stamp(b.taken_at)} <Badge tone="neutral">{t(`studio.safe.reason.${b.reason}`, undefined, b.reason)}</Badge>
                  </span>
                  <span className="block text-xs text-ink-soft">
                    {t(`studio.safe.kind.${b.kind}`, undefined, b.kind)}
                    {b.kind === 'data' && backupSummaryText(b.summary, t) ? ` — ${backupSummaryText(b.summary, t)}` : ''}
                  </span>
                </span>
                <button className={btn.ghost} disabled={busy !== null} onClick={() => void restore(b)}>
                  <RotateCcw className="h-4 w-4" /> {busy === b.id ? t('studio.safe.restoring', undefined, 'Restoring…') : t('studio.safe.restore', undefined, 'Go back to this')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardTitle>{t('studio.safe.activityTitle', undefined, 'Recent activity')}</CardTitle>
        <p className="mb-4 text-sm text-ink-soft">{solo
            ? t('studio.safe.activityIntroSolo', undefined, 'What was added, changed or removed, newest first. Kept for 120 days.')
            : t('studio.safe.activityIntro', undefined, 'Who added, changed or removed what, newest first. Kept for 120 days.')}</p>
        {activity === null ? null : activity.length === 0 ? (
          <p className="text-sm text-ink-soft">{t('studio.safe.activityNone', undefined, 'No activity yet.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {activity.map((a) => (
              <li key={a.id} className="py-2.5 text-sm">
                <span className="block text-xs text-ink-soft">{stamp(a.at)}</span>
                {a.lines.map((l, i) => (
                  <span key={i} className="block">
                    {lineText(l, a.user_name, t)}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Files({ db }: { db: Snapshot }) {
  const toast = useToast();
  const { t } = useLang();
  const solo = useRole().plan === 'solo';
  const { open, download } = useDocFile(toast);
  const used = storageUsed(db.docs);
  const pct = Math.min(100, Math.round((used / PLAN_BYTES) * 100));
  const folders = [...new Set(db.docs.map((d) => d.folder))].sort();
  const biggest = [...db.docs].sort((a, b) => (b.size ?? b.sizeKb * 1024) - (a.size ?? a.sizeKb * 1024)).slice(0, 8);

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>{t('studio.files.storage', undefined, 'Storage')}</CardTitle>
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span>
            <strong className="font-serif text-2xl">{formatBytes(used)}</strong> {solo ? t('studio.files.used', undefined, 'used') : t('studio.files.shared', undefined, 'shared with your chamber')}
          </span>
          <span className="text-ink-soft">{t('studio.files.of', { size: formatBytes(PLAN_BYTES) }, `of ${formatBytes(PLAN_BYTES)}`)}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-line/60" role="img" aria-label={t('studio.files.pct', { pct }, `${pct}% of storage used`)}>
          <div className="h-full rounded-full bg-bronze" style={{ width: `${Math.max(pct, used ? 2 : 0)}%` }} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/app/documents/" className={btn.bronze}>
            <FolderOpen className="h-4 w-4" /> {t('studio.files.uploadPdf', undefined, 'Upload PDFs and files')}
          </Link>
          <Link href="/app/library/" className={btn.ghost}>
            <Library className="h-4 w-4" /> {t('studio.files.uploadBooks', undefined, 'Upload law books')}
          </Link>
        </div>
      </Card>
      <Card>
        <CardTitle>{t('studio.files.byFolder', undefined, 'By folder')}</CardTitle>
        {folders.length === 0 ? (
          <p className="text-sm text-ink-soft">{t('studio.files.none', undefined, 'No files uploaded yet.')}</p>
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
          <CardTitle>{t('studio.files.largest', undefined, 'Largest files')}</CardTitle>
          <ul className="divide-y divide-line">
            {biggest.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{d.name}</span>
                  <span className="text-xs text-ink-soft">
                    {d.folder} · {formatBytes(d.size ?? d.sizeKb * 1024)} · {formatPk(d.uploadedOn)}
                  </span>
                </span>
                <button className="rounded-lg p-1.5 text-ink-soft hover:bg-line/50 hover:text-ink" aria-label={t('studio.files.open', { name: d.name }, `Open ${d.name}`)} onClick={() => void open(d)}>
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-1.5 text-ink-soft hover:bg-line/50 hover:text-ink" aria-label={t('studio.files.download', { name: d.name }, `Download ${d.name}`)} onClick={() => void download(d)}>
                  <Download className="h-4 w-4" />
                </button>
                {d.folder !== BOOK_FOLDER && (
                  <button
                    className="rounded-lg p-1.5 text-ink-soft hover:bg-danger/10 hover:text-danger"
                    aria-label={t('studio.files.delete', { name: d.name }, `Delete ${d.name}`)}
                    onClick={async () => {
                      if (!window.confirm(solo
                          ? t('studio.files.confirmSolo', { name: d.name }, `Delete "${d.name}"? This cannot be undone.`)
                          : t('studio.files.confirm', { name: d.name }, `Delete "${d.name}" for everyone in your chamber? This cannot be undone.`))) return;
                      await removeDocument(d);
                      toast.show(t('studio.files.deleted', undefined, 'File deleted'));
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
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>('look');
  const { plan } = useRole();
  const solo = plan === 'solo';
  // A solo advocate has nobody to grant rights to, and no chamber profile: their logo and letterhead sit under Look and feel.
  const tabs = solo ? TABS.filter((x) => x.id !== 'access' && x.id !== 'profile') : TABS;
  const accent = settingsOf(db)?.accent ?? 'bronze';
  return (
    <>
      <div role="tablist" aria-label={t('studio.sections', undefined, 'Studio sections')} className="mb-6 flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              tab === id ? 'border-bronze bg-bronze text-ivory shadow-sm' : 'border-line bg-paper text-ink hover:border-bronze/40'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {t(`studio.tab.${id}`, undefined, label)}
          </button>
        ))}
      </div>
      {tab === 'look' && (
        <div className="space-y-6">
          <Look accent={accent} solo={solo} />
          {solo && <Profile db={db} solo />}
        </div>
      )}
      {tab === 'profile' && !solo && <Profile db={db} />}
      {tab === 'access' && !solo && <Access db={db} />}
      {tab === 'reminders' && <Reminders db={db} />}
      {tab === 'safety' && <Safety />}
      {tab === 'files' && <Files db={db} />}
    </>
  );
}

/** The Studio tab of Settings: colours, letterhead, access rights, reminders, safety and files. */
export function Studio() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <StudioBody db={db} />;
}
