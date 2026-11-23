'use client';

import { FileDown, Languages, Loader2, Receipt } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { todayKey } from '../../lib/dates';
import { downloadBlob } from '../../lib/files';
import { caseStatusPdf, feeReceiptPdf } from '../../lib/pdfDocs';
import { getCase, getChamber, getClient, getCourt, getFeeLedger } from '../../lib/repo';
import { btn } from '../ui';

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-');

function PdfButton({ label, icon, run, className = btn.ghost }: { label: string; icon: React.ReactNode; run: () => Promise<void>; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            await run();
          } catch (e) {
            setErr(e instanceof Error ? e.message : 'Could not make the PDF');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon} {label}
      </button>
      {err && (
        <span role="alert" className="mt-1 text-xs text-danger">
          {err}
        </span>
      )}
    </span>
  );
}

/** Downloads an English fee receipt for one payment in the case's fee ledger. */
export function FeeReceiptButton({ caseId, paymentIndex, label = 'Receipt', className }: { caseId: string; paymentIndex: number; label?: string; className?: string }) {
  return (
    <PdfButton
      label={label}
      className={className}
      icon={<Receipt className="h-4 w-4" />}
      run={async () => {
        const [c, ledger, chamber] = await Promise.all([getCase(caseId), getFeeLedger(caseId), getChamber()]);
        const p = ledger?.payments[paymentIndex];
        if (!c || !p) throw new Error('Payment not found');
        const client = await getClient(c.clientId);
        const receiptNo = `R-${c.id.toUpperCase()}-${String(paymentIndex + 1).padStart(3, '0')}`;
        const bytes = await feeReceiptPdf({
          receiptNo,
          chamberName: chamber.name,
          clientName: client?.name ?? '—',
          caseTitle: c.title,
          caseNo: c.caseNo,
          amount: p.amount,
          mode: p.mode,
          date: p.date,
          note: p.note,
        });
        downloadBlob(bytes, `Fee receipt ${receiptNo}.pdf`);
      }}
    />
  );
}

/** Downloads an English case-status sheet for the client. */
export function CaseStatusButton({ caseId, label = 'Status PDF', className }: { caseId: string; label?: string; className?: string }) {
  return (
    <PdfButton
      label={label}
      className={className}
      icon={<FileDown className="h-4 w-4" />}
      run={async () => {
        const c = await getCase(caseId);
        if (!c) throw new Error('Case not found');
        const [client, court, chamber, fee] = await Promise.all([getClient(c.clientId), getCourt(c.courtId), getChamber(), getFeeLedger(caseId)]);
        const bytes = await caseStatusPdf({
          chamberName: chamber.name,
          clientName: client?.name ?? '—',
          caseTitle: c.title,
          caseNo: c.caseNo,
          court: court?.name ?? '—',
          judge: c.judge,
          stage: c.stage,
          status: c.status,
          nextHearing: c.nextHearing,
          hearings: c.hearings,
          fee: fee ? { agreed: fee.agreed, received: fee.received, outstanding: fee.outstanding } : undefined,
          date: todayKey(),
        });
        downloadBlob(bytes, `Case status - ${safeName(c.caseNo)}.pdf`);
      }}
    />
  );
}

/** Link to the printable English/Urdu status sheet (the Urdu PDF path: print → Save as PDF). */
export function StatusSheetLink({ caseId, className = btn.ghost }: { caseId: string; className?: string }) {
  return (
    <Link href={`/app/print/status/?id=${encodeURIComponent(caseId)}`} className={className}>
      <Languages className="h-4 w-4" /> Print sheet (EN / اردو)
    </Link>
  );
}
