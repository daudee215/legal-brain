'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { isActive, NAV } from '../shell/nav';

/** Page title with the nav section as an eyebrow and a gentle entrance. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const nav = NAV.find((n) => isActive(pathname, n.href));
  const reduce = useReducedMotion();
  const Icon = nav?.icon;
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <motion.div
        className="min-w-0"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {nav && (
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-bronze">
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
            {nav.group}
          </p>
        )}
        <h1 className="text-2xl font-bold sm:text-[2rem] sm:leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-ink-soft">{subtitle}</p>}
        <motion.span
          className="mt-3 block h-[3px] w-12 origin-left rounded-full bg-gradient-to-r from-bronze to-bronze-soft"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />
      </motion.div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
