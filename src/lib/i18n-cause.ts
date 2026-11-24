import type { Entry } from './i18n-dict';

/** English and Urdu strings for the cause feature. Keys are prefixed `cause.`. */
export const CAUSE = {
  // Paste a cause list → update hearing dates
  'cause.pasteTitle': { en: 'Paste a cause list', ur: 'Cause List پیسٹ کریں' },
  'cause.pasteHint': {
    en: "Copy the cause list from the court's website or PDF and paste it here. Your cases are found by case number and their next hearing date is updated.",
    ur: 'عدالت کی ویب سائٹ یا PDF سے Cause List کاپی کر کے یہاں پیسٹ کریں۔ کیس نمبر سے آپ کے مقدمات تلاش ہوں گے اور ان کی اگلی تاریخ پیشی درج ہو جائے گی۔',
  },
  'cause.pasteLabel': { en: 'Cause-list text', ur: 'Cause List کا متن' },
  'cause.pastePlaceholder': { en: 'Court No. 7\n12. W.P. No. 1234/2026 Zahid Traders v. Federation …', ur: 'کورٹ نمبر 7\n12. W.P. No. 1234/2026 زاہد ٹریڈرز بنام وفاق …' },
  'cause.dateLabel': { en: 'Hearing date', ur: 'تاریخ پیشی' },
  'cause.dateFound': { en: 'Date found in the text', ur: 'یہ تاریخ متن میں ملی' },
  'cause.find': { en: 'Find my cases', ur: 'میرے مقدمات تلاش کریں' },
  'cause.noneFound': { en: 'None of your cases are in this text', ur: 'اس متن میں آپ کا کوئی مقدمہ نہیں ملا' },
  'cause.noneFoundHint': { en: 'Check that you copied the whole list and that the case numbers are written with the year.', ur: 'دیکھ لیں کہ پوری لسٹ کاپی ہوئی ہے اور کیس نمبر کے ساتھ سال لکھا ہے۔' },
  'cause.foundCount': { en: '{n} of your cases found', ur: 'آپ کے {n} مقدمات ملے' },
  'cause.exact': { en: 'Exact match', ur: 'پورا میل' },
  'cause.numberOnly': { en: 'Number only — check', ur: 'صرف نمبر ملا — تصدیق کریں' },
  'cause.ambiguous': { en: 'Ambiguous — number fits more than one case', ur: 'شک — یہ نمبر ایک سے زیادہ مقدمات کا ہے' },
  'cause.sr': { en: 'Sr.', ur: 'نمبر شمار' },
  'cause.room': { en: 'Court', ur: 'کورٹ' },
  'cause.include': { en: 'Include {title}', ur: '{title} شامل کریں' },
  'cause.update': { en: 'Update {n} hearings', ur: '{n} پیشیاں اپ ڈیٹ کریں' },
  'cause.updated': { en: '{n} hearings set for {date}', ur: '{n} مقدمات کی پیشی {date} کو لگ گئی' },
  'cause.changedTitle': { en: 'What changed', ur: 'کیا تبدیلی ہوئی' },
  'cause.changedFrom': { en: 'was {from}', ur: 'پہلے {from} تھی' },
  'cause.notFixed': { en: 'not fixed', ur: 'مقرر نہیں تھی' },
  'cause.notMine': { en: 'Not in your cases', ur: 'آپ کے مقدمات میں نہیں' },
  'cause.notMineHint': { en: 'These case numbers are in the text but not in your cases.', ur: 'یہ کیس نمبر متن میں ہیں مگر آپ کے مقدمات میں نہیں۔' },
  'cause.pickDate': { en: 'Choose the hearing date first', ur: 'پہلے تاریخ پیشی منتخب کریں' },
  'cause.checkOfficial': { en: 'Always double-check against the official cause list.', ur: 'ہمیشہ اصل Cause List سے دوبارہ ملا لیں۔' },

  // Calendar export
  'cause.addToCalendar': { en: 'Add to calendar', ur: 'کیلنڈر میں شامل کریں' },
  'cause.exportCalendar': { en: 'Export hearings to calendar', ur: 'پیشیاں کیلنڈر میں بھیجیں' },
  'cause.calendarDone': { en: 'Calendar file saved — open it to add {n} hearings', ur: 'کیلنڈر فائل محفوظ ہو گئی — {n} پیشیاں شامل کرنے کے لیے اسے کھولیں' },
  'cause.calendarNone': { en: 'No hearings in the next 60 days', ur: 'اگلے 60 دن میں کوئی پیشی نہیں' },
  'cause.calendarHint': { en: 'A .ics file for Google Calendar, Outlook or your phone, with reminders a day and an hour before.', ur: 'Google Calendar، Outlook یا فون کے لیے .ics فائل، ایک دن اور ایک گھنٹہ پہلے یاد دہانی کے ساتھ۔' },
  'cause.hearingOf': { en: 'Hearing: {title}', ur: 'پیشی: {title}' },
} satisfies Record<string, Entry>;
