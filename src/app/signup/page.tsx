'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthCard } from '../../components/marketing/AuthCard';
import { DemoNote, Field, FormError, NotConfigured } from '../../components/marketing/AuthBits';
import { btn } from '../../components/ui';
import { chooseChamber, createChamber, currentUser, signOut, signUp } from '../../lib/cloud/chamber';
import { cloudEnabled, friendlyError } from '../../lib/cloud/client';
import { bringSummary } from '../../lib/cloud/storage';
import { uploadLocal } from '../../lib/cloud/sync';
import { isPlan, PLAN_IDS, PLANS, type Plan } from '../../lib/plans';
import { getDb, getMode } from '../../lib/store';

const COPY: Record<Plan, { title: string; subtitle: string; button: string; busy: string }> = {
  solo: {
    title: 'Start your solo practice',
    subtitle: 'Everything for one advocate — cases, cause lists, laws, drafting and the AI assistant. Private to you.',
    button: 'Create my account',
    busy: 'Setting up your practice…',
  },
  chamber: {
    title: 'Create your chamber',
    subtitle: 'One shared, private copy of your practice for you, your juniors and clerks — up to 10 people.',
    button: 'Create account & chamber',
    busy: 'Creating your chamber…',
  },
  firm: {
    title: 'Set up your firm',
    subtitle: 'One private workspace for partners, associates and staff — up to 20 people, each with their own login.',
    button: 'Create account & firm',
    busy: 'Setting up your firm…',
  },
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [chamber, setChamber] = useState('');
  const [plan, setPlan] = useState<Plan>('chamber');
  const [bring, setBring] = useState(false);
  const [mine, setMine] = useState<{ cases: number; files: number } | null>(null);
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [signedIn, setSignedIn] = useState<string | null>(null);

  useEffect(() => {
    // The pricing cards link here with ?plan=solo|chamber|firm
    const p = new URLSearchParams(window.location.search).get('plan');
    if (isPlan(p)) setPlan(p);
    if (getMode() === 'mine') {
      setMine({ cases: getDb().cases.length, files: getDb().docs.filter((d) => d.blobKey).length });
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
      // A solo advocate's letterhead name is optional: their own name stands in.
      const id = await createChamber(chamber.trim() || `Adv. ${name.trim()}`, name, plan);
      if (bring && mine) {
        step = 'upload';
        const files = await uploadLocal(id, { onFileProgress: (p) => p.total && setProgress(`Uploading files: ${Math.min(p.done + 1, p.total)} of ${p.total}…`) });
        if (files.total) {
          setProgress(bringSummary(files));
          await new Promise((r) => setTimeout(r, files.uploaded === files.total ? 1200 : 4000));
        }
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
      title={COPY[plan].title}
      subtitle={COPY[plan].subtitle}
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login/" className="font-medium text-bronze hover:underline">
            Log in
          </Link>
          <br />
          Got an invite link from your chamber or firm? Open that link to join.
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
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Plan</legend>
            <div role="radiogroup" aria-label="Plan" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-cream/60 p-1">
              {PLAN_IDS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={plan === p}
                  onClick={() => setPlan(p)}
                  className={`rounded-lg px-2 py-2 text-center text-sm transition ${plan === p ? 'bg-night font-semibold text-ivory shadow' : 'text-ink-soft hover:bg-paper hover:text-ink'}`}
                >
                  {PLANS[p].name}
                  <span className={`block text-[11px] font-normal ${plan === p ? 'text-ivory/70' : 'text-ink-soft'}`}>
                    {PLANS[p].seats === 1 ? 'Just you' : `Up to ${PLANS[p].seats}`}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
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
          <Field
            label={PLANS[plan].orgLabel}
            required={plan !== 'solo'}
            maxLength={120}
            placeholder={PLANS[plan].orgPlaceholder}
            hint={plan === 'solo' ? 'Optional. Printed at the top of your receipts and briefs; your name is used if you leave it empty.' : undefined}
            value={chamber}
            onChange={(e) => setChamber(e.target.value)}
          />
          {mine && (
            <label className="flex items-start gap-2 rounded-lg border border-line bg-cream/60 p-3 text-sm">
              <input type="checkbox" className="mt-1 accent-bronze" checked={bring} onChange={(e) => setBring(e.target.checked)} />
              <span>
                Bring this device&apos;s cases into your new account
                <span className="block text-xs text-ink-soft">
                  {mine.cases} case{mine.cases === 1 ? '' : 's'} with their clients, diary, fees and tasks{mine.files ? `, and ${mine.files} uploaded file${mine.files === 1 ? '' : 's'}` : ''}. Your copy on this device is kept as it is.
                </span>
              </span>
            </label>
          )}
          <FormError msg={err} />
          {busy && progress && (
            <p role="status" className="rounded-lg bg-cream/70 px-3 py-2 text-sm text-ink">
              {progress}
            </p>
          )}
          <button type="submit" disabled={busy} className={`${btn.primary} w-full py-2.5`}>
            {busy ? COPY[plan].busy : COPY[plan].button}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
