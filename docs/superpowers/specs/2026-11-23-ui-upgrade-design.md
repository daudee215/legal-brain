# Legal Brain — UI/UX Upgrade ("Direction C: Hybrid") — Design

**Date:** 23 Nov 2026 · **Decided by user:** direction C (luxe cinematic landing + premium fast app). User handed the rest of the design to Claude ("you do it, needs to be substantial and impressive").

## Intent
The Phase 0 draft works but reads as basic. Make it feel like a premium product a Pakistani advocate would want to pay for: the landing sells (LexCore-style editorial luxury), the app is fast, rich and delightful to use daily in court.

## Approaches considered
- A Chamber Luxe everywhere — beautiful, but slow/heavy for daily app use.
- B Modern legal SaaS everywhere — fast, but loses the LexCore identity she asked for.
- **C Hybrid (chosen)** — editorial landing, premium-SaaS app, shared cream/bronze/ink palette.

## Decisions (Claude's calls)
- Libraries: framer-motion (animation, layout transitions), recharts (charts), cmdk (Ctrl+K palette). Photos hot-linked from Unsplash (free licence, credited), so no files are stored.
- **Dark mode** for the app (system default + toggle), tokens redefined under `.dark`.
- Motion respects `prefers-reduced-motion`.

## Landing (cinematic)
Staggered headline reveal; Lady Justice photo, bronze-toned, masked into cream with parallax; giant outlined "LEGAL BRAIN" marquee; rotating circular "scroll" badge; count-up stats; live mini-dashboard product preview that tilts on scroll; bento feature grid with hover glow; courts marquee; chamber roles; pricing preview (plans marked "coming soon"); FAQ accordion; big CTA; rich footer. No fake testimonials.

## App (premium SaaS)
- Shell: collapsible sidebar with animated active pill and section groups; topbar with Ctrl+K, notifications dropdown, theme toggle, role switch; page transitions.
- Ctrl+K palette: jump to any page, case, client, law, judgment, template; quick actions.
- Dashboard: time-of-day greeting (PKT), count-up KPI tiles with sparklines, today's hearing timeline, hearings-next-30-days area chart, cases by category donut, by court bars, upcoming deadlines, fees snapshot, activity feed.
- Cases: table ⇄ Kanban (by status) toggle; case detail with tabs (Overview, Hearings, Documents, Notes, Fees).
- **New: Fees** — per-case fee agreed / received / pending (seed data), dashboard tile.
- Remaining modules: consistent motion, richer headers, illustrated empty states.
- PWA manifest so it installs on a phone.

## Non-goals
Real saving, auth, Urdu (later phases). No change to `repo.ts` contract beyond additions.

## Done when
All pages restyled, unit + e2e (desktop, 375px, later-day) green, deployed to wakeelpropk.com.
