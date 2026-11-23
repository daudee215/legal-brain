import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, DemoBadge } from '../../../../components/ui';
import { seed } from '../../../../data/seed';
import { formatPk } from '../../../../lib/dates';

export function generateStaticParams() {
  return seed.judgments.map((j) => ({ id: j.id }));
}

export default async function JudgmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const j = seed.judgments.find((x) => x.id === id);
  if (!j) notFound();
  const court = seed.courts.find((c) => c.id === j.courtId);
  const cited = seed.statutes.filter((s) => j.statutesCited.includes(s.id));

  return (
    <div className="space-y-6">
      <Link href="/app/case-law/" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All judgments
      </Link>
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone="ink">{court?.name}</Badge>
          <DemoBadge />
        </div>
        <h1 className="text-3xl font-bold">{j.title}</h1>
        <p className="mt-1 text-ink-soft">
          {j.caseNo} · Decided {formatPk(j.date)}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Held</h2>
          <p className="leading-relaxed">{j.summary}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {j.tags.map((t) => (
              <Badge key={t} tone="bronze">
                {t}
              </Badge>
            ))}
          </div>
          <Link href="/app/assistant/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-bronze hover:underline">
            <Sparkles className="h-4 w-4" /> Ask the AI assistant about this judgment
          </Link>
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-2 text-lg font-semibold">Bench</h2>
            <ul className="text-sm">
              {j.judges.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-2 text-lg font-semibold">Laws cited</h2>
            {cited.length === 0 ? (
              <p className="text-sm text-ink-soft">None linked.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {cited.map((s) => (
                  <li key={s.id}>
                    <Link href={`/app/laws/${s.id}/`} className="hover:text-bronze">
                      {s.title}, {s.year}
                    </Link>
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
