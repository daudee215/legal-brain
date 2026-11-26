'use client';

import { FileBarChart, FileDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRole } from '../shell/RoleProvider';
import { btn, Card, CardTitle, inputCls } from '../ui';
import { downloadBlob } from '../../lib/files';
import { useLang } from '../../lib/i18n';
import { buildReportInput, currentMonth, isMonthKey, practiceReportPdf } from '../../lib/pdfBriefs';
import { can } from '../../lib/permissions';
import { getDb } from '../../lib/store';

/** One PDF for the month (lives on the Dashboard). */
export function MonthlyReport({ onMsg, className = '' }: { onMsg: (m: string) => void; className?: string }) {
  const { t } = useLang();
  const { role } = useRole();
  const seeFees = can(role, 'billing');
  const [month, setMonth] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setMonth(currentMonth()), []);

  return (
    <Card className={className}>
      <CardTitle>
        <span className="inline-flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-bronze" /> {t('briefs.reportTitle', undefined, 'Monthly practice report')}
        </span>
      </CardTitle>
      <p className="mb-4 text-sm text-ink-soft">
        {t('briefs.reportHint', undefined, 'One PDF for the month: new cases, hearings held, cases decided, and what is pending now by category and court.')}
      </p>
      {seeFees && <p className="mb-4 text-xs text-ink-soft">{t('briefs.reportFeesNote', undefined, 'This report also lists fees received in the month and the total still outstanding.')}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm">
          <span className="mb-1 block font-medium">{t('briefs.month', undefined, 'Month')}</span>
          <input type="month" className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <button
          type="button"
          className={btn.bronze}
          disabled={busy}
          onClick={async () => {
            if (!isMonthKey(month)) return onMsg(t('briefs.pickMonth', undefined, 'Choose a month first'));
            setBusy(true);
            try {
              const bytes = await practiceReportPdf(buildReportInput(getDb(), month, { withFees: seeFees }));
              downloadBlob(bytes, `Practice report ${month}.pdf`);
              onMsg(t('briefs.reportDone', undefined, 'Report downloaded'));
            } catch {
              onMsg(t('briefs.reportError', undefined, 'Could not make the report'));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} {t('briefs.download', undefined, 'Download report PDF')}
        </button>
      </div>
    </Card>
  );
}
