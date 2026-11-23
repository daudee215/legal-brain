# Legal Brain — Phase 0 (Local Clickable Draft) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A clickable, locally running draft of Legal Brain — landing page plus every dashboard module — filled with realistic Pakistani sample data, for the user and the advocate to review before anything goes online.

**Architecture:** Next.js App Router, statically exported (`output: 'export'`) so it can later be served by GitHub Pages unchanged. All data comes from an in-memory seed through one async data layer (`src/lib/repo.ts`); Phase 2 replaces that file's internals with Supabase calls and no page changes. The "logged-in user" and their chamber role come from a demo context with a role switcher, so Senior / Junior / Clerk views can be previewed.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS 4, `next/font/google` (Playfair Display + Inter), lucide-react icons, Vitest + @testing-library/react (logic + components), Playwright (route smoke + mobile checks).

**Spec:** `PLAN.md` (project root). Executors read both.

## Global Constraints

- Product: **multi-lawyer** product; each lawyer belongs to a **Chamber**; roles `senior | junior | clerk` with permissions exactly as in PLAN.md §6.2.
- Brand name: **Legal Brain**. Domain later: wakeelpropk.com. No real names of real lawyers/clients in seed data; demo user is "Advocate Ayesha Khan".
- Colours (CSS tokens on `:root`): `--cream #F4EEE4`, `--paper #FBF8F3`, `--ink #3A2A1D`, `--bronze #8C5E34`, `--bronze-soft #C9A27A`, `--line #E3D8C8`, `--danger #A23B2A`, `--ok #3F6B45`. Dark hero card uses `--ink` background with cream text.
- Type: headings Playfair Display (600/700), body Inter.
- Layout: left sidebar (from `past demo.png`) on ≥1024px; collapsible drawer below. Must work at 375px wide with no horizontal scroll.
- Static export only: no API routes, no server actions, no `next/headers`. Every dynamic route has `generateStaticParams`.
- All dates are shown and computed in **Asia/Karachi** time, format `23 Nov 2026`.
- Every sample statute/judgment/AI answer screen shows a small "Demo data — not legal advice" badge.
- Copyright: seed only statute text from public government sources (short excerpts) and invented judgments; no PLD/SCMR text.
- `docs/reference/` (screenshots, chat text) is git-ignored — the repo will become public for GitHub Pages.

## Review Focus

1. **Brand-new lawyer with zero cases / no hearings today** — dashboard, cause list and cases pages show a friendly empty state, never crash or show "undefined". (Test in Task 6.)
2. **Phone in court (375px)** — sidebar becomes a drawer, tables become cards, no horizontal page scroll. (Playwright test in Task 13.)
3. **"Today" near midnight** — a hearing on 24 Nov at 00:30 PKT must count as 24 Nov even when the laptop clock is UTC. (Test in Task 2.)
4. **Template filled with blanks** — unfilled fields show as `[Client Name]`, never `{{client_name}}` or `undefined`. (Test in Task 10.)
5. **Clerk opens a restricted URL directly** (`/app/assistant`) — sees a "Your role doesn't have access" panel, not the page. (Test in Task 3.)

---

## File Structure

```
/                         Next.js project root (this folder)
  PLAN.md                 spec
  docs/reference/         moved: Demands.txt, *.png, *.jpg  (git-ignored)
  next.config.ts          output:'export', images.unoptimized
  src/app/
    layout.tsx            fonts, tokens, <body>
    globals.css           tokens + Tailwind
    page.tsx              landing (public)
    login/page.tsx        signup/page.tsx      (non-functional forms → /app)
    app/layout.tsx        AppShell (sidebar + topbar) + RoleProvider
    app/page.tsx          Dashboard
    app/cases/page.tsx    app/cases/[id]/page.tsx    app/clients/page.tsx
    app/cause-list/page.tsx
    app/laws/page.tsx     app/laws/[id]/page.tsx
    app/case-law/page.tsx app/case-law/[id]/page.tsx
    app/drafting/page.tsx app/drafting/[id]/page.tsx
    app/assistant/page.tsx
    app/news/page.tsx     (news + notifications tabs)
    app/diary/page.tsx
    app/library/page.tsx  (law books, private shelf)
    app/documents/page.tsx
    app/chamber/page.tsx
    app/tools/page.tsx    (limitation calculator)
  src/types.ts            all domain types
  src/data/seed.ts        sample data (dates relative to today)
  src/lib/dates.ts        PKT helpers
  src/lib/repo.ts         async data access (Phase 2 swap point)
  src/lib/search.ts       client-side text search
  src/lib/permissions.ts  can(role, action)
  src/lib/templates.ts    fillTemplate
  src/lib/limitation.ts   limitation deadlines
  src/components/shell/   Sidebar, Topbar, RoleProvider, RoleGate, MobileDrawer
  src/components/ui/      Card, StatTile, Badge, EmptyState, DemoBadge, DataTable, SearchBox
  tests/unit/*.test.ts(x) Vitest
  tests/e2e/*.spec.ts     Playwright
```

