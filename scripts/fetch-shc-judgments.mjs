/**
 * Download Sindh High Court judgments from the Court's public case-law portal (caselaw.shc.gov.pk).
 *
 *   node scripts/fetch-shc-judgments.mjs <cache-dir>
 *
 * Reads the portal's public listings (latest case law and top judgments), saves what each listing says about a
 * judgment to <cache-dir>/listing.json, and downloads each judgment PDF once to <cache-dir>/pdf/<n>.pdf.
 * One request at a time with a pause between them; already-downloaded PDFs are skipped, so it can be re-run.
 * Then run scripts/import-shc-judgments.mjs <cache-dir> to build the Case Law files.
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://caselaw.shc.gov.pk/caselaw/';
const LISTINGS = ['public/home', 'public/top-trend-judgements'];
const UA = 'Mozilla/5.0 (compatible; WakeelPro-caselaw/1.0; +https://wakeelpropk.com)';
const PAUSE_MS = 500;
const WORKERS = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(PAUSE_MS * 4 * i);
    }
  }
}

/** doc ids are base64 of "<n>cfms-dc83" */
const numOf = (doc) => {
  try {
    return Buffer.from(decodeURIComponent(doc), 'base64').toString('latin1').match(/^(\d+)cfms/)?.[1] ?? '';
  } catch {
    return '';
  }
};

/** Everything between one judgment link and the next describes that judgment. */
export function parseListing(html) {
  const s = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  const re = /<a[^>]+href="(?:download-file\.php\?doc=|view-file\/)([A-Za-z0-9%=]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  const hits = [...s.matchAll(re)];
  const out = [];
  hits.forEach((m, i) => {
    const seg = s.slice(m.index + m[0].length, i + 1 < hits.length ? hits[i + 1].index : m.index + 6000);
    const field = (label) => {
      const f = seg.match(new RegExp(`${label}\\s*:-?\\s*<b>([\\s\\S]*?)</b>`, 'i'));
      return f ? decode(f[1]) : '';
    };
    const summary = decode(seg.match(/<div class="readmore">([\s\S]*?)<\/div>/)?.[1] || '') || field('Tag Line');
    const citation = field('Citation') || decode(seg.match(/^\s*<br \/>\s*<b>([^<]*SHC[^<]*)<\/b>/)?.[1] || '');
    const bench = decode(seg.match(/<span class=["']text-success["']>\s*(Hon[\s\S]*?)<\/span>/)?.[1] || '');
    const station = decode(seg.match(/fa-map-marker[^>]*><\/i>([^<]*)/)?.[1] || '');
    out.push({
      n: numOf(m[1]),
      doc: decodeURIComponent(m[1]),
      label: decode(m[2]).replace(/^\d+[.)]\s*/, ''),
      station,
      citation,
      topic: field('Topic'),
      matter: field('Matter'),
      summary,
      bench,
      disposal: field('Disposal Status'),
      orderDate: decode(seg.match(/Order Date:\s*([0-9A-Za-z-]+)/)?.[1] || ''),
      afr: /Approved for Reporting/i.test(seg),
    });
  });
  return out.filter((x) => x.n);
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: node scripts/fetch-shc-judgments.mjs <cache-dir>');
  fs.mkdirSync(path.join(dir, 'pdf'), { recursive: true });
  const byN = new Map();
  for (const l of LISTINGS) {
    const html = await (await get(BASE + l)).text();
    fs.writeFileSync(path.join(dir, `${l.replace(/\W+/g, '_')}.html`), html);
    for (const x of parseListing(html)) {
      const had = byN.get(x.n) || {};
      // keep whichever listing told us more about each field
      byN.set(x.n, Object.fromEntries(Object.keys(x).map((k) => [k, (typeof x[k] === 'string' ? (x[k].length >= (had[k]?.length ?? 0) ? x[k] : had[k]) : x[k] || had[k])])));
    }
    await sleep(PAUSE_MS);
  }
  const list = [...byN.values()];
  fs.writeFileSync(path.join(dir, 'listing.json'), JSON.stringify(list, null, 1));
  console.log(`listing: ${list.length} judgments`);
  let got = 0;
  let failed = 0;
  const todo = list.filter((x) => {
    const have = (ext) => {
      const file = path.join(dir, 'pdf', `${x.n}.${ext}`);
      return fs.existsSync(file) && fs.statSync(file).size > 1000;
    };
    return !have('pdf') && !have('html');
  });
  console.log(`to download: ${todo.length}`);
  let next = 0;
  // A few downloads at a time, each worker pausing between requests.
  const worker = async () => {
    while (next < todo.length) {
      const x = todo[next++];
      try {
        const r = await get(`${BASE}download-file.php?doc=${encodeURIComponent(x.doc)}&citation=`);
        const buf = Buffer.from(await r.arrayBuffer());
        // Older judgments are Word documents saved as HTML, served under a .pdf name.
        const head = buf.subarray(0, 400).toString('latin1');
        const ext = head.startsWith('%PDF-') ? 'pdf' : /<html/i.test(head) ? 'html' : '';
        if (!ext) throw new Error('not a PDF or Word page');
        fs.writeFileSync(path.join(dir, 'pdf', `${x.n}.${ext}`), buf);
        got++;
      } catch (e) {
        failed++;
        console.log(`skip ${x.n}: ${e.message}`);
      }
      if ((got + failed) % 100 === 0) console.log(`${got + failed}/${todo.length} (new ${got}, failed ${failed})`);
      await sleep(PAUSE_MS);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  console.log(`done: ${got} downloaded, ${failed} failed`);
}

if (process.argv[1]?.endsWith("fetch-shc-judgments.mjs")) main().catch((e) => {
  console.error(e);
  process.exit(1);
});
