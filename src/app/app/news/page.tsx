'use client';

import { Bell, Gavel, Landmark, Newspaper, Settings } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Badge, btn, Card, DemoBadge, EmptyState, PageHeader } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { formatPk, formatTime } from '../../../lib/dates';
import type { AppNotification } from '../../../types';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { useData } from '../../../lib/useData';

const ICON = { hearing: Gavel, judgment: Landmark, news: Newspaper, system: Settings } as const;

function NewsInnerBody({ db }: { db: Snapshot }) {
  const params = useSearchParams();
  const [tab, setTab] = useState<'news' | 'notifications'>('news');
  const [notes, setNotes] = useState<AppNotification[]>(() => [...db.notifications].sort((a, b) => (a.date < b.date ? 1 : -1)));
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setTab(params.get('tab') === 'notifications' ? 'notifications' : 'news');
  }, [params]);

  if (!mounted) return <Loading />;
  const unread = notes.filter((n) => !n.read).length;
  const news = [...db.news].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <PageHeader title="Legal News & Notifications" subtitle="Hearing reminders, new judgments and what's happening in the profession." />
      <div className="mb-6 flex gap-1 rounded-xl border border-line bg-paper p-1 text-sm sm:w-fit">
        {(['news', 'notifications'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={`flex-1 rounded-lg px-4 py-1.5 ${tab === t ? 'bg-ink text-cream' : 'hover:bg-line/50'}`}>
            {t === 'news' ? 'News' : `Notifications${unread ? ` (${unread})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'news' ? (
        <div className="space-y-4">
          <DemoBadge text="Illustrative news items" />
          {news.map((n) => (
            <Card key={n.id}>
              <p className="text-xs text-ink-soft">
                {formatPk(n.date)} · {n.source}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{n.title}</h2>
              <p className="mt-1 text-sm text-ink-soft">{n.summary}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink-soft">{unread ? `${unread} unread` : 'All read'}</p>
            <button className={btn.ghost} disabled={!unread} onClick={() => setNotes(notes.map((n) => ({ ...n, read: true })))}>
              Mark all read
            </button>
          </div>
          {notes.length === 0 ? (
            <EmptyState title="No notifications" />
          ) : (
            <ul className="divide-y divide-line">
              {notes.map((n) => {
                const Icon = ICON[n.kind] ?? Bell;
                const body = (
                  <div className="flex items-start gap-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream">
                      <Icon className="h-4 w-4 text-bronze" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.read ? '' : 'font-semibold'}`}>{n.title}</p>
                      <p className="text-xs text-ink-soft">
                        {formatPk(n.date)}, {formatTime(n.date)} · {n.kind}
                      </p>
                    </div>
                    {!n.read && <Badge tone="danger">New</Badge>}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} className="block hover:bg-cream/40" onClick={() => setNotes(notes.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}>
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-xs text-ink-soft">Phase 4 adds email and WhatsApp reminders the evening before each hearing.</p>
        </Card>
      )}
    </>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewsInner />
    </Suspense>
  );
}

function NewsInner() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <NewsInnerBody db={db} />;
}
