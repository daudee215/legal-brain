#!/usr/bin/env node
/**
 * Bring back the cause lists the live site already publishes, so a fresh deploy keeps the last few days
 * without committing data to git:  node scripts/causelists/restore.mjs [--site https://wakeelpropk.com] [--out public/cause-lists]
 * A missing index (first deploy) or any failed file is ignored. Always exits 0.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { USER_AGENT, log } from './lib/common.mjs';
import { DAY_FILE } from './lib/output.mjs';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const site = (flag('--site', process.env.SITE_URL || 'https://wakeelpropk.com') || '').replace(/\/$/, '');
const out = flag('--out', 'public/cause-lists');

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function main() {
  let index;
  try {
    index = JSON.parse(await get(`${site}/cause-lists/index.json`));
  } catch (e) {
    log('restore', `no published index (${e.message}) — starting empty`);
    return;
  }
  let n = 0;
  for (const f of Array.isArray(index?.files) ? index.files : []) {
    if (typeof f?.path !== 'string' || !DAY_FILE.test(f.path)) continue;
    try {
      const body = await get(`${site}/cause-lists/${f.path}`);
      JSON.parse(body);
      const dest = join(out, f.path);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, body);
      n++;
    } catch (e) {
      log('restore', `${f.path}: ${e.message}`);
    }
  }
  log('restore', `${n} day file(s) restored from ${site}`);
}

main()
  .catch((e) => log('restore', `failed — ${e.message}`))
  .finally(() => process.exit(0));
