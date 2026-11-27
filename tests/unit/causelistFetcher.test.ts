import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCaseNo } from '../../src/lib/causeList';
import { ihcBody, ihcDate, parseIhcResponse } from '../../scripts/causelists/adapters/ihc.mjs';
import { parsePhcPages, parseResultPage, phcCaseNo } from '../../scripts/causelists/adapters/phc.mjs';
import { parseLhc } from '../../scripts/causelists/adapters/pakistan-only.mjs';
import { parseShcHtml, shcDate } from '../../scripts/causelists/adapters/shc.mjs';
import { nextCourtDay, pktToday, robotsAllows, targetDays } from '../../scripts/causelists/lib/common.mjs';
import { mergeFrom, pruneAndIndex, writeDay } from '../../scripts/causelists/lib/output.mjs';

const fx = (f: string) => readFileSync(join('tests/fixtures/causelists', f), 'utf8');

describe('IHC adapter (real response, trimmed)', () => {
  const entries = parseIhcResponse(fx('ihc-2026-11-24.json'));

  it('normalises every row to an entry the matcher can parse', () => {
    expect(entries).toHaveLength(7);
    expect(entries[0]).toEqual({
      bench: 'THE HONOURABLE CHIEF JUSTICE, HONOURABLE MR. JUSTICE SHAHRUKH ARJUMAND',
      courtRoom: '1',
      srNo: 1,
      caseNo: 'W.P. 5490/2026',
      title: 'M/s MAFHH Enterprises v. CIR',
      stage: 'NOTICE CASES',
    });
    for (const e of entries) expect(parseCaseNo(e.caseNo), e.caseNo).not.toBeNull();
    expect(parseCaseNo(entries[0].caseNo)).toMatchObject({ family: 'wp', number: '5490', year: '2026' });
  });

  it('keeps clubbed cases with their main serial and drops advocate names', () => {
    const ica = entries.find((e) => e.caseNo === 'I.C.A. 207/2026');
    expect(ica).toMatchObject({ srNo: 2, courtRoom: '1' });
    expect(JSON.stringify(entries)).not.toMatch(/Advocate A|Advocate B/);
  });

  it('treats the "empty" answer as no list', () => {
    expect(parseIhcResponse('{"d":"\\"empty\\""}')).toEqual([]);
  });

  it('builds the request the court page sends', () => {
    expect(ihcDate('2026-11-24')).toBe('24/11/2026');
    expect(ihcBody('2026-11-24', '2')._params).toMatchObject({ PSDATE: '24/11/2026', PEDATE: '24/11/2026', pCrt: '0', pType: 1, PCIRCUITCODE: '2' });
  });
});

describe('PHC adapter (real PDF text runs, trimmed)', () => {
  it('finds the PDF links in the form answer', () => {
    expect(parseResultPage(fx('phc-result.html'))).toEqual(['https://www.peshawarhighcourt.gov.pk/causeLists/2026_11_23_01_51_40_pm6112.pdf']);
    expect(parseResultPage('<p>No causelist</p>')).toEqual([]);
  });

  it('reads entries with court room, bench, serial, stage and parties', () => {
    const { pages } = JSON.parse(fx('phc-2026-11-24-pages.json'));
    const entries = parsePhcPages(pages);
    expect(entries[0]).toEqual({
      bench: 'MR. JUSTICE S.M. ATTIQUE SHAH, CHIEF JUSTICE',
      courtRoom: '1',
      srNo: 1,
      caseNo: 'Cr.R 215/2026',
      title: 'Kahaista Rahman v. State & Others',
      stage: 'MOTION CASES (VL)',
    });
    expect(entries.find((e) => e.caseNo === 'Cr.M(BA) 3395/2026')).toMatchObject({ srNo: 1, stage: 'NOTICE CASES (VL)', title: 'Muhammad Riaz v. The State etc' });
    // Deputy Registrar page: numbers split over two lines ("153-" / "P/2023"), no court number.
    const dr = entries.find((e) => e.caseNo === 'Cr.A 153-P/2023');
    expect(dr).toMatchObject({ srNo: 17, bench: 'DEPUTY REGISTRAR', stage: 'DEPUTY REGISTRAR CASES' });
    expect(dr?.courtRoom).toBeUndefined();
    expect(JSON.stringify(entries)).not.toContain('Advocate X');
    for (const e of entries) expect(parseCaseNo(e.caseNo), e.caseNo).not.toBeNull();
    expect(parseCaseNo('Cr.M(BA) 3395/2026')?.families).toContain('crlmisc');
  });

  it('normalises the case-number column', () => {
    expect(phcCaseNo('Cr.A 153- P/2023(8400 gm chars)(Criminal Appeal)')).toBe('Cr.A 153-P/2023');
    expect(phcCaseNo('W.P 14912/2026 (Criminal-Superdari) (288415)')).toBe('W.P 14912/2026');
    expect(phcCaseNo('(Criminal Revision)')).toBeNull();
  });
});

