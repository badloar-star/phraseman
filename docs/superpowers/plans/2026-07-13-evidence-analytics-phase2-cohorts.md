# Evidence Analytics Phase 2: Acquisition, Activation, and True Cohorts

**Implementation status (2026-07-13):** Implemented, verified locally, and
approved by the mandatory final Advisor review. Evidence is recorded in
`docs/reports/evidence-analytics-phase2-2026-07-13.md`.

**Goal:** Add consent-scoped first-touch acquisition, a versioned activation
funnel, and true first-touch retention while preserving the existing
first-observed-window diagnostic.

**Sources of truth:** Firebase Analytics BigQuery
`user_first_touch_timestamp`, normalized aggregate `traffic_source`, governed
onboarding/lesson/session events, and explicit missing-source metadata for store
or ad imports that are not configured.

## Contracts

- `onboarding_complete` is emitted only after granted consent is active and is
  governed as the measurable-onboarding milestone.
- First-touch cohorts include only valid Firebase first-touch timestamps visible
  on consented governed events. They are labelled as app instances, never users
  or store installs.
- Exact and rolling D1/D7/D14/D30 use separate numerators. Immature cohorts are
  excluded from each denominator.
- Active-day buckets are aggregate-only. No app-instance identifier or raw
  acquisition string leaves the query.
- Existing `observedReturn` remains unchanged and honestly labelled.
- Missing aggregate store/ad acquisition sources are reported as unavailable,
  never as zero.

## TDD sequence

1. Add failing fixture tests for exact/rolling retention, maturity, active-day
   buckets, and ordered activation milestones.
2. Add failing governance and SQL/response contract tests.
3. Implement pure cohort semantics and the governed event/metric additions.
4. Extend the aggregate BigQuery query and response mapping.
5. Fix onboarding completion emission ordering after consent and lock it with a
   focused contract test.
6. Run focused root and Functions tests, the analytics contract audit, Functions
   build, and final Advisor review for this phase.

## Acceptance evidence

- Fixture semantics prove exact versus rolling retention and immature-cohort
  exclusion for D1/D7/D14/D30.
- The warehouse contract proves `user_first_touch_timestamp` is used and raw
  attribution strings are not returned.
- The response exposes `acquisition`, `activation`, and `trueRetention` beside
  the preserved `observedReturn`.
- All new governed events pass declared -> called -> warehoused -> measured.
