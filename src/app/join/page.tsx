'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthCard } from '../../components/marketing/AuthCard';
import { DemoNote, Field, FormError, NotConfigured } from '../../components/marketing/AuthBits';
import { btn } from '../../components/ui';
import { acceptInvite, chooseChamber, currentUser, peekInvite, signIn, signOut, signUp, type InvitePeek } from '../../lib/cloud/chamber';
import { cloudEnabled, friendlyError } from '../../lib/cloud/client';
import { ROLE_LABEL } from '../../lib/permissions';

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'bad'; msg: string } | { state: 'ok'; invite: InvitePeek };

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [tab, setTab] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!cloudEnabled) return;
    const c = (new URLSearchParams(window.location.search).get('code') ?? '').trim().toLowerCase();
    setCode(c);
    if (!c) return setLoad({ state: 'missing' });
    void currentUser().then((u) => {
      setUser(u);
      if (u?.name) setName(u.name);
    });
    peekInvite(c)
      .then((inv) => {
        if (!inv) setLoad({ state: 'bad', msg: 'This invite link is not valid. Ask your senior for a new one.' });
        else if (inv.used) setLoad({ state: 'bad', msg: 'This invite link has already been used. Ask for a new one.' });
        else if (inv.expired) setLoad({ state: 'bad', msg: 'This invite link has expired. Ask for a new one.' });
        else setLoad({ state: 'ok', invite: inv });
      })
      .catch((x) => setLoad({ state: 'bad', msg: friendlyError(x) }));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (!user) {
        if (tab === 'new') await signUp(name, email, password);
        else await signIn(email, password);
      }
      const id = await acceptInvite(code, name);
      chooseChamber(id);
      router.push('/app/');
    } catch (x) {
      setErr(friendlyError(x));
      setBusy(false);
    }
  };

  const inv = load.state === 'ok' ? load.invite : null;

  return (
    <AuthCard
      title={inv ? `Join ${inv.chamber_name}` : 'Join a chamber'}
      subtitle={inv ? <>You have been invited as a <strong>{ROLE_LABEL[inv.role]}</strong>.</> : 'Use the invite link your senior sent you.'}
      footer={
        <>
          Starting your own chamber instead?{' '}
          <Link href="/signup/" className="font-medium text-bronze hover:underline">
            Create one
          </Link>
        </>
      }
      note={cloudEnabled ? <DemoNote /> : undefined}
    >
      {!cloudEnabled ? (
        <NotConfigured />
      ) : load.state === 'loading' ? (
        <p className="text-sm text-ink-soft">Checking your invite…</p>
      ) : load.state === 'missing' ? (
        <p className="text-sm">This page needs an invite link. Ask the senior advocate of your chamber to send you one from the Chamber page.</p>
      ) : load.state === 'bad' ? (
        <p role="alert" className="text-sm text-danger">
          {load.msg}
        </p>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          {user ? (
            <p className="flex flex-wrap items-center gap-x-2 text-sm">
              Joining as <strong>{user.email}</strong>
              <button
                type="button"
                className="text-xs text-bronze hover:underline"
                onClick={async () => {
                  await signOut();
                  setUser(null);
                }}
              >
                Not you?
              </button>
            </p>
          ) : (
            <div className="flex gap-2" role="group">
              {(['new', 'existing'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTab(m)}
                  aria-pressed={tab === m}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm ${tab === m ? 'bg-night text-ivory' : 'bg-cream text-ink hover:bg-line/50'}`}
                >
                  {m === 'new' ? 'New account' : 'I have an account'}
                </button>
              ))}
            </div>
          )}
          <Field label="Your full name" required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} hint="As your colleagues will see it." />
          {!user && (
            <>
              <Field label="Email" type="email" required placeholder="you@chamber.pk" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Field
                label="Password"
                type="password"
                required
                minLength={6}
                autoComplete={tab === 'new' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}
          <FormError msg={err} />
          <button type="submit" disabled={busy} className={`${btn.primary} w-full py-2.5`}>
            {busy ? 'Joining…' : `Join ${inv?.chamber_name ?? 'chamber'}`}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
