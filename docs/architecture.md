# Quiz.Platform architecture

Quiz.Platform uses Next.js App Router and React with TypeScript. CSS modules and global design tokens preserve the neo-brutalist design. Supabase Auth handles the existing Google sign-in. Supabase Postgres stores extracted notes, the question bank, assigned question snapshots, draft answers and results.

## Ingestion and generation

1. `POST /api/extract` authenticates the user, validates the bounded multipart upload, and extracts text. PDFs use direct text extraction with per-page rasterization and English OCR where text is missing. Images use OCR after size and format checks. DOCX and PPTX read their text XML, and TXT, Markdown and CSV use direct decoding.
2. The server saves extracted text and the original filename. The original binary is processed in memory. The user can review the extracted text and reopen saved notes from the dashboard.
3. `POST /api/generate` reads the caller's source and partitions it into smaller batches for OpenRouter or Anthropic. The server validates each returned question, choice and explanation. A database function discards duplicate question text within the user's bank.
4. Short or repetitive notes can produce fewer questions. Successful batches are saved even when other batches fail. The user can generate another batch from the same source or upload new material.

## Attempts and scoring

- `POST /api/sessions/start` validates progress and either resumes an existing attempt or creates a fixed question snapshot. Sessions 1–10 each choose 50 questions that were unused in prior practice. Session 11 requires all 10 practice sessions and selects 100 revision questions. If an older question bank used repeats and has fewer than 100 completed-practice questions, the final can fill the remainder from the bank.
- `GET /api/sessions/:id` returns an active attempt's question and choice text, or a completed attempt's score and missed-answer review. Correct answers and explanations stay server-side until submission.
- `PATCH /api/sessions/:id` saves one draft answer. `POST /api/sessions/:id/submit` validates all answers and atomically stores the score, review and profile progress. Repeated submissions return the original result.
- All quiz tables and RPCs are server-only. Route handlers obtain the user ID from the Supabase session and constrain every read and write to that user.

See [deployment](deployment.md) for environment settings and the release check.
