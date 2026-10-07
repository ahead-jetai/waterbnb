# Dependency review — 2026-09-11

## Scope and policy

The root package.json and npm package-lock.json (lockfile v3) define the frontend and test/build tools. No other tracked package manifest, lockfile, Renovate or Dependabot configuration was found. All direct requirements use caret ranges (same major, or same minor for 0.x); TypeScript uses ~5.9.3 (patches only). The lockfile pins the resolved graph. No overrides were added. Use npm ci for reproducible installs.

Supabase Edge Functions separately import npm:@supabase/supabase-js@2, npm:jose@5 (messages), and npm:stripe@22 (payments). These are floating major selectors without a Deno lockfile. npm audit does not cover their deployed dependency graph. They were left unchanged: Deno is unavailable, and no function integration tests or deployment verification were performed. Follow up with a Deno dependency inventory, audit and lockfile in the deployment environment.

The README's Node 18 recommendation contradicted the pre-existing Supabase and jsdom engine requirements. Updated it to recommend Node 24; this run used Node 24.13.0 and npm 11.6.2.

## Applied security batch

Raised the manifest minimums while preserving caret policy and regenerated the npm lockfile:

| Direct package | Previous locked version | New minimum/locked version |
| --- | --- | --- |
| react-router-dom | 7.10.1 | 7.18.3 |
| vite | 6.4.1 | 6.4.3 |
| postcss | 8.5.6 | 8.5.28 |
| vitest | 4.1.10 | 4.1.11 |
| @vitest/coverage-v8 | 4.1.10 | 4.1.11 |

No direct major upgrades were applied. Related Vitest packages and coverage remain aligned. Compatible transitive fixes include Babel, Rollup, undici, minimatch/brace-expansion, picomatch, js-yaml, flatted, ajv, browserslist, nanoid and postcss-selector-parser. The full exact graph is in the lockfile diff.

- [Vite 6.4.3 changelog](https://github.com/vitejs/vite/blob/v6.4.3/packages/vite/CHANGELOG.md): security backports address dev-server file access/path traversal and Windows alternate/UNC paths.
- [Vitest 4.1.11 release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.11): restricts redirect mocks to the filesystem allowlist, fixing [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
- [React Router v7 changelog](https://github.com/remix-run/react-router/blob/v7/CHANGELOG.md): navigation URL validation and route-matching fixes. Reviewed the 7.18 server CSRF behavior change separately: this repository uses BrowserRouter/Routes, with no React Router server adapter or action handlers, so that migration is inapplicable. Existing navigation tests pass. Server-only advisories do not imply this SPA was exploitable.
- PostCSS updates resolve audit-reported CSS/source-map file disclosure and stringification issues. Transitive upgrades remove the other npm-reported advisories without forced major changes.

## Verification

- Baseline npm audit: 21 affected packages (13 high, 6 moderate, 2 low; no critical). Final npm audit: 0 reported vulnerabilities, including development dependencies. This is a registry advisory result, not proof of absence of vulnerabilities, and excludes Edge Function imports.
- Fresh npm ci --include=dev: passed; npm ls --depth=0 has no dependency errors.
- npm run build: passed before and after, including TypeScript compilation.
- Baseline test:run and final test:coverage: all 10 files / 42 tests passed with VITE_SUPABASE_URL=http://127.0.0.1:1 and VITE_SUPABASE_PUBLISHABLE_KEY=test-placeholder. These inert values allow client construction without production credentials. Without these variables, three baseline suites fail during import.
- Coverage: 17.91% statements, 13.50% branches, 14.18% functions, 19.45% lines. No live Clerk/Supabase/Stripe or end-to-end verification was performed.
- npm run lint: unchanged baseline failures (11 errors, 1 warning), in Carousel, booking/payment pages and Edge Functions. These are existing application issues, not dependency regressions; fix separately.

## Deferred updates and follow-up

The following registry snapshot lists remaining direct updates. They were deliberately excluded from this security-focused batch. React 19.3 is a newly released feature update; its release notes and Supabase 2.116 notes were reviewed, but neither was needed to clear advisories. Defer them until broader UI/auth/storage integration checks are available. Routine unrelated tool updates can be batched later. Majors require a separate release-note/migration review and verification; none was attempted here.

| Package | Retained version | Available within range | Registry latest |
| --- | --- | --- | --- |
| @eslint/js | 9.39.1 | 9.39.5 | 10.0.1 |
| @supabase/supabase-js | 2.110.3 | 2.116.0 | 2.116.0 |
| @testing-library/jest-dom | 6.9.1 | 6.9.1 | 7.0.1 |
| @testing-library/react | 16.3.2 | 16.3.3 | 16.3.3 |
| @testing-library/user-event | 14.6.1 | 14.6.7 | 14.6.7 |
| @types/node | 24.10.1 | 24.13.4 | 22.20.2 |
| @types/react | 19.2.6 | 19.3.0 | 19.3.0 |
| @types/react-dom | 19.2.3 | 19.3.0 | 19.3.0 |
| @vitejs/plugin-react | 5.1.1 | 5.2.0 | 6.1.1 |
| @vitest/coverage-v8 | 4.1.11 | 4.1.11 | 5.0.0 |
| autoprefixer | 10.4.22 | 10.5.6 | 10.5.6 |
| eslint | 9.39.1 | 9.39.5 | 10.10.0 |
| eslint-plugin-react-hooks | 7.0.1 | 7.1.1 | 7.1.1 |
| eslint-plugin-react-refresh | 0.4.24 | 0.4.26 | 0.5.6 |
| globals | 16.5.0 | 16.5.0 | 17.12.0 |
| react | 19.2.7 | 19.3.0 | 19.3.0 |
| react-dom | 19.2.7 | 19.3.0 | 19.3.0 |
| tailwindcss | 3.4.18 | 3.4.19 | 4.3.3 |
| typescript | 5.9.3 | 5.9.3 | 7.0.2 |
| typescript-eslint | 8.47.0 | 8.70.0 | 8.70.0 |
| vite | 6.4.3 | 6.4.3 | 8.3.0 |
| vitest | 4.1.11 | 4.1.11 | 5.0.0 |

Major follow-ups: ESLint/@eslint/js 10, jest-dom 7, plugin-react 6, Vitest/coverage 5, globals 17, Tailwind 4, TypeScript 7 and Vite 8. The react-refresh 0.5 line is also outside the existing compatible range. The registry latest tag for @types/node points to 22 despite an available 24 line; do not downgrade based solely on that tag.

Optional release references: [React 19.3](https://github.com/facebook/react/releases/tag/v19.3.0), [Supabase 2.116.0](https://github.com/supabase/supabase-js/releases/tag/v2.116.0).
