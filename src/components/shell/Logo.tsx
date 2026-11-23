import { Scale } from 'lucide-react';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-bronze text-ivory">
        <Scale className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span className={`font-serif text-lg font-bold tracking-tight ${light ? 'text-ivory' : 'text-ink'}`}>
        Legal Brain<span className="text-bronze">.</span>
      </span>
    </span>
  );
}
