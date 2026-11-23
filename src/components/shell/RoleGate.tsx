'use client';

import { Lock } from 'lucide-react';
import { can, ROLE_LABEL, type Action } from '../../lib/permissions';
import { useRole } from './RoleProvider';

export function RoleGate({ action, children }: { action: Action; children: React.ReactNode }) {
  const { role } = useRole();
  if (can(role, action)) return <>{children}</>;
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-paper p-8 text-center">
      <Lock className="mx-auto mb-3 h-8 w-8 text-bronze" aria-hidden />
      <h1 className="text-xl font-semibold">Restricted section</h1>
      <p className="mt-2 text-ink-soft">
        Your role ({ROLE_LABEL[role]}) doesn&apos;t have access to this section. Ask the senior advocate of your chamber if you need it.
      </p>
    </div>
  );
}
