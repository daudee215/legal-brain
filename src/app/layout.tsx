import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const playfair = Playfair_Display({ variable: '--font-playfair', subsets: ['latin'], weight: ['500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'Legal Brain — Practice dashboard for Pakistani lawyers',
  description: 'Cases, cause lists, laws, judgments, drafting and an AI assistant — one place for your whole practice.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#3a2a1d' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>{children}</body>
    </html>
  );
}
