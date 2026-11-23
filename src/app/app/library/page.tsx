'use client';

import { BookMarked, Upload } from 'lucide-react';
import { useState } from 'react';
import { RoleGate } from '../../../components/shell/RoleGate';
import { btn, EmptyState, inputCls, Notice, PageHeader } from '../../../components/ui';
import { formatPk } from '../../../lib/dates';
import { searchItems } from '../../../lib/search';
import { snapshot, type Snapshot } from '../../../lib/repo';
import { useData } from '../../../lib/useData';
import { Loading } from '../../../components/ui/Loading';

const SPINES = ['bg-night', 'bg-bronze', 'bg-[#5b3b22]', 'bg-[#2f3b2a]'];

function LibraryPageBody({ db }: { db: Snapshot }) {
  const [q, setQ] = useState('');
  const books = searchItems(
    db.books.filter((b) => b.ownerId === db.me.id),
    q,
    (b) => [b.title, b.author],
  );

  return (
    <RoleGate action="library">
      <PageHeader
        title="Law Books"
        subtitle="Your private shelf — books you own, searchable from court."
        actions={
          <button className={btn.ghost} disabled title="Arrives in Phase 3">
            <Upload className="h-4 w-4" /> Upload a book (PDF)
          </button>
        }
      />
      <Notice>
        Law books are copyrighted, so each lawyer&apos;s shelf is <strong>private to them</strong> — only books you own and upload. Full-text search inside every
        page (with OCR for scans) arrives in Phase 3.
      </Notice>
      <input className={`${inputCls} mb-6 sm:max-w-md`} placeholder="Search your books…" aria-label="Search books" value={q} onChange={(e) => setQ(e.target.value)} />
      {books.length === 0 ? (
        <EmptyState title="No books found" />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b, i) => (
            <div key={b.id}>
              <div className={`${SPINES[i % SPINES.length]} relative flex aspect-[3/4] flex-col justify-between rounded-r-xl rounded-l-sm p-4 text-ivory shadow-lg`}>
                <span className="absolute inset-y-0 left-2 w-px bg-white/20" />
                <BookMarked className="h-5 w-5 text-bronze-soft" />
                <p className="font-serif text-base font-semibold leading-snug text-ivory">{b.title.replace(' (my copy)', '')}</p>
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                {b.pages.toLocaleString()} pages · added {formatPk(b.addedOn)}
              </p>
            </div>
          ))}
        </div>
      )}
    </RoleGate>
  );
}

export default function LibraryPage() {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <LibraryPageBody db={db} />;
}
