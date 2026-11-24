import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoleProvider } from '../../src/components/shell/RoleProvider';
import { Sidebar } from '../../src/components/shell/Sidebar';
import { NAV } from '../../src/components/shell/nav';

vi.mock('next/navigation', () => ({ usePathname: () => '/app/' }));

describe('Sidebar', () => {
  it('shows every nav item to a senior', () => {
    render(
      <RoleProvider initialRole="senior">
        <Sidebar />
      </RoleProvider>,
    );
    expect(NAV).toHaveLength(21);
    for (const n of NAV) expect(screen.getByText(n.label)).toBeInTheDocument();
  });
  it('hides AI Assistant and Legal Drafting from a clerk', () => {
    render(
      <RoleProvider initialRole="clerk">
        <Sidebar />
      </RoleProvider>,
    );
    expect(screen.queryByText('AI Assistant')).toBeNull();
    expect(screen.queryByText('Legal Drafting')).toBeNull();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
  it('hides Chamber, Chamber Studio, Data & Backup and Precedents from a clerk', () => {
    render(
      <RoleProvider initialRole="clerk">
        <Sidebar />
      </RoleProvider>,
    );
    for (const label of ['Chamber', 'Chamber Studio', 'Data & Backup', 'Precedents']) expect(screen.queryByText(label)).toBeNull();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });
});
