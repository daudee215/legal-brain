'use client';

import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Badge, Card, DemoBadge, EmptyState } from '../../../../components/ui';
import { Loading } from '../../../../components/ui/Loading';
import { formatPk } from '../../../../lib/dates';
import { getCourt, getJudgment, listStatutes } from '../../../../lib/repo';
import { useData } from '../../../../lib/useData';

export function JudgmentDetail({ id }: { id: string }) {
  const data = useData(async () => {
    const j = await getJudgment(id);
    if (!j) return { j: undefined } as const;
    const court = await getCourt(j.courtId);
    const cited = (await listStatutes()).filter((s) => j.statutesCited.includes(s.id));
    return { j, court, cited };
  }, [id]);

  if (!data) return <Loading />;
  if (!data.j) return <EmptyState title="Judgment not found" />;
  const { j, court, cited } = data;

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
          <p className="font-reading text-[1.05rem] leading-relaxed">{j.summary}</p>
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
