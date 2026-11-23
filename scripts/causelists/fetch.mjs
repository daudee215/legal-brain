#!/usr/bin/env node
/**
 * Fetch published cause lists into public/cause-lists/ (see lib/output.mjs for the file format).
 *
 *   node scripts/causelists/fetch.mjs                       # courts reachable from anywhere, today + next court day
 *   node scripts/causelists/fetch.mjs --courts ihc,phc --dates 2026-11-24
 *   PK_NETWORK=1 node scripts/causelists/fetch.mjs --pk --out pk-out   # Pakistan-only courts (self-hosted runner)
 *   node scripts/causelists/fetch.mjs --merge-from .pk-causelists      # also take files fetched by the PK runner
 *
 * Courts are fetched one at a time with a pause between requests. Every adapter fails soft: an error is logged,
 * nothing is written for that court/day and the others carry on. The process always exits 0 so it can never
 * break the deploy. Day files older than KEEP_DAYS are pruned and index.json is rebuilt at the end.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, log, pktToday, sleep, targetDays } from './lib/common.mjs';
import { mergeFrom, pruneAndIndex, writeDay } from './lib/output.mjs';
import { fetchIhc } from './adapters/ihc.mjs';
import { fetchPhc } from './adapters/phc.mjs';
import { fetchShc } from './adapters/shc.mjs';
import { fetchLhc, fetchPunjab } from './adapters/pakistan-only.mjs';

const KEEP_DAYS = 5;

/** File court ids are the app's court ids (src/data/seed.ts). */
export const COURTS = [
  { id: 'ihc', fetch: (d) => fetchIhc(d, 'ihc') },
  { id: 'ict-east', fetch: (d) => fetchIhc(d, 'ict-east') },
  { id: 'ict-west', fetch: (d) => fetchIhc(d, 'ict-west') },
  { id: 'phc', fetch: (d) => fetchPhc(d) },
  { id: 'shc', fetch: (d) => fetchShc(d) },
  { id: 'lhc', pk: true, fetch: (d) => fetchLhc(d) },
  { id: 'cjl', pk: true, fetch: (d) => fetchPunjab(d) },
];

function args(argv) {
  const out = { courts: null, dates: null, out: 'public/cause-lists', pk: false, mergeFrom: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--courts') out.courts = argv[++i].split(',').map((s) => s.trim());
    else if (a === '--dates') out.dates = argv[++i].split(',').map((s) => s.trim());
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--pk') out.pk = true;
    else if (a === '--merge-from') out.mergeFrom = argv[++i];
  }
  return out;
}

export async function run(argv = process.argv.slice(2)) {
  const opt = args(argv);
  const days = opt.dates ?? targetDays();
  const pkNet = process.env.PK_NETWORK === '1';
  const chosen = COURTS.filter((c) => (opt.courts ? opt.courts.includes(c.id) : opt.pk ? c.pk : !c.pk));
  const summary = [];

  if (opt.mergeFrom) {
    try {
      const n = mergeFrom(opt.mergeFrom, opt.out);
      log('merge', `${n} file(s) taken from ${opt.mergeFrom}`);
    } catch (e) {
      log('merge', `skipped: ${e.message}`);
    }
  }

  for (const court of chosen) {
    if (court.pk && !pkNet) {
      log(court.id, 'skipped: only reachable from Pakistan (set PK_NETWORK=1 on the Pakistan runner)');
      continue;
    }
    for (const date of days) {
      try {
        const result = await court.fetch(date);
        if (result) {
          const body = writeDay(opt.out, court.id, date, result);
          const n = (body.entries ?? body.lines).length;
          log(court.id, `${date}: ${n} ${body.entries ? 'entries' : 'lines'}`);
          summary.push({ court: court.id, date, count: n });
        }
      } catch (e) {
        log(court.id, `${date}: failed — ${e?.message ?? e}`);
      }
      await sleep(1500);
    }
  }

  try {
    const index = pruneAndIndex(opt.out, addDays(pktToday(), -(KEEP_DAYS - 1)));
    log('index', `${index.files.length} day file(s) published`);
  } catch (e) {
    log('index', `failed — ${e.message}`);
  }
  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  run()
    .catch((e) => console.error('[causelists] unexpected error', e))
    .finally(() => process.exit(0));
}
