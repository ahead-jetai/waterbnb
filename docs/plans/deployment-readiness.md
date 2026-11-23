# WaterBnB deployment readiness

Complete these gates in order. Add regression tests with each gate; run the tests and production build before committing and pushing that gate. Keep real bookings and live payments disabled until all four gates pass.

## 1. Secure payments and booking actions

Status: code and regression tests added; staging configuration and verification pending.

- Verify Clerk sessions before handling browser payment requests. Derive the actor from the verified token and scope Checkout results, booking decisions, listing changes, and Connect data to that actor.
- Verify the Stripe signature against the raw webhook body before processing. Handle paid Checkout events, including delayed success, without relying on the guest returning.
- Test missing and invalid credentials, cross-account access, and valid and rejected webhook delivery.
- Deploy the frontend and `payments` function together on staging. Configure the exact `CLERK_ISSUER`, `CLIENT_URL` (SPA origin), and `STRIPE_CHECKOUT_WEBHOOK_SECRET` (the signing secret for `/payments/webhook`, distinct from the separate Connect webhook's `STRIPE_WEBHOOK_SECRET`). Use a least-privilege restricted Stripe API key for `STRIPE_SECRET_KEY`. The gateway JWT check is disabled for this function because it accepts both Clerk and Stripe; the function verifies each credential itself.

## 2. Prevent double bookings and handle refunds

Status: implementation and regression tests added; staging cutover and Stripe sandbox verification pending.

- Instant and host-approved payment use the same Postgres reservation. Dates are exclusive of checkout day. A Checkout URL is returned only after its session has been attached to the reservation. Open Checkout sessions expire 45 minutes after the initial hold; completed sessions awaiting delayed payment remain held until Stripe reports success or failure. The database and Stripe both guard retries.
- Guests can cancel for a full refund, including fees, up to **48 hours before the listing's local check-in time**. Later requests and older bookings without a verified cutoff or recorded PaymentIntent go to support. Cancellation is final and dates are released only after Stripe reports a successful full refund with host transfer reversal and application-fee refund requested.
- Test concurrent holds against PostgreSQL with `psql -X -f supabase/tests/checkout_holds_and_refunds.sql` **only on a fresh disposable instance**. The Vitest suite covers Checkout retries, delayed and failed payments, refund status, and transfer reversal failure. In the Stripe sandbox, also verify a failed payout and refund recovery after payout.

### Staging cutover

1. Disable old checkout creation and drain or expire existing Stripe Checkout sessions before enabling the new flow. Reconcile any already-paid sessions. Verify confirmed bookings do not overlap; the migration refuses to install the exclusion constraint if they do.
2. Apply `20261123120000_checkout_holds_and_refunds.sql`, then set `listing_check_in_schedules` for each vetted listing using a real check-in time and its IANA time zone (for example, `15:00` and `America/New_York`). Listings without a verified schedule cannot accept new payments. Schedules are operator-managed, not browser-writable; changing a schedule does not change existing refund cutoffs.
3. Configure `/functions/v1/payments/webhook` with its own signing secret and subscribe to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `refund.created`, `refund.updated`, and `refund.failed`. The restricted Stripe key must be able to create and read Checkout sessions, read connected account capabilities, and create and read refunds with transfer reversal. Deploy the frontend and Edge Function together.
4. When a refund or transfer reversal cannot be confirmed, keep the booking active. Support should reconcile the recorded PaymentIntent and existing Stripe refund before initiating any manual money movement; never issue a second refund just because the app did not receive a response.

## 3. Prove the production setup in staging

- Make the base database schema, role grants, row-level access policies, and storage setup reproducible on a fresh Supabase project. Verify direct browser access to booking and listing data cannot bypass server-side controls.
- Configure separate staging and production Clerk, Supabase, and Stripe environments. Validate SPA deep links, redirect origins, monitoring, backups, and a restore procedure.
- Run a browser-level sign-in to listing to booking to payment to payout to cancellation walkthrough with separate guest and host accounts in Stripe test mode. Make the build, lint, and test checks green in CI.

## 4. Get the marketplace ready for guests

- Publish real Terms, Privacy, cancellation and support pages. Keep fictional listings in the demo, not live browse or booking.
- Confirm applicable rental and marina rules, insurance, and guest safety requirements. Vet the first hosts and inventory in one market.
- Test public links, the real inventory and empty/error states, and the support flow. Start with an invite-only pilot before opening public bookings.
