'use client';

import { Bell, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROLE_LABEL } from '../../lib/permissions';
import { unreadCount } from '../../lib/repo';
import { useData } from '../../lib/useData';
import type { Role } from '../../types';
import { useRole } from './RoleProvider';


export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { role, setRole, member } = useRole();
  const router = useRouter();
  const [q, setQ] = useState('');
  const unread = useData(() => unreadCount()) ?? 0;
  const initials = member.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-cream/90 px-4 py-3 backdrop-blur lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-lg p-2 text-ink hover:bg-line lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <form
        role="search"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 sm:max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/app/cases/?q=${encodeURIComponent(q)}`);
        }}
      >
        <Search className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search cases, clients, case no…"
          aria-label="Search cases"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft/70"
        />
      </form>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <label className="hidden items-center gap-2 text-xs text-ink-soft md:flex">
          Preview as
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
            aria-label="Preview as"
          >
            {(['senior', 'junior', 'clerk'] as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <Link
          href="/app/news/?tab=notifications"
          className="relative rounded-lg p-2 hover:bg-line"
          aria-label={`Notifications, ${unread} unread`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Link>
        <span
          className="grid h-9 w-9 place-items-center rounded-full bg-bronze text-sm font-semibold text-ivory"
          title={member.name}
        >
          {initials}
        </span>
      </div>
    </header>
  );
}
