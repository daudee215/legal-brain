import { addDays } from './dates';

export interface Remedy {
  id: string;
  label: string;
  days: number;
  basis: string;
}

/** Demo values — must be verified by an advocate before real use. */
export const REMEDIES: Remedy[] = [
  { id: 'appeal-dc-decree', label: 'Civil appeal from decree to District Court', days: 30, basis: 'Limitation Act 1908, Art. 152' },
  { id: 'appeal-hc-decree', label: 'Civil appeal from decree to High Court', days: 90, basis: 'Limitation Act 1908, Art. 156' },
  { id: 'civil-revision', label: 'Civil revision', days: 90, basis: 'S. 115 CPC 1908' },
  { id: 'crim-appeal-sessions', label: 'Criminal appeal to Court of Session', days: 30, basis: 'Limitation Act 1908, Art. 154' },
  { id: 'crim-appeal-hc', label: 'Criminal appeal to High Court against conviction', days: 60, basis: 'Limitation Act 1908, Art. 155' },
  { id: 'cpla-sc', label: 'Petition for leave to appeal to Supreme Court', days: 60, basis: 'Art. 185(3) Constitution / SC Rules 1980' },
];

export function limitationDeadline(orderDateKey: string, remedyId: string, copyDays = 0): { deadlineKey: string; daysTotal: number } {
  const r = REMEDIES.find((x) => x.id === remedyId);
  if (!r) throw new Error('Unknown remedy');
  const extra = Math.max(0, Math.floor(copyDays || 0));
  return { deadlineKey: addDays(orderDateKey, r.days + extra), daysTotal: r.days + extra };
}
