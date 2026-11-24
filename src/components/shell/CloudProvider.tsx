'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { chooseChamber, chosenChamber, currentUser, myChambers, signOut as cloudSignOut } from '../../lib/cloud/chamber';
import { cloudEnabled, supabase } from '../../lib/cloud/client';
import { needsMfa } from '../../lib/cloud/mfa';
import { watchPendingUploads } from '../../lib/cloud/storage';
import { getSyncStatus, startSync, stopSync, subscribeSync, type SyncState } from '../../lib/cloud/sync';
import { getMode, subscribe } from '../../lib/store';

/**
 * - off:         not signed in (or cloud not configured) — the app runs on this device's demo/own data, exactly as before
 * - loading:     signed in, waiting for the chamber's first copy
 * - choose:      signed in but not in any chamber yet → "create or join a chamber"
 * - unreachable: signed in, no copy on this device yet and the server can't be reached
 * - on:          showing the chamber's shared copy
 * - mfa:         signed in with a password, but two-step sign-in is on and the code has not been entered yet
 */
export type CloudView = 'off' | 'loading' | 'mfa' | 'choose' | 'unreachable' | 'on';

interface CloudCtx {
  enabled: boolean;
  view: CloudView;
  email: string;
  sync: SyncState;
  /** Re-check session and chamber (after joining/creating a chamber, or retrying). */
  restart: () => void;
  signOut: () => Promise<void>;
}

const OFF: CloudCtx = {
  enabled: false,
  view: 'off',
  email: '',
  sync: { status: 'off', error: '', chamberId: null, removed: false, undone: [] },
  restart: () => {},
  signOut: async () => {},
};

const Ctx = createContext<CloudCtx | null>(null);

export function CloudProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'off' | 'starting' | 'mfa' | 'choose' | 'syncing'>(cloudEnabled ? 'starting' : 'off');
  const [email, setEmail] = useState('');
  const [sync, setSync] = useState<SyncState>(getSyncStatus());
  const [mode, setMode] = useState(() => (typeof window === 'undefined' ? 'demo' : getMode()));
  const run = useRef(0);

  const boot = useCallback(async () => {
    if (!cloudEnabled) return setPhase('off');
    const me = ++run.current;
    const u = await currentUser().catch(() => null);
    if (me !== run.current) return;
    if (!u) {
      if (getSyncStatus().status !== 'off') stopSync();
      setEmail('');
      return setPhase('off');
    }
    setEmail(u.email);
    // Two-step sign-in is on but this session has not passed the code yet: stop here, before any chamber data.
    const mfa = await needsMfa().catch(() => false);
    if (me !== run.current) return;
    if (mfa) {
      if (getSyncStatus().status !== 'off') stopSync();
      return setPhase('mfa');
    }
    let id = chosenChamber();
    if (!id) {
      try {
        id = (await myChambers())[0]?.id ?? null;
      } catch {
        id = null;
      }
      if (me !== run.current) return;
      if (id) chooseChamber(id);
    }
    if (!id) {
      if (getSyncStatus().status !== 'off') stopSync();
      return setPhase('choose');
    }
    setPhase('syncing');
    void startSync(id);
  }, []);

  useEffect(() => {
    setMode(getMode());
    const offStore = subscribe(() => setMode(getMode()));
    const offSync = subscribeSync(() => setSync(getSyncStatus()));
    if (!cloudEnabled) return () => {
      offStore();
      offSync();
    };
    void boot();
    const { data } = supabase().auth.onAuthStateChange((event) => {
      // Don't call Supabase inside this callback (it holds the auth lock) — defer.
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') setTimeout(() => void boot(), 0);
    });
    return () => {
      offStore();
      offSync();
      data.subscription.unsubscribe();
    };
  }, [boot]);

  // Removed from the chamber by a senior (or the chamber is gone): forget it and look again.
  useEffect(() => {
    if (sync.removed) {
      stopSync();
      chooseChamber(null);
      void boot();
    }
  }, [sync.removed, boot]);

  // Showing a chamber: send any files that did not upload earlier (now, and whenever we come back online).
  const showing = phase === 'syncing' && mode === 'cloud';
  useEffect(() => (showing ? watchPendingUploads() : undefined), [showing]);

  const signOut = useCallback(async () => {
    run.current++;
    await cloudSignOut();
    setEmail('');
    setPhase('off');
  }, []);

  const value = useMemo<CloudCtx>(() => {
    let view: CloudView = 'off';
    if (phase === 'starting') view = 'loading';
    else if (phase === 'mfa') view = 'mfa';
    else if (phase === 'choose') view = 'choose';
    else if (phase === 'syncing') {
      if (mode === 'cloud') view = 'on';
      else view = sync.status === 'offline' || sync.status === 'error' ? 'unreachable' : 'loading';
    }
    return { enabled: cloudEnabled, view, email, sync, restart: () => void boot(), signOut };
  }, [phase, mode, sync, email, boot, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Cloud state. Outside a provider (unit tests, marketing pages) cloud is off. */
export function useCloud(): CloudCtx {
  return useContext(Ctx) ?? OFF;
}
