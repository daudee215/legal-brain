'use client';

import { CloudOff } from 'lucide-react';
import Link from 'next/link';
import { btn, inputCls } from '../ui';

/** Small print under the auth card when real accounts are on. */
export function DemoNote() {
  return (
    <>
      Just looking?{' '}
      <Link href="/app/" className="font-medium text-bronze hover:underline">
        Explore the demo
      </Link>{' '}
      — no account needed. Nothing you type in the demo leaves this device.
    </>
  );
}

/** Shown on the auth pages when this build has no Supabase project configured. */
export function NotConfigured() {
  return (
    <div className="space-y-4 text-sm">
      <p className="flex items-start gap-2">
        <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-bronze" aria-hidden />
        <span>
          <strong>Accounts aren’t switched on for this copy of Wakeel Pro.</strong> Cloud sync needs a Supabase project (NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY at build time).
        </span>
      </p>
      <p className="text-ink-soft">You can still use everything on this device — your practice is saved privately in this browser.</p>
      <Link href="/app/" className={`${btn.primary} w-full py-2.5`}>
        Explore the demo
      </Link>
    </div>
  );
}

export function Field({
  label,
  hint,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input className={inputCls} {...input} />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function FormError({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
      {msg}
    </p>
  );
}
