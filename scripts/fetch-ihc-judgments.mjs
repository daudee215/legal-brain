/** Download judgments returned by the Islamabad High Court's public Case Law search. */
import { fetchJudgments, listingText, yearRange } from './high-court-fetch.mjs';

const base = 'https://mis.ihc.gov.pk';

export function parseListing(payload) {
  let rows = JSON.parse(payload);
  rows = typeof rows.d === 'string' ? JSON.parse(rows.d) : rows.d ?? rows;
  if (rows === 'empty') return [];
  if (!Array.isArray(rows)) throw new Error('Unexpected Islamabad judgment listing');
  return rows.flatMap((row) => {
    const n = String(row.O_ID);
    const attachment = row.ATTACHMENTS?.trim();
    if (!/^\d+$/.test(n) || !/^\/attachments\/judgements\/[\w%./() -]+\.pdf$/i.test(attachment)) return [];
    const pdf = new URL(attachment, base);
    if (!pdf.pathname.toLowerCase().startsWith('/attachments/judgements/')) return [];
    const citation = row.O_CITATION?.match(/\b\d{4}\s+IHC\s+\d+\b/i)?.[0] ?? '';
    const query = new URLSearchParams({
      cseNo: [row.CASENO, citation].filter(Boolean).join(' | '),
      cseTle: row.PARTIES || '',
      jgs: row.BENCHNAME || '',
      jgmnt: attachment,
    });
    return [{
      n,
      pdf: pdf.href,
      source: `${base}/frmRdJgmnt?${query}`,
      caseNo: row.CASENO,
      title: row.PARTIES || row.TITLE,
      bench: row.BENCHNAME || row.AUTHOR_JUDGES,
      date: row.DDATE,
      citation,
      seat: 'Islamabad',
      reported: Number(row.O_AFR) === 1,
    }];
  });
}

async function discover(years = yearRange(2007, 2026)) {
  const rows = [];
  for (const year of years) {
    const body = JSON.stringify({
      PCASENO: '0', PJUG: '0', PADV: '0', PYEAR: String(year), pPrty: '',
      PDDATE: '01/01/1900', PLANDMARK: '1', PAFR: '1',
    });
    const payload = await listingText(base + '/ihc.asmx/srchDecisionClms', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body,
    });
    rows.push(...parseListing(payload));
  }
  return rows;
}

if (process.argv[1]?.endsWith('fetch-ihc-judgments.mjs')) {
  fetchJudgments('ihc', discover).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
