'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthCard } from '../../components/marketing/AuthCard';
import { btn, inputCls } from '../../components/ui';

const BAR_COUNCILS = ['Punjab Bar Council', 'Sindh Bar Council', 'Khyber Pakhtunkhwa Bar Council', 'Balochistan Bar Council', 'Islamabad Bar Council', 'Pakistan Bar Council'];

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join'>('create');

  return (
    <AuthCard
      title="Create your account"
      subtitle="Set up your chamber or join one you've been invited to."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login/" className="font-medium text-bronze hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          router.push('/app/');
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Full name</span>
            <input className={inputCls} placeholder="Advocate's full name" autoComplete="name" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input type="email" className={inputCls} placeholder="you@chamber.pk" autoComplete="email" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Mobile</span>
            <input type="tel" className={inputCls} placeholder="03xx-xxxxxxx" autoComplete="tel" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Bar council</span>
            <select className={inputCls} defaultValue="">
              <option value="" disabled>
                Select…
              </option>
              {BAR_COUNCILS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Licence / enrolment no.</span>
            <input className={inputCls} placeholder="e.g. LHC/12345" />
          </label>
        </div>

        <fieldset className="rounded-xl border border-line p-3">
          <legend className="px-1 text-sm font-medium">Chamber</legend>
          <div className="flex gap-2">
            {(['create', 'join'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === m ? 'bg-night text-ivory' : 'bg-paper text-ink hover:bg-line/50'}`}
              >
                {m === 'create' ? 'Create a chamber' : 'Join with invite code'}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium">{mode === 'create' ? 'Chamber name' : 'Invite code'}</span>
            <input className={inputCls} placeholder={mode === 'create' ? 'e.g. Khan & Associates' : 'e.g. LB-7Q2X'} />
          </label>
        </fieldset>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input type="password" className={inputCls} autoComplete="new-password" />
        </label>
        <button type="submit" className={`${btn.primary} w-full py-2.5`}>
          Create account
        </button>
      </form>
    </AuthCard>
  );
}
