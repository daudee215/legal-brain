import type { Entry } from './i18n-dict';

/**
 * English and Urdu strings for the client status link (public page, share dialog, share message).
 * Keys are prefixed `status.`; the case status names themselves (`status.pending` …) live in i18n-dict.ts.
 */
export const STATUS = {
  // Public page
  'status.page.title': { en: 'Case status', ur: 'مقدمے کی صورتحال' },
  'status.page.loading': { en: 'Loading your case status…', ur: 'آپ کے مقدمے کی صورتحال لوڈ ہو رہی ہے…' },
  'status.page.invalid': {
    en: 'This link is not valid any more. Please contact your advocate.',
    ur: 'یہ لنک اب کارآمد نہیں رہا۔ براہِ کرم اپنے وکیل سے رابطہ کریں۔',
  },
  'status.page.offline': {
    en: 'Could not load the status. Please check your internet and try again.',
    ur: 'صورتحال لوڈ نہیں ہو سکی۔ براہِ کرم انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔',
  },
  'status.page.retry': { en: 'Try again', ur: 'دوبارہ کوشش کریں' },
  'status.page.next': { en: 'Next hearing', ur: 'اگلی پیشی' },
  'status.page.notFixed': { en: 'Not fixed yet', ur: 'ابھی تاریخ مقرر نہیں ہوئی' },
  'status.page.today': { en: 'Today', ur: 'آج' },
  'status.page.tomorrow': { en: 'Tomorrow', ur: 'کل' },
  'status.page.inDays': { en: 'In {n} days', ur: '{n} دن بعد' },
  'status.page.passed': {
    en: 'This date has passed. The new date will show here once your advocate updates it.',
    ur: 'یہ تاریخ گزر چکی ہے۔ وکیل صاحب نئی تاریخ درج کریں گے تو یہاں نظر آئے گی۔',
  },
  'status.page.caseNo': { en: 'Case no.', ur: 'کیس نمبر' },
  'status.page.court': { en: 'Court', ur: 'عدالت' },
  'status.page.stage': { en: 'Stage', ur: 'مرحلہ' },
  'status.page.status': { en: 'Status', ur: 'حالت' },
  'status.page.last': { en: 'Last hearing', ur: 'پچھلی پیشی' },
  'status.page.contact': { en: 'For any question, please contact your advocate.', ur: 'کسی بھی سوال کے لیے براہِ کرم اپنے وکیل سے رابطہ کریں۔' },
  'status.page.disclaimer': { en: 'This is a status update, not legal advice.', ur: 'یہ صرف مقدمے کی صورتحال کی اطلاع ہے، قانونی مشورہ نہیں۔' },

  // Expiry labels
  'status.expiry.expired': { en: 'Expired', ur: 'میعاد ختم' },
  'status.expiry.today': { en: 'Expires today', ur: 'آج ختم ہو جائے گا' },
  'status.expiry.tomorrow': { en: 'Expires tomorrow', ur: 'کل ختم ہو جائے گا' },
  'status.expiry.days': { en: 'Expires in {n} days', ur: '{n} دن میں ختم ہو جائے گا' },

  // WhatsApp message: shareText() puts both paragraphs in every message (the URL is in the English one).
  'status.share.body': {
    en: 'Assalam-o-Alaikum,\nYou can see the latest status of your case "{case}" on this private link from {chamber}:\n{url}\nIt works for {days} days. Please do not forward it to anyone.',
    ur: 'السلام علیکم! آپ اپنے مقدمے "{case}" کی تازہ صورتحال اس پیغام میں دیے گئے لنک پر دیکھ سکتے ہیں۔ یہ {chamber} کی طرف سے نجی لنک ہے جو {days} دن تک چلے گا۔ براہِ کرم اسے کسی کو آگے نہ بھیجیں۔',
  },

  // Share dialog (inside the app)
  'status.link.button': { en: 'Share status', ur: 'صورتحال شیئر کریں' },
  'status.link.title': { en: 'Share case status with the client', ur: 'موکل کو مقدمے کی صورتحال بھیجیں' },
  'status.link.explain': {
    en: 'Anyone with the link can see this case’s next hearing date, stage and status until it expires or you revoke it. It shows no phone numbers, fees or documents.',
    ur: 'جس کے پاس بھی یہ لنک ہو گا وہ اس مقدمے کی اگلی پیشی، مرحلہ اور حالت دیکھ سکے گا، جب تک لنک کی میعاد ختم نہ ہو یا آپ اسے بند نہ کریں۔ اس میں کوئی فون نمبر، فیس یا دستاویزات نظر نہیں آتیں۔',
  },
  'status.link.expiry': { en: 'Link works for', ur: 'لنک کتنے دن چلے' },
  'status.link.days': { en: '{n} days', ur: '{n} دن' },
  'status.link.includeNote': { en: 'Include the last hearing note', ur: 'پچھلی پیشی کا نوٹ بھی دکھائیں' },
  'status.link.noteWarn': {
    en: 'The client will see the court proceedings text of the last hearing exactly as it is written in the app. Leave this off if it has private remarks.',
    ur: 'موکل کو پچھلی پیشی کی عدالتی کارروائی کا متن بالکل ویسا ہی نظر آئے گا جیسا ایپ میں لکھا ہے۔ اگر اس میں کوئی نجی بات ہو تو اسے بند رہنے دیں۔',
  },
  'status.link.label': { en: 'Label (optional — only your chamber sees it)', ur: 'نام (اختیاری — صرف آپ کا چیمبر دیکھے گا)' },
  'status.link.labelPh': { en: 'e.g. Sent to the client’s son', ur: 'مثلاً: موکل کے بیٹے کو بھیجا' },
  'status.link.create': { en: 'Create link', ur: 'لنک بنائیں' },
  'status.link.creating': { en: 'Creating…', ur: 'لنک بن رہا ہے…' },
  'status.link.ready': { en: 'Link ready — send it to the client', ur: 'لنک تیار ہے — موکل کو بھیج دیں' },
  'status.link.copy': { en: 'Copy link', ur: 'لنک کاپی کریں' },
  'status.link.copied': { en: 'Link copied', ur: 'لنک کاپی ہو گیا' },
  'status.link.whatsapp': { en: 'Share on WhatsApp', ur: 'واٹس ایپ پر بھیجیں' },
  'status.link.existing': { en: 'Links that still work', ur: 'جو لنک ابھی چل رہے ہیں' },
  'status.link.none': { en: 'No working links for this case.', ur: 'اس مقدمے کا کوئی لنک ابھی نہیں چل رہا۔' },
  'status.link.loading': { en: 'Loading links…', ur: 'لنک لوڈ ہو رہے ہیں…' },
  'status.link.revoke': { en: 'Revoke', ur: 'بند کریں' },
  'status.link.revoked': { en: 'Link revoked — it no longer works.', ur: 'لنک بند کر دیا گیا — اب یہ کام نہیں کرے گا۔' },
  'status.link.withNote': { en: 'shows last note', ur: 'نوٹ بھی دکھاتا ہے' },
  'status.link.close': { en: 'Close', ur: 'واپس' },
  'status.link.error': { en: 'Could not do that. Please check your internet and try again.', ur: 'یہ کام نہیں ہو سکا۔ براہِ کرم انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔' },
  'status.link.forbidden': { en: 'Your role may not share case status.', ur: 'آپ کے عہدے کو مقدمے کی صورتحال شیئر کرنے کی اجازت نہیں۔' },
  'status.link.notSetUp': {
    en: 'Client status links are not switched on yet. Ask whoever set up the chamber to run supabase/status-links.sql.',
    ur: 'موکل کے لیے صورتحال کے لنک ابھی چالو نہیں ہوئے۔ جنہوں نے چیمبر سیٹ اپ کیا تھا ان سے supabase/status-links.sql چلانے کو کہیں۔',
  },
} satisfies Record<string, Entry>;
