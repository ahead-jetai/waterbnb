---
sessionId: session-261002-123013-xdiy
---

# Requirements

### Overview
Add a sort dropdown to the listing grid on the home page so users can sort listings by Newest, Price (low to high), Price (high to low), and Highest Rated.

### Scope
**In Scope:**
- Sort dropdown UI in the SearchFilters component (beside existing filters)
- Client-side sorting of already-fetched listings in HomePage
- Four sort options: Newest, Price: low to high, Price: high to low, Highest rated
- One interaction test in HomePage.test.tsx

**Out of Scope:**
- Database or API changes (sorting is client-side only)
- Sorting on other pages (e.g., host listings)
- Persisting sort preference

### Functional Requirements
- Default sort is "Newest" (matches current API behavior — newest first)
- Selecting a sort option immediately reorders the visible listings
- The Clear filters button resets sort to default (Newest)
- Sorting works independently of other filters (location, price range, dates, boat type)

# Technical Design

### Current Implementation
- `HomePage.tsx` renders `TravelerHome`, which fetches listings via `fetchListings(filters)` and renders them in a grid. The API returns listings ordered by `created_at DESC` (newest first).
- `SearchFilters.tsx` provides filter inputs (location, dates, price range, boat type) and calls `onChange(filters)` to update state.
- `ListingFilters` type in `listingsApi.ts` defines filter fields.
- `Listing` type has `pricePerNight` (number), `rating` (number 0-5), and `reviews` (number).
- Mock listings in `data/listings.ts` have varied prices ($175-$350) and ratings (4.67-4.95), suitable for testing sort order.

### Key Decisions
- **Client-side sorting only**: No API or database changes needed. The page already fetches all filtered listings; sorting a copy in the component is lightweight and follows the existing pattern.
- **Sort state in ListingFilters**: Adding `sort` to the filters type keeps state management simple — one source of truth for all filter/sort state, consistent with how boat type and price filters work.
- **useMemo for sorted results**: Avoids re-sorting on every render unless filters or the list changes.

### Proposed Changes

**`src/utils/listingsApi.ts`**:
- Add `sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating'` to `ListingFilters` type.

**`src/components/SearchFilters.tsx`**:
- Add a `<select>` dropdown with options: Newest (default), Price: low to high, Price: high to low, Highest rated.
- Wire it to call `onChange` with the selected sort value.
- Include `sort` in the `hasActiveFilters` check so Clear resets it.

**`src/pages/HomePage.tsx`**:
- Import `useMemo` from React.
- Add a `useMemo` that sorts `listings` based on `filters.sort` before rendering.
- Render the sorted list instead of raw `listings`.

**`src/test/HomePage.test.tsx`**:
- Add a test that verifies the sort dropdown exists and that selecting a sort option reorders listings (mock data has known prices/ratings to assert order).

### Data Models
```typescript
export type ListingFilters = {
  location?: string
  minPrice?: number
  maxPrice?: number
  boatType?: string
  checkIn?: string
  checkOut?: string
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating'
}
```

### Risks
- **Sorting with null ratings**: Listings with `rating: 0` (unrated) will sort to the bottom for "Highest rated" — this is acceptable behavior.
- **Large result sets**: Client-side sorting could be slow for thousands of listings, but current usage is small grids. Pagination would address this if it becomes an issue.

# Delivery Steps

### ✓ Step 1: Add sort dropdown to SearchFilters
Extend SearchFilters with a sort dropdown and pass sorted results back to HomePage.
- Add `sort` field to `ListingFilters` type in `src/utils/listingsApi.ts` with values: `'newest'`, `'price-asc'`, `'price-desc'`, `'rating'`.
- Update `SearchFilters.tsx` to include a `<select>` dropdown with four options (Newest, Price: low to high, Price: high to low, Highest rated) alongside the existing boat type filter.
- Wire the dropdown to call `onChange` with the selected sort value.
- Update `hasActiveFilters` to include the sort state so the Clear button resets it.

### ✓ Step 2: Implement client-side sorting in HomePage and add test
Sort the fetched listings in HomePage based on the selected sort option, then add an interaction test.
- In `HomePage.tsx` (TravelerHome component), add a `useMemo` that sorts the `listings` array based on `filters.sort` before rendering.
- Sorting logic: 'newest' keeps original order (API returns newest first), 'price-asc' sorts by `pricePerNight` ascending, 'price-desc' sorts descending, 'rating' sorts by `rating` descending.
- In `HomePage.test.tsx`, add a test that renders the signed-in home page, verifies the sort dropdown is present, selects a sort option, and confirms the listings reorder (using the mock data which has known prices/ratings).