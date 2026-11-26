import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { navFor } from '../../src/components/shell/nav';
import { PLANS, planOf, planTooSmall } from '../../src/lib/plans';

describe('plans', () => {
  it('chambers made before plans existed count as Chamber', () => {
    expect(planOf({})).toBe('chamber');
    expect(planOf({ plan: 'nonsense' })).toBe('chamber');
    expect(planOf({ plan: 'solo' })).toBe('solo');
    expect(planOf(null)).toBe('chamber');
  });

  it('seats: solo 1, chamber 10, firm 20 — and the server agrees', () => {
    expect([PLANS.solo.seats, PLANS.chamber.seats, PLANS.firm.seats]).toEqual([1, 10, 20]);
    const sql = readFileSync('supabase/plans.sql', 'utf8');
    expect(sql).toContain("when 'solo' then 1 when 'firm' then 20 else 10");
  });

  it('refuses a plan smaller than the team', () => {
    expect(planTooSmall('solo', 1)).toBe('');
    expect(planTooSmall('solo', 3)).toMatch(/only you.*Remove 2/);
    expect(planTooSmall('chamber', 12)).toMatch(/up to 10.*Remove 2/);
    expect(planTooSmall('firm', 12)).toBe('');
  });

  it('a solo practice has no team page or Munshi screen; a chamber has both', () => {
    const solo = navFor('senior', 'solo').map((n) => n.href);
    expect(solo).not.toContain('/app/chamber/');
    expect(solo).not.toContain('/app/munshi/');
    expect(solo).toContain('/app/cases/');
    expect(solo).toContain('/app/assistant/');
    const chamber = navFor('senior', 'chamber').map((n) => n.href);
    expect(chamber).toContain('/app/chamber/');
    expect(chamber).toContain('/app/munshi/');
    expect(navFor('senior', 'firm')).toEqual(navFor('senior', 'chamber'));
  });
});
