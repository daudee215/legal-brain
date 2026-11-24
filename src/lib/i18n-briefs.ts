import type { Entry } from './i18n-dict';

/** English and Urdu strings for the briefs feature. Keys are prefixed `briefs.`. */
export const BRIEFS = {
  'briefs.prepButton': { en: 'Hearing prep sheet', ur: 'پیشی کی تیاری شیٹ' },
  'briefs.prepError': { en: 'Could not make the prep sheet', ur: 'تیاری شیٹ نہیں بن سکی' },
  'briefs.reportTitle': { en: 'Monthly practice report', ur: 'ماہانہ کارکردگی رپورٹ' },
  'briefs.reportHint': {
    en: 'One PDF for the month: new cases, hearings held, cases decided, and what is pending now by category and court.',
    ur: 'مہینے بھر کی ایک PDF: نئے مقدمات، ہونے والی پیشیاں، فیصلے ہونے والے مقدمات، اور اس وقت زیرِ سماعت مقدمات قسم اور عدالت کے لحاظ سے۔',
  },
  'briefs.reportFeesNote': {
    en: 'This report also lists fees received in the month and the total still outstanding.',
    ur: 'اس رپورٹ میں مہینے میں وصول ہونے والی فیس اور کل بقایا فیس بھی شامل ہوگی۔',
  },
  'briefs.month': { en: 'Month', ur: 'مہینہ' },
  'briefs.download': { en: 'Download report PDF', ur: 'رپورٹ PDF ڈاؤن لوڈ کریں' },
  'briefs.reportError': { en: 'Could not make the report', ur: 'رپورٹ نہیں بن سکی' },
  'briefs.reportDone': { en: 'Report downloaded', ur: 'رپورٹ ڈاؤن لوڈ ہو گئی' },
  'briefs.pickMonth': { en: 'Choose a month first', ur: 'پہلے مہینہ منتخب کریں' },
} satisfies Record<string, Entry>;
