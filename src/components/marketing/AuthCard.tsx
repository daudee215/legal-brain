import Link from 'next/link';
import { Logo } from '../shell/Logo';

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <Link href="/">
          <Logo light />
        </Link>
        <div>
          <p className="font-serif text-4xl font-bold leading-tight text-cream">
            &ldquo;Every date, every document, every precedent — one search away.&rdquo;
          </p>
          <p className="mt-4 text-cream/60">Legal Brain for Pakistani advocates and chambers.</p>
        </div>
        <p className="text-xs text-cream/40">Draft preview</p>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/">
              <Logo />
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-ink-soft">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <p className="mt-6 text-sm text-ink-soft">{footer}</p>
          <p className="mt-4 rounded-lg border border-bronze/30 bg-bronze/10 px-3 py-2 text-xs text-ink">
            Demo — real accounts arrive in Phase 2. Any details take you to the demo dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
