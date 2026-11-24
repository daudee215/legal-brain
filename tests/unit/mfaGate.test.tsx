import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const cloud = vi.hoisted(() => ({ value: { view: 'mfa', email: 'a@b.pk', restart: vi.fn(), signOut: vi.fn() } }));
vi.mock('../../src/components/shell/CloudProvider', () => ({ useCloud: () => cloud.value }));

import { MfaGate } from '../../src/components/shell/MfaChallenge';

describe('MfaGate', () => {
  it('while the code is still needed, shows only the challenge, never the app', () => {
    render(
      <MfaGate>
        <p>client files</p>
      </MfaGate>,
    );
    expect(screen.getByLabelText('6-digit code')).toBeInTheDocument();
    expect(screen.getByText('Signing in as a@b.pk')).toBeInTheDocument();
    expect(screen.queryByText('client files')).toBeNull();
  });

  it('otherwise renders the app untouched', () => {
    cloud.value = { ...cloud.value, view: 'on' };
    render(
      <MfaGate>
        <p>client files</p>
      </MfaGate>,
    );
    expect(screen.getByText('client files')).toBeInTheDocument();
    expect(screen.queryByLabelText('6-digit code')).toBeNull();
  });
});
