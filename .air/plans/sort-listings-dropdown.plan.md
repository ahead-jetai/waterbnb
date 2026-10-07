# Plan: Sort Listings on HomePage

## Context
WaterBnB's traveler home already has server-side search filters (location, dates, price range, boat type via `SearchFilters.tsx` → `fetchListings()`), but results are always ordered `created_at desc` with no way for users to sort by price or rating. A sort dropdown is the fastest high-value next feature: it reuses the existing filter/fetch pipeline, touches only 2 files, and requires no schema changes. (Favorites/wishlist was considered but deferred — user chose sort.)

## Goal
Add a "Sort by" dropdown (Recommended/newest, Price low→high, Price high→low, Highest rated) to the HomePage search filters, applied server-side via Supabase `.order()`, with a client-side fallback so the mock-data path also sorts.

## File Changes

### 1. Modify `src/utils/listingsApi.ts`
- Add `export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'rating_desc'` and add `sort?: SortOption` to `ListingFilters` (lines 7–14).
- In `fetchListings` (line 86), replace the hardcoded `.order('created_at', { ascending: false })` with a switch on `filters?.sort ?? 'newest'`:
  - `price_asc`/`price_desc` → `.order('price_per_night', { ascending: … })`
  - `rating_desc` → `.order('rating', { ascending: false, nullsFirst: false })` (rating is nullable in `ListingRow`)
  - default → `.order('created_at', { ascending: false })`
- Add a `sortListings(list, sort)` helper (copies the array — HomePage seeds state from the shared `mockListings`) and use it in the mock-fallback branch (line 95) so sorting works offline. Mocks keep authored order for `newest`.
- The date-availability step (lines 99–105) is a client-side `filter()` after the query, so it preserves server order — no conflict.

### 2. Modify `src/components/SearchFilters.tsx`
- Import `SortOption` from `../utils/listingsApi`.
- Module-scope `SORT_OPTIONS`: `'' → Recommended`, `price_asc`, `price_desc`, `rating_desc`.
- Add a "Sort by" `<select className="input max-w-xs">` in the bottom row (lines 75–98), mirroring the boat-type select pattern (label + id `filter-sort`, `value={filters.sort ?? ''}`, empty string → `undefined`).
- Leave `hasActiveFilters` unchanged — sort is a view preference, not a filter; "Clear filters" resetting it is acceptable.

### 3. `src/pages/HomePage.tsx` — no changes
`filters` already flows into `fetchListings(filters)` via a `useEffect` dependency, so changing sort re-fetches automatically.

## Implementation Steps
1. `listingsApi.ts`: add `SortOption`, extend `ListingFilters`, rework `.order()`, add and wire `sortListings` fallback helper.
2. `SearchFilters.tsx`: add the dropdown.
3. Lint/build and verify manually.

## Acceptance Criteria
- Default view unchanged: newest-first.
- Each sort option re-fetches and reorders the grid; unrated listings appear last under "Highest rated".
- Sort composes with other filters (boat type + price_asc) and with date-availability filtering.
- "Clear filters" resets sort to Recommended.
- With Supabase unreachable, mock listings still sort client-side.
- `npm run build` and `npm run lint` pass.

## Verification
1. `npm run dev`, sign in (Clerk), open traveler HomePage.
2. Cycle through all four sort options and confirm card price/rating ordering.
3. Combine with boat-type filter and check-in/check-out dates.
4. Clear filters → Recommended.
5. Break the Supabase URL, reload, change sort → mocks sort.
6. `npm run build` and `npm run lint`.

## Risks
- Nullable `rating` column: mitigated with `nullsFirst: false`. Change is otherwise additive and isolated.