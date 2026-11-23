'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CalendarClock, Check, FileText, Gavel, Mic, MicOff, NotebookPen, Scale, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRole } from '../../../components/shell/RoleProvider';
import { Loading } from '../../../components/ui/Loading';
import { addDays, formatPk, formatTime, pktIso, todayKey } from '../../../lib/dates';
import { DICT, type DictKey } from '../../../lib/i18n-dict';
import { addDiary, addPayment, addTask, recordOutcome } from '../../../lib/mutations';
import { can } from '../../../lib/permissions';
import { hearingsOn, listCases, listClients, listMembers, type HearingRow } from '../../../lib/repo';
import { nextCourtDay, remindersFor } from '../../../lib/reminders';
import { useData } from '../../../lib/useData';
import type { FeePayment } from '../../../types';

/*
 * Munshi Mode — the clerk's phone screen on a court day. Urdu-first (big Urdu label,
 * small English line under it) regardless of the app language, because that is how the
 * munshi reads it; the page itself is always right-to-left.
 */

type Sheet = { kind: 'hearing'; row: HearingRow } | { kind: 'copy' } | { kind: 'fee' } | { kind: 'note' } | null;
type HearingStep = 'choose' | 'adjourned' | 'heard';
const MODES: FeePayment['mode'][] = ['Cash', 'Cheque', 'Bank transfer', 'Online'];

const ur = (k: DictKey, n?: number) => DICT[k].ur.replace('{n}', String(n ?? ''));
const en = (k: DictKey, n?: number) => DICT[k].en.replace('{n}', String(n ?? ''));

/** Urdu label with the English underneath. */
function Bi({ k, n, big = false }: { k: DictKey; n?: number; big?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col items-start text-start">
      <span lang="ur" className={`urdu ${big ? 'text-xl font-bold' : 'text-lg font-semibold'}`}>
        {ur(k, n)}
      </span>
      <span lang="en" dir="ltr" className="font-sans text-xs font-medium leading-tight opacity-70">
        {en(k, n)}
      </span>
    </span>
  );
}

const bigBtn =
  'flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-start shadow-sm transition active:scale-[0.98] disabled:opacity-50';
const tone = {
  primary: `${bigBtn} bg-night text-ivory hover:bg-night-2`,
  bronze: `${bigBtn} bg-bronze text-ivory hover:bg-bronze/90`,
  plain: `${bigBtn} border-2 border-line bg-paper text-ink hover:border-bronze/50`,
};
const fieldCls =
  'min-h-14 w-full rounded-2xl border-2 border-line bg-paper px-4 text-lg text-ink outline-none focus:border-bronze focus:ring-4 focus:ring-bronze/15';

/* Minimal Web Speech API typing. */
interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
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

