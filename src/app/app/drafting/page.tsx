'use client';

import { FilePen, Upload } from 'lucide-react';
import Link from 'next/link';
import { RoleGate } from '../../../components/shell/RoleGate';
import { Badge, btn, Card, PageHeader } from '../../../components/ui';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import { Loading } from '../../../components/ui/Loading';

function DraftingPageBody({ db }: { db: Snapshot }) {
  return (
    <RoleGate action="drafting">
      <PageHeader
        title="Legal Drafting"
        subtitle="Pick a template, fill in the details, get a court-ready draft."
        actions={
          <button className={btn.ghost} disabled title="Arrives in Phase 2">
            <Upload className="h-4 w-4" /> Upload your template
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {db.templates.map((t) => (
          <Link key={t.id} href={`/app/drafting/${t.id}/`} className="group">
            <Card className="h-full transition-colors group-hover:border-bronze">
              <FilePen className="h-6 w-6 text-bronze" />
              <p className="mt-3 font-serif text-lg font-semibold leading-snug">{t.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{t.court}</p>
              <div className="mt-3 flex gap-1.5">
                <Badge tone="bronze">{t.category}</Badge>
                <Badge>{t.fields.length} fields</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-xs text-ink-soft">
        In Phase 2 you can upload your own Word templates; your chamber&apos;s templates stay private to your chamber.
      </p>
    </RoleGate>
  );
}

export default function DraftingPage() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <DraftingPageBody db={db} />;
}
