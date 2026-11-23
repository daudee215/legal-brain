'use client';

import { CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2800);
    return () => clearTimeout(t);
  }, [msg]);
  const show = useCallback((m: string) => setMsg(m), []);
  const node = msg ? (
    <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm text-cream shadow-xl">
      <CheckCircle2 className="h-4 w-4 text-bronze-soft" /> {msg}
    </div>
  ) : null;
  return { show, node };
}
