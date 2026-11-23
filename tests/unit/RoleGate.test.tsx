import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoleProvider } from '../../src/components/shell/RoleProvider';
import { RoleGate } from '../../src/components/shell/RoleGate';

describe('RoleGate', () => {
  it('blocks a clerk from the assistant', () => {
    render(
      <RoleProvider initialRole="clerk">
        <RoleGate action="assistant">
          <p>secret assistant</p>
        </RoleGate>
      </RoleProvider>,
    );
    expect(screen.getByText(/doesn.t have access/i)).toBeInTheDocument();
    expect(screen.queryByText('secret assistant')).toBeNull();
  });
  it('lets a senior through', () => {
    render(
      <RoleProvider initialRole="senior">
        <RoleGate action="assistant">
          <p>secret assistant</p>
        </RoleGate>
      </RoleProvider>,
    );
    expect(screen.getByText('secret assistant')).toBeInTheDocument();
  });
});
