'use client';

import { motion } from 'framer-motion';
import { Copy, Link2, Loader2, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createStatusLink, listStatusLinks, revokeStatusLink, statusLinkProblem, type StatusLink } from '../../lib/cloud/statusLinks';
import { useLang } from '../../lib/i18n';
import { EXPIRY_DAYS, expiryLabel, shareText, statusUrl } from '../../lib/statusLink';
import { waLink } from '../../lib/whatsapp';
import { btn, inputCls } from '../ui';

interface Props {
  chamberId: string;
  chamberName: string;
  caseId: string;
  caseTitle: string;
  clientPhone?: string;
  notify: (msg: string) => void;
  onClose: () => void;
}

/** Make, share and revoke the private read-only status link for one case (cloud chambers only). */
export function StatusLinkDialog({ chamberId, chamberName, caseId, caseTitle, clientPhone, notify, onClose }: Props) {
  const { t, lang } = useLang();
  const [days, setDays] = useState<number>(7);
  const [withNote, setWithNote] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [made, setMade] = useState<{ url: string; days: number } | null>(null);
  const [links, setLinks] = useState<StatusLink[] | null>(null);

  const problem = (e: unknown) => setErr(t(`status.link.${statusLinkProblem(e)}`));

  const refresh = useCallback(() => {
    listStatusLinks(chamberId, caseId)
      .then(setLinks)
      .catch((e) => {
        setLinks([]);
        setErr(t(`status.link.${statusLinkProblem(e)}`));
      });
  }, [chamberId, caseId, t]);
  useEffect(refresh, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const create = async () => {
    setBusy(true);
    setErr('');
    try {
      const token = await createStatusLink(chamberId, caseId, { days, showLastNote: withNote, label });
      setMade({ url: statusUrl(token, window.location.origin), days });
      setLabel('');
      refresh();
    } catch (e) {
      problem(e);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notify(t('status.link.copied'));
    } catch {
      window.prompt(t('status.link.copy'), url);
    }
  };

  const revoke = async (token: string) => {
    setErr('');
    try {
      await revokeStatusLink(token);
      if (made?.url.endsWith(token)) setMade(null);
      notify(t('status.link.revoked'));
      refresh();
    } catch (e) {
      problem(e);
    }
  };

  const message = (url: string, d: number) => shareText({ chamberName, caseTitle, url, days: d }, lang);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-night/50 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="status-link-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="status-link-title" className="text-xl font-semibold">
              {t('status.link.title')}
            </h2>
            <p className="truncate text-xs text-ink-soft">{caseTitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('status.link.close')} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-line">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="flex gap-2 rounded-xl border border-line bg-cream/60 p-3 text-sm text-ink-soft">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-bronze" aria-hidden />
          <span>{t('status.link.explain')}</span>
        </p>

        {made ? (
          <div className="mt-5 space-y-3 rounded-2xl border border-bronze/30 bg-bronze/5 p-4">
            <p className="text-sm font-semibold">{t('status.link.ready')}</p>
            <p className="break-all rounded-lg bg-paper px-3 py-2 font-mono text-xs" dir="ltr">
              {made.url}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void copy(made.url)} className={`${btn.ghost} min-h-11`}>
                <Copy className="h-4 w-4" /> {t('status.link.copy')}
              </button>
              <a href={waLink(clientPhone, message(made.url, made.days))} target="_blank" rel="noopener noreferrer" className={`${btn.bronze} min-h-11`}>
                <MessageCircle className="h-4 w-4" /> {t('status.link.whatsapp')}
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <fieldset>
              <legend className="text-sm font-medium">{t('status.link.expiry')}</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {EXPIRY_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={days === d}
                    onClick={() => setDays(d)}
                    className={`min-h-11 rounded-lg border text-sm font-medium transition ${days === d ? 'border-bronze bg-bronze/10 text-ink' : 'border-line text-ink-soft hover:border-bronze/40'}`}
                  >
                    {t('status.link.days', { n: d })}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                <input type="checkbox" checked={withNote} onChange={(e) => setWithNote(e.target.checked)} className="h-5 w-5 accent-bronze" />
                {t('status.link.includeNote')}
              </label>
              <p className={`ms-8 text-xs ${withNote ? 'font-medium text-danger' : 'text-ink-soft'}`}>{t('status.link.noteWarn')}</p>
            </div>

            <label className="block text-sm font-medium">
              {t('status.link.label')}
              <input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder={t('status.link.labelPh')} className={`${inputCls} mt-1.5 min-h-11`} />
            </label>

            <button type="button" onClick={() => void create()} disabled={busy} className={`${btn.bronze} min-h-11 w-full`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {busy ? t('status.link.creating') : t('status.link.create')}
            </button>
          </div>
        )}

        {err && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {err}
          </p>
        )}

        <div className="mt-6">
          <p className="text-sm font-semibold">{t('status.link.existing')}</p>
          {links === null ? (
            <p className="mt-2 text-sm text-ink-soft">{t('status.link.loading')}</p>
          ) : links.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">{t('status.link.none')}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {links.map((l) => {
                const url = statusUrl(l.token, window.location.origin);
                return (
                  <li key={l.token} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{l.label || <span className="font-mono text-xs" dir="ltr">…{l.token.slice(-6)}</span>}</p>
                      <p className="text-xs text-ink-soft">
                        {expiryLabel(l.expires_at, lang)}
                        {l.show_last_note ? ` · ${t('status.link.withNote')}` : ''}
                      </p>
                    </div>
                    <button type="button" onClick={() => void copy(url)} aria-label={t('status.link.copy')} className="grid h-11 w-11 place-items-center rounded-lg border border-line hover:bg-line">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => void revoke(l.token)} className="min-h-11 rounded-lg border border-danger/40 px-3 text-sm font-medium text-danger hover:bg-danger/10">
                      {t('status.link.revoke')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  );
}
