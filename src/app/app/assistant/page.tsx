'use client';

import { ArrowUp, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { RoleGate } from '../../../components/shell/RoleGate';
import { DemoBadge, inputCls, PageHeader } from '../../../components/ui';
import { assistantDemo, type DemoQA } from '../../../data/assistantDemo';
import { searchItems } from '../../../lib/search';

interface Msg {
  from: 'me' | 'ai';
  text: string;
  citations?: DemoQA['citations'];
}

function answerFor(q: string): Msg {
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  let best: DemoQA | undefined;
  let bestScore = 0;
  for (const qa of assistantDemo) {
    const score = words.filter((w) => searchItems([qa], w, (x) => [x.prompt, x.keywords]).length > 0).length;
    if (score > bestScore) {
      best = qa;
      bestScore = score;
    }
  }
  if (best && bestScore >= 2) return { from: 'ai', text: best.answer, citations: best.citations };
  return {
    from: 'ai',
    text: 'In the full version I’ll answer this from your chamber’s documents and Pakistani law, with citations to the exact section or judgment. For this demo, try one of the suggested questions.',
  };
}

export default function AssistantPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [thinking, setThinking] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (msgs.length) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, thinking]);

  function ask(text: string) {
    if (!text.trim() || thinking) return;
    setMsgs((m) => [...m, { from: 'me', text: text.trim() }]);
    setQ('');
    setThinking(true);
    setTimeout(() => {
      setMsgs((m) => [...m, answerFor(text)]);
      setThinking(false);
    }, 700);
  }

  return (
    <RoleGate action="assistant">
      <PageHeader title="AI Legal Assistant" subtitle="Case preparation from your documents and Pakistani law." actions={<DemoBadge text="Demo answers — not legal advice" />} />
      <div className="flex min-h-[60dvh] flex-col rounded-2xl border border-line bg-paper">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {msgs.length === 0 && (
            <div className="mx-auto max-w-2xl py-6 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-night">
                <Sparkles className="h-6 w-6 text-bronze-soft" />
              </span>
              <h2 className="mt-3 text-xl font-semibold">How can I help with your cases today?</h2>
              <p className="mt-1 text-sm text-ink-soft">Every answer cites the section or judgment it relies on.</p>
              <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
                {assistantDemo.map((d) => (
                  <button key={d.prompt} onClick={() => ask(d.prompt)} className="rounded-xl border border-line bg-cream/50 p-3 text-sm hover:border-bronze">
                    {d.prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) =>
            m.from === 'me' ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-night px-4 py-3 text-sm text-ivory">
                {m.text}
              </div>
            ) : (
              <div key={i} className="max-w-[92%] rounded-2xl rounded-bl-sm border border-line bg-cream/60 px-4 py-3 text-sm">
                <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                {m.citations && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                    {m.citations.map((c) => (
                      <Link key={c.href} href={c.href} className="rounded-full border border-bronze/30 bg-paper px-2.5 py-0.5 text-xs text-bronze hover:bg-bronze/10">
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
          {thinking && <p className="text-sm text-ink-soft">Thinking…</p>}
          <div ref={end} />
        </div>
        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <input className={inputCls} placeholder="Ask about a law, a judgment or one of your cases…" aria-label="Ask the assistant" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-night text-ivory disabled:opacity-40" disabled={!q.trim() || thinking} aria-label="Send">
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </RoleGate>
  );
}
