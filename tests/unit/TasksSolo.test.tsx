import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const plan = { current: 'solo' as 'solo' | 'chamber' };
vi.mock('next/navigation', () => ({ usePathname: () => '/app/tasks/', useRouter: () => ({ replace: () => {}, push: () => {} }) }));
vi.mock('../../src/components/shell/RoleProvider', () => ({
  useRole: () => ({ role: 'senior', plan: plan.current, cloud: false, member: { id: 'm1', name: 'Adv. Test', role: 'senior' } }),
}));

import { TasksView } from '../../src/app/app/tasks/TasksView';

describe('Tasks', () => {
  it('a solo advocate sees tasks by due date, with no By person, Mine only or Assign to', async () => {
    plan.current = 'solo';
    render(<TasksView />);
    expect(await screen.findByText('Next 7 days')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /By person/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Mine only/ })).toBeNull();
  });
  it('a chamber can group by person', async () => {
    plan.current = 'chamber';
    render(<TasksView />);
    expect(await screen.findByRole('tab', { name: /By person/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mine only/ })).toBeInTheDocument();
  });
});
