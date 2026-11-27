/**
 * Judgments shipped as static files, grouped by court or source.
 * The browser fetches the light indexes first and loads the full text when a reader opens.
 */
import type { Judgment } from '../types';

export interface OfficialJudgment extends Judgment {
  /** false when the decision date could not be read and only the year is known */
  dateKnown: boolean;
  words: number;
  /** the source page or original court PDF for this judgment */
  source: string;
  /** attribution for judgments collected from a published library */
  sourceName?: 'Pakistan Case Law';
  /** personal contact numbers were removed from the reader text */
  redacted?: boolean;
  /** the court's PDF file name */
  file: string;
  /** neutral citation(s) given by the court, e.g. "2025 SHC KHI 266" */
  citation?: string;
  /** bench seat, e.g. "Hyderabad" */
  seat?: string;
  /** how the case was disposed of, as the court records it */
  outcome?: string;
  /** approved for reporting */
  reported?: boolean;
  /** the summary was written by the court (not the opening lines of the judgment) */
  courtSummary?: boolean;
}

export interface JudgmentText {
  id: string;
  /** court heading, bench, parties and counsel, line by line */
  header: string[];
  /** the judgment itself, one entry per paragraph */
  body: string[];
}

/** Courts with judgments in the library, in the order they are listed. */
export const LIBRARY_COURTS = [
  { id: 'sc', name: 'Supreme Court of Pakistan', short: 'Supreme Court', site: 'https://www.supremecourt.gov.pk/judgements/' },
  { id: 'shc', name: 'Sindh High Court', short: 'Sindh High Court', site: 'https://caselaw.shc.gov.pk/caselaw/public/home' },
  { id: 'lhc', name: 'Lahore High Court', short: 'Lahore High Court', site: 'https://lhc.gov.pk/reported_judgments' },
  { id: 'ihc', name: 'Islamabad High Court', short: 'Islamabad High Court', site: 'https://mis.ihc.gov.pk/frmJgmnt?jgs=1' },
  { id: 'phc', name: 'Peshawar High Court', short: 'Peshawar High Court', site: 'https://www.peshawarhighcourt.gov.pk/PHCCMS/reportedJudgments.php' },
] as const;
export type LibraryCourtId = (typeof LIBRARY_COURTS)[number]['id'];

const PAKISTAN_CASE_LAW_FOLDER = 'pakistancaselaw';
const PAKISTAN_CASE_LAW_ID = /^pcl-\d+$/;

let indexPromise: Promise<OfficialJudgment[]> | null = null;

async function loadCourt(court: string): Promise<OfficialJudgment[]> {
  const r = await fetch(`/caselaw/${court}/index.json`);
  if (!r.ok) throw new Error(`${court} index ${r.status}`);
  return (await r.json()) as OfficialJudgment[];
}

/** Every judgment in the library, newest first (fetched once per page load). */
export function loadOfficialJudgments(): Promise<OfficialJudgment[]> {
  if (!indexPromise) {
    indexPromise = Promise.all([
      ...LIBRARY_COURTS.map((c) => loadCourt(c.id)),
      loadCourt(PAKISTAN_CASE_LAW_FOLDER),
    ])
      .then((lists) => lists.flat().sort((a, b) => (a.date < b.date ? 1 : -1)))
      .catch((e) => {
        indexPromise = null; // let the next visit try again
        throw e;
      });
  }
  return indexPromise;
}

const ID_RE = new RegExp(`^(${LIBRARY_COURTS.map((court) => court.id).join('|')})-[a-z0-9-]+$`);

export const isOfficialId = (id: string) => ID_RE.test(id) || PAKISTAN_CASE_LAW_ID.test(id);
export const courtOfId = (id: string) => id.slice(0, id.indexOf('-'));
export const libraryCourt = (id: string) => LIBRARY_COURTS.find((c) => c.id === id);

export async function loadJudgmentText(id: string): Promise<JudgmentText | null> {
  if (!isOfficialId(id)) return null;
  const folder = PAKISTAN_CASE_LAW_ID.test(id) ? PAKISTAN_CASE_LAW_FOLDER : courtOfId(id);
  const r = await fetch(`/caselaw/${folder}/${id}.json`);
  if (!r.ok) return null;
  return (await r.json()) as JudgmentText;
}

export const officialHref = (id: string) => `/app/case-law/read/?id=${encodeURIComponent(id)}`;

/** "Muhammad Aslam v. The State, Supreme Court of Pakistan, Criminal Petition No. 12 of 2020, decided 3 March 2020" */
export function citationLine(j: Pick<OfficialJudgment, 'title' | 'caseNo' | 'date' | 'dateKnown' | 'courtId' | 'citation'>): string {
  const courtName = libraryCourt(j.courtId)?.name ?? '';
  const when = j.date
    ? j.dateKnown
      ? `decided ${new Date(`${j.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : j.date.slice(0, 4)
    : '';
  const parts = [j.title];
  if (j.citation) parts.push(j.citation);
  if (courtName) parts.push(courtName);
  if (j.caseNo && j.caseNo.toLowerCase() !== j.title.toLowerCase()) parts.push(j.caseNo);
  if (when) parts.push(when);
  return parts.join(', ');
}
