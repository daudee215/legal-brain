import { describe, expect, it } from 'vitest';
import { findNextDates } from '../../src/lib/ocrDate';

const TODAY = '2026-11-24';
const dates = (text: string, today = TODAY) => findNextDates(text, today).map((s) => s.date);
const first = (text: string, today = TODAY) => findNextDates(text, today)[0];

describe('findNextDates: keyword-led dates', () => {
  it('Adjourned to dd.mm.yyyy', () => {
    expect(first('Adjourned to 12.12.2026')).toMatchObject({ date: '2026-12-12', strength: 'keyword' });
  });
  it('Case is adjourned till dd-mm-yyyy', () => {
    expect(first('Case is adjourned till 12-12-2026.')).toMatchObject({ date: '2026-12-12', strength: 'keyword' });
  });
  it('Next date of hearing: dd/mm/yyyy', () => {
    expect(first('Next date of hearing: 12/12/2026')).toMatchObject({ date: '2026-12-12', strength: 'keyword' });
  });
  it('NDOH with a month name', () => {
    expect(first('NDOH 12 Dec 2026')).toMatchObject({ date: '2026-12-12', strength: 'keyword' });
  });
  it('N.D.O.H. punctuation', () => {
    expect(dates('N.D.O.H: 05.01.2027')).toEqual(['2027-01-05']);
  });
  it('put up on 12th December 2026', () => {
    expect(first('Put up on 12th December 2026 for arguments.')).toMatchObject({ date: '2026-12-12', strength: 'keyword' });
  });
  it('fixed for ... with filler words', () => {
    expect(first('Case is now fixed for arguments on 03.12.2026')).toMatchObject({ date: '2026-12-03', strength: 'keyword' });
  });
  it('re-list and relist', () => {
    expect(dates('Re-list on 10-12-2026')).toEqual(['2026-12-10']);
    expect(dates('Relist for 11/12/2026')).toEqual(['2026-12-11']);
  });
  it('to come up on', () => {
    expect(dates('To come up on 15 January, 2027')).toEqual(['2027-01-15']);
  });
  it('date and keyword on separate lines', () => {
    const r = first('Adjourned to\n12.12.2026\nSd/- Judge');
    expect(r).toMatchObject({ date: '2026-12-12', strength: 'keyword' });
    expect(r.line).toContain('Adjourned to');
    expect(r.line).toContain('12.12.2026');
  });
  it('reports the line the date was found on', () => {
    const r = first('ORDER SHEET\nPresent: counsel for the parties.\nAdjourned to 12.12.2026 for evidence.\nSd/-');
    expect(r.line).toBe('Adjourned to 12.12.2026 for evidence.');
  });
  it('month-first dates', () => {
    expect(dates('Adjourned to December 12, 2026')).toEqual(['2026-12-12']);
  });
  it('keyword date today is allowed', () => {
    expect(first('Adjourned to 24.11.2026')).toMatchObject({ date: '2026-11-24', strength: 'keyword' });
  });
  it('two-digit years only after a keyword', () => {
    expect(dates('Adjourned to 12.12.26')).toEqual(['2026-12-12']);
    expect(dates('Hearing note 12.12.26 for the file')).toEqual([]);
  });
  it('a leap day in a leap year is fine', () => {
    expect(dates('Adjourned to 29.02.2028', '2027-01-01')).toEqual(['2028-02-29']);
  });
});

describe('findNextDates: OCR noise', () => {
  it('O for 0 and l for 1 inside the date', () => {
    expect(dates('Adjourned to l2.l2.2O26')).toEqual(['2026-12-12']);
    expect(dates('Next date: 1O-12-2026')).toEqual(['2026-12-10']);
  });
  it('stray spaces around separators', () => {
    expect(dates('Adjourned to 12 . 12 . 2026')).toEqual(['2026-12-12']);
    expect(dates('Adjourned till 12 / 12 /2026')).toEqual(['2026-12-12']);
  });
  it('misread keyword "Adjoumed" (rn read as m)', () => {
    expect(dates('Adjoumed to 12.12.2026')).toEqual(['2026-12-12']);
  });
  it('0ct for Oct and extra spacing before the year', () => {
    expect(dates('Put up on 5 0ct 2027')).toEqual(['2027-10-05']);
    expect(dates('NDOH 12th Dec.,  2026')).toEqual(['2026-12-12']);
  });
  it('mixed case and a trailing full stop', () => {
    expect(dates('ADJOURNED TO 12.12.2026.')).toEqual(['2026-12-12']);
  });
  it('Windows line endings', () => {
    expect(first('Adjourned to\r\n12.12.2026\r\n')).toMatchObject({ date: '2026-12-12', strength: 'keyword' });
  });
});

