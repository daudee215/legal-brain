'use client';

import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  FilePen,
  FolderLock,
  Gavel,
  Library,
  Minus,
  Newspaper,
  NotebookPen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { CountUp, GlowCard, Reveal } from '../motion';
import { BrandMark, Logo } from '../shell/Logo';
import { IMG } from './images';

/* ---------- Statement: words light up as you scroll ---------- */
function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.25em] inline-block">
      {children}
    </motion.span>
  );
}

export function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.35'] });
  const text =
    'Wakeel Pro is your trusted legal companion, bringing every document, record and precedent together to help you manage, navigate and organise your cases with ease.';
  const words = text.split(' ');
  // The mark "inks in" behind the words as they light up: fades, turns upright and settles.
  const markOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [0, 0.07, 0.055]);
  const markRotate = useTransform(scrollYProgress, [0, 1], [-14, 0]);
  const markScale = useTransform(scrollYProgress, [0, 1], [0.82, 1.04]);
  const markY = useTransform(scrollYProgress, [0, 1], ['8%', '-6%']);
  return (
    <section id="statement" className="relative mx-auto max-w-5xl px-4 py-24 text-center lg:px-8 lg:py-32">
      <motion.div
        aria-hidden
        style={{ opacity: markOpacity, rotate: markRotate, scale: markScale, y: markY }}
        className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto -mt-[13rem] h-[26rem] w-[26rem] sm:-mt-[17rem] sm:h-[34rem] sm:w-[34rem]"
      >
        <BrandMark className="h-full w-full bg-bronze" />
      </motion.div>
      <div ref={ref} className="relative font-serif text-3xl font-medium leading-tight sm:text-5xl">
        {words.map((w, i) => (
          <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
            {w}
          </Word>
        ))}
      </div>
    </section>
  );
}

