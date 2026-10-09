# Dependency review — 2026-10-09

Applied a small build/lint maintenance batch. Full npm audit decreased from 14 affected packages (12 high, 2 moderate) to 7 (5 high, 2 moderate). The final production-only audit reports zero. No direct or existing transitive dependency crossed a major version.

## Discovery and policy

- [package.json](air-file://7si272m6bt47m7vrdrqh/workspaces/waterbnb/package.json?type=file&root=%252F) and [package-lock.json](air-file://7si272m6bt47m7vrdrqh/workspaces/waterbnb/package-lock.json?type=file&root=%252F) define the npm graph; the lockfile is version 3. All direct requirements use caret ranges except TypeScript's patch-only `~5.9.3`. The pre-1.0 React Refresh range stays on 0.4.x. Preserve these ranges and use `npm ci --include=dev` to reproduce the verified graph. No overrides were added.
- [skills-lock.json](air-file://7si272m6bt47m7vrdrqh/workspaces/waterbnb/skills-lock.json?type=file&root=%252F) records agent skill provenance, not npm application dependencies. No additional tracked package manifests, Deno lock/config files, Renovate/Dependabot configuration, or explicit dependency update policy were found. There is no package-manager/runtime version pin. [README.md](air-file://7si272m6bt47m7vrdrqh/workspaces/waterbnb/README.md?type=file&root=%252F) now recommends Node 24 LTS and documents the existing Node 22.13 minimum.
- Edge Functions import Supabase JS @2, jose @5, and Stripe @22 directly via Deno npm specifiers. These major-only ranges resolve separately from the frontend lockfile. Deno is unavailable here, so deployed resolutions and their audit status remain unverified. No payment or Edge Function integration changes were made.

## Applied upgrades

| Group | Resolved before → after | Reason |
| --- | --- | --- |
| Build server | Vite 6.4.3 → 6.4.4 | Resolved-module access checks, safe module path handling, HTML transform query fix |
| CSS tooling | PostCSS 8.5.28 → 8.5.29 | Style-tag escaping, comment/list parsing and custom-property fixes |
| Lint tooling | typescript-eslint and its aligned internal packages 8.47.0 → 8.48.1 | Removes the fast-glob dependency path from TypeScript ESTree; avoids the much larger 8.71 update |
| Transitive security fix | source-map-js 1.2.1 → 1.2.2 | Fixes indexed-source-map offset denial of service |
| Compatible lint transitives | eslint-utils 4.9.0 → 4.10.1; ignore 7.0.5 → 7.0.12; semver 7.7.3 → 7.8.5; ts-api-utils 2.1.0 → 2.5.0 | Resolved within parent ranges alongside the lint group |

The three direct declarations raise their minimum versions while retaining caret ranges. Runtime application packages and source code are unchanged.

## Release notes and advisories reviewed

- [Vite 6.4.4 changelog](https://github.com/vitejs/vite/blob/v6.4.4/packages/vite/CHANGELOG.md) documents the server access checks and transform fixes.
- [PostCSS changelog](https://github.com/postcss/postcss/blob/main/CHANGELOG.md) documents 8.5.29's parsing and escaping fixes.
- [TypeScript ESTree 8.48.1 changelog](https://github.com/typescript-eslint/typescript-eslint/blob/v8.48.1/packages/typescript-estree/CHANGELOG.md) describes the 8.48.0 switch from fast-glob to tinyglobby and AST handling changes. Existing ESLint 9 and TypeScript 5.9 satisfy peer requirements; baseline/final lint output is identical.
- [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q): patched at 1.2.2, now resolved throughout the npm graph.
- Remaining findings stem from [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [selector-parser quadratic parsing](https://github.com/advisories/GHSA-rj75-hqrm-r3gf). Seven affected package entries represent two underlying advisories, not seven independent vulnerabilities.

## Remaining security work and major upgrades

Tailwind 3 retains braces 3.0.3 and selector-parser 6.1.4 through its watcher, globbing and CSS dependencies. The non-forced audit-fix dry run only proposes Tailwind 3.4.19 and still reports the same seven findings. No forced fix or cross-major override was applied.

Reviewed the [Tailwind v4 migration guide](https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/upgrade-guide.mdx). It requires a separate PostCSS plugin or Vite integration, CSS/configuration migration, review of changed utilities/default styling, and newer browser support. Defer Tailwind 4.3.3 until browser requirements and visual regression checks can be verified. Tailwind 3.4.19 was also deferred because it does not clear these advisories. Treat untrusted CSS, selectors and glob patterns as a concern for build tooling; the selector advisory explicitly distinguishes ordinary builds on trusted sources from request-time parsing of untrusted selectors. This run did not prove exploitability or absence of other vulnerabilities.

Other majors were inventoried, not attempted: Vite 8 / React plugin 6, Vitest and coverage 5, ESLint and @eslint/js 10, jest-dom 7, Node types 26, globals 17, TypeScript 7, and the pre-1.0 React Refresh 0.5 transition. Each needs its own release-note and compatibility review before implementation.

The npm registry deprecates @clerk/clerk-react in favor of @clerk/react. Defer its patch and the [Clerk Core 3 migration](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3) to work with real sign-in/session verification. React/Supabase feature releases and other unrelated tool/testing patches remain listed below for subsequent batches; no live authentication, database, messaging, payment or browser checks were performed.

Manual follow-up: migrate Tailwind with visual/browser checks; resolve and audit Edge Function dependencies in a Deno/Supabase environment; address existing lint findings; consider runtime pins and CI build/test/lint checks.

## Verification

On Node 24.13.0 / npm 11.6.2:

- Baseline and final `npm ci --include=dev`: passed.
- Baseline and final `npm run build`: passed; generated JS/CSS filenames and sizes are unchanged.
- Baseline and final `npm run test:run`: 14 files / 62 tests passed.
- Baseline and final `npm run lint`: both fail with the same 7 errors and 1 warning; full logs compare byte-for-byte equal. Findings affect Carousel, booking/guest/payment pages, and the messaging Edge Function.
- Final `npm ls --all` and `git diff --check`: passed.
- Full audit: 14 → 7 affected packages. Final production audit: zero. Audits cover npm's known advisories, not the separately resolved Edge Functions.

Tests used inert local Supabase values, without live credentials:

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321 \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_placeholder \
npm run test:run
```

Before/after audit data, outdated inventory, release/advisory source snapshots and verification logs are saved in session artifacts.

## Direct outdated inventory

Registry snapshot for this run. “Wanted” is within the original manifest range. Packages not listed were not reported outdated.

| Package | Before | After | Wanted | Latest |
| --- | --- | --- | --- | --- |
| @clerk/clerk-react | 5.61.9 | 5.61.9 | 5.61.10 | 5.61.10 |
| @eslint/js | 9.39.1 | 9.39.1 | 9.39.5 | 10.0.1 |
| @supabase/supabase-js | 2.110.3 | 2.110.3 | 2.117.3 | 2.117.3 |
| @testing-library/jest-dom | 6.9.1 | 6.9.1 | 6.9.1 | 7.0.1 |
| @testing-library/react | 16.3.2 | 16.3.2 | 16.3.3 | 16.3.3 |
| @testing-library/user-event | 14.6.1 | 14.6.1 | 14.6.7 | 14.6.7 |
| @types/node | 24.10.1 | 24.10.1 | 24.19.2 | 26.6.5 |
| @types/react | 19.2.6 | 19.2.6 | 19.3.0 | 19.3.0 |
| @types/react-dom | 19.2.3 | 19.2.3 | 19.3.0 | 19.3.0 |
| @vitejs/plugin-react | 5.1.1 | 5.1.1 | 5.2.0 | 6.1.2 |
| @vitest/coverage-v8 | 4.1.11 | 4.1.11 | 4.1.11 | 5.0.3 |
| autoprefixer | 10.4.22 | 10.4.22 | 10.6.1 | 10.6.1 |
| eslint | 9.39.1 | 9.39.1 | 9.39.5 | 10.12.0 |
| eslint-plugin-react-hooks | 7.0.1 | 7.0.1 | 7.1.1 | 7.1.1 |
| eslint-plugin-react-refresh | 0.4.24 | 0.4.24 | 0.4.26 | 0.5.7 |
| globals | 16.5.0 | 16.5.0 | 16.5.0 | 17.13.0 |
| postcss | 8.5.28 | 8.5.29 | 8.5.29 | 8.5.29 |
| react | 19.2.7 | 19.2.7 | 19.3.0 | 19.3.0 |
| react-dom | 19.2.7 | 19.2.7 | 19.3.0 | 19.3.0 |
| tailwindcss | 3.4.18 | 3.4.18 | 3.4.19 | 4.3.3 |
| typescript | 5.9.3 | 5.9.3 | 5.9.3 | 7.0.2 |
| typescript-eslint | 8.47.0 | 8.48.1 | 8.71.1 | 8.71.1 |
| vite | 6.4.3 | 6.4.4 | 6.4.4 | 8.3.4 |
| vitest | 4.1.11 | 4.1.11 | 4.1.11 | 5.0.3 |

Produced by Air Automations. Name: Dependency Upgrade - Waterbnb / Run: [automation run](https://air.jetbrains.cloud/org/7b050a1a-9f88-a8c5-abd3-29d0c8a05e2d/automations/db10a1b4-ea28-4655-ae03-4b2a31b108c6?run=655a6b40-f52f-4e06-9bc1-77f892a82eff)
