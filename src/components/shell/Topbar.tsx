'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Moon, Search, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ROLE_LABEL } from '../../lib/permissions';
import type { Role } from '../../types';
import { NAV, isActive } from './nav';
import { NotificationsMenu } from './Notifications';
import { useRole } from './RoleProvider';
import { useTheme } from './ThemeProvider';

export function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { role, setRole, member } = useRole();
  const { resolved, toggle } = useTheme();
  const pathname = usePathname() ?? '/app/';
  const current = NAV.find((n) => isActive(pathname, n.href));
  const initials = member.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line/80 bg-cream/75 px-4 py-3 backdrop-blur-xl lg:px-8">
      <button type="button" onClick={onMenu} className="rounded-lg p-2 text-ink hover:bg-line lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <p className="hidden min-w-0 items-center gap-2 text-sm xl:flex">
        <span className="text-ink-soft">Khan &amp; Associates</span>
        <span className="text-line">/</span>
        <span className="truncate font-medium text-ink">{current?.label ?? 'Dashboard'}</span>
      </p>
      <button
        type="button"
        onClick={onSearch}
        className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-left text-sm text-ink-soft shadow-sm transition hover:border-bronze/40 sm:max-w-md xl:ml-6"
        aria-label="Search everything"
      >
        <Search className="h-4 w-4 shrink-0 transition group-hover:text-bronze" aria-hidden />
        <span className="min-w-0 flex-1 truncate">Search cases, clients, laws…</span>
        <kbd className="hidden rounded-md border border-line bg-cream px-1.5 py-0.5 font-sans text-[10px] font-medium sm:inline">Ctrl K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
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
        <button
          type="button"
          onClick={toggle}
          className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg text-ink transition hover:bg-line"
          aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={resolved}
              initial={{ y: 14, rotate: -40, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: -14, rotate: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {resolved === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.span>
          </AnimatePresence>
        </button>
        <NotificationsMenu />
        <span
          className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-bronze-soft to-bronze text-sm font-semibold text-ivory shadow-md shadow-bronze/30"
          title={member.name}
        >
          {initials}
        </span>
      </div>
    </header>
  );
}
