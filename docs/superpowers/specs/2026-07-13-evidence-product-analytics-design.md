# Phraseman Evidence Product Analytics Design

## Status

Approved by the product owner on 2026-07-13. This document expands the approved
analytics direction into an implementation contract. It does not authorize
pre-consent behavioral tracking, raw PII exports, or replacing RevenueCat/store
financial truth with client-side events.

## Objective

Build a decision system that connects:

`release or experiment -> behavior -> learning outcome -> retention -> money -> reliability`

The system must separate observation, diagnostic hypothesis, and causally
supported decisions. No dashboard or export may describe correlation as proof.

## Delivery phases

The objective spans independent systems and is delivered as testable vertical
slices:

1. Analytics contract and delivery coverage.
2. Acquisition, activation, and true retention cohorts.
3. Learning outcomes, delayed recall, and mastery.
4. Server-confirmed revenue, renewal cohorts, and LTV.
5. Experiment exposure, release health, and reliability.
6. Monthly Decision Pack export and Admin v2 workflow.

Each phase may ship independently, but the goal is complete only after all six
phases pass their focused and end-to-end gates.

## Sources of truth

| Domain | Authoritative source | Prohibited interpretation |
|---|---|---|
| Consented product behavior | Firebase Analytics BigQuery export | Not all users or all accounts |
| Purchase lifecycle and entitlement | RevenueCat webhooks and current server access state | Client `purchase_completed` is not money truth |
| Store revenue and acquisition | App Store Connect, Google Play Console, and approved ad-platform aggregate imports | Firebase alone is not complete spend/download truth |
| Learning content | Versioned content registry and consented learning events | Never export answer or phrase text |
| Reliability | Crashlytics/app-health aggregates and release metadata | Missing error events do not prove health |
| Feedback | Aggregated reports, cancellation surveys, and idea categories | Never include free-form text in the monthly pack |

## Privacy and identity

- Optional analytics is emitted only after explicit analytics consent.
- No pre-consent actions are buffered or replayed.
- The event allowlist excludes names, email, UID, stable ID, answer text, phrase
  text, chat text, report text, and arbitrary error messages.
- Analytics entities are labelled explicitly as `app_instance`, `account`,
  `session`, `attempt`, `impression`, or `event`.
- Cross-source joins use server-controlled pseudonymous join keys only where the
  source, consent, retention policy, and purpose permit it.
- Monthly exports contain aggregates. Small cells are suppressed using a named
  threshold recorded in the manifest.

## Common event envelope

All governed product events use a versioned allowlist with:

- `schema_version`;
- `event_id`;
- `event_name`;
- `occurred_at_ms`;
- `session_id` when the event belongs to a session;
- `attempt_id` or `impression_id` when applicable;
- `platform`, `app_version`, and `build_number`;
- `study_target` and UI language;
- `content_id` and `content_version` when applicable;
- normalized `context` and `source` values;
- entitlement state;
- experiment assignment and actual exposure when applicable.

Free-form caller objects must never be spread into the warehouse payload.

## Contract coverage chain

The repository must automatically compare four layers:

1. **Declared:** the event is present in the governed event catalog.
2. **Called:** at least one production call site emits it.
3. **Warehoused:** a BigQuery query or governed raw-event contract accepts it.
4. **Measured:** at least one named metric consumes it, or the catalog marks it
   intentionally telemetry-only.

The gate fails on unknown called events, warehouse events missing from the
catalog, conflicting names, duplicate metric IDs, or undeclared aliases. The
known `lesson_abandon` / `lesson_abandoned` drift must be resolved through a
documented canonical name and compatibility alias, not silent deletion.

## Metric contract

Every exported metric row includes:

- stable `metric_id` and `metric_version`;
- calendar period and timezone;
- entity type;
- numerator and denominator where applicable;
- value/rate and sample size;
- confidence interval when statistically meaningful;
- source and consent coverage statement;
- data watermark;
- completeness/truncation state;
- `preliminary` or `final` status;
- release, experiment, content, and cohort dimensions when applicable.

Definitions are immutable by version. A changed formula creates a new metric
version and is recorded in the export manifest.

## Acquisition and activation

Acquisition combines consented first-touch behavior with aggregate store and ad
imports. The system must not infer missing spend or downloads as zero.

The activation funnel is:

