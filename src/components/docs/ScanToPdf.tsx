'use client';

import { ArrowDown, ArrowUp, CalendarClock, Camera, Check, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { tooBigMessage } from '../../lib/cloud/storage';
import { formatPk, todayKey } from '../../lib/dates';
import { uploadDocument } from '../../lib/docText';
import { useLang } from '../../lib/i18n';
import { setNextHearing } from '../../lib/nextHearing';
import { type DateSuggestion, findNextDates } from '../../lib/ocrDate';
import { type OcrJob, type OcrProgress, startOcr } from '../../lib/ocrRun';
import { can } from '../../lib/permissions';
import { snapshot } from '../../lib/repo';
import { defaultScanName, enhancePixels, fitSize, imagesToPdf, movePage, SCAN_JPEG_QUALITY, SCAN_MAX_SIDE, scanFileName, type ScanMode, type ScanPage } from '../../lib/scan';
import { getMode } from '../../lib/store';
import { useData } from '../../lib/useData';
import { useRole } from '../shell/RoleProvider';
import { btn, inputCls } from '../ui';

/** Document folders (without "All"). Folder names are stored in English; labels are translated. */
export const DOC_FOLDERS = ['Pleadings', 'Orders', 'Evidence', 'Correspondence', 'Personal'];

const THUMB_SIDE = 480;

interface Shot {
  id: string;
  file: File;
  /** small JPEG preview URLs, one per look */
  thumbs: Record<ScanMode, string>;
}

/** Decode a photo the right way up (EXIF orientation) and draw it on a canvas no larger than `max`. */
async function drawPhoto(file: Blob, max: number): Promise<HTMLCanvasElement> {
  if (typeof createImageBitmap !== 'function') throw new Error('unsupported');
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitSize(bmp.width, bmp.height, max);
    if (!width || !height) throw new Error('empty');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('unsupported');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, width, height);
    return canvas;
  } finally {
    bmp.close();
  }
}

function applyLook(canvas: HTMLCanvasElement, mode: ScanMode) {
  if (mode === 'original') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  enhancePixels(img.data, mode);
  ctx.putImageData(img, 0, 0);
}

function toJpeg(canvas: HTMLCanvasElement, quality = SCAN_JPEG_QUALITY): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality));
}

function copyCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d')?.drawImage(src, 0, 0);
  return c;
}

async function makeThumbs(file: File): Promise<Record<ScanMode, string>> {
  const base = await drawPhoto(file, THUMB_SIDE);
  const original = URL.createObjectURL(await toJpeg(base, 0.7));
  const doc = copyCanvas(base);
  applyLook(doc, 'document');
  const document_ = URL.createObjectURL(await toJpeg(doc, 0.7));
  return { original, document: document_ };
}

