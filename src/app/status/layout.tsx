import type { Metadata } from 'next';

/** The client status page is private: keep it out of search engines and never send its URL (with the token) onward. */
export const metadata: Metadata = {
  title: 'Case status',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: 'no-referrer',
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