describe('Lahore High Court adapter (real response, trimmed)', () => {
  it('normalises the bench, room and serial and expands abbreviated case years', () => {
    const entries = parseLhc(fx('lhc-2026-11-27.html'), '2026-11-27');
    expect(entries).toHaveLength(3);
    expect(entries[1]).toEqual({
      bench: 'Mr. Justice Faisal Zaman Khan',
      courtRoom: '5',
      srNo: 2,
      caseNo: 'Writ Petition 69725/2026',
      title: 'Shehnaz Akhtar v. Secretary Specialized Healthcare & Medical Education etc',
      stage: 'FC',
    });
    expect(entries[2]).toMatchObject({ srNo: 2, caseNo: 'CM/1/69725/26' });
    expect(parseCaseNo(entries[1].caseNo)).toMatchObject({ family: 'wp', number: '69725', year: '2026' });
    expect(JSON.stringify(entries)).not.toMatch(/Advocate A|Advocate B/);
    expect(parseLhc(fx('lhc-2026-11-27.html'), '2026-11-30')).toEqual([]);
  });
});

describe('SHC adapter (SYNTHETIC fixture)', () => {
  it('maps columns by header and removes every trace of the advocate', () => {
    const r = parseShcHtml(fx('shc-synthetic.html'), ['42101-0000000-0', 'Example Advocate Name']);
    expect(r?.entries).toHaveLength(2);
    expect(r?.entries?.[0]).toMatchObject({ srNo: 12, caseNo: 'C.P. D-1234/2026', courtRoom: '5', stage: 'Katcha Peshi' });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/Example Advocate Name|42101|Another Lawyer/);
  });
  it('uses the court form date format', () => {
    expect(shcDate('2026-11-24')).toBe('24-Nov-2026');
  });
});

describe('fetch job helpers', () => {
  it('respects robots.txt rules', () => {
    const robots = 'User-agent: *\nDisallow: /media/\nAllow: /media/public/\n\nUser-agent: BadBot\nDisallow: /';
    expect(robotsAllows(robots, '/media/x.pdf')).toBe(false);
    expect(robotsAllows(robots, '/media/public/x.pdf')).toBe(true);
    expect(robotsAllows(robots, '/causeLists/x.pdf')).toBe(true);
    expect(robotsAllows('User-agent: LegalBrainCauseListBot\nDisallow: /', '/anything')).toBe(false);
    expect(robotsAllows(null, '/anything')).toBe(true);
  });

  it('fetches today (if the courts sit) and the next court day, skipping the weekend', () => {
    // 2026-11-23 is a Monday; times are UTC (PKT = UTC+5).
    expect(targetDays(new Date('2026-11-23T14:00:00Z'))).toEqual(['2026-11-23', '2026-11-24']);
    expect(targetDays(new Date('2026-11-27T14:00:00Z'))).toEqual(['2026-11-27', '2026-11-30']); // Friday → Monday
    expect(targetDays(new Date('2026-11-28T14:00:00Z'))).toEqual(['2026-11-30']); // Saturday → Monday
    expect(pktToday(new Date('2026-11-23T20:00:00Z'))).toBe('2026-11-24'); // 1 am in Pakistan
    expect(nextCourtDay('2026-11-29')).toBe('2026-11-30');
  });

  it('writes day files, merges newer ones, prunes old days and indexes the rest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cl-'));
    const pk = mkdtempSync(join(tmpdir(), 'clpk-'));
    writeDay(dir, 'ihc', '2026-11-24', { source: 's', entries: [{ caseNo: 'W.P. 1/2026' }] }, new Date('2026-11-23T13:30:00Z'));
    writeDay(dir, 'ihc', '2026-11-10', { source: 's', entries: [{ caseNo: 'W.P. 2/2026' }] });
    mkdirSync(join(pk, 'lhc'));
    writeFileSync(join(pk, 'lhc', '2026-11-24.json'), JSON.stringify({ court: 'lhc', date: '2026-11-24', fetchedAt: '2026-11-23T13:00:00Z', lines: ['W.P. 9/2026 A v. B'] }));
    writeFileSync(join(pk, 'lhc', 'evil.json'), '{}');
    expect(mergeFrom(pk, dir)).toBe(1);
    const index = pruneAndIndex(dir, '2026-11-19');
    expect(existsSync(join(dir, 'ihc', '2026-11-10.json'))).toBe(false);
    expect(index.files).toEqual([
      { court: 'ihc', date: '2026-11-24', count: 1, fetchedAt: '2026-11-23T13:30:00.000Z', path: 'ihc/2026-11-24.json' },
      { court: 'lhc', date: '2026-11-24', count: 1, fetchedAt: '2026-11-23T13:00:00Z', path: 'lhc/2026-11-24.json' },
    ]);
    expect(JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')).files).toHaveLength(2);
  });
});