function SheetFrame({ title, onClose, children }: { title: DictKey; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button className="absolute inset-0 bg-night/60 backdrop-blur-sm" aria-label={en('munshi.cancel')} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={en(title)}
        dir="rtl"
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-5 pb-8 shadow-2xl sm:rounded-3xl"
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <Bi k={title} big />
          <button onClick={onClose} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-line/70 text-ink" aria-label={en('munshi.cancel')}>
            <X className="h-6 w-6" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function NextDatePicker({ baseKey, value, onChange }: { baseKey: string; value: string; onChange: (k: string) => void }) {
  return (
    <div className="space-y-3">
      <Bi k="munshi.nextDate" />
      <div className="grid grid-cols-3 gap-2">
        {[7, 14, 30].map((n) => {
          const k = addDays(baseKey, n);
          const on = value === k;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(k)}
              aria-pressed={on}
              className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 transition active:scale-[0.97] ${
                on ? 'border-bronze bg-bronze text-ivory' : 'border-line bg-paper text-ink hover:border-bronze/50'
              }`}
            >
              <span lang="ur" className="urdu text-lg font-bold">
                {ur('munshi.plusDays', n)}
              </span>
              <span dir="ltr" className="font-sans text-xs opacity-80">
                {formatPk(k)}
              </span>
            </button>
          );
        })}
      </div>
      <label className="block">
        <span className="mb-1 block">
          <Bi k="munshi.pickDate" />
        </span>
        <input type="date" dir="ltr" min={baseKey} value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} />
      </label>
    </div>
  );
}

function CasePicker({ cases, value, onChange }: { cases: { id: string; title: string; caseNo: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block">
        <Bi k="munshi.case" />
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} dir="ltr">
        <option value="">{`${ur('munshi.chooseCase')} — ${en('munshi.chooseCase')}`}</option>
        {cases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title} ({c.caseNo})
          </option>
        ))}
      </select>
    </label>
  );
}

export default function MunshiPage() {
  const { role, member } = useRole();
  const today = todayKey();
  const data = useData(
    async () => {
      const day = nextCourtDay(today);
      const reminders = remindersFor(day, await hearingsOn(day), await listClients());
      return { hearings: await hearingsOn(today), cases: await listCases(), members: await listMembers(), remindLeft: reminders.filter((r) => !r.sent).length };
    },
    [today],
  );

  const [sheet, setSheet] = useState<Sheet>(null);
  const [step, setStep] = useState<HearingStep>('choose');
  const [nextKey, setNextKey] = useState('');
  const [caseId, setCaseId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<FeePayment['mode']>('Cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    setSpeechOk(!!speechCtor());
    return () => {
      recRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 2600);
    return () => {
      window.clearTimeout(id);
    };
  }, [toast]);

  const open = (s: Exclude<Sheet, null>) => {
    setSheet(s);
    setStep('choose');
    setNextKey('');
    setCaseId(s.kind === 'hearing' ? s.row.case.id : '');
    setAmount('');
    setMode('Cash');
    setNote('');
    setError('');
  };
  const close = () => {
    recRef.current?.stop();
    setSheet(null);
  };
  const done = () => {
    setToast(`${ur('munshi.saved')} · ${en('munshi.saved')}`);
    close();
  };
  const attempt = (fn: () => void) => {
    setError('');
    try {
      fn();
      done();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!data) return <Loading />;
  const clerkId = data.members.find((m) => m.role === 'clerk')?.id ?? member.id;
  const showFee = can(role, 'billing');

  const saveHearing = (row: HearingRow, kind: 'adjourned' | 'heard' | 'reserved') => {
    const hearingIso = row.case.nextHearing ?? pktIso(today);
    const procKey: DictKey = kind === 'adjourned' ? 'munshi.proc.adjourned' : kind === 'heard' ? 'munshi.proc.heard' : 'munshi.proc.reserved';
    if (kind !== 'reserved' && !nextKey) return setError(`${ur('munshi.nextDate')}? · Pick the next date`);
    const time = row.case.nextHearing?.match(/T(\d{2}:\d{2})/)?.[1] ?? '09:00';
    attempt(() =>
      recordOutcome(row.case.id, {
        date: hearingIso,
        proceedings: `${en(procKey)} (${ur(procKey)})`,
        nextDate: kind === 'reserved' ? undefined : pktIso(nextKey, time),
        status: kind === 'reserved' ? 'reserved' : kind === 'adjourned' ? 'adjourned' : undefined,
        authorId: member.id,
      }),
    );
  };

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'ur-PK';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let said = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) said += e.results[i][0].transcript;
      said = said.trim();
      if (said) setNote((t) => (t.trim() ? `${t.trim()} ${said}` : said));
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

  const errorBox = error ? (
    <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-base font-medium text-danger">
      {error}
    </p>
  ) : null;

  return (
    <div dir="rtl" className="mx-auto w-full max-w-xl space-y-7 pb-10">
      <header className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-night text-ivory">
          <Scale className="h-7 w-7" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 lang="ur" className="urdu text-3xl font-bold text-ink">
            {ur('munshi.title')}
          </h1>
          <p dir="ltr" className="text-start text-sm text-ink-soft">
            {en('munshi.subtitle')} · {formatPk(today)}
          </p>
        </div>
      </header>

      <section aria-labelledby="munshi-today">
        <div className="mb-3 flex items-end justify-between gap-2">
          <h2 id="munshi-today" className="m-0">
            <Bi k="munshi.today" big />
          </h2>
          <span className="rounded-full bg-bronze px-3 py-1 font-sans text-lg font-bold text-ivory">{data.hearings.length}</span>
        </div>
        {data.hearings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-line bg-paper p-6 text-center text-ink-soft">
            <Bi k="munshi.none" />
          </div>
        ) : (
          <>
            <p lang="ur" className="urdu mb-2 text-sm text-ink-soft">
              {ur('munshi.tapCase')}
            </p>
            <ul className="space-y-3">
              {data.hearings.map((row) => (
                <li key={row.case.id}>
                  <button
                    type="button"
                    onClick={() => open({ kind: 'hearing', row })}
                    className="w-full rounded-2xl border-2 border-line bg-paper p-4 text-start shadow-sm transition hover:border-bronze/60 active:scale-[0.99]"
                  >
                    <div dir="ltr" className="flex items-start justify-between gap-3 text-left">
                      <div className="min-w-0">
                        <p className="font-sans text-lg font-bold leading-snug text-ink">{row.case.title}</p>
                        <p className="font-sans text-sm text-ink-soft">{row.case.caseNo}</p>
                        <p className="mt-1 font-sans text-sm font-medium text-ink">
                          {row.court.shortName}
                          {row.entry?.srNo != null && <> · Sr. {row.entry.srNo}</>}
                        </p>
                      </div>
                      {row.case.nextHearing && (
                        <span className="shrink-0 rounded-xl bg-night px-3 py-2 font-sans text-base font-bold text-ivory">{formatTime(row.case.nextHearing)}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="munshi-quick" className="space-y-3">
        <h2 id="munshi-quick" className="m-0">
          <Bi k="munshi.quick" big />
        </h2>
        {data.remindLeft > 0 && (
          <Link href="/app/today/#reminders" className={tone.bronze}>
            <BellRing className="h-7 w-7 shrink-0" aria-hidden />
            <Bi k="munshi.remind" n={data.remindLeft} />
          </Link>
        )}
        <button type="button" onClick={() => open({ kind: 'copy' })} className={tone.primary}>
          <FileText className="h-7 w-7 shrink-0" aria-hidden />
          <Bi k="munshi.copyApplied" />
        </button>
        {showFee && (
          <button type="button" onClick={() => open({ kind: 'fee' })} className={tone.bronze}>
            <Wallet className="h-7 w-7 shrink-0" aria-hidden />
            <Bi k="munshi.feeReceived" />
          </button>
        )}
        <button type="button" onClick={() => open({ kind: 'note' })} className={tone.plain}>
          <NotebookPen className="h-7 w-7 shrink-0 text-bronze" aria-hidden />
          <Bi k="munshi.note" />
        </button>
      </section>

      <AnimatePresence>
        {sheet?.kind === 'hearing' && (
          <SheetFrame key="hearing" title={step === 'heard' ? 'munshi.heard' : step === 'adjourned' ? 'munshi.dateGiven' : 'munshi.today'} onClose={close}>
            <div dir="ltr" className="mb-4 rounded-2xl bg-paper p-3 text-left">
              <p className="font-sans text-base font-bold text-ink">{sheet.row.case.title}</p>
              <p className="font-sans text-sm text-ink-soft">
                {sheet.row.case.caseNo} · {sheet.row.court.shortName}
              </p>
            </div>
            {step === 'choose' ? (
              <div className="space-y-3">
                <button type="button" onClick={() => setStep('adjourned')} className={tone.primary}>
                  <CalendarClock className="h-7 w-7 shrink-0" aria-hidden />
                  <Bi k="munshi.dateGiven" big />
                </button>
                <button type="button" onClick={() => saveHearing(sheet.row, 'reserved')} className={tone.bronze}>
                  <Gavel className="h-7 w-7 shrink-0" aria-hidden />
                  <Bi k="munshi.reserved" big />
                </button>
                <button type="button" onClick={() => setStep('heard')} className={tone.plain}>
                  <Scale className="h-7 w-7 shrink-0 text-bronze" aria-hidden />
                  <Bi k="munshi.heard" big />
                </button>
                {errorBox}
              </div>
            ) : (
              <div className="space-y-4">
                <NextDatePicker baseKey={today} value={nextKey} onChange={setNextKey} />
                {errorBox}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setStep('choose')} className={tone.plain}>
                    <Bi k="munshi.back" />
                  </button>
                  <button type="button" onClick={() => saveHearing(sheet.row, step)} disabled={!nextKey} className={tone.primary}>
                    <Check className="h-6 w-6 shrink-0" aria-hidden />
                    <Bi k="munshi.save" />
                  </button>
                </div>
              </div>
            )}
          </SheetFrame>
        )}

        {sheet?.kind === 'copy' && (
          <SheetFrame key="copy" title="munshi.copyApplied" onClose={close}>
            <div className="space-y-4">
              <p className="text-ink-soft">
                <Bi k="munshi.copyTask" />
              </p>
              <CasePicker cases={data.cases} value={caseId} onChange={setCaseId} />
              {errorBox}
              <button
                type="button"
                className={tone.primary}
                onClick={() =>
                  attempt(() => {
                    addTask({ title: 'Collect certified copy', assigneeId: clerkId, caseId: caseId || undefined, due: addDays(today, 7) });
                  })
                }
              >
                <Check className="h-6 w-6 shrink-0" aria-hidden />
                <Bi k="munshi.save" />
              </button>
            </div>
          </SheetFrame>
        )}

        {sheet?.kind === 'fee' && showFee && (
          <SheetFrame key="fee" title="munshi.feeReceived" onClose={close}>
            <div className="space-y-4">
              <CasePicker cases={data.cases} value={caseId} onChange={setCaseId} />
              <label className="block">
                <span className="mb-1 block">
                  <Bi k="munshi.amount" />
                </span>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                  className={`${fieldCls} font-sans text-2xl font-bold`}
                  placeholder="25000"
                />
              </label>
              <fieldset>
                <legend className="mb-1">
                  <Bi k="munshi.mode" />
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={mode === m}
                      onClick={() => setMode(m)}
                      className={`flex min-h-14 items-center justify-center rounded-2xl border-2 px-2 transition ${
                        mode === m ? 'border-bronze bg-bronze text-ivory' : 'border-line bg-paper text-ink hover:border-bronze/50'
                      }`}
                    >
                      <Bi k={`munshi.mode.${m}` as DictKey} />
                    </button>
                  ))}
                </div>
              </fieldset>
              {errorBox}
              <button
                type="button"
                className={tone.bronze}
                disabled={!caseId || !amount}
                onClick={() => attempt(() => addPayment(caseId, { date: today, amount: Number(amount), mode, note: `Received by ${member.name || 'munshi'}` }))}
              >
                <Check className="h-6 w-6 shrink-0" aria-hidden />
                <Bi k="munshi.save" />
              </button>
            </div>
          </SheetFrame>
        )}

        {sheet?.kind === 'note' && (
          <SheetFrame key="note" title="munshi.note" onClose={close}>
            <div className="space-y-4">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                dir="auto"
                placeholder={`${ur('munshi.notePlaceholder')}  ${en('munshi.notePlaceholder')}`}
                className={`${fieldCls} urdu min-h-36 py-3`}
                aria-label={en('munshi.note')}
              />
              {speechOk && (
                <button type="button" onClick={toggleMic} aria-pressed={listening} className={listening ? tone.bronze : tone.plain}>
                  {listening ? <MicOff className="h-7 w-7 shrink-0" aria-hidden /> : <Mic className="h-7 w-7 shrink-0 text-bronze" aria-hidden />}
                  <Bi k={listening ? 'munshi.listening' : 'munshi.speak'} />
                </button>
              )}
              <CasePicker cases={data.cases} value={caseId} onChange={setCaseId} />
              {errorBox}
              <button
                type="button"
                className={tone.primary}
                disabled={!note.trim()}
                onClick={() => attempt(() => addDiary({ text: note, authorId: member.id, caseId: caseId || undefined }))}
              >
                <Check className="h-6 w-6 shrink-0" aria-hidden />
                <Bi k="munshi.save" />
              </button>
            </div>
          </SheetFrame>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            className="fixed inset-x-4 bottom-6 z-[60] mx-auto flex max-w-sm items-center justify-center gap-2 rounded-2xl bg-ok px-5 py-4 text-lg font-semibold text-ivory shadow-xl"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
          >
            <Check className="h-6 w-6" aria-hidden />
            <span className="urdu">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
