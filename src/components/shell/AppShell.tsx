'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { dismissUndone } from '../../lib/cloud/sync';
import { LanguageProvider, useLang } from '../../lib/i18n';
import type { Role } from '../../types';
import { Loading } from '../ui/Loading';
import { CloudProvider, useCloud } from './CloudProvider';
import { ChamberSetup, Unreachable } from './CloudGate';
import { CommandPalette } from './CommandPalette';
import { DemoBanner } from './DemoBanner';
import { RoleProvider, useRole } from './RoleProvider';
import { Sidebar } from './Sidebar';
import { ThemeProvider } from './ThemeProvider';
import { Topbar } from './Topbar';

const COLLAPSE_KEY = 'lb.sidebar';

function MobileRoleSwitch() {
  const { role, setRole } = useRole();
  const { t } = useLang();
  return (
    <label className="flex items-center justify-between gap-2 border-t border-white/10 bg-night px-5 py-3 text-xs text-ivory/70">
      {t('top.previewAs')}
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-md bg-white/10 px-2 py-1 text-sm text-ivory"
        aria-label="Preview as (mobile)"
      >
        {(['senior', 'junior', 'clerk'] as Role[]).map((r) => (
          <option key={r} value={r} className="text-ink">
            {t(`role.${r}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

const PART_NAME: Record<string, string> = {
  cases: 'cases',
  clients: 'clients',
  causeList: 'the cause list',
  deadlines: 'deadlines',
  diary: 'the diary',
  notifications: 'reminders',
  docs: 'documents',
  books: 'law books',
  precedents: 'precedents',
  settings: 'chamber settings',
};

/** Shown when the server rules said a change was not allowed for this person's role, so it was undone. */
function UndoneNotice() {
  const { sync } = useCloud();
  if (!sync.undone.length) return null;
  const parts = sync.undone.map((k) => PART_NAME[k] ?? k).join(', ');
  return (
    <div role="alert" className="flex items-start gap-3 border-b border-bronze/30 bg-bronze/10 px-4 py-2.5 text-sm">
      <span className="min-w-0 flex-1">
        Some changes to <strong>{parts}</strong> were not saved, because your role in this chamber does not allow them. Ask the senior advocate if you need that access.
      </span>
      <button className="shrink-0 font-medium text-bronze hover:underline" onClick={dismissUndone}>
        Dismiss
      </button>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { ready, cloud } = useRole();
  const { view } = useCloud();
  const { t, dir } = useLang();
  const off = dir === 'rtl' ? '100%' : '-100%';

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
            aria-label={t('shell.menu')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button className="absolute inset-0 bg-night/50 backdrop-blur-sm" aria-label={t('shell.closeMenu')} onClick={() => setOpen(false)} />
            <motion.div
              className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col shadow-2xl"
              initial={{ x: off }}
              animate={{ x: 0 }}
              exit={{ x: off }}
              transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute end-3 top-4 z-10 rounded-md p-1.5 text-ivory/80 hover:bg-white/10"
                aria-label={t('shell.closeMenu')}
              >
                <X className="h-5 w-5" />
              </button>
              <div className="min-h-0 flex-1">
                <Sidebar onNavigate={() => setOpen(false)} layoutKey="drawer" />
              </div>
              {!cloud && <MobileRoleSwitch />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <Topbar onMenu={() => setOpen(true)} onSearch={() => setPalette(true)} />
        <DemoBanner />
        <UndoneNotice />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <motion.div
            key={pathname}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === 'choose' ? <ChamberSetup /> : view === 'unreachable' ? <Unreachable /> : children}
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
      <CloudProvider>
        <RoleProvider>
          <LanguageProvider>
            <Shell>{children}</Shell>
          </LanguageProvider>
        </RoleProvider>
      </CloudProvider>
    </ThemeProvider>
  );
}
