'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookMarked, Check, Copy, Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { btn, Card, CardTitle, EmptyState, inputCls, Notice, PageHeader } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { addPrecedent, deletePrecedent } from '../../../lib/mutations';
import { searchItems } from '../../../lib/search';
import { getDb, updateDb } from '../../../lib/store';
import { useData } from '../../../lib/useData';
import type { Case, Precedent } from '../../../types';

type Draft = { citation: string; title: string; court: string; year: string; tags: string; note: string; caseIds: string[] };
const EMPTY: Draft = { citation: '', title: '', court: '', year: '', tags: '', note: '', caseIds: [] };

function toPrecedent(d: Draft): Omit<Precedent, 'id'> {
  const year = Number(d.year);
  return {
    citation: d.citation.trim(),
    title: d.title.trim(),
    court: d.court.trim() || undefined,
    year: Number.isFinite(year) && year > 0 ? year : undefined,
    tags: [...new Set(d.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))],
    note: d.note.trim(),
    caseIds: d.caseIds,
  };
}

/** Edit in place (mutations.ts has add/delete only). */
function updatePrecedent(id: string, p: Omit<Precedent, 'id'>) {
  if (!p.citation) throw new Error('Citation is required');
  updateDb((db) => {
    const i = db.precedents.findIndex((x) => x.id === id);
    if (i < 0) throw new Error('Precedent not found');
    db.precedents[i] = { ...p, id };
  });
}

