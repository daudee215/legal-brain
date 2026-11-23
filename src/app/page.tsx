import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  FilePen,
  FolderLock,
  Gavel,
  Library,
  Newspaper,
  NotebookPen,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { Logo } from '../components/shell/Logo';

const FEATURES = [
  { icon: BookOpen, title: 'Laws & Statutes Library', body: 'Federal and provincial Acts, Rules and the Constitution — searchable to the section.' },
  { icon: Gavel, title: 'Case Law Database', body: 'Judgments from the Supreme Court, FCC and High Courts, searchable by issue, section or party.' },
  { icon: CalendarDays, title: 'Daily Cause Lists', body: 'See which of your cases are fixed today and tomorrow — court, bench, room and serial number.' },
  { icon: Briefcase, title: 'Case & Client Management', body: 'Every case, client, hearing date, order and result in one timeline.' },
  { icon: FilePen, title: 'Legal Drafting Templates', body: 'Bail petitions, plaints, writs and vakalatnamas — fill the form, get a court-ready draft.' },
  { icon: Sparkles, title: 'AI Legal Assistant', body: 'Ask questions and prepare cases from your own documents and Pakistani law, with citations.' },
  { icon: Newspaper, title: 'Legal News & Alerts', body: 'Hearing reminders, new judgments relevant to your matters and legal news.' },
  { icon: NotebookPen, title: 'Digital Diary', body: 'Your court diary, notes and follow-ups — never lose a date again.' },
  { icon: Library, title: 'Your Law Books, Searchable', body: 'Upload books you own to a private shelf and search across all of them.' },
  { icon: FolderLock, title: 'Secure Document Storage', body: 'Pleadings, orders and evidence, private to your chamber and encrypted.' },
];

const COURTS = ['Supreme Court', 'Federal Constitutional Court', 'Lahore HC', 'Islamabad HC', 'Sindh HC', 'Peshawar HC', 'Balochistan HC', 'District Courts'];

const ROLES = [
  { role: 'Senior Advocate', body: 'Runs the chamber. Sees everything, invites members, manages billing.' },
  { role: 'Junior', body: 'Works on cases, drafts, diary and documents alongside the senior.' },
  { role: 'Clerk', body: 'Keeps dates, cause lists, diary and file uploads up to date.' },
];

export default function Landing() {
  return (
    <div className="overflow-x-hidden bg-cream">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-ink-soft md:flex" aria-label="Site">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#chambers" className="hover:text-ink">For Chambers</a>
          <a href="#courts" className="hover:text-ink">Courts</a>
          <Link href="/login/" className="hover:text-ink">Log in</Link>
        </nav>
        <Link href="/signup/" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-cream hover:bg-ink/90">
          Get started
        </Link>
      </header>

      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-10 text-center lg:px-8 lg:pt-16">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-bronze" /> Built for Pakistani lawyers
        </p>
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-6xl">
          Your entire practice.
          <br />
          One brain.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-ink-soft">
          Cases, cause lists, laws, judgments, drafting and an AI assistant — in one secure dashboard for you and your chamber.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/signup/" className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-medium text-cream hover:bg-ink/90">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/app/" className="rounded-md border border-ink/20 bg-paper px-5 py-3 text-sm font-medium hover:bg-white">
            View the demo dashboard
          </Link>
        </div>

        <div className="relative mt-12">
          <p
            aria-hidden
            className="pointer-events-none select-none whitespace-nowrap font-serif text-[13vw] font-extrabold leading-none tracking-tight text-ink/[0.05] lg:text-[200px]"
          >
            LEGAL BRAIN
          </p>
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-40 w-40 place-items-center rounded-full bg-gradient-to-b from-bronze-soft/50 to-bronze/20 shadow-[0_30px_80px_-20px_rgba(140,94,52,0.6)] sm:h-56 sm:w-56">
              <Scale className="h-20 w-20 text-bronze sm:h-28 sm:w-28" strokeWidth={1.2} aria-hidden />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 text-center lg:px-8">
        <p className="font-serif text-2xl leading-snug text-ink/40 sm:text-4xl">
          From the first hearing to the final order, Legal Brain keeps <span className="text-ink">every date, every document and every precedent</span> one search
          away — so you can focus on arguing, not on paperwork.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-6 border-y border-line px-4 py-8 text-left sm:grid-cols-4 lg:px-8">
        {[
          ['10', 'Tools in one place'],
          ['7+', 'Superior courts covered'],
          ['24/7', 'Access from court or home'],
          ['3', 'Chamber roles'],
        ].map(([n, l]) => (
          <div key={l} className="border-l border-line pl-4">
            <p className="font-serif text-3xl font-bold">{n}</p>
            <p className="text-xs text-ink-soft">{l}</p>
          </div>
        ))}
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">Everything a practising lawyer needs</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-soft">No more stacks of files, missed dates or hunting for a judgment you read last year.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-line bg-paper p-5">
              <Icon className="h-6 w-6 text-bronze" aria-hidden />
              <h3 className="mt-3 font-serif text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="courts" className="bg-ink py-14 text-cream">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-cream">Built around Pakistani courts</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-cream/70">
            Cases organised by the court they are in, with one-click links to each court&apos;s official case status and cause list.
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-3">
            {COURTS.map((c) => (
              <li key={c} className="rounded-full border border-white/15 px-4 py-2 text-sm text-cream/90">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="chambers" className="mx-auto max-w-6xl px-4 py-16 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Users className="h-8 w-8 text-bronze" aria-hidden />
            <h2 className="mt-3 text-3xl font-bold">Made for chambers, not just individuals</h2>
            <p className="mt-3 text-ink-soft">
              Invite your juniors and clerk. Everyone sees the same cases and dates, each with the access their role needs — and your clients&apos; data never
              leaves your chamber.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-ok">
              <ShieldCheck className="h-4 w-4" /> Private per chamber · two-step login · encrypted storage
            </p>
          </div>
          <div className="space-y-3">
            {ROLES.map((r) => (
              <div key={r.role} className="rounded-2xl border border-line bg-paper p-5">
                <p className="font-serif text-lg font-semibold">{r.role}</p>
                <p className="text-sm text-ink-soft">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 lg:px-8">
        <div className="rounded-3xl bg-bronze px-6 py-12 text-center text-cream">
          <h2 className="text-3xl font-bold text-cream">Bring your practice online</h2>
          <p className="mx-auto mt-2 max-w-xl text-cream/85">Set up your chamber in minutes. Your first cases can be in before your next hearing.</p>
          <Link href="/signup/" className="mt-6 inline-flex items-center gap-2 rounded-md bg-cream px-5 py-3 text-sm font-medium text-ink hover:bg-white">
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-ink-soft lg:px-8">
          <Logo />
          <p>© {new Date().getFullYear()} Legal Brain · wakeelpropk.com · Draft preview</p>
        </div>
      </footer>
    </div>
  );
}
