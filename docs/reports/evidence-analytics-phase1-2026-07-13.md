# Evidence Analytics Phase 1 Verification

Date: 2026-07-13

## Scope

Phase 1 adds a governed catalog and read-only coverage audit for the existing
Admin v2 product analytics warehouse. It does not add telemetry, change consent,
write user data, change purchases, or add an Admin screen.

## Implemented evidence

- `app/product_analytics_governance.json` is the machine-readable source for
  governed events, centrally classified safe fields, and metric consumers.
- `app/product_analytics_event_catalog.ts` exposes typed event, field, and metric
  registries to the application. Its public canonical-name tuple is checked
  against the exact warehouse set.
- `lesson_abandon` remains a compatibility alias whose canonical warehouse name
  is `lesson_abandoned`.
- `scripts/analytics-contract-audit.mjs` reads bounded production roots, the
  governance JSON, the delimited BigQuery allowlist, query event parameters, SQL
  row kinds, and the product runtime bridge. It uses synchronous read APIs only.
- The audit fails when a governed event lacks call evidence, a SQL event lacks a
  catalog entry, a catalog product event disappears from SQL, a query parameter
  lacks a safe-field classification, a metric references a missing SQL row kind,
  or a warehouse event has no validated metric consumer.
- `elapsed_ms` is classified as a bounded duration and permitted for lesson
  terminal events. `error` is classified as a normalized enum code; arbitrary
  error text and stack traces are explicitly forbidden.
- `app/analytics.ts` composes its existing public event union with the governed
  canonical type; delivery and consent code are unchanged.
- `package.json` exposes `npm run analytics:contract:audit`.

## Contract result

```json
{
  "declared": 28,
  "called": 28,
  "literalCallSites": 127,
  "warehoused": 28,
  "measured": 28,
  "unknownWarehoused": 0,
  "catalogWarehouseMissingFromSql": 0,
  "declaredWithoutCallSite": 0,
  "warehousedWithoutMetric": 0,
  "unknownWarehouseFields": 0,
  "errors": 0
}
```

The five product runtime events are proven through three linked facts: their
typed union in `product_analytics_contract.ts`, literal `emit(...)` calls in
`product_analytics_runtime.ts`, and the canonical
`trackEvent(event.eventName, ...)` bridge in the root observer. The focused gate
executes the contract, runtime, and root-observer suites covering this path.

The scanner also finds 99 literal call-site event names outside the initial
governed warehouse catalog. They remain an explicit later-phase migration backlog
and warnings. `--strict-all-events` promotes them to errors when the migration is
ready; Phase 1 does not falsely count them as governed.

## Fresh verification

Root focused gate:

```powershell
npx jest --runTestsByPath tests/product_analytics_event_catalog.test.ts tests/analytics_contract_audit.test.ts tests/analytics_consent_subscription.test.ts tests/analytics_funnel_coverage.test.ts tests/admin_product_analytics_contract.test.ts tests/product_analytics_runtime.test.ts tests/product_analytics_contract.test.ts tests/product_analytics_root_observer_contract.test.ts --no-cache --runInBand --modulePathIgnorePatterns '<rootDir>/.worktrees/' '<rootDir>/.claude/worktrees/'
```

Result: exit 0; 8 suites passed, 44 tests passed, 0 failed.

Catalog audit:

```powershell
npm run analytics:contract:audit
```

Result: exit 0; 28 declared, 28 with call evidence, 28 warehoused, 28 with
validated metric consumers, 0 contract errors.

Functions focused test:

```powershell
Set-Location functions
npx jest src/admin_product_analytics.test.ts --runInBand
```

Result: exit 0; 1 suite passed, 7 tests passed, 0 failed.

Functions TypeScript build:

```powershell
Set-Location functions
npm run build
```

Result: exit 0; `tsc` completed without diagnostics.

Mandatory final Advisor re-review: `DECISION: APPROVED` on 2026-07-13 after
inspection of the final files and the verification evidence above.

## Environment notes

The root `@types/jest` installation was found incomplete during verification.
It was restored with `--no-save --package-lock=false --ignore-scripts`; no tracked
package timestamp changed. The dependency now resolves as `@types/jest@29.5.14`.

The default root Jest crawl can report duplicate mocks from other existing
`.worktrees`. Focused verification excludes `.worktrees` and
`.claude/worktrees`; no worktree was deleted or modified.

`package.json` and `package-lock.json` already contain unrelated user changes.
Phase 1 owns only the single `analytics:contract:audit` script entry and must not
stage or overwrite the other package changes independently.

## Next phase prerequisites

- Classify acquisition/onboarding/activation events under the governed catalog.
- Introduce a true first-touch cohort definition without relabelling current
  first-observed-window retention.
- Add metric-level numerator, denominator, entity, coverage, watermark, and
  completeness contracts before adding new Admin cards.
