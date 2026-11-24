import type { Entry } from './i18n-dict';

/** Urdu for the library screens. Keys are prefixed `library.`. */
export const LIBRARY = {
  'library.title': { en: "Law Books", ur: "قانونی کتابیں" },
  'library.subtitle': { en: "Your private shelf — books you own, searchable from court.", ur: "آپ کی اپنی شیلف — آپ کی ملکیتی کتابیں، جو عدالت میں بھی تلاش کی جا سکتی ہیں۔" },
  'library.upload': { en: "Upload a book (PDF)", ur: "کتاب اپ لوڈ کریں (PDF)" },
  'library.noticeA': { en: "Law books are copyrighted, so each lawyer's shelf is ", ur: "قانونی کتابیں کاپی رائٹ کے تحت ہوتی ہیں، اس لیے ہر وکیل کی شیلف " },
  'library.noticeStrong': { en: "private to them", ur: "صرف اسی کی ذاتی" },
  'library.noticeB': { en: " — only books you own and upload. Pages of a book are searchable when its text can be read; scanned books are stored but not searchable yet.", ur: " ہوتی ہے — صرف وہ کتابیں جو آپ کی اپنی ہوں اور آپ اپ لوڈ کریں۔ جب کتاب کا متن پڑھا جا سکے تو اس کے صفحات میں تلاش ہو سکتی ہے؛ اسکین شدہ کتابیں محفوظ ہو جاتی ہیں مگر ابھی ان میں تلاش نہیں ہو سکتی۔" },
  'library.searchPlaceholder': { en: "Search your books…", ur: "اپنی کتابوں میں تلاش کریں…" },
  'library.searchAria': { en: "Search books", ur: "کتابیں تلاش کریں" },
  'library.emptyTitle': { en: "No books found", ur: "کوئی کتاب نہیں ملی" },
  'library.emptyBody': { en: "Upload a PDF of a law book you own and it appears on your shelf.", ur: "اپنی ملکیتی قانونی کتاب کی PDF اپ لوڈ کریں، وہ آپ کی شیلف پر آ جائے گی۔" },
  'library.openAria': { en: "Open {title}", ur: "{title} کھولیں" },
  'library.removeAria': { en: "Remove {title}", ur: "{title} ہٹائیں" },
  'library.pagesDot': { en: "{n} pages · ", ur: "{n} صفحات · " },
  'library.addedOn': { en: "added {date}", ur: "شامل کی گئی: {date}" },
  'library.notPdf': { en: "{name} is not a PDF.", ur: "{name} PDF نہیں ہے۔" },
  'library.adding': { en: "Adding {name}…", ur: "{name} شامل ہو رہی ہے…" },
  'library.addingPct': { en: "Adding {name} · {pct}%", ur: "{name} شامل ہو رہی ہے · {pct}%" },
  'library.couldNotAdd': { en: "Could not add {name}.", ur: "{name} شامل نہیں ہو سکی۔" },
  'library.addedOne': { en: "1 book added to your shelf", ur: "1 کتاب آپ کی شیلف میں شامل ہو گئی" },
  'library.addedMany': { en: "{n} books added to your shelf", ur: "{n} کتابیں آپ کی شیلف میں شامل ہو گئیں" },
  'library.confirmRemove': { en: "Remove \"{title}\" from your shelf? The PDF will be deleted.", ur: "\"{title}\" کو شیلف سے ہٹائیں؟ اس کی PDF حذف ہو جائے گی۔" },
  'library.removed': { en: "Book removed", ur: "کتاب ہٹا دی گئی" },
} satisfies Record<string, Entry>;
