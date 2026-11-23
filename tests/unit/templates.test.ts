import { describe, expect, it } from 'vitest';
import { fillTemplate } from '../../src/lib/templates';
import type { TemplateField } from '../../src/types';

const fields: TemplateField[] = [
  { key: 'court', label: 'Court', type: 'text' },
  { key: 'client_name', label: 'Client Name', type: 'text' },
];

describe('fillTemplate', () => {
  it('shows the label in brackets for blank fields', () => {
    expect(fillTemplate('In the court of {{court}}', fields, {})).toBe('In the court of [Court]');
  });
  it('treats whitespace-only as blank', () => {
    expect(fillTemplate('{{client_name}}', fields, { client_name: '   ' })).toBe('[Client Name]');
  });
  it('replaces filled values everywhere', () => {
    expect(fillTemplate('{{court}} / {{court}}', fields, { court: 'Lahore High Court' })).toBe(
      'Lahore High Court / Lahore High Court',
    );
  });
  it('never leaves braces or undefined', () => {
    const out = fillTemplate('{{court}} {{client_name}} {{unknown_key}}', fields, {});
    expect(out).not.toContain('{{');
    expect(out).not.toContain('undefined');
    expect(out).toContain('[unknown_key]');
  });
});
