import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NAV, NAV_GROUPS } from '../../src/components/shell/nav';
import { RoleProvider } from '../../src/components/shell/RoleProvider';
import { Sidebar } from '../../src/components/shell/Sidebar';
import { LanguageProvider, useLang } from '../../src/lib/i18n';
import { DICT } from '../../src/lib/i18n-dict';

vi.mock('next/navigation', () => ({ usePathname: () => '/app/' }));

const ARABIC = /[؀-ۿ]/;

function Probe() {
  const { lang, dir, t, setLang } = useLang();
  return (
    <div>
      <p data-testid="state">{`${lang}|${dir}`}</p>
      <p data-testid="hello">{t('munshi.today')}</p>
      <p data-testid="vars">{t('munshi.plusDays', { n: 7 })}</p>
      <p data-testid="missing">{t('no.such.key', undefined, 'Fallback')}</p>
      <button onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}>toggle</button>
    </div>
  );
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.setAttribute('lang', 'en');
  document.documentElement.removeAttribute('dir');
});

describe('i18n dictionary', () => {
  it('has a non-empty English and Urdu string for every key', () => {
    for (const [key, e] of Object.entries(DICT)) {
      expect(e.en.trim(), `${key}.en`).not.toBe('');
      expect(e.ur.trim(), `${key}.ur`).not.toBe('');
    }
  });
  it('writes Urdu strings in Urdu script (except the EN toggle label)', () => {
    for (const [key, e] of Object.entries(DICT)) if (key !== 'top.langToggle') expect(e.ur, key).toMatch(ARABIC);
  });
  it('covers every nav item and group, with English matching nav.ts labels', () => {
    for (const n of NAV) expect((DICT as Record<string, { en: string }>)[`nav.${n.href}`]?.en).toBe(n.label);
    for (const g of NAV_GROUPS) expect((DICT as Record<string, { en: string }>)[`group.${g}`]?.en).toBe(g);
  });
});

describe('LanguageProvider', () => {
  it('defaults to English LTR without a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('state')).toHaveTextContent('en|ltr');
    expect(screen.getByTestId('hello')).toHaveTextContent("Today's hearings");
    expect(screen.getByTestId('vars')).toHaveTextContent('+7 days');
    expect(screen.getByTestId('missing')).toHaveTextContent('Fallback');
  });

  it('switches <html lang/dir>, persists the choice, and restores on unmount', () => {
    const { unmount } = render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    act(() => screen.getByText('toggle').click());
    expect(screen.getByTestId('state')).toHaveTextContent('ur|rtl');
    expect(screen.getByTestId('hello')).toHaveTextContent('آج کی پیشیاں');
    expect(document.documentElement.lang).toBe('ur');
    expect(document.documentElement.dir).toBe('rtl');
    expect(window.localStorage.getItem('lb.lang')).toBe('ur');
    unmount();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.hasAttribute('dir')).toBe(false);
  });

  it('reads the saved language on mount', () => {
    window.localStorage.setItem('lb.lang', 'ur');
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('state')).toHaveTextContent('ur|rtl');
  });

  it('translates the sidebar in Urdu', async () => {
    window.localStorage.setItem('lb.lang', 'ur');
    render(
      <RoleProvider initialRole="senior">
        <LanguageProvider>
          <Sidebar />
        </LanguageProvider>
      </RoleProvider>,
    );
    expect(await screen.findByText('منشی موڈ')).toBeInTheDocument();
    expect(screen.getByText('ڈیش بورڈ')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).toBeNull();
  });
});
