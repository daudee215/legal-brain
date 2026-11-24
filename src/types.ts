export type Role = 'senior' | 'junior' | 'clerk';
export type CourtLevel = 'SC' | 'FCC' | 'HC' | 'District';
export type Jurisdiction = 'Federal' | 'Punjab' | 'Sindh' | 'KP' | 'Balochistan' | 'ICT';
export type CaseCategory =
  | 'Civil'
  | 'Criminal'
  | 'Family'
  | 'Constitutional'
  | 'Rent'
  | 'Banking'
  | 'Tax'
  | 'Service'
  | 'Corporate';
export type CaseStatus = 'pending' | 'adjourned' | 'reserved' | 'decided' | 'disposed';

export const CASE_STATUSES: CaseStatus[] = ['pending', 'adjourned', 'reserved', 'decided', 'disposed'];
export const CASE_CATEGORIES: CaseCategory[] = [
  'Civil',
  'Criminal',
  'Family',
  'Constitutional',
  'Rent',
  'Banking',
  'Tax',
  'Service',
  'Corporate',
];
export const JURISDICTIONS: Jurisdiction[] = ['Federal', 'Punjab', 'Sindh', 'KP', 'Balochistan', 'ICT'];

export interface Court {
  id: string;
  name: string;
  shortName: string;
  level: CourtLevel;
  city: string;
  statusUrl: string;
}
export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
}
export interface Chamber {
  id: string;
  name: string;
  members: Member[];
}
export interface Client {
  id: string;
  name: string;
  phone: string;
  cnicMasked: string;
  city: string;
  caseIds: string[];
}
export interface Hearing {
  date: string;
  proceedings: string;
  nextDate?: string;
}
export interface Case {
  id: string;
  chamberId: string;
  caseNo: string;
  title: string;
  category: CaseCategory;
  courtId: string;
  judge: string;
  stage: string;
  status: CaseStatus;
  filedOn: string;
  nextHearing?: string;
  clientId: string;
  assignedTo: string[];
  hearings: Hearing[];
  result?: string;
  /** Day key of the hearing the client was last reminded about (WhatsApp). */
  remindedFor?: string;
}
export interface CauseListEntry {
  date: string;
  courtId: string;
  bench: string;
  courtRoom: string;
  srNo: number;
  caseId: string;
}
export interface Section {
  no: string;
  heading: string;
  text: string;
}
export interface Statute {
  id: string;
  title: string;
  year: number;
  jurisdiction: Jurisdiction;
  category: string;
  sourceUrl: string;
  sections: Section[];
}
export interface Judgment {
  id: string;
  courtId: string;
  title: string;
  caseNo: string;
  date: string;
  judges: string[];
  summary: string;
  tags: string[];
  statutesCited: string[];
}
export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'textarea';
}
export interface DraftTemplate {
  id: string;
  title: string;
  category: CaseCategory;
  court: string;
  fields: TemplateField[];
  body: string;
}
export interface DiaryEntry {
  id: string;
  date: string;
  caseId?: string;
  authorId: string;
  text: string;
}
export interface NewsItem {
  id: string;
  date: string;
  title: string;
  source: string;
  summary: string;
}
export interface AppNotification {
  id: string;
  date: string;
  kind: 'hearing' | 'judgment' | 'news' | 'system';
  title: string;
  read: boolean;
  href?: string;
}
export type Accent = 'bronze' | 'emerald' | 'navy' | 'burgundy' | 'teal';

/** The senior advocate's choices for the whole chamber: colour scheme and what each role may do. */
export interface ChamberSettings {
  id: string;
  accent: Accent;
  /** Rights per role, replacing the defaults. Absent = defaults. */
  access?: Partial<Record<Role, import('./lib/permissions').Action[]>>;
  updatedOn: string;
}

export interface Book {
  id: string;
  /** The uploaded PDF in Documents storage, when this book has a file. */
  docId?: string;
  title: string;
  author: string;
  ownerId: string;
  pages: number;
  addedOn: string;
}
export interface DocFile {
  id: string;
  name: string;
  folder: string;
  caseId?: string;
  sizeKb: number;
  uploadedOn: string;
  uploadedBy: string;
  /** Key of the file bytes in on-device storage (IndexedDB), when the user uploaded a real file. */
  blobKey?: string;
  mime?: string;
  /** Exact size in bytes (recorded for uploads since shared storage arrived; older rows only have sizeKb). */
  size?: number;
  /** Path in the chamber's Supabase Storage bucket ("<chamberId>/<docId>-<name>"), set once the upload finished. */
  storagePath?: string;
}
export interface CaseStats {
  total: number;
  byStatus: Record<CaseStatus, number>;
  byCategory: Partial<Record<CaseCategory, number>>;
  byCourt: Record<string, number>;
}

export interface Db {
  chamber: Chamber;
  me: Member;
  courts: Court[];
  clients: Client[];
  cases: Case[];
  causeList: CauseListEntry[];
  statutes: Statute[];
  judgments: Judgment[];
  templates: DraftTemplate[];
  diary: DiaryEntry[];
  news: NewsItem[];
  notifications: AppNotification[];
  books: Book[];
  docs: DocFile[];
  fees: FeeLedger[];
  tasks: Task[];
  deadlines: Deadline[];
  precedents: Precedent[];
  expenses: Expense[];
  settings?: ChamberSettings[];
}

export interface FeePayment {
  date: string;
  amount: number;
  mode: 'Cash' | 'Cheque' | 'Bank transfer' | 'Online';
  note?: string;
}
/** Professional fee agreed for a case and what the client has paid so far (PKR). */
export interface FeeLedger {
  caseId: string;
  agreed: number;
  payments: FeePayment[];
}
export interface ActivityItem {
  date: string;
  kind: 'hearing' | 'diary' | 'document' | 'payment';
  title: string;
  detail: string;
  href?: string;
}

/** A to-do for someone in the chamber (e.g. "collect certified copy"), optionally tied to a case. */
export interface Task {
  id: string;
  title: string;
  caseId?: string;
  assigneeId: string;
  due?: string; // day key
  done: boolean;
  createdAt: string;
}
/** A limitation countdown started when an order/judgment is passed. Copy dates extend it (s.12 Limitation Act). */
export interface Deadline {
  id: string;
  caseId: string;
  remedyId: string;
  orderDate: string; // day key
  copyAppliedOn?: string;
  copyReadyOn?: string;
  filedOn?: string;
  note?: string;
}
/** A citation the lawyer relies on, tagged by legal issue — her own notes, not reporter text. */
export interface Precedent {
  id: string;
  citation: string;
  title: string;
  court?: string;
  year?: number;
  tags: string[];
  note: string;
  caseIds: string[];
}
/** Money spent on a case (court fee, stamp paper, photocopies, munshi) — reimbursable from the client. */
export interface Expense {
  id: string;
  caseId: string;
  date: string;
  amount: number;
  kind: 'Court fee' | 'Stamp paper' | 'Photocopies' | 'Certified copy' | 'Travel' | 'Munshi' | 'Other';
  note?: string;
  reimbursed: boolean;
}
