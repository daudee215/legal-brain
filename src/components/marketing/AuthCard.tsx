'use client';

import { motion } from 'framer-motion';
import { CalendarCheck, ShieldCheck, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { EASE } from '../motion';
import { BrandMark, Logo } from '../shell/Logo';
import { IMG } from './images';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  note,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Small print under the card; defaults to the demo notice. */
  note?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-cream lg:grid-cols-[1.05fr_1fr]">
      <div className="grain relative hidden overflow-hidden bg-night p-12 text-ivory lg:flex lg:flex-col lg:justify-between">
        <motion.div initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: EASE }} className="absolute inset-0">
          <Image
            src={IMG.justice}
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover object-[60%_30%] opacity-45 [filter:sepia(.6)_saturate(1.2)]"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/70 to-night/30" aria-hidden />
        <motion.div
          initial={{ opacity: 0, rotate: -8, scale: 0.94 }}
          animate={{ opacity: 1, rotate: -4, scale: 1 }}
          transition={{ duration: 2.4, ease: EASE, delay: 0.3 }}
          className="absolute -bottom-16 -right-24 h-[34rem] w-[34rem]"
        >
          <BrandMark className="h-full w-full bg-[#ead2bd]/[0.07]" />
        </motion.div>
        <Link href="/" className="relative">
          <Logo light />
        </Link>
        <div className="relative">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            className="font-serif text-4xl font-bold leading-tight text-ivory xl:text-5xl"
          >
            &ldquo;Every date, every document, every precedent — <span className="bronze-text">one search away.</span>&rdquo;
          </motion.p>
          <ul className="mt-8 space-y-3 text-sm text-ivory/80">
            {[
              [CalendarCheck, "Today's hearings across every court, before you leave home"],
              [Sparkles, 'An AI assistant that answers with citations'],
              [ShieldCheck, "Private to your chamber — no one else sees your clients"],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <motion.li
                  key={text as string}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.5 + 0.12 * i }}
                  className="flex items-center gap-3"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/5">
                    <I className="h-4 w-4 text-bronze-soft" />
                  </span>
                  {text as string}
                </motion.li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-ivory/40">Preview · Photography: Unsplash</p>
      </div>
      <div className="relative flex items-center justify-center overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-bronze-soft/25 blur-3xl" aria-hidden />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative w-full max-w-md"
        >
          <div className="mb-8 lg:hidden">
            <Link href="/">
              <Logo />
            </Link>
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-1 text-ink-soft">{subtitle}</p>
          <div className="mt-8 rounded-2xl border border-line bg-paper/80 p-6 shadow-xl shadow-bronze/5 backdrop-blur">{children}</div>
          <p className="mt-6 text-sm text-ink-soft">{footer}</p>
          <div className="mt-4 rounded-lg border border-bronze/30 bg-bronze/10 px-3 py-2 text-xs text-ink">
            {note ?? 'Demo — real accounts arrive in Phase 2. Any details take you to the demo dashboard.'}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
