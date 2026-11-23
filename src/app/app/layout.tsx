import { AppShell } from '../../components/shell/AppShell';
import { ServiceWorker } from '../../components/shell/ServiceWorker';
import { CauseListAutoSync } from '../../components/causelist/CauseListAutoSync';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <ServiceWorker />
      <CauseListAutoSync />
    </AppShell>
  );
}
