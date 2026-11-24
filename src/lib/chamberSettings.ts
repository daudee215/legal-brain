import type { Accent, ChamberSettings, Db, Role } from '../types';
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
export function applyChamberSettings(s: ChamberSettings | undefined) {
  setCustomAccess(s?.access);
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (s && s.accent !== 'bronze') el.dataset.accent = s.accent;
  else delete el.dataset.accent;
}

/** A short string that changes whenever what should be applied changes. */
export const settingsKey = (s: ChamberSettings | undefined) => JSON.stringify([s?.accent ?? 'bronze', s?.access ?? null]);

export function saveSettings(patch: Partial<Pick<ChamberSettings, 'accent' | 'access'>>) {
  updateDb((db) => {
    const cur = db.settings?.[0];
    const next: ChamberSettings = { id: 'main', accent: 'bronze', ...cur, ...patch, updatedOn: todayKey() };
    if (patch.access === undefined && 'access' in patch) delete next.access;
    db.settings = [next];
  });
}

export function setRoleAccess(role: Role, actions: Action[]) {
  const cur = settingsOf(getDb())?.access ?? {};
  saveSettings({ access: { ...cur, [role]: actions } });
}

export function resetAccess() {
  updateDb((db) => {
    const cur = db.settings?.[0];
    if (!cur) return;
    const { access: _drop, ...rest } = cur;
    void _drop;
    db.settings = [{ ...rest, updatedOn: todayKey() }];
  });
}

