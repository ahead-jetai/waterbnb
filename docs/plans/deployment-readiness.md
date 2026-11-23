# WaterBnB deployment readiness

Complete these gates in order. Add regression tests with each gate; run the tests and production build before committing and pushing that gate. Keep real bookings and live payments disabled until all four gates pass.

## 1. Secure payments and booking actions

Status: code and regression tests added; staging configuration and verification pending.

- Verify Clerk sessions before handling browser payment requests. Derive the actor from the verified token and scope Checkout results, booking decisions, listing changes, and Connect data to that actor.
- Verify the Stripe signature against the raw webhook body before processing. Handle paid Checkout events, including delayed success, without relying on the guest returning.
- Test missing and invalid credentials, cross-account access, and valid and rejected webhook delivery.
- Deploy the frontend and `payments` function together on staging. Configure the exact `CLERK_ISSUER`, `CLIENT_URL` (SPA origin), and `STRIPE_WEBHOOK_SECRET` (signing secret for that environment's endpoint). Use a least-privilege restricted Stripe API key for `STRIPE_SECRET_KEY`. The gateway JWT check is disabled for this function because it accepts both Clerk and Stripe; the function verifies each credential itself. Subscribe the endpoint to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

## 2. Prevent double bookings and handle refunds

- Reserve dates atomically in Postgres before charging, expire unpaid holds, and make Checkout creation and payment finalization safe to retry.
- Define cancellation and refund rules, move cancellation behind authenticated server-side ownership checks, and reconcile Stripe refunds and host transfer reversals.
- Test concurrent overlapping bookings, repeated checkout requests and webhooks, expired holds, cancellations, refunds, and failed payments and payouts.

## 3. Prove the production setup in staging

- Make the base database schema, role grants, row-level access policies, and storage setup reproducible on a fresh Supabase project. Verify direct browser access to booking and listing data cannot bypass server-side controls.
- Configure separate staging and production Clerk, Supabase, and Stripe environments. Validate SPA deep links, redirect origins, monitoring, backups, and a restore procedure.
- Run a browser-level sign-in to listing to booking to payment to payout to cancellation walkthrough with separate guest and host accounts in Stripe test mode. Make the build, lint, and test checks green in CI.

## 4. Get the marketplace ready for guests

- Publish real Terms, Privacy, cancellation and support pages. Keep fictional listings in the demo, not live browse or booking.
- Confirm applicable rental and marina rules, insurance, and guest safety requirements. Vet the first hosts and inventory in one market.
- Test public links, the real inventory and empty/error states, and the support flow. Start with an invite-only pilot before opening public bookings.
