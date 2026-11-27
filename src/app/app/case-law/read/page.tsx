'use client';

import { ArrowLeft, Check, Copy, ExternalLink, Printer, Search } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Badge, btn, Card, EmptyState, inputCls } from '../../../../components/ui';
import { Loading } from '../../../../components/ui/Loading';
import { citationLine, libraryCourt, loadJudgmentText, loadOfficialJudgments, type JudgmentText, type OfficialJudgment } from '../../../../lib/caselaw';
import { formatPk } from '../../../../lib/dates';
import { listStatutes } from '../../../../lib/repo';
import { useData } from '../../../../lib/useData';

/** Wrap each match of `find` in <mark>. */
function Highlight({ text, find }: { text: string; find: string }) {
  if (!find) return <>{text}</>;
  const lower = text.toLowerCase();
  const out: React.ReactNode[] = [];
  let at = 0;
  for (let i = lower.indexOf(find); i >= 0; i = lower.indexOf(find, i + find.length)) {
    out.push(<Fragment key={`t${i}`}>{text.slice(at, i)}</Fragment>);
    out.push(
      <mark key={`m${i}`} className="rounded bg-bronze/25 px-0.5 text-ink">
        {text.slice(i, i + find.length)}
      </mark>,
    );
    at = i + find.length;
  }
  out.push(<Fragment key="end">{text.slice(at)}</Fragment>);
  return <>{out}</>;
}

/** One judgment from the library: /app/case-law/read/?id=sc-… or ?id=shc-… */
export default function ReadJudgmentPage() {
  const [id, setId] = useState<string | null>(null);
  const [state, setState] = useState<{ j?: OfficialJudgment; text?: JudgmentText | null; failed?: boolean } | null>(null);
  const [find, setFind] = useState('');
  const [copied, setCopied] = useState(false);
  const statutes = useData(() => listStatutes());

  useEffect(() => {
    try {
      setId(new URLSearchParams(window.location.search).get('id') || '');
    } catch {
      setId('');
    }
  }, []);

  useEffect(() => {
    if (id === null) return;
    let live = true;
    Promise.all([loadOfficialJudgments(), loadJudgmentText(id)])
      .then(([all, text]) => live && setState({ j: all.find((x) => x.id === id), text }))
      .catch(() => live && setState({ failed: true }));
    return () => {
      live = false;
    };
  }, [id]);

  const needle = find.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!needle || !state?.text) return 0;
    return [...state.text.header, ...state.text.body].reduce((n, p) => n + (p.toLowerCase().split(needle).length - 1), 0);
  }, [needle, state?.text]);

  if (!state) return <Loading />;
  if (state.failed) return <EmptyState title="Couldn’t load this judgment" body="Check your internet connection and try again." />;
  const { j, text } = state;
  if (!j || !text) return <EmptyState title="Judgment not found" action={<Link href="/app/case-law/" className={btn.ghost}>All judgments</Link>} />;

  const cited = (statutes ?? []).filter((s) => j.statutesCited.includes(s.id));
  const court = libraryCourt(j.courtId);
  const original = j.courtId === 'sc' ? 'Supreme Court website' : `Original on the ${court?.short ?? 'court'} website`;
  const noBody = text.body.length === 0;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(citationLine(j));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/app/case-law/" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink print:hidden">
        <ArrowLeft className="h-4 w-4" /> All judgments
      </Link>
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <Badge tone="ink">{court?.name}</Badge>
          {j.seat && <span>{j.seat} bench</span>}
          {j.caseNo && j.caseNo.toLowerCase() !== j.title.toLowerCase() && <span>{j.caseNo}</span>}
          {j.citation && <span className="font-medium text-ink">{j.citation}</span>}
          {j.reported && <Badge tone="bronze">Approved for reporting</Badge>}
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">{j.title}</h1>
        <p className="mt-1 text-ink-soft">
          {j.date ? (j.dateKnown ? `Decided ${formatPk(j.date)}` : `Year ${j.date.slice(0, 4)}`) : ''}
          {j.outcome ? `${j.date ? ' · ' : ''}${j.outcome}` : ''}
        </p>
        {j.courtSummary && (
          <p className="mt-3 max-w-3xl rounded-lg border-l-4 border-bronze/60 bg-bronze/5 px-4 py-3 font-reading text-[0.98rem] leading-relaxed">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">The court&rsquo;s summary</span>
            {j.summary}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button className={btn.ghost} onClick={copy}>
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} {copied ? 'Copied' : 'Copy citation'}
          </button>
          <button className={btn.ghost} onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden /> Print
          </button>
          <a className={btn.ghost} href={j.source} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden /> {original}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          <div className="sticky top-16 z-10 print:hidden">
            <label className="relative block">
              <span className="sr-only">Find in this judgment</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
              <input className={`${inputCls} pl-9 shadow-[var(--elev-1)]`} placeholder="Find in this judgment — e.g. 497" value={find} onChange={(e) => setFind(e.target.value)} />
            </label>
            {needle && (
              <p className="mt-1 text-xs text-ink-soft" aria-live="polite">
                {matches === 0 ? 'Not found' : `${matches} ${matches === 1 ? 'match' : 'matches'} highlighted`}
              </p>
            )}
          </div>
          <Card>
            <details className="group mb-5 border-b border-line pb-4" open={noBody || (!!needle && text.header.some((l) => l.toLowerCase().includes(needle))) ? true : undefined}>
              <summary className="cursor-pointer text-sm font-medium text-ink-soft hover:text-ink">Court heading, parties &amp; counsel</summary>
              <div className="mt-3 text-center text-xs leading-relaxed text-ink-soft">
                {text.header.map((l, i) => (
                  <div key={i}>
                    <Highlight text={l} find={needle} />
                  </div>
                ))}
              </div>
            </details>
            <div className="space-y-4 font-reading text-[1.02rem] leading-relaxed">
              {text.body.map((p, i) => (
                <p key={i}>
                  <Highlight text={p} find={needle} />
                </p>
              ))}
            </div>
          </Card>
        </div>
        <aside className="space-y-6">
          {j.judges.length > 0 && (
            <Card>
              <h2 className="mb-2 text-lg font-semibold">Bench</h2>
              <ul className="space-y-0.5 text-sm">
                {j.judges.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Card>
          )}
          {j.tags.length > 0 && (
            <Card>
              <h2 className="mb-2 text-lg font-semibold">Subjects & laws</h2>
              <div className="flex flex-wrap gap-1.5">
                {j.tags.map((t) => (
                  <Link key={t} href={`/app/case-law/?subject=${encodeURIComponent(t)}`}>
                    <Badge tone="bronze">{t}</Badge>
                  </Link>
                ))}
              </div>
              {cited.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {cited.map((s) => (
                    <li key={s.id}>
                      <Link href={`/app/laws/${s.id}/`} className="hover:text-bronze">
                        {s.title}, {s.year} →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          <p className="text-xs text-ink-soft">
            Text taken from the {court?.name}&rsquo;s published {j.file.endsWith('.doc') ? 'document' : 'PDF'} ({j.file.replace(/\.doc$/, '')}). Conversion can drop or join words — verify against the original before citing.
          </p>
        </aside>
      </div>
    </div>
  );
}
