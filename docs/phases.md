# Phases — Build Roadmap

Build in this order. Don't start a phase until the previous one's acceptance criteria pass.

## Phase 0 — Foundation
- Set up repo, stack (see `architecture.md`), design tokens (colors/spacing/type from `design.md` as CSS variables).
- Auth (sign up / log in) with a basic user profile row.
- Base layout: navbar, page shell, 8pt-grid spacing system wired up.
- **Acceptance:** a logged-in user lands on an empty dashboard that already matches the neo-brutalist system (correct borders/shadows/type even with no content yet).

## Phase 1 — Upload & Extraction
- File upload UI: PDF, image (JPG/PNG), text file.
- Live camera capture (mobile + desktop) feeding into the same image pipeline.
- Text extraction: direct for PDF/TXT, OCR for images/scanned PDFs.
- Loading state during extraction; clear error state for unreadable files.
- **Acceptance:** uploading any of the 4 supported input types produces stored, readable extracted text, with visible progress and failure states.

## Phase 2 — Question Generation
- Server-side pipeline: extracted text → LLM → structured MCQ JSON (4 options, 1 correct, 1 explanation).
- Server-side validation/rejection of malformed generated questions.
- Question bank persisted per user, tied to the source upload.
- **Acceptance:** a single upload reliably yields a usable bank of valid questions; malformed model output never reaches the database.

## Phase 3 — Session Engine
- Session 1–10 logic: 50 random, non-repeating questions per session, pulled from the bank.
- Session locking: N+1 locked until N completed (enforced server-side, not just UI-hidden).
- Session 11 (Final Takeover): unlocked once 1–10 are each completed once; 100 mixed random questions.
- Graceful degradation: if the question bank is smaller than needed (e.g. a short upload), define and implement a fallback (e.g. shrink session size, or block session creation with a clear message) rather than crashing.
- **Acceptance:** full 11-session flow is playable end-to-end with correct locking at every step.

## Phase 4 — Scoring & Results
- Answer submission + scoring logic.
- Results screen: final score, session summary, full incorrect-answer breakdown (user's choice, correct choice, why-correct, why-user-was-wrong).
- Cumulative score and session history written to the user's profile.
- **Acceptance:** results are accurate for every possible score (0/50 through 50/50, and 0/100–100/100 for Session 11), and history persists across logins.

## Phase 5 — Dashboard & Profile
- Progress dashboard: cumulative score, per-session status (locked/unlocked/completed + best score), Session 11 status.
- Design-system polish pass across all screens built so far.
- **Acceptance:** dashboard accurately reflects DB state after any sequence of session attempts.

## Phase 6 — Pre-Launch QA & Polish Checklist
This is the final hardening pass before anything is considered shippable. Every item below is a pass/fail check across the whole site, not a new feature.

**Layout & navigation**
1. Fix horizontal scroll — no element causes the page to scroll sideways on any breakpoint.
2. Find and fix all broken links (internal + external).
3. Add a working mobile hamburger/menu for nav.
4. Fix unused/dead navigation entries (remove or wire them up).
5. Fix any broken buttons (dead `onClick`s, wrong routes, disabled-when-shouldn't-be).
6. Fix mobile overflow issues (content spilling off small viewports).
7. Mobile-optimize every screen (touch targets, spacing, readable type at small sizes).

**Branding & metadata**
8. Add a favicon.
9. Fix page `<title>` tags per route (accurate, not all identical).
10. Add meta descriptions per route.
11. Add/fix a real custom 404 page (styled to match the design system, not a blank error).
12. Set the copyright year in the footer (and make sure it doesn't need manual updates every year — compute it).
13. Fix footer links (all real, all working).

**Content & feedback states**
14. Replace all placeholder/lorem-ipsum text with real copy.
15. Add clear success messages for every completed action (upload done, session submitted, profile saved, etc.).
16. Add clear error messages for every failure case (bad file, extraction failure, network error, etc.).

**Performance**
17. Compress all images (uploads previews, static assets) for reasonable load times.

**Contact/clickable elements**
18. Make the logo clickable (routes home).
19. Make any displayed phone number a working `tel:` link.
20. Make any displayed email address a working `mailto:` link.

**Acceptance for Phase 6:** all 20 items above checked off across every page of the site, on mobile and desktop, before calling this MVP done.

## Phase Ordering Rule
Do not begin Phase N+1 core work until Phase N's acceptance criteria are met. Phase 6 items can be tracked as a running checklist throughout development (fix a broken link as soon as you spot it) but the phase isn't "closed" until all 20 are verified in one pass at the end.
