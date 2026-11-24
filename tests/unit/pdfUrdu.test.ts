import { PDFDocument, PDFPage } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hearingPrepPdf, practiceReportPdf, type PracticeStats, type PrepInput } from '../../src/lib/pdfBriefs';
import { caseStatusPdf, draftPdf, feeReceiptPdf, type FeeReceiptInput } from '../../src/lib/pdfDocs';
import { URDU_0_99, amountInWordsUrdu, baseDirection, formatPkUrdu, hasArabic, numberInWordsUrdu, rupeesUrdu, urduClock, type ArabicRenderer } from '../../src/lib/pdfUrdu';

const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

/** A fake renderer (jsdom has no canvas): records every call and returns a 1x1 PNG of a plausible size. */
function fakeRenderer() {
  const calls: { text: string; align: string; bold?: boolean }[] = [];
  const renderer: ArabicRenderer = async (text, o) => {
    calls.push({ text, align: o.align, bold: o.bold });
    return { png: PNG, widthPt: Math.min(o.maxWidthPt, text.length * o.sizePt * 0.45), heightPt: o.sizePt * 2 };
  };
  return { renderer, calls, texts: () => calls.map((c) => c.text) };
}

/** Every string pdf-lib was asked to draw as vector text. */
function spyDrawText() {
  const spy = vi.spyOn(PDFPage.prototype, 'drawText');
  return () => spy.mock.calls.map((c) => String(c[0]));
}
afterEach(() => vi.restoreAllMocks());

const receipt: FeeReceiptInput = {
  receiptNo: 'R-K1-001',
  chamberName: 'Arooj & Associates',
  clientName: 'محمد عثمان',
  caseTitle: 'محمد عثمان بنام سرکار',
  caseNo: 'Crl. Misc. 4521-B/2026',
  amount: 25000,
  mode: 'Cash',
  date: '2026-11-23',
  note: 'ضمانت کی پیشی کی فیس',
};

describe('amountInWordsUrdu', () => {
  it('has all hundred number words, none repeated', () => {
    expect(URDU_0_99).toHaveLength(100);
    expect(new Set(URDU_0_99).size).toBe(100);
    for (const w of URDU_0_99) expect(hasArabic(w)).toBe(true);
  });
  it.each([
    [0, 'صفر روپے صرف'],
    [1, 'ایک روپیہ صرف'],
    [2, 'دو روپے صرف'],
    [11, 'گیارہ روپے صرف'],
    [21, 'اکیس روپے صرف'],
    [49, 'انچاس روپے صرف'],
    [63, 'تریسٹھ روپے صرف'],
    [79, 'اناسی روپے صرف'],
    [99, 'ننانوے روپے صرف'],
    [100, 'ایک سو روپے صرف'],
    [101, 'ایک سو ایک روپے صرف'],
    [999, 'نو سو ننانوے روپے صرف'],
    [1000, 'ایک ہزار روپے صرف'],
    [1500, 'ایک ہزار پانچ سو روپے صرف'],
    [25000, 'پچیس ہزار روپے صرف'],
    [99999, 'ننانوے ہزار نو سو ننانوے روپے صرف'],
    [100000, 'ایک لاکھ روپے صرف'],
    [123456, 'ایک لاکھ تئیس ہزار چار سو چھپن روپے صرف'],
    [250050, 'دو لاکھ پچاس ہزار پچاس روپے صرف'],
    [10000000, 'ایک کروڑ روپے صرف'],
    [15000000, 'ایک کروڑ پچاس لاکھ روپے صرف'],
    [12345678, 'ایک کروڑ تئیس لاکھ پینتالیس ہزار چھ سو اٹھہتر روپے صرف'],
    [1000000000, 'ایک سو کروڑ روپے صرف'],
    [25000.75, 'پچیس ہزار روپے صرف'],
  ])('%d', (n, words) => expect(amountInWordsUrdu(n)).toBe(words));
  it('handles crores of crores', () => {
    expect(numberInWordsUrdu(12_000 * 10_000_000)).toBe('بارہ ہزار کروڑ');
  });
});

describe('Urdu helpers', () => {
  it('spots Arabic script and the base direction', () => {
    expect(hasArabic('Muhammad Usman')).toBe(false);
    expect(hasArabic('عروج')).toBe(true);
    expect(hasArabic('ﻻ')).toBe(true); // presentation forms
    expect(baseDirection('Received from عروج')).toBe('ltr');
    expect(baseDirection('125 عروج Khan')).toBe('rtl');
    expect(baseDirection('\u200FMuhammad Usman سے')).toBe('rtl');
  });
  it('writes Urdu clock times', () => {
    expect(urduClock('09:00 AM')).toBe('09:00 قبل دوپہر');
    expect(urduClock('02:30 PM')).toBe('02:30 بعد دوپہر');
    expect(urduClock('odd')).toBe('odd');
  });
  it('writes Urdu dates', () => {
    expect(formatPkUrdu('2026-11-23')).toBe('23 نومبر 2026');
  });
});

