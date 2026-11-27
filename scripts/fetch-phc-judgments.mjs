/** Download judgments from the Peshawar High Court's public reporting search. */
import { createHash } from 'node:crypto';
import { fetchJudgments, hrefOf, listingText, rowsOf, textOf, yearRange } from './high-court-fetch.mjs';

const base = 'https://www.peshawarhighcourt.gov.pk';
const listing = base + '/PHCCMS/reportedJudgments.php?action=search';

export function parseListing(html) {
  return rowsOf(html).flatMap((row) => {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1]);
    if (cells.length < 9) return [];
    const href = hrefOf(cells[8]);
    if (!href) return [];
    const url = new URL(href, listing);
    url.pathname = url.pathname.replace(/\/{2,}/g, '/');
    if (url.origin !== base || !/^\/PHCCMS\/judgments\/[^/]+\.pdf$/i.test(url.pathname)) return [];
    const caption = textOf(cells[1]);
    const parts = caption.match(/^(.+?(?:(?:\bof\s+|[/-])\d{4}\b)(?:\s*(?:,|&|and)\s+[A-Z.][^&]*?(?:\bof\s+|[/-])\d{4}\b)*)(?:\s+(.+))?$/i);
    // The public listing has no document id. Use the normalized official PDF path for a stable id.
    const hex = createHash('sha256').update(url.pathname).digest('hex').slice(0, 16);
    return [{
      n: BigInt(`0x${hex}`).toString(),
      pdf: url.href,
      caseNo: parts?.[1] ?? '',
      title: parts?.[2] ?? caption,
      summary: textOf(cells[2]),
      citation: textOf(cells[4]).match(/\b\d{4}\s+PHC\s+\d+\b/i)?.[0] ?? '',
      date: textOf(cells[5]),
      topic: textOf(cells[7]),
      reported: true,
    }];
  });
}

async function discover(years = yearRange(2010, 2026)) {
  const rows = [];
  for (const year of years) {
    const body = new FormData();
    for (const [key, value] of Object.entries({ year, judge: '0', category: '0', txtsearchbyremarks: '', submit: 'search' })) {
      body.set(key, value);
    }
    rows.push(...parseListing(await listingText(listing, { method: 'POST', body })));
  }
  return rows;
}

if (process.argv[1]?.endsWith('fetch-phc-judgments.mjs')) {
  fetchJudgments('phc', discover).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
