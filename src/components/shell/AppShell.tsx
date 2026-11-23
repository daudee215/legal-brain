'use client';

import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ROLE_LABEL } from '../../lib/permissions';
import type { Role } from '../../types';
import { RoleProvider, useRole } from './RoleProvider';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

function MobileRoleSwitch() {
  const { role, setRole } = useRole();
  return (
    <label className="flex items-center justify-between gap-2 border-t border-white/10 bg-ink px-5 py-3 text-xs text-cream/70">
      Preview as
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-md bg-white/10 px-2 py-1 text-sm text-cream"
        aria-label="Preview as (mobile)"
      >
        {(['senior', 'junior', 'clerk'] as Role[]).map((r) => (
          <option key={r} value={r} className="text-ink">
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
    </label>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-cream/80 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-h-0 flex-1">
              <Sidebar onNavigate={() => setOpen(false)} />
            </div>
            <MobileRoleSwitch />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <Shell>{children}</Shell>
    </RoleProvider>
  );
}
