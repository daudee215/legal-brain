'use client';

import { Copy, Link2, LogOut, MessageCircle, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useCloud } from '../../../components/shell/CloudProvider';
import { Badge, btn, Card, CardTitle, DataTable, inputCls, PageHeader } from '../../../components/ui';
import { ConfirmDialog, type Confirm } from '../../../components/ui/ConfirmDialog';
import { useToast } from '../../../components/ui/Toast';
import { createInvite, inviteLink, leaveChamber, listInvites, removeMember, revokeInvite, setMemberRole, type Invite } from '../../../lib/cloud/chamber';
import { friendlyError } from '../../../lib/cloud/client';
import { refreshSync } from '../../../lib/cloud/sync';
import { formatPk } from '../../../lib/dates';
import { useLang } from '../../../lib/i18n';
import { ROLE_LABEL } from '../../../lib/permissions';
import type { Snapshot } from '../../../lib/repo';
import type { Member, Role } from '../../../types';

const ROLES: Role[] = ['senior', 'junior', 'clerk'];
const tone = (r: Role) => (r === 'senior' ? 'ink' : r === 'junior' ? 'bronze' : 'neutral') as 'ink' | 'bronze' | 'neutral';

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Chamber page when signed in to a shared chamber: real members and invite links. */
export function CloudChamber({ db, matrix }: { db: Snapshot; matrix: React.ReactNode }) {
  const { t } = useLang();
  const roleName = (r: Role) => t(`role.${r}`, undefined, ROLE_LABEL[r]);
  const shareText = (chamber: string, role: Role, link: string) =>
    t('chamber.shareText', { chamber, role: roleName(role), link }, "You're invited to join {chamber} on Legal Brain as {role}. Open this link to join: {link}");
  const toast = useToast();
  const cloud = useCloud();
  const me = db.me;
  const senior = me.role === 'senior';
  const chamberId = db.chamber.id;
  const members = db.chamber.members;
  const seniors = members.filter((m) => m.role === 'senior').length;
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [err, setErr] = useState('');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newRole, setNewRole] = useState<Role>('junior');
  const [note, setNote] = useState('');
  const [made, setMade] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);

  const loadInvites = useCallback(async () => {
    if (!senior) return;
    try {
      setInvites(await listInvites(chamberId));
    } catch (x) {
      setErr(friendlyError(x));
    }
  }, [chamberId, senior]);
  useEffect(() => {
    void loadInvites();
    void refreshSync(); // pick up members who joined since the app opened
  }, [loadInvites]);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setErr('');
    try {
      await fn();
      await refreshSync();
      toast.show(done);
    } catch (x) {
      setErr(friendlyError(x));
    }
  };

  const makeInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const inv = await createInvite(chamberId, newRole, note.trim());
      setMade(inv);
      setNote('');
      await loadInvites();
    } catch (x) {
      setErr(friendlyError(x));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (code: string) => toast.show((await copy(inviteLink(code))) ? t('chamber.linkCopied', undefined, 'Invite link copied') : t('chamber.linkSelectCopy', undefined, 'Select the link and copy it'));

  const leave = () => {
    if (senior && seniors === 1 && members.length > 1) {
      setErr(t('chamber.leaveOnlySenior', undefined, 'You are the only senior. Make another member senior before leaving, so someone can still manage the chamber.'));
      return;
    }
    setConfirm({
      title: t('chamber.leaveConfirmTitle', { chamber: db.chamber.name }, 'Leave {chamber}?'),
      body: (
        <>
          <p>{t('chamber.leaveConfirmBody', undefined, 'You will stop seeing this chamber’s cases on every device. A senior can invite you again later.')}</p>
          {members.length === 1 && (
            <p className="text-danger">{t('chamber.leaveLastMember', undefined, 'You are the last member — nobody will be able to open this chamber after you leave.')}</p>
          )}
        </>
      ),
      confirm: t('chamber.leave', undefined, 'Leave chamber'),
      danger: true,
      run: () =>
        void (async () => {
          try {
            await leaveChamber(chamberId);
            cloud.restart();
          } catch (x) {
            setErr(friendlyError(x));
          }
        })(),
    });
  };

  return (
    <>
      <PageHeader
        title={db.chamber.name}
        subtitle={t('chamber.subtitleCloud', undefined, 'Your chamber — members share cases, dates and documents. Fees are visible to seniors only.')}
      />
      {err && (
        <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <DataTable<Member>
            rows={members}
            rowKey={(m) => m.id}
            columns={[
              {
                header: t('chamber.col.member', undefined, 'Member'),
                cell: (m) => (
                  <span className="font-medium">
                    {m.name}
                    {m.id === me.id && <span className="ms-1 text-xs font-normal text-ink-soft">{t('chamber.you', undefined, '(you)')}</span>}
                  </span>
                ),
              },
              { header: t('chamber.col.email', undefined, 'Email'), cell: (m) => <span className="text-ink-soft">{m.email}</span> },
              {
                header: t('chamber.col.role', undefined, 'Role'),
                cell: (m) =>
                  senior && m.id !== me.id ? (
                    <select
                      className="rounded-lg border border-line bg-paper px-2 py-1 text-sm"
                      aria-label={t('chamber.roleOf', { name: m.name }, 'Role of {name}')}
                      value={m.role}
                      onChange={(e) =>
                        void act(
                          () => setMemberRole(chamberId, m.id, e.target.value as Role),
                          t('chamber.nowRole', { name: m.name, role: roleName(e.target.value as Role) }, '{name} is now {role}'),
                        )
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleName(r)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge tone={tone(m.role)}>{roleName(m.role)}</Badge>
                  ),
              },
              {
                header: '',
                cell: (m) =>
                  senior && m.id !== me.id ? (
                    <button
                      type="button"
                      className="rounded p-1.5 text-ink-soft hover:bg-danger/10 hover:text-danger"
                      aria-label={t('chamber.removeAria', { name: m.name }, 'Remove {name}')}
                      title={t('chamber.removeTitle', undefined, 'Remove from chamber')}
                      onClick={() =>
                        setConfirm({
                          title: t('chamber.removeConfirmTitle', { name: m.name }, 'Remove {name}?'),
                          body: <p>{t('chamber.removeBody', { name: m.name }, '{name} will immediately lose access to this chamber’s cases on every device.')}</p>,
                          confirm: t('chamber.removeConfirm', undefined, 'Remove member'),
                          danger: true,
                          run: () => void act(() => removeMember(chamberId, m.id), t('chamber.removed', { name: m.name }, '{name} removed')),
                        })
                      }
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  ) : null,
              },
            ]}
          />
          {matrix}
        </div>

        <div className="space-y-6 self-start">
          {senior ? (
            <Card>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-bronze" /> {t('chamber.invite.title', undefined, 'Invite a member')}
                </span>
              </CardTitle>
              <form className="space-y-3" onSubmit={makeInvite}>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">{t('chamber.field.role', undefined, 'Role')}</span>
                  <select className={inputCls} value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                    <option value="junior">{t('chamber.roleJunior', undefined, 'Junior')}</option>
                    <option value="clerk">{t('chamber.roleClerk', undefined, 'Clerk')}</option>
                    <option value="senior">{t('chamber.roleSeniorCo', undefined, 'Senior (co-owner)')}</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">{t('chamber.note', undefined, 'Note (optional)')}</span>
                  <input
                    className={inputCls}
                    placeholder={t('chamber.notePlaceholder', undefined, 'e.g. for Bilal')}
                    maxLength={80}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button type="submit" disabled={busy} className={`${btn.primary} w-full`}>
                  <Link2 className="h-4 w-4" aria-hidden /> {busy ? t('chamber.creating', undefined, 'Creating…') : t('chamber.createLink', undefined, 'Create invite link')}
                </button>
              </form>
              {made && (
                <div className="mt-4 space-y-2 rounded-xl border border-bronze/30 bg-bronze/10 p-3">
                  <p className="text-xs font-medium">
                    {t('chamber.sendThisLink', { role: roleName(made.role).toLowerCase() }, 'Send this link to your {role} (works once, for 14 days):')}
                  </p>
                  <input
                    readOnly
                    aria-label={t('chamber.inviteLinkAria', undefined, 'Invite link')}
                    className={`${inputCls} font-mono text-xs`}
                    value={inviteLink(made.code)}
                    onFocus={(e) => e.currentTarget.select()}
                    dir="ltr"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btn.ghost} onClick={() => void copyLink(made.code)}>
                      <Copy className="h-4 w-4" aria-hidden /> {t('chamber.copy', undefined, 'Copy')}
                    </button>
                    <a
                      className={btn.bronze}
                      href={`https://wa.me/?text=${encodeURIComponent(shareText(db.chamber.name, made.role, inviteLink(made.code)))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
                    </a>
                  </div>
                </div>
              )}
              {invites.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 text-sm font-semibold">{t('chamber.pending', undefined, 'Pending invites')}</h3>
                  <ul className="divide-y divide-line text-sm">
                    {invites.map((i) => (
                      <li key={i.code} className="flex items-center gap-2 py-2">
                        <Badge tone={tone(i.role)}>{roleName(i.role)}</Badge>
                        <span className="min-w-0 flex-1 truncate text-ink-soft">
                          {i.note || t('chamber.noNote', undefined, 'No note')} · {t('chamber.until', { date: formatPk(i.expires_at) }, 'until {date}')}
                        </span>
                        <button
                          type="button"
                          className="rounded p-1.5 text-ink-soft hover:bg-line"
                          aria-label={t('chamber.copyInviteAria', undefined, 'Copy invite link')}
                          onClick={() => void copyLink(i.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-ink-soft hover:bg-danger/10 hover:text-danger"
                          aria-label={t('chamber.revokeAria', undefined, 'Revoke invite')}
                          onClick={() =>
                            void act(async () => {
                              await revokeInvite(i.code);
                              if (made?.code === i.code) setMade(null);
                              await loadInvites();
                            }, t('chamber.revoked', undefined, 'Invite revoked'))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-ink-soft">{t('chamber.onlySenior', undefined, 'Only a senior advocate can invite or remove members.')}</p>
            </Card>
          )}
          <Card>
            <CardTitle>{t('chamber.leave', undefined, 'Leave chamber')}</CardTitle>
            <p className="text-sm text-ink-soft">
              {t('chamber.leaveBody', { chamber: db.chamber.name }, 'Stop being a member of {chamber}. Your account stays; you can join or create another chamber.')}
            </p>
            <button type="button" className={`${btn.ghost} mt-3`} onClick={leave}>
              <LogOut className="h-4 w-4" aria-hidden /> {t('chamber.leave', undefined, 'Leave chamber')}
            </button>
          </Card>
        </div>
      </div>
      <ConfirmDialog c={confirm} onClose={() => setConfirm(null)} />
      {toast.node}
    </>
  );
}
