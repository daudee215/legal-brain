import { describe, expect, it } from 'vitest';
import { pickPublicStatus } from '../../src/lib/cloud/statusLinks';
import { courtName, expiryLabel, isStatusToken, shareText, statusUrl } from '../../src/lib/statusLink';

const URDU = /[؀-ۿ]/;
const TOKEN = 'abcDEF0123456789_-abcDEF0123456789_-abcDEF0';

describe('statusUrl', () => {
  it('builds the public link', () => {
    expect(statusUrl(TOKEN, 'https://example.pk')).toBe(`https://example.pk/status/?t=${TOKEN}`);
    expect(statusUrl(TOKEN, 'https://example.pk/')).toBe(`https://example.pk/status/?t=${TOKEN}`);
  });
  it('recognises only 43-character url-safe tokens', () => {
    expect(TOKEN).toHaveLength(43);
    expect(isStatusToken(TOKEN)).toBe(true);
    expect(isStatusToken('short')).toBe(false);
    expect(isStatusToken(`${TOKEN.slice(0, 42)}=`)).toBe(false);
    expect(isStatusToken(null)).toBe(false);
  });
});

describe('shareText', () => {
  const p = { chamberName: 'Khan Law Chambers', caseTitle: 'Ali v. State', url: 'https://example.pk/status/?t=x', days: 30 };
  it('English first, then Urdu (in Urdu script), with the link and days', () => {
    const s = shareText(p, 'en');
    expect(s.startsWith('Assalam-o-Alaikum')).toBe(true);
    expect(s).toContain(p.url);
    expect(s).toContain('30 days');
    expect(s).toContain('Khan Law Chambers');
    const [en, ur] = s.split('\n\n');
    expect(en).not.toMatch(URDU);
    expect(ur).toMatch(URDU);
    expect(ur).toContain('30 دن');
  });
  it('Urdu first when the app is in Urdu, still with both languages and the link', () => {
    const s = shareText(p, 'ur');
    expect(s.startsWith('السلام علیکم')).toBe(true);
    expect(s).toContain('Assalam-o-Alaikum');
    expect(s).toContain(p.url);
  });
});

describe('expiryLabel', () => {
  const now = new Date('2026-11-24T06:00:00Z'); // 11:00 PKT
  it('counts days in Pakistan time', () => {
    expect(expiryLabel('2026-12-01T06:00:00Z', 'en', now)).toBe('Expires in 7 days');
    expect(expiryLabel('2026-11-25T06:00:00Z', 'en', now)).toBe('Expires tomorrow');
    expect(expiryLabel('2026-11-24T15:00:00Z', 'en', now)).toBe('Expires today');
    expect(expiryLabel('2026-11-24T05:00:00Z', 'en', now)).toBe('Expired');
  });
  it('has Urdu labels', () => {
    expect(expiryLabel('2026-12-01T06:00:00Z', 'ur', now)).toMatch(URDU);
    expect(expiryLabel('2026-12-01T06:00:00Z', 'ur', now)).toContain('7');
    expect(expiryLabel('2026-11-24T05:00:00Z', 'ur', now)).toMatch(URDU);
  });
});

describe('courtName / pickPublicStatus', () => {
  it('names shipped courts and never echoes unknown ids', () => {
    expect(courtName('lhc')).toBe('Lahore High Court');
    expect(courtName('<script>')).toBe('');
  });
  it('drops every field it does not know', () => {
    const s = pickPublicStatus({ chamberName: 'C', caseTitle: 'T', caseNo: 'N', courtId: 'lhc', stage: 'S', status: 'pending', nextHearing: null, phone: '0300', fees: 1, notes: ['x'] });
    expect(s && Object.keys(s).sort()).toEqual(['caseNo', 'caseTitle', 'chamberName', 'courtId', 'nextHearing', 'stage', 'status']);
    expect(pickPublicStatus(null)).toBeNull();
    expect(pickPublicStatus([1])).toBeNull();
    expect(pickPublicStatus({ status: 'hacked' })?.status).toBeNull();
  });
});

