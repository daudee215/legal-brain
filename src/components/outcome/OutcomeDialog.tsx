'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, MessageCircle, Mic, MicOff, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { addDays, formatPk, pktDateKey, pktIso, todayKey } from '../../lib/dates';
import { recordOutcome } from '../../lib/mutations';
import { outcomeMessage, waLink } from '../../lib/whatsapp';
import type { Case, CaseStatus, Client, Court } from '../../types';
import { useRole } from '../shell/RoleProvider';
import { btn, inputCls } from '../ui';

const OUTCOMES = [
  'Adjourned',
  'Arguments heard',
  'Evidence recorded',
  'Reserved',
  'Decided',
  'Disposed',
  'Notice issued',
  'Proxy/adjournment sought',
] as const;
type OutcomeKind = (typeof OUTCOMES)[number];

const STATUS_FOR: Partial<Record<OutcomeKind, CaseStatus>> = { Reserved: 'reserved', Decided: 'decided', Disposed: 'disposed' };
const NEEDS_NO_DATE: OutcomeKind[] = ['Reserved', 'Decided', 'Disposed'];

/* Minimal Web Speech API typing (not in lib.dom for every TS version). */
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecCtor = new () => SpeechRec;

function speechCtor(): SpeechRecCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function timeOf(iso?: string) {
  const m = iso?.match(/T(\d{2}:\d{2})/);
  return m && iso?.endsWith('+05:00') ? m[1] : '09:00';
}

