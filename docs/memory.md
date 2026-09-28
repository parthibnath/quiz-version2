# Memory — Project Context

Purpose: a single file to paste back into a fresh AI chat/coding session so it has full project context instantly, without re-explaining the whole spec. Keep this updated as decisions get made or things change.

## What this project is
A neo-brutalist MCQ quiz platform. Users upload PDF/image/text or take a live photo, the app auto-generates 4-option MCQs from that content, and users work through an **11-session progression**: Sessions 1–10 are 50 random questions each (locked sequentially), Session 11 ("Final Takeover") is 100 mixed random questions unlocked after all 10 are completed once. Every wrong answer is reviewed with an explanation. Progress is persistent per user profile.

## Companion docs (read these too)
- `prd.md` — full functional spec, what's in/out of scope for MVP.
- `architecture.md` — stack, data model, pipeline. **Assumes Next.js** (not confirmed by user — check before assuming this is locked in).
- `design.md` — the neo-brutalist design system (colors, type, spacing, component rules). Non-negotiable on every screen.
- `rules.md` — coding/design standards every change must follow.
- `phases.md` — build order, phase 0–5 features, and the Phase 6 pre-launch 20-item QA checklist.

## Key decisions locked in
- Design system is **non-negotiable**: 3px black borders, 4px max radius, flat `5px 5px 0 #0A0A0A` shadows, no blur/gradient/soft-gray, max 3 accents/page, UPPERCASE display headings, strict 8pt spacing grid.
- Session structure is fixed: 10× 50-question sessions, sequential unlock, then 1× 100-question mixed final session.
- Every incorrect answer must show: user's choice, correct choice, why-correct explanation, why-user-was-wrong explanation.
- MVP explicitly excludes: admin panel, social sharing, analytics beyond the basic dashboard, payments, multi-language generation.

## Open questions / not yet decided
- Tech stack: **CONFIRMED — Next.js (Option A)**. User confirmed 2026-09-22. architecture.md assumption is now locked.
- Which OCR/LLM providers to actually wire up (architecture.md lists reasonable defaults, not locked choices).
- Auth provider specifics: assumed simple email/password. Using NextAuth with credentials provider for MVP.

## How to use this file with a fresh AI session
Paste this `memory.md` plus whichever of the other 5 docs are relevant to the task at hand (e.g. `design.md` + `rules.md` for a UI task; `architecture.md` + `phases.md` for a backend task). Update this file's "Key decisions" and "Open questions" sections whenever a real decision gets made during the build — don't let it go stale.
