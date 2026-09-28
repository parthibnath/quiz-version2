# Quiz.Platform

Quiz.Platform turns uploaded study material into multiple-choice practice sessions with persistent progress.

## Local development

```bash
npm install
$env:NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
npm run dev
```

The app runs at `http://localhost:3000`.

## Required configuration

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase browser key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase key.
- `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`: required for production question generation.

Run `supabase/schema.sql` in the Supabase SQL editor before starting the app. In Supabase, open **Authentication > Providers > Google**, enable the provider, add the Google client ID and secret, and add `http://localhost:3000/auth/callback` (plus the production callback URL) under **Authentication > URL Configuration > Redirect URLs**.

## Verification

```bash
$env:NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"; $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="build-validation-key"
npm run build
npm audit --omit=dev --audit-level=high
```

## Deployment checklist

1. Apply `supabase/schema.sql` and configure Supabase Auth, Database, Storage, and OAuth redirect URLs.
2. Configure all production secrets in the hosting provider; never commit `.env` files.
3. Configure backups and test restoration.
4. Add external rate limiting and monitoring at the edge/platform layer.
5. Review [Privacy](./app/privacy/page.tsx) and [Terms](./app/terms/page.tsx) with the service owner before launch.
