# Dependency review — 2026-10-02

Applied a security-focused batch within existing version ranges. No direct or existing transitive dependency crossed a major version. npm audit decreased from 21 affected packages (13 high, 6 moderate, 2 low) to zero; production-only audit also reports zero. These are registry findings, not proof that every advisory was exploitable in this application or that unreported vulnerabilities are absent.

## Dependency discovery and policy

- [package.json](air-file://lluhk26uso0um4n0fb9g/workspaces/waterbnb/package.json?type=file&root=%252F) is the only tracked npm manifest; [package-lock.json](air-file://lluhk26uso0um4n0fb9g/workspaces/waterbnb/package-lock.json?type=file&root=%252F) is the only tracked dependency lockfile (npm lockfile v3). No workspace manifests, Deno lockfile, or Deno configuration were found.
- Direct dependencies use caret ranges, allowing compatible minor/patch releases; TypeScript uses `~5.9.3`, allowing patches only. The pre-1.0 React Refresh plugin caret range stays within 0.4.x. The lockfile fixes resolved versions and integrity hashes. No overrides were added.
- No dedicated dependency-update policy, Renovate/Dependabot configuration, or package-manager/runtime pin was found. The existing GitHub workflow invokes Junie, rather than a build/test matrix.
- The Edge Functions [index.ts](air-file://lluhk26uso0um4n0fb9g/workspaces/waterbnb/supabase/functions/messages/index.ts?type=file&root=%252F) and [index.ts](air-file://lluhk26uso0um4n0fb9g/workspaces/waterbnb/supabase/functions/payments/index.ts?type=file&root=%252F) import `npm:@supabase/supabase-js@2`, `npm:jose@5`, and `npm:stripe@22`. These major-only ranges resolve independently of the npm lockfile and are outside this audit. Deno is unavailable in this environment, so their deployed versions and vulnerability status could not be verified. Their imports remain unchanged. Registry latest versions observed: jose 6.2.12 and Stripe 23.0.0; both require separate major-upgrade review.

## Applied groups

| Group | Resolved versions before → after | Reason |
| --- | --- | --- |
| Routing | react-router-dom / react-router 7.10.1 → 7.18.4 | Redirect/URL validation and other security fixes within v7 |
| Build | Vite 6.4.1 → 6.4.3; PostCSS 8.5.6 → 8.5.28 | Filesystem access and CSS/source-map security fixes |
| Tests | Vitest / coverage-v8 / internal Vitest packages 4.1.10 → 4.1.11 | Mock redirect filesystem allowlist fix; keep the test and coverage packages aligned |
| Transitive fixes | Rollup 4.53.2 → 4.64.0; Undici 7.28.0 → 7.30.0; Babel core 7.28.5 → 7.29.7; additional parser/glob/lint dependencies | Remove remaining audit findings using compatible parent ranges |

The five changed direct declarations retain caret ranges, with their minimum versions raised to the verified releases. Remaining fixes are recorded in the lockfile. Used targeted npm installs followed by `npm audit fix`, without `--force` or overrides. React, React DOM, Clerk, Supabase, TypeScript, and the lint configuration remain at their original locked versions.

## Release notes and advisory review

- [Vite 6.4.3 changelog](https://github.com/vitejs/vite/blob/v6.4.3/packages/vite/CHANGELOG.md): 6.4.2 and 6.4.3 backport filesystem checks, sourcemap traversal protection, and Windows alternate/UNC path rejection. See [filesystem bypass advisory](https://github.com/advisories/GHSA-fx2h-pf6j-xcff).
- [Vitest 4.1.11 release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.11): restricts redirect mocks to the filesystem allowlist; [advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
- [React Router v7 release notes](https://github.com/remix-run/react-router/blob/react-router%407.18.4/CHANGELOG.md): reviewed the v7 security notices and 7.18.x fixes. The 7.18.0 CSRF change can affect reverse-proxy server adapters. This application uses client-side BrowserRouter and does not configure those adapters, so that documented server behavior change does not require an application migration here. Client-side redirect validation still matters; see [redirect advisory](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6). Tests exercising MemoryRouter, navigation, and protected routes pass.
- [PostCSS changelog](https://github.com/postcss/postcss/blob/main/CHANGELOG.md): source-map loading restrictions and later regression fixes; the production CSS build passes without enabling unsafe source-map access.
- [Rollup 4.64.0 changelog](https://github.com/rollup/rollup/blob/v4.64.0/CHANGELOG.md) and [file-write advisory](https://github.com/advisories/GHSA-mw96-cpmx-2vgc); [Undici 7.30.0 release](https://github.com/nodejs/undici/releases/tag/v7.30.0) and [TLS validation advisory](https://github.com/advisories/GHSA-w293-vg96-wgc3). Both remain on their existing major lines.

Complete before/after audit JSON, registry inventories, downloaded release notes, dependency tree, and verification logs are retained in session artifacts.

## Verification

Verified on Node 24.13.0 / npm 11.6.2:

- `npm ci --include=dev`: passes before and after; the final install reproduces the updated lockfile without peer/engine errors.
- `npm run build`: passes before and after (TypeScript build plus Vite production bundle).
- `npm run test:run`: 11 files / 48 tests pass before and after when supplied local placeholder Supabase configuration.
- `npm run test:coverage`: 11 files / 48 tests pass with the upgraded V8 provider. Overall statement coverage is 20.39%; this is not full application or live-service coverage.
- `npm run lint`: fails with the same pre-existing 11 errors and one warning. Before/after logs compare byte-for-byte equal. Findings concern Carousel, booking/payment pages, and Edge Function `any` types.
- `npm ls --all`: passes; `git diff --check`: passes. Full and production-only audits: zero findings.

The bare test command initially failed to collect three suites because Supabase variables were absent. Both baseline and final tests were run with these non-production placeholders (no credentials or live services used):

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321 \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_placeholder \
npm run test:run
```

Use the same environment prefix for coverage. No application code or tests were changed to make the upgrades pass.

## Deferred work and manual follow-up

- Major migrations remain out of this batch: Vite 8 / React plugin 6, Vitest 5 / coverage 5, ESLint 10 / @eslint/js 10, Tailwind 4, TypeScript 7, jest-dom 7, Node types 26, globals 17, and the pre-1.0 React Refresh 0.5 transition. Assess release/migration notes, runtime support, and plugin compatibility as separate work before applying them. None was trialed or claimed verified here.
- Non-security updates such as React 19.3, Supabase 2.117.2, lint/tooling minors, and testing-library patches were deliberately left out to keep this batch focused. The complete inventory below makes these deferrals explicit.
- The npm registry marks `@clerk/clerk-react` as unsupported and directs consumers to `@clerk/react`. Its 5.61.10 patch was left out; plan the [Clerk Core 3 migration](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3) with real sign-in/sign-up/session checks. That migration was not validated in this run.
- Resolve and lock Edge Function dependencies in a Deno/Supabase environment, audit the actual resolved graph, and test messaging JWT validation and Stripe payment flows before changing their versions. Live authentication, payment, and database integrations were not exercised.
- Correct the documented Node 18 recommendation: existing Supabase requires Node >=22 and jsdom requires ^22.13 or >=24 on supported current lines. Node 24.13.0 worked here; this mismatch predates the upgrade. Add an explicit supported runtime and CI build/test/lint checks in follow-up work.
- Fix the existing lint failures separately and make offline test configuration explicit for CI.

## Direct dependency survey

Versions below are resolved lockfile versions. “Wanted” and “latest” are npm registry results captured during this run, not a promise that the latest release is compatible. Rows include every direct package npm identified as outdated; other direct packages remain unchanged.

| Package | Before | After | Wanted within original range | Registry latest |
| --- | --- | --- | --- | --- |
| @clerk/clerk-react | 5.61.9 | 5.61.9 | 5.61.10 | 5.61.10 |
| @eslint/js | 9.39.1 | 9.39.1 | 9.39.5 | 10.0.1 |
| @supabase/supabase-js | 2.110.3 | 2.110.3 | 2.117.2 | 2.117.2 |
| @testing-library/jest-dom | 6.9.1 | 6.9.1 | 6.9.1 | 7.0.1 |
| @testing-library/react | 16.3.2 | 16.3.2 | 16.3.3 | 16.3.3 |
| @testing-library/user-event | 14.6.1 | 14.6.1 | 14.6.7 | 14.6.7 |
| @types/node | 24.10.1 | 24.10.1 | 24.19.1 | 26.6.4 |
| @types/react | 19.2.6 | 19.2.6 | 19.3.0 | 19.3.0 |
| @types/react-dom | 19.2.3 | 19.2.3 | 19.3.0 | 19.3.0 |
| @vitejs/plugin-react | 5.1.1 | 5.1.1 | 5.2.0 | 6.1.1 |
| @vitest/coverage-v8 | 4.1.10 | 4.1.11 | 4.1.11 | 5.0.3 |
| autoprefixer | 10.4.22 | 10.4.22 | 10.6.1 | 10.6.1 |
| eslint | 9.39.1 | 9.39.1 | 9.39.5 | 10.11.0 |
| eslint-plugin-react-hooks | 7.0.1 | 7.0.1 | 7.1.1 | 7.1.1 |
| eslint-plugin-react-refresh | 0.4.24 | 0.4.24 | 0.4.26 | 0.5.7 |
| globals | 16.5.0 | 16.5.0 | 16.5.0 | 17.13.0 |
| postcss | 8.5.6 | 8.5.28 | 8.5.28 | 8.5.28 |
| react | 19.2.7 | 19.2.7 | 19.3.0 | 19.3.0 |
| react-dom | 19.2.7 | 19.2.7 | 19.3.0 | 19.3.0 |
| react-router-dom | 7.10.1 | 7.18.4 | 7.18.4 | 7.18.4 |
| tailwindcss | 3.4.18 | 3.4.18 | 3.4.19 | 4.3.3 |
| typescript | 5.9.3 | 5.9.3 | 5.9.3 | 7.0.2 |
| typescript-eslint | 8.47.0 | 8.47.0 | 8.71.0 | 8.71.0 |
| vite | 6.4.1 | 6.4.3 | 6.4.3 | 8.3.2 |
| vitest | 4.1.10 | 4.1.11 | 4.1.11 | 5.0.3 |

Produced by Air Automations. Name: Dependency Upgrade - Waterbnb / Run: [automation run](https://air.jetbrains.cloud/org/7b050a1a-9f88-a8c5-abd3-29d0c8a05e2d/automations/db10a1b4-ea28-4655-ae03-4b2a31b108c6?run=9151ea7b-af4b-4dbf-adbc-b49e6ab8a9d0)
