## 1. Goal
Push the WaterBnB app's data model into the currently-empty Supabase Postgres database by creating `listings` and `bookings` tables (via `mcp__supabaseWaterBnB__apply_migration`) and seeding the 10 mock listings.

## 2. Approach
The Supabase project has no `public` tables (verified: `information_schema.columns` returned `[]`). The app defines its model in `src/bookingTypes.ts` (`Listing`, `BookingData`, `GuestDetails`, `PaymentDetails`) with 10 mock rows in `src/data/listings.ts`. I'll mirror those types into two tables using DDL migrations, then seed listings with a data migration. I use `apply_migration` for DDL (per tool guidance) and keep the seed idempotent with `on conflict do nothing`. Payment card data is intentionally **not** persisted (PCI risk) — only a boolean/last4 style flag if needed, matching that `paymentDetails` is a transient client-only type.

## 3. File Changes
No local repository files are created or modified — all changes are applied directly to the remote Supabase database via MCP tools. (Optionally, a follow-up could save generated types to `src/database.types.ts`; see Task 4.)

## 4. Implementation Steps

**Task 1 — Create `listings` table** (`apply_migration`, name `create_listings_table`)
- Columns mirroring `Listing` in `src/bookingTypes.ts:1-10`:
  - `id text primary key` (matches app ids like `l1`)
  - `title text not null`
  - `location text not null`
  - `price_per_night integer not null`
  - `rating numeric(3,2) not null default 0`
  - `reviews integer not null default 0`
  - `image text not null`
  - `tags text[] not null default '{}'`
  - `created_at timestamptz not null default now()`
- Enable RLS; add a `select` policy `using (true)` for anon read (listings are public).

**Task 2 — Create `bookings` table** (`apply_migration`, name `create_bookings_table`)
- Columns mirroring `BookingData`/`GuestDetails` in `src/bookingTypes.ts:12-37`:
  - `id uuid primary key default gen_random_uuid()`
  - `listing_id text not null references listings(id)`
  - `check_in date not null`, `check_out date not null`
  - `guests integer not null check (guests > 0)`
  - `guest_name text`, `guest_email text`, `guest_phone text`, `special_requests text`
  - `status text not null default 'pending'`
  - `created_at timestamptz not null default now()`
- Add `check (check_out > check_in)`.
- Enable RLS with an `insert` policy `with check (true)` (public booking creation). No card fields stored.

**Task 3 — Seed listings** (`execute_sql` or data migration `seed_listings`)
- Insert all 10 rows from `src/data/listings.ts:6-107` (l1–l10) with `on conflict (id) do nothing`.

**Task 4 (optional) — Regenerate types**
- Run `mcp__supabaseWaterBnB__generate_typescript_types` and, if the user wants, save output for later Supabase-client integration. Purely additive; skip if not desired.

## 5. Acceptance Criteria
- `select count(*) from listings` returns `10`.
- `information_schema.columns` shows `listings` and `bookings` tables with the columns above.
- Inserting a valid booking referencing `l1` succeeds; a booking with `check_out <= check_in` is rejected by the check constraint.
- `mcp__supabaseWaterBnB__get_advisors` (security) reports no missing-RLS warnings for the two new tables.

## 6. Verification Steps
- `mcp__supabaseWaterBnB__list_tables` shows `listings` and `bookings`.
- `mcp__supabaseWaterBnB__execute_sql`: `select id, title from listings order by id;` returns l1–l10.
- Run `get_advisors` type=`security` after DDL to confirm RLS is enabled.

## 7. Risks & Mitigations
- **Model ambiguity (`guests` = count vs. capacity):** app treats `guests` as a per-booking count (`BookingData.guests: number`), so it lives on `bookings`, not `listings`. Matches source.
- **PCI / sensitive data:** `paymentDetails` deliberately not persisted; if the user wants payment records, use a Stripe reference id rather than raw card data.
- **RLS lockout:** enabling RLS without policies would block all reads/writes; policies in Tasks 1–2 prevent this. Write access is currently open (`with check (true)`) since there's no auth yet — flagged for tightening once auth lands.
- **Confirm target project:** two Supabase servers are connected (`supabase` and `supabaseWaterBnB`); I will use `supabaseWaterBnB` exclusively per the request.
