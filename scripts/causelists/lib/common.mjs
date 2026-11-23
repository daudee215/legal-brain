/**
 * Shared helpers for the cause-list fetcher: polite HTTP (one request at a time, descriptive User-Agent, timeouts,
 * robots.txt respected), Pakistan-time dates and small text utilities. No dependencies beyond Node 20+.
 */

/**
 * One cause-list row as published in public/cause-lists/<court>/<date>.json (mirrors ListEntry in src/lib/causeList.ts).
 * @typedef {{ bench?: string, courtRoom?: string, srNo?: number, caseNo: string, title?: string, stage?: string }} Entry
 */

export const USER_AGENT = 'LegalBrainCauseListBot/1.0 (+https://wakeelpropk.com)';

/** Log with a prefix so the CI log is easy to scan. Never pass secrets (e.g. SHC_ADVOCATE) to this. */
export function log(court, ...msg) {
  console.log(`[causelists:${court}]`, ...msg);
}

const robotsCache = new Map();

/**
 * Minimal robots.txt check: rules in the group for our bot name, else the `*` group; longest Allow/Disallow prefix wins.
 * A missing, unreachable or non-text robots.txt (some court sites answer with an HTML page) means "no rules".
 */
export function robotsAllows(robotsTxt, path, agent = 'LegalBrainCauseListBot') {
  if (!robotsTxt) return true;
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent || !cur) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === 'allow' || key === 'disallow') cur.rules.push({ allow: key === 'allow', path: val });
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && agent.toLowerCase().includes(a)));
  const chosen = mine.length ? mine : groups.filter((g) => g.agents.includes('*'));
  let best = null;
  for (const g of chosen) {
    for (const r of g.rules) {
      if (!r.path) continue; // "Disallow:" with no path allows everything
      const prefix = r.path.replace(/\*.*$/, '').replace(/\$$/, '');
      if (path.startsWith(prefix) && (!best || prefix.length > best.len || (prefix.length === best.len && r.allow))) {
        best = { len: prefix.length, allow: r.allow };
      }
    }
  }
  return best ? best.allow : true;
}

async function robotsFor(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  let txt = null;
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) });
    const body = res.ok ? await res.text() : '';
    // Only a real robots file counts; an HTML page or redirect stub is "no robots.txt".
    if (res.ok && !/^\s*</.test(body) && /user-agent/i.test(body)) txt = body;
  } catch {
    txt = null;
  }
  robotsCache.set(origin, txt);
  return txt;
}

/** fetch() with our User-Agent, a timeout, and a robots.txt check. Throws on HTTP errors. */
export async function politeFetch(url, { method = 'GET', headers = {}, body, timeoutMs = 60_000 } = {}) {
  const u = new URL(url);
  const robots = await robotsFor(u.origin);
  if (!robotsAllows(robots, u.pathname + u.search)) throw new Error(`robots.txt disallows ${u.pathname}`);
  const res = await fetch(url, {
    method,
    headers: { 'User-Agent': USER_AGENT, ...headers },
    body,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${u.origin}${u.pathname}`);
  return res;
}

/** True when a response is a bot-protection challenge page (we never try to get past one). */
export function looksLikeChallenge(res, text) {
  if (res.status === 403 || res.status === 503) return true;
  if (res.headers.get('cf-mitigated') === 'challenge') return true;
  return /cf-challenge|challenge-platform|Just a moment\.\.\.|Attention Required! \| Cloudflare|cf_chl_/i.test(text ?? '');
}

/* ------------------------------ dates (Pakistan Standard Time, UTC+5, no DST) ------------------------------ */

const PKT_MS = 5 * 60 * 60 * 1000;

/** Today's date in Pakistan as YYYY-MM-DD. */
export function pktToday(now = new Date()) {
  return new Date(now.getTime() + PKT_MS).toISOString().slice(0, 10);
}

export function addDays(key, n) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(key) {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

/** High courts sit Monday to Friday. */
export function isCourtDay(key) {
  const w = weekdayOf(key);
  return w >= 1 && w <= 5;
}

export function nextCourtDay(key) {
  let k = addDays(key, 1);
  while (!isCourtDay(k)) k = addDays(k, 1);
  return k;
}

/** The days worth fetching now: today (if the courts sit today) and the next court day. */
export function targetDays(now = new Date()) {
  const t = pktToday(now);
  const days = [];
  if (isCourtDay(t)) days.push(t);
  days.push(nextCourtDay(t));
  return days;
}

/* ------------------------------ text ------------------------------ */

export function squashSpaces(s) {
  return String(s ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A case number somewhere in the text: "123/2026", "123-P/2026", "123 of 2026". */
export const CASE_NO_RE = /\b\d{1,6}(?:\s*-\s*[A-Za-z]{1,2})?\s*(?:\/|\bof\b)\s*(?:19|20)\d{2}\b/i;

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
