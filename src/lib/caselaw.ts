/**
 * Real judgments shipped as static files (public/caselaw/), built by scripts/import-sc-judgments.mjs.
 * The list is one light index file; a judgment's full text is fetched only when it is opened.
 */
import type { Judgment } from '../types';

export interface OfficialJudgment extends Judgment {
  /** false when the decision date could not be read and only the year is known */
  dateKnown: boolean;
  words: number;
  /** where the court publishes its judgments */
  source: string;
  /** the court's PDF file name */
  file: string;
}

export interface JudgmentText {
  id: string;
  /** court heading, bench, parties and counsel, line by line */
  header: string[];
  /** the judgment itself, one entry per paragraph */
  body: string[];
}

let indexPromise: Promise<OfficialJudgment[]> | null = null;

/** All Supreme Court judgments in the library (fetched once per page load). */
export function loadOfficialJudgments(): Promise<OfficialJudgment[]> {
  if (!indexPromise) {
    indexPromise = fetch('/caselaw/sc/index.json')
      .then((r) => {
        if (!r.ok) throw new Error(`index ${r.status}`);
        return r.json() as Promise<OfficialJudgment[]>;
      })
      .catch((e) => {
        indexPromise = null; // let the next visit try again
        throw e;
      });
  }
  return indexPromise;
}

const ID_RE = /^sc-[a-z0-9-]+$/;

export const isOfficialId = (id: string) => ID_RE.test(id);

export async function loadJudgmentText(id: string): Promise<JudgmentText | null> {
  if (!isOfficialId(id)) return null;
  const r = await fetch(`/caselaw/sc/${id}.json`);
  if (!r.ok) return null;
  return (await r.json()) as JudgmentText;
}

export const officialHref = (id: string) => `/app/case-law/read/?id=${encodeURIComponent(id)}`;

/** "Muhammad Aslam v. The State, Supreme Court of Pakistan, Criminal Petition No. 12 of 2020, decided 3 March 2020" */
export function citationLine(j: Pick<OfficialJudgment, 'title' | 'caseNo' | 'date' | 'dateKnown'>, courtName = 'Supreme Court of Pakistan'): string {
  const when = j.date
    ? j.dateKnown
      ? `decided ${new Date(`${j.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : j.date.slice(0, 4)
    : '';
  const parts = [j.title, courtName];
  if (j.caseNo && j.caseNo.toLowerCase() !== j.title.toLowerCase()) parts.push(j.caseNo);
  if (when) parts.push(when);
  return parts.join(', ');
}
