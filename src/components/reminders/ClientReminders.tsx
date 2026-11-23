'use client';

import { BellRing, Check, Copy, MessageCircle, PhoneOff, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPk, formatTime, weekday } from '../../lib/dates';
import { reminderMessage, setReminded, type ReminderRow } from '../../lib/reminders';
import { waLink } from '../../lib/whatsapp';
import { Badge, btn, Card, CardTitle, inputCls } from '../ui';

const PREFS = 'lb.reminderPrefs';

function messageFor(r: ReminderRow, dayKey: string, attend: boolean, bring: string) {
  return reminderMessage({
    clientName: r.client?.name,
    caseTitle: r.case.title,
    caseNo: r.case.caseNo,
    court: r.court.name,
    dayKey,
    time: r.case.nextHearing ? formatTime(r.case.nextHearing) : '',
    courtRoom: r.courtRoom,
    srNo: r.srNo,
    attend,
    bring,
  });
}

/** "Remind clients for tomorrow": one tap per client opens WhatsApp with the message ready. */
export function ClientReminders({ dayKey, rows, canSend }: { dayKey: string; rows: ReminderRow[]; canSend: boolean }) {
  const [attend, setAttend] = useState(true);
  const [bring, setBring] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    try {
      const p = JSON.parse(window.localStorage.getItem(PREFS) ?? '{}') as { attend?: boolean };
      if (typeof p.attend === 'boolean') setAttend(p.attend);
    } catch {
      /* ignore */
    }
  }, []);
  const saveAttend = (v: boolean) => {
    setAttend(v);
    try {
      window.localStorage.setItem(PREFS, JSON.stringify({ attend: v }));
    } catch {
      /* ignore */
    }
  };

  if (rows.length === 0) return null;
  const sent = rows.filter((r) => r.sent).length;
  const nextUp = rows.find((r) => !r.sent && r.phoneOk);
  const label = `${weekday(dayKey)}, ${formatPk(dayKey)}`;

  const send = (r: ReminderRow) => setReminded(r.case.id, dayKey, true);
  const copy = async (r: ReminderRow) => {
    try {
      await navigator.clipboard.writeText(messageFor(r, dayKey, attend, bring));
      setCopied(r.case.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div id="reminders" className="scroll-mt-24">
    <Card className={sent < rows.length ? 'border-bronze/40' : ''}>
      <CardTitle action={<Badge tone={sent === rows.length ? 'ok' : 'bronze'}>{`${sent} of ${rows.length} reminded`}</Badge>}>
        <span className="inline-flex items-center gap-2">
          <BellRing className="h-5 w-5 text-bronze" /> Remind clients · {label}
        </span>
      </CardTitle>
      <p className="-mt-2 mb-3 text-sm text-ink-soft">
        Each button opens WhatsApp with the reminder written in English and Urdu. Press Send there; the app remembers who has been reminded.
      </p>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-bronze transition-all" style={{ width: `${(sent / rows.length) * 100}%` }} />
      </div>

      {canSend && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={attend} onChange={(e) => saveAttend(e.target.checked)} className="h-4 w-4 accent-bronze" />
            Ask clients to attend
          </label>
          <input
            className={inputCls}
            value={bring}
            onChange={(e) => setBring(e.target.value)}
            placeholder="Anything to bring? e.g. original CNIC (optional)"
            aria-label="Anything clients should bring"
          />
          {nextUp ? (
            <a
              href={waLink(nextUp.client?.phone, messageFor(nextUp, dayKey, attend, bring))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => send(nextUp)}
              className={btn.bronze}
            >
              <MessageCircle className="h-4 w-4" /> Send next
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ok">
              <Check className="h-4 w-4" /> {sent === rows.length ? 'All reminded' : 'Rest need a number'}
            </span>
          )}
        </div>
      )}

      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.case.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <span className="w-20 shrink-0 text-sm font-semibold tabular-nums">{r.case.nextHearing ? formatTime(r.case.nextHearing) : '—'}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.client?.name ?? 'No client on file'}</p>
              <Link href={`/app/case/?id=${r.case.id}`} className="block truncate text-xs text-ink-soft hover:text-bronze">
                {r.case.title} · {r.court.shortName}
              </Link>
            </div>
            {r.sent ? (
              <span className="inline-flex items-center gap-2">
                <Badge tone="ok">Reminded</Badge>
                {canSend && (
                  <button onClick={() => setReminded(r.case.id, dayKey, false)} className="rounded p-1 text-ink-soft hover:text-ink" aria-label={`Undo reminder for ${r.client?.name ?? r.case.title}`}>
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </span>
            ) : canSend ? (
              <span className="flex flex-wrap items-center gap-2">
                {r.phoneOk ? (
                  <a
                    href={waLink(r.client?.phone, messageFor(r, dayKey, attend, bring))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => send(r)}
                    className={`${btn.ghost} px-3 py-1.5 text-xs`}
                  >
                    <MessageCircle className="h-4 w-4 text-ok" /> WhatsApp
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-danger">
                    <PhoneOff className="h-3.5 w-3.5" /> No WhatsApp number
                  </span>
                )}
                <button onClick={() => copy(r)} className={`${btn.ghost} px-3 py-1.5 text-xs`}>
                  <Copy className="h-3.5 w-3.5" /> {copied === r.case.id ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => send(r)} className={`${btn.ghost} px-3 py-1.5 text-xs`}>
                  <Check className="h-3.5 w-3.5" /> Mark done
                </button>
              </span>
            ) : (
              <Badge>Not yet</Badge>
            )}
          </li>
        ))}
      </ul>
    </Card>
    </div>
  );
}
