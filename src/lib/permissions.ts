import type { Role } from '../types';

export type Action =
  | 'cases.edit'
  | 'drafting'
  | 'assistant'
  | 'documents.upload'
  | 'diary.write'
  | 'chamber.manage'
  | 'billing'
  | 'library';

const ALL: Action[] = ['cases.edit', 'drafting', 'assistant', 'documents.upload', 'diary.write', 'chamber.manage', 'billing', 'library'];

const MATRIX: Record<Role, ReadonlySet<Action>> = {
  senior: new Set(ALL),
  junior: new Set(ALL.filter((a) => a !== 'chamber.manage' && a !== 'billing')),
  clerk: new Set<Action>(['documents.upload', 'diary.write']),
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role].has(action);
}

export const ROLE_LABEL: Record<Role, string> = { senior: 'Senior', junior: 'Junior', clerk: 'Clerk' };
