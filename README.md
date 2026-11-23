# Legal Brain

Practice dashboard for Pakistani lawyers and chambers — cases, cause lists, laws, judgments, drafting, diary, documents and an AI assistant.

**Status: Phase 0 — clickable draft with demo data.** Nothing is saved; no real accounts yet. See [PLAN.md](PLAN.md) for the full product plan.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the landing page. Click **View the demo dashboard** (or Log in with anything) to enter the app.
Use **Preview as** (top bar) to see the app as a Senior, Junior or Clerk.

## Checks

```bash
npm test          # unit tests (Vitest)
npm run build     # static export to out/
npm run e2e       # every page + phone width (Playwright, needs a build first)
```

## How it's built

- Next.js 15 (App Router) exported as a static site → can be hosted on GitHub Pages.
- All data goes through `src/lib/repo.ts`; it reads demo data from `src/data/seed.ts` today and will read Supabase in Phase 2.
- Theme tokens live in `src/app/globals.css`.

## Phases

0. Local clickable draft ← **here**
1. Online preview on wakeelpropk.com (GitHub Pages)
2. Real accounts, chambers and data (Supabase)
3. Laws & judgments import, full-text search
4. Automatic court cause-list sync + WhatsApp/email reminders
5. AI assistant on your own documents and Pakistani law
