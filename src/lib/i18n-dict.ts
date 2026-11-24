/**
 * English + Urdu strings for the app shell and Munshi Mode.
 * Urdu is written the way a Pakistani lawyer or munshi actually says it in the kachehri:
 * common court words stay as people use them (پیشی، اگلی تاریخ، مقدمہ، موکل، نقل، "Cause List").
 * Keys for nav items are `nav.<href>` so the English `label` in nav.ts stays the source of truth.
 * Placeholders use `{name}` and are filled by `t(key, { name })`.
 */
export type Lang = 'en' | 'ur';
export interface Entry {
  en: string;
  ur: string;
}

import { CHAMBER } from './i18n-chamber';
import { DOCS } from './i18n-docs';
import { LIBRARY } from './i18n-library';
import { BRIEFS } from './i18n-briefs';
import { CONFLICT } from './i18n-conflict';
import { MFA } from './i18n-mfa';
import { PDFUR } from './i18n-pdfur';
import { STATUS } from './i18n-status';
import { CAUSE } from './i18n-cause';
import { LOCK } from './i18n-lock';
import { PROMISES } from './i18n-promises';
import { SAFETY } from './i18n-safety';
import { SCAN } from './i18n-scan';
import { STUDIO } from './i18n-studio';

export const DICT = {
  ...STUDIO,
  ...SAFETY,
  ...SCAN,
  ...BRIEFS,
  ...CAUSE,
  ...PROMISES,
  ...LOCK,
  ...STATUS,
  ...MFA,
  ...PDFUR,
  ...CONFLICT,
  ...CHAMBER,
  ...DOCS,
  ...LIBRARY,
  // Sidebar groups
  'group.Overview': { en: 'Overview', ur: 'جائزہ' },
  'group.Practice': { en: 'Practice', ur: 'پریکٹس' },
  'group.Research': { en: 'Research', ur: 'تحقیق' },
  'group.Office': { en: 'Office', ur: 'دفتر' },

  // Phone tab bar (short labels)
  'tab./app/': { en: 'Dashboard', ur: 'ڈیش بورڈ' },
  'tab./app/today/': { en: 'Today', ur: 'آج' },
  'tab./app/cases/': { en: 'Cases', ur: 'مقدمات' },
  'tab./app/diary/': { en: 'Diary', ur: 'ڈائری' },
  'tab.more': { en: 'More', ur: 'مزید' },

  // Nav items (English must match nav.ts labels exactly)
  'nav./app/': { en: 'Dashboard', ur: 'ڈیش بورڈ' },
  'nav./app/today/': { en: 'Today', ur: 'آج' },
  'nav./app/cases/': { en: 'Cases & Clients', ur: 'مقدمات اور موکل' },
  'nav./app/cause-list/': { en: 'Daily Cause List', ur: 'روزانہ کاز لسٹ' },
  'nav./app/diary/': { en: 'Digital Diary', ur: 'ڈائری' },
  'nav./app/deadlines/': { en: 'Deadlines', ur: 'میعاد اور آخری تاریخیں' },
  'nav./app/tasks/': { en: 'Tasks', ur: 'کام' },
  'nav./app/documents/': { en: 'Documents', ur: 'کاغذات' },
  'nav./app/laws/': { en: 'Laws & Statutes', ur: 'قوانین' },
  'nav./app/case-law/': { en: 'Case Law', ur: 'نظائر (کیس لاء)' },
  'nav./app/assistant/': { en: 'AI Assistant', ur: 'اے آئی معاون' },
  'nav./app/precedents/': { en: 'Precedents', ur: 'حوالہ جات' },
  'nav./app/library/': { en: 'Law Books', ur: 'قانونی کتب' },
  'nav./app/news/': { en: 'Legal News', ur: 'قانونی خبریں' },
  'nav./app/drafting/': { en: 'Legal Drafting', ur: 'درخواست نویسی' },
  'nav./app/paper-book/': { en: 'Paper Book', ur: 'پیپر بک' },
  'nav./app/chamber/': { en: 'Chamber', ur: 'چیمبر' },
  'nav./app/tools/': { en: 'Tools', ur: 'اوزار' },
  'nav./app/munshi/': { en: 'Munshi Mode', ur: 'منشی موڈ' },
  'nav./app/studio/': { en: 'Chamber Studio', ur: 'چیمبر اسٹوڈیو' },
  'nav./app/settings/': { en: 'Data & Backup', ur: 'ڈیٹا اور بیک اپ' },

  // Sidebar chrome
  'shell.website': { en: 'Legal Brain website', ur: 'لیگل برین ویب سائٹ' },
  'shell.collapse': { en: 'Collapse', ur: 'چھوٹا کریں' },
  'shell.expandSidebar': { en: 'Expand sidebar', ur: 'سائیڈ بار کھولیں' },
  'shell.collapseSidebar': { en: 'Collapse sidebar', ur: 'سائیڈ بار بند کریں' },
  'shell.advPrefix': { en: 'Adv.', ur: 'ایڈووکیٹ' },
  'shell.menu': { en: 'Menu', ur: 'مینو' },
  'shell.openMenu': { en: 'Open menu', ur: 'مینو کھولیں' },
  'shell.closeMenu': { en: 'Close menu', ur: 'مینو بند کریں' },

  // Roles
  'role.senior': { en: 'Senior', ur: 'سینئر وکیل' },
  'role.junior': { en: 'Junior', ur: 'جونیئر وکیل' },
  'role.clerk': { en: 'Clerk', ur: 'منشی' },

  // Topbar
  'top.search': { en: 'Search cases, clients, laws…', ur: 'مقدمات، موکل، قوانین تلاش کریں…' },
  'top.searchLabel': { en: 'Search everything', ur: 'سب کچھ تلاش کریں' },
  'top.previewAs': { en: 'Preview as', ur: 'بطور دیکھیں' },
  'top.toLight': { en: 'Switch to light mode', ur: 'روشن موڈ' },
  'top.toDark': { en: 'Switch to dark mode', ur: 'تاریک موڈ' },
  'top.langToggle': { en: 'اردو', ur: 'EN' },
  'top.langLabel': { en: 'Switch to Urdu', ur: 'انگریزی میں دیکھیں' },

  // Cloud sync (signed-in chambers)
  'cloud.status': { en: 'Sync status', ur: 'ہم آہنگی کی صورتحال' },
  'cloud.loading': { en: 'Connecting…', ur: 'رابطہ ہو رہا ہے…' },
  'cloud.saved': { en: 'Saved', ur: 'محفوظ' },
  'cloud.saving': { en: 'Saving…', ur: 'محفوظ ہو رہا ہے…' },
  'cloud.offline': { en: 'Offline — changes kept on this device', ur: 'آف لائن — تبدیلیاں اسی ڈیوائس پر محفوظ ہیں' },
  'cloud.error': { en: 'Sync problem — retrying', ur: 'ہم آہنگی میں مسئلہ — دوبارہ کوشش جاری' },
  'cloud.unreachableTitle': { en: 'Can’t reach the server', ur: 'سرور سے رابطہ نہیں ہو رہا' },
  'cloud.unreachableBody': {
    en: 'Check your internet connection. Your chamber opens as soon as you are back online.',
    ur: 'انٹرنیٹ چیک کریں۔ کنکشن بحال ہوتے ہی آپ کا چیمبر کھل جائے گا۔',
  },
  'cloud.retry': { en: 'Try again', ur: 'دوبارہ کوشش کریں' },
  'account.menu': { en: 'Account', ur: 'اکاؤنٹ' },
  'account.signedInAs': { en: 'Signed in as', ur: 'لاگ اِن:' },
  'account.signOut': { en: 'Sign out', ur: 'لاگ آؤٹ' },
  'account.settings': { en: 'Cloud sync & backup', ur: 'کلاؤڈ اور بیک اپ' },
  'account.chamber': { en: 'Chamber members', ur: 'چیمبر کے اراکین' },
  'account.unsynced': {
    en: 'Some changes have not reached the server yet (no internet?). Signing out now removes them from this device. Sign out anyway?',
    ur: 'کچھ تبدیلیاں ابھی سرور تک نہیں پہنچیں (انٹرنیٹ؟)۔ ابھی لاگ آؤٹ کرنے سے یہ اس ڈیوائس سے مٹ جائیں گی۔ پھر بھی لاگ آؤٹ کریں؟',
  },

  // Demo banner
  'demo.text': { en: 'You’re exploring demo data. Your first edit saves a private copy on this device.', ur: 'آپ ڈیمو ڈیٹا دیکھ رہے ہیں۔ پہلی تبدیلی پر ایک نجی کاپی اسی ڈیوائس پر محفوظ ہو جائے گی۔' },
  'demo.start': { en: 'Start my own practice', ur: 'اپنی پریکٹس شروع کریں' },
  'demo.shared': { en: 'Create a shared chamber', ur: 'مشترکہ چیمبر بنائیں' },
  'demo.or': { en: 'or', ur: 'یا' },
  'demo.hide': { en: 'Hide demo notice', ur: 'ڈیمو نوٹس چھپائیں' },

  // Create or join a chamber (signed in, no chamber yet)
  'setup.title': { en: 'Set up your chamber', ur: 'اپنا چیمبر بنائیں' },
  'setup.subtitle': { en: 'You are signed in as {email} but not part of a chamber yet.', ur: 'آپ {email} سے لاگ اِن ہیں مگر ابھی کسی چیمبر کا حصہ نہیں۔' },
  'setup.create': { en: 'Create a chamber', ur: 'نیا چیمبر' },
  'setup.join': { en: 'Join with an invite', ur: 'دعوت سے شامل ہوں' },
  'setup.chamberName': { en: 'Chamber name', ur: 'چیمبر کا نام' },
  'setup.myName': { en: 'Your name (as colleagues will see it)', ur: 'آپ کا نام (جیسا ساتھی دیکھیں گے)' },
  'setup.invite': { en: 'Invite link or code', ur: 'دعوت کا لنک یا کوڈ' },
  'setup.bring': { en: 'Bring this device’s cases into the new chamber', ur: 'اس ڈیوائس کے مقدمات نئے چیمبر میں لے جائیں' },
  'setup.createBtn': { en: 'Create chamber', ur: 'چیمبر بنائیں' },
  'setup.joinBtn': { en: 'Join chamber', ur: 'چیمبر میں شامل ہوں' },
  'setup.working': { en: 'Please wait…', ur: 'انتظار کریں…' },

  // Munshi Mode
  'munshi.title': { en: 'Munshi Mode', ur: 'منشی موڈ' },
  'munshi.subtitle': { en: 'Big buttons for the court day', ur: 'کچہری کے دن کے لیے آسان بٹن' },
  'munshi.today': { en: "Today's hearings", ur: 'آج کی پیشیاں' },
  'munshi.none': { en: 'No hearings today', ur: 'آج کوئی پیشی نہیں' },
  'munshi.tapCase': { en: 'Tap a case to record what happened', ur: 'کارروائی لکھنے کے لیے مقدمے پر ٹیپ کریں' },
  'munshi.quick': { en: 'Quick actions', ur: 'فوری کام' },
  'munshi.dateGiven': { en: 'Date given (adjourned)', ur: 'تاریخ ملی' },
  'munshi.reserved': { en: 'Judgment reserved', ur: 'فیصلہ محفوظ' },
  'munshi.heard': { en: 'Arguments heard', ur: 'کیس چلا' },
  'munshi.nextDate': { en: 'Next date', ur: 'اگلی تاریخ' },
  'munshi.plusDays': { en: '+{n} days', ur: '+{n} دن' },
  'munshi.pickDate': { en: 'Or pick a date', ur: 'یا تاریخ چنیں' },
  'munshi.save': { en: 'Save', ur: 'محفوظ کریں' },
  'munshi.cancel': { en: 'Cancel', ur: 'واپس' },
  'munshi.back': { en: 'Back', ur: 'پیچھے' },
  'munshi.saved': { en: 'Saved', ur: 'محفوظ ہو گیا' },
  'munshi.copyApplied': { en: 'Applied for certified copy', ur: 'نقل کی درخواست دی' },
  'munshi.copyTask': { en: 'Creates a task to collect it in 7 days', ur: '7 دن میں نقل لینے کا کام بن جائے گا' },
  'munshi.feeReceived': { en: 'Fee received', ur: 'فیس وصول ہوئی' },
  'munshi.amount': { en: 'Amount (Rs.)', ur: 'رقم (روپے)' },
  'munshi.mode': { en: 'Paid by', ur: 'ادائیگی کا طریقہ' },
  'munshi.case': { en: 'Case', ur: 'مقدمہ' },
  'munshi.chooseCase': { en: 'Choose a case', ur: 'مقدمہ چنیں' },
  'munshi.note': { en: 'Diary note', ur: 'ڈائری نوٹ' },
  'munshi.remind': { en: 'Remind clients ({n} left)', ur: 'کلائنٹس کو یاد دہانی ({n} باقی)' },
  'munshi.notePlaceholder': { en: 'Write or speak a short note…', ur: 'مختصر نوٹ لکھیں یا بولیں…' },
  'munshi.speak': { en: 'Speak', ur: 'بولیں' },
  'munshi.listening': { en: 'Listening…', ur: 'سن رہا ہے…' },
  'munshi.court': { en: 'Court', ur: 'عدالت' },
  'munshi.srNo': { en: 'Sr. {n}', ur: 'نمبر {n}' },
  'munshi.mode.Cash': { en: 'Cash', ur: 'نقد' },
  'munshi.mode.Cheque': { en: 'Cheque', ur: 'چیک' },
  'munshi.mode.Bank transfer': { en: 'Bank transfer', ur: 'بینک ٹرانسفر' },
  'munshi.mode.Online': { en: 'Online', ur: 'آن لائن' },
  'munshi.proc.adjourned': { en: 'Adjourned — next date given', ur: 'تاریخ ملی' },
  'munshi.proc.reserved': { en: 'Arguments concluded; judgment reserved', ur: 'فیصلہ محفوظ' },
  'munshi.proc.heard': { en: 'Arguments heard', ur: 'کیس چلا، دلائل سنے گئے' },
  // Dashboard
  'dash.goodMorning': { en: 'Good morning', ur: 'صبح بخیر' },
  'dash.goodAfternoon': { en: 'Good afternoon', ur: 'دوپہر بخیر' },
  'dash.goodEvening': { en: 'Good evening', ur: 'شام بخیر' },
  'dash.advocate': { en: 'Advocate {name}', ur: 'ایڈووکیٹ {name}' },
  'dash.todayNone': { en: 'You have no hearings today', ur: 'آج آپ کی کوئی پیشی نہیں' },
  'dash.todayOne': { en: 'You have 1 hearing today', ur: 'آج آپ کی 1 پیشی ہے' },
  'dash.todayMany': { en: 'You have {n} hearings today', ur: 'آج آپ کی {n} پیشیاں ہیں' },
  'dash.week': { en: 'and {n} more coming up this week.', ur: 'اور اس ہفتے {n} مزید آنے والی ہیں۔' },
  'dash.openCause': { en: "Open today's cause list", ur: 'آج کی کاز لسٹ کھولیں' },
  'dash.ask': { en: 'Ask AI Assistant', ur: 'اے آئی اسسٹنٹ سے پوچھیں' },
  'dash.nextUp': { en: 'Next up', ur: 'اگلی پیشی' },
  'dash.todaysHearings': { en: "Today's hearings", ur: 'آج کی پیشیاں' },
  'dash.fullCause': { en: 'Full cause list', ur: 'مکمل کاز لسٹ' },
  'dash.noHearings': { en: 'No hearings today', ur: 'آج کوئی پیشی نہیں' },
  'dash.quiet': { en: 'Enjoy the quiet — use it to prepare for the week ahead.', ur: 'سکون کا دن ہے، اگلے ہفتے کی تیاری کر لیں۔' },
  'dash.next7': { en: 'Next 7 days', ur: 'اگلے 7 دن' },
  'dash.yourCases': { en: 'Your cases', ur: 'آپ کے مقدمات' },
  'dash.reminded': { en: '{n} not yet reminded about their hearing on {date}.', ur: '{n} کو {date} کی پیشی کی یاد دہانی ابھی نہیں بھیجی گئی۔' },
  'dash.clientOne': { en: '1 client', ur: '1 موکل' },
  'dash.clientMany': { en: '{n} clients', ur: '{n} موکل' },
  'dash.sendReminders': { en: 'Send reminders', ur: 'یاد دہانی بھیجیں' },
  'dash.activeCases': { en: "Active cases", ur: "فعال مقدمات" },
  'dash.onFile': { en: "{n} on file", ur: "{n} فائل میں" },
  'dash.hearingsToday': { en: "Hearings today", ur: "آج کی پیشیاں" },
  'dash.acrossCourts': { en: "Across all courts", ur: "تمام عدالتوں میں" },
  'dash.listingsWeek': { en: "Listings this week", ur: "اس ہفتے کی لسٹنگ" },
  'dash.feesOutstanding': { en: "Fees outstanding", ur: "بقایا فیس" },
  'dash.ofAgreed': { en: "of Rs {n} agreed", ur: "طے شدہ Rs {n} میں سے" },
  'dash.decided': { en: "Decided / disposed", ur: "فیصل / نمٹائے گئے" },
  'dash.closed': { en: "Closed matters", ur: "بند مقدمات" },
  'dash.last30': { en: "Last 30 days · next 30 days", ur: "پچھلے 30 دن · اگلے 30 دن" },
  'dash.workload': { en: "Court workload", ur: "عدالتی مصروفیت" },
  'dash.loading': { en: "Loading dashboard", ur: "ڈیش بورڈ لوڈ ہو رہا ہے" },
  'dash.noCases': { en: "No cases yet", ur: "ابھی کوئی مقدمہ نہیں" },
  'dash.noCasesBody': { en: "Add your first case to see it broken down by category, court and status.", ur: "مقدمات کو زمرے، عدالت اور حالت کے لحاظ سے دیکھنے کے لیے پہلا مقدمہ شامل کریں۔" },
  'dash.addCase': { en: "Add a case", ur: "مقدمہ شامل کریں" },
  'dash.byCategory': { en: "By category", ur: "زمرے کے لحاظ سے" },
  'dash.byCourt': { en: "By court", ur: "عدالت کے لحاظ سے" },
  'dash.fees': { en: "Fees", ur: "فیس" },
  'dash.byCase': { en: "By case", ur: "مقدمہ وار" },
  'dash.noFees': { en: "No fees recorded", ur: "کوئی فیس درج نہیں" },
  'dash.noFeesBody': { en: "Record the fee agreed on a case to track what clients have paid.", ur: "موکل کی ادائیگی دیکھنے کے لیے مقدمے پر طے شدہ فیس درج کریں۔" },
  'dash.collected': { en: "collected", ur: "وصول" },
  'dash.received': { en: "Received", ur: "وصول شدہ" },
  'dash.outstanding': { en: "Outstanding", ur: "بقایا" },
  'dash.largest': { en: "Largest balances", ur: "سب سے زیادہ بقایا" },
  'dash.activity': { en: "Chamber activity", ur: "چیمبر کی سرگرمی" },
  'dash.nothingYet': { en: "Nothing yet", ur: "ابھی کچھ نہیں" },
  'dash.activityBody': { en: "Hearings, notes, documents and payments will appear here.", ur: "پیشیاں، نوٹس، کاغذات اور ادائیگیاں یہاں نظر آئیں گی۔" },
  'dash.attention': { en: "Needs attention", ur: "توجہ طلب" },
  'dash.allClear': { en: "All clear", ur: "سب ٹھیک ہے" },
  'dash.allClearBody': { en: "Every live case has its next date.", ur: "ہر زیرِ سماعت مقدمے کی اگلی تاریخ مقرر ہے۔" },
  'dash.reservedWhy': { en: "Judgment reserved — watch for the announcement", ur: "فیصلہ محفوظ — اعلان کا انتظار کریں" },
  'dash.noDateWhy': { en: "No next date fixed — check the court website", ur: "اگلی تاریخ مقرر نہیں — عدالتی ویب سائٹ دیکھیں" },
  'dash.nothingScheduled': { en: "Nothing scheduled", ur: "کچھ مقرر نہیں" },
  'dash.noHearingsWeek': { en: "No hearings in the coming week.", ur: "آنے والے ہفتے میں کوئی پیشی نہیں۔" },
  'dash.checkCourt': { en: "Check on court website", ur: "عدالتی ویب سائٹ پر دیکھیں" },
  'dash.inDay': { en: "In 1 day", ur: "1 دن بعد" },
  'dash.inDays': { en: "In {n} days", ur: "{n} دن بعد" },
  'dash.inHM': { en: "In {h}h {m}m", ur: "{h} گھنٹے {m} منٹ بعد" },
  'dash.inMin': { en: "In {n} min", ur: "{n} منٹ بعد" },
  'status.pending': { en: "Pending", ur: "زیرِ سماعت" },
  'status.adjourned': { en: "Adjourned", ur: "ملتوی" },
  'status.reserved': { en: "Reserved", ur: "فیصلہ محفوظ" },
  'status.decided': { en: "Decided", ur: "فیصل شدہ" },
  'status.disposed': { en: "Disposed", ur: "نمٹایا گیا" },
  'cat.Civil': { en: "Civil", ur: "دیوانی" },
  'cat.Criminal': { en: "Criminal", ur: "فوجداری" },
  'cat.Family': { en: "Family", ur: "عائلی" },
  'cat.Constitutional': { en: "Constitutional", ur: "آئینی" },
  'cat.Rent': { en: "Rent", ur: "کرایہ داری" },
  'cat.Banking': { en: "Banking", ur: "بینکنگ" },
  'cat.Tax': { en: "Tax", ur: "ٹیکس" },
  'cat.Service': { en: "Service", ur: "سروس" },
  'cat.Corporate': { en: "Corporate", ur: "کارپوریٹ" },
  'dash.allCases': { en: 'All cases', ur: 'تمام مقدمات' },
} satisfies Record<string, Entry>;

export type DictKey = keyof typeof DICT;
