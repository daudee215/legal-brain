import { Info, type LucideIcon } from 'lucide-react';
import type { CaseStatus } from '../../types';

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-2xl border border-line bg-paper p-5 ${className}`}>{children}</section>;
}

export function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <div className="flex items-center justify-between text-ink-soft">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-bronze" aria-hidden />}
      </div>
      <p className="mt-2 font-serif text-3xl font-bold">{value}</p>
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
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
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

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-cream/50 px-6 py-10 text-center">
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
    'inline-flex items-center justify-center gap-2 rounded-lg bg-night px-4 py-2 text-sm font-medium text-ivory hover:bg-night/90 disabled:opacity-50',
  bronze:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-bronze px-4 py-2 text-sm font-medium text-ivory hover:bg-bronze/90 disabled:opacity-50',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-line/50 disabled:opacity-50',
};

export const inputCls =
  'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft/60 focus:border-bronze';

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
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-paper md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream/60 text-xs uppercase tracking-wide text-ink-soft">
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
              <tr key={rowKey(r)} className="border-t border-line align-top hover:bg-cream/40">
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
          <li key={rowKey(r)} className="rounded-xl border border-line bg-paper p-4">
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
