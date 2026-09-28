# Architecture — Neo-Brutalist MCQ Quiz Platform

> **Assumption:** Stack not specified in the original prompt, which offered three options. This doc assumes **Option A — Next.js (React, full-stack)**, since it lets file upload, OCR/text-extraction, question generation, and profile persistence all live in one deployable app via API routes. If you want Option B (vanilla JS) or Option C (Python/Django/Flask) instead, say so and this file gets rewritten around that stack — the rest of the docs (`prd.md`, `design.md`, `rules.md`, `phases.md`) don't change.

## 1. Stack
- **Framework:** Next.js (App Router), React 18+, TypeScript.
- **Styling:** CSS Modules or vanilla CSS with design tokens (see `design.md`) — no Tailwind/UI kit that would fight the neo-brutalist hard-edge system. Plain CSS variables are the cleanest fit.
- **Database:** Postgres (e.g. via Supabase or a managed Postgres instance) for users, sessions, questions, answers, progress.
- **File storage:** Object storage (e.g. S3-compatible bucket, or Supabase Storage) for uploaded PDFs/images.
- **Auth:** Simple email/password (or a single OAuth provider) via NextAuth or equivalent — MVP scope, not a custom auth system.
- **OCR / text extraction:**
  - Text-based PDFs & TXT → direct text extraction (e.g. `pdf-parse` or similar).
  - Image/scanned PDF → OCR (e.g. Tesseract.js for a self-contained MVP, or a hosted OCR API if higher accuracy is needed).
- **Question generation:** Server-side call to an LLM API (e.g. Claude via the Anthropic API) with a structured-output prompt that returns strict JSON: `{question, options[4], correctIndex, explanation}`.
- **Camera capture:** Browser `getUserMedia` API, captured frame converted to an image blob and run through the same OCR path as image uploads.

## 2. High-Level System Diagram
```
[Browser]
  ├─ Upload UI (file / camera) ─────────────► /api/upload
  ├─ Quiz UI (session player) ──────────────► /api/sessions/:id/questions
  ├─ Results UI ─────────────────────────────► /api/sessions/:id/submit
  └─ Dashboard UI ───────────────────────────► /api/profile

[Next.js API Routes]
  /api/upload          → stores file, kicks off extraction job
  /api/extract          → OCR/text-extract → raw text
  /api/generate         → raw text → LLM → MCQ JSON → stored in question bank
  /api/sessions/:id     → returns 50 (or 100 for session 11) random questions for that session
  /api/sessions/:id/submit → scores answers, stores results, updates profile, returns wrong-answer review
  /api/profile          → cumulative score, session history, unlock state

[Database]
  users, uploads, questions, sessions, session_attempts, answers
```

## 3. Data Model (core tables)
- **users**: id, email, password_hash (or oauth id), created_at
- **uploads**: id, user_id, file_type, storage_url, extracted_text, status (pending/processing/done/failed)
- **questions**: id, user_id, upload_id, question_text, options (json array of 4), correct_index, explanation, created_at
- **sessions**: id, user_id, session_number (1–11), status (locked/unlocked/completed), question_ids (json array, snapshot of the 50/100 picked for that attempt)
- **session_attempts**: id, session_id, score, total, completed_at
- **answers**: id, session_attempt_id, question_id, user_choice_index, is_correct

## 4. Question-Generation Pipeline
1. Upload received → stored in object storage, `uploads` row created with `status: pending`.
2. Background/async job (or synchronous for MVP, with a loading UI) extracts text.
3. Extracted text chunked (to stay within LLM context limits) and sent to the generation API with a strict-JSON prompt.
4. Response validated (exactly 4 options, exactly 1 correct index, explanation present) before insert — reject/retry malformed items rather than storing broken questions.
5. Questions inserted into `questions`, tied to `upload_id` and `user_id`.
6. Once the bank has ≥50 questions, Session 1 can be built; once ≥500, all 10 sessions + Session 11 are fully supported (see `phases.md` for graceful-degradation rules when the bank is smaller).

## 5. Session Locking Logic
- Session `N` (2–10) is `locked` until `session_attempts` has a completed row for session `N-1`.
- Session 11 is `locked` until sessions 1–10 all have at least one completed attempt.
- "Completed" = all 50 (or 100) questions in that attempt have an answer row.

## 6. Deployment
- Single Next.js app deployable to Vercel (or any Node host). Object storage and Postgres can be managed services to avoid ops overhead for an MVP.
- Environment variables: DB connection string, storage credentials, LLM API key, auth secret.

## 7. Key Technical Risks
- **OCR accuracy** on messy handwriting/low-quality camera photos — flag to the user when extraction confidence is low rather than silently generating bad questions.
- **LLM output reliability** — must validate structure server-side every time; never trust raw model output directly into the DB.
- **Cost/latency** of generating up to 500+ questions per upload — consider generating incrementally (enough for Session 1 first, rest in background) rather than blocking the user on the full batch.
