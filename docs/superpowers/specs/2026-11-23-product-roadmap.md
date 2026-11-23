# Legal Brain — product roadmap (Nov 2026)

**Promise:** you will never miss a date or a deadline, and your clients always know where their case stands.

## Built in this push (works now, data saved on the device)
| Area | Feature |
|---|---|
| Foundation | On-device store (demo → "mine" on first edit), edit operations, file storage (IndexedDB), backup export/import, start fresh, Excel/CSV import |
| Never miss a date | Today page: morning briefing, clash detector (two courts same morning → assign junior), 30-second outcome entry with voice notes (English/Urdu), WhatsApp update to client, offline cache |
| Cause lists | Upload a court cause-list PDF → your cases found with serial no. / court room |
| Never miss a deadline | Limitation engine with certified-copy exclusion (s.12), countdowns, task board for juniors/munshi |
| PDFs | Paper-book builder (merge, annexure marks, page numbers, index), fee receipts, client case-status sheet (printable, Urdu or English), draft export |
| Knowledge | Precedent bank (her own citations by issue), conflict check, document search |
| Urdu | Interface toggle (Nastaliq, right-to-left), Munshi mode — big-button Urdu screen for the clerk |

## Needs accounts only the owner can create (Phase 2)
- **Supabase project** → cloud sync across devices, real logins, invites, server-enforced roles.
- **Meta WhatsApp Business** → automatic reminders (until then: one-tap WhatsApp share).
- **Claude API key on a server function** → AI answers over her own documents with page citations.
- **JazzCash / Easypaisa merchant** → online fee collection.

## Rules
- Legal figures (limitation days) are demo values to be verified by an advocate; every screen says "verify".
- Court data is assistive; always link to the court's own site.
- AI never cites anything it cannot link to a page she uploaded.
- PDFs generated in the browser are English (pdf-lib cannot shape Urdu); Urdu documents use the print-to-PDF path.
