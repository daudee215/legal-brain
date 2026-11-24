'use client';

import { motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, Globe } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '../../lib/i18n';
import { can } from '../../lib/permissions';
import { getDb } from '../../lib/store';
import { Logo } from './Logo';
import { isActive, NAV, NAV_GROUPS } from './nav';
import { useRole } from './RoleProvider';

export function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  layoutKey = 'desk',
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Distinguishes the desktop and drawer instances so their active pills animate independently. */
  layoutKey?: string;
}) {
  const pathname = usePathname() ?? '/app/';
  const { role, member, cloud } = useRole();
  const { t, dir } = useLang();
  const rtl = dir === 'rtl';
  const items = NAV.filter((n) => !n.action || can(role, n.action));
  const initials = member.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <nav aria-label="Main" className="grain relative flex h-full flex-col overflow-hidden bg-night bg-gradient-to-b from-white/[0.03] to-black/20 text-ivory">
      <div className="pointer-events-none absolute -start-24 -top-24 h-64 w-64 rounded-full bg-bronze/25 blur-3xl" aria-hidden />
      <div className={`relative flex items-center pb-4 pt-5 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <Link href="/" onClick={onNavigate} aria-label="Legal Brain website">
          {collapsed ? (
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-bronze font-serif text-lg font-bold text-ivory">L</span>
          ) : (
            <Logo light />
          )}
        </Link>
      </div>

      <div className="scrollbar-thin relative flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((g) => {
          const groupItems = items.filter((n) => n.group === g);
          if (!groupItems.length) return null;
          return (
            <div key={g} className="mb-3">
              {collapsed ? (
                <div className="mx-auto my-2 h-px w-6 bg-white/10" aria-hidden />
              ) : (
                <p className="px-3 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-bronze-soft/70">{t(`group.${g}`, undefined, g)}</p>
              )}
              <ul className="space-y-0.5">
                {groupItems.map((n) => {
                  const active = isActive(pathname, n.href);
                  const Icon = n.icon;
                  return (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        title={collapsed ? t(`nav.${n.href}`, undefined, n.label) : undefined}
                        className={`group relative flex items-center gap-3 rounded-lg py-2 text-sm transition-colors ${
                          collapsed ? 'justify-center px-0' : 'px-3'
                        } ${active ? 'font-semibold text-night' : 'text-ivory/75 hover:bg-white/[0.07] hover:text-ivory'}`}
                      >
                        {active && (
                          <motion.span
                            layoutId={`nav-pill-${layoutKey}`}
                            className="absolute inset-0 rounded-lg bg-ivory shadow-lg shadow-black/20"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          />
                        )}
                        <Icon
                          className={`relative h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-bronze' : ''}`}
                          aria-hidden
                        />
                        <span className={collapsed ? 'sr-only' : 'relative truncate'}>{t(`nav.${n.href}`, undefined, n.label)}</span>
                        {n.href === '/app/assistant/' && !collapsed && (
                          <span className="relative ms-auto rounded-full bg-bronze/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ivory">
                            AI
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <Link
        href="/"
        title={collapsed ? t('shell.website') : undefined}
        className={`relative mx-3 mb-1 flex items-center gap-2 rounded-lg py-2 text-xs text-ivory/60 transition hover:bg-white/[0.07] hover:text-ivory ${collapsed ? 'justify-center' : 'px-3'}`}
      >
        <Globe className="h-4 w-4" aria-hidden />
        <span className={collapsed ? 'sr-only' : ''}>{t('shell.website')}</span>
      </Link>
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="relative mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg py-2 text-xs text-ivory/60 transition hover:bg-white/[0.07] hover:text-ivory"
          aria-label={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
        >
          {collapsed !== rtl ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && t('shell.collapse')}
        </button>
      )}

      <div className={`relative flex items-center gap-3 border-t border-white/10 py-4 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-bronze-soft to-bronze text-sm font-semibold text-ivory">
          {initials}
          <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-night bg-ok" aria-hidden />
        </span>
        {!collapsed && (
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">
              {t('shell.advPrefix')} {member.name}
            </p>
            <p className="truncate text-xs text-ivory/55">
              {t(`role.${role}`)} · {cloud ? getDb().chamber.name : 'Khan & Associates'}
            </p>
          </div>
        )}
      </div>
    </nav>
  );
}
