export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label={label}>
      <div className="h-8 w-56 rounded-lg bg-line" />
      <div className="h-40 rounded-2xl bg-line/70" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-2xl bg-line/60" />
        <div className="h-28 rounded-2xl bg-line/60" />
      </div>
    </div>
  );
}