export function OutcomeDialog({ c, court, client, onClose }: { c: Case; court?: Court; client?: Client; onClose: () => void }) {
  const { member } = useRole();
  const today = todayKey();
  // the hearing being recorded: the listed date if it has arrived (or passed), else today
  const [hearingIso] = useState(() => (c.nextHearing && pktDateKey(c.nextHearing) <= today ? c.nextHearing : pktIso(today, '09:00')));
  const [nextTime] = useState(() => timeOf(c.nextHearing));
  const baseKey = pktDateKey(hearingIso) < today ? today : pktDateKey(hearingIso);

  const [kind, setKind] = useState<OutcomeKind | null>(null);
  const [text, setText] = useState('');
  const [nextKey, setNextKey] = useState('');
  const [stage, setStage] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ happened: string; nextDate?: string; result?: string } | null>(null);

  const [speechOk, setSpeechOk] = useState(false);
  const [lang, setLang] = useState<'en-PK' | 'ur-PK'>('en-PK');
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    setSpeechOk(!!speechCtor());
    return () => {
      recRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let said = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) said += e.results[i][0].transcript;
      said = said.trim();
      if (said) setText((t) => (t.trim() ? `${t.trim()} ${said}` : said));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const closing = kind ? NEEDS_NO_DATE.includes(kind) : false;
  const closed = kind === 'Decided' || kind === 'Disposed';

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!kind && !text.trim()) return setError('Pick what happened, or write it.');
    if (!closing && !nextKey) return setError('Pick the next date — or choose Reserved / Decided / Disposed.');
    if (kind === 'Decided' && !result.trim()) return setError('Write the result in one line (e.g. “Suit decreed with costs”).');
    const happened = kind ?? 'Hearing held';
    const proceedings = [kind, text.trim()].filter(Boolean).join(' — ');
    const nextDate = !closed && nextKey ? pktIso(nextKey, nextTime) : undefined;
    try {
      recordOutcome(c.id, {
        date: hearingIso,
        proceedings,
        nextDate,
        stage: stage.trim() || undefined,
        status: kind ? STATUS_FOR[kind] : undefined,
        result: kind === 'Decided' ? result.trim() : undefined,
        authorId: member.id,
      });
      recRef.current?.abort();
      setSaved({ happened, nextDate, result: kind === 'Decided' ? result.trim() : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    }
  };

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition ${on ? 'border-night bg-night text-ivory shadow-sm' : 'border-line bg-paper hover:border-bronze/50 hover:bg-cream'}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-night/50 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Record outcome">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bronze">Record outcome · {formatPk(hearingIso)}</p>
            <h2 className="mt-1 truncate text-xl font-semibold">{c.title}</h2>
            <p className="text-xs text-ink-soft">
              {c.caseNo}
              {court ? ` · ${court.shortName}` : ''} · {c.stage}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-line">
            <X className="h-5 w-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-ok" />
              <div>
                <p className="font-serif text-lg font-semibold">Saved</p>
                <p className="text-sm text-ink-soft">
                  {saved.happened}
                  {saved.nextDate ? ` — next date ${formatPk(saved.nextDate)}` : ''}
                </p>
              </div>
              <a
                href={waLink(
                  client?.phone,
                  outcomeMessage({ clientName: client?.name, caseTitle: c.title, caseNo: c.caseNo, court: court?.shortName, happened: saved.happened, nextDate: saved.nextDate, result: saved.result }),
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btn.bronze} w-full py-3 text-base`}
              >
                <MessageCircle className="h-5 w-5" /> Tell the client on WhatsApp
              </a>
              {!client?.phone && <p className="text-xs text-ink-soft">No phone on file — WhatsApp will ask you to pick the chat.</p>}
              <button type="button" onClick={onClose} className={`${btn.ghost} w-full`}>
                Done
              </button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={save} className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">What happened?</legend>
                <div className="flex flex-wrap gap-2">
                  {OUTCOMES.map((o) => (
                    <button key={o} type="button" aria-pressed={kind === o} onClick={() => setKind(kind === o ? null : o)} className={chip(kind === o)}>
                      {o}
                    </button>
                  ))}
                </div>
              </fieldset>

              {kind === 'Decided' && (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Result</span>
                  <input className={inputCls} value={result} onChange={(e) => setResult(e.target.value)} placeholder="e.g. Suit decreed with costs" autoFocus />
                </label>
              )}

              {!closed && (
                <div>
                  <p className="mb-2 text-sm font-medium">Next date{kind === 'Reserved' ? ' (optional)' : ''}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {[7, 14, 30].map((n) => {
                      const k = addDays(baseKey, n);
                      return (
                        <button key={n} type="button" onClick={() => setNextKey(k)} className={chip(nextKey === k)}>
                          +{n} days
                        </button>
                      );
                    })}
                    <input type="date" aria-label="Next date" className={`${inputCls} w-auto`} min={today} value={nextKey} onChange={(e) => setNextKey(e.target.value)} />
                  </div>
                  {nextKey && <p className="mt-1.5 text-xs text-ink-soft">{formatPk(nextKey)}</p>}
                </div>
              )}

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Stage (optional)</span>
                <input className={inputCls} value={stage} onChange={(e) => setStage(e.target.value)} placeholder={c.stage || 'e.g. Evidence, Final arguments'} />
              </label>

              <div className="text-sm">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">Proceedings</span>
                  {speechOk && (
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border border-line p-0.5 text-xs" role="group" aria-label="Voice language">
                        {(
                          [
                            ['en-PK', 'English'],
                            ['ur-PK', 'اردو'],
                          ] as const
                        ).map(([l, label]) => (
                          <button
                            key={l}
                            type="button"
                            disabled={listening}
                            aria-pressed={lang === l}
                            onClick={() => setLang(l)}
                            className={`rounded-md px-2 py-1 ${lang === l ? 'bg-night text-ivory' : 'text-ink-soft hover:text-ink'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={toggleMic}
                        aria-pressed={listening}
                        aria-label={listening ? 'Stop voice note' : 'Start voice note'}
                        className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${listening ? 'bg-danger text-ivory' : 'bg-bronze/15 text-bronze hover:bg-bronze/25'}`}
                      >
                        {listening && <span className="absolute inset-0 animate-ping rounded-lg bg-danger/40" aria-hidden />}
                        {listening ? <MicOff className="relative h-4 w-4" /> : <Mic className="relative h-4 w-4" />}
                        <span className="relative">{listening ? 'Stop' : 'Voice note'}</span>
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  className={`${inputCls} min-h-24`}
                  dir="auto"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. Respondent's counsel sought time to file reply."
                  aria-label="Proceedings"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className={btn.ghost}>
                  Cancel
                </button>
                <button type="submit" className={btn.primary}>
                  Save outcome
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
