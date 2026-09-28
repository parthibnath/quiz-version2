# Deployment runbook

## Required environment

Set Supabase URL/anon key, service-role key, and one AI provider key. Apply `supabase/schema.sql` in the Supabase SQL editor.

## Release verification

```bash
npm ci
npm test
NEXT_PUBLIC_SUPABASE_URL="https://project.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="anon-key" npm run build
npm audit --omit=dev --audit-level=high
```

After deployment, verify `GET /api/health`, signup/login, upload extraction, generation, session submission, and results retrieval.

## Operations

- Enable Supabase database backups and test restoration regularly.
- Use an external rate limiter when running multiple instances; the built-in limiter is process-local.
- Configure platform logs, error alerts, and uptime monitoring for `/api/health`.
- Rotate Supabase keys and provider keys through the hosting provider, never through source control.
- In Supabase, open **Authentication > Providers > Google**, enable Google, and configure the Google OAuth client ID and secret.
- Add the exact deployed callback URL (`https://your-domain.example/auth/callback`) under **Authentication > URL Configuration > Redirect URLs**.
