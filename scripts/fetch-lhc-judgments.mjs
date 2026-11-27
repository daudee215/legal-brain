/** Download judgments linked by the Lahore High Court's official reporting pages. */
import { fetchJudgments, hrefOf, listingText, rowsOf, textOf, yearRange } from './high-court-fetch.mjs';

const base = 'https://data.lhc.gov.pk';
const reported = '/reported_judgments/judgments_approved_for_reporting';
const search = ['approved_judgments_result_new.php', 'approved_judgments_result_former_judges.php'];

export function parseListing(html) {
  return rowsOf(html.replace(/<!--[\s\S]*?-->/g, '')).flatMap((row) => {
    const href = hrefOf(row);
    const key = href.match(/^https:\/\/sys\.lhc\.gov\.pk\/appjudgments\/(\d{4})LHC(\d+)\.pdf$/i);
    if (!key) return [];
    // The search results sometimes close the judge cell with </th>.
    const cells = [...row.matchAll(/<td\b[^>]*>((?:(?!<td\b)[\s\S])*?)<\/t[dh]>/gi)].map((cell) => textOf(cell[1]));
    const [caption, author = ''] = textOf(row.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '')
      .split(/\s+by\s+(?=(?:(?:Mr\.|Ms\.|Mrs\.|Miss)\s+)?(?:Chief\s+)?Justice\b)/i);
    const headline = caption.match(/^(.*?)\s+\((.*\b(?:versus|vs?\.?|v\/s)\s+.*)\)$/i);
    const dateIndex = cells.findIndex((cell) => /^\d{1,2}-\d{1,2}-\d{4}$/.test(cell));
    return [{
      n: key[1] + key[2],
      pdf: href,
      caseNo: dateIndex > 0 ? cells[1] : headline?.[1] ?? '',
      title: dateIndex > 0 ? cells[2] : headline?.[2] ?? caption,
      bench: dateIndex > 3 ? cells[3] : author,
      date: dateIndex > 0 ? cells[dateIndex] : '',
      citation: `${key[1]} LHC ${key[2]}`,
      summary: textOf(row.match(/Tag Line:\s*<i>([\s\S]*?)<\/i>/i)?.[1] ?? ''),
      reported: true,
    }];
  });
}

async function discover(years = yearRange(2010, 2026)) {
  const rows = new Map();
  if (years.includes(2026)) {
    for (const row of parseListing(await listingText(base + reported))) rows.set(row.n, row);
  }
  for (const year of years) {
    for (const endpoint of search) {
      const query = new URLSearchParams({
        year: String(year), debug: '0', courtName: 'All Courts', caseNumber: '', citationTag: '',
        partyName: '', decisionDate0: '', decisionDate1: '', uploadDate: '', uploadDate1: '',
      });
      // Use the same space encoding as the official page's GET request.
      const url = `${base}/dynamic/${endpoint}?${query.toString().replaceAll('+', '%20')}`;
      const html = await listingText(url);
      if (!/Total Judgments/i.test(html)) throw new Error(`Unexpected Lahore judgment listing for ${year}`);
      for (const row of parseListing(html)) {
        row.summary ||= rows.get(row.n)?.summary ?? '';
        rows.set(row.n, row);
      }
    }
  }
  return [...rows.values()];
}

if (process.argv[1]?.endsWith('fetch-lhc-judgments.mjs')) {
  fetchJudgments('lhc', discover).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
