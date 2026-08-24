# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

WaterBnB is a React + TypeScript vacation rental app for water-based stays such as houseboats, sailboat cabins, and floating homes. The app is built with Vite, TailwindCSS, React Router, Clerk authentication, Supabase utilities/functions, and Vitest tests.

## Repository layout

- `src/pages/` contains route-level page components.
- `src/components/` contains reusable UI components.
- `src/components/booking/` contains booking-specific UI components and exports.
- `src/hooks/` contains React hooks.
- `src/utils/` contains API/client helpers for Supabase-backed domains such as listings, bookings, messages, payments, availability, host profiles, and analytics.
- `src/data/` contains static/mock data.
- `src/test/` contains Vitest and React Testing Library tests.
- `supabase/functions/` contains Supabase Edge Functions.
- `supabase/migrations/` contains SQL migrations.
- `docs/` contains planning and evaluation documents.

## Commands

Use npm scripts from `package.json`:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test:run
```

Notes:

- `npm run test` starts Vitest in watch mode; prefer `npm run test:run` for agent verification.
- `npm run build` runs TypeScript project build and Vite production build.
- `npm run dev:server` and `npm run dev:full` reference `server/index.mjs`, which is not present in the current checkout. Do not rely on these until the server directory is restored or the scripts are updated.

## Coding conventions

- Use TypeScript and React function components.
- Keep route-level composition in `src/pages/`; extract reusable UI to `src/components/`.
- Keep domain-specific API logic in `src/utils/` rather than embedding fetch/Supabase calls directly in components.
- Prefer existing shared components and utilities before adding new ones.
- Use TailwindCSS utility classes for styling. Global styles and shared CSS helpers live in `src/index.css`.
- Preserve existing React Router patterns. Tests commonly use `MemoryRouter`, `Routes`, and route stubs.
- Avoid adding broad dependencies unless they materially simplify the requested work.
- Do not commit generated build output such as `dist/`.

## Testing guidance

- Add or update tests when changing routing, authentication behavior, booking flows, host flows, API utilities, or user-visible state.
- Use Vitest with React Testing Library for component/page tests.
- Mock Clerk using `vi.mock('@clerk/clerk-react', ...)` as existing tests do.
- Prefer behavior-focused assertions using roles/text over implementation details.
- For Supabase utility tests, follow the existing mocked-client patterns in `src/test/*Api.test.ts`.

## Authentication and data services

- Clerk is used for authentication and user metadata.
- Supabase client setup is in `src/utils/supabase.ts`.
- Supabase Edge Functions live under `supabase/functions/`.
- SQL migrations live under `supabase/migrations/`.
- Treat environment variables and service keys as secrets. Do not hardcode credentials or expose service-role keys in frontend code.

## Verification checklist

Before handing off code changes, run the smallest relevant checks:

- `npm run test:run` for test-covered logic and UI behavior.
- `npm run lint` for TypeScript/React linting.
- `npm run build` when changes affect types, routing, bundling, or production behavior.

If a check cannot be run, report the reason and what remains unverified.

## Agent workflow

- Inspect existing code and tests before making changes.
- Keep changes scoped to the user request.
- Preserve unrelated user changes in the working tree.
- Prefer `rg` for searching.
- Use `apply_patch` for file edits.
- When a task touches Stripe integration, payments, subscriptions, Connect, or API-version upgrades, use the repository Stripe skills/instructions before making changes.
