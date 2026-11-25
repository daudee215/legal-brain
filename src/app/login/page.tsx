'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthCard } from '../../components/marketing/AuthCard';
import { DemoNote, Field, FormError, NotConfigured } from '../../components/marketing/AuthBits';
import { btn } from '../../components/ui';
import { currentUser, signIn, signOut } from '../../lib/cloud/chamber';
import { cloudEnabled, friendlyError } from '../../lib/cloud/client';
import { needsMfa } from '../../lib/cloud/mfa';
import { MfaChallenge } from '../../components/shell/MfaChallenge';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [signedIn, setSignedIn] = useState<string | null>(null);
  const [needCode, setNeedCode] = useState(false);

  useEffect(() => {
    if (cloudEnabled) void currentUser().then((u) => setSignedIn(u?.email ?? null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await signIn(email, password);
      // Two-step sign-in on for this account: ask for the code before going in. Otherwise straight in, as before.
      if (await needsMfa().catch(() => false)) {
        setNeedCode(true);
        setBusy(false);
        return;
      }
      router.push('/app/');
    } catch (x) {
      setErr(friendlyError(x));
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your chamber."
      footer={
        <>
          New to Wakeel Pro?{' '}
          <Link href="/signup/" className="font-medium text-bronze hover:underline">
            Create an account
          </Link>
        </>
      }
      note={cloudEnabled ? <DemoNote /> : undefined}
    >
      {!cloudEnabled ? (
        <NotConfigured />
      ) : needCode ? (
        <MfaChallenge
          email={email.trim()}
          onVerified={() => router.push('/app/')}
          onSignOut={async () => {
            await signOut();
            setNeedCode(false);
            setPassword('');
          }}
        />
      ) : signedIn ? (
        <div className="space-y-4 text-sm">
          <p>
            You are signed in as <strong>{signedIn}</strong>.
          </p>
          <div className="flex gap-2">
            <Link href="/app/" className={`${btn.primary} flex-1 py-2.5`}>
              Open my chamber
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
          <Field label="Email" type="email" required placeholder="you@chamber.pk" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="-mt-2 text-end text-sm">
            <Link href="/forgot/" className="font-medium text-bronze hover:underline">
              Forgot password?
            </Link>
          </p>
          <FormError msg={err} />
          <button type="submit" disabled={busy} className={`${btn.primary} w-full py-2.5`}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