/* ---------- Stats ---------- */
export function Stats() {
  const stats: [number, string, string][] = [
    [10, '', 'Tools in one dashboard'],
    [7, '+', 'Superior courts organised'],
    [995, '+', 'Federal laws to index'],
    [3, '', 'Chamber roles built in'],
  ];
  return (
    <section className="border-y border-line bg-paper/60">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-4 py-10 lg:grid-cols-4 lg:px-8">
        {stats.map(([n, s, l], i) => (
          <Reveal key={l} delay={i * 0.08} className="border-l border-line pl-5">
            <p className="font-serif text-4xl font-bold sm:text-5xl">
              <CountUp to={n} suffix={s} />
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-ink-soft">{l}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Product preview (tilts flat on scroll) ---------- */
function MiniDashboard() {
  const rows = [
    ['09:00', 'LHC · Ct 12', 'Muhammad Usman v. The State', 'Arguments on bail'],
    ['10:30', 'Family Ct-III', 'Fatima Bibi v. Kamran Ali', 'Evidence'],
    ['11:00', 'LHC · Ct 21', 'Zahid Traders v. Federation', 'Reply awaited'],
  ];
  const bars = [38, 64, 46, 82, 58, 92, 70, 54, 76, 60, 88, 72];
  return (
    <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#1a120c] text-left text-ivory shadow-2xl md:grid-cols-[190px_1fr]">
      <aside className="hidden border-r border-white/10 p-4 md:block">
        <Logo light />
        <ul className="mt-6 space-y-1 text-xs text-ivory/70">
          {['Dashboard', 'Cause List', 'Cases & Clients', 'Case Law', 'Drafting', 'AI Assistant', 'Diary'].map((l, i) => (
            <li key={l} className={`rounded-md px-2.5 py-1.5 ${i === 0 ? 'bg-ivory font-semibold text-night' : ''}`}>
              {l}
            </li>
          ))}
        </ul>
      </aside>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-ivory/50">
          <Search className="h-3.5 w-3.5" /> Search anything… <span className="ml-auto rounded border border-white/15 px-1.5">Ctrl K</span>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-[#3a2a1d] to-[#2a1d13] p-5">
          <p className="text-[11px] uppercase tracking-widest text-bronze-soft">Good morning</p>
          <p className="mt-1 font-serif text-2xl font-bold">Advocate Ayesha</p>
          <p className="mt-1 text-xs text-ivory/60">3 hearings today · 5 this week · 2 deadlines</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['12', 'Active cases'],
            ['3', 'Today'],
            ['Rs 1.2M', 'Fees pending'],
          ].map(([v, l]) => (
            <div key={l} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="font-serif text-lg font-bold sm:text-xl">{v}</p>
              <p className="text-[10px] text-ivory/50">{l}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
          <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
            {rows.map(([t, c, title]) => (
              <div key={title} className="flex items-center gap-3 text-xs">
                <span className="w-10 font-semibold text-bronze-soft">{t}</span>
                <span className="min-w-0 flex-1 truncate">{title}</span>
                <span className="hidden text-ivory/40 sm:inline">{c}</span>
              </div>
            ))}
          </div>
          <div className="flex h-24 items-end gap-1 rounded-lg border border-white/10 bg-white/5 p-3 sm:h-auto">
            {bars.map((h, i) => (
              <motion.span
                key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-[#8c5e34] to-[#e0bb8a]"
                initial={{ height: 4 }}
                whileInView={{ height: `${h}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.04 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  return (
    <section id="preview" className="relative overflow-hidden bg-night py-24 text-ivory">
      <div className="pointer-events-none absolute left-1/2 top-40 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-bronze/25 blur-[120px]" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-bronze-soft">The dashboard</p>
          <h2 className="mt-3 text-4xl font-bold text-ivory sm:text-5xl">Your day in court, at a glance</h2>
          <p className="mx-auto mt-4 max-w-2xl text-ivory/65">
            Open Wakeel Pro in the morning and know exactly where to be, what&apos;s pending and what to read — on your laptop or your phone.
          </p>
        </Reveal>
        <div ref={ref} className="mt-14 [perspective:1400px]">
          <motion.div style={{ rotateX, scale, transformOrigin: 'center top' }}>
            <MiniDashboard />
          </motion.div>
        </div>
        <div className="mt-10 text-center">
          <Link href="/app/" className="inline-flex items-center gap-2 rounded-md bg-ivory px-6 py-3 text-sm font-medium text-night transition hover:-translate-y-0.5">
            Open the live demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Feature bento ---------- */
const FEATURES = [
  { icon: CalendarDays, title: 'Daily cause lists', body: 'Which of your cases are fixed today — court, bench, room and serial number, grouped and ready.', span: 'lg:col-span-2', img: IMG.justiceTexture },
  { icon: Sparkles, title: 'AI legal assistant', body: 'Ask in plain language. Answers cite the exact section or judgment, drawn from your own documents.', span: '' },
  { icon: Briefcase, title: 'Case & client management', body: 'Every matter, hearing, order and fee in one timeline — table or board view.', span: '' },
  { icon: FilePen, title: 'Drafting in minutes', body: 'Bail petitions, plaints, writs, vakalatnamas — fill once, print a court-ready draft.', span: 'lg:col-span-2', img: IMG.signing },
  { icon: BookOpen, title: 'Laws & statutes', body: 'Federal and provincial Acts, Rules and the Constitution, searchable to the section.', span: '' },
  { icon: Gavel, title: 'Case law database', body: 'Judgments from the Supreme Court, FCC and High Courts by issue, section or party.', span: '' },
  { icon: Bell, title: 'Alerts & news', body: 'Hearing reminders the night before, new judgments relevant to your matters.', span: '' },
  { icon: NotebookPen, title: 'Digital diary', body: 'Your court diary, notes and follow-ups — never lose a date again.', span: '' },
  { icon: Library, title: 'Your law books', body: 'Upload books you own to a private shelf and search across every page.', span: '' },
  { icon: FolderLock, title: 'Secure documents', body: 'Pleadings, orders and evidence — private to your chamber, encrypted.', span: 'lg:col-span-2' },
  { icon: Newspaper, title: 'Limitation & tools', body: 'Deadline calculator and more daily-practice tools.', span: '' },
];

export function Bento() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-bronze">Everything in one place</p>
        <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Ten tools. One login. Zero paper chasing.</h2>
      </Reveal>
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body, span, img }, i) => (
          <Reveal key={title} delay={(i % 4) * 0.06} className={span}>
            <GlowCard className="group relative h-full overflow-hidden card-fx rounded-2xl border border-line bg-paper p-6 transition-transform duration-300 hover:-translate-y-1">
              {img && (
                <div className="absolute inset-y-0 right-0 hidden w-1/2 sm:block" aria-hidden>
                  <Image src={img} alt="" fill sizes="400px" className="object-cover opacity-80 transition duration-700 [filter:sepia(.5)] group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/70 to-transparent" />
                </div>
              )}
              <div className={`relative ${img ? 'sm:max-w-[55%]' : ''}`}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-night text-bronze-soft transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-serif text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            </GlowCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Courts marquee ---------- */
const COURTS = ['Supreme Court of Pakistan', 'Federal Constitutional Court', 'Lahore High Court', 'Islamabad High Court', 'Sindh High Court', 'Peshawar High Court', 'Balochistan High Court', 'Federal Shariat Court', 'District & Sessions Courts', 'Family Courts', 'Banking Courts', 'Rent Tribunals'];

export function CourtsMarquee() {
  const row = [...COURTS, ...COURTS];
  return (
    <section className="overflow-hidden border-y border-line bg-paper/50 py-8" aria-label="Courts supported">
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">Organised around the courts you appear in</p>
      <div className="relative [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {row.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-3 font-serif text-2xl text-ink/70">
              <span className="text-bronze">✦</span> {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Chambers ---------- */
export function Chambers() {
  const roles = [
    ['Senior Advocate', 'Runs the chamber. Sees everything, invites members, manages billing.'],
    ['Junior', 'Works on cases, drafts, diary and documents alongside the senior.'],
    ['Clerk', 'Keeps dates, cause lists, diary and file uploads up to date.'],
  ];
  return (
    <section id="chambers" className="relative overflow-hidden py-24">
      <div className="absolute inset-0" aria-hidden>
        <Image src={IMG.library} alt="" fill sizes="100vw" className="object-cover [filter:sepia(.6)_brightness(.35)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/40" />
      </div>
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <Users className="h-9 w-9 text-bronze-soft" />
          <h2 className="mt-4 text-4xl font-bold text-ivory sm:text-5xl">Made for chambers, not just individuals</h2>
          <p className="mt-4 max-w-lg text-ivory/70">
            Invite your juniors and clerk. Everyone sees the same cases and dates with exactly the access their role needs — and your
            clients&apos; data never leaves your chamber.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-ivory/80">
            {['Private per chamber', 'Two-step login', 'Encrypted document storage', 'Full activity history'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-ok" /> {t}
              </li>
            ))}
          </ul>
        </Reveal>
        <div className="space-y-4">
          {roles.map(([r, b], i) => (
            <Reveal key={r} delay={i * 0.12}>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition hover:bg-white/10">
                <div className="flex items-center justify-between">
                  <p className="font-serif text-2xl font-semibold text-ivory">{r}</p>
                  <span className="font-serif text-4xl text-white/10">0{i + 1}</span>
                </div>
                <p className="mt-1 text-sm text-ivory/65">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
export function HowItWorks() {
  const steps = [
    ['Create your chamber', 'Sign up with your bar council and licence number. Invite juniors and your clerk.'],
    ['Add your cases', 'Case number, court, next date, client — two minutes each. Import from Excel later.'],
    ['Walk into court ready', 'Morning cause list, reminders the night before, drafts and precedents one tap away.'],
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
      <Reveal className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-bronze">How it works</p>
        <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Up and running before your next hearing</h2>
      </Reveal>
      <div className="relative mt-14 grid gap-6 md:grid-cols-3">
        <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-bronze/40 to-transparent md:block" aria-hidden />
        {steps.map(([t, b], i) => (
          <Reveal key={t} delay={i * 0.15} className="relative text-center">
            <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-full border border-bronze/30 bg-paper font-serif text-2xl font-bold text-bronze shadow-lg">
              {i + 1}
            </span>
            <h3 className="mt-5 font-serif text-2xl font-semibold">{t}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">{b}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Pricing preview ---------- */
export function Pricing() {
  const plans = [
    { id: 'solo', name: 'Solo', tag: 'For individual advocates', cta: 'Start solo', feats: ['Just you — one private login', 'Unlimited cases & clients', 'Cause list, laws & case law', 'Drafting & AI assistant'] },
    { id: 'chamber', name: 'Chamber', tag: 'For seniors with juniors & clerks', cta: 'Create your chamber', feats: ['Everything in Solo', 'Up to 10 members & roles', 'Invite links for juniors & clerks', 'Shared documents & diary'], featured: true },
    { id: 'firm', name: 'Firm', tag: 'For multi-partner firms', cta: 'Set up your firm', feats: ['Everything in Chamber', 'Up to 20 members', 'Several senior partners', 'Data import & training'] },
  ];
  return (
    <section id="pricing" className="bg-paper/60 py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-bronze">Pricing</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Free while in preview</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">Launch pricing will be announced soon. Early chambers keep a founding discount.</p>
        </Reveal>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <div
                className={`relative h-full rounded-3xl border p-8 transition hover:-translate-y-1 ${
                  p.featured ? 'border-night bg-night text-ivory shadow-2xl shadow-night/30' : 'card-fx border-line bg-paper'
                }`}
              >
                {p.featured && <span className="absolute -top-3 left-8 rounded-full bg-bronze px-3 py-1 text-xs font-semibold text-ivory">Most popular</span>}
                <p className={`font-serif text-3xl font-bold ${p.featured ? 'text-ivory' : ''}`}>{p.name}</p>
                <p className={`mt-1 text-sm ${p.featured ? 'text-ivory/60' : 'text-ink-soft'}`}>{p.tag}</p>
                <p className="mt-6 font-serif text-4xl font-bold">
                  Free <span className={`text-sm font-normal ${p.featured ? 'text-ivory/60' : 'text-ink-soft'}`}>during preview</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {p.feats.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className={`h-4 w-4 ${p.featured ? 'text-bronze-soft' : 'text-bronze'}`} /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/signup/?plan=${p.id}`}
                  className={`mt-8 block rounded-md px-4 py-3 text-center text-sm font-medium transition ${
                    p.featured ? 'bg-ivory text-night hover:bg-white' : 'bg-night text-ivory hover:bg-night/90'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
const FAQS = [
  ['Is my clients’ data safe?', 'Every chamber’s data is private to that chamber, protected by two-step login, row-level security and encrypted storage. Nobody outside your chamber — including other lawyers on Wakeel Pro — can see it.'],
  ['Does it connect to the court websites?', 'Each case links straight to the official case-status page. Automatic syncing of published cause lists is rolling out court by court, starting with the High Courts.'],
  ['Can I use it on my phone in court?', 'Yes. Wakeel Pro works on any phone browser and can be installed on your home screen like an app.'],
  ['Can I upload my own law books and templates?', 'Yes. Your templates and books go on a private shelf for your chamber only, and become fully searchable.'],
  ['Does the AI give legal advice?', 'No. It helps you research and prepare, always citing its sources so you can verify. The judgment is always yours.'],
  ['Will it support Urdu?', 'Urdu search and Urdu drafts are on the roadmap.'],
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-24 lg:px-8">
      <Reveal className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-bronze">FAQ</p>
        <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Questions advocates ask</h2>
      </Reveal>
      <div className="mt-12 divide-y divide-line border-y border-line">
        {FAQS.map(([q, a], i) => (
          <div key={q}>
            <button className="flex w-full items-center justify-between gap-4 py-5 text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span className="font-serif text-lg font-semibold">{q}</span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line">
                {open === i ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                  <p className="pb-5 text-ink-soft">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- CTA + footer ---------- */
export function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] px-6 py-20 text-center text-ivory">
          <Image src={IMG.books} alt="" fill sizes="100vw" className="object-cover [filter:sepia(.7)_brightness(.4)]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#8c5e34]/80 to-night/90" />
          <div className="relative">
            <h2 className="mx-auto max-w-3xl text-4xl font-bold text-ivory sm:text-6xl">Bring your practice online.</h2>
            <p className="mx-auto mt-4 max-w-xl text-ivory/80">Set up your chamber in minutes. Your first cases can be in before your next hearing.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup/" className="group inline-flex items-center gap-2 rounded-md bg-ivory px-6 py-3.5 text-sm font-medium text-night transition hover:-translate-y-0.5">
                Create your account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/app/" className="rounded-md border border-white/30 px-6 py-3.5 text-sm font-medium text-ivory transition hover:bg-white/10">
                Try the demo
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  const cols: [string, [string, string][]][] = [
    ['Product', [['#features', 'Features'], ['#preview', 'Dashboard'], ['#pricing', 'Pricing'], ['/app/', 'Live demo']]],
    ['Chambers', [['#chambers', 'Roles'], ['/signup/', 'Create a chamber'], ['/login/', 'Log in']]],
    ['Help', [['#faq', 'FAQ'], ['mailto:hello@wakeelpropk.com', 'Contact']]],
  ];
  return (
    <footer className="relative overflow-hidden border-t border-line bg-paper/60">
      <motion.div
        aria-hidden
        initial={{ opacity: 0, rotate: -12, x: 40 }}
        whileInView={{ opacity: 1, rotate: -4, x: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute -bottom-20 -right-16 h-80 w-80 sm:h-96 sm:w-96"
      >
        <BrandMark className="h-full w-full bg-bronze/[0.06]" />
      </motion.div>
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-ink-soft">The practice dashboard for Pakistani advocates and chambers.</p>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{h}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {links.map(([href, l]) => (
                <li key={l}>
                  <a href={href} className="hover:text-bronze">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-ink-soft lg:px-8">
          <p>© {new Date().getFullYear()} Wakeel Pro · wakeelpropk.com · Preview</p>
          <p>Photography: Unsplash</p>
        </div>
      </div>
    </footer>
  );
}
