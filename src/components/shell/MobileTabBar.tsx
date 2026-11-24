'use client';

import { CalendarCheck2, Briefcase, LayoutDashboard, Menu, NotebookPen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '../../lib/i18n';
import { isActive } from './nav';

const TABS = [
  { href: '/app/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/today/', label: 'Today', icon: CalendarCheck2 },
  { href: '/app/cases/', label: 'Cases & Clients', icon: Briefcase },
  { href: '/app/diary/', label: 'Digital Diary', icon: NotebookPen },
];

const SHORT: Record<string, string> = { '/app/cases/': 'Cases', '/app/diary/': 'Diary' };

/** Thumb-reach navigation for phones: the four screens used in court, plus the full menu. */
export function MobileTabBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname() ?? '/app/';
  const { t } = useLang();
  const item = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors';
  return (
    <nav
      aria-label="Quick"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden print:hidden"
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`${item} ${active ? 'text-bronze' : 'text-ink/60 active:bg-ink/5'}`}
          >
            <Icon className={`h-5 w-5 ${active ? 'scale-110' : ''}`} aria-hidden />
            <span className="max-w-full truncate">{t(`tab.${tab.href}`, undefined, SHORT[tab.href] ?? tab.label)}</span>
          </Link>
        );
      })}
      <button onClick={onMenu} className={`${item} text-ink/60 active:bg-ink/5`} aria-label={t('shell.menu')}>
        <Menu className="h-5 w-5" aria-hidden />
        <span>{t('tab.more', undefined, 'More')}</span>
      </button>
    </nav>
  );
}
