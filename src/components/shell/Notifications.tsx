'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CalendarClock, CheckCheck, Gavel, Info, Newspaper } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatPk } from '../../lib/dates';
import { listNotifications } from '../../lib/repo';
import { useData } from '../../lib/useData';
import type { AppNotification } from '../../types';

const KIND_ICON: Record<AppNotification['kind'], typeof Bell> = {
  hearing: CalendarClock,
  judgment: Gavel,
  news: Newspaper,
  system: Info,
};

export function NotificationsMenu() {
  const items = useData(() => listNotifications(), []);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isRead = (n: AppNotification) => n.read || readIds.has(n.id);
  const unread = (items ?? []).filter((n) => !isRead(n)).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-ink transition hover:bg-line"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
      >
        <Bell className={`h-5 w-5 ${unread ? 'origin-top animate-wiggle' : ''}`} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-cream">
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] origin-top-right overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl shadow-night/20"
            role="region"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-serif text-base font-semibold">Notifications</p>
              <button
                type="button"
                disabled={!unread}
                onClick={() => setReadIds(new Set((items ?? []).map((n) => n.id)))}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-bronze transition hover:bg-bronze/10 disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            </div>
            <ul className="scrollbar-thin max-h-[60vh] overflow-y-auto">
              {(items ?? []).map((n, i) => {
                const Icon = KIND_ICON[n.kind];
                const read = isRead(n);
                const body = (
                  <>
                    <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${read ? 'bg-line/60 text-ink-soft' : 'bg-bronze/15 text-bronze'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm leading-snug ${read ? 'text-ink-soft' : 'font-medium text-ink'}`}>{n.title}</span>
                      <span className="mt-0.5 block text-xs text-ink-soft">{formatPk(n.date)}</span>
                    </span>
                    {!read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-bronze" aria-label="Unread" />}
                  </>
                );
                return (
                  <motion.li key={n.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => {
                          setReadIds((s) => new Set(s).add(n.id));
                          setOpen(false);
                        }}
                        className="flex gap-3 border-b border-line/60 px-4 py-3 transition hover:bg-bronze/5"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="flex gap-3 border-b border-line/60 px-4 py-3">{body}</div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
            <Link
              href="/app/news/?tab=notifications"
              onClick={() => setOpen(false)}
              className="block bg-cream/60 px-4 py-2.5 text-center text-xs font-medium text-bronze hover:bg-cream"
            >
              View all notifications
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
