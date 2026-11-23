/**
 * Peshawar High Court (principal seat) — daily cause list.
 *
 * The list page is a plain HTML form (bench_sno + causelist_date, POST). The answer carries one or more
 * "Download Causelist" links to /causeLists/<timestamp>.pdf (≈10 MB, ≈180–240 pages, real text layer).
 * robots.txt: checked 2026-11-23 — the site answers /robots.txt with an HTML redirect stub, i.e. no rules;
 * politeFetch() re-checks on every run anyway.
 *
 * The PDF is a three-column table (Sr./case no. | parties | advocates) under "BEFORE:- … Court No: N" headers
 * and stage headings ("MOTION CASES", "NOTICE CASES (VL)" …). We read text runs with their positions, anchor
 * each entry on its serial number in the left margin, and take the case-number column and party column
 * between one anchor and the next. Advocate names are not kept.
 */
import { CASE_NO_RE, log, politeFetch, squashSpaces } from '../lib/common.mjs';
import { pdfItems } from '../lib/pdf.mjs';

const ORIGIN = 'https://www.peshawarhighcourt.gov.pk';
const LIST_URL = `${ORIGIN}/app/site/4/p/Causelists_List.html`;
/** bench_sno values on the court's form: 1 = Peshawar (principal seat), 2 Abbottabad, 3 D.I.Khan, 4 Mingora, 5 Bannu. */
export const PHC_PRINCIPAL_SEAT = '1';

/** Absolute URLs of the cause-list PDFs linked from the form's answer page. */
export function parseResultPage(html) {
  const out = [];
  const re = /href\s*=\s*["']([^"']*\/causeLists\/[^"']+\.pdf)["']/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const url = new URL(m[1], ORIGIN).toString();
    if (!out.includes(url)) out.push(url);
  }
  return out;
}

const SERIAL = /^\d{1,4}\.?$/;
const HEADING = /^[A-Z][A-Z ()\-.&/]*(CASES|NOTICE|HEARING|ORDERS|MATTERS|LIST|WORK)\b[A-Z ()\-.&/]*$/;
const FOOTER = /IT BRANCH|Page \d+ of \d+|VIDEO LINK/i;
const CASE_COL_MIN = 45;
const PARTY_COL_MIN = 190;
const PARTY_COL_MAX = 400;

