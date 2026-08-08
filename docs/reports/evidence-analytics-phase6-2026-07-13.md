# Evidence analytics — Phase 6 Monthly Decision Pack

Date: 2026-07-13

## Outcome

The Admin Analytics workspace now has one read-only action that builds and downloads a deterministic aggregate ZIP for a local calendar month. The default period is the last completed month. An explicitly selected current month is marked `preliminary`.

The pack contains the selected month plus a separate aggregate scope over the 12 complete calendar months immediately before it. The baseline never includes the reporting month and is not calculated from rounded monthly display values.

## Safety and decision-grade rules

- `money.read` is required before any source query.
- The callable does not write Firestore, Storage, user state, reports, campaigns, or content.
- Firebase Analytics is queried by exact event timestamps. `_TABLE_SUFFIX` is only a bounded partition selector.
- Calendar dates and cohort days use the requested IANA timezone.
- Revenue uses production RevenueCat webhook rows; client purchase events are never treated as money.
- RevenueCat pagination is capped at 10,000 rows. Reaching the cap produces `truncated_not_decision_grade` rather than a silent partial result.
- RevenueCat `dataThroughMs` is the maximum actually observed event timestamp, while `analysisCutoffMs` and `queryAsOfMs` are separate. The end of the reporting month is never presented as a source watermark.
- The full pack is capped at 50,000 aggregate rows, 12 MiB uncompressed, and 4 MiB compressed.
- Groups with denominator below 10 suppress both counts and dependent rates/averages.
- CSV formula prefixes are neutralized. Forbidden identifier/free-text fields, email-like values, phone-like values, multiline strings, and oversized strings fail pack creation.
- Missing sources are represented as `unavailable`; they are never converted to zero.

## ZIP contract

All runs contain exactly these 18 files:

1. `manifest.json`
2. `metric_dictionary.csv`
3. `executive_kpis.csv`
4. `daily_timeseries.csv`
5. `acquisition_activation.csv`
6. `retention_cohorts.csv`
7. `learning_outcomes.csv`
8. `content_diagnostics.csv`
9. `feature_adoption.csv`
10. `paywall_funnels.csv`
11. `subscriptions_revenue.csv`
12. `experiments.csv`
13. `notifications_referrals.csv`
14. `social_features.csv`
15. `reliability_releases.csv`
16. `feedback_support.csv`
17. `data_quality.csv`
18. `notable_changes.json`

JSON keys, CSV columns, row ordering, ZIP entry ordering, timestamps, permissions, and compression level are fixed so identical aggregate inputs produce identical bytes and SHA-256.

## Current source coverage

- Available when configured: Firebase Analytics daily export and RevenueCat production webhooks.
- Explicitly unavailable until governed aggregate adapters exist: store acquisition/ad spend, notifications/referrals, social features, feedback/support, Crashlytics aggregate exports, and a governed release/campaign change registry.
- Experiment output currently contains exposure evidence only. It does not select a winner and does not claim a causal outcome or server-revenue effect.
- Final store proceeds and aligned ARPU remain unavailable; estimated proceeds retain their financial coverage label.

## Admin behavior

The control is inside the existing Analytics workspace and does not add a top-level navigation item. It provides month and timezone controls, a single primary download action, loading/error states, preliminary and truncation warnings, source watermarks/reasons, archive size/SHA, and a complete file preview.

## Verification evidence

- Functions TypeScript build: passed.
- Functions focused suites: 9 suites, 36 tests passed.
- Root Admin/analytics suites: 5 suites, 13 tests passed.
- Admin JavaScript syntax checks: passed.
- Focused ESLint: no errors; warnings corrected.
- Deterministic ZIP fixture was generated from compiled Functions code, expanded successfully, and verified to contain 18 files, a 12-month baseline, and `raw_events_included=false`.
- No live BigQuery query or production callable was run because this workspace has no configured production warehouse credentials. SQL shape and parameter contracts were verified statically.

## Dependency note

Functions uses `@js-temporal/polyfill` for DST-safe calendar arithmetic and Archiver 7 for deterministic ZIP output. Archiver 8 is ESM-only and is incompatible with the Functions CommonJS/Jest runtime without changing the entire Functions module format. `npm audit --omit=dev` still reports existing transitive Firebase/Google dependency advisories; no advisory is attributed to the new ZIP or Temporal dependencies.
