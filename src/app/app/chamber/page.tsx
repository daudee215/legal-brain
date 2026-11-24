'use client';

import { Check, Minus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useRole } from '../../../components/shell/RoleProvider';
import { Badge, btn, Card, CardTitle, DataTable, inputCls, PageHeader } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { can, ROLE_LABEL, type Action } from '../../../lib/permissions';
import type { Role } from '../../../types';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import { Loading } from '../../../components/ui/Loading';
import { CloudChamber } from './CloudChamber';
import { RoleGate } from '../../../components/shell/RoleGate';

const MATRIX_ROWS: { label: string; action?: Action }[] = [
  { label: 'View cases, cause lists, laws, case law, news' },
  { label: 'Add & edit cases', action: 'cases.edit' },
  { label: 'Legal drafting', action: 'drafting' },
  { label: 'AI assistant', action: 'assistant' },
  { label: 'Private law-book shelf', action: 'library' },
  { label: 'Write in diary', action: 'diary.write' },
  { label: 'Upload documents', action: 'documents.upload' },
  { label: 'Invite & manage members', action: 'chamber.manage' },
  { label: 'Billing & subscription', action: 'billing' },
];
const ROLES: Role[] = ['senior', 'junior', 'clerk'];

function RoleMatrix() {
  return (
    <Card>
      <CardTitle>What each role can do</CardTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2 font-medium">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className="py-2 text-center font-medium">
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_ROWS.map((row) => (
              <tr key={row.label} className="border-t border-line">
                <td className="py-2 pr-2">{row.label}</td>
                {ROLES.map((r) => (
                  <td key={r} className="py-2 text-center">
                    {!row.action || can(r, row.action) ? (
                      <Check className="mx-auto h-4 w-4 text-ok" aria-label="Allowed" />
                    ) : (
                      <Minus className="mx-auto h-4 w-4 text-ink-soft/50" aria-label="Not allowed" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ChamberPageBody({ db }: { db: Snapshot }) {
  const { role, cloud } = useRole();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('junior');
  if (cloud) return <CloudChamber db={db} matrix={<RoleMatrix />} />;

  return (
    <>
      <PageHeader title={db.chamber.name} subtitle="Your chamber — members share cases, dates and documents." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <DataTable
            rows={db.chamber.members}
            rowKey={(m) => m.id}
            columns={[
              { header: 'Member', cell: (m) => <span className="font-medium">{m.name}</span> },
              { header: 'Email', cell: (m) => <span className="text-ink-soft">{m.email}</span> },
              { header: 'Role', cell: (m) => <Badge tone={m.role === 'senior' ? 'ink' : m.role === 'junior' ? 'bronze' : 'neutral'}>{ROLE_LABEL[m.role]}</Badge> },
            ]}
          />
          <RoleMatrix />
        </div>
        {can(role, 'chamber.manage') ? (
          <Card className="self-start">
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-bronze" /> Invite a member
              </span>
            </CardTitle>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setEmail('');
                toast.show('Invite created in demo only — emails go out in Phase 2');
              }}
            >
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Email</span>
                <input type="email" required className={inputCls} placeholder="junior@chamber.pk" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Role</span>
                <select className={inputCls} value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                  <option value="junior">Junior</option>
                  <option value="clerk">Clerk</option>
                  <option value="senior">Senior (co-owner)</option>
                </select>
              </label>
              <button type="submit" className={`${btn.primary} w-full`}>
                Send invite
              </button>
              <p className="text-xs text-ink-soft">They&apos;ll get an invite code to join {db.chamber.name} when they sign up.</p>
            </form>
          </Card>
        ) : (
          <Card className="self-start">
            <p className="text-sm text-ink-soft">Only the senior advocate can invite or remove members.</p>
          </Card>
        )}
      </div>
      {toast.node}
    </>
  );
}

function ChamberPageInner() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <ChamberPageBody db={db} />;
}

export default function ChamberPage() {
  return (
    <RoleGate action="team.view">
      <ChamberPageInner />
    </RoleGate>
  );
}
