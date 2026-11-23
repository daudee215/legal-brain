/**
 * Three-way merge of the chamber document, so two people (or two devices) editing at once never
 * erase each other's work. `base` is the last version both sides agreed on.
 *
 * Rules, per record (matched by key):
 * - changed on one side only → take that side (including a delete)
 * - changed on both → merge field by field; if the same field differs, the local side wins
 * - deleted on one side but edited on the other → keep the edited record (never lose work)
 */

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function mergeRecord<T>(b: T, l: T, r: T): T {
  if (typeof l !== 'object' || l === null || Array.isArray(l) || typeof r !== 'object' || r === null || Array.isArray(r)) return l;
  const out: Record<string, unknown> = {};
  const bo = (b ?? {}) as Record<string, unknown>;
  const lo = l as Record<string, unknown>;
  const ro = r as Record<string, unknown>;
  for (const k of new Set([...Object.keys(ro), ...Object.keys(lo)])) {
    const lv = lo[k];
    const rv = ro[k];
    const v = eq(lv, bo[k]) ? rv : lv;
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export function mergeList<T>(base: T[] = [], local: T[] = [], remote: T[] = [], key: (x: T) => string): T[] {
  const B = new Map(base.map((x) => [key(x), x]));
  const L = new Map(local.map((x) => [key(x), x]));
  const R = new Map(remote.map((x) => [key(x), x]));
  const order = [...remote.map(key), ...local.map(key).filter((k) => !R.has(k))];
  const out: T[] = [];
  for (const k of order) {
    const b = B.get(k);
    const l = L.get(k);
    const r = R.get(k);
    if (b === undefined) {
      // added on one or both sides
      if (l !== undefined && r !== undefined) out.push(mergeRecord(undefined as T, l, r));
      else out.push((l ?? r) as T);
      continue;
    }
    const lChanged = l === undefined || !eq(l, b);
    const rChanged = r === undefined || !eq(r, b);
    if (l === undefined && r === undefined) continue; // deleted on both
    if (l === undefined) {
      if (rChanged) out.push(r as T); // local deleted, remote edited → keep edit
      continue;
    }
    if (r === undefined) {
      if (lChanged) out.push(l); // remote deleted, local edited → keep edit
      continue;
    }
    if (!lChanged) out.push(r);
    else if (!rChanged) out.push(l);
    else out.push(mergeRecord(b, l, r));
  }
  return out;
}

type AnyRec = Record<string, unknown>;
const KEYS: Record<string, (x: AnyRec) => string> = {
  fees: (x) => String(x.caseId),
  causeList: (x) => `${x.date}|${x.caseId}`,
};
const byId = (x: AnyRec) => String(x.id);

/** Merge two halves of the chamber document collection by collection. */
export function mergeDocs(base: AnyRec = {}, local: AnyRec = {}, remote: AnyRec = {}): AnyRec {
  const out: AnyRec = {};
  for (const k of new Set([...Object.keys(remote), ...Object.keys(local)])) {
    const b = base[k];
    const l = local[k];
    const r = remote[k];
    if (Array.isArray(l) || Array.isArray(r)) out[k] = mergeList((b as AnyRec[]) ?? [], (l as AnyRec[]) ?? [], (r as AnyRec[]) ?? [], KEYS[k] ?? byId);
    else out[k] = eq(l, b) ? r : l;
  }
  return out;
}
