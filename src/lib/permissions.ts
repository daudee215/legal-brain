import type { Role } from '../types';

export type Action =
  | 'cases.edit'
  | 'drafting'
  | 'assistant'
  | 'documents.upload'
  | 'diary.write'
  | 'chamber.manage'
  | 'billing'
  | 'library'
  | 'precedents'
  | 'team.view'
  | 'studio';

export const ALL_ACTIONS: Action[] = [
  'cases.edit',
  'drafting',
  'assistant',
  'documents.upload',
  'diary.write',
  'chamber.manage',
  'billing',
  'library',
  'precedents',
  'team.view',
  'studio',
];

/** Things only the senior advocate can ever hold: nobody can lock the senior out of running the chamber. */
export const SENIOR_ONLY: Action[] = ['chamber.manage', 'studio'];

export const DEFAULT_ACCESS: Record<Role, Action[]> = {
  senior: ALL_ACTIONS,
  junior: ALL_ACTIONS.filter((a) => a !== 'chamber.manage' && a !== 'billing' && a !== 'studio'),
  clerk: ['documents.upload', 'diary.write'],
};

/** The senior advocate's own changes to what each role may do (saved with the chamber, applied on every device). */
let custom: Partial<Record<Role, Action[]>> | null = null;
/** The senior's rights for the person using this device, when they have set some just for them. */
let mine: Action[] | null = null;

export function setCustomAccess(map: Partial<Record<Role, Action[]>> | null | undefined, personal?: Action[] | null) {
  custom = map && Object.keys(map).length ? map : null;
  mine = Array.isArray(personal) ? personal : null;
}

/** What a role may do given a set of customisations (the senior's saved settings), else the defaults. */
export function accessOf(role: Role, customised?: Partial<Record<Role, Action[]>> | null, personal?: Action[] | null): ReadonlySet<Action> {
  if (role === 'senior') return new Set(ALL_ACTIONS);
  const base = (Array.isArray(personal) ? personal : null) ?? customised?.[role] ?? DEFAULT_ACCESS[role];
  return new Set(base.filter((a) => !SENIOR_ONLY.includes(a)));
}

/** What a role may do right now on this device. */
export function accessFor(role: Role): ReadonlySet<Action> {
  return accessOf(role, custom, mine);
}

export function can(role: Role, action: Action): boolean {
  return accessFor(role).has(action);
}

export const ROLE_LABEL: Record<Role, string> = { senior: 'Senior', junior: 'Junior', clerk: 'Clerk' };

/** Plain-language names for the rights a senior can grant, used by the Chamber and Studio pages. */
export const ACTION_LABEL: Record<Action, { title: string; hint: string }> = {
  'cases.edit': { title: 'Add and edit cases', hint: 'Create matters, change dates and status' },
  drafting: { title: 'Legal drafting and paper books', hint: 'Petitions, applications, merged bundles' },
  assistant: { title: 'AI assistant', hint: 'Ask questions with citations' },
  'documents.upload': { title: 'Upload documents', hint: 'Add pleadings, orders and evidence' },
  'diary.write': { title: 'Write in the diary', hint: 'Hearing notes and client reminders' },
  billing: { title: 'See fees and billing', hint: 'Fee ledgers, expenses, receipts' },
  library: { title: 'Law books shelf', hint: 'Use the private law-book library' },
  precedents: { title: 'Precedent bank', hint: 'Saved citations and principles' },
  'team.view': { title: 'See the chamber team page', hint: 'Who is in the chamber and their roles' },
  'chamber.manage': { title: 'Invite and manage members', hint: 'Senior only, cannot be granted' },
  studio: { title: 'Chamber Studio', hint: 'Senior only, cannot be granted' },
};
