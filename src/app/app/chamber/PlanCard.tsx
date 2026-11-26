'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { btn, Card, CardTitle } from '../../../components/ui';
import { setChamberPlan } from '../../../lib/cloud/chamber';
import { friendlyError } from '../../../lib/cloud/client';
import { refreshSync } from '../../../lib/cloud/sync';
import { useLang } from '../../../lib/i18n';
import { PLAN_IDS, PLANS, planTooSmall, type Plan } from '../../../lib/plans';

const seatsText = (n: number) => (n === 1 ? 'Just you' : `Up to ${n} people`);

/** The chamber's plan, how many places are used, and (for a senior) switching plans. Free during the preview. */
export function PlanCard({ chamberId, plan, members, senior }: { chamberId: string; plan: Plan; members: number; senior: boolean }) {
  const { t } = useLang();
  const [pick, setPick] = useState<Plan>(plan);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const seats = PLANS[plan].seats;
  const pct = Math.min(100, Math.round((members / seats) * 100));
  const blocked = planTooSmall(pick, members);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      await setChamberPlan(chamberId, pick);
      await refreshSync();
    } catch (x) {
      setErr(friendlyError(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardTitle>{t('plan.title', undefined, 'Your plan')}</CardTitle>
      <p className="font-serif text-2xl font-bold">{t(`plan.${plan}`, undefined, PLANS[plan].name)}</p>
      <p className="text-sm text-ink-soft">{t(`plan.${plan}.tag`, undefined, PLANS[plan].tag)} · {t('plan.free', undefined, 'free during the preview')}</p>
      {seats > 1 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-ink-soft">
            <span>{t('plan.used', { n: members, of: seats }, `${members} of ${seats} places used`)}</span>
            {members >= seats && <span className="font-medium text-danger">{t('plan.full', undefined, 'Full')}</span>}
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={members} aria-valuemin={0} aria-valuemax={seats}>
            <div className={`h-full rounded-full ${members >= seats ? 'bg-danger' : 'bg-bronze'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {senior && (
        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium">{t('plan.change', undefined, 'Change plan')}</p>
          {PLAN_IDS.map((p) => (
            <label
              key={p}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${pick === p ? 'border-bronze bg-bronze/10' : 'border-line hover:border-bronze/40'}`}
            >
              <input type="radio" name="plan" className="accent-bronze" checked={pick === p} onChange={() => setPick(p)} />
              <span className="flex-1">
                <span className="font-semibold">{t(`plan.${p}`, undefined, PLANS[p].name)}</span>
                <span className="block text-xs text-ink-soft">{t(`plan.seats.${p}`, undefined, seatsText(PLANS[p].seats))}</span>
              </span>
              {p === plan && <Check className="h-4 w-4 text-bronze" aria-label={t('plan.current', undefined, 'Current plan')} />}
            </label>
          ))}
          {pick !== plan && blocked && <p className="text-xs text-danger">{blocked}</p>}
          {err && (
            <p role="alert" className="text-xs text-danger">
              {err}
            </p>
          )}
          {pick !== plan && (
            <button type="button" className={`${btn.primary} w-full`} disabled={busy || !!blocked} onClick={() => void save()}>
              {busy ? t('plan.saving', undefined, 'Saving…') : t('plan.switch', { plan: PLANS[pick].name }, `Switch to ${PLANS[pick].name}`)}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
