import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { amountInWords, caseStatusPdf, draftPdf, feeReceiptPdf, pdfSafe, wrapText } from '../../src/lib/pdfDocs';

describe('amountInWords', () => {
  it('writes rupees in the Pakistani lakh/crore system', () => {
    expect(amountInWords(0)).toBe('Rupees Zero Only');
    expect(amountInWords(25000)).toBe('Rupees Twenty-Five Thousand Only');
    expect(amountInWords(150000)).toBe('Rupees One Lakh Fifty Thousand Only');
    expect(amountInWords(12345678)).toBe('Rupees One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight Only');
    expect(amountInWords(101)).toBe('Rupees One Hundred One Only');
  });
});

describe('text helpers', () => {
  it('replaces characters the standard fonts cannot encode', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.TimesRoman);
    expect(pdfSafe('Rs 5,000 — paid “cash” ’26', font)).toBe('Rs 5,000 — paid “cash” ’26');
    expect(pdfSafe('Name: عروج', font)).toBe('Name: ????');
  });
  it('wraps long text to the width', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.TimesRoman);
    const lines = wrapText('word '.repeat(100), font, 12, 200);
    expect(lines.length).toBeGreaterThan(5);
    for (const l of lines) expect(font.widthOfTextAtSize(l, 12)).toBeLessThanOrEqual(200);
    expect(wrapText('a\n\nb', font, 12, 200)).toEqual(['a', '', 'b']);
  });
});

describe('generated PDFs', () => {
  it('fee receipt', async () => {
    const bytes = await feeReceiptPdf({
      receiptNo: 'R-k1-1',
      chamberName: 'Arooj & Associates',
      clientName: 'Muhammad Usman',
      caseTitle: 'Muhammad Usman v. The State',
      caseNo: 'Crl. Misc. 4521-B/2026',
      amount: 25000,
      mode: 'Cash',
      date: '2026-11-23',
      note: 'Bail hearing fee',
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
  it('case status sheet', async () => {
    const bytes = await caseStatusPdf({
      chamberName: 'Arooj & Associates',
      clientName: 'Zahid Traders',
      caseTitle: 'Zahid Traders v. Federation of Pakistan',
      caseNo: 'W.P. 30112/2026',
      court: 'Lahore High Court',
      judge: 'Hon. Judge',
      stage: 'Arguments',
      status: 'pending',
      nextHearing: '2026-11-25T09:00:00+05:00',
      hearings: Array.from({ length: 40 }, (_, i) => ({ date: '2026-10-01', proceedings: `Adjourned on request ${i}. `.repeat(4) })),
      fee: { agreed: 100000, received: 40000, outstanding: 60000 },
      date: '2026-11-23',
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });
  it('draft export', async () => {
    const bytes = await draftPdf('Bail petition', 'IN THE COURT\n\n' + 'Lorem ipsum dolor sit amet. '.repeat(400));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });
});
