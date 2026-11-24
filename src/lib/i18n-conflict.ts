import type { Entry } from './i18n-dict';

/** English and Urdu strings for the conflict feature. Keys are prefixed `conflict.`. */
export const CONFLICT = {
  'conflict.heading': { en: 'This name already appears in your files:', ur: 'یہ نام آپ کی فائلوں میں پہلے سے موجود ہے:' },
  'conflict.client': { en: '{name} is an existing client', ur: '{name} آپ کے موجودہ موکل ہیں' },
  'conflict.clientCase': { en: '{name} is an existing client, see', ur: '{name} آپ کے موجودہ موکل ہیں، دیکھیں' },
  'conflict.party': { en: '“{name}” appears in', ur: '“{name}” اس مقدمے میں آتا ہے:' },
  'conflict.opposing': { en: '“{name}” appears as the other side in', ur: '“{name}” اس مقدمے میں مخالف فریق ہے:' },
  'conflict.more': { en: '…and {n} more', ur: '…اور {n} مزید' },
  'conflict.note': { en: 'This is only a warning. You can still save.', ur: 'یہ صرف یاد دہانی ہے۔ آپ پھر بھی محفوظ کر سکتے ہیں۔' },
} satisfies Record<string, Entry>;
