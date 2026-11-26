import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlanCard } from '../../src/app/app/chamber/PlanCard';

describe('PlanCard', () => {
  it('shows places used and lets a senior move up', () => {
    render(<PlanCard chamberId="c1" plan="chamber" members={10} senior />);
    expect(screen.getByText('10 of 10 places used')).toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Firm/));
    expect(screen.getByRole('button', { name: 'Switch to Firm' })).toBeEnabled();
  });

  it('will not shrink below the team', () => {
    render(<PlanCard chamberId="c1" plan="chamber" members={3} senior />);
    fireEvent.click(screen.getByLabelText(/Solo/));
    expect(screen.getByText(/only you, and you have 3/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to Solo' })).toBeDisabled();
  });

  it('a junior sees the plan but cannot change it', () => {
    render(<PlanCard chamberId="c1" plan="firm" members={4} senior={false} />);
    expect(screen.getByText('Firm')).toBeInTheDocument();
    expect(screen.queryByText('Change plan')).toBeNull();
  });
});
