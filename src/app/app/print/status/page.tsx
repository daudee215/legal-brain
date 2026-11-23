'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { btn, EmptyState } from '../../../../components/ui';
import { Loading } from '../../../../components/ui/Loading';
import { formatPk, formatTime, todayKey } from '../../../../lib/dates';
import { getCase, getChamber, getClient, getCourt, getFeeLedger } from '../../../../lib/repo';
import { useData } from '../../../../lib/useData';
import type { CaseStatus } from '../../../../types';

type Lang = 'en' | 'ur';

const T = {
  en: {
    title: 'Case Status Report',
    client: 'Client',
    case: 'Case',
    caseNo: 'Case No.',
    court: 'Court',
    judge: 'Judge / Bench',
    stage: 'Stage',
    status: 'Status',
    next: 'Next hearing',
    notFixed: 'Not fixed',
    date: 'Report date',
    history: 'Recent hearings',
    noHearings: 'No hearings recorded yet.',
    nextDate: 'Next date',
    fee: 'Fee',
    agreed: 'Agreed',
    received: 'Received',
    outstanding: 'Outstanding',
    rs: (n: number) => `Rs ${n.toLocaleString('en-PK')}`,
    footer: 'Prepared for the client’s information. Dates may change by order of the court.',
    print: 'Print / Save as PDF',
    back: 'Back to case',
    status_: { pending: 'Pending', adjourned: 'Adjourned', reserved: 'Judgment reserved', decided: 'Decided', disposed: 'Disposed of' } as Record<CaseStatus, string>,
  },
  ur: {
    title: 'مقدمے کی صورتحال کی رپورٹ',
    client: 'موکل',
    case: 'مقدمہ',
    caseNo: 'مقدمہ نمبر',
    court: 'عدالت',
    judge: 'جج / بنچ',
    stage: 'مرحلہ',
    status: 'حیثیت',
    next: 'اگلی پیشی',
    notFixed: 'ابھی مقرر نہیں',
    date: 'تاریخِ رپورٹ',
    history: 'حالیہ پیشیاں',
    noHearings: 'ابھی کوئی پیشی درج نہیں۔',
    nextDate: 'اگلی تاریخ',
    fee: 'فیس',
    agreed: 'طے شدہ',
    received: 'وصول شدہ',
    outstanding: 'بقایا',
    rs: (n: number) => `${n.toLocaleString('en-PK')} روپے`,
    footer: 'یہ رپورٹ موکل کی معلومات کے لیے تیار کی گئی ہے۔ عدالت کے حکم سے تاریخیں تبدیل ہو سکتی ہیں۔',
    print: 'پرنٹ / PDF محفوظ کریں',
    back: 'مقدمے پر واپس',
    status_: { pending: 'زیرِ سماعت', adjourned: 'ملتوی', reserved: 'فیصلہ محفوظ', decided: 'فیصلہ ہو گیا', disposed: 'نمٹا دیا گیا' } as Record<CaseStatus, string>,
  },
};

const urDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('ur-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso.length === 10 ? `${iso}T12:00:00+05:00` : iso));
  } catch {
    return formatPk(iso);
  }
};

const URDU_FONT = "var(--urdu, 'Noto Nastaliq Urdu'), 'Noto Nastaliq Urdu', serif";