## Shared Types (Task 2 creates; everyone uses)

```ts
export type Role = 'senior' | 'junior' | 'clerk';
export type CourtLevel = 'SC' | 'FCC' | 'HC' | 'District';
export type Jurisdiction = 'Federal' | 'Punjab' | 'Sindh' | 'KP' | 'Balochistan' | 'ICT';
export type CaseCategory = 'Civil' | 'Criminal' | 'Family' | 'Constitutional' | 'Rent' | 'Banking' | 'Tax' | 'Service' | 'Corporate';
export type CaseStatus = 'pending' | 'adjourned' | 'reserved' | 'decided' | 'disposed';

export interface Court { id: string; name: string; shortName: string; level: CourtLevel; city: string; statusUrl: string }
export interface Member { id: string; name: string; email: string; role: Role }
export interface Chamber { id: string; name: string; members: Member[] }
export interface Client { id: string; name: string; phone: string; cnicMasked: string; city: string; caseIds: string[] }
export interface Hearing { date: string /* ISO with +05:00 */; proceedings: string; nextDate?: string }
export interface Case {
  id: string; chamberId: string; caseNo: string; title: string; category: CaseCategory;
  courtId: string; judge: string; stage: string; status: CaseStatus;
  filedOn: string; nextHearing?: string; clientId: string; assignedTo: string[];
  hearings: Hearing[]; result?: string;
}
export interface CauseListEntry { date: string; courtId: string; bench: string; courtRoom: string; srNo: number; caseId: string }
export interface Section { no: string; heading: string; text: string }
export interface Statute { id: string; title: string; year: number; jurisdiction: Jurisdiction; category: string; sourceUrl: string; sections: Section[] }
export interface Judgment { id: string; courtId: string; title: string; caseNo: string; date: string; judges: string[]; summary: string; tags: string[]; statutesCited: string[] }
export interface TemplateField { key: string; label: string; type: 'text' | 'date' | 'textarea' }
export interface DraftTemplate { id: string; title: string; category: CaseCategory; court: string; fields: TemplateField[]; body: string }
export interface DiaryEntry { id: string; date: string; caseId?: string; authorId: string; text: string }
export interface NewsItem { id: string; date: string; title: string; source: string; summary: string }
export interface AppNotification { id: string; date: string; kind: 'hearing' | 'judgment' | 'news' | 'system'; title: string; read: boolean; href?: string }
export interface Book { id: string; title: string; author: string; ownerId: string; pages: number; addedOn: string }
export interface DocFile { id: string; name: string; folder: string; caseId?: string; sizeKb: number; uploadedOn: string; uploadedBy: string }
export interface CaseStats { total: number; byStatus: Record<CaseStatus, number>; byCategory: Partial<Record<CaseCategory, number>>; byCourt: Record<string, number> }
```

---

### Task 1: Scaffold project, theme and test tooling

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` (placeholder), `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `tests/unit/smoke.test.ts`
- Move: `Demands.txt`, `*.png`, `*.jpg` → `docs/reference/`

**Interfaces:**
- Produces: npm scripts `dev` (port 3000), `build`, `test` (vitest run), `e2e` (playwright, starts `npx serve out -l 4173`); CSS tokens from Global Constraints; Tailwind theme colours `cream, paper, ink, bronze, bronze-soft, line, danger, ok`; font CSS vars `--font-serif`, `--font-sans`.

