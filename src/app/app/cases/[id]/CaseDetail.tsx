'use client';

import { ArrowLeft, ExternalLink, FileText, NotebookPen } from 'lucide-react';
import Link from 'next/link';
import { Badge, Card, CardTitle, EmptyState, StatusBadge } from '../../../../components/ui';
import { Loading } from '../../../../components/ui/Loading';
import { seed } from '../../../../data/seed';
import { formatPk, formatTime } from '../../../../lib/dates';
import { getCase, getClient, getCourt } from '../../../../lib/repo';
import { useData } from '../../../../lib/useData';

export function CaseDetail({ id }: { id: string }) {
  const data = useData(async () => {
    const c = await getCase(id);
    if (!c) return { c: undefined } as const;
    return { c, court: await getCourt(c.courtId), client: await getClient(c.clientId) };
  }, [id]);

  if (!data) return <Loading />;
  const { c } = data;
  if (!c) return <EmptyState title="Case not found" action={<Link href="/app/cases/">Back to cases</Link>} />;
  const { court, client } = data;
  const docs = seed.docs.filter((d) => d.caseId === c.id);
  const notes = seed.diary.filter((d) => d.caseId === c.id);
  const members = seed.chamber.members.filter((m) => c.assignedTo.includes(m.id));
  const hearings = [...c.hearings].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-6">
      <Link href="/app/cases/" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All cases
      </Link>

      <section className="rounded-3xl bg-ink p-6 text-cream sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <Badge tone="bronze">{c.category}</Badge>
          <span className="text-sm text-cream/60">{c.caseNo}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-cream sm:text-3xl">{c.title}</h1>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-cream/50">Court</dt>
            <dd>{court?.name}</dd>
          </div>
          <div>
            <dt className="text-cream/50">Judge / Bench</dt>
            <dd>{c.judge}</dd>
          </div>
          <div>
            <dt className="text-cream/50">Stage</dt>
            <dd>{c.stage}</dd>
          </div>
          <div>
            <dt className="text-cream/50">Next hearing</dt>
            <dd className="font-semibold text-bronze-soft">{c.nextHearing ? `${formatPk(c.nextHearing)}, ${formatTime(c.nextHearing)}` : 'Not fixed'}</dd>
          </div>
        </dl>
        {court && (
          <a
            href={court.statusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cream px-4 py-2 text-sm font-medium text-ink hover:bg-white"
          >
            Check status on {court.shortName} website <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </section>

      {c.result && (
        <Card className="border-ok/40 bg-ok/5">
          <CardTitle>Result</CardTitle>
          <p>{c.result}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle>Hearing history</CardTitle>
          {hearings.length === 0 ? (
            <EmptyState title="No hearings recorded yet" />
          ) : (
            <ol className="relative space-y-5 border-l-2 border-line pl-5">
              {hearings.map((h) => (
                <li key={h.date} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-paper bg-bronze" />
                  <p className="text-sm font-semibold">{formatPk(h.date)}</p>
                  <p className="text-sm">{h.proceedings}</p>
                  {h.nextDate && <p className="text-xs text-ink-soft">Next date: {formatPk(h.nextDate)}</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle>Client</CardTitle>
            {client ? (
              <div className="text-sm">
                <p className="font-medium">{client.name}</p>
                <p className="text-ink-soft">{client.phone}</p>
                <p className="text-ink-soft">{client.cnicMasked} · {client.city}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-soft">No client linked.</p>
            )}
            <p className="mt-4 text-xs uppercase tracking-wide text-ink-soft">Assigned</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {members.map((m) => (
                <Badge key={m.id}>{m.name}</Badge>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-soft">Filed on {formatPk(c.filedOn)}</p>
          </Card>

          <Card>
            <CardTitle action={<Link href="/app/documents/" className="text-sm text-bronze hover:underline">Documents</Link>}>Files</CardTitle>
            {docs.length === 0 ? (
              <p className="text-sm text-ink-soft">No files yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-bronze" />
                    <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    <span className="text-xs text-ink-soft">{d.folder}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle action={<Link href="/app/diary/" className="text-sm text-bronze hover:underline">Diary</Link>}>Notes</CardTitle>
            {notes.length === 0 ? (
              <p className="text-sm text-ink-soft">No diary notes for this case.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {notes.map((n) => (
                  <li key={n.id} className="flex gap-2">
                    <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
                    <div>
                      <p>{n.text}</p>
                      <p className="text-xs text-ink-soft">{formatPk(n.date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
