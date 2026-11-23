# Legal Brain — Project Plan (draft v1, 23 Nov 2026)

**Domain:** wakeelpropk.com (GoDaddy) · **For:** many Pakistani lawyers, each with their own account (a dashboard product) · **Status:** planning, nothing built yet

---

## 1. What we're building (as I understand it)

A web product ("Legal Brain") that any Pakistani lawyer signs up for. Each lawyer gets their own private dashboard for their whole practice:

- **Shared by everyone:** laws & statutes, public judgments, court cause-list data, legal news, the standard template library.
- **Private to each lawyer:** their cases, clients, diary, documents, own templates, own books, AI chats. No lawyer can ever see another's data.
- **Public homepage** on wakeelpropk.com: product landing page in the LexCore style (what it does, sign up, log in).

| # | Module | What it does |
|---|--------|--------------|
| 0 | **Dashboard** | "Welcome back, Advocate ___". Today's hearings, upcoming dates, case counts by status/category/court, pending drafts, latest notifications |
| 1 | Laws & Statutes Library | Federal + provincial Acts, Ordinances, Rules, Constitution — searchable |
| 2 | Case Law (Judgments) | Searchable judgments from SC / FCC / High Courts |
| 3 | Daily Cause Lists & Court Updates | Which of *her* cases are fixed today/tomorrow, in which court/bench/room |
| 4 | Case & Client Management | Each case: title, case no., category (civil/criminal/family/…), court, judge, next date, status, result, history of hearings, linked client, fees |
| 5 | Legal Drafting Templates | Upload templates (bail petition, plaint, power of attorney…) → fill in fields → generate draft |
| 6 | AI Legal Assistant | Chatbot answering from *her uploaded documents* + laws (later phase) |
| 7 | Legal News & Notifications | Hearing reminders, new judgments, legal news feed |
| 8 | Digital Diary | Daily notes, comments, feedback per case/day |
| 9 | Law Books Library | Her law books, searchable (see copyright note) |
| 10 | Secure Document Storage | Case files, scans, evidence — private, encrypted |

**Look & feel:** taken from the two references in this folder.
- Colours/type from *for ui and color scheme.jpg* (LexCore): cream background `#F4EEE4`, deep brown `#3A2A1D`, bronze accent `#8C5E34`, bold serif headings + clean sans body.
- Layout from *past demo.png* (her earlier Replit "LegalAI" demo): left sidebar with all modules, dark hero "Welcome back" card, stat tiles underneath. I'll keep that structure and reskin it in the LexCore palette.

---

## 2. Reality checks (important — please read)

### A. GitHub Pages can only host the *look*, not the *brain*
GitHub Pages serves static files only. Login, saving cases/clients, document storage, notifications and the AI chatbot all need a backend + database.
**Recommendation:** frontend on GitHub Pages (as you wanted) + **Supabase** as backend (free tier: login, Postgres database, private file storage, and vector search for the chatbot later). No server for us to maintain.

### B. "Connected to all courts" — there is no official API
Every court runs its own website; none offer a data feed. Current official sources:
- **Supreme Court** — supremecourt.gov.pk: case search, cause list, judgment search; new Public Portal launched Oct 2025.
- **Federal Constitutional Court** (new, after the 27th Amendment) — fccp.gov.pk: case info + weekly cause list.
- **Lahore HC** (lhc.gov.pk), **Islamabad HC** (ihc.gov.pk), **Sindh HC** (sindhhighcourt.gov.pk, has advocate-wise search), **Peshawar HC**, **Balochistan HC** — each with its own case status / cause list pages (some with captchas).
- District courts — patchy, varies by province.

**Plan:** Phase 1 = she enters her cases (2 min each), app reminds her and gives a one-click link to the official status page. Later phase = an automatic daily job that reads the published cause lists of the courts she actually practises in, matches her case numbers, and updates the dashboard + sends a notification. We build it court by court, starting with whichever court she uses most.

### C. Copyright — what we can and can't upload
- ✅ **Statutes / Acts / Rules** — public government text (Pakistan Code, Punjab Code, Sindh/KP/Balochistan codes). Fine to import.
- ✅ **Judgments downloaded from official court websites** — fine.
- ❌ **Law reports** (PLD, SCMR, PLJ, CLC, YLR, MLD…) — owned by publishers. Can't be uploaded into a shared/public site.
- ⚠️ **Law books / commentaries** — copyrighted. Because this is a product for many lawyers, we **cannot** put books in a shared library. Each lawyer can upload books they own into their *private* shelf (searchable only by them). A shared book library would need a licence deal with publishers — a later business question.

### D. Client confidentiality
Client data and case files are privileged, and now it's many lawyers on one system. So: login with 2-factor, every row tagged to its owner and locked by database row-level security, private file storage per lawyer, daily backups, an audit log. The public site shows nothing private.

### E. What "many lawyers" adds to the build
- Sign-up, email verification, password reset, profile (name, enrolment/licence no., bar council, courts practised in).
- **Chambers**: a senior advocate shares cases with juniors/clerks, with roles (see questions §6.2).
- An **admin panel** for you/her: manage users, upload shared laws/templates/news, see usage.
- **Subscriptions** later (free trial → monthly plan via JazzCash/Easypaisa/card). Not in the first versions.
- Court sync gets *more* valuable: one daily read of each court's cause list serves every lawyer's cases at once.

