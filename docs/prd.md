# PRD — Neo-Brutalist MCQ Quiz Platform

## 1. Product Summary
A web app where a user uploads study material (PDF, image, text file, or a live camera photo), the app auto-generates multiple-choice questions from that material, and the user works through those questions across a structured **11-session progression** (10 sessions of 50 questions + 1 final 100-question mixed revision session). Progress and scores persist to a user profile.

## 2. Problem Statement
Students/learners have raw material (notes, slides, textbook pages) but no fast way to turn it into practice questions with spaced structure and a record of what they got wrong. This app converts raw content into a gamified, trackable quiz loop.

## 3. Target User
A self-studying learner (exam prep, certification prep, course review) who has source material in PDF/image/text form and wants auto-generated, structured practice with a visible score history.

## 4. Core User Flow
1. User signs up / logs in.
2. User uploads a file (PDF / image / text) or captures a photo via camera.
3. System extracts text and generates a bank of MCQ questions (4 options, 1 correct, 1 explanation each) from that content.
4. Questions are pooled into **Session 1–10**, 50 random questions per session, drawn from the generated bank.
5. User completes a session → sees: final score, summary, and a full breakdown of every wrong answer (their choice, correct choice, why correct is correct, why their choice was wrong).
6. Completing a session unlocks the next.
7. After all 10 sessions are unlocked/completed at least once, **Session 11 (Final Takeover)** becomes available: 100 mixed random questions pulled from all 10 sessions.
8. Dashboard shows cumulative score, sessions completed, and Session 11 status at all times.

## 5. Functional Requirements

### 5.1 Content Ingestion & Question Generation
- Accept upload types: PDF, JPG/PNG, TXT.
- Accept live camera capture (mobile + desktop webcam) as an image input.
- Extract text from each source type (OCR for images/scanned PDFs, direct text extraction for text-based PDFs/TXT).
- Auto-generate MCQs from extracted text: 4 options, exactly 1 correct answer, 1 explanation per question.
- Generated questions are stored in a per-user question bank tied to the source material.
- Minimum bank size must reach 500 questions before Session 11 can be considered "fully mixed" (10 × 50); if a user's material doesn't yield enough questions, sessions should degrade gracefully (see `phases.md` MVP scope notes) rather than crash.

### 5.2 Sessions & Scoring
- Sessions 1–10: exactly 50 random questions each, no repeats within a session.
- Session completion screen shows: final score (X/50), pass/fail or percentage, and a full incorrect-answer review list.
- Each incorrect item shows: question, user's answer, correct answer, explanation of the correct answer, and explanation of why the user's answer was wrong.
- Session N+1 is locked until Session N is completed (not necessarily passed — "completed" = all 50 answered).
- Session 11: unlocked once Sessions 1–10 are each completed at least once. 100 questions randomly mixed from the full bank, no session-of-origin bias required.

### 5.3 Profile & Progress
- Persistent user profile: cumulative score across all sessions, per-session history (score, date, pass/fail), Session 11 completion status.
- Progress dashboard: visual summary of sessions completed / locked / unlocked, cumulative score, best/last score per session.

### 5.4 Design System Compliance
- Every screen must implement the neo-brutalist system defined in `design.md` exactly — hard borders, hard offset shadows, no blur, no soft grays, capped accent-color usage per page. This is a non-negotiable acceptance criterion for every UI task.

## 6. Non-Functional Requirements
- Responsive: desktop, tablet, mobile (grid collapses 3→2→1 column; hover effects disabled on touch).
- Question generation should not block the UI — show a loading/progress state during extraction and generation.
- Data persistence must survive a session/browser close (user can log back in and resume).
- No dependency on features outside the quiz core loop (no analytics, social sharing, or admin panel in MVP — see `phases.md`).

## 7. Out of Scope (MVP)
- Admin panel / content moderation tools.
- Social sharing, leaderboards, multiplayer.
- Analytics dashboards beyond the basic progress dashboard.
- Payment/subscription flows.
- Multi-language question generation (English only for MVP unless stated otherwise).

## 8. Success Criteria (MVP "done")
- A user can upload one file and get a usable 50-question Session 1 within a reasonable wait time.
- All 11 sessions are playable end-to-end with correct locking/unlocking logic.
- Wrong-answer review is accurate and complete on every session.
- Every screen passes a visual check against `design.md` (borders, shadows, colors, type scale).
- The 20-item pre-launch QA checklist in `phases.md` (Phase 6) passes in full.

## 9. Open Questions / Assumptions
- **Tech stack**: not specified by user — `architecture.md` assumes Next.js (Option A) as the default. Confirm or override.
- Question-generation engine (which LLM/OCR service) is left to `architecture.md`; assumed to be an LLM-based generator behind a server API route, not a fully offline/local model.
- Auth method (email/password vs OAuth) is assumed to be simple email/password for MVP — confirm if a specific provider is preferred.
