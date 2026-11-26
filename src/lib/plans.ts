/**
 * The three ways to use Wakeel Pro. Every plan has the same practice features; they differ in
 * how many people can share the account. Keep SEATS in step with supabase/plans.sql.
 */
export type Plan = 'solo' | 'chamber' | 'firm';
export const PLAN_IDS: Plan[] = ['solo', 'chamber', 'firm'];

export const PLANS: Record<Plan, { name: string; seats: number; tag: string; orgLabel: string; orgPlaceholder: string }> = {
  solo: { name: 'Solo', seats: 1, tag: 'For individual advocates', orgLabel: 'Name on your letterhead', orgPlaceholder: 'e.g. Law Office of Adv. Sana Malik' },
  chamber: { name: 'Chamber', seats: 10, tag: 'For seniors with juniors & clerks', orgLabel: 'Chamber name', orgPlaceholder: 'e.g. Khan & Associates' },
  firm: { name: 'Firm', seats: 20, tag: 'For multi-partner firms', orgLabel: 'Firm name', orgPlaceholder: 'e.g. Malik, Shah & Partners' },
};

export const isPlan = (v: unknown): v is Plan => typeof v === 'string' && (PLAN_IDS as string[]).includes(v);

/** A chamber's plan; chambers made before plans existed are chambers. */
export const planOf = (c: { plan?: unknown } | null | undefined): Plan => (isPlan(c?.plan) ? c.plan : 'chamber');

/** Pages a solo advocate never needs: the team page and the clerk's Munshi screen. */
export const TEAM_PAGES = ['/app/chamber/', '/app/munshi/'];

/** Why `plan` can't hold `members` people, or '' when it can. */
export function planTooSmall(plan: Plan, members: number): string {
  const { seats, name } = PLANS[plan];
  if (members <= seats) return '';
  return `${name} allows ${seats === 1 ? 'only you' : `up to ${seats} people`}, and you have ${members}. Remove ${members - seats} first.`;
}
