import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { seed } from '../../src/data/seed';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

describe('architecture', () => {
  it('pages and components read data only through src/lib/repo.ts (seed allowed only for generateStaticParams)', () => {
    const offenders = [...walk('src/app'), ...walk('src/components')].filter((f) => {
      const src = readFileSync(f, 'utf8');
      if (!/from ['"][./]*\/?data\/seed['"]/.test(src)) return false;
      // a route file may use seed only to list ids for generateStaticParams
      const uses = src.match(/\bseed\.[a-zA-Z]+/g) ?? [];
      const onlyParams = /generateStaticParams/.test(src) && uses.length === 1;
      return !onlyParams;
    });
    expect(offenders).toEqual([]);
  });

  it('demo data names no real judges — benches are anonymised', () => {
    for (const c of seed.cases) expect(c.judge).not.toMatch(/Justice\s+[A-Z][a-z]+/);
  });
});
