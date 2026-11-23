/**
 * Sindh High Court — the court publishes cause lists advocate-wise only:
 *   https://cases.shc.gov.pk/{khi|suk|hyd|lar}/web/index.php?r=site/advocate-cause-list
 * The form picks the advocate from a lookup (GET ?r=advocate/search-advocate&q=… → { results: [{ id, text }] })
 * and a date (dd-Mon-yyyy, today to +2 days, no Sundays), then shows an HTML table.
 *
 * Privacy: the advocate identifier comes only from the SHC_ADVOCATE environment variable (a GitHub secret).
 * It is never logged, and the output file (shc/<date>.json) contains no advocate name, CNIC, ledger or cell
 * number: advocate columns are dropped and the advocate's own name/identifier is scrubbed from every string.
 *
 * Cloudflare sits in front of the site. If it answers with a challenge we stop — we never try to get past it.
 * robots.txt: checked 2026-11-23 — only Cloudflare "content signals" comments, no Disallow rules;
 * politeFetch() re-checks on every run.
 *
 * NOTE: the result table's layout could not be sampled without a real advocate identifier, so the parser maps
 * columns by their header text and falls back to plain lines. The test fixture is SYNTHETIC.
 */
import { CASE_NO_RE, log, looksLikeChallenge, politeFetch, squashSpaces } from '../lib/common.mjs';

const ORIGIN = 'https://cases.shc.gov.pk';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 2026-11-24 → 24-Nov-2026 */
export function shcDate(key) {
  const [y, m, d] = key.split('-');
  return `${d}-${MONTHS[Number(m) - 1]}-${y}`;
}

function cellsOf(rowHtml) {
  const out = [];
  const re = /<t([hd])\b[^>]*>([\s\S]*?)<\/t\1>/gi;
  for (let m = re.exec(rowHtml); m; m = re.exec(rowHtml)) out.push({ th: m[1].toLowerCase() === 'h', text: squashSpaces(m[2]) });
  return out;
}

const PRIVATE_COL = /advocate|counsel|lawyer|cnic|cell|mobile|phone|ledger|email/i;

/**
 * Rows of every table in the result page. Columns are recognised by header; advocate-related columns are dropped.
 * Returns structured entries when a case-number column is found, else plain lines that carry a case number.
 */
export function parseShcHtml(html, scrub = []) {
  const clean = (s) => {
    let t = s;
    for (const w of scrub) if (w && w.length >= 3) t = t.split(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join(' ');
    return squashSpaces(t);
  };
  const entries = [];
  const lines = [];
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) ?? [];
  for (const table of tables) {
    const rows = table.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
    let header = null;
    let courtRoom;
    let bench;
    for (const row of rows) {
      const cells = cellsOf(row);
      if (!cells.length) continue;
      if (cells.every((c) => c.th) || (!header && cells.some((c) => /case\s*no|sr\.?\s*#?|s\.\s*no/i.test(c.text)) && !cells.some((c) => CASE_NO_RE.test(c.text)))) {
        header = cells.map((c) => c.text.toLowerCase());
        continue;
      }
      const text = cells.map((c) => c.text).join(' ');
      if (!CASE_NO_RE.test(text)) {
        // A heading row such as "Court No. 5 — Before Mr. Justice …"
        const court = /\bcourt\s*(?:room\s*)?(?:no\.?)?\s*[:#-]?\s*(\d{1,3}[a-z]?)\b/i.exec(text);
        if (court) courtRoom = court[1].toUpperCase();
        const b = /\b(?:before|bench)\b\s*[:\-–]?\s*(.+)$/i.exec(text);
        if (b) bench = clean(b[1]);
        continue;
      }
      if (header) {
        const pick = (re) => {
          const i = header.findIndex((h) => re.test(h) && !PRIVATE_COL.test(h));
          return i >= 0 && cells[i] ? cells[i].text : undefined;
        };
        const caseNo = pick(/case\s*(no|number|#)|^case$/);
        if (caseNo && CASE_NO_RE.test(caseNo)) {
          const sr = pick(/^s(r|\.)?\s*\.?\s*(no|#)?\.?$|serial/);
          const room = pick(/court|room/);
          entries.push(
            Object.fromEntries(
              Object.entries({
                bench: clean(pick(/bench|judge|before/) ?? '') || bench,
                courtRoom: room ? (/\d+[a-z]?/i.exec(room)?.[0] ?? room).toUpperCase() : courtRoom,
                srNo: sr && /^\d+$/.test(sr) ? Number(sr) : undefined,
                caseNo: clean(caseNo),
                title: clean(pick(/part|title|versus|name of/) ?? '') || undefined,
                stage: clean(pick(/stage|purpose|nature/) ?? '') || undefined,
              }).filter(([, v]) => v !== undefined && v !== ''),
            ),
          );
          continue;
        }
      }
      const keep = cells.filter((_, i) => !(header?.[i] && PRIVATE_COL.test(header[i]))).map((c) => c.text);
      lines.push(clean(keep.join(' ')));
    }
  }
  return entries.length ? { entries } : lines.length ? { lines } : null;
}

export async function fetchShc(date, { advocate = process.env.SHC_ADVOCATE, seats = (process.env.SHC_SEATS || 'khi').split(',') } = {}) {
  if (!advocate) {
    log('shc', 'SHC_ADVOCATE is not set — skipping Sindh High Court');
    return null;
  }
  const all = { entries: [], lines: [] };
  for (const seat of seats.map((s) => s.trim()).filter((s) => /^(khi|suk|hyd|lar)$/.test(s))) {
    const base = `${ORIGIN}/${seat}/web/index.php`;
    const look = await politeFetch(`${base}?r=advocate%2Fsearch-advocate&q=${encodeURIComponent(advocate)}`, { timeoutMs: 30_000 }).catch((e) => e);
    if (look instanceof Error) {
      log('shc', `${seat}: advocate lookup failed (${look.message.replace(advocate, '…')})`);
      continue;
    }
    const lookText = await look.text();
    if (looksLikeChallenge(look, lookText)) {
      log('shc', `${seat}: bot challenge — skipping (not bypassing)`);
      return null;
    }
    let results = [];
    try {
      results = JSON.parse(lookText).results ?? [];
    } catch {
      log('shc', `${seat}: unexpected lookup answer`);
      continue;
    }
    if (results.length !== 1) {
      log('shc', `${seat}: ${results.length} advocates match SHC_ADVOCATE — use the CNIC or ledger number so exactly one matches`);
      continue;
    }
    const { id, text: name } = results[0];
    const url = `${base}?r=site%2Fadvocate-cause-list&Reports%5BADVOCATECODE%5D=${encodeURIComponent(id)}&Reports%5BCAUSELIST_DATE%5D=${shcDate(date)}`;
    const res = await politeFetch(url, { timeoutMs: 60_000 });
    const html = await res.text();
    if (looksLikeChallenge(res, html)) {
      log('shc', `${seat}: bot challenge — skipping (not bypassing)`);
      return null;
    }
    const scrub = [advocate, String(id), ...String(name ?? '').split(/[()\-,]/).map((s) => s.trim())];
    const parsed = parseShcHtml(html, scrub);
    if (parsed?.entries) all.entries.push(...parsed.entries);
    if (parsed?.lines) all.lines.push(...parsed.lines);
  }
  if (all.entries.length) return { source: `${ORIGIN}/khi/web/index.php?r=site/advocate-cause-list`, entries: all.entries };
  if (all.lines.length) return { source: `${ORIGIN}/khi/web/index.php?r=site/advocate-cause-list`, lines: all.lines };
  log('shc', `nothing listed for ${date}`);
  return null;
}
