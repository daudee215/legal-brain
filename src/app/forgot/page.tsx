'use client';

import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AuthCard } from '../../components/marketing/AuthCard';
import { Field, FormError, NotConfigured } from '../../components/marketing/AuthBits';
import { btn } from '../../components/ui';
import { sendPasswordReset } from '../../lib/cloud/chamber';
import { cloudEnabled, friendlyError } from '../../lib/cloud/client';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (x) {
      setErr(friendlyError(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="We’ll email you a link to set a new one."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login/" className="font-medium text-bronze hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {!cloudEnabled ? (
        <NotConfigured />
      ) : sent ? (
        <div className="space-y-3 text-sm" role="status">
          <p className="flex items-start gap-2">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />
            <span>
              If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. Open it on this phone or computer within one hour.
            </span>
          </p>
          <p className="text-ink-soft">Nothing after a few minutes? Check the spam folder, or try again.</p>
          <button type="button" className={`${btn.ghost} w-full`} onClick={() => setSent(false)}>
            Send again
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Email" type="email" required placeholder="you@chamber.pk" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FormError msg={err} />
          <button type="submit" disabled={busy} className={`${btn.primary} w-full py-2.5`}>
            {busy ? 'Sending…' : 'Email me a reset link'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