function PrecedentForm({ initial, cases, onSave, onCancel }: { initial: Draft; cases: Case[]; onSave: (d: Draft) => void; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(d);
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <label className="text-xs text-ink-soft sm:col-span-2">
        Citation
        <input className={`${inputCls} mt-1`} value={d.citation} onChange={set('citation')} placeholder="e.g. 2024 SCMR 123" required />
      </label>
      <label className="text-xs text-ink-soft sm:col-span-2">
        Title / principle (in your words)
        <input className={`${inputCls} mt-1`} value={d.title} onChange={set('title')} placeholder="e.g. Bail is the rule in non-prohibitory offences" />
      </label>
      <label className="text-xs text-ink-soft">
        Court
        <input className={`${inputCls} mt-1`} value={d.court} onChange={set('court')} placeholder="Supreme Court" />
      </label>
      <label className="text-xs text-ink-soft">
        Year
        <input type="number" inputMode="numeric" className={`${inputCls} mt-1`} value={d.year} onChange={set('year')} placeholder="2024" />
      </label>
      <label className="text-xs text-ink-soft sm:col-span-2">
        Tags (comma separated)
        <input className={`${inputCls} mt-1`} value={d.tags} onChange={set('tags')} placeholder="bail, 497 CrPC" />
      </label>
      <label className="text-xs text-ink-soft sm:col-span-2">
        Your note
        <textarea className={`${inputCls} mt-1 min-h-20`} value={d.note} onChange={set('note')} placeholder="When to use it, how to distinguish it…" />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-xs text-ink-soft">Linked cases</legend>
        <div className="mt-1 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {cases.map((c) => {
            const on = d.caseIds.includes(c.id);
            return (
              <button
                type="button"
                key={c.id}
                aria-pressed={on}
                onClick={() => setD({ ...d, caseIds: on ? d.caseIds.filter((x) => x !== c.id) : [...d.caseIds, c.id] })}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? 'border-bronze bg-bronze/15 text-bronze' : 'border-line bg-paper hover:border-bronze/40'}`}
              >
                {on && <Check className="mr-1 inline h-3 w-3" aria-hidden />}
                {c.title}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className={btn.primary}>
          Save
        </button>
        <button type="button" className={btn.ghost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PrecedentsPage() {
  const toast = useToast();
  const reduce = useReducedMotion();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const data = useData(async () => {
    const db = getDb();
    return { precedents: db.precedents, cases: db.cases };
  });

  if (!data) return <Loading label="Loading precedents" />;
  const tags = [...new Set(data.precedents.flatMap((p) => p.tags))].sort();
  const byTag = tag ? data.precedents.filter((p) => p.tags.includes(tag)) : data.precedents;
  const rows = searchItems(byTag, q, (p) => [p.citation, p.title, p.court ?? '', String(p.year ?? ''), p.note, ...p.tags]);

  const save = (id: string | 'new', d: Draft) => {
    try {
      const p = toPrecedent(d);
      if (id === 'new') addPrecedent(p);
      else updatePrecedent(id, p);
      setEditing(null);
      setErr('');
      toast.show(id === 'new' ? 'Precedent saved' : 'Precedent updated');
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  const copy = async (p: Precedent) => {
    try {
      await navigator.clipboard.writeText(p.citation);
      setCopied(p.id);
      setTimeout(() => setCopied((c) => (c === p.id ? null : c)), 1500);
    } catch {
      toast.show('Could not copy — select the citation and copy it manually');
    }
  };

  const toDraft = (p: Precedent): Draft => ({ citation: p.citation, title: p.title, court: p.court ?? '', year: p.year ? String(p.year) : '', tags: p.tags.join(', '), note: p.note, caseIds: p.caseIds });

  return (
    <>
      <PageHeader
        title="Precedents"
        subtitle="Citations you rely on, tagged by issue."
        actions={
          <button className={btn.primary} onClick={() => setEditing(editing === 'new' ? null : 'new')}>
            {editing === 'new' ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} {editing === 'new' ? 'Close' : 'Add precedent'}
          </button>
        }
      />
      <Notice>Store your own notes on each authority — don&apos;t paste reporter headnotes or copyrighted text.</Notice>

      {editing === 'new' && (
        <Card className="mb-6">
          <CardTitle>New precedent</CardTitle>
          <PrecedentForm initial={EMPTY} cases={data.cases} onSave={(d) => save('new', d)} onCancel={() => setEditing(null)} />
          {err && <p className="mt-2 text-sm text-danger">{err}</p>}
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input className={`${inputCls} pl-9`} placeholder="Search citation, principle, note…" aria-label="Search precedents" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Filter by tag">
            <button
              aria-pressed={tag === null}
              onClick={() => setTag(null)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${tag === null ? 'border-night bg-night text-ivory' : 'border-line bg-paper hover:border-bronze/40'}`}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t}
                aria-pressed={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${tag === t ? 'border-bronze bg-bronze/15 text-bronze' : 'border-line bg-paper hover:border-bronze/40'}`}
              >
                <Tag className="h-3 w-3" aria-hidden /> {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={data.precedents.length ? 'No matching precedents' : 'Your precedent bank is empty'} body="Add the authorities you cite again and again, tagged by issue." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {rows.map((p) => (
              <motion.div key={p.id} layout={!reduce} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}>
                <Card className="h-full">
                  {editing === p.id ? (
                    <>
                      <PrecedentForm initial={toDraft(p)} cases={data.cases} onSave={(d) => save(p.id, d)} onCancel={() => setEditing(null)} />
                      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <BookMarked className="mt-1 h-5 w-5 shrink-0 text-bronze" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-semibold">{p.citation}</p>
                          {p.title && <h3 className="mt-0.5 font-serif text-lg font-semibold leading-snug">{p.title}</h3>}
                          <p className="text-xs text-ink-soft">{[p.court, p.year].filter(Boolean).join(' · ')}</p>
                        </div>
                        <button className={`${btn.ghost} px-2.5 py-1.5`} onClick={() => copy(p)} aria-label={`Copy citation ${p.citation}`}>
                          {copied === p.id ? <Check className="h-4 w-4 text-ok" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                          <span className="text-xs">{copied === p.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      {p.note && <p className="mt-3 text-sm text-ink">{p.note}</p>}
                      {p.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.tags.map((t) => (
                            <button key={t} onClick={() => setTag(t)} className="rounded-full bg-bronze/10 px-2 py-0.5 text-[11px] font-medium text-bronze hover:bg-bronze/20">
                              #{t}
                            </button>
                          ))}
                        </div>
                      )}
                      {p.caseIds.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-line pt-2 text-xs">
                          {p.caseIds.map((id) => {
                            const c = data.cases.find((x) => x.id === id);
                            return c ? (
                              <li key={id}>
                                <Link href={`/app/case/?id=${id}`} className="text-ink-soft hover:text-bronze">
                                  ↳ {c.title}
                                </Link>
                              </li>
                            ) : null;
                          })}
                        </ul>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-bronze"
                          onClick={() => {
                            setErr('');
                            setEditing(p.id);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                        </button>
                        <button
                          className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-danger"
                          onClick={() => {
                            if (window.confirm(`Delete ${p.citation}?`)) {
                              deletePrecedent(p.id);
                              toast.show('Precedent deleted');
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {toast.node}
    </>
  );
}
