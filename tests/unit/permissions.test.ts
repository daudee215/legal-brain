import { describe, expect, it } from 'vitest';
import { can } from '../../src/lib/permissions';

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
});