function Sheet({ id }: { id: string }) {
  const [lang, setLang] = useState<Lang>('en');
  const data = useData(async () => {
    const c = await getCase(id);
    if (!c) return { c: undefined };
    const [client, court, chamber, fee] = await Promise.all([getClient(c.clientId), getCourt(c.courtId), getChamber(), getFeeLedger(c.id)]);
    return { c, client, court, chamber, fee };
  }, [id]);

  if (!data) return <Loading />;
  const { c } = data;
  if (!c) return <EmptyState title="Case not found" body="Open this sheet from a case page." />;
  const { client, court, chamber, fee } = data;
  const t = T[lang];
  const ur = lang === 'ur';
  const d = (iso: string) => (ur ? urDate(iso) : formatPk(iso));
  const hearings = [...c.hearings].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const rows: [string, React.ReactNode][] = [
    [t.client, client?.name ?? '—'],
    [t.case, c.title],
    [t.caseNo, c.caseNo],
    [t.court, court?.name ?? '—'],
    [t.judge, c.judge],
    [t.stage, c.stage],
    [t.status, t.status_[c.status]],
    [t.next, c.nextHearing ? `${d(c.nextHearing)}${c.nextHearing.includes('T') ? ` · ${formatTime(c.nextHearing)}` : ''}` : t.notFixed],
    [t.date, d(todayKey())],
  ];

  return (
    <>
      <style>{`@media print { @page { size: A4; margin: 16mm; } .status-sheet { padding: 0 !important; } }`}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/case/?id=${c.id}`} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {T.en.back}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-line bg-paper p-1" role="group" aria-label="Language">
            {(['en', 'ur'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`rounded-lg px-4 py-1.5 text-sm ${lang === l ? 'bg-night text-ivory' : 'hover:bg-line/50'}`}
                style={l === 'ur' ? { fontFamily: URDU_FONT } : undefined}
              >
                {l === 'en' ? 'EN' : 'اردو'}
              </button>
            ))}
          </div>
          <button type="button" className={btn.bronze} onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> <span style={ur ? { fontFamily: URDU_FONT } : undefined}>{t.print}</span>
          </button>
        </div>
      </div>

      <article
        lang={ur ? 'ur' : 'en'}
        dir={ur ? 'rtl' : 'ltr'}
        className="print-area status-sheet mx-auto max-w-[780px] rounded-2xl border border-line bg-white p-8 text-ink shadow-sm sm:p-12"
        style={ur ? { fontFamily: URDU_FONT, lineHeight: 2.1 } : undefined}
      >
        <header className="border-b-2 border-bronze pb-4 text-center">
          <p className="font-serif text-2xl font-bold" dir="auto" style={ur ? { fontFamily: URDU_FONT } : undefined}>
            {chamber?.name}
          </p>
          <h1 className="mt-1 text-lg font-semibold text-bronze" style={ur ? { fontFamily: URDU_FONT } : undefined}>
            {t.title}
          </h1>
        </header>

        <dl className="mt-6 divide-y divide-line text-[15px]">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[150px_1fr] gap-4 py-2">
              <dt className="font-semibold text-ink-soft">{k}</dt>
              <dd dir="auto" className="min-w-0 break-words">
                {v}
              </dd>
            </div>
          ))}
        </dl>

        {fee && (
          <section className="mt-6">
            <h2 className="mb-2 text-base font-bold" style={ur ? { fontFamily: URDU_FONT } : undefined}>
              {t.fee}
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(
                [
                  [t.agreed, fee.agreed],
                  [t.received, fee.received],
                  [t.outstanding, fee.outstanding],
                ] as const
              ).map(([k, n]) => (
                <div key={k} className="rounded-xl border border-line p-3">
                  <p className="text-xs text-ink-soft">{k}</p>
                  <p className="font-serif text-lg font-bold">{t.rs(n)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-2 text-base font-bold" style={ur ? { fontFamily: URDU_FONT } : undefined}>
            {t.history}
          </h2>
          {hearings.length === 0 ? (
            <p className="text-sm text-ink-soft">{t.noHearings}</p>
          ) : (
            <ol className="space-y-3">
              {hearings.map((h, i) => (
                <li key={`${h.date}-${i}`} className="break-inside-avoid border-s-2 border-bronze/40 ps-4">
                  <p className="text-sm font-semibold text-ink-soft">{d(h.date)}</p>
                  <p dir="auto" className="text-[15px]">
                    {h.proceedings}
                  </p>
                  {h.nextDate && (
                    <p className="text-sm text-ink-soft">
                      {t.nextDate}: {d(h.nextDate)}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        <footer className="mt-10 border-t border-line pt-3 text-center text-xs text-ink-soft">{t.footer}</footer>
      </article>
    </>
  );
}

function Inner() {
  const id = useSearchParams().get('id') ?? '';
  return <Sheet key={id} id={id} />;
}

export default function PrintStatusPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Inner />
    </Suspense>
  );
}
