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

export const DICT = {
  // Sidebar groups
  'group.Overview': { en: 'Overview', ur: 'جائزہ' },
  'group.Practice': { en: 'Practice', ur: 'پریکٹس' },
  'group.Research': { en: 'Research', ur: 'تحقیق' },
  'group.Office': { en: 'Office', ur: 'دفتر' },

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
} satisfies Record<string, Entry>;

export type DictKey = keyof typeof DICT;
