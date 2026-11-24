import { describe, expect, it } from 'vitest';
import { backupSummaryText, lineText, NOUN } from '../../src/lib/activityText';
import { DICT } from '../../src/lib/i18n-dict';

const en = (key: string, vars?: Record<string, string | number>, fallback?: string) => {
  const e = (DICT as Record<string, { en: string }>)[key];
  let s = e ? e.en : (fallback ?? key);
  for (const [k, v] of Object.entries(vars ?? {})) s = s.split(`{${k}}`).join(String(v));
  return s;
};
const ur = (key: string, vars?: Record<string, string | number>, fallback?: string) => {
  const e = (DICT as Record<string, { ur: string }>)[key];
  let s = e ? e.ur : (fallback ?? key);
  for (const [k, v] of Object.entries(vars ?? {})) s = s.split(`{${k}}`).join(String(v));
  return s;
};

describe('activity sentences', () => {
  it('says who did what to which item', () => {
    expect(lineText({ k: 'cases', op: 'added', label: 'A v B' }, 'Bilal', en)).toBe('Bilal added case “A v B”');
    expect(lineText({ k: 'clients', op: 'removed', label: 'Sana' }, 'Bilal', en)).toBe('Bilal removed client “Sana”');
    expect(lineText({ k: 'diary', op: 'changed', label: 'Hearing note' }, '', en)).toBe('Someone changed diary note “Hearing note”');
  });
  it('handles settings, restores and overflow lines', () => {
    expect(lineText({ k: 'settings', op: 'changed', label: '' }, 'Arooj', en)).toBe('Arooj changed the chamber settings');
    expect(lineText({ k: '', op: 'restored', label: '2026-11-24 02:00' }, 'Arooj', en)).toBe('Arooj restored the chamber to 2026-11-24 02:00');
    expect(lineText({ k: '', op: 'more', label: '7' }, 'Arooj', en)).toBe('…and 7 more changes');
  });
  it('is written in Urdu script in Urdu, for every part of the data', () => {
    for (const k of Object.keys(NOUN)) for (const op of ['added', 'removed', 'changed'] as const) {
      if (k === 'settings') continue;
      expect(lineText({ k, op, label: 'x' }, 'Bilal', ur), `${k}.${op}`).toMatch(/[؀-ۿ]/);
    }
    expect(lineText({ k: 'settings', op: 'changed', label: '' }, 'Bilal', ur)).toMatch(/[؀-ۿ]/);
    expect(lineText({ k: '', op: 'restored', label: 'x' }, 'Bilal', ur)).toMatch(/[؀-ۿ]/);
  });
  it('summarises a restore point without empty parts', () => {
    expect(backupSummaryText({ cases: 12, clients: 4, diary: 0, settings: 1 }, en)).toBe('12 cases · 4 clients');
  });
});
