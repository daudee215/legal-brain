/**
 * Calendar (.ics, RFC 5545) export of hearings, for Google Calendar, Outlook and the phone's calendar.
 * Times are Pakistan time (Asia/Karachi, fixed +05:00, no daylight saving).
 */
import { downloadBlob } from './files';

export interface IcsItem {
  /** Stable id, e.g. `${caseId}-${dayKey}` — the same hearing exported twice replaces itself. */
  uid: string;
  title: string;
  /** ISO local date "2026-11-24" (all-day) or date-time "2026-11-24T09:30[:00][+05:00]". */
  start: string;
  location?: string;
  description?: string;
}

const CRLF = '\r\n';
const enc = new TextEncoder();

/** RFC 5545 TEXT escaping: backslash, semicolon, comma, newline. */
export function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Fold a content line at 75 octets (UTF-8), never splitting a multi-byte character. */
export function foldLine(line: string): string {
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = '';
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      parts.push(cur);
      cur = '';
      curBytes = 0;
      limit = 74; // continuation lines start with one space
    }
    cur += ch;
    curBytes += b;
  }
  parts.push(cur);
  return parts.join(CRLF + ' ');
}

const pad = (n: number) => String(n).padStart(2, '0');

function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Split an ISO start into a date ("20261124") and an optional Karachi wall time ("093000"). */
function parseStart(iso: string): { date: string; time?: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(iso.trim());
  if (!m) throw new Error(`Not an ISO date: ${iso}`);
  const [, y, mo, d, hh, mi, ss, zone] = m;
  if (hh === undefined) return { date: `${y}${mo}${d}` };
  if (!zone || /^\+05:?00$/.test(zone)) return { date: `${y}${mo}${d}`, time: `${hh}${mi}${ss ?? '00'}` };
  // another offset: convert to Karachi wall time (UTC+5)
  const t = new Date(iso).getTime() + 5 * 3600 * 1000;
  const k = new Date(t);
  return {
    date: `${k.getUTCFullYear()}${pad(k.getUTCMonth() + 1)}${pad(k.getUTCDate())}`,
    time: `${pad(k.getUTCHours())}${pad(k.getUTCMinutes())}${pad(k.getUTCSeconds())}`,
  };
}

function nextDay(yyyymmdd: string): string {
  const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + 1));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** UID-safe text: keep letters, digits, dot, dash and underscore. */
function uidPart(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, '-');
}

/** Build a VCALENDAR with one VEVENT per hearing, each with reminders 1 day and 1 hour before. */
export function hearingsToIcs(items: IcsItem[], chamberName: string, now: Date = new Date()): string {
  const stamp = utcStamp(now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeText(chamberName || 'Chamber').replace(/\/\//g, '/')}//Hearings//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`${chamberName || 'Chamber'} hearings`)}`,
    'X-WR-TIMEZONE:Asia/Karachi',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Karachi',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0500',
    'TZOFFSETTO:+0500',
    'TZNAME:PKT',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
  for (const it of items) {
    const { date, time } = parseStart(it.start);
    lines.push('BEGIN:VEVENT', `UID:${uidPart(it.uid)}-${date}@hearings`, `DTSTAMP:${stamp}`);
    if (time) {
      lines.push(`DTSTART;TZID=Asia/Karachi:${date}T${time}`, 'DURATION:PT1H');
    } else {
      lines.push(`DTSTART;VALUE=DATE:${date}`, `DTEND;VALUE=DATE:${nextDay(date)}`, 'TRANSP:TRANSPARENT');
    }
    lines.push(`SUMMARY:${escapeText(it.title)}`);
    if (it.location) lines.push(`LOCATION:${escapeText(it.location)}`);
    if (it.description) lines.push(`DESCRIPTION:${escapeText(it.description)}`);
    for (const [trigger, label] of [
      ['-P1D', 'Hearing tomorrow'],
      ['-PT1H', 'Hearing in one hour'],
    ] as const) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:${trigger}`, `DESCRIPTION:${escapeText(`${label}: ${it.title}`)}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Save the calendar file on this device. */
export function downloadIcs(ics: string, filename: string) {
  downloadBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), filename.endsWith('.ics') ? filename : `${filename}.ics`);
}
