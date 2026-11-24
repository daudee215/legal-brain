import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatusResult } from '../../src/lib/cloud/statusLinks';
import { addDays, pktIso, todayKey } from '../../src/lib/dates';

const TOKEN = 'abcDEF0123456789_-abcDEF0123456789_-abcDEF0';

// The cloud wrapper is mocked: the page must render only what getCaseStatus returns.
const { getCaseStatus } = vi.hoisted(() => ({ getCaseStatus: vi.fn<(t: string) => Promise<StatusResult>>() }));
vi.mock('../../src/lib/cloud/statusLinks', () => ({ getCaseStatus }));

describe('public status page', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', `/status/?t=${TOKEN}`);
    getCaseStatus.mockReset();
  });
  afterEach(() => window.history.replaceState(null, '', '/'));

  async function renderPage() {
    const { default: StatusPage } = await import('../../src/app/status/page');
    return render(<StatusPage />);
  }

  it('shows the next date for a valid link, without the hearing note when not shared', async () => {
    const next = pktIso(addDays(todayKey(), 3), '10:30');
    getCaseStatus.mockResolvedValue({
      ok: true,
      status: { chamberName: 'Khan Law Chambers', caseTitle: 'Ali v. State', caseNo: 'C.S. 12/2026', courtId: 'lhc', stage: 'Arguments', status: 'adjourned', nextHearing: next },
    });
    await renderPage();
    const [y, m, d] = addDays(todayKey(), 3).split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    expect(await screen.findByTestId('next-date')).toHaveTextContent(`${d} ${months[m - 1]} ${y}`);
    expect(getCaseStatus).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByText('In 3 days')).toBeInTheDocument();
    expect(screen.getByText('Lahore High Court')).toBeInTheDocument();
    expect(screen.getByText('Adjourned')).toBeInTheDocument();
    expect(screen.getByText('This is a status update, not legal advice.')).toBeInTheDocument();
    expect(screen.queryByTestId('last-hearing')).toBeNull();
    expect(screen.queryByText('Last hearing', { exact: false })).toBeNull();
  });

  it('shows the last hearing note only when the link includes it', async () => {
    getCaseStatus.mockResolvedValue({
      ok: true,
      status: {
        chamberName: 'C',
        caseTitle: 'T',
        caseNo: '',
        courtId: '',
        stage: '',
        status: null,
        nextHearing: null,
        lastHearing: { date: '2026-11-20T09:00:00+05:00', proceedings: 'Reply filed; arguments next.' },
      },
    });
    await renderPage();
    expect(await screen.findByText('Reply filed; arguments next.')).toBeInTheDocument();
    expect(screen.getByText('Not fixed yet')).toBeInTheDocument();
  });

  it('shows the not-valid message when the server says nothing', async () => {
    getCaseStatus.mockResolvedValue({ ok: false, reason: 'invalid' });
    await renderPage();
    expect(await screen.findByText('This link is not valid any more. Please contact your advocate.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('next-date')).toBeNull());
  });
});
