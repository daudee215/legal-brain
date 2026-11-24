'use client';

import { CalendarPlus, Calculator, FileBarChart, FileDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRole } from '../../../components/shell/RoleProvider';
import { btn, Card, CardTitle, inputCls, Notice, PageHeader } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { formatPk, todayKey, weekday } from '../../../lib/dates';
import { downloadBlob } from '../../../lib/files';
import { useLang } from '../../../lib/i18n';
import { limitationDeadline, REMEDIES } from '../../../lib/limitation';
import { buildReportInput, currentMonth, isMonthKey, practiceReportPdf } from '../../../lib/pdfBriefs';
import { can } from '../../../lib/permissions';
import { getDb } from '../../../lib/store';

export default function ToolsPage() {
  const toast = useToast();
  const [order, setOrder] = useState('');
  const [remedy, setRemedy] = useState(REMEDIES[1].id);
  const [copy, setCopy] = useState('0');
  const { t } = useLang();
  const { role } = useRole();
  const seeFees = can(role, 'billing');
  const [month, setMonth] = useState('');
  const [repBusy, setRepBusy] = useState(false);
  useEffect(() => {
    setOrder(todayKey());
    setMonth(currentMonth());
  }, []);

  const r = REMEDIES.find((x) => x.id === remedy)!;
  const copyDays = Math.max(0, Math.min(365, Number(copy) || 0));
  const result = /^\d{4}-\d{2}-\d{2}$/.test(order) ? limitationDeadline(order, remedy, copyDays) : null;

  return (
    <>
      <PageHeader title="Tools" subtitle="Quick calculators for daily practice." />
      <Notice>
        Demo values — the limitation periods below must be verified by an advocate before relying on them. Court-fee calculator and more tools come in later
        phases.
      </Notice>
      <Card className="max-w-3xl">
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Calculator className="h-5 w-5 text-bronze" /> Limitation calculator
          </span>
        </CardTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Remedy</span>
            <select className={inputCls} value={remedy} onChange={(e) => setRemedy(e.target.value)}>
              {REMEDIES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label} — {x.days} days
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-ink-soft">{r.basis}</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Date of order / decree</span>
            <input type="date" className={inputCls} value={order} onChange={(e) => setOrder(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Days spent obtaining copies (s.12)</span>
            <input type="number" min={0} max={365} className={inputCls} value={copy} onChange={(e) => setCopy(e.target.value)} />
          </label>
        </div>
        {result && (
          <div className="mt-6 rounded-2xl bg-night p-6 text-ivory">
            <p className="text-sm text-ivory/70">Last date to file</p>
            <p className="mt-1 font-serif text-4xl font-bold text-ivory">{formatPk(result.deadlineKey)}</p>
            <p className="mt-1 text-sm text-ivory/70">
              {weekday(result.deadlineKey)} · {result.daysTotal} days from {formatPk(order)}
            </p>
            <p className="mt-3 text-xs text-ivory/60">If the last day falls on a court holiday, it may be filed on the next working day (s.4 Limitation Act).</p>
            <button className={`${btn.bronze} mt-4`} onClick={() => toast.show('Added to diary in demo only')}>
              <CalendarPlus className="h-4 w-4" /> Add to diary
            </button>
          </div>
        )}
      </Card>
      <Card className="mt-6 max-w-3xl">
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-bronze" /> {t('briefs.reportTitle', undefined, 'Monthly practice report')}
          </span>
        </CardTitle>
        <p className="mb-4 text-sm text-ink-soft">
          {t('briefs.reportHint', undefined, 'One PDF for the month: new cases, hearings held, cases decided, and what is pending now by category and court.')}
        </p>
        {seeFees && (
          <p className="mb-4 text-xs text-ink-soft">{t('briefs.reportFeesNote', undefined, 'This report also lists fees received in the month and the total still outstanding.')}</p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm">
            <span className="mb-1 block font-medium">{t('briefs.month', undefined, 'Month')}</span>
            <input type="month" className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <button
            type="button"
            className={btn.bronze}
            disabled={repBusy}
            onClick={async () => {
              if (!isMonthKey(month)) return toast.show(t('briefs.pickMonth', undefined, 'Choose a month first'));
              setRepBusy(true);
              try {
                const bytes = await practiceReportPdf(buildReportInput(getDb(), month, { withFees: seeFees }));
                downloadBlob(bytes, `Practice report ${month}.pdf`);
                toast.show(t('briefs.reportDone', undefined, 'Report downloaded'));
              } catch {
                toast.show(t('briefs.reportError', undefined, 'Could not make the report'));
              } finally {
                setRepBusy(false);
              }
            }}
          >
            {repBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} {t('briefs.download', undefined, 'Download report PDF')}
          </button>
        </div>
      </Card>
      {toast.node}
    </>
  );
}
