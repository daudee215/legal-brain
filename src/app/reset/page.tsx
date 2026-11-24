'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthCard } from '../../components/marketing/AuthCard';
import { Field, FormError, NotConfigured } from '../../components/marketing/AuthBits';
import { btn } from '../../components/ui';
import { MfaChallenge } from '../../components/shell/MfaChallenge';
import { currentUser, setNewPassword, signOut } from '../../lib/cloud/chamber';
import { cloudEnabled, friendlyError, supabase } from '../../lib/cloud/client';
import { needsMfa } from '../../lib/cloud/mfa';

/** Where the emailed reset link lands. The link signs the person in; here they choose a new password. */
export default function ResetPage() {
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'mfa' | 'ready' | 'invalid'>('checking');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!cloudEnabled) return;
    // An expired or used link comes back with the error in the address.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.get('error') || query.get('error')) {
      setState('invalid');
      return;
    }
    let done = false;
    const ready = (mail: string) => {
      done = true;
      setEmail(mail);
      // Two-step sign-in on: the code comes first (a new password needs a fully signed-in session).
      // Deferred: this can run inside the auth callback, which must not call Supabase.
      setTimeout(() => void needsMfa().catch(() => false).then((m) => setState(m ? 'mfa' : 'ready')), 0);
    };
    const { data } = supabase().auth.onAuthStateChange((_e, session) => {
      if (session?.user) ready(session.user.email ?? '');
    });
    void currentUser().then((u) => u && ready(u.email));
    const t = setTimeout(() => !done && setState('invalid'), 6000);
    return () => {
      clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr('The two passwords don’t match.');
    setBusy(true);
    setErr('');
    try {
      await setNewPassword(pw);
      router.push('/app/');
    } catch (x) {
      setErr(friendlyError(x));
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Set a new password" subtitle={email ? `For ${email}` : 'Choose a password you’ll remember.'}
      footer={
        <>
          Need help?{' '}
          <Link href="/login/" className="font-medium text-bronze hover:underline">
            Back to log in
          </Link>
        </>
      }
    >
      {!cloudEnabled ? (
        <NotConfigured />
      ) : state === 'checking' ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
        </p>
      ) : state === 'invalid' ? (
        <div className="space-y-4 text-sm">
          <p>This reset link has expired or was already used. Links work once, for one hour.</p>
          <Link href="/forgot/" className={`${btn.primary} w-full py-2.5`}>
            Send a new link
          </Link>
        </div>
      ) : state === 'mfa' ? (
        <MfaChallenge
          email={email}
          onVerified={() => setState('ready')}
          onSignOut={async () => {
            await signOut();
            router.push('/login/');
          }}
        />
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="New password" type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} hint="At least 8 characters." />
          <Field label="Type it again" type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          <FormError msg={err} />
          <button type="submit" disabled={busy} className={`${btn.primary} w-full py-2.5`}>
            {busy ? 'Saving…' : 'Save and open my chamber'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
