'use client';

import { ArrowLeft, Copy, FileDown, Printer } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RoleGate } from '../../../../components/shell/RoleGate';
import { useRole } from '../../../../components/shell/RoleProvider';
import { btn, EmptyState, inputCls } from '../../../../components/ui';
import { useToast } from '../../../../components/ui/Toast';
import { fillTemplate } from '../../../../lib/templates';
import { downloadBlob } from '../../../../lib/files';
import { draftPdf } from '../../../../lib/pdfDocs';
import { snapshot, type Snapshot } from '../../../../lib/repo';
import { useData } from '../../../../lib/useData';
import { Loading } from '../../../../components/ui/Loading';

function DraftEditorBody({ id, db }: { id: string; db: Snapshot }) {
  const t = db.templates.find((x) => x.id === id);
  const { member } = useRole();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const text = useMemo(() => (t ? fillTemplate(t.body, t.fields, values) : ''), [t, values]);

  if (!t) return <EmptyState title="Template not found" />;

  function fromCase(caseId: string) {
    const c = db.cases.find((x) => x.id === caseId);
    if (!c) return;
    const court = db.courts.find((x) => x.id === c.courtId);
    const client = db.clients.find((x) => x.id === c.clientId);
    const [pet, resp] = c.title.split(/\s+v\.?\s+/);
    setValues((v) => ({
      ...v,
      court: court?.name.toUpperCase() ?? '',
      petitioner: pet ?? client?.name ?? '',
      plaintiff: pet ?? client?.name ?? '',
      client: client?.name ?? '',
      defendant: resp ?? '',
      respondents: resp ?? '',
      case_title: c.title,
      suit_no: c.caseNo,
      advocate: `${member.name}`,
    }));
  }

  return (
    <RoleGate action="drafting">
      <Link href="/app/drafting/" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All templates
      </Link>
      <h1 className="text-2xl font-bold sm:text-3xl">{t.title}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <form className="space-y-3 self-start rounded-2xl border border-line bg-paper p-5" onSubmit={(e) => e.preventDefault()}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Fill from a case</span>
            <select className={inputCls} defaultValue="" onChange={(e) => fromCase(e.target.value)}>
              <option value="">— choose a case —</option>
              {db.cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <hr className="border-line" />
          {t.fields.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="mb-1 block font-medium">{f.label}</span>
              {f.type === 'textarea' ? (
                <textarea
                  rows={4}
                  className={inputCls}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  type={f.type === 'date' ? 'date' : 'text'}
                  className={inputCls}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className={btn.primary} onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button
              type="button"
              className={btn.ghost}
              onClick={async () => {
                try {
                  const bytes = await draftPdf(t.title, text);
                  downloadBlob(bytes, `${t.title.replace(/[\\/:*?"<>|]+/g, '-')}.pdf`);
                  toast.show('PDF downloaded');
                } catch {
                  toast.show('Could not make the PDF');
                }
              }}
            >
              <FileDown className="h-4 w-4" /> Download PDF
            </button>
            <button
              type="button"
              className={btn.ghost}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                  toast.show('Draft copied');
                } catch {
                  toast.show('Copy not allowed by this browser');
                }
              }}
            >
              <Copy className="h-4 w-4" /> Copy text
            </button>
          </div>
        </form>
        <div className="print-area min-w-0 overflow-x-auto rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-12">
          <div className="legal-sheet mx-auto max-w-[680px] text-[15px] text-ink">{text}</div>
        </div>
      </div>
      {toast.node}
    </RoleGate>
  );
}

export function DraftEditor({ id }: { id: string }) {
  const db = useData(() => snapshot());
  if (!db) return <Loading />;
  return <DraftEditorBody id={id} db={db} />;
}
