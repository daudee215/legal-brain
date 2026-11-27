/**
 * Import Supreme Court of Pakistan judgments into the Case Law library.
 *
 *   node scripts/import-sc-judgments.mjs <judgments.parquet | judgments.json>
 *
 * Input: rows of { text, case_details: "{'id': 'C.A.10_2021.pdf', 'url': ''}" } — the text of judgments
 * published as PDFs on supremecourt.gov.pk. Judgments are public documents; no law-report headnotes are used.
 *
 * Output (committed, served as static files):
 *   public/caselaw/sc/index.json   — light list for search: case no., parties, date, bench, opening lines, laws cited
 *   public/caselaw/sc/<id>.json    — one judgment's cleaned text, loaded only when opened
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'caselaw', 'sc');

async function readRows(file) {
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8')).map((r) => ({ text: r.text, details: r.details ?? r.case_details }));
  const { asyncBufferFromFile, parquetReadObjects } = await import('hyparquet');
  const { compressors } = await import('hyparquet-compressors');
  const buf = await asyncBufferFromFile(file);
  const rows = await parquetReadObjects({ file: buf, compressors, columns: ['text', 'case_details'] });
  return rows.map((r) => ({ text: r.text, details: r.case_details }));
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const pad = (n) => String(n).padStart(2, '0');
const validYmd = (y, m, d) => y >= 1947 && y <= 2026 && m >= 1 && m <= 12 && d >= 1 && d <= 31;

/** "10th of May, 2016" / "10.05.2016" / "10-05-2016" → "2016-05-10" */
function parseDate(s) {
  let m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:day\s+)?(?:of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December),?\s*(\d{4})/i);
  if (m) {
    const y = +m[3], mo = MONTHS.indexOf(m[2].toLowerCase()) + 1, d = +m[1];
    if (validYmd(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`;
  }
  m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) {
    const y = +m[3], mo = +m[2], d = +m[1];
    if (validYmd(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`;
  }
  return '';
}

const fixSpaces = (s) => s.replace(/[ \t ]+/g, ' ').trim();
const titleCase = (s) =>
  s
    .toLowerCase()
    .replace(/(^|[\s(./'-])([a-z])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(Of|And|The|In|Etc|Vs|V)\b/g, (w) => w.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());

/** Judges' names from the PRESENT: block. */
function bench(lines) {
  const i = lines.findIndex((l) => /^PRESENT\s*:?/i.test(l));
  if (i < 0) return [];
  const out = [];
  const first = lines[i].replace(/^PRESENT\s*:?/i, '').trim();
  const pool = first ? [first, ...lines.slice(i + 1, i + 12)] : lines.slice(i + 1, i + 12);
  for (const l of pool) {
    if (!/JUSTICE/i.test(l)) {
      if (out.length) break;
      continue;
    }
    const name = l
      .replace(/^(MR\.?|MRS\.?|MS\.?|MISS)\s*/i, '')
      .replace(/^JUSTICE\s*/i, '')
      .replace(/[,;]?\s*\b(H?CJ|C\.J\.?|J\.?|ACJ)\s*$/i, '')
      .replace(/[,;.\s]+$/, '')
      .trim();
    if (name && name.length < 60) out.push(`Justice ${titleCase(name)}`);
  }
  return out;
}

const CASE_RE =
  /^(?:CIVIL|CRIMINAL|CRL\.?|CONST(?:ITUTION)?\.?|JAIL|SHARIAT|SUO\s*MOTU|HUMAN\s*RIGHTS|CIVIL\s*MISC(?:ELLANEOUS)?\.?|CRIMINAL\s*MISC(?:ELLANEOUS)?\.?|C\.?\s*M\.?\s*A|C\.?\s*R\.?\s*P|REVIEW|INTRA\s*COURT|ORIGINAL|C\.?\s*P\.?|C\.?\s*A\.?|CR\.?\s*[AP])[^\n]{0,80}?\bNOS?\b/i;

function caseNumber(lines) {
  for (const l of lines.slice(0, 60)) {
    if (CASE_RE.test(l) && /\d/.test(l)) return fixSpaces(l).replace(/[,.]+$/, '').slice(0, 140);
  }
  return '';
}

/** "A … Appellant VERSUS B … Respondents" → "A v. B" */
function parties(lines) {
  const vi = lines.findIndex((l, i) => i < 120 && /^(VERSUS|VS\.?|V\/S)$/i.test(l.replace(/[^\w/.]/g, '')));
  if (vi < 0) return '';
  const isRole = (l) => /^[….]/.test(l) || /^\d{1,2}\.$/.test(l) || /^in\s+[A-Z]/.test(l) || (/(appellant|petitioner|respondent|applicant|complainant|accused|convict)s?\b/i.test(l) && l.length < 40);
  // Drop "(in Crl.A-24/2010)" style notes and trailing "…Appellant" markers.
  const strip = (l) => l.replace(/\((?:in|in both|in all)\b[^)]*\)?/gi, '').replace(/\s*(…|\.{3}).*$/, '').trim();
  const stop = (l) => CASE_RE.test(l) || /^\(?(on appeal|against|from)\b/i.test(l) || /\)[.,]?$/.test(l) || /^\d{4}\b/.test(l) || /^[a-z]/.test(l) || /^(for the|present|date of)/i.test(l);
  // A party name can wrap over up to three lines; collect the block next to VERSUS.
  const block = (from, step) => {
    const got = [];
    for (let i = from, n = 0; i >= 0 && i < lines.length && n < 8; i += step, n++) {
      const raw = lines[i];
      const l = strip(raw);
      if (!got.length && (!l || isRole(raw))) continue;
      if (!l || isRole(raw) || stop(raw) || got.length === 3) break;
      got.push(l);
    }
    return (step < 0 ? got.reverse() : got).join(' ');
  };
  const clean = (s) =>
    fixSpaces(s.replace(/\b(appellants?|petitioners?|respondents?)(\(s\))?\b\.?$/i, ''))
      .replace(/[,:;]+$/, '')
      .replace(/\s+(through|thr\.?|and|&)$/i, '');
  const a = clean(block(vi - 1, -1));
  const b = clean(block(vi + 1, 1));
  const bad = (x) => !x || x.length < 4 || x.length > 120 || /^[a-z(\d]/.test(x) || /\bNo\.?\s*\d|\)$|^(in|from|against)\b/i.test(x);
  if (bad(a) || bad(b)) return '';
  if (a === b) return '';
  return `${a} v. ${b}`;
}

const LAWS = [
  ['constitution-1973', 'Constitution', /\bConstitution\b|\bArticle\s+\d+/i],
  ['crpc-1898', 'Cr.P.C.', /Code of Criminal Procedure|Cr\.?\s?P\.?\s?C\b/i],
  ['ppc-1860', 'P.P.C.', /Pakistan Penal Code|\bP\.?\s?P\.?\s?C\b/i],
  ['cpc-1908', 'C.P.C.', /Code of Civil Procedure|\bC\.?\s?P\.?\s?C\b/i],
  ['qso-1984', 'Qanun-e-Shahadat', /Qanun-?e-?Shahadat/i],
  ['limitation-1908', 'Limitation Act', /Limitation Act/i],
  ['family-courts-1964', 'Family Courts Act', /Family Courts Act/i],
  ['punjab-rent-2009', 'Punjab Rented Premises Act', /Punjab Rented Premises Act/i],
  ['', 'Specific Relief Act', /Specific Relief Act/i],
  ['', 'Anti-Terrorism Act', /Anti-?Terrorism Act/i],
  ['', 'Control of Narcotic Substances Act', /Control of Narcotic Substances Act|\bCNSA\b/i],
  ['', 'Income Tax Ordinance', /Income Tax Ordinance/i],
  ['', 'Sales Tax Act', /Sales Tax Act/i],
  ['', 'Customs Act', /Customs Act/i],
  ['', 'Civil Servants Act', /Civil Servants Act/i],
  ['', 'Service Tribunals Act', /Service Tribunals Act/i],
  ['', 'Contract Act', /Contract Act/i],
  ['', 'Transfer of Property Act', /Transfer of Property Act/i],
  ['', 'Registration Act', /Registration Act/i],
  ['', 'Muslim Family Laws Ordinance', /Muslim Family Laws Ordinance/i],
  ['', 'National Accountability Ordinance', /National Accountability Ordinance|\bNAO\b/i],
  ['', 'Elections Act', /Elections Act|Representation of the People Act/i],
  ['', 'Land Acquisition Act', /Land Acquisition Act/i],
  ['', 'Companies Act / Ordinance', /Companies (Act|Ordinance)/i],
  ['', 'Industrial Relations', /Industrial Relations (Act|Ordinance)/i],
  ['', 'Pre-emption', /Pre-?emption Act/i],
];

/** Subject tags from the case type and the laws a judgment refers to. */
function subjects(caseNo, text) {
  const t = [];
  // A subject counts only when the judgment keeps coming back to it, not on a passing mention.
  const hits = (re, n = 3) => (text.match(new RegExp(re.source, 'gi')) || []).length >= n;
  if (/crim|crl|jail|cr\.?\s*[ap]/i.test(caseNo)) t.push('Criminal');
  else if (/const|suo\s*motu|human\s*rights/i.test(caseNo)) t.push('Constitutional');
  else if (/civil|c\.?\s*[ap]\b/i.test(caseNo)) t.push('Civil');
  if (hits(/\bbail\b/)) t.push('Bail');
  if (hits(/\bqatl|murder|section 302\b|s\.\s?302\b/)) t.push('Murder');
  if (hits(/\bnarcotic/)) t.push('Narcotics');
  if (hits(/\bcivil servant|service tribunal|\bpromotion\b|\bseniority\b/)) t.push('Service');
  if (hits(/\bincome tax|sales tax|customs duty|\bFBR\b/)) t.push('Tax');
  if (hits(/\binheritance|legal heirs|\bwirasat/)) t.push('Inheritance');
  if (hits(/\bpre-?emption\b/)) t.push('Pre-emption');
  if (hits(/\bspecific performance\b/)) t.push('Specific performance');
  if (hits(/\bcondonation of delay|barred by time|time-barred/)) t.push('Limitation');
  if (hits(/\bkhula|dissolution of marriage|\bdower\b|\bmaintenance allowance|custody of (the )?minor|guardian and wards/)) t.push('Family');
  if (hits(/\belection\b/)) t.push('Elections');
  if (hits(/\bejectment|\btenant\b|\blandlord\b/)) t.push('Rent');
  if (hits(/\bland acquisition|compensation for (the )?land/)) t.push('Land acquisition');
  return t;
}

/** Turn PDF lines back into paragraphs: drop page numbers and running headers, join wrapped lines. */
function reflow(lines) {
  const counts = new Map();
  for (const l of lines) if (l.length < 70) counts.set(l, (counts.get(l) || 0) + 1);
  const keep = lines.filter((l) => !/^\d{1,3}$/.test(l) && !/^-?\s*:?\s*\d{1,3}\s*:?\s*-?$/.test(l) &&!(counts.get(l) >= 3 && /\d/.test(l) && !/^\d+\.$/.test(l)));
  const typical = (() => {
    const ls = keep.map((l) => l.length).filter((n) => n > 30).sort((a, b) => a - b);
    return ls.length ? ls[Math.floor(ls.length * 0.6)] : 70;
  })();
  const paras = [];
  let cur = '';
  let prev = '';
  for (const l of keep) {
    const numbered = /^\d{1,3}\.$/.test(l) || /^\(\w{1,4}\)$/.test(l);
    if (numbered) {
      if (cur) paras.push(cur);
      cur = l;
      prev = '';
      continue;
    }
    const ended = /[.:;?"”)]$/.test(prev);
    // "2. The facts…" on a fresh line after a finished sentence starts paragraph 2, however long the line before.
    const newPara = !cur || (/^\d{1,3}\.$/.test(cur) ? false : ended && (prev.length < typical * 0.8 || /^\d{1,3}\.\s+[A-Z“"]/.test(l)));
    if (newPara && cur) {
      paras.push(cur);
      cur = l;
    } else cur = cur ? (/-$/.test(cur) && /^[a-z]/.test(l) ? cur.slice(0, -1) + l : `${cur} ${l}`) : l;
    prev = l;
  }
  if (cur) paras.push(cur);
  return paras.map((p) => fixSpaces(p.replace(/(^|\s)-\s*:\s*\d{1,3}\s*:\s*-(?=\s|$)/g, ' ')).replace(/^[=_]+\s*/, '')).filter(Boolean);
}

function idFrom(details, used) {
  const m = String(details).match(/'id':\s*'([^']+)'/);
  const raw = (m ? m[1] : String(details)).replace(/\.pdf$/i, '');
  let id = `sc-${raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  let n = 2;
  while (used.has(id)) id = `${id.replace(/-v\d+$/, '')}-v${n++}`;
  used.add(id);
  return { id, file: m ? m[1] : '' };
}

async function main() {
  const src = process.argv[2];
  if (!src) throw new Error('Usage: node scripts/import-sc-judgments.mjs <file.parquet|file.json>');
  const rows = await readRows(src);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const used = new Set();
  const seenText = new Set();
  const index = [];
  let skipped = 0;
  for (const r of rows) {
    const text = String(r.text || '');
    const key = text.replace(/\s+/g, '').slice(0, 400);
    // Skip near-empty extracts, duplicates and Urdu PDFs whose text came out garbled.
    if (text.length < 1500 || seenText.has(key) || (text.match(/�/g) || []).length > 20) {
      skipped++;
      continue;
    }
    seenText.add(key);
    const lines = text.split(/\r?\n/).map(fixSpaces).filter(Boolean);
    const { id, file } = idFrom(r.details, used);
    const caseNo = caseNumber(lines) || file.replace(/\.pdf$/i, '').replace(/_/g, ' of ');
    const judges = bench(lines);
    const tail = lines.slice(-25).join(' ');
    const date =
      parseDate(tail.match(/(?:Islamabad|Lahore|Karachi|Peshawar|Quetta)[^.]{0,20}?(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?[^0-9]{0,15}\d{4}/i)?.[0] || '') ||
      parseDate(tail.match(/\d{1,2}[./-]\d{1,2}[./-]\d{4}/)?.[0] || '') ||
      parseDate(lines.slice(0, 80).join(' ').match(/Date of (?:hearing|decision)\s*:?\s*([^A-Za-z]{6,14}|\d{1,2}\w*\s+\w+,?\s+\d{4})/i)?.[1] || '');
    const fy = +(file.match(/_(\d{4})\b/)?.[1] || 0);
    const year = date ? +date.slice(0, 4) : fy >= 1947 && fy <= 2026 ? fy : 0;
    const title = parties(lines) || titleCase(caseNo);
    const { header, body } = splitJudgment(lines);
    const summary = openingSummary(body);
    const laws = LAWS.filter(([, , re]) => re.test(text));
    const words = text.split(/\s+/).length;
    index.push({
      id,
      courtId: 'sc',
      title,
      caseNo,
      date: date || (year ? `${year}-01-01` : ''),
      dateKnown: !!date,
      judges,
      summary,
      tags: [...subjects(caseNo, text), ...laws.map(([, label]) => label)].slice(0, 8),
      statutesCited: laws.map(([sid]) => sid).filter(Boolean),
      words,
      source: 'https://www.supremecourt.gov.pk/judgements/',
      file,
    });
    fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify({ id, header, body }));
  }
  index.sort((a, b) => (a.date < b.date ? 1 : -1));
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
  const noDate = index.filter((j) => !j.dateKnown).length;
  const noBench = index.filter((j) => !j.judges.length).length;
  const noParties = index.filter((j) => !/ v\. /.test(j.title)).length;
  console.log(`imported ${index.length}, skipped ${skipped} (short or duplicate); missing: date ${noDate}, bench ${noBench}, parties ${noParties}`);
}

/** Split a judgment's lines into the heading block (court, bench, parties, counsel) and the reflowed body. */
export function splitJudgment(lines, { paragraphs = false } = {}) {
  // Body starts at JUDGMENT / ORDER heading (or the author line), else after the header block.
  // Headings are in capitals ("JUDGMENT", "O R D E R"); a wrapped line reading "judgment" is not one.
  const HEADINGS = new Set(['JUDGMENT', 'JUDGEMENT', 'ORDER', 'SHORTORDER', 'FINALORDER']);
  let start = lines.findIndex((l, i) => i > 3 && l === l.toUpperCase() && HEADINGS.has(l.replace(/[^A-Z]/g, '')));
  if (start < 0) {
    const author = lines.findIndex((l, i) => i > 3 && i < 150 && /^[A-Z][A-Za-z .'-]{5,60},\s*(H?CJ|ACJ|J)\s*\.?\s*[-–—:]/.test(l));
    if (author > 0) start = author - 1;
  }
  if (start < 0) {
    const heard = lines.findIndex((l, i) => i < 150 && /^Date of (hearing|decision)/i.test(l));
    if (heard >= 0) start = /\d{4}/.test(lines[heard]) ? heard : heard + 1;
  }
  if (start < 0) {
    // Order sheets: the order follows the list of who appeared ("Mr. X, advocate for the applicant.").
    let appeared = -1;
    lines.slice(0, 30).forEach((l, i) => {
      const narrative = /^(After|In|The|Learned|It|This|Heard|On|At|Through|By)\b/.test(l) || /^[a-z]/.test(l);
      if (!narrative && /\b(advocate|counsel|A\.?A\.?G|D\.?A\.?G|Prosecutor|for the (applicant|petitioner|appellant|respondent)s?)\b/i.test(l) && l.length < 110) appeared = i;
    });
    start = appeared >= 0 ? appeared : Math.min(lines.length > 40 ? 24 : 8, lines.length - 1);
  }
  return { header: lines.slice(0, start + 1), body: paragraphs ? lines.slice(start + 1) : reflow(lines.slice(start + 1)) };
}

/** The opening of the judgment, without the author's name, as a short summary. */
export function openingSummary(body) {
  const opening = body.find((p) => p.length > 160) || body[0] || '';
  const s = opening
    .replace(/^\d{1,2}\.\d{1,2}\.\d{4}\s+(JUDGMENT|ORDER)\s+/i, '')
    .replace(/^[A-Za-z .'-]{4,60},\s*(H?CJ|ACJ|J)\s*\.?\s*[-–—:.]*\s*/, '')
    .replace(/^[-–—:.\s]+/, '');
  return (/^[a-z]/.test(s) ? '…' : '') + (s.length > 360 ? s.slice(0, 360).replace(/\s\S*$/, '') + '…' : s);
}

export { bench, caseNumber, fixSpaces, LAWS, parseDate, parties, subjects, titleCase };

if (process.argv[1]?.endsWith('import-sc-judgments.mjs'))
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