- [ ] **Step 1:** `git init`; move reference files to `docs/reference/`; `.gitignore` includes `node_modules`, `.next`, `out`, `docs/reference/`, `.env*`, `test-results`, `playwright-report`.
- [ ] **Step 2:** `npx create-next-app@15 . --ts --tailwind --app --src-dir --eslint --no-import-alias --use-npm` (answer into existing folder); add `lucide-react`, dev deps `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test serve`.
- [ ] **Step 3:** `next.config.ts`: `{ output: 'export', images: { unoptimized: true }, trailingSlash: true }`. Tokens + fonts in `globals.css`/`layout.tsx`.
- [ ] **Step 4:** Write `tests/unit/smoke.test.ts` asserting `1+1===2`; run `npm test` → PASS.
- [ ] **Step 5:** `npm run build` → Expected: `out/index.html` exists, no errors.
- [ ] **Step 6:** Commit `chore: scaffold Next.js static app with Legal Brain theme`.

### Task 2: Types, PKT dates, seed data, repo

**Files:**
- Create: `src/types.ts`, `src/lib/dates.ts`, `src/data/seed.ts`, `src/lib/repo.ts`
- Test: `tests/unit/dates.test.ts`, `tests/unit/repo.test.ts`

**Interfaces:**
- Produces (`dates.ts`): `pktDateKey(iso: string): string` → `'YYYY-MM-DD'` in Asia/Karachi; `todayKey(now?: Date): string`; `addDays(key: string, n: number): string`; `formatPk(iso: string): string` → `'23 Nov 2026'`; `formatTime(iso): string` → `'09:00 AM'`.
- Produces (`seed.ts`): `seed: { chamber: Chamber; me: Member; courts: Court[]; clients: Client[]; cases: Case[]; causeList: CauseListEntry[]; statutes: Statute[]; judgments: Judgment[]; templates: DraftTemplate[]; diary: DiaryEntry[]; news: NewsItem[]; notifications: AppNotification[]; books: Book[]; docs: DocFile[] }`, built with dates relative to `todayKey()` so the dashboard always has hearings today/tomorrow.
- Produces (`repo.ts`, all `async`, all take optional `db = seed` as last param for testing):
  `listCases(f?: { status?: CaseStatus; category?: CaseCategory; courtId?: string; q?: string }): Promise<Case[]>`,
  `getCase(id): Promise<Case | undefined>`, `getCourt(id)`, `listCourts()`, `getClient(id)`, `listClients()`,
  `hearingsOn(dayKey: string): Promise<{ case: Case; entry?: CauseListEntry; court: Court }[]>` (sorted by court then srNo),
  `upcomingHearings(fromKey: string, days: number): Promise<Case[]>` (nextHearing within range, ascending),
  `caseStats(): Promise<CaseStats>`,
  `listStatutes()`, `getStatute(id)`, `listJudgments()`, `getJudgment(id)`, `listTemplates()`, `getTemplate(id)`,
  `listDiary(dayKey?: string)`, `listNews()`, `listNotifications()`, `unreadCount(): Promise<number>`, `listBooks(ownerId)`, `listDocs(folder?)`, `getChamber()`.

Seed contents (minimum): 6 courts — Supreme Court (Islamabad), Federal Constitutional Court, Lahore HC (Lahore), Islamabad HC, Sindh HC (Karachi), Civil Courts Lahore; `statusUrl` = each court's official site from PLAN.md sources. 3 members (Ayesha Khan senior, Bilal Ahmed junior, Rashid clerk). 8 clients, 14 cases spread over all categories/statuses (3 hearings today, 2 tomorrow, 1 decided with result), each with 2–5 hearings. 8 statutes with 2–4 real section headings each (Constitution 1973, CrPC 1898, PPC 1860, CPC 1908, Qanun-e-Shahadat 1984, Limitation Act 1908, Family Courts Act 1964, Punjab Rented Premises Act 2009). 10 invented judgments. 5 templates (Bail Petition u/s 497 CrPC, Civil Suit for Declaration, Vakalatnama, Written Statement, Writ Petition Art. 199). 6 diary entries, 6 news, 8 notifications (3 unread), 4 books, 12 docs.

