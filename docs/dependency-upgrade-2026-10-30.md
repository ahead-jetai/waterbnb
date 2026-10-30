# Dependency review — 2026-10-30

Applied a focused security batch: npm audit fell from eight affected packages (four high, four moderate) to zero. No direct or transitive package crossed a major version. These findings describe the npm dependency graph, not proof of application exploitability or the security of deployed Edge Functions.

## Discovery and policy

- The only npm manifest is [package.json](air-file://3ln71g5lvfdjo3mc987b/workspaces/waterbnb/package.json?type=file&root=%252F), with npm lockfile v3 in [package-lock.json](air-file://3ln71g5lvfdjo3mc987b/workspaces/waterbnb/package-lock.json?type=file&root=%252F). No workspace manifests, Deno config/lockfile, or Renovate/Dependabot config were found.
- Direct declarations use caret ranges, except TypeScript's patch-only `~5.9.3`. The React Refresh plugin's `^0.4.24` stays within 0.4.x. The lockfile records exact resolutions and integrity hashes. Overrides remain empty.
- No separate update policy or package-manager pin was found. README recommends Node 24 LTS and notes the existing Node 22.13 minimum on the Node 22 line. The GitHub workflow invokes Junie rather than providing build/test CI.
- [skills-lock.json](air-file://3ln71g5lvfdjo3mc987b/workspaces/waterbnb/skills-lock.json?type=file&root=%252F) locks agent skill sources/hashes, not application dependencies.
- Edge Functions import `npm:@supabase/supabase-js@2`, `npm:jose@5`, and `npm:stripe@22`. These major-only ranges resolve independently of npm's lockfile. Deno is unavailable here; their resolved/deployed graph was not audited or changed. Consulted the repository [Stripe skill](air-file://3ln71g5lvfdjo3mc987b/workspaces/waterbnb/.agents/skills/stripe-best-practices/SKILL.md?type=file&root=%252F) for the payment dependency boundary.

## Applied changes

| Group | Resolved before → after | Reason |
| --- | --- | --- |
| Build server | Vite 6.4.3 → 6.4.5 | Backported editor integration and filesystem access fixes |
| Test tooling | Vitest, coverage-v8, and seven internal Vitest packages 4.1.11 → 4.1.12 | Harden manual/redirect mocks; keep packages aligned |
| CSS tooling | postcss-selector-parser 6.1.4 → 6.1.5; source-map-js 1.2.1 → 1.2.2 | Selector parsing CPU exhaustion and source-map offset denial of service fixes |
| Test environment | Undici 7.30.0 → 7.30.1, through jsdom | TLS, redirect/cache, integrity validation, and resource exhaustion fixes |
| Lint tooling | Zod 4.1.12 → 4.6.7, through eslint-plugin-react-hooks | Oversized collection validation memory exhaustion fix |

Raised the minimum caret versions for Vite, Vitest, and coverage-v8. Other changes are lockfile-only. Used normal npm resolution and compatible `npm audit fix`, without force or overrides. All application dependencies and code remain unchanged.

## Sources reviewed

- [Vite 6.4.5 changelog](https://github.com/vitejs/vite/blob/v6.4.5/packages/vite/CHANGELOG.md): 6.4.4 updates launch-editor and strengthens transform access checks; 6.4.5 rechecks filesystem permissions after stripping queries.
- [Vitest 4.1.12 release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12): mock hardening backport. Audit identifies [manual mock injection](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) and [Windows redirect traversal](https://github.com/advisories/GHSA-xp26-3454-mjgp).
- [Undici 7.30.1 release](https://github.com/nodejs/undici/releases/tag/v7.30.1): multiple security fixes, including preservation of TLS validation options and safer cross-origin caching.
- [Selector parser advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf): includes the 6.1.5 backport. Ordinary builds processing trusted selectors are not the stated attack scenario.
- [Source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q): patched in 1.2.2.
- [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): patched in 4.6.6; resolved 4.6.7 is on the existing v4 line. Its [release entry](https://github.com/colinhacks/zod/releases/tag/v4.6.7) has only a release commit, not detailed notes.

Release/advisory snapshots and before/after registry evidence are saved in session artifacts.

## Verification

Node 24.13.0 / npm 11.6.2:

- Clean final `npm ci --include=dev`: passes.
- `npm run build`: passes before and after.
- `npm run test:run`: 14 files / 62 tests pass before and after.
- `npm run test:coverage`: 14 files / 62 tests pass with the new provider; 26.56% statement coverage.
- `npm run lint`: existing seven errors and one warning remain; final output is byte-for-byte identical to baseline. Generated coverage files were moved to session artifacts before the final lint comparison.
- Full and production-only npm audit: zero findings after changes. All eight initial affected packages were development dependencies.
- `npm ls --all` passes. No peer/engine errors were reported.
- No live Clerk, database, messaging, or payment integration was exercised.

Tests and coverage use local placeholders:
```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321 \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_placeholder \
npm run test:run
```
Use the same prefix for coverage. No test or application changes were needed.

## Deferred work

- **No majors applied.** Separate migration work is needed for Vite 8 / React plugin 6, Vitest 5 / coverage 5, ESLint 10 / @eslint/js 10, Tailwind 4, TypeScript 7, jest-dom 7, Node types 26, and globals 17. React Refresh 0.5 is also outside its current compatibility range. These migrations were not attempted; review their release notes and compatibility requirements before implementation.
- Non-security updates in the inventory below were left out to keep this security batch small. React 19.3 and Supabase 2.118 in particular merit separate application/integration checks; they were not trialed here.
- npm marks `@clerk/clerk-react` unsupported in favor of `@clerk/react`. Plan its [Core 3 migration](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3) with live authentication checks; the deprecated package's patch alone does not address support status.
- Edge Function latest registry versions observed are jose 6.2.14 and Stripe 23.1.0, beyond the imported majors. Resolve and lock their graph in a Deno/Supabase environment, review migration notes, and test JWT and payment flows before upgrading. No claim of vulnerability clearance applies to these independent imports.
- Fix existing lint issues separately and add CI build/test checks. Coverage is partial and cannot validate live integrations.

## Direct dependency inventory

Registry snapshot from this run. “Wanted” respects the original manifest range. Only the applied rows above changed; all other direct packages retained their original locked versions. Packages absent from this table were not reported outdated.

| Package | Locked before | Wanted | Latest |
| --- | --- | --- | --- |
| @clerk/clerk-react | 5.61.9 | 5.61.11 | 5.61.11 |
| @eslint/js | 9.39.1 | 9.39.5 | 10.0.1 |
| @supabase/supabase-js | 2.110.3 | 2.118.0 | 2.118.0 |
| @testing-library/jest-dom | 6.9.1 | 6.9.1 | 7.0.1 |
| @testing-library/react | 16.3.2 | 16.3.3 | 16.3.3 |
| @testing-library/user-event | 14.6.1 | 14.6.8 | 14.6.8 |
| @types/node | 24.10.1 | 24.19.2 | 26.6.6 |
| @types/react | 19.2.6 | 19.3.0 | 19.3.0 |
| @types/react-dom | 19.2.3 | 19.3.0 | 19.3.0 |
| @vitejs/plugin-react | 5.1.1 | 5.2.0 | 6.1.2 |
| @vitest/coverage-v8 | 4.1.11 | 4.1.12 | 5.0.5 |
| autoprefixer | 10.4.22 | 10.6.2 | 10.6.2 |
| eslint | 9.39.1 | 9.39.5 | 10.14.0 |
| eslint-plugin-react-hooks | 7.0.1 | 7.1.1 | 7.1.1 |
| eslint-plugin-react-refresh | 0.4.24 | 0.4.26 | 0.5.7 |
| globals | 16.5.0 | 16.5.0 | 17.13.0 |
| postcss | 8.5.28 | 8.5.32 | 8.5.32 |
| react | 19.2.7 | 19.3.1 | 19.3.1 |
| react-dom | 19.2.7 | 19.3.1 | 19.3.1 |
| react-router-dom | 7.18.4 | 7.18.5 | 7.18.5 |
| tailwindcss | 3.4.18 | 3.4.19 | 4.3.3 |
| typescript | 5.9.3 | 5.9.3 | 7.0.2 |
| typescript-eslint | 8.47.0 | 8.72.1 | 8.72.1 |
| vite | 6.4.3 | 6.4.5 | 8.3.5 |
| vitest | 4.1.11 | 4.1.12 | 5.0.5 |

Produced by Air Automations. Name: Dependency Upgrade - Waterbnb / Run: [automation run](https://air.jetbrains.cloud/org/7b050a1a-9f88-a8c5-abd3-29d0c8a05e2d/automations/db10a1b4-ea28-4655-ae03-4b2a31b108c6?run=158d9656-07d7-44cd-85a7-dad1b6be0646)
