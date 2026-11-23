import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../../src/data/seed';
import { guessMapping, matchCategory, matchCourt, parseCsv, parseDate, planImport, runImport } from '../../src/lib/importCases';
import { getDb, resetToDemo, startFresh } from '../../src/lib/store';

describe('parseCsv', () => {
  it('handles quoted commas, escaped quotes, CRLF, BOM and blank lines', () => {
    const csv = '﻿Title,Case no.,Client\r\n"Usman v. State, Lahore",Crl. 1/2026,"Ali ""Bhai"" Raza"\r\n\r\nB v. C,2/2026,\n';
    expect(parseCsv(csv)).toEqual([
      ['Title', 'Case no.', 'Client'],
      ['Usman v. State, Lahore', 'Crl. 1/2026', 'Ali "Bhai" Raza'],
      ['B v. C', '2/2026', ''],
    ]);
  });
  it('keeps newlines inside quotes', () => {
    expect(parseCsv('a,"line1\nline2"')).toEqual([['a', 'line1\nline2']]);
  });
});

describe('parseDate', () => {
  it('reads ISO', () => expect(parseDate('2026-12-01')).toBe('2026-12-01'));
  it('reads dd/mm/yyyy (day first)', () => {
    expect(parseDate('01/12/2026')).toBe('2026-12-01');
    expect(parseDate('13-1-2027')).toBe('2027-01-13');
    expect(parseDate('5.3.26')).toBe('2026-03-05');
  });
  it('reads "1 Dec 2026" and "Dec 1, 2026"', () => {
    expect(parseDate('1 Dec 2026')).toBe('2026-12-01');
    expect(parseDate('1st December 2026')).toBe('2026-12-01');
    expect(parseDate('Dec 1, 2026')).toBe('2026-12-01');
  });
  it('reads Excel dates and serials', () => {
    expect(parseDate(new Date(Date.UTC(2026, 11, 1)))).toBe('2026-12-01');
    expect(parseDate(46357)).toBe('2026-12-01');
  });
  it('rejects nonsense', () => {
    expect(parseDate('31/02/2026')).toBeUndefined();
    expect(parseDate('soon')).toBeUndefined();
    expect(parseDate('')).toBeUndefined();
  });
});

describe('mapping and matching', () => {
  it('guesses columns by header name', () => {
    const m = guessMapping(['Sr', 'Case Title', 'Case No', 'Court', 'Type', 'Next Date', 'Client Name', 'Client Phone']);
    expect(m).toEqual({ title: 1, caseNo: 2, court: 3, category: 4, nextHearing: 5, client: 6, clientPhone: 7 });
  });
  it('matches courts by short name or name, falling back to a district court', () => {
    expect(matchCourt('LHC', seed.courts)?.id).toBe('lhc');
    expect(matchCourt('islamabad high court', seed.courts)?.id).toBe('ihc');
    expect(matchCourt('Somewhere else', seed.courts)?.level).toBe('District');
    expect(matchCourt('', seed.courts)?.level).toBe('District');
  });
  it('matches categories', () => {
    expect(matchCategory('family')).toBe('Family');
    expect(matchCategory('Crl. Misc.')).toBe('Criminal');
    expect(matchCategory('')).toBe('Civil');
  });
});

describe('runImport', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetToDemo();
    startFresh();
  });
  it('creates clients once and cases linked to them', () => {
    const rows = [
      ['A v. B', '1/2026', 'LHC', 'Civil', '01/12/2026', 'Ali Raza', '0300'],
      ['A v. C', '2/2026', 'IHC', 'Family', '', 'ali raza', ''],
      ['', '3/2026', '', '', '', '', ''],
    ];
    const plan = planImport(rows, { title: 0, caseNo: 1, court: 2, category: 3, nextHearing: 4, client: 5, clientPhone: 6 }, getDb().courts);
    expect(plan.skipped).toBe(1);
    expect(plan.rows[0].nextHearing).toBe('2026-12-01');
    const s = runImport(plan.rows, getDb());
    expect(s).toEqual({ cases: 2, newClients: 1, existingClients: 0 });
    const db = getDb();
    expect(db.clients).toHaveLength(1);
    expect(db.clients[0].caseIds).toHaveLength(2);
    expect(db.cases.map((c) => c.courtId)).toEqual(['lhc', 'ihc']);
    expect(db.cases[0].nextHearing).toBe('2026-12-01T09:00:00+05:00');
  });
});
