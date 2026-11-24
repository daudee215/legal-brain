import { describe, expect, it } from 'vitest';
import { dataChangeProblem, isOutcomeOnly, undoForbidden } from '../../src/lib/roleGuard';

const hearing = (date: string) => ({ date, proceedings: 'Adjourned' });
const kase = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: `Case ${id}`, status: 'pending', stage: 'Evidence', hearings: [hearing('2026-01-01')], clientId: 'c1', ...extra });
const saved = () => ({
  cases: [kase('A'), kase('B')],
  clients: [{ id: 'c1', name: 'Client' }],
  diary: [],
  docs: [],
  tasks: [],
  precedents: [],
  books: [],
  notifications: [],
  deadlines: [],
  causeList: [],
  settings: [] as unknown[],
});

/** Every row here must also hold for supabase/role-guard.sql `data_change_problem`. */
describe('who may change what', () => {
  it('a senior may change anything', () => {
    expect(dataChangeProblem('senior', saved(), { ...saved(), cases: [], settings: [{ id: 'main' }] })).toBeNull();
  });

  it('a clerk may write diary, documents, tasks and reminders', () => {
    const next = { ...saved(), diary: [{ id: 'd' }], docs: [{ id: 'f' }], tasks: [{ id: 't' }], notifications: [{ id: 'n' }] };
    expect(dataChangeProblem('clerk', saved(), next)).toBeNull();
  });

  it('a clerk may not add, delete or rewrite cases', () => {
    expect(dataChangeProblem('clerk', saved(), { ...saved(), cases: [...saved().cases, kase('C')] })).toBe('cases');
    expect(dataChangeProblem('clerk', saved(), { ...saved(), cases: [kase('A')] })).toBe('cases');
    expect(dataChangeProblem('clerk', saved(), { ...saved(), cases: [kase('A', { title: 'Hacked' }), kase('B')] })).toBe('cases');
  });

  it('a clerk may record what happened at a hearing', () => {
    const next = {
      ...saved(),
      cases: [kase('A', { hearings: [hearing('2026-01-01'), hearing('2026-02-01')], status: 'adjourned', nextHearing: '2026-03-01' }), kase('B')],
      diary: [{ id: 'd' }],
    };
    expect(dataChangeProblem('clerk', saved(), next)).toBeNull();
  });

  it('but not erase or change the hearing history', () => {
    const rewritten = { ...saved(), cases: [kase('A', { hearings: [hearing('2026-09-09')] }), kase('B')] };
    expect(dataChangeProblem('clerk', saved(), rewritten)).toBe('cases');
    expect(dataChangeProblem('clerk', saved(), { ...saved(), cases: [kase('A', { hearings: [] }), kase('B')] })).toBe('cases');
  });

  it('a clerk may not touch clients, precedents, books, deadlines or the cause list', () => {
    for (const k of ['clients', 'precedents', 'books', 'deadlines', 'causeList']) {
      expect(dataChangeProblem('clerk', saved(), { ...saved(), [k]: [{ id: 'x' }] })).toBe(k);
    }
  });

  it('nobody but the senior may change the settings (including access rights)', () => {
    expect(dataChangeProblem('junior', saved(), { ...saved(), settings: [{ id: 'main', accent: 'navy' }] })).toBe('settings');
    expect(dataChangeProblem('clerk', saved(), { ...saved(), settings: [{ id: 'main' }] })).toBe('settings');
  });

  it('a junior may edit cases, clients and precedents by default', () => {
    const next = { ...saved(), cases: [kase('A'), kase('B'), kase('C')], clients: [{ id: 'c2' }], precedents: [{ id: 'p' }] };
    expect(dataChangeProblem('junior', saved(), next)).toBeNull();
  });

  it('unknown parts of the data are senior-only', () => {
    expect(dataChangeProblem('junior', saved(), { ...saved(), mystery: [{ id: 'x' }] })).toBe('mystery');
  });

  it('follows the senior\u2019s saved access rights, not defaults', () => {
    const withGrant = { ...saved(), settings: [{ id: 'main', accent: 'bronze', access: { clerk: ['documents.upload', 'diary.write', 'cases.edit'] } }] };
    expect(dataChangeProblem('clerk', withGrant, { ...withGrant, cases: [...withGrant.cases, kase('C')] })).toBeNull();
    const withTake = { ...saved(), settings: [{ id: 'main', accent: 'bronze', access: { junior: ['diary.write'] } }] };
    expect(dataChangeProblem('junior', withTake, { ...withTake, cases: [...withTake.cases, kase('C')] })).toBe('cases');
  });

  it('a clerk cannot grant themselves rights: the check uses the saved settings, not the new ones', () => {
    const next = { ...saved(), settings: [{ id: 'main', access: { clerk: ['cases.edit'] } }], cases: [kase('A'), kase('B'), kase('C')] };
    expect(dataChangeProblem('clerk', saved(), next)).not.toBeNull();
    expect(undoForbidden('clerk', saved(), next).undone.sort()).toEqual(['cases', 'settings']);
  });
});

describe('isOutcomeOnly', () => {
  it('needs the same cases in the same order', () => {
    expect(isOutcomeOnly([kase('A'), kase('B')], [kase('B'), kase('A')])).toBe(false);
  });
});

describe('undoForbidden', () => {
  it('keeps the allowed edit and reverts the forbidden one', () => {
    const next = { ...saved(), diary: [{ id: 'd' }], cases: [kase('A', { title: 'Hacked' }), kase('B')], clients: [] };
    const { data, undone } = undoForbidden('clerk', saved(), next);
    expect(data.diary).toEqual([{ id: 'd' }]);
    expect(data.cases).toEqual(saved().cases);
    expect(data.clients).toEqual(saved().clients);
    expect(undone.sort()).toEqual(['cases', 'clients']);
  });
  it('does nothing for a senior', () => {
    expect(undoForbidden('senior', saved(), { ...saved(), cases: [] }).undone).toEqual([]);
  });
});

describe('rights for one named person', () => {
  const withMember = (id: string, actions: string[]) => ({ ...saved(), settings: [{ id: 'main', accent: 'bronze', updatedOn: '', memberAccess: { [id]: actions } }] });
  it('a clerk with personal case-editing rights may add a case; another clerk may not', () => {
    const base = withMember('u1', ['cases.edit', 'diary.write']);
    const next = { ...base, cases: [...(base.cases as unknown[]), kase('NEW')] };
    expect(dataChangeProblem('clerk', base, next, 'u1')).toBeNull();
    expect(dataChangeProblem('clerk', base, next, 'u2')).toBe('cases');
    expect(dataChangeProblem('clerk', base, next)).toBe('cases');
  });
  it('a junior with fewer personal rights loses what the role would allow', () => {
    const base = withMember('j1', ['diary.write']);
    const next = { ...base, precedents: [{ id: 'p' }] };
    expect(dataChangeProblem('junior', base, next, 'j1')).toBe('precedents');
    expect(dataChangeProblem('junior', base, next, 'j2')).toBeNull();
  });
  it('personal rights can never include senior-only things', () => {
    const base = withMember('u1', ['studio', 'chamber.manage']);
    const next = { ...base, settings: [{ id: 'main', accent: 'navy', updatedOn: '', memberAccess: { u1: ['studio'] } }] };
    expect(dataChangeProblem('clerk', base, next, 'u1')).toBe('settings');
  });
});
