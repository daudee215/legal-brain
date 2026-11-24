import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictHint } from '../../src/components/clients/ConflictHint';
import { LanguageProvider } from '../../src/lib/i18n';

beforeEach(() => window.localStorage.clear());

const mount = (props: Parameters<typeof ConflictHint>[0]) =>
  render(
    <LanguageProvider>
      <ConflictHint {...props} />
    </LanguageProvider>,
  );

describe('ConflictHint', () => {
  it('shows for a known client name, linking to the matter', async () => {
    mount({ names: ['Muhammad Usman'] });
    expect(await screen.findByText('This name already appears in your files:')).toBeInTheDocument();
    expect(screen.getByText(/Muhammad Usman is an existing client/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Muhammad Usman v\. The State/ }).getAttribute('href')).toMatch(/\/app\/case\/?\?id=k1/);
  });

  it('uses the stronger wording when the name is the other side of one of our cases', async () => {
    mount({ names: ['Kamran Ali'] });
    expect(await screen.findByText(/appears as the other side in/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Fatima Bibi v\. Kamran Ali/ })).toBeInTheDocument();
  });

  it('finds a party typed inside a case title', async () => {
    mount({ title: 'Someone v. Kamran Ali' });
    expect(await screen.findByText(/appears as the other side in/)).toBeInTheDocument();
  });

  it('stays silent for a new name', async () => {
    mount({ names: ['Zzyzx Qwerty'], title: 'Zzyzx Qwerty v. Plumbing Co' });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.queryByText(/already appears/)).toBeNull();
  });

  it('stays silent for very short input', async () => {
    mount({ names: ['Al'] });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('never matches the plain word "The State" on its own', async () => {
    mount({ title: 'Ahmed Zzyzx v. The State' });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });
});