describe('findNextDates: ranking and limits', () => {
  it('keyword-led dates rank above plain future dates', () => {
    const r = findNextDates('Cause list 30.11.2026\nAdjourned to 12.12.2026', TODAY);
    expect(r.map((x) => x.date)).toEqual(['2026-12-12', '2026-11-30']);
    expect(r.map((x) => x.strength)).toEqual(['keyword', 'plain']);
  });
  it('a plain future date on its own is a plain suggestion', () => {
    expect(first('Counsel to appear on 08.12.2026')).toMatchObject({ date: '2026-12-08', strength: 'plain' });
  });
  it('forward keywords beat "date of hearing"', () => {
    const r = findNextDates('Date of hearing: 30.11.2026\nNext date: 14.12.2026', TODAY);
    expect(r[0].date).toBe('2026-12-14');
    expect(r[1].date).toBe('2026-11-30');
  });
  it('the same date is returned once, as keyword when any mention is keyword-led', () => {
    const r = findNextDates('See 12.12.2026\nAdjourned to 12.12.2026', TODAY);
    expect(r).toHaveLength(1);
    expect(r[0].strength).toBe('keyword');
  });
  it('returns at most 3 suggestions', () => {
    const r = findNextDates('a 01.12.2026\nb 02.12.2026\nc 03.12.2026\nd 04.12.2026\ne 05.12.2026', TODAY);
    expect(r).toHaveLength(3);
  });
  it('is day-first: 05/12/2026 is 5 December', () => {
    expect(dates('Adjourned to 05/12/2026')).toEqual(['2026-12-05']);
  });
});

describe('findNextDates: things that are not the next date', () => {
  it('case numbers such as 1234/2026', () => {
    expect(dates('Writ Petition No. 1234/2026 Lahore')).toEqual([]);
    expect(dates('Crl. Misc. 12/2026')).toEqual([]);
  });
  it('a case number written like a date', () => {
    expect(dates('Case No. 12/12/2026')).toEqual([]);
  });
  it('the bare year', () => {
    expect(dates('In the year 2026 and 2027')).toEqual([]);
  });
  it('phone numbers', () => {
    expect(dates('Tel: 0300-1234567 / 042-111-2026 / +92-42-35761234')).toEqual([]);
    expect(dates('Contact 0321 12 12 2026')).toEqual([]);
  });
  it('past dates, even keyword-led', () => {
    expect(dates('Adjourned to 12.11.2026')).toEqual([]);
    expect(dates('Next date of hearing: 23/11/2026')).toEqual([]);
    expect(dates('Decided on 01.01.2026')).toEqual([]);
  });
  it('impossible dates', () => {
    expect(dates('Adjourned to 31.11.2026')).toEqual([]);
    expect(dates('Adjourned to 32.12.2026')).toEqual([]);
    expect(dates('Adjourned to 12.13.2026')).toEqual([]);
    expect(dates('Adjourned to 29.02.2027')).toEqual([]);
    expect(dates('Adjourned to 00.12.2026')).toEqual([]);
    expect(dates('Adjourned to 31 Apr 2027')).toEqual([]);
  });
  it('the order date or filing date is not suggested', () => {
    expect(dates('Order dated 30.11.2026')).toEqual([]);
    expect(dates('Petition filed on 01.12.2026')).toEqual([]);
    expect(dates('Date of institution: 15.12.2026')).toEqual([]);
  });
  it('"date of hearing" naming today or the past is not a next date', () => {
    expect(dates('Date of hearing: 24.11.2026')).toEqual([]);
  });
  it('plain dates are limited to the near future', () => {
    expect(dates('Reference 12.12.2031')).toEqual([]);
  });
  it('a number buried in a longer number', () => {
    expect(dates('Ref 9912.12.2026')).toEqual([]);
    expect(dates('Adjourned to 12.12.2026.5')).toEqual([]);
  });
  it('empty, junk and a bad today', () => {
    expect(findNextDates('', TODAY)).toEqual([]);
    expect(findNextDates('lorem ipsum dolor sit amet', TODAY)).toEqual([]);
    expect(findNextDates('Adjourned to 12.12.2026', 'not-a-day')).toEqual([]);
  });
  it('two-digit years without a keyword', () => {
    expect(dates('Stamp 12.12.26')).toEqual([]);
  });
});

describe('next hearing time of day', () => {
  it('keeps the existing PKT time, else 09:00', async () => {
    const { nextHearingIso } = await import('../../src/lib/nextHearing');
    expect(nextHearingIso('2026-12-12', '2026-11-30T11:30:00+05:00')).toBe('2026-12-12T11:30:00+05:00');
    expect(nextHearingIso('2026-12-12', undefined)).toBe('2026-12-12T09:00:00+05:00');
    expect(nextHearingIso('2026-12-12', '2026-11-30T06:30:00Z')).toBe('2026-12-12T09:00:00+05:00');
  });
});
