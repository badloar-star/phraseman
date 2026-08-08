# Evidence Analytics Phase 2 Verification

Date: 2026-07-13

## Scope

Phase 2 adds consent-scoped Firebase first-touch acquisition, an ordered
activation funnel, exact and rolling first-touch retention, active-day buckets,
quality coverage, and an Admin v2 view. The old first-observed-window return
diagnostic remains available and unchanged in meaning.

## Definitions implemented

- Entity: Firebase app instance, never a person or confirmed store install.
- Cohort anchor: valid `user_first_touch_timestamp` observed on a governed event
  after analytics consent.
- Activation v1: first touch -> onboarding completion -> lesson start -> lesson
  completion -> a session 24-72 hours after first touch -> exact D7 session.
  Downstream milestones count only when all upstream milestones occurred in
  order. Separate sequential CTEs select the earliest valid event after the
  previous milestone, so an earlier invalid event cannot hide a later valid one.
- Exact Dn: session activity on calendar day n after first touch.
- Rolling Dn: session activity on or after calendar day n through the data
  watermark.
- Maturity: each D1/D7/D14/D30 denominator includes only cohorts old enough at
  the warehouse watermark.
- Acquisition channel: normalized aggregate buckets only. Raw source, medium,
  campaign, app-instance identifiers, and event rows are not returned.
- Store and ad imports: explicitly `unavailable_not_configured`; missing values
  are not presented as zero.

## Delivery and privacy evidence

- For the granted path, `onboarding_complete` is emitted after
  `setAnalyticsConsent('granted')` resolves and before `onDone()` exposes the
  app. The denied branch does not invoke the event. The pre-consent gate remains
  closed and no earlier onboarding actions are buffered or replayed.
- Governance now contains 29 events and the new acquisition, activation, and
  first-touch retention metric definitions.
- The coverage audit proves 29 declared, called, warehoused, and measured events
  with zero contract errors.
- Quality output includes valid and invalid/missing first-touch app-instance
  counts and `first_touch_coverage_rate`.

## Admin v2 evidence

- The existing Analytics section renders the ordered activation funnel,
  normalized acquisition channels, exact/rolling D1/D7/D14/D30, cohort rows,
  and first-touch coverage.
- Missing store/ad sources are disclosed in plain language.
- The old observed-window calculation is preserved under a native accessible
  `details` diagnostic with a 44px summary target.
- No new top-level navigation, action button, overlay, color system, or raw
  technical control was added.
- Every cohort label says "app instance with analytics consent" rather than
  calling the entity an install or a person. The copy explicitly states that it
  is neither a unique person nor a store-confirmed install.

## Verification

Root focused gate:

```powershell
npx jest --runTestsByPath tests/product_analytics_event_catalog.test.ts tests/analytics_contract_audit.test.ts tests/analytics_consent_subscription.test.ts tests/analytics_funnel_coverage.test.ts tests/admin_product_analytics_contract.test.ts tests/product_analytics_runtime.test.ts tests/product_analytics_contract.test.ts tests/product_analytics_root_observer_contract.test.ts tests/evidence_acquisition_retention_contract.test.ts tests/onboarding_activation_analytics_contract.test.ts tests/admin_evidence_retention_render.test.ts tests/admin_retention_null_rate.test.ts tests/admin2_detailed_analytics_integration.test.ts --no-cache --runInBand --modulePathIgnorePatterns '<rootDir>/.worktrees/' '<rootDir>/.claude/worktrees/'
```

Result: exit 0; 13 suites passed, 54 tests passed, 0 failed.

Functions focused gate:

```powershell
npx jest src/evidence_cohort_semantics.test.ts src/admin_product_analytics_query_order.test.ts src/admin_product_analytics.test.ts --runInBand
```

Result after Advisor hardening: exit 0; 3 suites passed, 13 tests passed, 0
failed. The added production-query contract verifies the sequential CTE
dependencies, while the fixture covers an invalid early event followed by a
valid later event.

Functions build: `npm run build` -> exit 0, no TypeScript diagnostics.

Analytics audit: `npm run analytics:contract:audit` -> exit 0; declared 29,
called 29, warehoused 29, measured 29, errors 0.

A BigQuery dialect dry run could not be performed locally: no
`ANALYTICS_BIGQUERY_DATASET`, Google application credentials, or `bq` CLI is
configured. SQL structure is therefore verified by the production-query
contract and TypeScript build, but live warehouse parsing remains unverified.

Mandatory final Advisor re-review: `DECISION: APPROVED` on 2026-07-13 after the
sequential-CTE, consent-ordering, entity-label, and production-query contract
hardening described above.

## Remaining boundary

This phase does not claim complete store acquisition because App Store Connect,
Google Play, and approved ad-platform aggregate imports are not configured. It
also does not implement delayed recall/mastery; those belong to Phase 3.