/** Full-size page: decode, fit to 1800px, apply the look, encode as JPEG. */
async function makePage(file: File, mode: ScanMode): Promise<ScanPage> {
  const canvas = await drawPhoto(file, 1800);
  applyLook(canvas, mode);
  const blob = await toJpeg(canvas);
  const page = { bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
  canvas.width = canvas.height = 0; // free the bitmap memory early on phones
  return page;
}

function revoke(s: Shot) {
  URL.revokeObjectURL(s.thumbs.original);
  URL.revokeObjectURL(s.thumbs.document);
}

let seq = 0;

/** A "Scan with camera" link-style button that opens the scan sheet; hidden for roles that cannot upload. */
export function ScanButton({ caseId, className, onSaved }: { caseId?: string; className?: string; onSaved?: (message: string) => void }) {
  const { role } = useRole();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  if (!can(role, 'documents.upload')) return null;
  return (
    <>
      <button
        type="button"
        className={className ?? 'inline-flex min-h-11 items-center gap-1.5 text-sm text-bronze hover:underline'}
        onClick={() => setOpen(true)}
      >
        <Camera className="h-4 w-4" aria-hidden /> {t('scan.button', undefined, 'Scan with camera')}
      </button>
      <ScanToPdf open={open} onClose={() => setOpen(false)} caseId={caseId} onSaved={onSaved} />
    </>
  );
}

/**
 * "Scan with camera": photograph court orders or papers page by page and save them as one clean PDF
 * in Documents, through the same upload path as any other file.
 */
export function ScanToPdf({
  open,
  onClose,
  caseId,
  defaultFolder = 'Orders',
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  caseId?: string;
  defaultFolder?: string;
  /** Called with a ready-to-show sentence after the PDF is saved (e.g. a toast). */
  onSaved?: (message: string) => void;
}) {
  const { role, member } = useRole();
  const { t } = useLang();
  const db = useData(() => snapshot());
  const [shots, setShots] = useState<Shot[]>([]);
  const [mode, setMode] = useState<ScanMode>('document');
  const [name, setName] = useState('');
  const [folder, setFolder] = useState(defaultFolder);
  const [upCase, setUpCase] = useState(caseId ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shotsRef = useRef<Shot[]>([]);
  shotsRef.current = shots;
  // opt-in "read the next date from this photo"
  const [ocrPage, setOcrPage] = useState(0);
  const [ocr, setOcr] = useState<OcrProgress | null>(null);
  const [found, setFound] = useState<DateSuggestion[] | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [pickDate, setPickDate] = useState('');
  const [hearingMsg, setHearingMsg] = useState<string | null>(null);
  const ocrJob = useRef<OcrJob | null>(null);
  const ocrRun = useRef(0);

  const fallbackName = defaultScanName(formatPk(todayKey()));

  // Fresh sheet every time it opens.
  useEffect(() => {
    if (!open) return;
    setName(fallbackName);
    setFolder(defaultFolder);
    setUpCase(caseId ?? '');
    setError(null);
    resetOcr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Free preview URLs when pages are dropped or the sheet unmounts.
  useEffect(
    () => () => {
      ocrJob.current?.cancel();
      shotsRef.current.forEach(revoke);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open || !can(role, 'documents.upload')) return null;

  function resetOcr() {
    ocrRun.current++;
    ocrJob.current?.cancel();
    ocrJob.current = null;
    setOcr(null);
    setFound(null);
    setOcrError(null);
    setPickDate('');
    setHearingMsg(null);
    setOcrPage(0);
  }

  function close() {
    shots.forEach(revoke);
    setShots([]);
    setBusy(null);
    setError(null);
    resetOcr();
    onClose();
  }

  async function add(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => !f.type || f.type.startsWith('image/'));
    if (!files.length) return;
    setError(null);
    const errors: string[] = [];
    const added: Shot[] = [];
    for (const [i, file] of files.entries()) {
      setBusy(t('scan.reading', { i: i + 1, n: files.length }, `Reading picture ${i + 1} of ${files.length}…`));
      try {
        added.push({ id: `shot-${++seq}`, file, thumbs: await makeThumbs(file) });
      } catch (e) {
        errors.push(
          e instanceof Error && e.message === 'unsupported'
            ? t('scan.unsupported', undefined, 'This browser cannot read photos here. Please update it.')
            : t('scan.couldNotRead', { name: file.name }, `Could not read ${file.name}. Try a JPG or PNG photo.`),
        );
      }
    }
    setShots((s) => [...s, ...added]);
    setBusy(null);
    if (errors.length) setError(errors.join(' '));
  }

  function removeShot(i: number) {
    setFound(null);
    setOcrError(null);
    setShots((s) => {
      const gone = s[i];
      if (gone) revoke(gone);
      return s.filter((_, j) => j !== i);
    });
  }

  /** OCR the previewed page (the cleaned-up image the PDF would use) and look for the next hearing date. */
  async function readDate() {
    const shot = shots[Math.min(ocrPage, shots.length - 1)];
    if (!shot || ocr) return;
    setOcrError(null);
    setFound(null);
    setHearingMsg(null);
    setOcr({ phase: 'loading', progress: 0 });
    const run = ++ocrRun.current;
    try {
      const canvas = await drawPhoto(shot.file, SCAN_MAX_SIDE);
      applyLook(canvas, mode);
      const image = await toJpeg(canvas, 0.9);
      canvas.width = canvas.height = 0;
      if (run !== ocrRun.current) return; // closed or stopped while the page was being prepared
      const job = startOcr(image, setOcr);
      ocrJob.current = job;
      const list = findNextDates(await job.promise, todayKey());
      setFound(list);
      const top = list.find((x) => x.strength === 'keyword');
      setPickDate(top ? top.date : '');
    } catch (e) {
      if (!(e instanceof Error && e.message === 'cancelled')) setOcrError(t('scan.ocr.failed', undefined, 'Could not read the page. You can still type the date.'));
    } finally {
      if (run === ocrRun.current) {
        ocrJob.current = null;
        setOcr(null);
      }
    }
  }

  function applyHearing() {
    const c = (db?.cases ?? []).find((x) => x.id === upCase);
    if (!c || !pickDate) return;
    if (!setNextHearing(c.id, pickDate)) {
      setOcrError(t('scan.ocr.setFailed', undefined, 'Could not find that case. Nothing was changed.'));
      return;
    }
    const msg = t('scan.ocr.done', { title: c.title, date: formatPk(pickDate) }, `Next hearing of ${c.title} set to ${formatPk(pickDate)}`);
    setHearingMsg(msg);
    onSaved?.(msg);
  }

  async function save() {
    if (!shots.length) {
      setError(t('scan.noPages', undefined, 'Add at least one page first.'));
      return;
    }
    setError(null);
    const fileName = scanFileName(name, fallbackName);
    try {
      const pages: ScanPage[] = [];
      for (const [i, s] of shots.entries()) {
        setBusy(t('scan.preparing', { i: i + 1, n: shots.length }, `Preparing page ${i + 1} of ${shots.length}…`));
        pages.push(await makePage(s.file, mode));
      }
      setBusy(t('scan.binding', undefined, 'Making the PDF…'));
      const bytes = await imagesToPdf(pages);
      const file = new File([bytes as BlobPart], fileName, { type: 'application/pdf' });
      const big = tooBigMessage(file);
      if (big) {
        setBusy(null);
        setError(big);
        return;
      }
      const label = t('scan.saving', { name: fileName }, `Saving ${fileName}`);
      setBusy(`${label}…`);
      const r = await uploadDocument(file, { folder, caseId: upCase || undefined, uploadedBy: member.id }, (p) => setBusy(`${label} · ${Math.round(p * 100)}%`));
      const n = pages.length;
      const s = n === 1 ? '' : 's';
      const msg =
        r.shared === 'pending'
          ? t('scan.savedPending', { name: fileName }, `${fileName} saved on this device · will upload when online`)
          : getMode() === 'cloud'
            ? t('scan.savedShared', { name: fileName, n, s }, `${fileName} shared with your chamber (${n} page${s})`)
            : t('scan.saved', { name: fileName, n, s }, `${fileName} saved (${n} page${s})`);
      onSaved?.(msg);
      close();
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error && e.message && e.message !== 'encode' ? e.message : t('scan.couldNotSave', undefined, 'Could not make the PDF. Please try again.'));
    }
  }

  const folderLabel = (f: string) => t(`docs.folder.${f}`, undefined, f);
  const pickCls = `${btn.ghost} min-h-11 flex-1 cursor-pointer`;
  const iconBtn = 'grid h-11 w-11 place-items-center rounded-lg text-ink-soft transition hover:bg-line/50 hover:text-ink disabled:opacity-40';
  const n = shots.length;
  const pageIdx = Math.min(ocrPage, Math.max(0, n - 1));
  const canSetHearing = can(role, 'cases.edit');
  const chosenCase = (db?.cases ?? []).find((x) => x.id === upCase);
  const ocrPct = ocr ? Math.round(ocr.progress * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-night/50 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t('scan.title', undefined, 'Scan to PDF')}>
      <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-paper shadow-xl sm:max-h-[90dvh] sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-lg font-semibold">{t('scan.title', undefined, 'Scan to PDF')}</h2>
          <button type="button" className={iconBtn} onClick={close} disabled={!!busy} aria-label={t('scan.close', undefined, 'Close')}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <p className="text-sm text-ink-soft">
            {t('scan.intro', undefined, 'Photograph each page of the order or paper. The pages are joined into one PDF in Documents.')}{' '}
            {t('scan.tip', undefined, 'Tip: lay the page flat in good light and fill the frame.')}
          </p>

          <div className="flex flex-wrap gap-2">
            <label className={`${btn.bronze} min-h-11 flex-1 cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
              <Camera className="h-4 w-4" aria-hidden /> {t('scan.takePhoto', undefined, 'Take photo')}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="sr-only"
                disabled={!!busy}
                onChange={(e) => {
                  void add(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            <label className={`${pickCls} ${busy ? 'pointer-events-none opacity-50' : ''}`}>
              <ImagePlus className="h-4 w-4" aria-hidden /> {t('scan.choose', undefined, 'Choose pictures')}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={!!busy}
                onChange={(e) => {
                  void add(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{t('scan.pages', { n, s: n === 1 ? '' : 's' }, `${n} page${n === 1 ? '' : 's'}`)}</span>
            <div role="radiogroup" aria-label={t('scan.look', undefined, 'Look')} className="inline-flex rounded-lg border border-line p-0.5">
              {(['original', 'document'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`min-h-11 rounded-md px-3 text-sm ${mode === m ? 'bg-night text-ivory' : 'text-ink hover:bg-line/50'}`}
                >
                  {m === 'original' ? t('scan.lookOriginal', undefined, 'Original') : t('scan.lookDocument', undefined, 'Clean document')}
                </button>
              ))}
            </div>
          </div>

          {n === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-cream/50 px-4 py-8 text-center text-sm text-ink-soft">
              {t('scan.empty', undefined, 'No pages yet. Take a photo of the first page.')}
            </p>
          ) : (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {shots.map((s, i) => (
                <li key={s.id} className="overflow-hidden rounded-xl border border-line bg-cream/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.thumbs[mode]} alt={t('scan.pageN', { n: i + 1 }, `Page ${i + 1}`)} className="aspect-[3/4] w-full bg-line/30 object-contain" />
                  <div className="flex items-center justify-between gap-1 px-1 py-1">
                    <span className="ps-1 text-xs text-ink-soft">{t('scan.pageN', { n: i + 1 }, `Page ${i + 1}`)}</span>
                    <span className="flex">
                      <button type="button" className={iconBtn} disabled={!!busy || i === 0} onClick={() => setShots((x) => movePage(x, i, -1))} aria-label={t('scan.moveUp', { n: i + 1 }, `Move page ${i + 1} up`)}>
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" className={iconBtn} disabled={!!busy || i === n - 1} onClick={() => setShots((x) => movePage(x, i, 1))} aria-label={t('scan.moveDown', { n: i + 1 }, `Move page ${i + 1} down`)}>
                        <ArrowDown className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" className={`${iconBtn} hover:bg-danger/10 hover:text-danger`} disabled={!!busy} onClick={() => removeShot(i)} aria-label={t('scan.remove', { n: i + 1 }, `Remove page ${i + 1}`)}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="sm:col-span-3">
              <span className="mb-1 block text-xs text-ink-soft">{t('scan.name', undefined, 'Name')}</span>
              <input className={`${inputCls} min-h-11 text-base sm:text-sm`} value={name} onChange={(e) => setName(e.target.value)} placeholder={fallbackName} />
            </label>
            <label className="sm:col-span-1">
              <span className="mb-1 block text-xs text-ink-soft">{t('docs.folderLabel', undefined, 'Folder')}</span>
              <select className={`${inputCls} min-h-11 text-base sm:text-sm`} value={folder} onChange={(e) => setFolder(e.target.value)}>
                {DOC_FOLDERS.map((f) => (
                  <option key={f} value={f}>
                    {folderLabel(f)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-ink-soft">{t('docs.caseOptional', undefined, 'Case (optional)')}</span>
              <select className={`${inputCls} min-h-11 text-base sm:text-sm`} value={upCase} onChange={(e) => setUpCase(e.target.value)}>
                <option value="">{t('docs.none', undefined, '— none —')}</option>
                {(db?.cases ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {n > 0 && (
            <section className="space-y-3 rounded-xl border border-line bg-cream/40 p-3" aria-label={t('scan.ocr.heading', undefined, 'Next hearing date')}>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-bronze" aria-hidden /> {t('scan.ocr.heading', undefined, 'Next hearing date')}
              </h3>

              {n > 1 && (
                <label className="block">
                  <span className="mb-1 block text-xs text-ink-soft">{t('scan.ocr.pageLabel', undefined, 'Read from')}</span>
                  <select
                    className={`${inputCls} min-h-11 text-base sm:text-sm`}
                    value={pageIdx}
                    disabled={!!ocr}
                    onChange={(e) => {
                      setOcrPage(Number(e.target.value));
                      setFound(null);
                      setOcrError(null);
                    }}
                  >
                    {shots.map((s, i) => (
                      <option key={s.id} value={i}>
                        {t('scan.pageN', { n: i + 1 }, `Page ${i + 1}`)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {ocr ? (
                <div className="flex flex-wrap items-center gap-2" role="status">
                  <span className="inline-flex min-w-0 flex-1 items-center gap-2 text-sm text-ink-soft">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-bronze" aria-hidden />
                    {ocr.phase === 'reading'
                      ? t('scan.ocr.reading', { p: ocrPct }, `Reading the page… ${ocrPct}%`)
                      : t('scan.ocr.loading', { p: ocrPct }, `Getting the reader ready… ${ocrPct}%`)}
                  </span>
                  <button type="button" className={`${btn.ghost} min-h-11`} onClick={() => ocrJob.current?.cancel()}>
                    {t('scan.ocr.stop', undefined, 'Stop reading')}
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <button type="button" className={`${btn.ghost} min-h-11 w-full`} onClick={() => void readDate()} disabled={!!busy}>
                    {t('scan.ocr.button', undefined, 'Read the next date from this photo')}
                  </button>
                  <p className="text-xs text-ink-soft">{t('scan.ocr.help', undefined, 'Downloads about 10 MB the first time. The photo stays on your phone.')}</p>
                </div>
              )}

              {ocrError && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                  {ocrError}
                </p>
              )}
              {found && found.length === 0 && <p className="text-sm text-ink-soft">{t('scan.ocr.none', undefined, 'No next date found on this page. You can type it below.')}</p>}
              {found && found.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-ink-soft">{t('scan.ocr.found', undefined, 'Dates found on the page. Tap one to use it.')}</p>
                  <ul className="grid gap-2">
                    {found.map((f) => (
                      <li key={f.date}>
                        <button
                          type="button"
                          aria-pressed={pickDate === f.date}
                          aria-label={t('scan.ocr.use', { date: formatPk(f.date) }, `Use ${formatPk(f.date)}`)}
                          onClick={() => {
                            setPickDate(f.date);
                            setHearingMsg(null);
                          }}
                          className={`flex min-h-11 w-full flex-col items-start rounded-lg border px-3 py-2 text-start transition ${
                            pickDate === f.date ? 'border-bronze bg-bronze/10' : 'border-line bg-paper hover:bg-line/40'
                          }`}
                        >
                          <span className="text-sm font-semibold">{formatPk(f.date)}</span>
                          <span className="line-clamp-2 w-full text-xs text-ink-soft" dir="ltr">
                            {f.strength === 'keyword' ? f.line : `${t('scan.ocr.plain', undefined, 'A date written on the page')} · ${f.line}`}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="block">
                <span className="mb-1 block text-xs text-ink-soft">{t('scan.ocr.dateLabel', undefined, 'Or type the date')}</span>
                <input
                  type="date"
                  dir="ltr"
                  className={`${inputCls} min-h-11 text-base sm:text-sm`}
                  value={pickDate}
                  onChange={(e) => {
                    setPickDate(e.target.value);
                    setHearingMsg(null);
                  }}
                />
              </label>
              {pickDate && pickDate < todayKey() && <p className="text-xs text-danger">{t('scan.ocr.past', undefined, 'That date has already passed.')}</p>}

              {canSetHearing &&
                (chosenCase ? (
                  <button type="button" className={`${btn.bronze} min-h-11 w-full`} disabled={!pickDate || !!busy} onClick={applyHearing}>
                    <CalendarClock className="h-4 w-4" aria-hidden />{' '}
                    {pickDate ? t('scan.ocr.set', { date: formatPk(pickDate) }, `Set next hearing to ${formatPk(pickDate)}`) : t('scan.ocr.setEmpty', undefined, 'Set next hearing')}
                  </button>
                ) : (
                  <p className="text-xs text-ink-soft">{t('scan.ocr.needCase', undefined, 'Choose a case above to set its next hearing.')}</p>
                ))}
              {hearingMsg && (
                <p className="flex items-center gap-2 text-sm text-ok" role="status">
                  <Check className="h-4 w-4 shrink-0" aria-hidden /> {hearingMsg}
                </p>
              )}
            </section>
          )}

          {busy && (
            <p className="inline-flex items-center gap-2 text-sm text-ink-soft" role="status">
              <Loader2 className="h-4 w-4 animate-spin text-bronze" aria-hidden /> {busy}
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" className={`${btn.ghost} min-h-11 flex-1`} onClick={close} disabled={!!busy}>
            {t('scan.cancel', undefined, 'Cancel')}
          </button>
          <button type="button" className={`${btn.primary} min-h-11 flex-1`} onClick={() => void save()} disabled={!!busy || n === 0}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('scan.save', undefined, 'Save to Documents')}
          </button>
        </div>
      </div>
    </div>
  );
}
