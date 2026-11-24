import type { Entry } from './i18n-dict';

/** English and Urdu strings for the promises feature. Keys are prefixed `promises.`. */
export const PROMISES = {
  'promises.title': { en: 'Promised payments', ur: 'وعدہ شدہ ادائیگیاں' },
  'promises.intro': {
    en: 'Note what the client promised to pay and by when. The app reminds you on that day.',
    ur: 'نوٹ کریں کہ موکل نے کتنی رقم کب تک دینے کا وعدہ کیا۔ اس دن ایپ آپ کو یاد دلائے گی۔',
  },
  'promises.add': { en: 'Add promise', ur: 'وعدہ درج کریں' },
  'promises.amount': { en: 'Amount promised (Rs)', ur: 'وعدہ کی گئی رقم (روپے)' },
  'promises.dueOn': { en: 'Promised for', ur: 'وعدے کی تاریخ' },
  'promises.note': { en: 'Note (optional)', ur: 'نوٹ (اختیاری)' },
  'promises.notePh': { en: 'e.g. after the harvest', ur: 'مثلاً فصل کے بعد' },
  'promises.save': { en: 'Save promise', ur: 'وعدہ محفوظ کریں' },
  'promises.saved': { en: 'Promise noted', ur: 'وعدہ درج ہو گیا' },
  'promises.empty': { en: 'No promises noted yet.', ur: 'ابھی کوئی وعدہ درج نہیں۔' },
  'promises.status.today': { en: 'Due today', ur: 'آج واجب' },
  'promises.status.overdue': { en: 'Overdue', ur: 'تاریخ گزر گئی' },
  'promises.status.upcoming': { en: 'Promised', ur: 'وعدہ' },
  'promises.status.kept': { en: 'Kept', ur: 'پورا ہوا' },
  'promises.keptOn': { en: 'Kept on {date}', ur: '{date} کو پورا ہوا' },
  'promises.daysLate': { en: '{n} days late', ur: '{n} دن کی تاخیر' },
  'promises.dayLate': { en: '1 day late', ur: 'ایک دن کی تاخیر' },
  'promises.markReceived': { en: 'Mark received', ur: 'وصول ہو گئی' },
  'promises.receivedNote': { en: 'Promised payment', ur: 'وعدہ شدہ ادائیگی' },
  'promises.remind': { en: 'Remind on WhatsApp', ur: 'واٹس ایپ پر یاد دہانی' },
  'promises.noPhone': { en: 'No WhatsApp number on file; you can pick a chat in WhatsApp.', ur: 'واٹس ایپ نمبر درج نہیں؛ آپ واٹس ایپ میں خود چیٹ چن سکتے ہیں۔' },
  'promises.delete': { en: 'Delete promise', ur: 'وعدہ حذف کریں' },
  'promises.deleted': { en: 'Promise removed', ur: 'وعدہ ہٹا دیا گیا' },
  'promises.today.title': { en: 'Promised payments due', ur: 'واجب الادا وعدہ شدہ ادائیگیاں' },
  'promises.today.sub': {
    en: 'Clients who promised to pay today or earlier. Send a polite reminder in English and Urdu.',
    ur: 'جن موکلوں نے آج یا اس سے پہلے ادائیگی کا وعدہ کیا تھا۔ انگریزی اور اردو میں شائستہ یاد دہانی بھیجیں۔',
  },
  'promises.openCase': { en: 'Open case', ur: 'کیس کھولیں' },
} satisfies Record<string, Entry>;
