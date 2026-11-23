/**
 * Day files and the index under public/cause-lists/:
 *   <court>/<YYYY-MM-DD>.json = { court, date, fetchedAt, source, entries: [...] } or { …, lines: [...] }
 *   index.json                = { generatedAt, files: [{ court, date, count, fetchedAt, path }] }
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const DAY_FILE = /^[a-z][a-z0-9-]{1,20}\/\d{4}-\d{2}-\d{2}\.json$/;

export function readDay(file) {
  try {
    const j = JSON.parse(readFileSync(file, 'utf8'));
    if (!j || typeof j.court !== 'string' || typeof j.date !== 'string') return null;
    if (!Array.isArray(j.entries) && !Array.isArray(j.lines)) return null;
    return j;
  } catch {
    return null;
  }
}

export function writeDay(outDir, court, date, result, now = new Date()) {
  const dir = join(outDir, court);
  mkdirSync(dir, { recursive: true });
  const body = { court, date, fetchedAt: now.toISOString(), source: result.source };
  if (result.entries) body.entries = result.entries;
  else body.lines = result.lines;
  writeFileSync(join(dir, `${date}.json`), JSON.stringify(body));
  return body;
}

/** Copy day files from another fetch (e.g. the Pakistan runner's artifact); the newer fetchedAt wins. */
export function mergeFrom(srcDir, outDir) {
  if (!srcDir || !existsSync(srcDir)) return 0;
  let n = 0;
  for (const court of readdirSync(srcDir, { withFileTypes: true })) {
    if (!court.isDirectory()) continue;
    for (const f of readdirSync(join(srcDir, court.name))) {
      const rel = `${court.name}/${f}`;
      if (!DAY_FILE.test(rel)) continue;
      const incoming = readDay(join(srcDir, rel));
      if (!incoming) continue;
      const existing = readDay(join(outDir, rel));
      if (existing && existing.fetchedAt >= incoming.fetchedAt) continue;
      mkdirSync(join(outDir, court.name), { recursive: true });
      copyFileSync(join(srcDir, rel), join(outDir, rel));
      n++;
    }
  }
  return n;
}

/** Delete day files dated before `keepFrom` (YYYY-MM-DD) and rebuild index.json from what is left. */
export function pruneAndIndex(outDir, keepFrom, now = new Date()) {
  mkdirSync(outDir, { recursive: true });
  const files = [];
  for (const court of readdirSync(outDir, { withFileTypes: true })) {
    if (!court.isDirectory()) continue;
    for (const f of readdirSync(join(outDir, court.name))) {
      const rel = `${court.name}/${f}`;
      const path = join(outDir, rel);
      if (!DAY_FILE.test(rel)) continue;
      const date = f.slice(0, 10);
      const day = readDay(path);
      if (!day || date < keepFrom) {
        rmSync(path, { force: true });
        continue;
      }
      files.push({ court: court.name, date, count: (day.entries ?? day.lines).length, fetchedAt: day.fetchedAt, path: rel });
    }
  }
  files.sort((a, b) => a.court.localeCompare(b.court) || a.date.localeCompare(b.date));
  const index = { generatedAt: now.toISOString(), files };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 1));
  return index;
}
