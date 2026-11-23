'use client';

import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, FilePen, Gavel, Moon, ScrollText, Search, Sun, UserRound, UserRoundCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { can, ROLE_LABEL } from '../../lib/permissions';
import { snapshot } from '../../lib/repo';
import { useData } from '../../lib/useData';
import type { Role } from '../../types';
import { NAV } from './nav';
import { useRole } from './RoleProvider';
import { useTheme } from './ThemeProvider';

const itemCls =
  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink data-[selected=true]:bg-bronze/10 data-[selected=true]:text-ink';
const groupCls =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-ink-soft';

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter();
  const { role, setRole } = useRole();
  const { resolved, toggle } = useTheme();
  const db = useData(() => snapshot(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const pages = NAV.filter((n) => !n.action || can(role, n.action));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button className="absolute inset-0 bg-night/50 backdrop-blur-sm" aria-label="Close search" onClick={() => setOpen(false)} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl shadow-night/30"
          >
            <Command label="Search everything" loop>
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                <Command.Input
                  autoFocus
                  placeholder="Search cases, clients, laws, judgments, pages…"
                  className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none focus-visible:outline-none placeholder:text-ink-soft/70"
                />
                <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-soft">ESC</kbd>
              </div>
              <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-10 text-center text-sm text-ink-soft">Nothing matches that. Try a case number or client name.</Command.Empty>

                <Command.Group heading="Go to" className={groupCls}>
                  {pages.map((n) => {
                    const Icon = n.icon;
                    return (
                      <Command.Item key={n.href} value={`page ${n.label} ${n.hint}`} onSelect={() => go(n.href)} className={itemCls}>
                        <Icon className="h-4 w-4 text-bronze" aria-hidden />
                        <span className="flex-1">{n.label}</span>
                        <span className="text-xs text-ink-soft">{n.hint}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                {db && (
                  <>
                    <Command.Group heading="Cases" className={groupCls}>
                      {db.cases.map((c) => (
                        <Command.Item key={c.id} value={`case ${c.caseNo} ${c.title} ${c.category}`} onSelect={() => go(`/app/case/?id=${c.id}`)} className={itemCls}>
                          <Briefcase className="h-4 w-4 text-bronze" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{c.title}</span>
                          <span className="shrink-0 font-mono text-[11px] text-ink-soft">{c.caseNo}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                    <Command.Group heading="Clients" className={groupCls}>
                      {db.clients.map((c) => (
                        <Command.Item key={c.id} value={`client ${c.name} ${c.city}`} onSelect={() => go(`/app/clients/`)} className={itemCls}>
                          <UserRound className="h-4 w-4 text-bronze" aria-hidden />
                          <span className="flex-1">{c.name}</span>
                          <span className="text-xs text-ink-soft">{c.city}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                    <Command.Group heading="Laws" className={groupCls}>
                      {db.statutes.map((s) => (
                        <Command.Item key={s.id} value={`law ${s.title} ${s.year} ${s.category}`} onSelect={() => go(`/app/laws/${s.id}/`)} className={itemCls}>
                          <ScrollText className="h-4 w-4 text-bronze" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{s.title}</span>
                          <span className="text-xs text-ink-soft">{s.year}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                    <Command.Group heading="Judgments" className={groupCls}>
                      {db.judgments.map((j) => (
                        <Command.Item key={j.id} value={`judgment ${j.title} ${j.caseNo} ${j.tags.join(' ')}`} onSelect={() => go(`/app/case-law/${j.id}/`)} className={itemCls}>
                          <Gavel className="h-4 w-4 text-bronze" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{j.title}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                    {can(role, 'drafting') && (
                      <Command.Group heading="Templates" className={groupCls}>
                        {db.templates.map((t) => (
                          <Command.Item key={t.id} value={`template ${t.title} ${t.category}`} onSelect={() => go(`/app/drafting/${t.id}/`)} className={itemCls}>
                            <FilePen className="h-4 w-4 text-bronze" aria-hidden />
                            <span className="min-w-0 flex-1 truncate">{t.title}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                  </>
                )}

                <Command.Group heading="Actions" className={groupCls}>
                  <Command.Item
                    value="action toggle theme dark light mode"
                    onSelect={() => {
                      toggle();
                      setOpen(false);
                    }}
                    className={itemCls}
                  >
                    {resolved === 'dark' ? <Sun className="h-4 w-4 text-bronze" /> : <Moon className="h-4 w-4 text-bronze" />}
                    Switch to {resolved === 'dark' ? 'light' : 'dark'} mode
                  </Command.Item>
                  {(['senior', 'junior', 'clerk'] as Role[])
                    .filter((r) => r !== role)
                    .map((r) => (
                      <Command.Item
                        key={r}
                        value={`action preview as ${r} role`}
                        onSelect={() => {
                          setRole(r);
                          setOpen(false);
                        }}
                        className={itemCls}
                      >
                        <UserRoundCog className="h-4 w-4 text-bronze" />
                        Preview as {ROLE_LABEL[r]}
                      </Command.Item>
                    ))}
                </Command.Group>
              </Command.List>
              <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-ink-soft">
                <span>
                  <kbd className="rounded border border-line px-1">↑</kbd> <kbd className="rounded border border-line px-1">↓</kbd> to move ·{' '}
                  <kbd className="rounded border border-line px-1">↵</kbd> to open
                </span>
                <span className="font-serif text-bronze">Legal Brain</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
