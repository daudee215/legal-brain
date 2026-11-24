'use client';

/**
 * Public, read-only case status for a client (/status/?t=<token>). Nobody signs in here.
 * Everything shown comes from get_case_status() (supabase/status-links.sql), which returns only the
 * case title and number, court, stage, status, next date — and the last hearing note when the advocate chose to.
 */
import { CalendarClock, Gavel, Languages, Loader2, Scale } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getCaseStatus, type PublicCaseStatus } from '../../lib/cloud/statusLinks';
import { formatPk, formatTime } from '../../lib/dates';
import { LanguageProvider, useLang } from '../../lib/i18n';
import { courtName, daysUntil } from '../../lib/statusLink';

type View = { state: 'loading' } | { state: 'invalid' } | { state: 'network' } | { state: 'ok'; s: PublicCaseStatus };

function hasTime(iso: string) {
  return /T\d{2}:\d{2}/.test(iso);
}

function StatusView() {
  const { t, lang, setLang, dir } = useLang();
  const [view, setView] = useState<View>({ state: 'loading' });

  const load = useCallback(() => {
    setView({ state: 'loading' });
    const token = (new URLSearchParams(window.location.search).get('t') ?? '').trim();
    void getCaseStatus(token).then((r) => setView(r.ok ? { state: 'ok', s: r.status } : { state: r.reason }));
  }, []);
  useEffect(load, [load]);

  return (
    <main dir={dir} className="min-h-dvh bg-cream px-4 py-6 text-ink sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft">
            <Scale className="h-4 w-4 text-bronze" aria-hidden /> {t('status.page.title')}
          </p>
          <button
            type="button"
            onClick={() => setLang(lang === 'ur' ? 'en' : 'ur')}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-paper px-4 text-sm font-medium text-ink transition hover:border-bronze/40"
            aria-label={lang === 'ur' ? 'Switch to English' : 'اردو میں دیکھیں'}
          >
            <Languages className="h-4 w-4" aria-hidden />
            {lang === 'ur' ? 'English' : <span className="urdu">اردو</span>}
          </button>
        </div>

        {view.state === 'loading' && (
          <div className="mt-10 flex items-center justify-center gap-2 text-ink-soft" role="status">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {t('status.page.loading')}
          </div>
        )}

        {view.state === 'invalid' && (
          <div className="mt-8 rounded-3xl border border-line bg-paper p-6 text-center shadow-sm" role="alert">
            <p className="text-lg font-semibold">{t('status.page.invalid')}</p>
          </div>
        )}

        {view.state === 'network' && (
          <div className="mt-8 rounded-3xl border border-line bg-paper p-6 text-center shadow-sm" role="alert">
            <p className="font-medium">{t('status.page.offline')}</p>
            <button type="button" onClick={load} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-bronze px-5 text-sm font-medium text-ivory">
              {t('status.page.retry')}
            </button>
          </div>
        )}

        {view.state === 'ok' && <StatusCard s={view.s} />}

        <footer className="mt-8 space-y-1 text-center text-xs text-ink-soft">
          <p>{t('status.page.disclaimer')}</p>
          {view.state === 'ok' && <p>{t('status.page.contact')}</p>}
        </footer>
      </div>
    </main>
  );
}

function StatusCard({ s }: { s: PublicCaseStatus }) {
  const { t } = useLang();
  const court = courtName(s.courtId);
  const n = s.nextHearing ? daysUntil(s.nextHearing) : null;
  const when =
    n === null ? null : n < 0 ? t('status.page.passed') : n === 0 ? t('status.page.today') : n === 1 ? t('status.page.tomorrow') : t('status.page.inDays', { n });

  return (
    <article className="mt-6 overflow-hidden rounded-3xl bg-paper shadow-xl shadow-night/10">
      <header className="bg-night p-5 text-ivory sm:p-6">
        {s.chamberName && <p className="text-sm text-ivory/70">{s.chamberName}</p>}
        <h1 className="mt-1 text-xl font-bold leading-snug sm:text-2xl">{s.caseTitle}</h1>
        {s.caseNo && (
          <p className="mt-1 text-sm text-ivory/70">
            {t('status.page.caseNo')} <bdi className="font-mono">{s.caseNo}</bdi>
          </p>
        )}
      </header>

      <section className="border-b border-line p-5 sm:p-6" aria-labelledby="next-hearing">
        <p id="next-hearing" className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft">
          <CalendarClock className="h-4 w-4 text-bronze" aria-hidden /> {t('status.page.next')}
        </p>
        {s.nextHearing ? (
          <>
            <p className="mt-2 text-3xl font-bold text-ink" data-testid="next-date">
              <bdi>{formatPk(s.nextHearing)}</bdi>
            </p>
            {hasTime(s.nextHearing) && (
              <p className="mt-1 text-base text-ink-soft">
                <bdi>{formatTime(s.nextHearing)}</bdi>
              </p>
            )}
            {when && <p className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${n !== null && n < 0 ? 'bg-line text-ink-soft' : 'bg-bronze/15 text-bronze'}`}>{when}</p>}
          </>
        ) : (
          <p className="mt-2 text-xl font-semibold text-ink-soft">{t('status.page.notFixed')}</p>
        )}
      </section>

      <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2 sm:p-6">
        {court && (
          <div className="sm:col-span-2">
            <dt className="text-ink-soft">{t('status.page.court')}</dt>
            <dd className="mt-0.5 font-medium">{court}</dd>
          </div>
        )}
        {s.stage && (
          <div>
            <dt className="text-ink-soft">{t('status.page.stage')}</dt>
            <dd className="mt-0.5 font-medium">{s.stage}</dd>
          </div>
        )}
        {s.status && (
          <div>
            <dt className="text-ink-soft">{t('status.page.status')}</dt>
            <dd className="mt-0.5 font-medium">{t(`status.${s.status}`)}</dd>
          </div>
        )}
      </dl>

      {s.lastHearing && (
        <section className="border-t border-line p-5 sm:p-6" data-testid="last-hearing">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft">
            <Gavel className="h-4 w-4 text-bronze" aria-hidden /> {t('status.page.last')} · <bdi>{formatPk(s.lastHearing.date)}</bdi>
          </p>
          <p className="mt-2 whitespace-pre-line font-reading leading-relaxed">{s.lastHearing.proceedings}</p>
        </section>
      )}
    </article>
  );
}

export default function StatusPage() {
  return (
    <LanguageProvider>
      <StatusView />
    </LanguageProvider>
  );
}
