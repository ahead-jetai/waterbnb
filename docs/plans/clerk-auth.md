# Clerk Authentication — Implementation Plan (P0 #1)

**Status:** Implemented ✅

## Scope
Clerk auth with **SMS/phone-only** verification. Sign-up collects first name, last name, phone. Booking pages and host-listing page are protected.

## Clerk Dashboard Setup (manual)
1. Create app at dashboard.clerk.com.
2. User & Authentication → Email, Phone, Username: **disable email**, **enable phone (required)**, disable username.
3. Social connections: **disable all**.
4. Sign-up fields: **enable first name + last name**, both required.
5. Copy Publishable Key → `.env` as `VITE_CLERK_PUBLISHABLE_KEY`.

## Code Changes
| File | Change |
|------|--------|
| `.env` / `.env.example` | `VITE_CLERK_PUBLISHABLE_KEY` |
| `src/main.tsx` | Wrap app in `<ClerkProvider>` (throws if key missing) |
| `src/components/ProtectedRoute.tsx` | Auth guard: loader while `!isLoaded`, redirect to `/sign-in` with `returnTo` state, else render children |
| `src/App.tsx` | Add `/sign-in`, `/sign-up` routes; wrap `/booking/*` and `/host/list` in `ProtectedRoute` |
| `src/pages/SignInPage.tsx` | Clerk `<SignIn routing="hash">`, `afterSignInUrl = returnTo` |
| `src/pages/SignUpPage.tsx` | Clerk `<SignUp routing="hash">`, redirect to `/` |
| `src/components/Header.tsx` | `<SignedOut>` → Sign in link; `<SignedIn>` → `<UserButton>` (desktop + mobile) |
| `src/pages/GuestDetailsPage.tsx` | Pre-fill name + phone from `useUser()` |
| `src/components/Login.tsx` | Re-export `SignInPage` (was empty) |

## Testing
Vitest + React Testing Library set up from scratch (`vitest.config.ts`, `src/test/setupTests.ts`). Clerk is mocked with `vi.mock()`.
- `ProtectedRoute.test.tsx` — loading / redirect / pass-through (3)
- `SignInPage.test.tsx` — renders / returnTo passthrough / default (3)
- `SignUpPage.test.tsx` — renders (1)
- `Header.test.tsx` — signed-out vs signed-in (2)

Run: `npm run test:run` (9 passing).

## Known Limitation
Booking data lives in React Router `location.state`. When an unauthenticated user is redirected to sign in, that state is lost; after sign-in they return to the booking route, which redirects them to the listing to re-select dates. Preserving state through auth via `sessionStorage` is a future enhancement.
