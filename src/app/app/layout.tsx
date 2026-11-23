import { AppShell } from '../../components/shell/AppShell';
import { ServiceWorker } from '../../components/shell/ServiceWorker';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <ServiceWorker />
    </AppShell>
  );
}
