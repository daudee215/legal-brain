import type { Accent, ChamberProfile, ChamberSettings, Db, Role } from '../types';
import { todayKey } from './dates';
import { setCustomAccess, type Action } from './permissions';
import { getDb, updateDb } from './store';

export const ACCENTS: { id: Accent; label: string; note: string; light: string; dark: string }[] = [
  { id: 'bronze', label: 'Bronze', note: 'Warm brown and cream, the classic look', light: '#8c5e34', dark: '#d29a62' },
  { id: 'emerald', label: 'Emerald', note: 'Deep green, calm and traditional', light: '#2f6b4f', dark: '#6fbf94' },
  { id: 'navy', label: 'Navy', note: 'Courtroom blue, crisp and formal', light: '#2f4f86', dark: '#7ea2e0' },
  { id: 'burgundy', label: 'Burgundy', note: 'Rich wine red, bold and elegant', light: '#8a2f3c', dark: '#e0848f' },
  { id: 'teal', label: 'Teal', note: 'Cool blue-green, modern and fresh', light: '#1f6f78', dark: '#5fc0c9' },
];

export const settingsOf = (db: Pick<Db, 'settings'>): ChamberSettings | undefined => db.settings?.[0];

/** Put the chamber's colour scheme and access rights into effect on this device. */
export function applyChamberSettings(s: ChamberSettings | undefined, myId?: string) {
  setCustomAccess(s?.access, myId ? s?.memberAccess?.[myId] : null);
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (s && s.accent !== 'bronze') el.dataset.accent = s.accent;
  else delete el.dataset.accent;
}

/** A short string that changes whenever what should be applied changes. */
export const settingsKey = (s: ChamberSettings | undefined, myId?: string) => JSON.stringify([s?.accent ?? 'bronze', s?.access ?? null, myId ? (s?.memberAccess?.[myId] ?? null) : null, myId ?? null]);

export function saveSettings(patch: Partial<Pick<ChamberSettings, 'accent' | 'access' | 'memberAccess' | 'profile' | 'emailReminders'>>) {
  updateDb((db) => {
    const cur = db.settings?.[0];
    const next: ChamberSettings = { id: 'main', accent: 'bronze', ...cur, ...patch, updatedOn: todayKey() };
    if (patch.access === undefined && 'access' in patch) delete next.access;
    if (patch.memberAccess === undefined && 'memberAccess' in patch) delete next.memberAccess;
    db.settings = [next];
  });
}

export function setRoleAccess(role: Role, actions: Action[]) {
  const cur = settingsOf(getDb())?.access ?? {};
  saveSettings({ access: { ...cur, [role]: actions } });
}

export const setEmailReminders = (on: boolean) => saveSettings({ emailReminders: on });

/** Give one person their own rights (or, with null, put them back on their role's rights). */
export function setMemberAccess(memberId: string, actions: Action[] | null) {
  const cur = { ...(settingsOf(getDb())?.memberAccess ?? {}) };
  if (actions) cur[memberId] = actions;
  else delete cur[memberId];
  saveSettings({ memberAccess: Object.keys(cur).length ? cur : undefined });
}

export function resetAccess() {
  updateDb((db) => {
    const cur = db.settings?.[0];
    if (!cur) return;
    const { access: _drop, memberAccess: _drop2, ...rest } = cur;
    void _drop;
    void _drop2;
    db.settings = [{ ...rest, updatedOn: todayKey() }];
  });
}


const clean = (s?: string) => (s ?? '').replace(/s+/g, ' ').trim();

/** Save the letterhead details (blank fields are dropped). */
export function saveProfile(p: ChamberProfile) {
  const out: ChamberProfile = {};
  for (const k of ['tagline', 'address', 'phone', 'email'] as const) if (clean(p[k])) out[k] = clean(p[k]);
  const logo = settingsOf(getDb())?.profile?.logo;
  if (logo) out.logo = logo;
  saveSettings({ profile: out });
}

/** Shrink a chosen image to a small PNG so it stays light inside the shared chamber data. */
export async function logoFromFile(file: File, maxSide = 240): Promise<string> {
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) throw new Error('Choose a PNG or JPEG picture.');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

export function setLogo(dataUrl: string | null) {
  const cur = { ...(settingsOf(getDb())?.profile ?? {}) };
  if (dataUrl) cur.logo = dataUrl;
  else delete cur.logo;
  saveSettings({ profile: cur });
}

/** What the PDF headers print under the chamber name. */
export function letterheadOf(db: Pick<Db, 'settings'>): { tagline: string; contact: string; logo?: string } {
  const p = settingsOf(db)?.profile ?? {};
  return { tagline: p.tagline || 'Advocates & Legal Consultants', contact: [p.address, p.phone, p.email].filter(Boolean).join('  |  '), ...(p.logo ? { logo: p.logo } : {}) };
}
