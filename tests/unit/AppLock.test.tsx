import { webcrypto } from 'node:crypto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppLock } from '../../src/components/shell/AppLock';
import { clearLock, isLockEnabled, setCryptoProvider, setPin } from '../../src/lib/appLock';
import { LanguageProvider } from '../../src/lib/i18n';

function mount() {
  return render(
    <LanguageProvider>
      <AppLock>
        <p>client files</p>
      </AppLock>
    </LanguageProvider>,
  );
}

const tap = (digits: string) => {
  for (const d of digits) fireEvent.click(screen.getByRole('button', { name: d }));
};

beforeEach(() => {
  setCryptoProvider(webcrypto as unknown as Crypto);
  window.localStorage.clear();
});

describe('AppLock', () => {
  it('does nothing when no PIN was set', () => {
    mount();
    expect(screen.getByText('client files')).toBeInTheDocument();
    expect(screen.queryByText('Enter your PIN')).toBeNull();
  });

  it('shows the unlock screen without rendering the children, rejects a wrong PIN, accepts the right one', async () => {
    await setPin('2468');
    mount();
    expect(screen.getByRole('dialog', { name: 'App locked' })).toBeInTheDocument();
    expect(screen.getByText('Enter your PIN')).toBeInTheDocument();
    expect(screen.queryByText('client files')).toBeNull();

    tap('1111');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Wrong PIN'));
    expect(screen.queryByText('client files')).toBeNull();

    tap('2468');
    await waitFor(() => expect(screen.getByText('client files')).toBeInTheDocument());
    expect(screen.queryByText('Enter your PIN')).toBeNull();
  });

  it('accepts digits typed on the keyboard', async () => {
    await setPin('1357');
    mount();
    for (const k of '1357') fireEvent.keyDown(window, { key: k });
    await waitFor(() => expect(screen.getByText('client files')).toBeInTheDocument());
  });

  it('"Forgot PIN" removes the lock after a confirm in demo mode', async () => {
    await setPin('1357');
    mount();
    fireEvent.click(screen.getByRole('button', { name: /forgot pin/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove lock' }));
    await waitFor(() => expect(screen.getByText('client files')).toBeInTheDocument());
    expect(isLockEnabled()).toBe(false);
    clearLock();
  });
});
