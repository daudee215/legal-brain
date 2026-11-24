'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, Cell, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPk } from '../../lib/dates';

/** Single-series charts only, all in the brand bronze (theme-aware via CSS variables). */
const BRONZE = 'var(--bronze)';

export function Sparkline({ data, id }: { data: number[]; id: string }) {
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRONZE} stopOpacity={0.35} />
              <stop offset="100%" stopColor={BRONZE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={BRONZE} strokeWidth={2} fill={`url(#spark-${id})`} isAnimationActive dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function LoadTooltip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; count: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-paper px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-ink">{formatPk(p.date)}</p>
      <p className="text-ink-soft">
        {p.count} case{p.count === 1 ? '' : 's'} listed
      </p>
    </div>
  );
}

/** Cases listed per day across a window: one bar per day, today picked out in ink. */
export function HearingLoadChart({ data, today }: { data: { date: string; count: number }[]; today: string }) {
  const tick = (d: string) => formatPk(d).split(' ').slice(0, 2).join(' ');
  return (
    <div className="h-56 w-full" role="img" aria-label={`Cases listed per day, ${formatPk(data[0]?.date ?? today)} to ${formatPk(data.at(-1)?.date ?? today)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 14, right: 8, bottom: 0, left: -24 }} barCategoryGap="10%">
          <defs>
            <linearGradient id="load-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRONZE} stopOpacity={0.95} />
              <stop offset="100%" stopColor={BRONZE} stopOpacity={0.45} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
          <XAxis dataKey="date" tickFormatter={tick} tick={{ fill: 'var(--ink-soft)', fontSize: 11 }} axisLine={false} tickLine={false} interval={9} />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-soft)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<LoadTooltip />} cursor={{ fill: 'rgb(var(--glow) / 0.1)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} minPointSize={0} isAnimationActive>
            {data.map((d) => (
              <Cell key={d.date} fill={d.date === today ? 'var(--ink)' : d.date < today ? 'var(--bronze-soft)' : 'url(#load-bar)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ranked horizontal bars (magnitude, one hue). Labels and values are text, never colour. */
export function BarList({ rows }: { rows: { label: string; value: number; href?: string }[] }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.label} className="group grid grid-cols-[minmax(0,120px)_1fr_28px] items-center gap-3 text-sm" title={`${r.label}: ${r.value}`}>
          <span className="truncate text-ink-soft group-hover:text-ink">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-line/60">
            <motion.span
              className="block h-full rounded-r-[4px] bg-bronze group-hover:brightness-110"
              initial={reduce ? false : { width: 0 }}
              whileInView={{ width: `${(r.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
              style={reduce ? { width: `${(r.value / max) * 100}%` } : undefined}
            />
          </span>
          <span className="text-end font-medium tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Part-to-whole ring for one share (e.g. fees collected). */
export function Ring({ value, label }: { value: number; label: string }) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value));
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-32 w-32 shrink-0 place-items-center" role="img" aria-label={`${Math.round(pct * 100)}% ${label}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line)" strokeWidth="9" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={BRONZE}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - pct) : c }}
          whileInView={{ strokeDashoffset: c * (1 - pct) }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="text-center">
        <p className="font-serif text-2xl font-bold">{Math.round(pct * 100)}%</p>
        <p className="text-[10px] uppercase tracking-wider text-ink-soft">{label}</p>
      </div>
    </div>
  );
}
