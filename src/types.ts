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
export interface Book {
  id: string;
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
}
