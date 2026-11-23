'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { seed } from '../../data/seed';
import type { Member, Role } from '../../types';

const KEY = 'lb.role';

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
  /** The demo chamber member shown for the current role. */
  member: Member;
}

const Ctx = createContext<RoleCtx | null>(null);

function memberFor(role: Role): Member {
  return seed.chamber.members.find((m) => m.role === role) ?? seed.me;
}

export function RoleProvider({ children, initialRole = 'senior' }: { children: React.ReactNode; initialRole?: Role }) {
  const [role, setRoleState] = useState<Role>(initialRole);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'senior' || saved === 'junior' || saved === 'clerk') setRoleState(saved);
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    try {
      window.localStorage.setItem(KEY, r);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ role, setRole, member: memberFor(role) }), [role, setRole]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRole(): RoleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRole must be used inside <RoleProvider>');
  return v;
}
