const TZ = 'Asia/Karachi';

const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' of an ISO instant (or a bare day key) in Pakistan time. */
export function pktDateKey(iso: string): string {
  if (DAY_KEY.test(iso)) return iso;
  return keyFmt.format(new Date(iso));
}

export function todayKey(now: Date = new Date()): string {
  return keyFmt.format(now);
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** '23 Nov 2026' */
export function formatPk(iso: string): string {
  const [y, m, d] = pktDateKey(iso).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** '09:00 AM' in Pakistan time. */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** Weekday name for a day key, e.g. 'Monday'. */
export function weekday(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

/** ISO instant for a day key + 'HH:MM' in PKT. */
export function pktIso(key: string, hhmm = '09:00'): string {
  return `${key}T${hhmm}:00+05:00`;
}

const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false });
/** Hour of day (0–23) in Pakistan time. */
export function pktHour(now: Date = new Date()): number {
  return Number(hourFmt.format(now)) % 24;
}
/** 'Good morning' / 'Good afternoon' / 'Good evening' for the time in Pakistan. */
export function greeting(now: Date = new Date()): string {
  const h = pktHour(now);
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
