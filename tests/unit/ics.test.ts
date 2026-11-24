import { describe, expect, it } from 'vitest';
import { escapeText, foldLine, hearingsToIcs } from '../../src/lib/ics';

const now = new Date('2026-11-24T04:00:00Z');
const timed = { uid: 'case-1', title: 'W.P. 1234/2026 Zahid Traders v. Federation', start: '2026-11-25T10:30:00+05:00', location: 'Lahore High Court, Court 7' };
const allDay = { uid: 'case-2', title: 'Suit 12/2026', start: '2026-11-26' };

const unfold = (s: string) => s.replace(/\r\n /g, '');

describe('hearingsToIcs', () => {
  const ics = hearingsToIcs([timed, allDay], 'Arooj Law Chamber', now);

  it('uses CRLF line endings only and the calendar frame', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:')).toBe(true);
    expect(ics).toContain('CALSCALE:GREGORIAN');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('has a VTIMEZONE for Asia/Karachi at +0500 with no DST', () => {
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:Asia/Karachi');
    expect(ics).toContain('TZOFFSETFROM:+0500\r\nTZOFFSETTO:+0500');
    expect(ics).not.toContain('BEGIN:DAYLIGHT');
  });

  it('writes a timed hearing with a 1-hour duration and two alarms', () => {
    const ev = unfold(ics).split('BEGIN:VEVENT')[1];
    expect(ev).toContain('DTSTART;TZID=Asia/Karachi:20261125T103000');
    expect(ev).toContain('DURATION:PT1H');
    expect(ev).toContain('DTSTAMP:20261124T040000Z');
    expect(ev).toContain('LOCATION:Lahore High Court\\, Court 7');
    expect(ev.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ev).toContain('TRIGGER:-P1D');
    expect(ev).toContain('TRIGGER:-PT1H');
  });

  it('writes an all-day hearing when no time is given', () => {
    const ev = unfold(ics).split('BEGIN:VEVENT')[2];
    expect(ev).toContain('DTSTART;VALUE=DATE:20261126');
    expect(ev).toContain('DTEND;VALUE=DATE:20261127');
    expect(ev).not.toContain('DURATION');
  });

  it('converts other offsets to Karachi time', () => {
    const out = hearingsToIcs([{ uid: 'x', title: 'X', start: '2026-11-25T05:30:00Z' }], 'C', now);
    expect(out).toContain('DTSTART;TZID=Asia/Karachi:20261125T103000');
  });

  it('gives a stable UID per case and date', () => {
    const again = hearingsToIcs([timed], 'Arooj Law Chamber', new Date());
    const uid = (s: string) => /UID:(.+)\r\n/.exec(s)![1];
    expect(uid(again)).toBe(uid(ics));
    expect(uid(ics)).toBe('case-1-20261125@hearings');
    const moved = hearingsToIcs([{ ...timed, start: '2026-12-01T10:30:00+05:00' }], 'C', now);
    expect(uid(moved)).not.toBe(uid(ics));
  });

  it('folds long lines at 75 octets', () => {
    const long = hearingsToIcs([{ ...timed, description: 'ا'.repeat(100) + ' and more text, with commas; semicolons' }], 'C', now);
    for (const line of long.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(unfold(long)).toContain('DESCRIPTION:' + 'ا'.repeat(100) + ' and more text\\, with commas\\; semicolons');
  });
});

describe('escapeText / foldLine', () => {
  it('escapes backslash, semicolon, comma and newline', () => {
    expect(escapeText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });
  it('leaves short lines alone and starts continuations with a space', () => {
    expect(foldLine('SUMMARY:short')).toBe('SUMMARY:short');
    const f = foldLine('X:' + 'a'.repeat(200));
    expect(f.split('\r\n').slice(1).every((l) => l.startsWith(' '))).toBe(true);
  });
});