---

## 3. Recommended tech (my calls — correct me if you prefer otherwise)

| Piece | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js (static export) + TypeScript + Tailwind | Works on GitHub Pages, easy to move to Vercel later |
| Backend | Supabase (Auth, Postgres, Storage, pgvector) | Free tier, no server to run, secure by default |
| Hosting | GitHub Pages → wakeelpropk.com | What you asked for |
| AI (later) | Claude API with retrieval over her documents | Answers cite the exact law/judgment/page |
| Court sync (later) | Scheduled GitHub Action / Supabase cron | Free, runs daily |

---

## 4. Phases

**Phase 0 — Local clickable draft (first thing you'll see)**
All 11 screens with realistic dummy Pakistani data (cases at LHC/SC/IHC, sample Acts, sample drafts). Runs on your laptop at `localhost:3000`. No backend yet. You and she review the look + flow.

**Phase 1 — Online preview**
Create GitHub repo → GitHub Pages → point wakeelpropk.com DNS (GoDaddy: 4 A records to GitHub `185.199.108–111.153` + `www` CNAME). I'll do the DNS in Chrome but will show you the exact change and ask before saving.

**Phase 2 — Real data (Supabase), multi-lawyer**
Sign-up/login for any lawyer, private per-lawyer cases, clients, hearings, diary, document upload, templates, in-app + email notifications, admin panel.

**Phase 3 — Laws & judgments**
Import Pakistan Code + provincial codes; judgment search; full-text search across her uploaded books/PDFs (with OCR for scanned ones).

**Phase 4 — Court sync**
Daily cause-list reader for her main courts → auto-updates next dates + push/email/WhatsApp alerts.

**Phase 5 — AI Assistant**
Chatbot trained (retrieval) on her uploaded documents + laws; case-prep tools (summarise judgment, list relevant sections, draft from template).

---

## 5. Extra ideas worth adding

1. **Limitation calculator** (Limitation Act 1908) — enter date of order → deadline for appeal/revision, auto-added to diary.
2. **Court fee calculator** (Court Fees Act 1870, province-wise).
3. **WhatsApp/SMS reminder** the evening before each hearing (Pakistani lawyers live on WhatsApp).
4. **Urdu support** — Urdu search + Urdu text in drafts.
5. **Fee & billing tracker** per client (fee agreed / received / pending).
6. **Installable on phone** (PWA) — opens like an app in court.
7. **Clickable citations** — "S. 497 CrPC" in any text links straight to the section.
8. **Hearing history timeline** per case with orders attached.

---

## 6. Open questions (for you / her)

1. ~~Who uses it?~~ **Answered: many lawyers, each with their own dashboard.**
2. ~~Chambers?~~ **Answered: yes, sharing allowed.** A lawyer can create a *Chamber* and invite juniors/clerks. Roles: **Senior** (everything, manages members), **Junior** (cases, drafts, diary, documents — no billing/member admin), **Clerk** (cause lists, dates, diary, uploads — no AI/drafting of privileged notes). Each case belongs to the chamber; a solo lawyer is simply a chamber of one.
3. **Which courts/cities to support first?** (decides which court sync we build first)
4. **Free or paid** at launch? (affects nothing in Phase 0–1, matters by Phase 2)
5. Does she already have template files (Word) ready for the shared template library?
6. GitHub account: which account should own the new repo?

---

### Sources consulted
- Supreme Court online services — supremecourt.gov.pk; Oct 2025 Public Portal ([Tribune](https://tribune.com.pk/story/2573404/sc-rolls-out-online-portal-for-public-access-to-judicial-details), [ProPakistani](https://propakistani.pk/2025/10/22/you-can-now-track-supreme-court-cases-online/))
- Federal Constitutional Court — [fccp.gov.pk](https://www.fccp.gov.pk/online-case-information)
- Sindh HC cause list / case search — [sindhhighcourt.gov.pk](https://sindhhighcourt.gov.pk/causelist.php)
- LHC website/app — [PITB](https://pitb.gov.pk/node/8236)
- Pakistan Code (federal laws) — [PID](https://pid.gov.pk/site/press_detail/24543), [ProPakistani](https://propakistani.pk/2023/08/08/this-new-website-lets-you-search-all-federal-laws-of-pakistan/); Punjab Code — [Tribune](https://tribune.com.pk/story/872253/law-portal-all-provincial-laws-now-accessible-online?amp=1); [NYU GlobaLex guide](https://www.nyulawglobal.org/globalex/pakistan.html)
- Competing Pakistani legal-AI tools (QanoonAI, Pak Legal Database, Pakistan Law Bot, Conclavity) — [Stanford CodeX TechIndex](https://techindex.law.stanford.edu/companies/qanoonai), [ProPakistani](https://propakistani.pk/2026/09/03/akhund-forbes-launches-conclavity-introducing-legal-ai-grounded-in-pakistani-law/)
