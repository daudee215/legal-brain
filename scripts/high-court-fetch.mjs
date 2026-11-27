import fs from 'node:fs/promises';
import path from 'node:path';
import { looksLikeChallenge, politeFetch, sleep } from './causelists/lib/common.mjs';

const pause = 750;
const headers = { 'User-Agent': 'WakeelProCaselaw/1.0 (+https://wakeelpropk.com)' };

export function textOf(html) {
  const entities = { amp: '&', apos: "'", quot: '"', nbsp: ' ', lt: '<', gt: '>', ndash: '–', mdash: '—', rsquo: '’' };
  return html.replace(/<[^>]+>/g, ' ').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (!code.startsWith('#')) return entities[code.toLowerCase()] ?? entity;
    const value = code[1].toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1));
    return value <= 0x10ffff ? String.fromCodePoint(value) : entity;
  }).replace(/\s+/g, ' ').trim();
}

export function hrefOf(html) {
  const link = html.match(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  return (link?.[1] ?? link?.[2] ?? link?.[3] ?? '').replace(/&amp;/gi, '&');
}

export function rowsOf(html) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) => row[1]);
}

export async function officialResponse(url, options = {}, read = (response) => response.text()) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await politeFetch(url, { timeoutMs: 35_000, ...options, headers: { ...headers, ...options.headers } });
      return await read(response);
    } catch (error) {
      const retryableHttp = /^HTTP (429|500|502|504)\b/.test(error.message);
      if (attempt === 3 || (/^(HTTP|robots\.txt)\b/.test(error.message) && !retryableHttp)) throw error;
      await sleep(attempt * 3_000);
    }
  }
}

export async function listingText(url, options) {
  const html = await officialResponse(url, options, async (response) => {
    const body = await response.text();
    if (looksLikeChallenge(response, body)) throw new Error('HTTP challenge on the official listing');
    return body;
  });
  await sleep(pause);
  return html;
}

export function yearRange(first, last) {
  return Array.from({ length: last - first + 1 }, (_, offset) => last - offset);
}

async function atomicWrite(file, content) {
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, content);
  await fs.rename(temporary, file);
}

export async function fetchJudgments(court, discover, argv = process.argv.slice(2)) {
  const dir = argv[0] && !argv[0].startsWith('--') ? argv.shift() : path.join('.cache', court);
  const selection = argv.find((arg) => arg.startsWith('--years='))?.slice(8);
  const years = selection?.split(',').map(Number);
  const rawLimit = argv.find((arg) => arg.startsWith('--limit='))?.slice(8);
  const limit = rawLimit === undefined ? Infinity : Number(rawLimit);
  if (years?.some((year) => !Number.isInteger(year) || year < 1947 || year > 2026)
    || (rawLimit !== undefined && (!Number.isSafeInteger(limit) || limit < 1))) {
    throw new Error('Use --years=2026,2025 and a positive --limit if needed');
  }

  const pdfDir = path.join(dir, 'pdf');
  await fs.mkdir(pdfDir, { recursive: true });
  const listingFile = path.join(dir, 'listing.json');
  let existing = [];
  try {
    existing = JSON.parse(await fs.readFile(listingFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const fresh = await discover(years);
  if (!fresh.length) throw new Error(`${court}: no judgments in the public listing`);
  const discovered = new Map(fresh.map((row) => [row.n, row]));
  const byId = new Map([...existing.map((row) => [row.n, row]), ...discovered]);
  const rows = [...byId.values()];
  await atomicWrite(listingFile, JSON.stringify(rows, null, 1));

  const cached = new Set(await fs.readdir(pdfDir));
  const candidates = years ? [...discovered.values()] : rows;
  const pending = candidates.filter((row) => !cached.has(`${row.n}.pdf`)).slice(0, limit);
  console.log(`${court}: ${rows.length} listed, ${pending.length} to download`);
  let next = 0;
  let done = 0;
  let failed = 0;
  const worker = async () => {
    while (next < pending.length) {
      const row = pending[next++];
      try {
        const pdf = await officialResponse(row.pdf, {}, async (response) => {
          if (new URL(response.url).origin !== new URL(row.pdf).origin) throw new Error('PDF redirected to a different origin');
          return Buffer.from(await response.arrayBuffer());
        });
        if (!pdf.subarray(0, 1024).includes('%PDF-')) throw new Error('response is not a PDF');
        await atomicWrite(path.join(pdfDir, `${row.n}.pdf`), pdf);
        done++;
      } catch (error) {
        failed++;
        console.warn(`${court}-${row.n}: ${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}`);
      }
      if ((done + failed) % 100 === 0) console.log(`${court}: ${done + failed}/${pending.length} checked`);
      await sleep(pause);
    }
  };
  await Promise.all([worker(), worker()]);
  console.log(`${court}: ${done} downloaded, ${failed} failed`);
  if (failed) process.exitCode = 1;
}
