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

  it('seats: solo 1, chamber 3, firm 10 — and the server agrees', () => {
    expect([PLANS.solo.seats, PLANS.chamber.seats, PLANS.firm.seats]).toEqual([1, 3, 10]);
    const sql = readFileSync('supabase/plans.sql', 'utf8');
    expect(sql).toContain("when 'solo' then 1 when 'firm' then 10 else 3");
  });

  it('refuses a plan smaller than the team', () => {
    expect(planTooSmall('solo', 1)).toBe('');
    expect(planTooSmall('solo', 3)).toMatch(/only you.*Remove 2/);
    expect(planTooSmall('chamber', 5)).toMatch(/up to 3.*Remove 2/);
    expect(planTooSmall('firm', 10)).toBe('');
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
    // A firm has the same pages; its team page is called Firm.
    expect(navFor('senior', 'firm').map((n) => n.href)).toEqual(chamber);
    expect(navFor('senior', 'firm').find((n) => n.href === '/app/chamber/')?.label).toBe('Firm');
  });
});

describe('menu', () => {
  it('Deadlines and Tasks are one page; Tools, Studio and Data & Backup sit under Settings', () => {
    const hrefs = navFor('senior', 'chamber').map((n) => n.href);
    expect(hrefs).toContain('/app/tasks/');
    expect(hrefs).toContain('/app/settings/');
    for (const gone of ['/app/deadlines/', '/app/tools/', '/app/studio/']) expect(hrefs).not.toContain(gone);
    expect(navFor('senior', 'chamber').find((n) => n.href === '/app/tasks/')?.label).toBe('Deadlines & Tasks');
    // Settings is senior only, as the Studio and Data & Backup were.
    expect(navFor('junior', 'chamber').map((n) => n.href)).not.toContain('/app/settings/');
    expect(navFor('senior', 'solo').map((n) => n.href)).toContain('/app/settings/');
  });
});
