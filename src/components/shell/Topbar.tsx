'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Cloud, CloudOff, Languages, Lock, LogOut, Menu, Moon, RefreshCw, Search, Sun } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { hasUnsyncedChanges } from '../../lib/cloud/sync';
import { getDb } from '../../lib/store';
import { usePathname } from 'next/navigation';
import { useLang } from '../../lib/i18n';
import type { Role } from '../../types';
import { NAV, isActive } from './nav';
import { AppLockSettings } from './AppLockSettings';
import { NotificationsMenu } from './Notifications';
import { useRole } from './RoleProvider';
import { useCloud } from './CloudProvider';
import { useTheme } from './ThemeProvider';

export function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { role, setRole, member, cloud } = useRole();
  const { resolved, toggle } = useTheme();
  const { lang, setLang, t } = useLang();
  const pathname = usePathname() ?? '/app/';
  const current = NAV.find((n) => isActive(pathname, n.href));
  const initials = member.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line/80 bg-cream/75 px-4 py-3 backdrop-blur-xl lg:px-8">
      <button type="button" onClick={onMenu} className="rounded-lg p-2 text-ink hover:bg-line lg:hidden" aria-label={t('shell.openMenu')}>
        <Menu className="h-5 w-5" />
      </button>
      <p className="hidden min-w-0 items-center gap-2 text-sm xl:flex">
        <span className="text-ink-soft">{cloud ? getDb().chamber.name : 'Khan & Associates'}</span>
        <span className="text-line">/</span>
        <span className="truncate font-medium text-ink">{current ? t(`nav.${current.href}`, undefined, current.label) : t('nav./app/')}</span>
      </p>
      <button
        type="button"
        onClick={onSearch}
        className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-start text-sm text-ink-soft shadow-sm transition hover:border-bronze/40 sm:max-w-md xl:ms-6"
        aria-label={t('top.searchLabel')}
      >
        <Search className="h-4 w-4 shrink-0 transition group-hover:text-bronze" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{t('top.search')}</span>
        <kbd className="hidden rounded-md border border-line bg-cream px-1.5 py-0.5 font-sans text-[10px] font-medium sm:inline">Ctrl K</kbd>
      </button>
      <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
        {cloud && <SyncIndicator />}
        {!cloud && (
        <label className="hidden items-center gap-2 text-xs text-ink-soft md:flex">
          {t('top.previewAs')}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
            aria-label={t('top.previewAs')}
          >
            {(['senior', 'junior', 'clerk'] as Role[]).map((r) => (
              <option key={r} value={r}>
                {t(`role.${r}`)}
              </option>
            ))}
          </select>
        </label>
        )}
        <button
          type="button"
          onClick={() => setLang(lang === 'ur' ? 'en' : 'ur')}
          className={`flex h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 text-sm font-semibold text-ink transition hover:border-bronze/40 hover:bg-line/40 ${lang === 'en' ? 'urdu' : ''}`}
          aria-label={t('top.langLabel')}
          title={t('top.langLabel')}
        >
          <Languages className="h-4 w-4 shrink-0 text-bronze" aria-hidden />
          <span lang={lang === 'en' ? 'ur' : 'en'}>{t('top.langToggle')}</span>
        </button>
        <button
          type="button"
          onClick={toggle}
          className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg text-ink transition hover:bg-line"
          aria-label={resolved === 'dark' ? t('top.toLight') : t('top.toDark')}
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
        {cloud ? (
          <AccountMenu initials={initials} name={member.name} />
        ) : (
          <span
            className="ms-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-bronze-soft to-bronze text-sm font-semibold text-ivory shadow-md shadow-bronze/30"
            title={member.name}
          >
            {initials}
          </span>
        )}
      </div>
    </header>
  );
}

function SyncIndicator() {
  const { sync } = useCloud();
  const { t } = useLang();
  const st = sync.status;
  const label = st === 'saving' ? t('cloud.saving') : st === 'offline' ? t('cloud.offline') : st === 'error' ? t('cloud.error') : st === 'loading' ? t('cloud.loading') : t('cloud.saved');
  const Icon = st === 'offline' || st === 'error' ? CloudOff : st === 'saving' || st === 'loading' ? RefreshCw : Cloud;
  const tone = st === 'offline' ? 'text-bronze' : st === 'error' ? 'text-danger' : 'text-ink-soft';
  const spin = st === 'saving' || st === 'loading' ? 'animate-spin' : '';
  return (
    <span role="status" aria-label={`${t('cloud.status')}: ${label}`} title={sync.error || label} className={`flex items-center gap-1.5 text-xs ${tone}`} data-sync={st}>
      <Icon className={`h-4 w-4 shrink-0 ${spin}`} aria-hidden />
      <span className={st === 'offline' || st === 'error' ? 'hidden max-w-[16rem] truncate sm:inline' : 'hidden sm:inline'}>{label}</span>
    </span>
  );
}

function AccountMenu({ initials, name }: { initials: string; name: string }) {
  const { email, sync, signOut } = useCloud();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const out = async () => {
    if (hasUnsyncedChanges() && (sync.status === 'offline' || sync.status === 'error') && !window.confirm(t('account.unsynced'))) return;
    setOpen(false);
    await signOut();
  };
  return (
    <div ref={ref} className="relative ms-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('account.menu')}
        title={name}
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-bronze-soft to-bronze text-sm font-semibold text-ivory shadow-md shadow-bronze/30"
      >
        {initials}
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-11 z-50 w-64 rounded-xl border border-line bg-paper p-2 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="truncate text-xs text-ink-soft">
              {t('account.signedInAs')} {email}
            </p>
          </div>
          <div className="my-1 border-t border-line" />
          <Link role="menuitem" href="/app/chamber/" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-line/50">
            {t('account.chamber')}
          </Link>
          <Link role="menuitem" href="/app/settings/" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-line/50">
            {t('account.settings')}
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              setLockOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-ink hover:bg-line/50"
          >
            <Lock className="h-4 w-4" aria-hidden /> {t('lock.menu')}
          </button>
          <button role="menuitem" type="button" onClick={() => void out()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-danger hover:bg-danger/10">
            <LogOut className="h-4 w-4" aria-hidden /> {t('account.signOut')}
          </button>
        </div>
      )}
      <AppLockSettings open={lockOpen} onClose={() => setLockOpen(false)} />
    </div>
  );
}
