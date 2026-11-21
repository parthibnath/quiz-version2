# Deployment runbook

## Configure Supabase and generation

- Apply `supabase/schema.sql` from the SQL Editor. Back up your database before applying it to an existing deployment.
- Set all environment variables from `.env.example` in the host. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` before the build so the client has the right OAuth configuration. Keep the service-role and AI provider keys server-side.
- Enable Google in Supabase Auth. Set the Supabase Site URL to the deployed HTTPS origin and allow the exact `https://your-domain.example/auth/callback` redirect. Configure the corresponding Supabase callback in Google Cloud.
- The server persists extracted text, questions and progress in Supabase. OCR runs inside the app. Generation sends extracted text to the provider you configure.

## Serve the app

Use a Node.js 22+ host, or build and run the container below. Use a host that allows at least a 10 MiB file plus multipart overhead in the request body and a 120-second request. HTTPS is required for the camera outside localhost. Configure a reverse proxy with those upload and timeout limits when applicable.

```bash
npm ci
npm test
npm run build
npm start
```

The container takes the two public Supabase values as build arguments. Supply runtime variables via your hosting provider's secret manager or a local `.env.local` file for testing.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-key \
  -t quiz-platform .
docker run --rm --env-file .env.local -p 3000:3000 quiz-platform
```

## Verify a deployment

1. Check that `/api/health` returns HTTP 200. It checks database connectivity.
2. Sign in, upload a text PDF and a scanned page or camera photo, and review their extracted text.
3. Generate and save an initial batch. Add material until the bank has 50 questions.
4. Start Session 1, select some answers, reload it and check the saved draft. Finish the session and reopen its results from the dashboard. Confirm Session 2 unlocks.
5. Use another test account to confirm it cannot open the first account’s saved sources or attempts.

Configure database backups and provider usage limits before sharing the app. The app throttles each authenticated user in a single process. For multiple replicas, use a shared hosting-layer rate limit and monitor generation volume. Review the privacy and terms pages before public launch.

## Existing data

The retired local `data/store.json` was never used by the Supabase-backed app. It contained legacy account data and has been removed from the updated tree. If those accounts were real or reused passwords elsewhere, reset affected credentials and follow your repository owner's process for removing the old snapshot from public Git history. Applying the SQL does not import the retired JSON.
