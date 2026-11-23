'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ROLE_LABEL } from '../../lib/permissions';
import type { Role } from '../../types';
import { Loading } from '../ui/Loading';
import { CommandPalette } from './CommandPalette';
import { DemoBanner } from './DemoBanner';
import { RoleProvider, useRole } from './RoleProvider';
import { Sidebar } from './Sidebar';
import { ThemeProvider } from './ThemeProvider';
import { Topbar } from './Topbar';

const COLLAPSE_KEY = 'lb.sidebar';

function MobileRoleSwitch() {
  const { role, setRole } = useRole();
  return (
    <label className="flex items-center justify-between gap-2 border-t border-white/10 bg-night px-5 py-3 text-xs text-ivory/70">
      Preview as
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-md bg-white/10 px-2 py-1 text-sm text-ivory"
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
  const [palette, setPalette] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { ready } = useRole();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);
  const toggleCollapse = () => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  // Render the app only in the browser, once the role is known: the site is a static
  // export, so anything date-relative or role-gated must not be baked into the HTML.
  if (!ready) {
    return (
      <div className="min-h-dvh bg-cream lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="hidden bg-night lg:block" />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <Loading />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-cream text-ink">
      <motion.aside
        className="sticky top-0 hidden h-dvh shrink-0 lg:block"
        animate={{ width: collapsed ? 76 : 260 }}
        initial={false}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </motion.aside>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button className="absolute inset-0 bg-night/50 backdrop-blur-sm" aria-label="Close menu" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-ivory/80 hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="min-h-0 flex-1">
                <Sidebar onNavigate={() => setOpen(false)} layoutKey="drawer" />
              </div>
              <MobileRoleSwitch />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} onSearch={() => setPalette(true)} />
        <DemoBanner />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <motion.div
            key={pathname}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      <CommandPalette open={palette} setOpen={setPalette} />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <RoleProvider>
        <Shell>{children}</Shell>
      </RoleProvider>
    </ThemeProvider>
  );
}
