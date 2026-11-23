'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listMembers } from '../../lib/repo';
import { getDb, subscribe } from '../../lib/store';
import type { Member, Role } from '../../types';
import { useCloud } from './CloudProvider';

const KEY = 'lb.role';

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
  /** The chamber member shown for the current role (in a cloud chamber: the signed-in member). */
  member: Member;
  /** True once the saved role and chamber members are loaded. */
  ready: boolean;
  /** Signed in to a shared chamber: the role is the real one and can't be previewed. */
  cloud: boolean;
}

const Ctx = createContext<RoleCtx | null>(null);

export function RoleProvider({ children, initialRole = 'senior' }: { children: React.ReactNode; initialRole?: Role }) {
  const [role, setRoleState] = useState<Role>(initialRole);
  const [members, setMembers] = useState<Member[] | null>(null);
  const { view } = useCloud();
  const cloud = view === 'on';
  const [me, setMe] = useState<Member | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'senior' || saved === 'junior' || saved === 'clerk') setRoleState(saved);
    } catch {
      /* storage unavailable — keep default */
    }
    let alive = true;
    const load = () =>
      listMembers().then((m) => {
        if (alive) setMembers(m);
      });
    void load();
    const off = subscribe(() => void load());
    return () => {
      alive = false;
      off();
    };
  }, []);

  // In a cloud chamber, follow the signed-in member (their role can change while the app is open).
  useEffect(() => {
    if (!cloud) return setMe(null);
    setMe(getDb().me);
    return subscribe(() => setMe(getDb().me));
  }, [cloud]);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    try {
      window.localStorage.setItem(KEY, r);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<RoleCtx>(() => {
    if (cloud && me) return { role: me.role, setRole: () => {}, member: me, ready: true, cloud: true };
    const member = members?.find((m) => m.role === role) ?? { id: '', name: '', email: '', role };
    return { role, setRole, member, ready: members !== null && view !== 'loading' && !(cloud && !me), cloud: false };
  }, [role, setRole, members, cloud, me, view]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRole(): RoleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRole must be used inside <RoleProvider>');
  return v;
}
