# WaterBnB staging runbook

Keep real bookings disabled. Use a dedicated Supabase staging project, a Clerk development instance, and a Stripe sandbox. Use synthetic accounts, listings, and payment methods only. Do not reuse production project IDs, signing secrets, or account data.

## Local release checks

Use Node 24 LTS and PostgreSQL with `btree_gist` and `dblink` available. From the repository root:

```bash
npm ci
npm run lint
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-placeholder npm run test:run
npm run build
bash scripts/test-database.sh
npm run preview -- --port 4173 --strictPort
```

In a second terminal, run `node scripts/smoke-spa.mjs http://localhost:4173`. The database check starts its own socket-only disposable Postgres instance, runs the real migrations against fixtures for Supabase-managed schemas, and verifies backup and restore. It does not test the hosted PostgREST, Auth, or Storage gateway. For the full local Supabase gateway, start Docker and run `supabase start` followed by `supabase db reset --local --no-seed`. Never point a reset at a hosted project. To exercise live Clerk tokens against local Supabase, add a development-only `[auth.third_party.clerk]` config with `enabled = true` and the Clerk development domain; do not commit personal environment values.

## Hosted setup and order

1. In Clerk, enable the Supabase integration so default session tokens carry `role: "authenticated"`. Configure the exact permitted app origins and callback URLs. Add that Clerk instance under the **Supabase staging project's Third-Party Auth** settings; use the token's exact `iss` value for `CLERK_ISSUER`. Do not create a legacy shared-secret JWT template. Staging and production must have different Clerk instances.
2. In the intended Supabase project, verify the project reference and migration history before applying anything. For a fresh staging project, apply every checked-in migration in order and verify the public `listing-images` bucket is capped at 10 MiB and accepts only the five configured image types. For an existing project, review `supabase migration list --linked` and `supabase db push --dry-run` first; the earlier baseline was added after the fact. Do not repair or replay unexpected migration history without a separate, reviewed recovery plan. Leave old unowned image objects readable by public URL; only new images under `<Clerk user ID>/` are browser-deletable. Reconcile or clean up old objects as an operator, not by restoring broad write policies.
3. Follow the [Priority 2 cutover](deployment-readiness.md#staging-cutover) before enabling Checkout. Set Supabase Edge secrets through the staging project's secrets manager: `APP_ENV=staging`, `CLIENT_URL` (exact HTTPS SPA origin), `CLERK_ISSUER`, `STRIPE_SECRET_KEY` (sandbox restricted key), and `STRIPE_CHECKOUT_WEBHOOK_SECRET`. Leave the separate Connect webhook's signing secret distinct. Use `APP_ENV=production` **only** in the production project; the payment function rejects keys and webhook events from the wrong Stripe mode. Deploy `payments` and `messages` from the same revision as the frontend. Both functions verify Clerk session tokens themselves; keep their gateway `verify_jwt = false` as checked in.
4. Set `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` in the staging build environment. These are public build inputs; never add an Edge secret under `VITE_`. Run `node scripts/check-release-config.mjs staging`, then `npm run build -- --mode staging`, and publish `dist/`. Configure the host to return `index.html` with HTTP 200 for SPA routes such as `/trips` and `/booking/<id>/confirmation`, **after** serving real static files. Do not rewrite API traffic to HTML. Run `node scripts/smoke-spa.mjs <staging-origin>` once deployed.

## Browser acceptance checklist

Record the commit, staging origin, Supabase project reference, and redacted evidence. Use separate browser profiles for host and guest. Do not put customer details, tokens, or signing secrets in logs or screenshots.

On a revision with the pilot migration, register the synthetic host and guest in `pilot_invitations`, approve the synthetic listing after setting its `America/Los_Angeles` check-in schedule, and enable `pilot_settings.bookings_enabled` **only on staging**. See the [pilot checklist](los-angeles-pilot.md) for activation and pause steps.

- Sign in as the host, write the profile, upload a photo, create a listing, edit it, and add a private calendar block. Set its verified check-in schedule. As the guest, confirm photos and availability load, private block notes are not exposed, and you cannot modify the host's listing or see bookings you don't participate in.
- In the Stripe sandbox, finish Connect onboarding and verify the host can receive transfers. As the guest, make a booking request; approve it as the host. Also verify instant booking. Attempt overlapping checkout dates in a second guest session; only one may proceed to Stripe. Test cancelling out of Checkout, resuming the same session, successful payment, and receipt, conversation, and trip visibility without requiring the Stripe return screen to be loaded.
- Verify the Stripe destination charge, application fee, connected-account transfer, and test payout status. Check refund before the 48-hour cutoff, pending or failed refund behavior, transfer reversal and fee refund, dates released on success, and a later cancellation routed to support. Test a payout failure and refund recovery after payout in the sandbox.
- From pasted URLs, verify `/hosting`, `/trips`, and booking confirmation route into the SPA. Clerk sign-in return, Stripe success/cancel, and Connect onboarding refresh/return must stay on the exact staging origin. Confirm that staging does not accept live Stripe keys or events and production does not use staging credentials.

## Monitoring and recovery

- Configure an uptime monitor for `/healthz.json` (must return JSON with `service: waterbnb`) plus a synthetic deep-link check using `scripts/smoke-spa.mjs`. This is a frontend check; independently alert on Supabase Edge Function 5xx, Stripe Checkout webhook delivery failures, and stalled or failed refunds and payouts in Stripe. Send a test alert and record who receives and responds to it.
- Enable the chosen Supabase backup/PITR retention and confirm the recovery window in the dashboard. Back up Storage object contents separately: database backups contain Storage metadata, not the files. Record how to recover Clerk and Stripe settings and webhook routing; payment records stay authoritative in Stripe.
- Rehearse a restore into an isolated staging recovery target, never over the active or production database. Verify a known booking and its migration version, repeat guest/host access checks, restore a test image from the Storage backup, and verify that webhook processing and refunds reconcile with sandbox Stripe. Record measured restore time and data loss window.
- If a release fails, keep Checkout disabled, preserve the database and payment records, and investigate on staging. Redeploy a compatible frontend/Edge version or apply a forward fix; do not restore the old permissive database policies or roll back over recorded payments.
