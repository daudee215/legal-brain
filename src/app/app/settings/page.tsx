'use client';

import { Database, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { tabFromUrl } from '../../../components/shell/Redirect';
import { RoleGate } from '../../../components/shell/RoleGate';
import { useRole } from '../../../components/shell/RoleProvider';
import { PageHeader } from '../../../components/ui';
import { useLang } from '../../../lib/i18n';
import { DataBackup } from './DataBackup';
import { Studio } from './Studio';

const IDS = ['studio', 'data'] as const;
type Tab = (typeof IDS)[number];

/** Settings: the Studio (colours, letterhead, access, reminders, safety, files) and Data & Backup. Senior only. */
export default function SettingsPage() {
  const { t } = useLang();
  const { plan } = useRole();
  const solo = plan === 'solo';
  const [tab, setTab] = useState<Tab>('studio');
  useEffect(() => {
    const v = tabFromUrl(IDS);
    if (v) setTab(v);
  }, []);
  const pick = (v: Tab) => {
    setTab(v);
    try {
      window.history.replaceState(null, '', v === 'studio' ? '/app/settings/' : `/app/settings/?tab=${v}`);
    } catch {
      /* ignore */
    }
  };
  const tabs: { id: Tab; label: string; icon: typeof Database }[] = [
    { id: 'studio', label: solo ? t('studio.titleSolo', undefined, 'Your Studio') : t('studio.title', undefined, 'Chamber Studio'), icon: SlidersHorizontal },
    { id: 'data', label: t('settings.data', undefined, 'Data & Backup'), icon: Database },
  ];

  return (
    <RoleGate action="studio">
      <PageHeader
        title={t('settings.title', undefined, 'Settings')}
        subtitle={
          solo
            ? t('settings.subtitleSolo', undefined, 'Your colours, letterhead, reminders and files, and how your data is backed up.')
            : t('settings.subtitle', undefined, 'Colours, who can do what, reminders and files for the whole chamber, and how your data is backed up.')
        }
      />
      <div role="tablist" aria-label={t('settings.title', undefined, 'Settings')} className="mb-6 flex flex-wrap gap-2 border-b border-line pb-3">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => pick(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === id ? 'bg-night text-ivory' : 'text-ink hover:bg-line/50'}`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      {tab === 'studio' ? <Studio /> : <DataBackup />}
    </RoleGate>
  );
}
