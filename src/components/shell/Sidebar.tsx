'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can, ROLE_LABEL } from '../../lib/permissions';
import { Logo } from './Logo';
import { isActive, NAV } from './nav';
import { useRole } from './RoleProvider';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? '/app/';
  const { role, member } = useRole();
  const items = NAV.filter((n) => !n.action || can(role, n.action));

  return (
    <nav aria-label="Main" className="flex h-full flex-col bg-night text-ivory">
      <div className="px-5 pb-4 pt-5">
        <Link href="/app/" onClick={onNavigate}>
          <Logo light />
        </Link>
      </div>
      <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-bronze-soft/80">Platform</p>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {items.map((n) => {
          const active = isActive(pathname, n.href);
          const Icon = n.icon;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-ivory font-semibold text-night' : 'text-ivory/80 hover:bg-white/10 hover:text-ivory'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-bronze' : ''}`} aria-hidden />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 px-5 py-4 text-sm">
        <p className="font-medium">Adv. {member.name}</p>
        <p className="text-xs text-ivory/60">
          {ROLE_LABEL[role]} · Khan &amp; Associates
        </p>
      </div>
    </nav>
  );
}
