'use client';

import { Calculator, ClipboardList, Hourglass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LimitationCalculator } from '../../../components/deadlines/LimitationCalculator';
import { tabFromUrl } from '../../../components/shell/Redirect';
import { Notice, PageHeader } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { DeadlinesView } from './DeadlinesView';
import { TasksView } from './TasksView';

const TABS = [
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'deadlines', label: 'Limitation deadlines', icon: Hourglass },
  { id: 'calculator', label: 'Limitation calculator', icon: Calculator },
] as const;
type Tab = (typeof TABS)[number]['id'];
const IDS = TABS.map((x) => x.id);

/** Deadlines and tasks in one place: what has to be done, and the last day to file. */
export default function DeadlinesAndTasksPage() {
  const [tab, setTab] = useState<Tab>('tasks');
  const toast = useToast();
  useEffect(() => {
    const t = tabFromUrl(IDS);
    if (t) setTab(t);
  }, []);
  const pick = (t: Tab) => {
    setTab(t);
    try {
      window.history.replaceState(null, '', t === 'tasks' ? '/app/tasks/' : `/app/tasks/?tab=${t}`);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <PageHeader title="Deadlines & Tasks" subtitle="What has to be done, by whom, and the last day to file." />
      <div role="tablist" aria-label="Deadlines and tasks" className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => pick(id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              tab === id ? 'border-bronze bg-bronze text-ivory shadow-sm' : 'border-line bg-paper text-ink hover:border-bronze/40'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      {tab === 'tasks' && <TasksView />}
      {tab === 'deadlines' && <DeadlinesView />}
      {tab === 'calculator' && (
        <>
          <Notice>Demo values — the limitation periods below must be verified by an advocate before relying on them.</Notice>
          <LimitationCalculator onMsg={toast.show} />
        </>
      )}
      {toast.node}
    </>
  );
}
