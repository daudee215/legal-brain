/** Every whitespace-separated token in `query` must appear (case-insensitive) in at least one field. */
export function searchItems<T>(items: T[], query: string, fields: (item: T) => string[]): T[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items;
  return items.filter((item) => {
    const hay = fields(item).join(' \u0000 ').toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}
