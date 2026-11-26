import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Play the part of a signed-in senior on whichever plan the test sets.
const plan = { current: 'solo' as 'solo' | 'chamber' };
vi.mock('next/navigation', () => ({ usePathname: () => '/app/settings/', useRouter: () => ({ replace: () => {}, push: () => {} }) }));
vi.mock('../../src/components/shell/RoleProvider', () => ({
  useRole: () => ({ role: 'senior', plan: plan.current, cloud: false, member: { id: 'm1', name: 'Adv. Test', role: 'senior' } }),
}));

import SettingsPage from '../../src/app/app/settings/page';

describe('Settings', () => {
  it('a solo advocate gets Your Studio, without Chamber profile or Access rights, and keeps their logo & letterhead', async () => {
    plan.current = 'solo';
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Your Studio/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Data & Backup/ })).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: /Look and feel/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Chamber profile/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Access rights/ })).toBeNull();
    expect(screen.getByText('Your logo & letterhead')).toBeInTheDocument();
    expect(screen.getByText('Your logo')).toBeInTheDocument();
    expect(screen.queryByText('Chamber logo')).toBeNull();
  });

  it('a chamber keeps Chamber Studio with every tab', async () => {
    plan.current = 'chamber';
    render(<SettingsPage />);
    expect(screen.getByRole('tab', { name: /Chamber Studio/ })).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: /Chamber profile/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Access rights/ })).toBeInTheDocument();
  });
});

describe('Solo wording inside the Studio', () => {
  it('Files, Reminders and Safety talk to one person, not a chamber', async () => {
    plan.current = 'solo';
    const { fireEvent } = await import('@testing-library/react');
    render(<SettingsPage />);
    fireEvent.click(await screen.findByRole('tab', { name: /Files and storage/ }));
    expect(await screen.findByText('used')).toBeInTheDocument();
    expect(screen.queryByText(/shared with your chamber/)).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Reminders/ }));
    expect(screen.getByText('Send me morning hearing emails')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Safety/ }));
    expect(screen.getByText(/signed in to your account/)).toBeInTheDocument();
    expect(screen.queryByText(/chamber/i)).toBeNull();
  });
});
