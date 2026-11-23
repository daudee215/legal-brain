/**
 * Conflict check: before taking a new client, find where that name already appears —
 * as one of our clients, or as a party in one of our case titles (and on which side).
 */
import type { Case, Client, Db } from '../types';

export type Side = 'petitioner' | 'respondent';

export interface ClientHit {
  client: Client;
  cases: Case[];
}
export interface PartyHit {
  case: Case;
  side: Side;
  /** The party text as written in the title, e.g. 'Mst. Rukhsana'. */
  party: string;
  ourClient?: Client;
  /** True when the name is on the side opposite our client — the real conflict. */
  opposing: boolean;
}
export interface ConflictResult {
  clients: ClientHit[];
  parties: PartyHit[];
}

const NOISE = new Set(['mst', 'mr', 'mrs', 'ms', 'miss', 'm/s', 'ms/', 'pvt', 'private', 'ltd', 'limited', 'the', 'v', 'vs', 'versus', 'and', 'of', '&']);

/** Lower-case word tokens with honorifics, 'v.', '(Pvt) Ltd' etc. removed. */
export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/m\/s\.?/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t && !NOISE.has(t));
}

/** 'A v. B (Maintenance)' → ['A', 'B']. Returns one side when there is no 'v.'. */
export function splitTitle(title: string): string[] {
  return title
    .replace(/\((?!pvt\))[^)]*\)\s*$/i, '')
    .split(/\s+(?:v|vs|versus)\.?\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function matches(queryTokens: string[], text: string): boolean {
  if (queryTokens.length === 0) return false;
  const set = new Set(tokens(text));
  return queryTokens.every((t) => set.has(t));
}

export function conflictCheck(name: string, db: Pick<Db, 'clients' | 'cases'>): ConflictResult {
  const q = tokens(name);
  if (q.length === 0) return { clients: [], parties: [] };

  const clients = db.clients
    .filter((c) => matches(q, c.name))
    .map((client) => ({ client, cases: db.cases.filter((k) => k.clientId === client.id) }));

  const parties: PartyHit[] = [];
  for (const c of db.cases) {
    const sides = splitTitle(c.title);
    if (sides.length < 2) continue;
    const ourClient = db.clients.find((x) => x.id === c.clientId);
    const ourSide = ourClient ? sides.findIndex((s) => matches(tokens(ourClient.name), s)) : -1;
    sides.slice(0, 2).forEach((party, i) => {
      if (!matches(q, party)) return;
      parties.push({ case: c, side: i === 0 ? 'petitioner' : 'respondent', party, ourClient, opposing: ourSide !== -1 && ourSide !== i });
    });
  }
  parties.sort((a, b) => Number(b.opposing) - Number(a.opposing));
  return { clients, parties };
}
