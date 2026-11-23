'use client';

import { FileText, Folder, Lock, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRole } from '../../../components/shell/RoleProvider';
import { DataTable, EmptyState, PageHeader } from '../../../components/ui';
import { seed } from '../../../data/seed';
import { formatPk } from '../../../lib/dates';
import { can } from '../../../lib/permissions';

const FOLDERS = ['All', 'Pleadings', 'Orders', 'Evidence', 'Correspondence', 'Personal'];

function size(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export default function DocumentsPage() {
  const { role } = useRole();
  const [folder, setFolder] = useState('All');
  const [dropped, setDropped] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const rows = seed.docs.filter((d) => folder === 'All' || d.folder === folder);

  return (
    <>
      <PageHeader title="Documents" subtitle="Pleadings, orders and evidence for every case." />
      <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-ok/10 px-3 py-1 text-sm text-ok">
        <Lock className="h-4 w-4" /> Private to your chamber · encrypted at rest (Phase 2)
      </p>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Folders" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {FOLDERS.map((f) => {
            const n = f === 'All' ? seed.docs.length : seed.docs.filter((d) => d.folder === f).length;
            return (
              <button
                key={f}
                onClick={() => setFolder(f)}
                aria-pressed={folder === f}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm ${folder === f ? 'bg-ink text-cream' : 'bg-paper hover:bg-line/50'}`}
              >
                <Folder className="h-4 w-4" />
                <span className="flex-1 text-left">{f}</span>
                <span className="text-xs opacity-70">{n}</span>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 space-y-4">
          {can(role, 'documents.upload') && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                setDropped([...dropped, ...Array.from(e.dataTransfer.files).map((f) => f.name)]);
              }}
              className={`rounded-2xl border-2 border-dashed p-6 text-center ${over ? 'border-bronze bg-bronze/5' : 'border-line bg-paper'}`}
            >
              <UploadCloud className="mx-auto h-8 w-8 text-bronze" />
              <p className="mt-2 text-sm font-medium">Drag files here to upload</p>
              <label className="mt-1 inline-block cursor-pointer text-sm text-bronze hover:underline">
                or choose files
                <input
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(e) => setDropped([...dropped, ...Array.from(e.target.files ?? []).map((f) => f.name)])}
                />
              </label>
              <p className="mt-1 text-xs text-ink-soft">Demo: files stay on your computer. Secure uploads arrive in Phase 2.</p>
              {dropped.length > 0 && (
                <ul className="mx-auto mt-3 max-w-sm space-y-1 text-left text-sm">
                  {dropped.map((n, i) => (
                    <li key={`${n}-${i}`} className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-bronze" /> <span className="truncate">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <DataTable
            rows={rows}
            rowKey={(d) => d.id}
            empty={<EmptyState title="This folder is empty" />}
            columns={[
              {
                header: 'Name',
                cell: (d) => (
                  <span className="inline-flex items-center gap-2 font-medium">
                    <FileText className="h-4 w-4 shrink-0 text-bronze" /> <span className="break-all">{d.name}</span>
                  </span>
                ),
              },
              {
                header: 'Case',
                cell: (d) => {
                  const c = seed.cases.find((x) => x.id === d.caseId);
                  return c ? (
                    <Link href={`/app/cases/${c.id}/`} className="text-ink-soft hover:text-bronze">
                      {c.title}
                    </Link>
                  ) : (
                    <span className="text-ink-soft">—</span>
                  );
                },
              },
              { header: 'Size', cell: (d) => size(d.sizeKb) },
              {
                header: 'Uploaded',
                cell: (d) => (
                  <span className="whitespace-nowrap text-ink-soft">
                    {formatPk(d.uploadedOn)} · {seed.chamber.members.find((m) => m.id === d.uploadedBy)?.name.split(' ')[0]}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
