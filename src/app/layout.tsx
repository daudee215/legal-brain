import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
/** Display serif for headings — the engraved, law-firm look. */
const display = Cormorant_Garamond({ variable: '--font-display', subsets: ['latin'], weight: ['500', '600', '700'], style: ['normal', 'italic'] });
/** Reading serif for statutes, judgments and drafts — built for long text on screens. */
const reading = Source_Serif_4({ variable: '--font-reading-face', subsets: ['latin'], weight: ['400', '600'], style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: 'Legal Brain — Practice dashboard for Pakistani lawyers',
  description: 'Cases, cause lists, laws, judgments, drafting and an AI assistant — one place for your whole practice.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'Legal Brain', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#3a2a1d' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${reading.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400..700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
