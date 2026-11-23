import { describe, expect, it } from 'vitest';
import { briefingMessage, outcomeMessage, toWaNumber, waLink } from '../../src/lib/whatsapp';

describe('toWaNumber', () => {
  it('converts local mobile numbers to 92…', () => {
    expect(toWaNumber('0300-1234567')).toBe('923001234567');
    expect(toWaNumber('0321 7654321')).toBe('923217654321');
  });
  it('keeps international forms', () => {
    expect(toWaNumber('+92 300 1234567')).toBe('923001234567');
    expect(toWaNumber('0092-300-1234567')).toBe('923001234567');
    expect(toWaNumber('923001234567')).toBe('923001234567');
  });
  it('accepts a bare 10-digit mobile', () => {
    expect(toWaNumber('3001234567')).toBe('923001234567');
  });
  it('returns null for empty or junk', () => {
    expect(toWaNumber('')).toBeNull();
    expect(toWaNumber(undefined)).toBeNull();
    expect(toWaNumber('12345')).toBeNull();
  });
});

describe('waLink', () => {
  it('builds a link to a number with encoded text', () => {
    expect(waLink('0300-1234567', 'Hi & bye')).toBe('https://wa.me/923001234567?text=Hi%20%26%20bye');
  });
  it('falls back to the share picker without a number', () => {
    expect(waLink('', 'Hi')).toBe('https://wa.me/?text=Hi');
  });
});

describe('outcomeMessage', () => {
  it('has the case, what happened, the next date and an Urdu line', () => {
    const m = outcomeMessage({ clientName: 'Muhammad Usman', caseTitle: 'Usman v. State', caseNo: 'Crl. 1/2026', court: 'LHC', happened: 'Adjourned', nextDate: '2026-12-07T09:00:00+05:00' });
    expect(m).toContain('Usman v. State');
    expect(m).toContain('Adjourned');
    expect(m).toContain('7 Dec 2026');
    expect(m).toMatch(/[؀-ۿ]/);
  });
  it('mentions the result when decided', () => {
    const m = outcomeMessage({ caseTitle: 'A v. B', happened: 'Decided', result: 'Suit decreed' });
    expect(m).toContain('Suit decreed');
    expect(m).not.toContain('Next date');
  });
});

describe('briefingMessage', () => {
  it('lists each hearing with time and court', () => {
    const m = briefingMessage('2026-11-23', [
      { title: 'A v. B', caseNo: '1/2026', court: 'LHC', time: '09:00 AM', courtRoom: '4', srNo: 12 },
      { title: 'C v. D', caseNo: '2/2026', court: 'IHC', time: '11:00 AM' },
    ]);
    expect(m).toContain('23 Nov 2026');
    expect(m).toContain('1. 09:00 AM · LHC — A v. B (1/2026) · Ct 4, Sr. 12');
    expect(m).toContain('2. 11:00 AM · IHC — C v. D (2/2026)');
  });
  it('says so when the day is empty', () => {
    expect(briefingMessage('2026-11-23', [])).toContain('No hearings');
  });
});
