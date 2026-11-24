/**
 * Runs OCR (tesseract.js, English model) on one page image, in the browser.
 * The library is loaded with a dynamic import() only when `startOcr` is called, so it stays out of the
 * main bundle. Its worker, core and language data are fetched from tesseract.js's default CDNs on first
 * use and cached by the library (IndexedDB), so the ~10 MB download happens once.
 */

export type OcrPhase = 'loading' | 'reading';

export interface OcrProgress {
  phase: OcrPhase;
  /** 0..1 within the phase */
  progress: number;
}

export interface OcrJob {
  /** Resolves with the recognised text; rejects with Error('cancelled') after cancel(), or another Error on failure. */
  promise: Promise<string>;
  cancel: () => void;
}

interface TesseractWorker {
  recognize: (image: Blob) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<unknown>;
}
interface TesseractModule {
  createWorker: (
    langs: string,
    oem: number,
    options: { logger: (m: { status: string; progress: number }) => void },
  ) => Promise<TesseractWorker>;
}

export function startOcr(image: Blob, onProgress: (p: OcrProgress) => void): OcrJob {
  let cancelled = false;
  let worker: TesseractWorker | null = null;
  let rejectNow: (e: Error) => void = () => {};

  const work = (async () => {
    const mod = (await import('tesseract.js')) as unknown as TesseractModule & { default?: TesseractModule };
    const createWorker = mod.createWorker ?? mod.default?.createWorker;
    if (!createWorker) throw new Error('ocr-unavailable');
    if (cancelled) throw new Error('cancelled');
    onProgress({ phase: 'loading', progress: 0 });
    const w = await createWorker('eng', 1, {
      logger: (m) => {
        if (cancelled) return;
        onProgress({ phase: m.status === 'recognizing text' ? 'reading' : 'loading', progress: Math.max(0, Math.min(1, m.progress || 0)) });
      },
    });
    worker = w;
    try {
      if (cancelled) throw new Error('cancelled');
      const { data } = await w.recognize(image);
      if (cancelled) throw new Error('cancelled');
      return data.text ?? '';
    } finally {
      worker = null;
      void w.terminate().catch(() => {});
    }
  })();

  const promise = new Promise<string>((resolve, reject) => {
    rejectNow = reject;
    work.then(resolve, reject);
  });
  // a cancelled job's late failure must not surface as an unhandled rejection
  work.catch(() => {});

  return {
    promise,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      rejectNow(new Error('cancelled'));
      void worker?.terminate().catch(() => {});
    },
  };
}