- [ ] **Step 1: failing tests** — `dates.test.ts`: `pktDateKey('2026-11-23T19:30:00Z') === '2026-11-24'`; `formatPk('2026-11-23T10:00:00+05:00') === '23 Nov 2026'`; `addDays('2026-12-31', 1) === '2027-01-01'`.
  `repo.test.ts` (with a tiny inline db): `hearingsOn` returns only that day's cases, sorted; `caseStats().total === db.cases.length` and `byStatus` sums to total; `listCases({ category:'Family' })` only Family; `listCases({ q:'ahmed' })` matches title case-insensitively; empty db → `hearingsOn` returns `[]` and `caseStats().total === 0`.
- [ ] **Step 2:** `npm test` → FAIL (modules missing).
- [ ] **Step 3:** Implement `dates.ts` with `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' })`; `repo.ts`; `seed.ts`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: domain types, PKT dates, seed data and repo`.

### Task 3: Permissions and role context

**Files:**
- Create: `src/lib/permissions.ts`, `src/components/shell/RoleProvider.tsx`, `src/components/shell/RoleGate.tsx`
- Test: `tests/unit/permissions.test.ts`, `tests/unit/RoleGate.test.tsx`

**Interfaces:**
- Produces: `type Action = 'cases.edit' | 'drafting' | 'assistant' | 'documents.upload' | 'diary.write' | 'chamber.manage' | 'billing' | 'library'`; `can(role: Role, action: Action): boolean`; `RoleProvider` (client, holds `role` in state, default `'senior'`, persists to `localStorage` key `lb.role` inside try/catch); `useRole(): { role: Role; setRole(r: Role): void }`; `<RoleGate action={Action}>children</RoleGate>` renders children or a "Your role (Clerk) doesn't have access to this section" panel.
- Matrix: senior = all; junior = all except `chamber.manage`, `billing`; clerk = `documents.upload`, `diary.write` only (plus everything read-only not listed).

- [ ] **Step 1: failing tests** — `can('clerk','assistant')===false`, `can('clerk','diary.write')===true`, `can('junior','chamber.manage')===false`, `can('senior','billing')===true`; RoleGate with role clerk + action `assistant` renders text "doesn't have access".
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5:** Commit `feat: chamber role permissions and RoleGate`.

### Task 4: App shell (sidebar, topbar, mobile drawer) and UI kit

**Files:**
- Create: `src/app/app/layout.tsx`, `src/components/shell/{Sidebar,Topbar,MobileDrawer,nav}.tsx`, `src/components/ui/{Card,StatTile,Badge,EmptyState,DemoBadge,DataTable,SearchBox}.tsx`
- Test: `tests/unit/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useRole`, `can`, `unreadCount`.
- Produces: `NAV: { href: string; label: string; icon: LucideIcon; action?: Action }[]` in order: Dashboard, Laws & Statutes, Case Law, Daily Cause List, Cases & Clients, Legal Drafting (`drafting`), AI Assistant (`assistant`), Legal News, Digital Diary, Law Books (`library`), Documents, Chamber, Tools. Sidebar hides items the role can't use. Topbar: global search box (navigates to `/app/cases?q=`), bell with unread count linking `/app/news?tab=notifications`, role switcher `<select>` labelled "Preview as", avatar with member name. UI kit: `StatTile({label, value, hint?, icon})`, `Badge({tone:'neutral'|'bronze'|'ok'|'danger', children})`, `EmptyState({title, body, action?})`, `DataTable` renders a table ≥768px and stacked cards below.

- [ ] **Step 1: failing test** — Sidebar under role clerk does not contain "AI Assistant" or "Legal Drafting"; under senior contains all 13 labels.
- [ ] **Step 2:** FAIL. **Step 3:** implement (sidebar `--ink` background like past demo, active item bronze pill). **Step 4:** PASS.
- [ ] **Step 5:** `npm run dev`, open `/app` in browser pane, screenshot desktop + 375px; sidebar and drawer work.
- [ ] **Step 6:** Commit `feat: app shell with sidebar, topbar and UI kit`.

### Task 5: Landing page, login and sign-up

**Files:** Create/modify `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/components/marketing/*`

**Interfaces:** Consumes UI kit. Sign-up form fields: full name, email, phone, bar council (Punjab / Sindh / KP / Balochistan / Islamabad / Pakistan Bar Council), licence/enrolment no., "create a chamber" or "join with invite code". Both forms `preventDefault` and `router.push('/app')`, with note "Demo — accounts arrive in Phase 2".

Landing sections (LexCore style): nav (Legal Brain wordmark, Features, For Chambers, Pricing, Log in, Get started); hero "Your entire practice. One brain." + sub-line + CTA; scales-of-justice visual (lucide `Scale` large, or CSS illustration — no stock photos); giant faded word "LEGAL BRAIN" behind; feature grid of the 10 modules; "Built for Pakistani courts" strip listing SC, FCC, LHC, IHC, SHC, PHC, BHC; chamber roles explainer; stats row (demo numbers labelled as illustrative); footer.

- [ ] **Step 1:** Implement pages. **Step 2:** `npm run build` → PASS. **Step 3:** screenshot `/` desktop + mobile, compare with `docs/reference/for ui and color scheme.jpg`.
- [ ] **Step 4:** Commit `feat: landing, login and signup pages`.

### Task 6: Dashboard

**Files:** Create `src/app/app/page.tsx`, `src/components/dashboard/{WelcomeHero,TodayHearings,UpcomingList,CaseBreakdown,RecentNotifications}.tsx`; Test `tests/unit/dashboard.test.tsx`

**Interfaces:** Consumes `hearingsOn(todayKey())`, `upcomingHearings(todayKey(), 7)`, `caseStats()`, `listNotifications()`, `listTemplates()`. Components take data via props (pure) so they're testable with empty arrays.

Layout: dark `WelcomeHero` ("Welcome back, Advocate Ayesha" + "You have N hearings today and M this week" + buttons "Open today's cause list", "Ask AI Assistant"); 4 StatTiles (Active cases, Hearings today, This week, Decided this year); Today's hearings list (time, court short name, court room, case no., title, stage, link to case and "Check on court website" → `court.statusUrl`, `target=_blank`); Upcoming 7 days; Case breakdown by category and by court (simple horizontal bars, CSS only); Recent notifications.

- [ ] **Step 1: failing test** — `TodayHearings` with `[]` renders "No hearings today"; `WelcomeHero` with `todayCount=0` renders "no hearings today" text and no "undefined"; `CaseBreakdown` with zero stats renders an EmptyState.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS + screenshot.
- [ ] **Step 5:** Commit `feat: dashboard`.

### Task 7: Cases & Clients

**Files:** Create `src/app/app/cases/page.tsx`, `src/app/app/cases/[id]/page.tsx`, `src/app/app/clients/page.tsx`, `src/components/cases/{CaseFilters,CaseTable,HearingTimeline,CaseForm}.tsx`

**Interfaces:** Consumes `listCases`, `getCase`, `getCourt`, `getClient`, `listClients`, `can`.
- List: filters (status, category, court, text `q` read from URL `?q=`), DataTable columns Case no. · Title · Category · Court · Next hearing · Status badge. "Add case" button (opens `CaseForm` modal; only if `can(role,'cases.edit')`; on submit shows toast "Saved in demo only").
- Detail: header (title, case no., court, judge, category, status, client link, assigned members), "Check status on court website" button, hearing timeline (newest first), linked documents and diary entries, result box if decided.
- Clients: cards with name, phone, masked CNIC, city, their cases.
- `generateStaticParams` from `seed.cases`.

- [ ] **Step 1:** Implement. **Step 2:** build → PASS (static params generate 14 case pages). **Step 3:** click-through in browser pane.
- [ ] **Step 4:** Commit `feat: cases and clients`.

### Task 8: Daily Cause List

**Files:** Create `src/app/app/cause-list/page.tsx`

**Interfaces:** Consumes `hearingsOn`, `listCourts`. Tabs: Today · Tomorrow · pick date. Grouped by court → bench/court room → sr. no., case no., title, stage. Banner: "Automatic sync with court cause lists arrives in Phase 4. Until then dates come from your case entries." Each court group has "Open official cause list" link. Empty day → EmptyState.

- [ ] **Step 1:** Implement. **Step 2:** check Today/Tomorrow/empty date in browser. **Step 3:** Commit `feat: daily cause list`.

### Task 9: Laws & Statutes + Case Law (with search)

**Files:** Create `src/lib/search.ts`, `src/app/app/laws/page.tsx`, `src/app/app/laws/[id]/page.tsx`, `src/app/app/case-law/page.tsx`, `src/app/app/case-law/[id]/page.tsx`; Test `tests/unit/search.test.ts`

**Interfaces:**
- Produces: `searchItems<T>(items: T[], query: string, fields: (item: T) => string[]): T[]` — trims, lowercases, splits on whitespace, every token must appear in at least one field; empty query returns all; preserves input order.
- Laws list: search + filter by jurisdiction chips (Federal, Punjab, Sindh, KP, Balochistan, ICT) + category; statute detail shows sections with anchors `#s-497`, "Official source" link, DemoBadge.
- Case law: search over title/summary/tags/caseNo, filter by court and year; detail shows judges, date, summary, statutes cited (links to statute when id known).

- [ ] **Step 1: failing tests** — `searchItems(xs,'  BAIL  497 ', f)` matches item containing "bail" and "497"; query `'ضمانت'` with no match returns `[]` without throwing; `''` returns all.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: laws library and case law search`.

### Task 10: Legal Drafting

**Files:** Create `src/lib/templates.ts`, `src/app/app/drafting/page.tsx`, `src/app/app/drafting/[id]/page.tsx`; Test `tests/unit/templates.test.ts`

**Interfaces:**
- Produces: `fillTemplate(body: string, fields: TemplateField[], values: Record<string, string>): string` — replaces `{{key}}`; blank/missing → `[Label]`; unknown placeholders left as `[key]`.
- List: template cards by category + "Upload template" (disabled, "Phase 2"). Editor: form on left (fields from template, optional "Fill from case" select that pre-fills client name, case no., court), live preview on right in a paper-style sheet (serif, legal margins), buttons "Print / Save as PDF" (`window.print()` with print CSS that shows only the sheet) and "Copy text". Wrapped in `RoleGate action="drafting"`.

- [ ] **Step 1: failing tests** — `fillTemplate('In the court of {{court}}', [{key:'court',label:'Court',type:'text'}], {})==='In the court of [Court]'`; filled value replaces; output never contains `{{` or `undefined`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS + print preview check.
- [ ] **Step 5:** Commit `feat: legal drafting with live template preview`.

### Task 11: Diary, Documents, Law Books, News & Notifications

**Files:** Create `src/app/app/{diary,documents,library,news}/page.tsx` + components as needed.

**Interfaces / content:**
- **Diary:** month calendar (dots on days with entries or hearings) + day panel listing hearings and entries; "Add entry" textarea (needs `diary.write`) appends to local state with toast "Saved in demo only"; entries can be linked to a case.
- **Documents:** folder list (Pleadings, Orders, Evidence, Correspondence, Personal) + file table (name, case, size, uploaded by/on); drag-drop zone that lists dropped file names locally only ("Uploads stored securely in Phase 2"); lock icon + "Private to your chamber" note.
- **Law Books:** private shelf grid from `listBooks(me.id)`; search box over titles (full-text search arrives Phase 3); note explaining books are private to the uploader (copyright).
- **News:** tabs News · Notifications (`?tab=`); notifications list with kind icons, unread dot, "Mark all read" (local state).

- [ ] **Step 1:** Implement the four pages. **Step 2:** build → PASS; browser check each at desktop + 375px.
- [ ] **Step 3:** Commit `feat: diary, documents, law books, news and notifications`.

### Task 12: AI Assistant (mock), Chamber, Tools

**Files:** Create `src/lib/limitation.ts`, `src/app/app/{assistant,chamber,tools}/page.tsx`, `src/data/assistantDemo.ts`; Test `tests/unit/limitation.test.ts`

**Interfaces:**
- `assistantDemo: { prompt: string; answer: string; citations: { label: string; href: string }[] }[]` — 4 canned Q&As (e.g. "Grounds for post-arrest bail u/s 497 CrPC", "Limitation for civil revision", "Summarise [judgment id]", "Draft points for written statement"). Chat UI: suggested prompts, message list, input; on send picks the best canned answer via `searchItems` over prompts, else replies "In the full version I'll answer from your uploaded documents and Pakistani law." Wrapped in `RoleGate action="assistant"`; DemoBadge on every answer.
- **Chamber:** members table (name, email, role badge), "Invite member" form (email + role) visible only with `chamber.manage`, roles explainer table matching PLAN.md §6.2.
- **Tools:** `REMEDIES: { id: string; label: string; days: number; basis: string }[]` with entries labelled "verify before use": appeal from decree to District Court 30 (Limitation Act Art. 152), appeal from decree to High Court 90 (Art. 156), civil revision 90 (s.115 CPC), criminal appeal to Sessions 30 (Art. 154), criminal appeal to High Court against conviction 60 (Art. 155), petition for leave to appeal to Supreme Court 60 (Art. 185(3) Constitution / SC Rules). `limitationDeadline(orderDateKey: string, remedyId: string, copyDays = 0): { deadlineKey: string; daysTotal: number }` = order date + days + copyDays (s.12 exclusion). UI: form → deadline in big type + "Add to diary" (local) + disclaimer.

- [ ] **Step 1: failing tests** — `limitationDeadline('2026-11-23','appeal-hc-decree').deadlineKey==='2027-02-21'`; with `copyDays=5` → `'2027-02-26'`; unknown remedy throws `Error('Unknown remedy')`.
- [ ] **Step 2:** FAIL. **Step 3:** implement all three pages. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: AI assistant demo, chamber management and limitation calculator`.

### Task 13: End-to-end checks and review build

**Files:** Create `tests/e2e/routes.spec.ts`, `tests/e2e/mobile.spec.ts`, `README.md`

**Interfaces:** Consumes the static `out/` build served on port 4173.

- [ ] **Step 1: tests** — `routes.spec.ts`: for each of `/`, `/login/`, `/signup/`, `/app/`, and every `/app/*` route plus one case, statute, judgment and template detail: status 200, an `h1` is visible, no console errors. Role test: switch "Preview as" to Clerk, visit `/app/assistant/` → "doesn't have access" visible. `mobile.spec.ts` at 375×812: for `/` and every `/app/*` route, `document.documentElement.scrollWidth <= 375`; menu button opens drawer containing "Dashboard".
- [ ] **Step 2:** `npm run build && npm run e2e` → all PASS; fix anything failing.
- [ ] **Step 3:** `README.md`: what it is, `npm install`, `npm run dev` → http://localhost:3000, phases summary, note that data is demo.
- [ ] **Step 4:** Final walkthrough in the browser pane: landing → sign up → dashboard → each module, desktop and mobile; screenshots to the user.
- [ ] **Step 5:** Commit `test: route and mobile e2e checks; README`.

---

## After Phase 0 (separate plans, written when we get there)

- **Phase 1 – Online preview:** GitHub repo (public, needed for free GitHub Pages), Actions workflow building `out/` → Pages, custom domain `wakeelpropk.com` (CNAME file + GoDaddy A records 185.199.108.153 / .109 / .110 / .111 and `www` CNAME → `<user>.github.io`), HTTPS. DNS change shown to user and confirmed before saving.
- **Phase 2 – Supabase:** schema mirroring `src/types.ts` with `chamber_id` on every private table + row-level security; Auth (email + 2FA); Storage buckets per chamber; invites; replace `repo.ts` internals.
- **Phase 3 – Laws & judgments ingestion:** Pakistan Code + provincial codes importer; judgment PDFs from court sites; Postgres full-text search; OCR for scanned books.
- **Phase 4 – Court sync:** scheduled job per court (start with the courts users pick most), parse cause lists, match case numbers, notifications (email → WhatsApp).
- **Phase 5 – AI assistant:** pgvector embeddings of shared laws/judgments + each chamber's private documents; Claude API with citations; per-chamber isolation.
