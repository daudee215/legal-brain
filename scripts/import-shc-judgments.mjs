/**
 * Build the Sindh High Court part of the Case Law library from the PDFs fetched by fetch-shc-judgments.mjs.
 *
 *   node scripts/import-shc-judgments.mjs <cache-dir>
 *
 * Uses what the Court's portal says about each judgment (case, parties, bench, citation, order date, the
 * Court's own one-line summary) and the text of the Court's PDF.
 *
 * Output (committed, served as static files):
 *   public/caselaw/shc/index.json   — light list for search
 *   public/caselaw/shc/<id>.json    — one judgment's cleaned text
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fixSpaces, LAWS, openingSummary, parseDate, splitJudgment, subjects } from './import-sc-judgments.mjs';

const OUT = path.join(process.cwd(), 'public', 'caselaw', 'shc');
const pdfjsPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs');

const MON = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
/** "26-NOV-26" → "2026-11-26" */
function orderDate(s) {
  const m = s.match(/^(\d{1,2})-([A-Z]{3})-(\d{2,4})$/i);
  if (!m) return '';
  const mo = MON[m[2].toUpperCase()];
  let y = +m[3];
  if (y < 100) y += y <= 30 ? 2000 : 1900;
  if (!mo || y < 1947 || y > 2026) return '';
  return `${y}-${String(mo).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
}

const SEATS = { KHI: 'Karachi', HYD: 'Hyderabad', SUK: 'Sukkur', LAR: 'Larkana', MPK: 'Mirpurkhas' };
function seatOf(station, citation) {
  const c = citation.match(/SHC\s+(KHI|HYD|SUK|LAR|MPK)/)?.[1];
  if (c) return SEATS[c];
  const s = station.match(/(Karachi|Hyderabad|Sukkur|Larkana|Mirpur\s*Khas)/i)?.[1];
  return s ? (s.replace(/\s+/g, '').toLowerCase() === 'mirpurkhas' ? 'Mirpurkhas' : s[0].toUpperCase() + s.slice(1).toLowerCase()) : '';
}

const ROLE = /\s*\((Applicant|Appellant|Petitioner|Respondent|Complainant|Plaintiff|Defendant|Accused)s?\)/gi;
const STATION = /\s*Sindh High Court,?\s*(Circuit( Court)?,?( at)?)?\s*[A-Za-z ]*$/i;

/**
 * Two label styles:
 *   "Cr.J.A 31/2024 (D.B.) Amanat @ Don V/S The State Sindh High Court, Circuit at Larkana"
 *   "252/2021 Cr.Bail Ahmed Ali (Applicant) V/S The State (Respondent)"
 */
function parseLabel(label, types) {
  let l = label.replace(STATION, '').replace(ROLE, '').replace(/\s+/g, ' ').trim();
  let caseNo = '';
  let rest = l;
  const a = l.match(/^(.+?\s\d+\/\d{4})\s*(\([SDF]\.B\.\))?\s+(.*)$/);
  const b = l.match(/^(\d+\/\d{4})\s+(.*)$/);
  if (b) {
    const t = types.find((x) => b[2].startsWith(`${x} `));
    if (t) {
      caseNo = `${t} ${b[1]}`;
      rest = b[2].slice(t.length + 1);
    } else {
      const [first, ...more] = b[2].split(' ');
      caseNo = `${first} ${b[1]}`;
      rest = more.join(' ');
    }
  } else if (a) {
    caseNo = a[1];
    rest = a[3];
  }
  const [p1, p2] = rest.split(/\s+V\/S\s+/i);
  const title = p1 && p2 ? `${p1.trim()} v. ${p2.trim()}` : rest || caseNo;
  return { caseNo: caseNo || label, title };
}

function judgesOf(bench) {
  return bench
    .split(/,\s*(?=Hon)/)
    .map((x) =>
      x
        .replace(/Hon'?ble\s*/i, '')
        .replace(/\(Author\)/i, '')
        .replace(/,?\s*(Senior Puisne Judge|Chief Justice)\s*$/i, '')
        .replace(/^(Chief Justice\s+)?(Mr\.|Mrs\.|Ms\.|Miss)?\s*/i, '')
        .replace(/^Justice\s+(Mr\.|Mrs\.|Ms\.|Miss)\s*/i, 'Justice ')
        .replace(/^(Mr\.|Mrs\.|Ms\.)\s*/i, '')
        .trim(),
    )
    .filter(Boolean)
    .map((x) => (x.startsWith('Justice') ? x : `Justice ${x}`));
}

async function pdfText(file, getDocument) {
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await getDocument({ data, useSystemFonts: true, verbosity: 0, isEvalSupported: false }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    let cur = '';
    let lastY = null;
    for (const it of tc.items) {
      const y = it.transform?.[5];
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
        lines.push(cur);
        cur = '';
      }
      cur += it.str;
      if (it.hasEOL) {
        lines.push(cur);
        cur = '';
      }
      if (y !== undefined) lastY = y;
    }
    if (cur) lines.push(cur);
    page.cleanup();
  }
  await (doc.cleanup?.() ?? undefined);
  return lines.map(fixSpaces).filter(Boolean);
}

const CP1252 = { 145: '‘', 146: '’', 147: '“', 148: '”', 150: '–', 151: '—', 133: '…', 160: ' ' };
/** Lines of a Word document saved as HTML (one per paragraph). */
function wordHtmlText(src) {
  const body = (src.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? src).replace(/<style[\s\S]*?<\/style>/gi, '');
  return body
    .replace(/\s+/g, ' ') // the HTML wraps lines inside a paragraph; only tags mark real breaks
    .replace(/<\/(p|div|h\d|li|tr)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/[\x80-\x9f\xa0]/g, (c) => CP1252[c.charCodeAt(0)] ?? ' ')
    .split('\n')
    .map((l) => fixSpaces(l.replace(/\r/g, ' ')))
    .filter(Boolean);
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: node scripts/import-shc-judgments.mjs <cache-dir>');
  const { getDocument } = await import(pathToFileURL(pdfjsPath).href);
  const listing = JSON.parse(fs.readFileSync(path.join(dir, 'listing.json'), 'utf8'));
  // Case types as the portal writes them ("Cr.Bail", "Const. P.", "R.A (Civil Revision)"), longest first.
  const types = [...new Set(listing.map((x) => x.label.match(/^(.+?)\s\d+\/\d{4}/)?.[1]).filter((t) => t && !/^\d/.test(t)))].sort((a, b) => b.length - a.length);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const index = [];
  let noPdf = 0;
  let scanned = 0;
  for (const [i, x] of listing.entries()) {
    const pdf = path.join(dir, 'pdf', `${x.n}.pdf`);
    const html = path.join(dir, 'pdf', `${x.n}.html`);
    const isHtml = !fs.existsSync(pdf) && fs.existsSync(html);
    if (!fs.existsSync(pdf) && !isHtml) {
      noPdf++;
      continue;
    }
    let lines = [];
    try {
      lines = isHtml ? wordHtmlText(fs.readFileSync(html, 'latin1')) : await pdfText(pdf, getDocument);
    } catch (e) {
      if (process.env.DEBUG) console.log(x.n, e.message);
      lines = [];
    }
    const text = lines.join('\n');
    const hasText = text.length > 300;
    if (!hasText) scanned++;
    const { caseNo, title } = parseLabel(x.label, types);
    const { header, body } = hasText ? splitJudgment(lines, { paragraphs: isHtml }) : { header: [], body: [] };
    const citation = x.citation
      .split(/,\s*/)
      .map((c) => c.replace(/\s+/g, ' ').trim())
      .filter((c) => /\bSHC\b/.test(c))
      .join(', ');
    const date =
      orderDate(x.orderDate) ||
      // "Date of decision: …", "Date of detailed reasons : …", "Date of hearing & short order: …" — prefer the decision
      ['decision|judgment|announcement|order\\b|detailed reasons', 'hearing[^:]{0,20}short order', 'hearing']
        .map((k) => parseDate(text.slice(0, 4000).match(new RegExp(`Date of (?:${k})\\s*:?\\s*([0-9./-]{8,10}|\\d{1,2}\\w*\\s+\\w+,?\\s+\\d{4})`, 'i'))?.[1] || ''))
        .find(Boolean) ||
      '';
    const year = date ? '' : citation.match(/^(\d{4})/)?.[1] || '';
    const courtSummary = x.summary && x.summary.length > 40 ? x.summary : '';
    const laws = LAWS.filter(([, , re]) => re.test(text));
    const rawTopic = (x.topic || x.matter || '').replace(/\s+/g, ' ').trim();
    const topic = rawTopic && rawTopic === rawTopic.toUpperCase() ? rawTopic[0] + rawTopic.slice(1).toLowerCase() : rawTopic;
    const tags = [...new Set([topic, ...subjects(caseNo, text), ...laws.map(([, label]) => label)].filter(Boolean))].slice(0, 8);
    const id = `shc-${x.n}`;
    index.push({
      id,
      courtId: 'shc',
      title,
      caseNo,
      date: date || (year ? `${year}-01-01` : ''),
      dateKnown: !!date,
      judges: judgesOf(x.bench),
      summary: courtSummary || (hasText ? openingSummary(body) : x.summary || ''),
      courtSummary: !!courtSummary,
      tags,
      statutesCited: laws.map(([sid]) => sid).filter(Boolean),
      words: text ? text.split(/\s+/).length : 0,
      source: `https://caselaw.shc.gov.pk/caselaw/view-file/${x.doc}`,
      file: `${x.n}.${isHtml ? 'doc' : 'pdf'}`,
      citation,
      seat: seatOf(x.station || x.label, x.citation),
      outcome: x.disposal || '',
      reported: !!x.afr,
      hasText,
    });
    fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify({ id, header, body }));
    if ((i + 1) % 250 === 0) console.log(`${i + 1}/${listing.length}`);
  }
  index.sort((a, b) => (a.date < b.date ? 1 : -1));
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
  const miss = (f) => index.filter(f).length;
  console.log(
    `imported ${index.length} (no PDF yet ${noPdf}, scanned/no text ${scanned}); missing: date ${miss((j) => !j.dateKnown)}, bench ${miss((j) => !j.judges.length)}, parties ${miss((j) => !/ v\. /.test(j.title))}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
