# Dependency review — 2026-10-16

Applied eight direct tooling upgrades and compatible transitive updates. No existing dependency crossed a major version. Full npm audit decreased from 14 affected packages (12 high, 2 moderate) to 7 (5 high, 2 moderate); the final production-only audit reports zero. Remaining findings require separate Tailwind dependency work.

## Discovery and policy

- [package.json](air-file://ttj1ovvjr8t2t1rmquvm/workspaces/waterbnb/package.json?type=file&root=%252F) is the only tracked npm manifest; [package-lock.json](air-file://ttj1ovvjr8t2t1rmquvm/workspaces/waterbnb/package-lock.json?type=file&root=%252F) is its npm v3 lockfile. Direct requirements use caret ranges except TypeScript's patch-only ~5.9.3. The pre-1.0 React Refresh range permits only 0.4.x. Preserve these ranges and use npm ci to reproduce the exact resolved graph.
- No workspace manifests, Deno configuration/lockfile, Renovate/Dependabot configuration, or dedicated update policy was found. Existing dependency reviews favor incremental security fixes. The README recommends Node 24; validation used Node 24.13.0 and npm 11.6.2.
- [skills-lock.json](air-file://ttj1ovvjr8t2t1rmquvm/workspaces/waterbnb/skills-lock.json?type=file&root=%252F) tracks agent skills, not application packages.
- Edge Functions independently import npm:@supabase/supabase-js@2, npm:jose@5 and npm:stripe@22. These floating major selectors are outside the root npm audit. Deno is unavailable here; no deployed graph, JWT verification or live payment integration was tested. These imports were not upgraded.

## Applied groups and reviewed release notes

| Group | Resolved versions before → after | Reason |
| --- | --- | --- |
| Build server | Vite 6.4.3 → 6.4.4 | Resolved-ID access checks and safe-module-path hardening |
| Tests | Vitest / coverage-v8 and internal packages 4.1.11 → 4.1.12 | Manual/redirect mock hardening; keep runner and coverage aligned |
| CSS | PostCSS 8.5.28 → 8.5.30; Tailwind 3.4.18 → 3.4.19 | Style escaping/source-map fixes and sibling-function handling |
| Lint | ESLint / @eslint/js 9.39.1 → 9.39.5; typescript-eslint family 8.47.0 → 8.48.0 | Maintenance fixes and removal of fast-glob from typescript-estree |
| Transitive security | source-map-js 1.2.1 → 1.2.2 | Fix indexed source-map event-loop denial of service |

Raised the eight direct minimums while retaining caret policy. Chose typescript-eslint 8.48.0 specifically for its replacement of fast-glob with tinyglobby, limiting rule changes compared with the latest 8.71.2. Other compatible transitive changes include ESLint configuration packages, acorn, nanoid, ignore, semver and ts-api-utils. No overrides or forced audit fixes were used. Application dependencies remain at their prior locked versions.

Primary sources reviewed before applying the corresponding changes:

- [Vite 6.4.4 changelog](https://github.com/vitejs/vite/blob/v6.4.4/packages/vite/CHANGELOG.md).
- [Vitest 4.1.12 release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12).
- [PostCSS 8.5.30 changelog](https://github.com/postcss/postcss/blob/8.5.30/CHANGELOG.md) and [Tailwind 3.4.19 changelog](https://github.com/tailwindlabs/tailwindcss/blob/v3.4.19/CHANGELOG.md).
- [ESLint 9.39.5 changelog](https://github.com/eslint/eslint/blob/v9.39.5/CHANGELOG.md) and [typescript-eslint 8.48.0 changelog](https://github.com/typescript-eslint/typescript-eslint/blob/v8.48.0/CHANGELOG.md).
- [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

## Remaining vulnerabilities and major migrations

The seven remaining affected packages represent two root advisories propagated through Tailwind's build dependencies, not seven independent security defects:

- [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): braces 3.0.3 remains through chokidar and micromatch/fast-glob. The advisory lists no patched braces version; registry latest is still 3.0.3.
- [postcss-selector-parser CPU exhaustion](https://github.com/advisories/GHSA-rj75-hqrm-r3gf): Tailwind and postcss-nested retain parser 6.1.4; the fix starts in 7.1.6, outside their supported major range. The advisory explicitly excludes ordinary build-time use on trusted sources. Do not infer that the deployed SPA is vulnerable merely from this audit.

npm suggests Tailwind 4.3.3 as the parent migration. Reviewed the [Tailwind v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide): it changes the PostCSS integration, CSS directives/configuration and browser support (Safari 16.4+, Chrome 111+, Firefox 128+). This repository uses the v3 PostCSS plugin and @tailwind directives. Defer the major until browser requirements and visual regressions can be checked. For now, treat untrusted CSS/glob inputs to build tools as relevant to the remaining findings; do not force incompatible transitive overrides.

ESLint 9 is now deprecated/unsupported according to npm. Its final compatible patches improve the current setup but do not restore support. Reviewed the [ESLint 10 migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0): recommended rules, configuration lookup and plugin APIs change. Schedule ESLint 10 with compatible typescript-eslint and React plugins separately.

Other unattempted major migrations: Vite 8 / React plugin 6, Vitest and coverage 5, Tailwind 4, TypeScript 7, jest-dom 7, Node types 26 and globals 17; React Refresh 0.5 is also outside the current range. None was applied or claimed verified. Read their migration notes before implementation.

## Verification

- Fresh npm ci --include=dev succeeds before and after (final install used --no-audit followed by explicit audits). No engine or peer-resolution errors; ESLint's deprecation warning is noted above.
- npm run build passes before and after.
- Baseline npm run test:run: 14 files / 62 tests pass.
- Final npm run test:coverage: 14 files / 62 tests pass with the upgraded V8 provider; overall statement coverage is 26.56%.
- npm run lint still fails with 7 errors and 1 warning. Before/after logs compare byte-for-byte equal: existing Carousel, booking/payment page and messages Edge Function issues.
- npm ls --all and git diff --check pass.
- Full audit: 14 → 7 affected packages. Final production-only audit: zero. This excludes Edge Function imports and does not establish absence of unreported vulnerabilities.

Both test runs used local placeholder configuration to permit Supabase client construction:

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321 \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_placeholder \
npm run test:coverage
```

No production credentials, live service checks or browser visual tests were used. Application source and tests were not changed. Session artifacts retain audit JSON, registry snapshots, install/build/test/lint logs and the resolved dependency tree.

## Other deferrals and follow-up

- React/DOM 19.3.1, their types, and Supabase 2.118.0 are non-security feature updates outside this tooling batch. Their live auth/data behavior was not verified.
- npm marks @clerk/clerk-react unsupported and recommends @clerk/react. Defer the old package's patch alongside planning the [Clerk Core 3 migration](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3), with sign-in/sign-up/session checks.
- Testing Library patches, Autoprefixer, plugin-react, Node types, React lint plugins and further typescript-eslint minors are optional separate work. They were not needed for the selected fixes.
- Resolve and audit Edge Function dependencies in a Deno/Supabase environment before changing their versions.
- Fix the existing lint failures separately.

## Registry survey

Captured during this run. Before/after are exact lockfile versions; wanted is the registry's compatible version under the original declaration. Latest does not imply compatibility.

| Package | Before | After | Wanted | Latest |
| --- | --- | --- | --- | --- |
| @clerk/clerk-react | 5.61.9 | 5.61.9 | 5.61.10 | 5.61.10 |
| @eslint/js | 9.39.1 | 9.39.5 | 9.39.5 | 10.0.1 |
| @supabase/supabase-js | 2.110.3 | 2.110.3 | 2.118.0 | 2.118.0 |
| @testing-library/jest-dom | 6.9.1 | 6.9.1 | 6.9.1 | 7.0.1 |
| @testing-library/react | 16.3.2 | 16.3.2 | 16.3.3 | 16.3.3 |
| @testing-library/user-event | 14.6.1 | 14.6.1 | 14.6.8 | 14.6.8 |
| @types/node | 24.10.1 | 24.10.1 | 24.19.2 | 26.6.5 |
| @types/react | 19.2.6 | 19.2.6 | 19.3.0 | 19.3.0 |
| @types/react-dom | 19.2.3 | 19.2.3 | 19.3.0 | 19.3.0 |
| @vitejs/plugin-react | 5.1.1 | 5.1.1 | 5.2.0 | 6.1.2 |
| @vitest/coverage-v8 | 4.1.11 | 4.1.12 | 4.1.12 | 5.0.5 |
| autoprefixer | 10.4.22 | 10.4.22 | 10.6.1 | 10.6.1 |
| eslint | 9.39.1 | 9.39.5 | 9.39.5 | 10.13.0 |
| eslint-plugin-react-hooks | 7.0.1 | 7.0.1 | 7.1.1 | 7.1.1 |
| eslint-plugin-react-refresh | 0.4.24 | 0.4.24 | 0.4.26 | 0.5.7 |
| globals | 16.5.0 | 16.5.0 | 16.5.0 | 17.13.0 |
| jsdom | 29.1.1 | 29.1.1 | 29.1.1 | 29.1.1 |
| postcss | 8.5.28 | 8.5.30 | 8.5.30 | 8.5.30 |
| react | 19.2.7 | 19.2.7 | 19.3.1 | 19.3.1 |
| react-dom | 19.2.7 | 19.2.7 | 19.3.1 | 19.3.1 |
| tailwindcss | 3.4.18 | 3.4.19 | 3.4.19 | 4.3.3 |
| typescript | 5.9.3 | 5.9.3 | 5.9.3 | 7.0.2 |
| typescript-eslint | 8.47.0 | 8.48.0 | 8.71.2 | 8.71.2 |
| vite | 6.4.3 | 6.4.4 | 6.4.4 | 8.3.4 |
| vitest | 4.1.11 | 4.1.12 | 4.1.12 | 5.0.5 |

React Router DOM remains at 7.18.4, the registry latest observed in this run.

Produced by Air Automations. Name: Dependency Upgrade - Waterbnb / Run: [automation run](https://air.jetbrains.cloud/org/7b050a1a-9f88-a8c5-abd3-29d0c8a05e2d/automations/db10a1b4-ea28-4655-ae03-4b2a31b108c6?run=fd78a227-105b-42ef-96e3-f01098992373)

