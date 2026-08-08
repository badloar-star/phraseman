# Admin Growth Analytics Design

## Scope

Add three read-only Admin v2 analytics blocks inside the existing Product Analytics area:

1. Learning drop-off: where consented app instances stop lessons and what was observed immediately beforehand.
2. Conversion funnels: how consented app instances move from paywall view to CTA, store attempt, completion, cancellation, failure, close, or continue-free.
3. Retention and return: D1/D7/D30 return rates and activity frequency for consented Firebase app instances.

`CleanOnboarding`, age gate, consent UI, notification prompts, RevenueCat entitlement decisions, and account identity flows are outside scope.

## Data principles

- Optional product analytics is emitted only after explicit analytics consent.
- Firebase Analytics BigQuery export is the event warehouse. No raw analytics stream is added to Firestore.
- Admin reads aggregates through admin-claim Cloud Functions only.
- `user_pseudo_id` is labelled “Firebase app instance”, never “person” or “account”.
- Last observed screen is not app close, uninstall, or a proven cause.
- RevenueCat remains the server truth for money; behavioral purchase events remain a consented sample.
- Queries use date pruning, a byte cap, bounded ranges, caching, schema allowlists, and event deduplication.

## Learning drop-off

Use existing events `lesson_start`, `lesson_answer`, `lesson_abandoned`, `lesson_complete`, and `energy_limit_hit`.

Add `phrase_index` and `total_phrases` to future `lesson_answer` events. Existing `lesson_abandoned` already provides a checkpoint. Do not capture answer text, phrase text, nickname, UID, or free-form content.

Metrics:

- starts, completes, explicit abandons, completion rate;
- attempts, correct/incorrect counts and error rate;
- abandon checkpoint distribution;
- error checkpoint distribution;
- last observed checkpoint before abandon;
- energy-limit interruptions associated only by same analytics app instance and bounded event time;
- data coverage for historical events missing `phrase_index`.

Association is labelled “observed before abandon”, not causal.

## Conversion funnels

Use consent-gated events `paywall_shown`, `paywall_plan_select`, `paywall_cta_click`, `purchase_started`, `purchase_completed`, `trial_started`, `purchase_cancelled`, `purchase_failed`, `paywall_close`, and `paywall_continue_free`.

Dimensions are allowlisted: context, source, plan, paywall variant, platform, app version, study target, and normalized error code. Free-form error messages are mapped to `other`, never returned raw.

Metrics:

- event counts and exact app-instance counts at each stage;
- view→CTA, CTA→start, start→behavioral completion;
- cancellations, failures, closes, and continue-free;
- breakdown by context/source/plan/variant/platform/build;
- failure-code and close-reason breakdown;
- clear disclosure that behavioral completion is not RevenueCat money truth.

No screen→RevenueCat cancellation join is introduced.

## Retention and return

Use `product_session_start`, `product_session_resume`, and screen events. Cohorts are based on the first day an app instance is observed in the queried consented analytics data, unless Firebase `user_first_touch_timestamp` is available and valid. The response declares the cohort definition used.

Metrics:

- eligible cohort sizes and D1/D7/D30 return rates;
- active-day buckets: 1, 2–3, 4–7, 8+;
- p50/p90 time to first return;
- returning versus first-observed app instances;
- retention after first observed lesson and after first observed paywall, shown as separate consented behavioral cohorts;
- immature cohorts excluded from each denominator;
- daily-export freshness and data-quality counters.

## Admin v2 UI

Create focused modules:

- `admin/v2/learning-dropoff.js`
- `admin/v2/conversion-funnels.js`
- `admin/v2/retention-analytics.js`

Keep only mount points, callable bridges, and script includes in `admin/index.html`. Reuse existing filters and card/table patterns. Each block includes loading, empty, error, partial-data, freshness, cohort definition, and accessible table output. No new top-level navigation category is added.

## Verification

- TDD for every pure aggregate and contract.
- Focused Functions build/tests.
- Focused Admin contract tests and `node --check`.
- Local Admin v2 smoke.
- Protected-file diff checks for onboarding/age/legal UI.
- Final advisor review before completion.

