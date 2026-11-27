import fs from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pdfText } from './import-shc-judgments.mjs';
import { bench, caseNumber, LAWS, openingSummary, parseDate, parties, splitJudgment, subjects, titleCase } from './import-sc-judgments.mjs';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const decisionDate = /(?:date(?:s)?\s+of\s+(?:decision|judg[em]+nt|announcement|order|hearing\s*(?:and|&)\s*decision)|(?:decided|announced)\s+on|judg[em]+nt\s+announced(?:\s+on)?)\s*[:.\-–—]*\s*([^\n]{1,45}|\n[^\n]{1,45})/gi;

function validDate(label = '') {
  const expanded = label.trim().replace(/^(\d{1,2})[- ]([a-z]{3})[- ,]+(\d{4})$/i, (input, day, month, year) => {
    const full = months.find((name) => name.slice(0, 3).toLowerCase() === month.toLowerCase());
    return full ? `${day} ${full} ${year}` : input;
  });
  const date = parseDate(expanded);
  if (!date || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return '';
  return date;
}

function judgesOf(label = '') {
  return [...label.matchAll(/\b(?:Chief\s+)?Justice\s+(.+?)(?=\s*(?:[,;&]|$)|\s+(?:(?:Hon(?:ourable|['’]?ble)|Mr\.|Mrs\.|Ms\.|Miss)\s+)*Justice\b)/gi)]
    .map((match) => match[1].replace(/^(?:(?:Mr\.|Mrs\.|Ms\.|Miss|\(R\))\s+)*/i, '').replace(/\s+\(.*$/, '').replace(/[.@]+$/, '').trim())
    .filter((name) => name.length >= 4 && name.length <= 65 && !/\bHigh Court\b/i.test(name))
    .map((name) => `Justice ${name === name.toUpperCase() ? titleCase(name) : name}`);
}

function captionOf(label = '') {
  const clean = label.replace(/\s*[-–—]*\s+(?:versus|v\/?s\.?|v\.)\s*[-–—]*\s+/i, ' v. ').trim();
  return clean === clean.toUpperCase() ? titleCase(clean) : clean;
}

function readable(text) {
  return text.length > 300
    && (text.match(/\p{L}/gu)?.length ?? 0) / text.length > 0.4
    && (text.match(/[\uFFFD\uE000-\uF8FF]/g)?.length ?? 0) / text.length < 0.015;
}

export async function importJudgments(court, dir = path.join('.cache', court)) {
  const out = path.join('public', 'caselaw', court);
  const listing = JSON.parse(await fs.readFile(path.join(dir, 'listing.json'), 'utf8'));
  await fs.mkdir(out, { recursive: true });
  const index = [];
  let unavailable = 0;
  let unreadable = 0;
  for (const row of listing) {
    if (typeof row.n !== 'string' || !/^\d+$/.test(row.n)) throw new Error('Invalid judgment id');
    const input = path.join(dir, 'pdf', `${row.n}.pdf`);
    let lines;
    try {
      lines = await pdfText(input, getDocument);
    } catch (error) {
      if (error.code === 'ENOENT') unavailable++;
      else {
        unreadable++;
        if (process.env.DEBUG) console.warn(`${court}-${row.n}: ${error.message}`);
      }
      continue;
    }
    const text = lines.join('\n');
    if (!readable(text)) {
      unreadable++;
      continue;
    }

    const { header, body } = splitJudgment(lines);
    const front = lines.slice(0, 55);
    const frontText = front.join('\n');
    const date = validDate(row.date)
      || [...frontText.matchAll(decisionDate)].map((match) => validDate(match[1])).find(Boolean);
    const year = row.citation?.match(/^(19[4-9]\d|20[0-2]\d)\b/)?.[1];
    const knownYear = year && Number(year) >= 1947 && Number(year) <= 2026 ? year : '';
    const caseNo = row.caseNo || caseNumber(front);
    const caption = captionOf(row.title);
    const title = / v\. /i.test(caption) ? caption : parties(front) || caption || caseNo || 'Judgment';
    const author = front.map((line) => line.replace(/^[*(\s]+/, '')
      .match(/^([\p{L}][\p{L} .’'-]{3,59})[,.]\s*(?:H?CJ|ACJ|J)[.,\s]*[-–—‐‑:]/u)?.[1]).find(Boolean);
    const signed = lines.slice(-14).filter((line) => /\bHon(?:ourable|['’]?ble)\b.*\bJustice\b/i.test(line));
    const names = [
      ...judgesOf(row.bench), ...bench(front), ...front.slice(0, 16).flatMap((line) => judgesOf(line)),
      ...signed.flatMap((line) => judgesOf(line)), ...judgesOf(author ? `Justice ${author}` : ''),
    ];
    const judges = [...new Map(names.map((name) => [name.toLowerCase(), name])).values()];
    const seat = row.seat || front.slice(0, 12).join(' ')
      .match(/\b(Abbottabad|Mingora|Swat|Bannu|Dera Ismail Khan|Rawalpindi|Multan|Bahawalpur)\s+(?:Circuit\s+)?Bench\b/i)?.[1];
    const laws = LAWS.filter(([, , pattern]) => pattern.test(text));
    const tags = [...new Set([row.topic, ...subjects(caseNo, text), ...laws.map(([, label]) => label)].filter(Boolean))].slice(0, 8);
    const courtSummary = row.summary?.length > 30 ? row.summary : '';
    const summary = courtSummary.length > 360 ? courtSummary.slice(0, 360).replace(/\s\S*$/, '') + '…' : courtSummary;
    const id = `${court}-${row.n}`;
    index.push({
      id, courtId: court, title, caseNo, date: date || (knownYear ? `${knownYear}-01-01` : ''), dateKnown: !!date,
      judges, summary: summary || openingSummary(body), courtSummary: !!courtSummary, tags,
      statutesCited: [...new Set(laws.map(([law]) => law).filter(Boolean))], words: text.split(/\s+/).length,
      source: row.source || row.pdf, file: decodeURIComponent(new URL(row.pdf).pathname.split('/').at(-1)),
      citation: row.citation || '', seat: seat ? titleCase(seat) : '', outcome: '', reported: !!row.reported, hasText: true,
    });
    await fs.writeFile(path.join(out, `${id}.json`), JSON.stringify({ id, header, body }));
  }
  if (!index.length) throw new Error(`${court}: no readable judgments; existing index kept`);
  index.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const next = path.join(out, 'index.json.tmp');
  await fs.writeFile(next, JSON.stringify(index));
  await fs.rename(next, path.join(out, 'index.json'));
  const missing = (predicate) => index.filter(predicate).length;
  console.log(`${court}: imported ${index.length}, unavailable ${unavailable}, unreadable ${unreadable}; missing date ${missing((row) => !row.dateKnown)}, bench ${missing((row) => !row.judges.length)}, parties ${missing((row) => !/ v\. /i.test(row.title))}`);
}
