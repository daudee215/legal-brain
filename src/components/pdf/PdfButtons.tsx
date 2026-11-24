'use client';

import { ChevronDown, ClipboardList, FileDown, Languages, Loader2, Receipt } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { letterheadOf } from '../../lib/chamberSettings';
import { todayKey } from '../../lib/dates';
import { downloadBlob } from '../../lib/files';
import { useLang } from '../../lib/i18n';
import { buildPrepInput, hearingPrepPdf } from '../../lib/pdfBriefs';
import { caseStatusPdf, feeReceiptPdf, type PdfLang } from '../../lib/pdfDocs';
import { getDb } from '../../lib/store';
import { getCase, getChamber, getClient, getCourt, getFeeLedger } from '../../lib/repo';
import { btn } from '../ui';

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-');

const PDF_LANGS: PdfLang[] = ['en', 'ur', 'both'];

/**
 * A PDF download button. With `langs`, a small arrow beside it opens a menu (English / اردو / Both); the main
 * button itself prints in the app's current language.
 */
function PdfButton({
  label,
  icon,
  run,
  className = btn.ghost,
  langs = false,
}: {
  label: string;
  icon: React.ReactNode;
  run: (lang: PdfLang) => Promise<void>;
  className?: string;
  langs?: boolean;
}) {
  const { lang: appLang, t } = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const go = async (l: PdfLang) => {
    setOpen(false);
    setBusy(true);
    setErr(null);
    try {
      await run(l);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('pdfur.error', undefined, 'Could not make the PDF'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <span ref={ref} className="relative inline-flex flex-col">
      <span className="inline-flex items-center gap-1">
        <button type="button" className={className} disabled={busy} onClick={() => go(appLang === 'ur' ? 'ur' : 'en')}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon} {label}
        </button>
        {langs && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={t('pdfur.choose', undefined, 'Choose the PDF language')}
            title={t('pdfur.menu', undefined, 'PDF language')}
            className="inline-grid h-7 w-7 min-h-0 place-items-center rounded-md text-ink-soft hover:bg-line/50 hover:text-ink disabled:opacity-50"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </span>
      {open && (
        <span role="menu" aria-label={t('pdfur.menu', undefined, 'PDF language')} className="absolute start-0 top-full z-50 mt-1 flex w-48 flex-col rounded-xl border border-line bg-paper p-1 shadow-xl">
          {PDF_LANGS.map((l) => (
            <button
              key={l}
              role="menuitem"
              type="button"
              onClick={() => go(l)}
              className="rounded-lg px-3 py-2 text-start text-sm text-ink hover:bg-line/50"
            >
              {t(`pdfur.${l}`)}
            </button>
          ))}
        </span>
      )}
      {err && (
        <span role="alert" className="mt-1 text-xs text-danger">
          {err}
        </span>
      )}
    </span>
  );
}

/** " (Urdu)" / " (English-Urdu)" added to the file name of the non-English versions. */
const langSuffix = (lang: PdfLang) => (lang === 'ur' ? ' (Urdu)' : lang === 'both' ? ' (English-Urdu)' : '');

/** Downloads a fee receipt (English, Urdu or both) for one payment in the case's fee ledger. */
export function FeeReceiptButton({ caseId, paymentIndex, label = 'Receipt', className }: { caseId: string; paymentIndex: number; label?: string; className?: string }) {
  return (
    <PdfButton
      label={label}
      className={className}
      langs
      icon={<Receipt className="h-4 w-4" />}
      run={async (lang) => {
        const [c, ledger, chamber] = await Promise.all([getCase(caseId), getFeeLedger(caseId), getChamber()]);
        const p = ledger?.payments[paymentIndex];
        if (!c || !p) throw new Error('Payment not found');
        const client = await getClient(c.clientId);
        const receiptNo = `R-${c.id.toUpperCase()}-${String(paymentIndex + 1).padStart(3, '0')}`;
        const bytes = await feeReceiptPdf({
          receiptNo,
          chamberName: chamber.name,
          ...letterheadOf(getDb()),
          clientName: client?.name ?? '—',
          caseTitle: c.title,
          caseNo: c.caseNo,
          amount: p.amount,
          mode: p.mode,
          date: p.date,
          note: p.note,
          lang,
        });
        downloadBlob(bytes, `Fee receipt ${receiptNo}${langSuffix(lang)}.pdf`);
      }}
    />
  );
}

/** Downloads a case-status sheet for the client (English, Urdu or both). */
export function CaseStatusButton({ caseId, label = 'Status PDF', className }: { caseId: string; label?: string; className?: string }) {
  return (
    <PdfButton
      label={label}
      className={className}
      langs
      icon={<FileDown className="h-4 w-4" />}
      run={async (lang) => {
        const c = await getCase(caseId);
        if (!c) throw new Error('Case not found');
        const [client, court, chamber, fee] = await Promise.all([getClient(c.clientId), getCourt(c.courtId), getChamber(), getFeeLedger(caseId)]);
        const bytes = await caseStatusPdf({
          chamberName: chamber.name,
          ...letterheadOf(getDb()),
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
          lang,
        });
        downloadBlob(bytes, `Case status - ${safeName(c.caseNo)}${langSuffix(lang)}.pdf`);
      }}
    />
  );
}

/**
 * One-page English prep sheet for the next hearing (last hearings, open tasks, diary notes, documents, blank
 * lines to write on). The fee line is printed only when `withFee` is set — pass `can(role, 'billing')`.
 */
export function HearingPrepButton({ caseId, label, className, withFee = false }: { caseId: string; label?: string; className?: string; withFee?: boolean }) {
  const { t } = useLang();
  return (
    <PdfButton
      label={label ?? t('briefs.prepButton', undefined, 'Hearing prep sheet')}
      className={className}
      icon={<ClipboardList className="h-4 w-4" />}
      run={async () => {
        const input = buildPrepInput(getDb(), caseId, { withFee });
        if (!input) throw new Error(t('briefs.prepError', undefined, 'Could not make the prep sheet'));
        downloadBlob(await hearingPrepPdf(input), `Hearing prep - ${safeName(input.caseNo)}.pdf`);
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
