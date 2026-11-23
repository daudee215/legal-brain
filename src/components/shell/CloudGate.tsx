'use client';

import { CloudOff, LogOut, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { acceptInvite, chooseChamber, createChamber } from '../../lib/cloud/chamber';
import { friendlyError } from '../../lib/cloud/client';
import { uploadLocal } from '../../lib/cloud/sync';
import { useLang } from '../../lib/i18n';
import { getMode } from '../../lib/store';
import { btn, inputCls } from '../ui';
import { useCloud } from './CloudProvider';

/** Accepts a full invite link (…/join/?code=abc) or the bare code. */
export function inviteCode(input: string): string {
  const s = input.trim();
  const m = s.match(/[?&]code=([0-9a-f]+)/i);
  return (m ? m[1] : s).toLowerCase();
}

/** Signed in, but not in a chamber yet: create one or join with an invite. */
export function ChamberSetup() {
  const { t } = useLang();
  const cloud = useCloud();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [chamber, setChamber] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [bring, setBring] = useState(false);
  const [hasMine, setHasMine] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    const mine = getMode() === 'mine';
    setHasMine(mine);
    setBring(mine);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      let id: string;
      if (tab === 'create') {
        id = await createChamber(chamber, name);
        if (bring && hasMine) await uploadLocal(id);
      } else id = await acceptInvite(inviteCode(code), name);
      chooseChamber(id);
      cloud.restart();
    } catch (x) {
      setErr(friendlyError(x));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-line bg-paper p-6 shadow-xl shadow-bronze/5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-bronze/15 text-bronze">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-serif text-2xl font-bold">{t('setup.title')}</h1>
          <p className="text-sm text-ink-soft">{t('setup.subtitle', { email: cloud.email })}</p>
        </div>
      </div>
      <div className="mt-5 flex gap-2" role="group">
        {(['create', 'join'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setTab(m)}
            aria-pressed={tab === m}
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${tab === m ? 'bg-night text-ivory' : 'bg-cream text-ink hover:bg-line/50'}`}
          >
            {t(m === 'create' ? 'setup.create' : 'setup.join')}
          </button>
        ))}
      </div>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        {tab === 'create' ? (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t('setup.chamberName')}</span>
            <input className={inputCls} required maxLength={120} value={chamber} onChange={(e) => setChamber(e.target.value)} placeholder="e.g. Khan & Associates" />
          </label>
        ) : (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t('setup.invite')}</span>
            <input className={inputCls} required value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t('setup.myName')}</span>
          <input className={inputCls} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        {tab === 'create' && hasMine && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 accent-bronze" checked={bring} onChange={(e) => setBring(e.target.checked)} />
            {t('setup.bring')}
          </label>
        )}
        {err && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {err}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${btn.primary} w-full py-2.5`}>
          {busy ? t('setup.working') : t(tab === 'create' ? 'setup.createBtn' : 'setup.joinBtn')}
        </button>
      </form>
      <button type="button" onClick={() => void cloud.signOut()} className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <LogOut className="h-4 w-4" aria-hidden /> {t('account.signOut')}
      </button>
    </div>
  );
}

/** Signed in, nothing cached on this device and the server can't be reached. */
export function Unreachable() {
  const { t } = useLang();
  const cloud = useCloud();
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-paper p-8 text-center">
      <CloudOff className="mx-auto mb-3 h-8 w-8 text-bronze" aria-hidden />
      <h1 className="text-xl font-semibold">{t('cloud.unreachableTitle')}</h1>
      <p className="mt-2 text-ink-soft">{t('cloud.unreachableBody')}</p>
      {cloud.sync.error && cloud.sync.status === 'error' && <p className="mt-2 text-sm text-danger">{cloud.sync.error}</p>}
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" className={btn.primary} onClick={() => window.location.reload()}>
          {t('cloud.retry')}
        </button>
        <button type="button" className={btn.ghost} onClick={() => void cloud.signOut()}>
          {t('account.signOut')}
        </button>
      </div>
    </div>
  );
}
