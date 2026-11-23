'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthCard } from '../../components/marketing/AuthCard';
import { DemoNote, Field, FormError, NotConfigured } from '../../components/marketing/AuthBits';
import { btn } from '../../components/ui';
import { chooseChamber, createChamber, currentUser, signOut, signUp } from '../../lib/cloud/chamber';
import { cloudEnabled, friendlyError } from '../../lib/cloud/client';
import { uploadLocal } from '../../lib/cloud/sync';
import { getDb, getMode } from '../../lib/store';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [chamber, setChamber] = useState('');
  const [bring, setBring] = useState(false);
  const [mine, setMine] = useState<{ cases: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [signedIn, setSignedIn] = useState<string | null>(null);

  useEffect(() => {
    if (getMode() === 'mine') {
      setMine({ cases: getDb().cases.length });
      setBring(true);
    }
    if (cloudEnabled) void currentUser().then((u) => setSignedIn(u?.email ?? null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    let step = 'account';
    try {
      await signUp(name, email, password);
      step = 'chamber';
      const id = await createChamber(chamber, name);
      if (bring && mine) {
        step = 'upload';
        await uploadLocal(id);
      }
      chooseChamber(id);
      router.push('/app/');
    } catch (x) {
      const m = friendlyError(x);
      setErr(step === 'account' ? m : step === 'chamber' ? `Your account was created, but the chamber was not: ${m} Open the app to try again.` : `Chamber created, but this device’s cases were not copied: ${m}`);
      if (step === 'upload') router.push('/app/');
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Create your chamber"
      subtitle="One shared, private copy of your practice for every lawyer and clerk in your chamber."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login/" className="font-medium text-bronze hover:underline">
            Log in
          </Link>
          <br />
          Got an invite link from your chamber? Open that link to join.
        </>
      }
      note={cloudEnabled ? <DemoNote /> : undefined}
    >
      {!cloudEnabled ? (
        <NotConfigured />
      ) : signedIn ? (
        <div className="space-y-4 text-sm">
          <p>
            You are already signed in as <strong>{signedIn}</strong>.
          </p>
          <div className="flex gap-2">
            <Link href="/app/" className={`${btn.primary} flex-1 py-2.5`}>
              Open the app
            </Link>
            <button
              type="button"
              className={btn.ghost}
              onClick={async () => {
                await signOut();
                setSignedIn(null);
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Your full name" required maxLength={120} placeholder="Advocate's full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Email" type="email" required placeholder="you@chamber.pk" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field
            label="Password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            hint="At least 6 characters."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Field label="Chamber name" required maxLength={120} placeholder="e.g. Khan & Associates" value={chamber} onChange={(e) => setChamber(e.target.value)} />
          {mine && (
            <label className="flex items-start gap-2 rounded-lg border border-line bg-cream/60 p-3 text-sm">
              <input type="checkbox" className="mt-1 accent-bronze" checked={bring} onChange={(e) => setBring(e.target.checked)} />
              <span>
                Bring this device&apos;s cases into the new chamber
                <span className="block text-xs text-ink-soft">
                  {mine.cases} case{mine.cases === 1 ? '' : 's'} with their clients, diary, fees and tasks. Your copy on this device is kept as it is.
                </span>
              </span>
            </label>
          )}
          <FormError msg={err} />
          <button type="submit" disabled={busy} className={`${btn.primary} w-full py-2.5`}>
            {busy ? 'Creating your chamber…' : 'Create account & chamber'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
