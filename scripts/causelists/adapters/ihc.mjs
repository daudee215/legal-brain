/**
 * Islamabad High Court and the Islamabad district courts (East / West) — same MIS, same endpoint.
 *
 * The public page https://mis.ihc.gov.pk/frmCausLst calls
 *   POST /ihc.asmx/get_IHC_All_Causelist   (Content-Type: application/json)
 *   body { _params: { PSDATE: 'dd/mm/yyyy', PEDATE: same, pCrt: '0' (all courts), pType: 1 (full list),
 *                     PCIRCUITCODE: '1' IHC | '2' District Court (East) | '3' District Court (West), … } }
 * and answers { d: "<JSON string of rows>" } or { d: "\"empty\"" } when no list is out yet.
 * Row fields used: CASESNO (serial), COURTNAME ("Court No: 1"), BENCHNAME (judges, <BR>-separated),
 * CASENAME_ALIAS ("W.P.") / CASENAME ("Writ Petition"), CASENO, CASEYEAR, PARTIES, CASESTAGENAME.
 * Advocate names (ADV1/ADV2) are dropped: the matcher does not need them and the files stay small.
 * robots.txt: checked 2026-11-23 — mis.ihc.gov.pk has none (404); politeFetch() re-checks on every run.
 */
import { log, politeFetch, squashSpaces } from '../lib/common.mjs';

const URL_ = 'https://mis.ihc.gov.pk/ihc.asmx/get_IHC_All_Causelist';
export const IHC_CIRCUITS = { ihc: '1', 'ict-east': '2', 'ict-west': '3' };

/** 2026-11-24 → 24/11/2026 */
export function ihcDate(key) {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

export function ihcBody(date, circuit) {
  const d = ihcDate(date);
  return {
    _params: {
      PSDATE: d,
      PEDATE: d,
      pCrt: '0',
      pBnch: 0,
      PBENCHNAMECODE: 0,
      pStg: 0,
      CaseNo: 0,
      PartyName: '',
      LawyerName: '',
      pType: 1,
      PCASEGROUPID: 5,
      PISMYLST: 0,
      PUSERID: 0,
      PCIRCUITCODE: circuit,
    },
  };
}

function courtRoomOf(name) {
  const m = /(\d+[A-Z]?)/i.exec(String(name ?? ''));
  return m ? m[1].toUpperCase() : squashSpaces(name) || undefined;
}

/**
 * Rows of the endpoint's answer → normalised entries. Returns [] for the "empty" answer.
 * @returns {import('../lib/common.mjs').Entry[]}
 */
export function parseIhcResponse(json) {
  const d = typeof json === 'string' ? JSON.parse(json).d : json?.d;
  if (!d || d === '"empty"' || d === 'empty') return [];
  const rows = typeof d === 'string' ? JSON.parse(d) : d;
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows) {
    const type = squashSpaces(r.CASENAME_ALIAS) || squashSpaces(r.CASENAME);
    if (!type || r.CASENO == null || !r.CASEYEAR) continue;
    out.push({
      bench: squashSpaces(String(r.BENCHNAME ?? '').replace(/<br\s*\/?>/gi, ', ')).replace(/\s*,\s*,/g, ',') || undefined,
      courtRoom: courtRoomOf(r.COURTNAME),
      srNo: Number(r.CASESNO) || undefined,
      caseNo: `${type} ${r.CASENO}/${r.CASEYEAR}`,
      title: squashSpaces(r.PARTIES).replace(/\s+VS\s+/i, ' v. ') || undefined,
      stage: squashSpaces(r.CASESTAGENAME) || undefined,
    });
  }
  return out.map((e) => /** @type {import('../lib/common.mjs').Entry} */ (Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined))));
}

export async function fetchIhc(date, court = 'ihc') {
  const circuit = IHC_CIRCUITS[court];
  const res = await politeFetch(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(ihcBody(date, circuit)),
    timeoutMs: 90_000,
  });
  const entries = parseIhcResponse(await res.text());
  if (!entries.length) {
    log(court, `no list published for ${date} yet`);
    return null;
  }
  return { source: 'https://mis.ihc.gov.pk/frmCausLst', entries };
}
