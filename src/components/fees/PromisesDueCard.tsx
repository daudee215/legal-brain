'use client';

import { HandCoins, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { formatPk, todayKey } from '../../lib/dates';
import { useLang } from '../../lib/i18n';
import { can } from '../../lib/permissions';
import { promiseReminderText } from '../../lib/promises';
import { promisesDue } from '../../lib/promisesStore';
import { getDb } from '../../lib/store';
import { useData } from '../../lib/useData';
import { waLink } from '../../lib/whatsapp';
import { pkr } from '../dashboard/widgets';
import { useRole } from '../shell/RoleProvider';
import { Badge, btn, Card, CardTitle } from '../ui';
import { daysLate, useStatusLabel } from './PromisedPayments';

/** Today screen: clients who promised to pay today or earlier. Hidden for non-billing roles and when nothing is due. */
export function PromisesDueCard() {
  const { role } = useRole();
  const { t } = useLang();
  const label = useStatusLabel();
  const seeFees = can(role, 'billing');
  const data = useData(async () => ({ rows: seeFees ? promisesDue() : [], chamber: getDb().chamber.name }), [seeFees]);
  if (!seeFees || !data || data.rows.length === 0) return null;
  const today = todayKey();

  return (
    <Card className="border-bronze/40">
      <CardTitle action={<Badge tone="bronze">{data.rows.length}</Badge>}>
        <span className="inline-flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-bronze" /> {t('promises.today.title', undefined, 'Promised payments due')}
        </span>
      </CardTitle>
      <p className="-mt-2 mb-3 text-sm text-ink-soft">{t('promises.today.sub', undefined, 'Clients who promised to pay today or earlier. Send a polite reminder in English and Urdu.')}</p>
      <ul className="divide-y divide-line">
        {data.rows.map(({ promise: p, case: c, client }) => {
          const { s, label: chip } = label(p, today);
          const late = s === 'overdue' ? daysLate(p.dueOn, today) : 0;
          const text = promiseReminderText({ clientName: client?.name, caseTitle: c.title, caseNo: c.caseNo, amount: p.amount, dueOn: p.dueOn, chamberName: data.chamber }, 'both');
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <div className="min-w-0 flex-1 basis-48">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <span>{client?.name ?? c.title}</span>
                  <span className="tabular-nums">{pkr(p.amount)}</span>
                  <Badge tone={s === 'overdue' ? 'danger' : 'bronze'}>{chip}</Badge>
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {c.title} · {formatPk(p.dueOn)}
                  {late > 0 && ` · ${late === 1 ? t('promises.dayLate', undefined, '1 day late') : t('promises.daysLate', { n: late }, `${late} days late`)}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={waLink(client?.phone, text)} target="_blank" rel="noopener noreferrer" className={`${btn.ghost} min-h-11 px-3 text-xs`}>
                  <MessageCircle className="h-4 w-4 text-ok" /> {t('promises.remind', undefined, 'Remind on WhatsApp')}
                </a>
                <Link href={`/app/case/?id=${c.id}&tab=fees`} className={`${btn.ghost} min-h-11 px-3 text-xs`}>
                  {t('promises.openCase', undefined, 'Open case')}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
