import { describe, expect, it } from 'vitest';
import { matchCauseList, parseCaseNo, sameCaseNo } from '../../src/lib/causeList';

const cases = [
  { id: 'k1', caseNo: 'Crl. Misc. 4521-B/2026', title: 'Muhammad Usman v. The State' },
  { id: 'k3', caseNo: 'W.P. 30112/2026', title: 'Zahid Traders v. Federation of Pakistan' },
  { id: 'k8', caseNo: 'C.P.L.A. 902-K/2026', title: 'Pak Agro Industries v. Federal Board of Revenue' },
  { id: 'k9', caseNo: 'Crl. Appeal 330/2025', title: 'Muhammad Usman v. The State (Conviction u/s 489-F PPC)' },
  { id: 'k4', caseNo: 'W.P. 2210/2026', title: 'Sana Iqbal v. Capital Development Authority' },
];

describe('parseCaseNo', () => {
  it('normalises the different ways a case number is written', () => {
    const a = parseCaseNo('W.P. 30112/2026');
    expect(a).toMatchObject({ family: 'wp', number: '30112', year: '2026' });
    for (const s of ['WP No.30112 of 2026', 'Writ Petition 30112-2026', 'W. P. No. 30112 / 2026', 'writ petition no 30112 of 2026']) {
      expect(sameCaseNo(parseCaseNo(s), a), s).toBe(true);
    }
  });
  it('keeps the letter suffix and the type family', () => {
    expect(parseCaseNo('Crl. Misc. 4521-B/2026')).toMatchObject({ family: 'crlmisc', number: '4521', suffix: 'B', year: '2026' });
    expect(parseCaseNo('Criminal Miscellaneous No. 4521-B of 2026')).toMatchObject({ family: 'crlmisc', number: '4521', year: '2026' });
    expect(parseCaseNo('CPLA 902-K/2026')).toMatchObject({ family: 'cpla', number: '902', suffix: 'K' });
    expect(parseCaseNo('Civil Petition No. 902-K of 2026')?.family).toBe('cpla');
  });
  it('does not confuse different families or years', () => {
    expect(sameCaseNo(parseCaseNo('W.P. 30112/2026'), parseCaseNo('Crl. Misc. 30112/2026'))).toBe(false);
    expect(sameCaseNo(parseCaseNo('W.P. 30112/2026'), parseCaseNo('W.P. 30112/2025'))).toBe(false);
    expect(sameCaseNo(parseCaseNo('W.P. 30112/2026'), parseCaseNo('W.P. 3011/2026'))).toBe(false);
  });
});

describe('matchCauseList', () => {
  const page1 = [
    'LAHORE HIGH COURT, LAHORE',
    'CAUSE LIST FOR MONDAY 23-11-2026',
    'Court No. 21',
    'Before: Mr. Justice Example',
    '14. Writ Petition 2209-2026 Someone v. Another',
    '15. WP No.30112 of 2026 Zahid Traders Vs Federation of Pakistan etc',
    'Sr. 16 Crl. Misc. 4521-B/2026 Muhammad Usman vs The State',
  ].join('\n');
  const page2 = [
    'Court Room 4',
    'Sr. No. 7 C.P.L.A. 902-K/2026 M/s Pak Agro Industries v. FBR',
    '8. Crl. Appeal 331/2025 Muhammad Usman v. State',
    '9. C.M. 77/2026 Sana Iqbal v. CDA (misc. application)',
  ].join('\n');

  const hits = matchCauseList([page1, page2], cases);
  const by = (id: string) => hits.find((h) => h.caseId === id);

  it('finds cases by normalised number with serial and court room', () => {
    expect(by('k3')).toMatchObject({ kind: 'matched', srNo: 15, courtRoom: '21', page: 1, bench: 'Mr. Justice Example' });
    expect(by('k1')).toMatchObject({ kind: 'matched', srNo: 16, courtRoom: '21', page: 1 });
    expect(by('k8')).toMatchObject({ kind: 'matched', srNo: 7, courtRoom: '4', page: 2 });
  });

  it('reports party-name hits as possible matches only', () => {
    expect(by('k9')).toMatchObject({ kind: 'possible', srNo: 8, courtRoom: '4' });
    expect(by('k4')).toMatchObject({ kind: 'possible', srNo: 9 });
  });

  it('does not report cases not on the list', () => {
    expect(matchCauseList('Court No. 1\n1. Suit 5/2026 A v. B', cases)).toEqual([]);
  });

  it('accepts a single string with form-feed page breaks', () => {
    const r = matchCauseList(`${page1}\f${page2}`, cases);
    expect(r.find((h) => h.caseId === 'k8')?.page).toBe(2);
  });
});
