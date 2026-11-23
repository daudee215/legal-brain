import {
  BookOpen,
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

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  action?: Action;
}

export const NAV: NavItem[] = [
  { href: '/app/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/laws/', label: 'Laws & Statutes', icon: BookOpen },
  { href: '/app/case-law/', label: 'Case Law', icon: Gavel },
  { href: '/app/cause-list/', label: 'Daily Cause List', icon: CalendarDays },
  { href: '/app/cases/', label: 'Cases & Clients', icon: Briefcase },
  { href: '/app/drafting/', label: 'Legal Drafting', icon: FilePen, action: 'drafting' },
  { href: '/app/assistant/', label: 'AI Assistant', icon: Sparkles, action: 'assistant' },
  { href: '/app/news/', label: 'Legal News', icon: Newspaper },
  { href: '/app/diary/', label: 'Digital Diary', icon: NotebookPen },
  { href: '/app/library/', label: 'Law Books', icon: Library, action: 'library' },
  { href: '/app/documents/', label: 'Documents', icon: FolderLock },
  { href: '/app/chamber/', label: 'Chamber', icon: Users },
  { href: '/app/tools/', label: 'Tools', icon: Calculator },
];

export function isActive(pathname: string, href: string): boolean {
  const p = pathname.endsWith('/') ? pathname : pathname + '/';
  if (href === '/app/') return p === '/app/';
  return p.startsWith(href) || (href === '/app/cases/' && p.startsWith('/app/clients/'));
}
