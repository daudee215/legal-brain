import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../../src/data/seed';
import { nextCourtDay, remindersFor, reminderMessage, setReminded } from '../../src/lib/reminders';
import { getDb, resetToDemo } from '../../src/lib/store';
import { hearingsOn } from '../../src/lib/repo';

describe('nextCourtDay', () => {
  it('is tomorrow on a weekday', () => {
    expect(nextCourtDay('2026-11-23')).toBe('2026-11-24'); // Mon → Tue
  });
  it('skips Sunday: Saturday evening reminds for Monday', () => {
    expect(nextCourtDay('2026-11-28')).toBe('2026-11-30'); // Sat → Mon
  });
});

describe('reminderMessage', () => {
  it('names the client, case, court, date and time in English and Urdu', () => {
    const m = reminderMessage({
      clientName: 'Rashid Mehmood',
      caseTitle: 'Rashid Mehmood v. Province of Punjab',
      caseNo: 'W.P. 30112/2026',
      court: 'Lahore High Court',
      dayKey: '2026-11-24',
      time: '09:00 AM',
      courtRoom: '7',
      srNo: 12,
    });
    expect(m).toContain('Assalam-o-Alaikum Rashid');
    expect(m).toContain('Tue, 24 Nov 2026');
    expect(m).toContain('09:00 AM');
    expect(m).toContain('Lahore High Court');
    expect(m).toContain('Court room 7, serial 12');
    expect(m).toContain('W.P. 30112/2026');
    expect(m).toMatch(/[؀-ۿ]/); // has an Urdu line
  });
  it('adds what to bring and asks the client to attend only when told to', () => {
    const plain = reminderMessage({ caseTitle: 'X v. Y', court: 'Civil Court', dayKey: '2026-11-24', time: '' });
    expect(plain).not.toMatch(/Please bring/);
    expect(plain).not.toMatch(/attend/i);
    const full = reminderMessage({ caseTitle: 'X v. Y', court: 'Civil Court', dayKey: '2026-11-24', time: '', bring: 'original CNIC', attend: true });
    expect(full).toContain('Please bring: original CNIC.');
    expect(full).toMatch(/Please be present/);
  });
});

describe('remindersFor / setReminded', () => {
  beforeEach(() => {
    localStorage.clear();
    resetToDemo();
  });

  it('lists each hearing with its client, and marks it sent for that date only', async () => {
    const c = seed.cases.find((x) => x.nextHearing)!;
    const day = c.nextHearing!.slice(0, 10);
    const rows = remindersFor(day, await hearingsOn(day), getDb().clients);
    const r = rows.find((x) => x.case.id === c.id)!;
    expect(r.client?.id).toBe(c.clientId);
    expect(r.sent).toBe(false);

    setReminded(c.id, day, true);
    const after = remindersFor(day, await hearingsOn(day), getDb().clients).find((x) => x.case.id === c.id)!;
    expect(after.sent).toBe(true);
    // a reminder for an older date does not count for a new one
    setReminded(c.id, '2020-01-01', true);
    expect(remindersFor(day, await hearingsOn(day), getDb().clients).find((x) => x.case.id === c.id)!.sent).toBe(false);

    setReminded(c.id, day, true);
    setReminded(c.id, day, false);
    expect(remindersFor(day, await hearingsOn(day), getDb().clients).find((x) => x.case.id === c.id)!.sent).toBe(false);
  });

  it('flags clients without a usable WhatsApp number', async () => {
    const c = seed.cases.find((x) => x.nextHearing)!;
    const day = c.nextHearing!.slice(0, 10);
    const clients = getDb().clients.map((cl) => (cl.id === c.clientId ? { ...cl, phone: '' } : cl));
    const r = remindersFor(day, await hearingsOn(day), clients).find((x) => x.case.id === c.id)!;
    expect(r.phoneOk).toBe(false);
  });
});
