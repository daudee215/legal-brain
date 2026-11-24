import { describe, expect, it } from 'vitest';
import { afterEach } from 'vitest';
import { can, setCustomAccess } from '../../src/lib/permissions';

describe('can', () => {
  it('clerk cannot use the assistant', () => expect(can('clerk', 'assistant')).toBe(false));
  it('clerk cannot draft', () => expect(can('clerk', 'drafting')).toBe(false));
  it('clerk can write diary', () => expect(can('clerk', 'diary.write')).toBe(true));
  it('clerk can upload documents', () => expect(can('clerk', 'documents.upload')).toBe(true));
  it('junior cannot manage chamber', () => expect(can('junior', 'chamber.manage')).toBe(false));
  it('junior cannot see billing', () => expect(can('junior', 'billing')).toBe(false));
  it('junior can draft', () => expect(can('junior', 'drafting')).toBe(true));
  it('senior can do billing', () => expect(can('senior', 'billing')).toBe(true));
  it('senior can manage chamber', () => expect(can('senior', 'chamber.manage')).toBe(true));

  it('clerk cannot see the chamber team page, studio or precedents', () => {
    expect(can('clerk', 'team.view')).toBe(false);
    expect(can('clerk', 'studio')).toBe(false);
    expect(can('clerk', 'precedents')).toBe(false);
  });
  it('junior sees the team page but not the studio', () => {
    expect(can('junior', 'team.view')).toBe(true);
    expect(can('junior', 'studio')).toBe(false);
  });

  describe('custom access set by the senior', () => {
    afterEach(() => setCustomAccess(null));
    it('can grant a clerk an extra right', () => {
      setCustomAccess({ clerk: ['documents.upload', 'diary.write', 'cases.edit'] });
      expect(can('clerk', 'cases.edit')).toBe(true);
    });
    it('can take a right away from a junior', () => {
      setCustomAccess({ junior: ['diary.write'] });
      expect(can('junior', 'drafting')).toBe(false);
    });
    it('never lets anyone but the senior hold chamber management or the studio', () => {
      setCustomAccess({ junior: ['chamber.manage', 'studio'], clerk: ['chamber.manage', 'studio'] });
      expect(can('junior', 'chamber.manage')).toBe(false);
      expect(can('clerk', 'studio')).toBe(false);
    });
    it('never takes anything from the senior', () => {
      setCustomAccess({ senior: [] });
      expect(can('senior', 'billing')).toBe(true);
    });
  });
});
