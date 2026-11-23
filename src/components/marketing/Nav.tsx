'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '../shell/Logo';

const LINKS = [
  ['#features', 'Features'],
  ['#preview', 'Product'],
  ['#chambers', 'For Chambers'],
  ['#pricing', 'Pricing'],
  ['#faq', 'FAQ'],
];

export function MarketingNav() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 24));

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${solid ? 'border-b border-line/70 bg-cream/80 py-3 backdrop-blur-xl' : 'py-5'}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        <Link href="/" aria-label="Legal Brain home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-line/80 bg-paper/60 px-2 py-1 text-sm text-ink-soft backdrop-blur md:flex" aria-label="Site">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-line/60 hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login/" className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-line/50 sm:inline-flex">
            Log in
          </Link>
          <Link href="/signup/" className="rounded-md bg-night px-4 py-2 text-sm font-medium text-ivory shadow-lg shadow-night/20 transition hover:-translate-y-0.5 hover:bg-night/90">
            Get started
          </Link>
          <button className="rounded-md p-2 md:hidden" aria-label="Open site menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-night/95 px-6 py-6 text-ivory backdrop-blur md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between">
              <Logo light />
              <button onClick={() => setOpen(false)} aria-label="Close site menu" className="rounded-md p-2 hover:bg-white/10">
                <X className="h-6 w-6" />
              </button>
            </div>
            <ul className="mt-10 space-y-2">
              {[...LINKS, ['/login/', 'Log in']].map(([href, label], i) => (
                <motion.li key={href} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                  <a href={href} onClick={() => setOpen(false)} className="block py-2 font-serif text-3xl">
                    {label}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