describe('Urdu data on the English PDFs', () => {
  it('fee receipt sends Urdu strings to the renderer, never to drawText', async () => {
    const drawn = spyDrawText();
    const r = fakeRenderer();
    const bytes = await feeReceiptPdf(receipt, { renderer: r.renderer });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    expect(r.texts()).toEqual(expect.arrayContaining(['محمد عثمان بنام سرکار', 'ضمانت کی پیشی کی فیس']));
    expect(r.texts().some((t) => t.startsWith('Received with thanks from محمد عثمان'))).toBe(true);
    expect(drawn().length).toBeGreaterThan(5);
    for (const t of drawn()) {
      expect(hasArabic(t)).toBe(false);
      expect(t).not.toMatch(/\?/);
    }
  });
  it('without a working canvas (jsdom) it still builds, falling back to "?"', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const bytes = await feeReceiptPdf(receipt);
    expect(bytes.length).toBeGreaterThan(500);
  });
  it('case status: Urdu client, title and proceedings go to the renderer', async () => {
    const drawn = spyDrawText();
    const r = fakeRenderer();
    await caseStatusPdf(
      {
        chamberName: 'عروج ایسوسی ایٹس',
        clientName: 'زاہد ٹریڈرز',
        caseTitle: 'Zahid Traders v. Federation of Pakistan',
        caseNo: 'W.P. 30112/2026',
        court: 'Lahore High Court',
        judge: 'Hon. Judge',
        stage: 'Arguments',
        status: 'pending',
        hearings: [{ date: '2026-10-01', proceedings: 'فریقین کے دلائل سنے گئے۔', nextDate: '2026-11-25' }],
        date: '2026-11-23',
      },
      { renderer: r.renderer },
    );
    expect(r.texts()).toEqual(expect.arrayContaining(['عروج ایسوسی ایٹس', 'زاہد ٹریڈرز']));
    expect(r.texts().some((t) => t.startsWith('فریقین کے دلائل سنے گئے۔'))).toBe(true);
    for (const t of drawn()) expect(t).not.toMatch(/\?\?/);
  });
  it('hearing prep sheet and monthly report draw Urdu data through the renderer', async () => {
    const drawn = spyDrawText();
    const r = fakeRenderer();
    const prep: PrepInput = {
      chamberName: 'Arooj & Associates',
      caseTitle: 'محمد عثمان بنام سرکار',
      caseNo: '4521-B/2026',
      court: 'Sessions Court',
      judge: 'Judge',
      stage: 'Bail',
      status: 'pending',
      clientName: 'محمد عثمان',
      hearings: [{ date: '2026-11-01', proceedings: 'تاریخ ملی', nextDate: '2026-11-20' }],
      tasks: [{ title: 'نقل حاصل کریں' }],
      notes: [{ date: '2026-11-02', text: 'موکل سے بات ہوئی' }],
      documents: ['درخواست ضمانت.pdf', 'FIR.pdf'],
      date: '2026-11-23',
    };
    await hearingPrepPdf(prep, { renderer: r.renderer });
    const stats: PracticeStats = {
      month: '2026-11',
      filed: [{ caseNo: '1/2026', title: 'عروج بنام سرکار', court: 'LHC', category: 'Civil', status: 'Pending', date: '2026-11-03', detail: '' }],
      heard: [],
      decided: [],
      pendingTotal: 1,
      byCategory: [['Civil', 1]],
      byCourt: [['LHC', 1]],
    };
    await practiceReportPdf({ chamberName: 'Arooj & Associates', stats, date: '2026-11-23' }, { renderer: r.renderer });
    expect(r.texts()).toEqual(expect.arrayContaining(['محمد عثمان بنام سرکار', 'محمد عثمان', 'موکل سے بات ہوئی', 'عروج بنام سرکار']));
    expect(r.texts().some((t) => t.startsWith('تاریخ ملی'))).toBe(true);
    expect(r.texts().some((t) => t.startsWith('نقل حاصل کریں'))).toBe(true);
    for (const t of drawn()) expect(hasArabic(t) || /\?\?/.test(t)).toBe(false);
  });
  it('draft export prints Urdu paragraphs as images', async () => {
    const r = fakeRenderer();
    const bytes = await draftPdf('Draft', 'IN THE COURT\n\nبعدالت جناب سول جج صاحب\nPlaintiff', { renderer: r.renderer });
    expect(r.texts()).toEqual(['بعدالت جناب سول جج صاحب']);
    expect(r.calls[0].align).toBe('right');
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});

describe('Urdu and bilingual client PDFs', () => {
  it('Urdu fee receipt: Urdu headings, right-aligned labels and amount in words', async () => {
    const drawn = spyDrawText();
    const r = fakeRenderer();
    await feeReceiptPdf({ ...receipt, clientName: 'Muhammad Usman', lang: 'ur' }, { renderer: r.renderer });
    const texts = r.texts();
    expect(texts).toEqual(expect.arrayContaining(['رسیدِ فیس', 'رسید نمبر', 'تاریخ', 'مقدمہ', 'مقدمہ نمبر', 'رقم', 'رقم بالفاظ', 'طریقۂ ادائیگی', 'نوٹ', 'دستخط و مہر', 'پچیس ہزار روپے صرف', 'نقد', '23 نومبر 2026']));
    expect(texts.some((t) => t.startsWith('\u200FMuhammad Usman سے مبلغ 25,000 روپے (پچیس ہزار روپے صرف)'))).toBe(true);
    expect(r.calls.find((c) => c.text === 'رسید نمبر')?.align).toBe('right');
    // English wording is not printed in the Urdu version
    expect(drawn()).not.toContain('FEE RECEIPT');
    expect(drawn().some((t) => t.startsWith('Received with thanks'))).toBe(false);
  });
  it('bilingual fee receipt prints the English then the Urdu wording', async () => {
    const drawn = spyDrawText();
    const r = fakeRenderer();
    const bytes = await feeReceiptPdf({ ...receipt, clientName: 'Muhammad Usman', lang: 'both' }, { renderer: r.renderer });
    expect(drawn()).toContain('FEE RECEIPT');
    expect(drawn()).toContain('Receipt No.');
    expect(drawn().some((t) => t.startsWith('Received with thanks from Muhammad Usman'))).toBe(true);
    expect(r.texts()).toEqual(expect.arrayContaining(['رسیدِ فیس', 'رسید نمبر', 'دستخط و مہر']));
    expect(r.calls.find((c) => c.text === 'رسید نمبر')?.align).toBe('left');
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
  it('Urdu case status report with a hearings table over several pages', async () => {
    const r = fakeRenderer();
    const bytes = await caseStatusPdf(
      {
        chamberName: 'Arooj & Associates',
        clientName: 'Zahid Traders',
        caseTitle: 'Zahid Traders v. Federation of Pakistan',
        caseNo: 'W.P. 30112/2026',
        court: 'Lahore High Court',
        judge: 'Hon. Judge',
        stage: 'Arguments',
        status: 'reserved',
        hearings: Array.from({ length: 40 }, (_, i) => ({ date: '2026-10-01', proceedings: `Adjourned on request ${i}. `.repeat(4), nextDate: '2026-10-15' })),
        fee: { agreed: 100000, received: 40000, outstanding: 60000 },
        date: '2026-11-23',
        lang: 'ur',
      },
      { renderer: r.renderer },
    );
    const pages = (await PDFDocument.load(bytes)).getPageCount();
    expect(pages).toBeGreaterThan(1);
    expect(r.texts()).toEqual(
      expect.arrayContaining(['مقدمے کی صورتحال کی رپورٹ', 'موکل', 'عدالت', 'جج / بینچ', 'مرحلہ', 'حیثیت', 'فیصلہ محفوظ', 'اگلی پیشی', 'مقرر نہیں', 'تاریخِ رپورٹ', 'فیس', 'طے شدہ', 'بقایا', rupeesUrdu(100000), 'تاریخ', 'کارروائی', 'اگلی تاریخ', `صفحہ 1 از ${pages}`]),
    );
  });
  it('bilingual case status keeps the English layout with Urdu labels under it', async () => {
    const drawn = spyDrawText();
    const r = fakeRenderer();
    await caseStatusPdf(
      { chamberName: 'K', clientName: 'A', caseTitle: 'A v B', caseNo: '1', court: 'LHC', judge: 'J', stage: 'Arguments', status: 'pending', hearings: [], date: '2026-11-24', lang: 'both' },
      { renderer: r.renderer },
    );
    expect(drawn()).toEqual(expect.arrayContaining(['CASE STATUS REPORT', 'Client', 'Hearing history']));
    expect(r.texts()).toEqual(expect.arrayContaining(['مقدمے کی صورتحال کی رپورٹ', 'موکل', 'پیشیوں کی تفصیل', 'ابھی کوئی پیشی درج نہیں۔']));
  });
});
