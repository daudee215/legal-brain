'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Award, Play, Scale, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { EASE, WordsReveal } from '../motion';
import { BrandMark } from '../shell/Logo';
import { IMG } from './images';

function ScrollBadge() {
  return (
    <a href="#statement" aria-label="Scroll down" className="group relative grid h-28 w-28 place-items-center rounded-full bg-night text-ivory shadow-2xl shadow-night/30">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-spin-slow" aria-hidden>
        <defs>
          <path id="circle" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
        </defs>
        <text className="fill-ivory text-[9.5px] uppercase tracking-[0.32em]">
          <textPath href="#circle">Scroll down · Scroll down · Scroll down ·</textPath>
        </text>
      </svg>
      <span className="grid h-10 w-10 place-items-center rounded-full border border-white/25 transition-transform group-hover:translate-y-1">
        <ArrowRight className="h-4 w-4 rotate-90" />
      </span>
    </a>
  );
}

function Laurel({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2 text-ink">
      <Scale className="h-5 w-5 shrink-0 text-bronze" aria-hidden />
      <div className="text-left leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wider">{title}</p>
        <p className="text-[10px] text-ink-soft">{sub}</p>
      </div>
    </div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '18%']);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.08]);
  const wordX = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-12%']);
  const markRotate = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -10]);
  const markY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '10%']);

  return (
    <section ref={ref} className="grain relative overflow-hidden pt-28 sm:pt-32">
      {/* Soft glows drawn as gradients: a blur filter here gets clipped into a hard-edged box on iPhones */}
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 bg-[radial-gradient(closest-side,rgba(224,187,138,0.35),transparent)]" aria-hidden />
      <div className="pointer-events-none absolute -right-40 top-60 h-[28rem] w-[28rem] bg-[radial-gradient(closest-side,rgba(176,122,70,0.18),transparent)]" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 text-center lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-paper/70 px-3 py-1.5 text-xs text-ink-soft backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bronze/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-bronze" />
          </span>
          Now in preview for Pakistani advocates & chambers
        </motion.p>

        <h1 className="mx-auto max-w-7xl text-balance text-[1.8rem] font-extrabold uppercase leading-[1.06] tracking-tight sm:text-[2.75rem] lg:text-[3.4rem]">
          <WordsReveal text="Pakistan’s first unified platform" />{' '}
          {/* Two lines from tablet up; on phones the headline balances itself into even lines */}
          <br className="hidden sm:inline" />
          <WordsReveal text="for legal knowledge and practice." wordClassName="bronze-text" delay={0.3} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.6 }}
          className="mx-auto mt-6 max-w-2xl text-base text-ink-soft sm:text-lg"
        >
          Cases, cause lists, laws, judgments, drafting and an AI assistant — in one secure dashboard for you and your chamber. From the
          Supreme Court to the civil courts.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.75 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Link
            href="/signup/"
            className="group inline-flex items-center gap-2 rounded-md bg-night px-6 py-3.5 text-sm font-medium text-ivory shadow-xl shadow-night/25 transition hover:-translate-y-0.5"
          >
            Start free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/app/"
            className="inline-flex items-center gap-2 rounded-md border border-ink/15 bg-paper/80 px-6 py-3.5 text-sm font-medium backdrop-blur transition hover:-translate-y-0.5 hover:bg-paper"
          >
            <Play className="h-4 w-4 text-bronze" /> Explore the live demo
          </Link>
        </motion.div>
      </div>

      {/* Stage: calligraphy mark + statue + side notes */}
      <div className="relative mx-auto mt-10 max-w-7xl px-4 lg:px-8">
        {/* The Urdu calligraphy mark beside the statue; it drifts and turns gently as you scroll */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, x: -30, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.8, ease: EASE, delay: 0.6 }}
          className="pointer-events-none absolute bottom-6 right-1/2 mr-[9rem] hidden h-[26rem] w-[28rem] lg:block"
        >
          <motion.div style={{ rotate: markRotate, y: markY, x: wordX }} className="h-full w-full">
            <BrandMark className="h-full w-full bg-bronze/[0.09]" />
          </motion.div>
        </motion.div>

        <div className="relative grid items-end gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.9 }}
            className="order-2 hidden pb-24 text-left text-sm text-ink-soft lg:order-1 lg:block"
          >
            <p className="max-w-[230px]">
              Built with practising advocates for <span className="font-semibold text-ink">every Pakistani court</span> — hearings,
              precedents and paperwork, finally in one place.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-ok">
              <ShieldCheck className="h-4 w-4" /> Private to your chamber
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
            className="relative order-1 mx-auto h-[380px] w-[280px] overflow-hidden rounded-t-[999px] border border-line/60 shadow-[0_40px_120px_-30px_rgba(110,68,35,0.55)] sm:h-[460px] sm:w-[340px] lg:order-2"
          >
            {/* Taller than the arch so the parallax drift never uncovers an empty strip at the top */}
            <motion.div style={{ y: imgY, scale: imgScale }} className="absolute inset-x-0 -top-[24%] bottom-0 origin-bottom">
              <Image src={IMG.justice} alt="Bronze statue of Lady Justice holding the scales" fill priority sizes="340px" className="object-cover object-[68%_30%] [filter:sepia(.55)_saturate(1.25)_contrast(1.05)_brightness(.98)]" />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/10 to-transparent" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 1 }}
            className="order-3 hidden justify-end gap-4 pb-24 lg:flex"
          >
            <Laurel title="Made for" sub="Pakistani courts" />
            <Laurel title="Every legal resource" sub="in one place" />
          </motion.div>
        </div>

        <div className="relative -mt-14 flex justify-center pb-10">
          <ScrollBadge />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl justify-center gap-6 px-4 pb-4 text-xs text-ink-soft lg:hidden">
        <span className="inline-flex items-center gap-1.5">
          <Award className="h-4 w-4 text-bronze" /> Made for Pakistani courts
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-ok" /> Private to your chamber
        </span>
      </div>
    </section>
  );
}
