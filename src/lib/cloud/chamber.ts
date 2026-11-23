/**
 * Accounts and chamber membership (everything except the practice data itself, which sync.ts handles).
 * The chosen chamber is remembered on this device under `lb.chamber`.
 */
import type { Role } from '../../types';
import { supabase } from './client';
import { flushSync, hasUnsyncedChanges, stopSync } from './sync';

const CHOSEN = 'lb.chamber';

export function chosenChamber(): string | null {
  try {
    return window.localStorage.getItem(CHOSEN);
  } catch {
    return null;
  }
}
export function chooseChamber(id: string | null) {
  try {
    if (id) window.localStorage.setItem(CHOSEN, id);
    else window.localStorage.removeItem(CHOSEN);
  } catch {
    /* ignore */
  }
}

function check<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}

export async function currentUser(): Promise<{ id: string; email: string; name: string } | null> {
  const { data } = await supabase().auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? '', name: String(u.user_metadata?.name ?? '') } : null;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** Email confirmation is off on the project, so a new account comes back signed in. */
export async function signUp(name: string, email: string, password: string) {
  const { data, error } = await supabase().auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
  if (error) throw error;
  if (!data.session) throw new Error('Account created — please confirm your email, then log in.');
}

/** Email a password-reset link. Supabase answers the same whether or not the account exists. */
export async function sendPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/reset/`;
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw error;
}

/** Set a new password for the signed-in user (the reset link signs them in first). */
export async function setNewPassword(password: string) {
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw error;
}

/** Push anything pending, stop syncing, sign out and forget the chosen chamber. */
export async function signOut(): Promise<void> {
  if (hasUnsyncedChanges()) {
    await Promise.race([flushSync(), new Promise((r) => setTimeout(r, 4000))]);
  }
  stopSync();
  chooseChamber(null);
  await supabase().auth.signOut();
}

export async function myChambers(): Promise<{ id: string; name: string; role: Role }[]> {
  const u = await currentUser();
  if (!u) return [];
  const rows = check(await supabase().from('members').select('chamber_id, role, chambers(name)').eq('user_id', u.id).order('joined_at')) as unknown as {
    chamber_id: string;
    role: Role;
    chambers: { name: string } | null;
  }[];
  return (rows ?? []).map((r) => ({ id: r.chamber_id, name: r.chambers?.name ?? 'Chamber', role: r.role }));
}

export async function createChamber(name: string, myName: string): Promise<string> {
  return String(check(await supabase().rpc('create_chamber', { p_name: name.trim(), p_my_name: myName.trim() })));
}

export async function acceptInvite(code: string, myName: string): Promise<string> {
  return String(check(await supabase().rpc('accept_invite', { p_code: code.trim(), p_my_name: myName.trim() })));
}

export interface InvitePeek {
  chamber_name: string;
  role: Role;
  expired: boolean;
  used: boolean;
}
export async function peekInvite(code: string): Promise<InvitePeek | null> {
  const rows = check(await supabase().rpc('peek_invite', { p_code: code.trim() })) as InvitePeek[] | null;
  return rows?.[0] ?? null;
}

export interface Invite {
  code: string;
  role: Role;
  note: string;
  created_at: string;
  expires_at: string;
}
export const inviteLink = (code: string) => `${window.location.origin}/join/?code=${code}`;

export async function createInvite(chamberId: string, role: Role, note = ''): Promise<Invite> {
  const u = await currentUser();
  if (!u) throw new Error('Please log in again.');
  return check(
    await supabase().from('invites').insert({ chamber_id: chamberId, role, note, created_by: u.id }).select('code,role,note,created_at,expires_at').single(),
  ) as Invite;
}

/** Invites not yet used and not expired. */
export async function listInvites(chamberId: string): Promise<Invite[]> {
  return (check(
    await supabase()
      .from('invites')
      .select('code,role,note,created_at,expires_at')
      .eq('chamber_id', chamberId)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ) ?? []) as Invite[];
}

export async function revokeInvite(code: string) {
  check(await supabase().from('invites').delete().eq('code', code));
}

export async function setMemberRole(chamberId: string, userId: string, role: Role) {
  check(await supabase().from('members').update({ role }).eq('chamber_id', chamberId).eq('user_id', userId));
}

export async function removeMember(chamberId: string, userId: string) {
  check(await supabase().from('members').delete().eq('chamber_id', chamberId).eq('user_id', userId));
}

/** Leave a chamber: remove my membership, stop syncing, forget it on this device. */
export async function leaveChamber(chamberId: string) {
  const u = await currentUser();
  if (!u) return;
  check(await supabase().from('members').delete().eq('chamber_id', chamberId).eq('user_id', u.id));
  stopSync();
  chooseChamber(null);
}
