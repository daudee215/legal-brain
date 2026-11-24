import { Info, type LucideIcon } from 'lucide-react';
import type { CaseStatus } from '../../types';

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`card-fx rounded-2xl border border-line bg-paper p-5 ${className}`}>{children}</section>;
}

export function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-xl font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export { PageHeader } from './PageHeader';

export function StatTile({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="card-fx lift rounded-2xl border border-line bg-paper p-4">
      <div className="flex items-center justify-between text-ink-soft">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        {Icon && (
          <span className="chip-bronze grid h-8 w-8 place-items-center rounded-lg">
            <Icon className="h-4 w-4 text-bronze" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 font-serif text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

type Tone = 'neutral' | 'bronze' | 'ok' | 'danger' | 'ink';
const TONES: Record<Tone, string> = {
  neutral: 'bg-line/70 text-ink',
  bronze: 'bg-bronze/15 text-bronze',
  ok: 'bg-ok/15 text-ok',
  danger: 'bg-danger/15 text-danger',
  ink: 'bg-night text-ivory',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/15 ${TONES[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {children}
    </span>
  );
}

const STATUS_TONE: Record<CaseStatus, Tone> = {
  pending: 'bronze',
  adjourned: 'neutral',
  reserved: 'ink',
  decided: 'ok',
  disposed: 'ok',
};
export function StatusBadge({ status }: { status: CaseStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}

/** Small line illustration of the scales of justice, drawn in the brand bronze. */
function EmptyArt() {
  return (
    <svg viewBox="0 0 96 96" className="mx-auto mb-3 h-16 w-16 text-bronze" fill="none" aria-hidden>
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity="0.08" />
      <circle cx="48" cy="48" r="44" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 5" />
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M48 24v44M36 70h24M30 34h36" />
        <path d="M30 34 21 52a9 9 0 0 0 18 0L30 34ZM66 34l-9 18a9 9 0 0 0 18 0l-9-18Z" fill="currentColor" fillOpacity="0.14" />
        <circle cx="48" cy="22" r="2.6" fill="currentColor" />
      </g>
    </svg>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-cream/50 px-6 py-10 text-center">
      <EmptyArt />
      <p className="font-serif text-lg font-semibold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DemoBadge({ text = 'Demo data — not legal advice' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-bronze/30 bg-bronze/10 px-2.5 py-0.5 text-[11px] font-medium text-bronze">
      <Info className="h-3 w-3" aria-hidden />
      {text}
    </span>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex gap-3 rounded-xl border border-bronze/30 bg-bronze/10 px-4 py-3 text-sm text-ink">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-bronze" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 btn-ink rounded-lg bg-ink px-4 py-2 text-sm font-medium text-cream transition hover:-translate-y-px hover:bg-ink/90 active:translate-y-0 disabled:opacity-50',
  bronze:
    'inline-flex items-center justify-center gap-2 btn-bronze rounded-lg bg-bronze px-4 py-2 text-sm font-medium text-ivory transition hover:-translate-y-px active:translate-y-0 disabled:opacity-50',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 py-2 text-sm font-medium text-ink shadow-[var(--elev-1)] transition hover:-translate-y-px hover:border-bronze/40 hover:bg-line/40 active:translate-y-0 disabled:opacity-50',
};

export const inputCls =
  'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft/60 transition focus:border-bronze focus:ring-4 focus:ring-bronze/10';

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

/** Table on ≥768px, stacked cards below. */
export function DataTable<T>({ rows, columns, rowKey, empty }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; empty?: React.ReactNode }) {
  if (rows.length === 0) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return (
    <>
      <div className="card-fx hidden overflow-hidden rounded-2xl border border-line bg-paper md:block">
        <table className="w-full text-start text-sm">
          <thead className="bg-cream/70 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
            <tr>
              {columns.map((c) => (
                <th key={c.header} className={`px-4 py-3 font-medium ${c.className ?? ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="border-t border-line align-top transition-colors hover:bg-bronze/[0.04]">
                {columns.map((c) => (
                  <td key={c.header} className={`px-4 py-3 ${c.className ?? ''}`}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="rounded-xl border border-line bg-paper p-4 shadow-sm">
            <dl className="space-y-1.5 text-sm">
              {columns.map((c) => (
                <div key={c.header} className="flex gap-3">
                  <dt className="w-24 shrink-0 text-xs uppercase tracking-wide text-ink-soft">{c.header}</dt>
                  <dd className="min-w-0 flex-1 break-words">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
