'use client';

import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, Users } from 'lucide-react';
import Link from 'next/link';
import { useCloud } from '../../../components/shell/CloudProvider';
import { Badge, btn, Card, CardTitle } from '../../../components/ui';
import { formatBytes, PLAN_BYTES, WARN_BYTES } from '../../../lib/cloud/storage';
import { hasUnsyncedChanges } from '../../../lib/cloud/sync';

const LABEL = { off: 'Off', loading: 'Connecting…', saved: 'Saved', saving: 'Saving…', offline: 'Offline', error: 'Problem' } as const;

/** Signed in to a shared chamber: where things stand. */
export function CloudSyncCard({ chamber, cases, clients, storageBytes = 0 }: { chamber: string; cases: number; clients: number; storageBytes?: number }) {
  const { sync, email, signOut } = useCloud();
  const bad = sync.status === 'offline' || sync.status === 'error';
  const out = async () => {
    if (hasUnsyncedChanges() && bad && !window.confirm('Some changes have not reached the server yet. Signing out now removes them from this device. Sign out anyway?')) return;
    await signOut();
  };
  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bad ? 'bg-bronze/15 text-bronze' : 'bg-ok/15 text-ok'}`}>
          {bad ? <CloudOff className="h-6 w-6" aria-hidden /> : <Cloud className="h-6 w-6" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">Cloud sync — {chamber}</h2>
            <Badge tone={bad ? 'bronze' : 'ok'}>{LABEL[sync.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Signed in as <strong className="text-ink">{email}</strong> · {cases} cases, {clients} clients shared with your chamber.
          </p>
          <p className={`mt-1 text-sm ${storageBytes >= WARN_BYTES ? 'text-danger' : 'text-ink-soft'}`} data-testid="storage-used">
            Storage used: <strong className="text-ink">{formatBytes(storageBytes)}</strong> of {formatBytes(PLAN_BYTES)} (free plan)
            {storageBytes >= WARN_BYTES && ' — nearly full. Delete files you no longer need, or move the chamber to a paid plan, before uploads start failing.'}
          </p>
          {sync.status === 'offline' && <p className="mt-1 text-sm text-ink">You are offline. Changes are kept on this device and will be sent when the connection returns.</p>}
          {sync.status === 'error' && <p className="mt-1 text-sm text-danger">{sync.error}</p>}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/app/chamber/" className={btn.ghost}>
          <Users className="h-4 w-4" aria-hidden /> Chamber members
        </Link>
        {bad && (
          <button type="button" className={btn.ghost} onClick={() => window.dispatchEvent(new Event('online'))}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Try now
          </button>
        )}
        <button type="button" className={btn.ghost} onClick={() => void out()}>
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </div>
    </Card>
  );
}

/** Not signed in, but this build has accounts: how to share with the chamber. */
export function CloudSignInCard() {
  return (
    <Card>
      <CardTitle>
        <span className="inline-flex items-center gap-2">
          <Cloud className="h-5 w-5 text-bronze" aria-hidden /> Cloud sync
        </span>
      </CardTitle>
      <p className="text-sm text-ink-soft">
        Sign in to share one copy of your practice with everyone in your chamber, on every phone and laptop. Seniors see fees; juniors and clerks don’t. Your
        data on this device stays as it is.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/signup/" className={btn.bronze}>
          <Users className="h-4 w-4" aria-hidden /> Create a shared chamber
        </Link>
        <Link href="/login/" className={btn.ghost}>
          <LogIn className="h-4 w-4" aria-hidden /> Log in
        </Link>
      </div>
    </Card>
  );
}
