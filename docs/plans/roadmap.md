# WaterBnB — Production Readiness Roadmap

## Goal
Turn the current client-side demo into a usable product with two jobs to be done:
1. **Hosts list boats to make money.**
2. **Guests rent boats to enjoy on demand.**

## Chosen Stack
- **Auth:** Clerk (SMS/phone-only verification; collect first name, last name, phone at sign-up)
- **Backend / DB:** Supabase (Postgres + Row-Level Security + Storage + Edge Functions)
- **Payments:** Stripe (Checkout for guests, Connect for host payouts)

## Current State (as of 2026-07-13)
A polished React 19 + TypeScript + Vite + Tailwind SPA. Implemented:
- Listing browse (home grid, carousel) and detail pages
- Multi-step booking flow (review → guest details → payment form → confirmation)
- Host landing page + 4-step listing creation wizard

Everything is client-side. No auth, no persistence, no real payments — all data is hardcoded in `src/data/listings.ts`.

---

## Order of Attack

Each feature ships with tests.

### P0 — Foundational
1. **Authentication (Clerk)** — SMS-only. Protect booking + host-listing routes. *(in progress — see `clerk-auth` plan)*
2. **Database schema + API (Supabase)** — users, listings, bookings, reviews tables with RLS.
3. **Seed/migrate listings** — move hardcoded listings into the DB; wire pages to fetch from Supabase.
4. **Real payments (Stripe)** — replace fake card form with Stripe Checkout/Elements; webhook confirms booking.

### P1 — Core Guest Experience
5. **Search & filters** — by location, dates, price, boat type.
6. **Date availability** — block booked dates on the listing calendar.
7. **Booking persistence** — save confirmed bookings to Supabase.
8. **Guest dashboard** — "My Trips": upcoming/past bookings, status, cancel.
9. **Email/SMS notifications** — booking confirmation (Supabase Edge Function + provider).

### P1 — Core Host Experience
10. **Host dashboard** — view/edit/deactivate listings, booking requests, earnings.
11. **Image uploads** — replace URL input with Supabase Storage uploads.
12. **Availability/calendar management** — block dates, minimum nights, seasonal pricing.
13. **Host payouts** — Stripe Connect connected accounts.
14. **Listing review/approval** — real approval flow (or auto-approve) behind the "under review" state.

### P2 — Trust & Quality
15. **Reviews & ratings** — guests submit post-stay; aggregate on listings.
16. **Guest/host messaging** — per-booking thread (Supabase Realtime).
17. **Identity verification** — Clerk / Stripe Identity for higher-value bookings.
18. **Cancellation policy** — per-listing rules; refund logic via Stripe.

### P3 — Growth & Polish
19. **Map view** — listings on a map (Mapbox / Google Maps).
20. **Favorites / wishlist** — persisted per user.
21. **SEO / OG tags** — meta tags for shareable listing pages.
22. **Admin panel** — approve listings, manage disputes, platform metrics.

---

## Notes / Known Debt
- The project does not currently build cleanly (`npm run build`): `src/data/listings.ts` has an unused variable (`img`) and several pages trigger `react-hooks/set-state-in-effect` lint errors. These pre-date the auth work and should be cleaned up before or during P0→P1.