`first touch -> measurable onboarding -> first learning action -> first completed learning block -> return within 72 hours -> D7 return`

Activation milestones are versioned and recorded once per app instance/account
for each definition version.

## Retention cohorts

Current Admin v2 retention is `first_observed_consented_product_session_in_selected_window`
for Firebase app instances. It remains visible and honestly labelled.

The new model adds cohorts based on:

- Firebase `user_first_touch_timestamp` when valid;
- approved store/install attribution where available;
- first activation;
- first completed lesson;
- first delayed successful review;
- first server-confirmed purchase.

It reports exact-day and rolling D1/D7/D14/D30 retention, eligible cohort size,
and active-day buckets. Immature cohorts are excluded from denominators.

## Learning outcomes

The future North Star is **Weekly Effective Learners**: learners who perform a
meaningful learning activity on at least two days and demonstrate delayed recall
of previously seen material under the current definition version.

Learning events use IDs and categories only. Required outcome fields include:

- content/item/skill ID and version;
- activity and exercise type;
- checkpoint/position;
- first-attempt flag and correctness;
- bounded response time;
- hint, audio, or translation usage flags;
- mastery state before and after;
- review due interval and actual delay bucket;
- completion or normalized abandonment reason.

The system reports first-attempt accuracy, delayed recall at 1/7/30-day buckets,
review completion, mastery transitions, and content diagnostics. It never exports
answer or lesson text.

## Money and LTV

RevenueCat lifecycle events remain the server truth for purchase state. A new
financial aggregate layer records the source currency and distinguishes gross
revenue, estimated proceeds, and final store proceeds. Taxes, fees, refunds, and
currency conversion assumptions must be explicit.

Required metrics include trial-to-paid, renewal M1/M2/M3, churn, refund rate,
ARPU, ARPPU, and cohort LTV at 30/60/90 days. Behavioral paywall conversion is
reported separately from server-confirmed financial conversion.

## Experiments and releases

An experiment is analyzable only when it has:

- immutable experiment ID and variant assignment;
- a separate actual exposure event;
- control group;
- primary metric and guardrails defined before launch;
- start/end dates, audience, sample size, and stop rule;
- release/config revisions included in outcome rows.

Release health includes version adoption, crash-free users/sessions, ANR/error
rate, startup and critical-screen latency, and normalized API/audio/content-load
failures. Rollout decisions must not use behavior alone when health regresses.

## Monthly Decision Pack

The default export window is the last completed calendar month in the selected
reporting timezone. A current-month export is allowed only with
`status: preliminary`. A rolling 28-day window is never labelled a calendar
month.

The pack is a ZIP containing:

```text
manifest.json
metric_dictionary.csv
executive_kpis.csv
daily_timeseries.csv
acquisition_activation.csv
retention_cohorts.csv
learning_outcomes.csv
content_diagnostics.csv
feature_adoption.csv
paywall_funnels.csv
subscriptions_revenue.csv
experiments.csv
notifications_referrals.csv
social_features.csv
reliability_releases.csv
feedback_support.csv
data_quality.csv
notable_changes.json
```

The export includes the completed month plus a 12-month aggregate baseline. It
contains no raw event rows or free-form user content. `manifest.json` records
definitions, source watermarks, missing sources, consent coverage, suppression,
truncation, schema changes, releases, campaigns, and experiments.

## Admin v2 experience

The export lives inside the existing Analytics area. It adds no new top-level
category. The screen has one primary action, clearly labelled period and timezone
controls, loading/empty/error/partial states, an accessible file list preview,
and an explanation of what is and is not proven by the data.

Generation is read-only with respect to user state. It must not alter progress,
subscriptions, reports, campaigns, or content. Admin access requires the existing
analytics/money read permission or a narrower future analytics export permission.

## Completion evidence

The full goal is complete only when:

- all six delivery phases are implemented;
- focused app, Functions, and Admin tests pass;
- Functions TypeScript builds;
- the event coverage gate passes against current source;
- a fixture export is deterministic, schema-valid, PII-free, and calendar-correct;
- runtime/admin smoke verifies loading, preview, download, and failure states;
- protected auth, account deletion, purchase, and existing analytics behaviors
  remain intact;
- an Advisor reviews the final diff, artifacts, and verification evidence and
  returns `DECISION: APPROVED`.

