/**
 * One-tap WhatsApp sharing (wa.me links) until the WhatsApp Business API arrives in Phase 2.
 */
import { formatPk } from './dates';

/** '0300-1234567' / '+92 300 1234567' / '3001234567' → '923001234567'; null when it isn't a usable number. */
export function toWaNumber(phone?: string | null): string | null {
  let d = (phone ?? '').replace(/\D/g, '');
  if (d.startsWith('0092')) d = d.slice(2);
  else if (d.startsWith('0')) d = `92${d.slice(1)}`;
  else if (d.length === 10 && d.startsWith('3')) d = `92${d}`;
  if (!d.startsWith('92') || d.length < 11 || d.length > 13) return null;
  return d;
}

/** wa.me link to the number, or the "choose a chat" picker when there is no number. */
export function waLink(phone: string | null | undefined, text: string): string {
  const n = toWaNumber(phone);
  return `https://wa.me/${n ?? ''}?text=${encodeURIComponent(text)}`;
}

export interface OutcomeMsg {
  clientName?: string;
  caseTitle: string;
  caseNo?: string;
  court?: string;
  /** e.g. 'Adjourned', 'Arguments heard' */
  happened: string;
  nextDate?: string;
  result?: string;
}

/** Update for the client after a hearing: English, then an Urdu line. */
export function outcomeMessage(m: OutcomeMsg): string {
  const first = m.clientName?.trim().split(/\s+/)[0];
  const ref = [m.caseNo, m.court].filter(Boolean).join(', ');
  const lines = [
    `Assalam-o-Alaikum${first ? ` ${first}` : ''},`,
    `Update on your case: ${m.caseTitle}${ref ? ` (${ref})` : ''}.`,
    `Today: ${m.happened}.`,
  ];
  if (m.result?.trim()) lines.push(`Result: ${m.result.trim()}.`);
  if (m.nextDate) lines.push(`Next date: ${formatPk(m.nextDate)}.`);
  lines.push('');
  if (m.nextDate) lines.push(`آپ کے کیس کی آج سماعت ہوئی۔ اگلی تاریخ: ${formatPk(m.nextDate)}`);
  else if (m.result?.trim()) lines.push('آپ کے کیس کا فیصلہ ہو گیا ہے۔ تفصیل کے لیے رابطہ کریں۔');
  else lines.push('آپ کے کیس کی آج سماعت ہوئی۔ تفصیل کے لیے رابطہ کریں۔');
  return lines.join('\n');
}

export interface BriefingRow {
  title: string;
  caseNo?: string;
  court: string;
  time: string;
  courtRoom?: string;
  srNo?: number;
}

/** The whole day's list as plain text, for the chamber's WhatsApp group. */
export function briefingMessage(dayKey: string, rows: BriefingRow[]): string {
  const head = `Cause list — ${formatPk(dayKey)}`;
  if (rows.length === 0) return `${head}\nNo hearings listed.`;
  const body = rows.map((r, i) => {
    const where = r.courtRoom || r.srNo ? ` · Ct ${r.courtRoom ?? '—'}, Sr. ${r.srNo ?? '—'}` : '';
    return `${i + 1}. ${r.time} · ${r.court} — ${r.title}${r.caseNo ? ` (${r.caseNo})` : ''}${where}`;
  });
  return [head, `${rows.length} hearing${rows.length === 1 ? '' : 's'}`, '', ...body].join('\n');
}
