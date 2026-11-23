/**
 * Evening hearing reminders: one WhatsApp message per client the day before their hearing.
 * Sending is a wa.me link (the user taps Send in WhatsApp); the app remembers who was reminded
 * for which date, so a chamber never double-messages a client and nobody is forgotten.
 */
import { addDays, formatPk, weekday } from './dates';
import type { HearingRow } from './repo';
import { updateDb } from './store';
import { toWaNumber } from './whatsapp';
import type { Case, Client, Court } from '../types';

/** The next day courts sit: tomorrow, or Monday when tomorrow is Sunday. */
export function nextCourtDay(todayKey: string): string {
  const next = addDays(todayKey, 1);
  return weekday(next) === 'Sunday' ? addDays(next, 1) : next;
}

export interface ReminderMsg {
  clientName?: string;
  caseTitle: string;
  caseNo?: string;
  court: string;
  dayKey: string;
  /** '09:00 AM', or '' when the time is not known */
  time: string;
  courtRoom?: string;
  srNo?: number;
  /** e.g. 'original CNIC and the sale deed' */
  bring?: string;
  /** ask the client to come to court */
  attend?: boolean;
}

/** Reminder for the client: English, then Urdu. */
export function reminderMessage(m: ReminderMsg): string {
  const first = m.clientName?.trim().split(/\s+/)[0];
  const when = `${weekday(m.dayKey).slice(0, 3)}, ${formatPk(m.dayKey)}${m.time ? ` at ${m.time}` : ''}`;
  const where = [m.court, m.courtRoom ? `Court room ${m.courtRoom}${m.srNo ? `, serial ${m.srNo}` : ''}` : ''].filter(Boolean).join(' — ');
  const lines = [
    `Assalam-o-Alaikum${first ? ` ${first}` : ''},`,
    `Reminder: your case ${m.caseTitle}${m.caseNo ? ` (${m.caseNo})` : ''} is fixed for hearing on ${when}.`,
    `Court: ${where}.`,
  ];
  if (m.attend) lines.push('Please be present in court on time.');
  if (m.bring?.trim()) lines.push(`Please bring: ${m.bring.trim().replace(/\.$/, '')}.`);
  lines.push('');
  lines.push(`یاد دہانی: آپ کے کیس کی سماعت ${formatPk(m.dayKey)}${m.time ? ` کو ${m.time}` : ' کو'} ${m.court} میں ہے۔`);
  if (m.attend) lines.push('براہ کرم وقت پر عدالت میں حاضر ہوں۔');
  if (m.bring?.trim()) lines.push(`ساتھ لائیں: ${m.bring.trim()}`);
  return lines.join('\n');
}

export interface ReminderRow {
  case: Case;
  court: Court;
  client?: Client;
  courtRoom?: string;
  srNo?: number;
  /** already reminded for this hearing date */
  sent: boolean;
  /** client has a number WhatsApp can open */
  phoneOk: boolean;
}

export function remindersFor(dayKey: string, rows: HearingRow[], clients: Client[]): ReminderRow[] {
  return rows.map(({ case: c, court, entry }) => {
    const client = clients.find((x) => x.id === c.clientId);
    return {
      case: c,
      court,
      client,
      courtRoom: entry?.courtRoom,
      srNo: entry?.srNo,
      sent: c.remindedFor === dayKey,
      phoneOk: toWaNumber(client?.phone) !== null,
    };
  });
}

/** Remember (or forget) that this case's client was reminded for the hearing on `dayKey`. */
export function setReminded(caseId: string, dayKey: string, sent: boolean) {
  updateDb((db) => {
    const c = db.cases.find((x) => x.id === caseId);
    if (!c) return;
    if (sent) c.remindedFor = dayKey;
    else if (c.remindedFor === dayKey) delete c.remindedFor;
  });
}
