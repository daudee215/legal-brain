import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CaseBreakdown, TodayHearings, WelcomeHero } from '../../src/components/dashboard/widgets';
import type { CaseStats } from '../../src/types';

const zero: CaseStats = { total: 0, byStatus: { pending: 0, adjourned: 0, reserved: 0, decided: 0, disposed: 0 }, byCategory: {}, byCourt: {} };

describe('dashboard widgets with no data', () => {
  it('TodayHearings shows an empty state', () => {
    render(<TodayHearings rows={[]} />);
    expect(screen.getByText(/no hearings today/i)).toBeInTheDocument();
  });
  it('WelcomeHero handles zero hearings without undefined', () => {
    const { container } = render(<WelcomeHero name="Ayesha Khan" todayCount={0} weekCount={0} />);
    expect(container.textContent).toMatch(/no hearings today/i);
    expect(container.textContent).not.toContain('undefined');
  });
  it('CaseBreakdown shows an empty state for zero cases', () => {
    render(<CaseBreakdown stats={zero} courts={[]} />);
    expect(screen.getByText(/no cases yet/i)).toBeInTheDocument();
  });
});
