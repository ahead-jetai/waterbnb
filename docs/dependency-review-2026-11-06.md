# Dependency review — 2026-11-06

Updated npm lockfile resolutions within existing manifest ranges. No direct dependency major upgrades or application changes. Related React/types, ESLint, and Vitest/coverage packages were updated together.

## Inventory and policy

The root package.json and npm package-lock.json define the frontend and tooling dependencies. All direct ranges are caret ranges except TypeScript (~5.9.3). Existing ranges are preserved; npm ci reproduces this update. No Renovate/Dependabot configuration was found. skills-lock.json records agent skills, not application dependencies.

Supabase functions additionally import npm:stripe@22, npm:@supabase/supabase-js@2, and npm:jose@5. These floating major imports have no checked-in Deno lockfile and are outside npm audit coverage. They remain unchanged; deployment-specific validation and reproducible pinning are follow-up work.

## Direct resolution changes

| Package | Before | After |
| --- | --- | --- |
+| @clerk/clerk-react | 5.61.9 | 5.61.11 |
| @supabase/supabase-js | 2.110.3 | 2.119.0 |
| react | 19.2.7 | 19.3.1 |
| react-dom | 19.2.7 | 19.3.1 |
| react-router-dom | 7.18.4 | 7.18.5 |
| @eslint/js | 9.39.1 | 9.39.5 |
| @testing-library/react | 16.3.2 | 16.3.3 |
| @testing-library/user-event | 14.6.1 | 14.6.8 |
| @types/node | 24.10.1 | 24.19.2 |
| @types/react | 19.2.6 | 19.3.0 |
| @types/react-dom | 19.2.3 | 19.3.0 |
| @vitejs/plugin-react | 5.1.1 | 5.2.0 |
| @vitest/coverage-v8 | 4.1.11 | 4.1.12 |
| autoprefixer | 10.4.22 | 10.6.2 |
| eslint | 9.39.1 | 9.39.5 |
| eslint-plugin-react-refresh | 0.4.24 | 0.4.26 |
| postcss | 8.5.28 | 8.5.32 |
| tailwindcss | 3.4.18 | 3.4.19 |
| typescript-eslint | 8.47.0 | 8.72.1 |
| vite | 6.4.3 | 6.4.5 |
| vitest | 4.1.11 | 4.1.12 |

## Security and release notes

The initial npm audit reported 17 affected packages (4 high, 13 moderate). Range-compatible updates reduced this to 7 moderate findings and no high findings. Counts include dependency-chain reports, not seven distinct advisories.

[Vite release notes](https://github.com/vitejs/vite/blob/v6.4.5/packages/vite/CHANGELOG.md) describe launch-editor updates and filesystem-access checks in 6.4.4–6.4.5. [Vitest 4.1.12](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12) hardens manual and redirect mocks. Transitive updates also clear the reported source-map-js, undici, zod, selector-parser, and glob findings.

Remaining findings concern [minimatch amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249) through TypeScript ESLint. npm suggests downgrading typescript-eslint to 8.36.0; this was not applied. Follow upstream for compatible remediation rather than forcing a minimatch major override.

## Deferred and manual follow-up

- eslint-plugin-react-hooks 7.1.1 introduced four additional lint errors. Kept its original locked 7.0.1; resolve the effect-state findings separately before updating.
- Major migrations were excluded: ESLint/@eslint/js 10, Vite 8/plugin-react 6, Vitest/coverage 5, Tailwind 4, TypeScript 7, Node types 26, globals 17, jest-dom 7. react-refresh 0.5 is also outside its existing compatible range. Review each migration's release notes in its own change.
- Clerk 5.61.11 emits an unsupported-package notice directing migration to @clerk/react. That auth migration requires separate testing.
- Live Clerk/Supabase interactions and Edge Function deployments were not exercised.

## Validation

Node 24.13.0; clean npm installation succeeds. Production build passes. All 14 test files / 62 tests pass with VITE_SUPABASE_URL=http://127.0.0.1:54321 and VITE_SUPABASE_PUBLISHABLE_KEY=test-placeholder. Without these placeholders, two suites fail during collection because the checkout has no Supabase environment configuration.

Lint remains at 7 errors and 1 warning, matching a clean installation of the original lockfile. Existing lint errors were not changed as part of dependency maintenance.
