# Quiz.Platform

Turn your study material into multiple-choice practice. Upload PDFs (including scanned pages), common images, DOCX, PPTX, TXT, Markdown or CSV. You can also paste notes or take a photo. The app extracts readable text, generates questions with four options and individual explanations, and saves your progress to your account.

## Run locally

1. Install Node.js 22 or newer. Run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set your Supabase project URL, anon key and server-only service-role key. Set an OpenRouter or Anthropic key for quiz generation. The default models can be changed in the same file.
3. In the Supabase SQL Editor, apply [supabase/schema.sql](supabase/schema.sql). It can be applied to a fresh project or rerun on an existing Quiz.Platform database. It preserves existing Supabase rows.
4. Enable the Google provider in Supabase Auth. In Google Cloud, register the Supabase OAuth callback (`https://<project-ref>.supabase.co/auth/v1/callback`). In Supabase’s redirect allowlist, add `http://localhost:3000/auth/callback`.
5. Run `npm run dev`, open [localhost:3000/dashboard](http://localhost:3000/dashboard), and sign in with the existing Google sign-in.

```bash
npm test
npm run build
npm start
```

A batch returns up to 50 valid new questions. Short notes can yield fewer. Reopen saved material from the dashboard to generate more, or add another source. Practice requires 50 unused questions per session and 500 across all 10 sessions. The 100-question final draws from completed practice. Retrying a completed session uses its original questions.

English OCR runs locally. An upload can be up to 10 MiB, with up to 150 PDF pages, 12 scanned pages and 100,000 extracted characters. Animated or multipage image files use the first frame. Export unsupported document formats or slides containing only images to PDF.

See the [deployment runbook](docs/deployment.md) for hosting, migration, and verification.
