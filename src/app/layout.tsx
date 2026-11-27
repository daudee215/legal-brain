import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const inter = localFont({
  src: './fonts/inter.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
});
const display = localFont({
  src: [
    { path: './fonts/cormorant-garamond.woff2', weight: '500 700', style: 'normal' },
    { path: './fonts/cormorant-garamond-italic.woff2', weight: '500 700', style: 'italic' },
  ],
  variable: '--font-display',
  adjustFontFallback: 'Times New Roman',
  display: 'swap',
});
const reading = localFont({
  src: [
    { path: './fonts/source-serif-4.woff2', weight: '400 600', style: 'normal' },
    { path: './fonts/source-serif-4-italic.woff2', weight: '400 600', style: 'italic' },
  ],
  variable: '--font-reading-face',
  adjustFontFallback: 'Times New Roman',
  display: 'swap',
});

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
