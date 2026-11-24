import type { Entry } from './i18n-dict';

/** English and Urdu strings for the scan feature. Keys are prefixed `scan.`. */
export const SCAN = {
  'scan.button': { en: 'Scan with camera', ur: 'کیمرے سے اسکین کریں' },
  'scan.title': { en: 'Scan to PDF', ur: 'اسکین کر کے PDF بنائیں' },
  'scan.intro': {
    en: 'Photograph each page of the order or paper. The pages are joined into one PDF in Documents.',
    ur: 'حکم نامے یا کاغذ کے ہر صفحے کی تصویر لیں۔ سارے صفحے جوڑ کر ایک PDF دستاویزات میں محفوظ ہو جائے گی۔',
  },
  'scan.tip': {
    en: 'Tip: lay the page flat in good light and fill the frame.',
    ur: 'مشورہ: صفحہ سیدھا رکھیں، روشنی اچھی ہو اور پورا صفحہ تصویر میں آئے۔',
  },
  'scan.takePhoto': { en: 'Take photo', ur: 'تصویر لیں' },
  'scan.choose': { en: 'Choose pictures', ur: 'تصویریں منتخب کریں' },
  'scan.pages': { en: '{n} page{s}', ur: '{n} صفحات' },
  'scan.empty': { en: 'No pages yet. Take a photo of the first page.', ur: 'ابھی کوئی صفحہ نہیں۔ پہلے صفحے کی تصویر لیں۔' },
  'scan.look': { en: 'Look', ur: 'انداز' },
  'scan.lookOriginal': { en: 'Original', ur: 'اصل تصویر' },
  'scan.lookDocument': { en: 'Clean document', ur: 'صاف کاغذ' },
  'scan.name': { en: 'Name', ur: 'نام' },
  'scan.pageN': { en: 'Page {n}', ur: 'صفحہ {n}' },
  'scan.moveUp': { en: 'Move page {n} up', ur: 'صفحہ {n} اوپر کریں' },
  'scan.moveDown': { en: 'Move page {n} down', ur: 'صفحہ {n} نیچے کریں' },
  'scan.remove': { en: 'Remove page {n}', ur: 'صفحہ {n} ہٹائیں' },
  'scan.reading': { en: 'Reading picture {i} of {n}…', ur: 'تصویر {i} از {n} پڑھی جا رہی ہے…' },
  'scan.preparing': { en: 'Preparing page {i} of {n}…', ur: 'صفحہ {i} از {n} تیار ہو رہا ہے…' },
  'scan.binding': { en: 'Making the PDF…', ur: 'PDF بن رہی ہے…' },
  'scan.saving': { en: 'Saving {name}', ur: '{name} محفوظ ہو رہی ہے' },
  'scan.save': { en: 'Save to Documents', ur: 'دستاویزات میں محفوظ کریں' },
  'scan.cancel': { en: 'Cancel', ur: 'منسوخ' },
  'scan.close': { en: 'Close', ur: 'بند کریں' },
  'scan.couldNotRead': { en: 'Could not read {name}. Try a JPG or PNG photo.', ur: '{name} نہیں پڑھی جا سکی۔ JPG یا PNG تصویر استعمال کریں۔' },
  'scan.couldNotSave': { en: 'Could not make the PDF. Please try again.', ur: 'PDF نہیں بن سکی۔ دوبارہ کوشش کریں۔' },
  'scan.noPages': { en: 'Add at least one page first.', ur: 'پہلے کم از کم ایک صفحہ شامل کریں۔' },
  'scan.unsupported': {
    en: 'This browser cannot read photos here. Please update it.',
    ur: 'یہ براؤزر یہاں تصویریں نہیں پڑھ سکتا۔ براہِ کرم اسے اپ ڈیٹ کریں۔',
  },
  'scan.saved': { en: '{name} saved ({n} page{s})', ur: '{name} محفوظ ہو گئی ({n} صفحات)' },
  'scan.savedShared': { en: '{name} shared with your chamber ({n} page{s})', ur: '{name} چیمبر کے ساتھ شیئر ہو گئی ({n} صفحات)' },
  'scan.savedPending': {
    en: '{name} saved on this device · will upload when online',
    ur: '{name} اس ڈیوائس پر محفوظ ہے · انٹرنیٹ آنے پر اپ لوڈ ہو جائے گی',
  },
} satisfies Record<string, Entry>;
