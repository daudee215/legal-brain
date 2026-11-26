'use client';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Badge, Card, DemoBadge, EmptyState } from '../../../../components/ui';
import { Loading } from '../../../../components/ui/Loading';
import { loadOfficialJudgments, officialHref } from '../../../../lib/caselaw';
import { formatPk } from '../../../../lib/dates';
import { getStatute, listJudgments } from '../../../../lib/repo';
import { useData } from '../../../../lib/useData';

export function StatuteDetail({ id }: { id: string }) {
  const data = useData(async () => {
    const s = await getStatute(id);
    if (!s) return { s: undefined } as const;
    const official = await loadOfficialJudgments().catch(() => []);
    const sc = official.filter((j) => j.statutesCited.includes(s.id));
    return { s, citing: (await listJudgments()).filter((j) => j.statutesCited.includes(s.id)), sc };
  }, [id]);
  if (!data) return <Loading />;
  if (!data.s) return <EmptyState title="Law not found" />;
  const { s, citing, sc } = data;

  return (
    <div className="space-y-6">
      <Link href="/app/laws/" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All laws
      </Link>
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone="bronze">{s.jurisdiction}</Badge>
          <Badge>{s.category}</Badge>
          <DemoBadge />
        </div>
        <h1 className="text-3xl font-bold">
          {s.title}, {s.year}
        </h1>
        <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-bronze hover:underline">
          Official source <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 text-sm">
            {s.sections.map((x) => (
              <li key={x.no}>
                <a href={`#s-${x.no}`} className="block rounded px-2 py-1 text-ink-soft hover:bg-line/50 hover:text-ink">
                  {/^\d/.test(x.no) ? 'S. ' : ''}
                  {x.no}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-4">
          {s.sections.map((x) => (
            <Card key={x.no}>
              <article id={`s-${x.no}`} className="scroll-mt-24">
                <h2 className="text-lg font-semibold">
                  <span className="text-bronze">{/^\d/.test(x.no) ? (s.category === 'Constitutional' ? 'Art. ' : 'S. ') : ''}{x.no}</span> — {x.heading}
                </h2>
                <p className="mt-2 font-reading text-[1.02rem] leading-relaxed">{x.text}</p>
              </article>
            </Card>
          ))}
          {sc.length > 0 && (
            <Card>
              <h2 className="mb-1 text-lg font-semibold">Supreme Court judgments citing this law</h2>
              <p className="mb-3 text-xs text-ink-soft">Latest {Math.min(5, sc.length)} of {sc.length.toLocaleString()}</p>
              <ul className="space-y-2 text-sm">
                {sc.slice(0, 5).map((j) => (
                  <li key={j.id}>
                    <Link href={officialHref(j.id)} className="hover:text-bronze">
                      {j.title}
                    </Link>
                    {j.date && <span className="text-ink-soft"> · {j.dateKnown ? formatPk(j.date) : j.date.slice(0, 4)}</span>}
                  </li>
                ))}
              </ul>
              {sc.length > 5 && (
                <Link href={`/app/case-law/?law=${s.id}`} className="mt-3 inline-block text-sm font-medium text-bronze hover:underline">
                  See all {sc.length.toLocaleString()} →
                </Link>
              )}
            </Card>
          )}
          {citing.length > 0 && (
            <Card>
              <h2 className="mb-3 text-lg font-semibold">Demo judgments citing this law</h2>
              <ul className="space-y-2 text-sm">
                {citing.map((j) => (
                  <li key={j.id}>
                    <Link href={`/app/case-law/${j.id}/`} className="hover:text-bronze">
                      {j.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
