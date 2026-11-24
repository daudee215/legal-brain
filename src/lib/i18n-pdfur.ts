import type { Entry } from './i18n-dict';

/** English and Urdu strings for the pdfur feature (language choice on the client PDFs). Keys are prefixed `pdfur.`. */
export const PDFUR = {
  'pdfur.choose': { en: 'Choose the PDF language', ur: 'PDF کی زبان منتخب کریں' },
  'pdfur.menu': { en: 'PDF language', ur: 'PDF کی زبان' },
  'pdfur.en': { en: 'English', ur: 'انگریزی' },
  'pdfur.ur': { en: 'اردو', ur: 'اردو' },
  'pdfur.both': { en: 'Both (English + اردو)', ur: 'دونوں (انگریزی + اردو)' },
  'pdfur.error': { en: 'Could not make the PDF', ur: 'PDF نہیں بن سکی' },
} satisfies Record<string, Entry>;
