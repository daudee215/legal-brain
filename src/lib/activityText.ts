/** One line of the chamber's activity log, as written by the server (`diff_lines` in supabase/safety.sql). */
export interface ActivityLine {
  k: string;
  op: 'added' | 'removed' | 'changed' | 'restored' | 'more';
  label: string;
}
export interface ActivityRow {
  id: number;
  at: string;
  user_name: string;
  role: string;
  kind: string;
  lines: ActivityLine[];
}
export interface BackupRow {
  id: string;
  kind: 'data' | 'billing';
  taken_at: string;
  reason: string;
  summary: Record<string, number>;
}

type T = (key: string, vars?: Record<string, string | number>, fallback?: string) => string;

/** What each part of the data is called in a sentence. */
export const NOUN: Record<string, string> = {
  cases: 'case',
  clients: 'client',
  causeList: 'cause list entry',
  deadlines: 'deadline',
  diary: 'diary note',
  notifications: 'reminder',
  docs: 'document',
  books: 'law book',
  precedents: 'precedent',
  tasks: 'task',
  settings: 'chamber settings',
  fees: 'fee record',
  expenses: 'expense',
};

/** Plural forms, for counts. */
export const NOUN_PLURAL: Record<string, string> = {
  cases: 'cases',
  clients: 'clients',
  causeList: 'cause list entries',
  deadlines: 'deadlines',
  diary: 'diary notes',
  notifications: 'reminders',
  docs: 'documents',
  books: 'law books',
  precedents: 'precedents',
  tasks: 'tasks',
  fees: 'fee records',
  expenses: 'expenses',
};

const VERB_EN: Record<string, string> = { added: 'added', removed: 'removed', changed: 'changed' };

/** "Bilal added case “A v B”", in the app's current language. */
export function lineText(line: ActivityLine, who: string, t: T): string {
  const name = who || t('studio.safe.someone', undefined, 'Someone');
  if (line.op === 'restored') return t('studio.safe.restored', { who: name, when: line.label }, `${name} restored the chamber to ${line.label}`);
  if (line.op === 'more') return t('studio.safe.more', { n: line.label }, `…and ${line.label} more changes`);
  if (line.k === 'settings') return t('studio.safe.settings', { who: name }, `${name} changed the chamber settings`);
  const noun = t(`studio.noun.${line.k}`, undefined, NOUN[line.k] ?? line.k);
  const verb = VERB_EN[line.op] ?? line.op;
  return t(`studio.safe.${line.op}`, { who: name, noun, label: line.label }, `${name} ${verb} ${noun}${line.label ? ` “${line.label}”` : ''}`);
}

/** "12 cases, 4 clients …" for a restore point. Only the parts that have something in them. */
export function backupSummaryText(summary: Record<string, number>, t: T): string {
  return Object.entries(summary)
    .filter(([k, n]) => n > 0 && k !== 'settings')
    .map(([k, n]) => `${n} ${t(`studio.nounp.${k}`, undefined, NOUN_PLURAL[k] ?? k)}`)
    .join(' · ');
}
