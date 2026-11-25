import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
/** Display serif for headings — the engraved, law-firm look. */
const display = Cormorant_Garamond({ variable: '--font-display', subsets: ['latin'], weight: ['500', '600', '700'], style: ['normal', 'italic'] });
/** Reading serif for statutes, judgments and drafts — built for long text on screens. */
const reading = Source_Serif_4({ variable: '--font-reading-face', subsets: ['latin'], weight: ['400', '600'], style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: 'Wakeel Pro — Practice dashboard for Pakistani lawyers',
  description: 'Cases, cause lists, laws, judgments, drafting and an AI assistant — one place for your whole practice.',
  metadataBase: new URL('https://wakeelpropk.com'),
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Wakeel Pro',
    title: 'Wakeel Pro — Pakistan’s first unified platform for legal knowledge and practice',
    description: 'Cases, cause lists, laws, judgments, drafting and an AI assistant — one secure dashboard for you and your chamber.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Wakeel Pro — Pakistan’s first unified platform for legal knowledge and practice' }],
    locale: 'en_PK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wakeel Pro — Pakistan’s first unified platform for legal knowledge and practice',
    description: 'Cases, cause lists, laws, judgments, drafting and an AI assistant — one secure dashboard for you and your chamber.',
    images: ['/og.png'],
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'Wakeel Pro', statusBarStyle: 'black-translucent' },
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
