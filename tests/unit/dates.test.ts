import { describe, expect, it } from 'vitest';
import { addDays, formatPk, formatTime, pktDateKey, todayKey } from '../../src/lib/dates';

describe('PKT dates', () => {
  it('counts 00:30 PKT as the next calendar day even when given UTC', () => {
    expect(pktDateKey('2026-11-23T19:30:00Z')).toBe('2026-11-24');
  });
  it('formats dates the Pakistani way', () => {
    expect(formatPk('2026-11-23T10:00:00+05:00')).toBe('23 Nov 2026');
  });
  it('formats a bare day key', () => {
    expect(formatPk('2026-11-23')).toBe('23 Nov 2026');
  });
  it('adds days across a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('todayKey uses PKT', () => {
    expect(todayKey(new Date('2026-11-23T20:00:00Z'))).toBe('2026-11-24');
  });
  it('formats time in PKT', () => {
    expect(formatTime('2026-11-23T04:00:00Z')).toBe('09:00 AM');
  });
});

import { greeting, pktHour } from '../../src/lib/dates';
describe('greeting (PKT)', () => {
  it('uses Pakistan time, not UTC', () => {
    // 03:30 UTC = 08:30 PKT
    expect(pktHour(new Date('2026-11-23T03:30:00Z'))).toBe(8);
    expect(greeting(new Date('2026-11-23T03:30:00Z'))).toBe('Good morning');
    expect(greeting(new Date('2026-11-23T09:00:00Z'))).toBe('Good afternoon'); // 14:00 PKT
    expect(greeting(new Date('2026-11-23T14:00:00Z'))).toBe('Good evening'); // 19:00 PKT
  });
});
