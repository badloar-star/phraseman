# Task packet: cold-start storage reads (mistake_practice) and inlineRequires in the bundler config

Governance-ID: TG-71A0DE8CE00D
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-03)
Related epic/enabler: PM-216 / PM-220, E21 performance; Performance Bible (instant first frame, constant background)

## Outcome

1. The key mistake_practice_v#::en::owner is read ~24 times during a cold start on a weak profile (Design session measurement, store release). Reads are collapsed (one in-flight read shared, memory copy kept in sync with writes) so the count drops without changing what any screen sees.
2. inlineRequires: true in the bundler transform options (not asyncRoutes). Modules whose import-time side effects matter (registrations, polyfills, i18n, firebase/crash/analytics init) stay early through explicit imports in the root layout. Full type check and test run before and after; if anything is worse or broken, one revert commit.

## Scope

In scope: the storage accessor(s) for mistake_practice and its call sites on the start path; the bundler config transform options; explicit early imports for side-effect modules; tests; INBOX report.
Out of scope: asyncRoutes, factory_native/ (Codex is editing), Account V2 zone (auth_provider.ts, cloud_sync.ts, account_authority*), design-session screens, deploy.

## Architecture

(1) A per-key in-flight dedupe plus a write-through memory value in the existing accessor, so concurrent callers share one AsyncStorage read; the account-generation guard stays authoritative. (2) inlineRequires moves the require() of each imported binding to its first use; side-effect-only imports are left in place by the transform, but modules that register things as a by-product of being imported by a consumer must be listed and made explicit.

## Security and privacy

No new data, no new permissions. inlineRequires changes evaluation order only; firebase/crash/analytics initialisation must remain at start (explicit imports), so no loss of crash reporting.

## Technical debt

- Pay now: duplicated reads of one key; eager evaluation of the whole app on cold start.
- Contain: inlineRequires is a global change — rollback is one commit; verification includes the PM-212 side-effect probe and a store-release build.

## Verification

Type check clean for touched files; full test run compared with the clean-HEAD baseline (5 known red suites + pm212 probe); new tests for read dedupe; static list of import-time side-effect modules and which are pinned early; store-release build and device measurement by the Design session ([HOME-PAINT], [COLD-START-IO]) before/after.

## Rollback

git revert the config commit (and the accessor commit separately).
