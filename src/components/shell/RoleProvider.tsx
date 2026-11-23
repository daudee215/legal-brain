'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listMembers } from '../../lib/repo';
import type { Member, Role } from '../../types';

const KEY = 'lb.role';

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
  /** The demo chamber member shown for the current role. */
  member: Member;
  /** True once the saved role and chamber members are loaded. */
  ready: boolean;
}

const Ctx = createContext<RoleCtx | null>(null);

export function RoleProvider({ children, initialRole = 'senior' }: { children: React.ReactNode; initialRole?: Role }) {
  const [role, setRoleState] = useState<Role>(initialRole);
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'senior' || saved === 'junior' || saved === 'clerk') setRoleState(saved);
    } catch {
      /* storage unavailable — keep default */
    }
    let alive = true;
    listMembers().then((m) => {
      if (alive) setMembers(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    try {
      window.localStorage.setItem(KEY, r);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => {
    const member = members?.find((m) => m.role === role) ?? { id: '', name: '', email: '', role };
    return { role, setRole, member, ready: members !== null };
  }, [role, setRole, members]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRole(): RoleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRole must be used inside <RoleProvider>');
  return v;
}
