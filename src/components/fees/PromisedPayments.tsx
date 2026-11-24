'use client';

import { Check, HandCoins, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { todayKey, formatPk } from '../../lib/dates';
import { useLang } from '../../lib/i18n';
import { openPromises, promiseReminderText, promiseStatus, type PromiseStatus } from '../../lib/promises';
import { addFeePromise, deleteFeePromise } from '../../lib/promisesStore';
import { waLink } from '../../lib/whatsapp';
import type { Client, FeePromise } from '../../types';
import { pkr } from '../dashboard/widgets';
import { Badge, btn, Card, CardTitle, inputCls } from '../ui';

const TONE: Record<PromiseStatus, 'neutral' | 'bronze' | 'ok' | 'danger'> = { kept: 'ok', overdue: 'danger', today: 'bronze', upcoming: 'neutral' };

export function daysLate(dueOn: string, today: string) {
  return Math.round((Date.parse(today) - Date.parse(dueOn)) / 86400000);
}

export function useStatusLabel() {
  const { t } = useLang();
  return (p: FeePromise, today: string) => {
    const s = promiseStatus(p, today);
    return { s, label: t(`promises.status.${s}`, undefined, s) };
  };
}

/** What the client promised to pay on one case: add, remind on WhatsApp, mark received, delete. */
export function PromisedPayments({
  caseId,
  promises,
  client,
  caseTitle,
  caseNo,
  chamberName,
  onMarkReceived,
  notify,
}: {
  caseId: string;
  promises: FeePromise[] | undefined;
  client?: Client;
  caseTitle: string;
  caseNo?: string;
  chamberName?: string;
  onMarkReceived: (p: FeePromise, note: string) => void;
  notify: (msg: string) => void;
}) {
  const { t } = useLang();
  const label = useStatusLabel();
  const today = todayKey();
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [dueOn, setDueOn] = useState(today);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const open = openPromises({ promises });
  const kept = (promises ?? []).filter((p) => p.keptOn).sort((a, b) => (a.keptOn! < b.keptOn! ? 1 : -1));
  const all = [...open, ...kept];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      addFeePromise(caseId, { amount: Number(amount.replace(/,/g, '')), dueOn, note });
      setAmount('');
      setNote('');
      setAdding(false);
      notify(t('promises.saved', undefined, 'Promise noted'));
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <Card>
      <CardTitle
        action={
          <button className={`${btn.ghost} min-h-11`} onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            <Plus className="h-4 w-4" /> {t('promises.add', undefined, 'Add promise')}
          </button>
        }
      >
        <span className="inline-flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-bronze" /> {t('promises.title', undefined, 'Promised payments')}
        </span>
      </CardTitle>
      <p className="-mt-2 mb-3 text-sm text-ink-soft">{t('promises.intro', undefined, 'Note what the client promised to pay and by when. The app reminds you on that day.')}</p>

      {adding && (
        <form onSubmit={submit} className="mb-4 rounded-xl border border-bronze/30 bg-bronze/5 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t('promises.amount', undefined, 'Amount promised (Rs)')}</span>
              <input className={`${inputCls} min-h-11`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t('promises.dueOn', undefined, 'Promised for')}</span>
              <input type="date" className={`${inputCls} min-h-11`} value={dueOn} onChange={(e) => setDueOn(e.target.value)} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t('promises.note', undefined, 'Note (optional)')}</span>
              <input className={`${inputCls} min-h-11`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('promises.notePh', undefined, 'e.g. after the harvest')} />
            </label>
          </div>
          {err && <p className="mt-2 text-sm text-danger">{err}</p>}
          <div className="mt-3 flex justify-end">
            <button type="submit" className={`${btn.primary} min-h-11`}>
              {t('promises.save', undefined, 'Save promise')}
            </button>
          </div>
        </form>
      )}

      {all.length === 0 ? (
        <p className="text-sm text-ink-soft">{t('promises.empty', undefined, 'No promises noted yet.')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {all.map((p) => {
            const { s, label: chip } = label(p, today);
            const late = s === 'overdue' ? daysLate(p.dueOn, today) : 0;
            const text = promiseReminderText({ clientName: client?.name, caseTitle, caseNo, amount: p.amount, dueOn: p.dueOn, chamberName }, 'both');
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="tabular-nums">{pkr(p.amount)}</span>
                    <Badge tone={TONE[s]}>{chip}</Badge>
                  </p>
                  <p className="text-xs text-ink-soft">
                    {formatPk(p.dueOn)}
                    {late > 0 && ` · ${late === 1 ? t('promises.dayLate', undefined, '1 day late') : t('promises.daysLate', { n: late }, `${late} days late`)}`}
                    {p.keptOn && ` · ${t('promises.keptOn', { date: formatPk(p.keptOn) }, `Kept on ${formatPk(p.keptOn)}`)}`}
                    {p.note && ` · ${p.note}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!p.keptOn && (
                    <>
                      <a href={waLink(client?.phone, text)} target="_blank" rel="noopener noreferrer" className={`${btn.ghost} min-h-11 px-3 text-xs`}>
                        <MessageCircle className="h-4 w-4 text-ok" /> {t('promises.remind', undefined, 'Remind on WhatsApp')}
                      </a>
                      <button onClick={() => onMarkReceived(p, t('promises.receivedNote', undefined, 'Promised payment'))} className={`${btn.primary} min-h-11 px-3 text-xs`}>
                        <Check className="h-4 w-4" /> {t('promises.markReceived', undefined, 'Mark received')}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      deleteFeePromise(caseId, p.id);
                      notify(t('promises.deleted', undefined, 'Promise removed'));
                    }}
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-ink-soft hover:text-danger"
                    aria-label={t('promises.delete', undefined, 'Delete promise')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {open.length > 0 && !client?.phone && <p className="mt-2 text-xs text-ink-soft">{t('promises.noPhone', undefined, 'No WhatsApp number on file; you can pick a chat in WhatsApp.')}</p>}
    </Card>
  );
}
