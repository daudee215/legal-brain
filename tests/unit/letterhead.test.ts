import { describe, expect, it } from 'vitest';
import { letterheadOf } from '../../src/lib/chamberSettings';
import { caseStatusPdf, feeReceiptPdf } from '../../src/lib/pdfDocs';

const settings = (profile?: Record<string, string>) => ({ settings: [{ id: 'main', accent: 'bronze' as const, updatedOn: '2026-11-24', profile }] });

describe('letterhead', () => {
  it('falls back to the default tagline with no contact line', () => {
    expect(letterheadOf({ settings: [] })).toEqual({ tagline: 'Advocates & Legal Consultants', contact: '' });
  });
  it('uses the chamber profile and joins address, phone and email', () => {
    const l = letterheadOf(settings({ tagline: 'Barristers at Law', address: 'Court Road, Lahore', phone: '0300 1234567', email: 'a@b.pk' }));
    expect(l.tagline).toBe('Barristers at Law');
    expect(l.contact).toBe('Court Road, Lahore  |  0300 1234567  |  a@b.pk');
  });
  it('skips blank fields', () => {
    expect(letterheadOf(settings({ phone: '0300 1234567' })).contact).toBe('0300 1234567');
  });
});

describe('PDF headers with a letterhead', () => {
  const base = { chamberName: 'Khan & Associates', tagline: 'Barristers', contact: 'Court Road | 0300 1234567' };
  it('builds a fee receipt', async () => {
    const bytes = await feeReceiptPdf({ ...base, receiptNo: 'R-1', clientName: 'A', caseTitle: 'A v B', caseNo: '1/2026', amount: 5000, mode: 'Cash', date: '2026-11-24' });
    expect(bytes.length).toBeGreaterThan(500);
  });
  it('builds a case status report', async () => {
    const bytes = await caseStatusPdf({
      ...base,
      clientName: 'A',
      caseTitle: 'A v B',
      caseNo: '1/2026',
      court: 'LHC',
      judge: 'J',
      stage: 'Arguments',
      status: 'pending',
      hearings: [],
      date: '2026-11-24',
    });
    expect(bytes.length).toBeGreaterThan(500);
  });
});

describe('logo', () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  it('is part of the letterhead only when one is set', () => {
    expect('logo' in letterheadOf({ settings: [] })).toBe(false);
    expect(letterheadOf(settings({ logo: png })).logo).toBe(png);
  });
  it('prints on a receipt, and a broken image is skipped instead of failing', async () => {
    const base = { chamberName: 'K', receiptNo: 'R-1', clientName: 'A', caseTitle: 'A v B', caseNo: '1', amount: 5000, mode: 'Cash', date: '2026-11-24' };
    const withLogo = await feeReceiptPdf({ ...base, logo: png });
    const without = await feeReceiptPdf(base);
    expect(withLogo.length).toBeGreaterThan(without.length);
    const broken = await feeReceiptPdf({ ...base, logo: 'data:image/png;base64,AAAA' });
    expect(broken.length).toBeGreaterThan(500);
  });
});
