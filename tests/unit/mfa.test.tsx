import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A fake Supabase auth client: just the parts two-step sign-in touches.
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  mfa: {
    listFactors: vi.fn(),
    enroll: vi.fn(),
    challenge: vi.fn(),
    verify: vi.fn(),
    challengeAndVerify: vi.fn(),
    unenroll: vi.fn(),
    getAuthenticatorAssuranceLevel: vi.fn(),
  },
}));
const push = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/cloud/client', () => ({
  cloudEnabled: true,
  supabase: () => ({ auth }),
  friendlyError: (e: unknown) => (e as { message?: string })?.message ?? String(e),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import LoginPage from '../../src/app/login/page';
import { MfaChallenge } from '../../src/components/shell/MfaChallenge';
import { challengeLogin, confirmEnrol, disableTotp, listTotpFactors, MFA_ERR, needsMfa, startEnrol } from '../../src/lib/cloud/mfa';

const ok = <T,>(data: T) => ({ data, error: null });
const bad = (code: string, message: string) => ({ data: null, error: { code, message, status: 422 } });
const totp = { id: 'f1', factor_type: 'totp', status: 'verified', friendly_name: '', created_at: '2026-11-01T00:00:00Z', updated_at: '' };

beforeEach(() => {
  vi.clearAllMocks();
  auth.getSession.mockResolvedValue(ok({ session: null }));
  auth.signInWithPassword.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
  auth.mfa.listFactors.mockResolvedValue(ok({ all: [], totp: [], phone: [] }));
  auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(ok({ currentLevel: 'aal1', nextLevel: 'aal1', currentAuthenticationMethods: [] }));
  auth.mfa.unenroll.mockResolvedValue(ok({ id: 'x' }));
});

describe('mfa helpers', () => {
  it('enrol: clears a half-finished setup, enrols a TOTP factor, then confirms with challenge + verify', async () => {
    auth.mfa.listFactors.mockResolvedValue(ok({ all: [{ ...totp, id: 'old', status: 'unverified' }], totp: [] }));
    auth.mfa.enroll.mockResolvedValue(ok({ id: 'f2', type: 'totp', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'ABCD', uri: 'otpauth://x' } }));
    auth.mfa.challenge.mockResolvedValue(ok({ id: 'ch1', type: 'totp', expires_at: 0 }));
    auth.mfa.verify.mockResolvedValue(ok({}));

    const e = await startEnrol();
    expect(auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'old' });
    expect(auth.mfa.enroll).toHaveBeenCalledWith(expect.objectContaining({ factorType: 'totp' }));
    expect(e).toEqual({ factorId: 'f2', qr: 'data:image/svg+xml;utf-8,<svg/>', secret: 'ABCD', uri: 'otpauth://x' });

    await confirmEnrol('f2', '123456');
    expect(auth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'f2' });
    expect(auth.mfa.verify).toHaveBeenCalledWith({ factorId: 'f2', challengeId: 'ch1', code: '123456' });
  });

  it('a wrong code gives the friendly message', async () => {
    auth.mfa.challenge.mockResolvedValue(ok({ id: 'ch1' }));
    auth.mfa.verify.mockResolvedValue(bad('mfa_verification_failed', 'Invalid TOTP code entered'));
    await expect(confirmEnrol('f2', '000000')).rejects.toMatchObject({ key: 'mfa.errCode', message: MFA_ERR.code });
  });

  it('rejects anything that is not 6 digits without calling the server', async () => {
    await expect(confirmEnrol('f2', '12a4')).rejects.toMatchObject({ key: 'mfa.errFormat' });
    expect(auth.mfa.challenge).not.toHaveBeenCalled();
  });

  it('needsMfa: only when the session is aal1 and the account can reach aal2', async () => {
    expect(await needsMfa()).toBe(false);
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(ok({ currentLevel: 'aal1', nextLevel: 'aal2' }));
    expect(await needsMfa()).toBe(true);
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(ok({ currentLevel: 'aal2', nextLevel: 'aal2' }));
    expect(await needsMfa()).toBe(false);
  });

  it('challengeLogin verifies against the verified factor', async () => {
    auth.mfa.listFactors.mockResolvedValue(ok({ all: [totp], totp: [totp] }));
    auth.mfa.challengeAndVerify.mockResolvedValue(ok({}));
    await challengeLogin('654321');
    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '654321' });
    expect(await listTotpFactors()).toEqual([{ id: 'f1', name: '', createdAt: '2026-11-01T00:00:00Z' }]);
  });

  it('disable needs a valid code first; a wrong code does not unenrol', async () => {
    auth.mfa.challengeAndVerify.mockResolvedValue(bad('mfa_verification_failed', 'Invalid TOTP code entered'));
    await expect(disableTotp('f1', '111111')).rejects.toMatchObject({ key: 'mfa.errCode' });
    expect(auth.mfa.unenroll).not.toHaveBeenCalled();

    auth.mfa.challengeAndVerify.mockResolvedValue(ok({}));
    await disableTotp('f1', '222222');
    expect(auth.mfa.challengeAndVerify).toHaveBeenLastCalledWith({ factorId: 'f1', code: '222222' });
    expect(auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'f1' });
    expect(auth.mfa.challengeAndVerify.mock.invocationCallOrder.at(-1)!).toBeLessThan(auth.mfa.unenroll.mock.invocationCallOrder[0]);
  });
});

describe('MfaChallenge', () => {
  it('submits by itself at 6 digits and shows an error on a wrong code', async () => {
    const verify = vi.fn().mockRejectedValueOnce(Object.assign(new Error('Invalid TOTP code entered'), { code: 'mfa_verification_failed' })).mockResolvedValueOnce(undefined);
    const onVerified = vi.fn();
    render(<MfaChallenge onVerified={onVerified} onSignOut={vi.fn()} verify={verify} />);
    const box = screen.getByLabelText('6-digit code');
    expect(box).toHaveAttribute('inputmode', 'numeric');
    expect(box).toHaveAttribute('autocomplete', 'one-time-code');
    expect(document.activeElement).toBe(box);

    fireEvent.change(box, { target: { value: '12345' } });
    expect(verify).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: '123456' } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(MFA_ERR.code));
    expect(verify).toHaveBeenCalledWith('123456');
    expect(onVerified).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '65 43 21' } });
    await waitFor(() => expect(onVerified).toHaveBeenCalled());
    expect(verify).toHaveBeenLastCalledWith('654321');
  });

  it('"Use a different account" signs out', async () => {
    const onSignOut = vi.fn();
    render(<MfaChallenge onVerified={vi.fn()} onSignOut={onSignOut} verify={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use a different account' }));
    await waitFor(() => expect(onSignOut).toHaveBeenCalled());
  });
});

describe('Login page', () => {
  const logIn = async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'a@b.pk' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  };

  it('no factor: goes straight into the app, exactly as before', async () => {
    await logIn();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/'));
    expect(screen.queryByText('Two-step sign-in')).toBeNull();
    expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled();
  });

  it('factor on (aal1 -> aal2): asks for the code before going in', async () => {
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(ok({ currentLevel: 'aal1', nextLevel: 'aal2' }));
    auth.mfa.listFactors.mockResolvedValue(ok({ all: [totp], totp: [totp] }));
    auth.mfa.challengeAndVerify.mockResolvedValue(ok({}));
    await logIn();
    const box = await screen.findByLabelText('6-digit code');
    expect(push).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: '246810' } });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/'));
    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '246810' });
  });
});