/** "Cr.A 153- P/2023(Acquittal Appeal-PPC) (275009)" → "Cr.A 153-P/2023" */
export function phcCaseNo(caseColumnText) {
  const t = caseColumnText.replace(/\s+/g, ' ').replace(/(\d)\s*-\s*([A-Za-z]{1,2})\s*\//g, '$1-$2/');
  const m = /^(.*?)(\d{1,6}(?:-[A-Za-z]{1,2})?)\s*\/\s*((?:19|20)\d{2})/.exec(t);
  if (!m) return null;
  const type = m[1].trim();
  if (!type || type.length > 30) return null;
  return `${type} ${m[2].toUpperCase()}/${m[3]}`;
}

function cleanParties(parts) {
  return squashSpaces(
    parts
      .join(' ')
      .replace(/\(Date By Court\)/gi, ' ')
      .replace(/_{3,}/g, ' ')
      .replace(/\bV\/S\b/gi, ' v. '),
  )
    .replace(/\s+v\.\s+/g, ' v. ')
    .slice(0, 160);
}

/**
 * Entries from the positioned text of every page. Court room and bench carry over between pages
 * (each page repeats its header, but a bench may run on to pages without one).
 * @param {{ x: number, y: number, s: string }[][]} pages
 * @returns {import('../lib/common.mjs').Entry[]}
 */
export function parsePhcPages(pages) {
  const entries = [];
  let courtRoom;
  let bench;
  let stage;
  for (const items of pages) {
    // Header: "Court No: N" and the judges' names between "BEFORE:-" and the first heading/entry.
    const courtItem = items.find((i) => /^Court No\s*:?\s*\d+/i.test(i.s.trim()));
    const before = items.find((i) => /^BEFORE\s*:?-?$/i.test(i.s.trim()));
    if (courtItem) courtRoom = /\d+/.exec(courtItem.s)[0];
    else if (before) courtRoom = undefined; // e.g. "BEFORE:- DEPUTY REGISTRAR" has no court number

    const anchors = items.filter((i) => i.x < CASE_COL_MIN && SERIAL.test(i.s.trim())).sort((a, b) => b.y - a.y);
    const headings = items.filter((i) => HEADING.test(i.s.trim()) && !/JUSTICE/.test(i.s)).sort((a, b) => b.y - a.y);
    const footerY = Math.max(-1, ...items.filter((i) => FOOTER.test(i.s)).map((i) => i.y));

    if (before) {
      const top = before.y + 4;
      const stop = Math.max(anchors[0]?.y ?? -1, headings[0]?.y ?? -1);
      const judges = items
        .filter((i) => i !== before && i !== courtItem && i.y <= top && i.y > stop + 4 && /JUSTICE|REGISTRAR|JUDGE/i.test(i.s))
        .sort((a, b) => b.y - a.y || a.x - b.x)
        .map((i) => squashSpaces(i.s));
      if (judges.length) bench = judges.join(', ');
    }

    anchors.forEach((a, idx) => {
      const top = a.y + 6;
      const lowerBounds = [anchors[idx + 1]?.y, ...headings.filter((h) => h.y < a.y).map((h) => h.y), footerY].filter(
        (v) => typeof v === 'number',
      );
      const bottom = Math.max(...lowerBounds, -1) + 6;
      const inSpan = items.filter((i) => i.y <= top && i.y > bottom);
      const byRow = (p, q) => q.y - p.y || p.x - q.x;
      const caseText = inSpan.filter((i) => i.x >= CASE_COL_MIN && i.x < PARTY_COL_MIN).sort(byRow).map((i) => i.s).join(' ');
      const caseNo = phcCaseNo(caseText);
      if (!caseNo) return;
      const parties = inSpan.filter((i) => i.x >= PARTY_COL_MIN && i.x < PARTY_COL_MAX && !HEADING.test(i.s.trim())).sort(byRow).map((i) => i.s);
      const heading = headings.filter((h) => h.y > a.y).at(-1);
      if (heading) stage = squashSpaces(heading.s);
      entries.push({
        ...(bench ? { bench } : {}),
        ...(courtRoom ? { courtRoom } : {}),
        srNo: Number(a.s.replace('.', '')),
        caseNo,
        title: cleanParties(parties),
        ...(stage ? { stage } : {}),
      });
    });
    // A heading below the last entry on the page still applies to the next page.
    const lastHeading = headings.at(-1);
    if (lastHeading && (!anchors.length || lastHeading.y < anchors.at(-1).y)) stage = squashSpaces(lastHeading.s);
  }
  return entries;
}

/** Fallback when the table layout is not recognised: every text line that carries a case number. */
export function phcLinesFallback(lines) {
  return lines.filter((l) => CASE_NO_RE.test(l) || /^Court No\s*:?\s*\d+/i.test(l));
}

export async function fetchPhc(date, { bench = PHC_PRINCIPAL_SEAT } = {}) {
  const form = new URLSearchParams({ url: LIST_URL, bench_sno: bench, causelist_date: date, btnSearch: 'Search Causelist' });
  const res = await politeFetch(LIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    timeoutMs: 45_000,
  });
  const html = await res.text();
  if (!html.includes(`Causelist date: ${date}`) && !parseResultPage(html).length) {
    log('phc', `no list published for ${date} yet`);
    return null;
  }
  const pdfs = parseResultPage(html);
  if (!pdfs.length) {
    log('phc', `no list published for ${date} yet`);
    return null;
  }
  const entries = [];
  for (const url of pdfs) {
    const pdf = await politeFetch(url, { timeoutMs: 180_000 });
    const bytes = new Uint8Array(await pdf.arrayBuffer());
    const pages = await pdfItems(bytes);
    const found = parsePhcPages(pages);
    log('phc', `${url.split('/').pop()}: ${pages.length} pages, ${found.length} entries`);
    entries.push(...found);
  }
  return entries.length ? { source: pdfs[0], entries } : null;
}
