'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { btn } from './index';

export interface Confirm {
  title: string;
  body: React.ReactNode;
  confirm: string;
  danger?: boolean;
  run: () => void;
}

export function ConfirmDialog({ c, onClose }: { c: Confirm | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {c && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-night/50 p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-2xl"
            initial={{ y: 20, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          >
            <h2 id="confirm-title" className="font-serif text-xl font-semibold">
              {c.title}
            </h2>
            <div className="mt-2 space-y-2 text-sm text-ink-soft">{c.body}</div>
            <div className="mt-5 flex justify-end gap-2">
              <button className={btn.ghost} onClick={onClose} autoFocus>
                Cancel
              </button>
              <button
                className={c.danger ? `${btn.primary} bg-danger hover:bg-danger/90` : btn.bronze}
                onClick={() => {
                  c.run();
                  onClose();
                }}
              >
                {c.confirm}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
