/**
 * Lahore High Court and Punjab district courts — SCAFFOLD, NOT FINISHED.
 *
 * lhc.gov.pk, data.lhc.gov.pk and dsj.punjab.gov.pk refuse connections from outside Pakistan (checked
 * 2026-11-23: connections timed out from a network outside Pakistan). These adapters run
 * only when PK_NETWORK=1, i.e. on the self-hosted runner labelled `pakistan` (.github/workflows/causelists-pk.yml,
 * setup in docs/causelists-pakistan-runner.md).
 *
 * TODO (must be done from a Pakistani connection):
 *  1. Open the LHC cause-list page in a browser (https://www.lhc.gov.pk → Cause List; the data is served from
 *     data.lhc.gov.pk) with the developer tools' Network tab open. Note the request that returns the list for a
 *     date and bench (method, URL, form/JSON fields, date format) and whether it is JSON, HTML or PDF.
 *  2. Check https://www.lhc.gov.pk/robots.txt and https://data.lhc.gov.pk/robots.txt; write the result here.
 *  3. Save one trimmed real answer as tests/fixtures/causelists/lhc-*.{json,html} and write parseLhc() so that
 *     it returns entries { bench, courtRoom, srNo, caseNo, title, stage } (see ihc.mjs for the shape).
 *     LHC numbers look like "W.P. No. 30112 of 2026" / "Crl. Misc. No. 4521-B of 2026"; the app's matcher
 *     already understands "No. … of …".
 *  4. Repeat for the Punjab district courts (dsj.punjab.gov.pk — per-district case search / cause list). Civil
 *     courts Lahore is the court id `cjl` in the app; add more ids to src/data/seed.ts if needed.
 *  5. Run: PK_NETWORK=1 node scripts/causelists/fetch.mjs --pk --out pk-out   and check pk-out/.
 * Until then fetchLhc/fetchPunjab log and return null, so the job never fails.
 */
import { log } from '../lib/common.mjs';

export function parseLhc() {
  throw new Error('parseLhc is not written yet — see the TODO in scripts/causelists/adapters/pakistan-only.mjs');
}

export async function fetchLhc(date) {
  log('lhc', `adapter not finished yet (needs a Pakistani connection) — nothing fetched for ${date}`);
  return null;
}

export async function fetchPunjab(date) {
  log('punjab-district', `adapter not finished yet (needs a Pakistani connection) — nothing fetched for ${date}`);
  return null;
}
