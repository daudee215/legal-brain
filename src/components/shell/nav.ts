import {
  BookMarked,
  BookOpen,
  BookCopy,
  CalendarCheck2,
  ClipboardList,
  Hourglass,
  Settings,
  Smartphone,
  Briefcase,
  Calculator,
  CalendarDays,
  FilePen,
  FolderLock,
  Gavel,
  LayoutDashboard,
  Library,
  Newspaper,
  NotebookPen,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Action } from '../../lib/permissions';

export type NavGroup = 'Overview' | 'Practice' | 'Research' | 'Office';
export const NAV_GROUPS: NavGroup[] = ['Overview', 'Practice', 'Research', 'Office'];

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  action?: Action;
  group: NavGroup;
  /** Short hint shown in the command palette. */
  hint: string;
}

export const NAV: NavItem[] = [
  { href: '/app/', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview', hint: 'Your day at a glance' },
  { href: '/app/today/', label: 'Today', icon: CalendarCheck2, group: 'Overview', hint: 'Briefing, clashes, record outcomes' },
  { href: '/app/cases/', label: 'Cases & Clients', icon: Briefcase, group: 'Practice', hint: 'Every matter and client' },
  { href: '/app/cause-list/', label: 'Daily Cause List', icon: CalendarDays, group: 'Practice', hint: 'Today in court' },
  { href: '/app/diary/', label: 'Digital Diary', icon: NotebookPen, group: 'Practice', hint: 'Hearing notes & reminders' },
  { href: '/app/deadlines/', label: 'Deadlines', icon: Hourglass, group: 'Practice', hint: 'Limitation countdowns' },
  { href: '/app/tasks/', label: 'Tasks', icon: ClipboardList, group: 'Practice', hint: 'Who does what, by when' },
  { href: '/app/documents/', label: 'Documents', icon: FolderLock, group: 'Practice', hint: 'Secure file storage' },
  { href: '/app/laws/', label: 'Laws & Statutes', icon: BookOpen, group: 'Research', hint: 'Acts, codes, ordinances' },
  { href: '/app/case-law/', label: 'Case Law', icon: Gavel, group: 'Research', hint: 'Judgments & precedents' },
  { href: '/app/assistant/', label: 'AI Assistant', icon: Sparkles, action: 'assistant', group: 'Research', hint: 'Ask with citations' },
  { href: '/app/precedents/', label: 'Precedents', icon: BookMarked, group: 'Research', hint: 'Your citation bank' },
  { href: '/app/library/', label: 'Law Books', icon: Library, action: 'library', group: 'Research', hint: 'Your private library' },
  { href: '/app/news/', label: 'Legal News', icon: Newspaper, group: 'Research', hint: 'News & notifications' },
  { href: '/app/drafting/', label: 'Legal Drafting', icon: FilePen, action: 'drafting', group: 'Office', hint: 'Petitions & applications' },
  { href: '/app/paper-book/', label: 'Paper Book', icon: BookCopy, action: 'drafting', group: 'Office', hint: 'Merge, index, number PDFs' },
  { href: '/app/chamber/', label: 'Chamber', icon: Users, group: 'Office', hint: 'Team & roles' },
  { href: '/app/tools/', label: 'Tools', icon: Calculator, group: 'Office', hint: 'Limitation & fee calculators' },
  { href: '/app/munshi/', label: 'Munshi Mode', icon: Smartphone, group: 'Office', hint: 'Simple Urdu screen for the clerk' },
  { href: '/app/settings/', label: 'Data & Backup', icon: Settings, group: 'Office', hint: 'Start fresh, import, export' },
];

export function isActive(pathname: string, href: string): boolean {
  const p = pathname.endsWith('/') ? pathname : pathname + '/';
  if (href === '/app/') return p === '/app/';
  return p.startsWith(href) || (href === '/app/cases/' && (p.startsWith('/app/clients/') || p.startsWith('/app/case/')));
}
