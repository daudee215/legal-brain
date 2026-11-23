import { describe, expect, it } from 'vitest';
import { limitationDeadline, REMEDIES } from '../../src/lib/limitation';

describe('limitationDeadline', () => {
  it('90 days for appeal from decree to High Court', () => {
    expect(limitationDeadline('2026-11-23', 'appeal-hc-decree')).toEqual({ deadlineKey: '2027-02-21', daysTotal: 90 });
  });
  it('adds copy time excluded under s.12', () => {
    expect(limitationDeadline('2026-11-23', 'appeal-hc-decree', 5).deadlineKey).toBe('2027-02-26');
  });
  it('throws for an unknown remedy', () => {
    expect(() => limitationDeadline('2026-11-23', 'nope')).toThrow('Unknown remedy');
  });
  it('has six remedies', () => {
    expect(REMEDIES).toHaveLength(6);
  });
});
