# Admin Growth Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add learning drop-off, conversion funnel, and retention/return analytics to the existing Admin v2 Product Analytics area.

**Architecture:** Extend the consent-gated Firebase Analytics event contract only with safe lesson checkpoint numbers. Aggregate raw Firebase Analytics export rows in bounded BigQuery SQL behind the existing admin-only callable. Render each domain in a separate Admin v2 JavaScript module while keeping RevenueCat money truth separate.

**Tech Stack:** React Native/Expo, Firebase Analytics, BigQuery SQL, Firebase callable Functions v2, TypeScript/Jest, vanilla Admin v2 JavaScript.

---

### Task 1: Learning checkpoint event contract

**Files:**
- Modify: `app/firebase.ts`
- Modify: `app/lesson1.tsx`
- Test: `tests/lesson_dropoff_analytics_contract.test.ts`

- [ ] Write a failing contract test requiring `logLessonAnswer(lessonId, isCorrect, phraseIndex, totalPhrases)` and a call with `cellIndex` and `50`.
- [ ] Run `npx jest --runTestsByPath tests/lesson_dropoff_analytics_contract.test.ts --no-cache --runInBand` and confirm it fails on the missing checkpoint parameters.
- [ ] Extend only the numeric Firebase event parameters: `lesson_id`, `correct`, `phrase_index`, `total_phrases`.
- [ ] Run the focused test and confirm it passes.

### Task 2: BigQuery learning aggregates

**Files:**
- Modify: `functions/src/admin_product_analytics.ts`
- Modify: `functions/src/admin_product_analytics.test.ts`

- [ ] Add a failing source/response contract for lesson checkpoint rows, incorrect-at-checkpoint rows, coverage counts, and no answer text.
- [ ] Run the focused Functions test and confirm RED.
- [ ] Extend the allowlisted BigQuery extraction with `correct`, `phrase_index`, and `total_phrases`; add grouped `learning_checkpoint` rows.
- [ ] Parse rows into `learningDropoff` containing checkpoint tables and historical-coverage counters only.
- [ ] Run the Functions test and `npm run build`.

### Task 3: Retention aggregates

**Files:**
- Modify: `functions/src/admin_product_analytics.ts`
- Modify: `functions/src/admin_product_analytics.test.ts`

- [ ] Add failing contracts for exact eligible cohort counts, D1/D7/D30, immature-cohort exclusion, active-day buckets, p50/p90 return delay, and declared cohort definition.
- [ ] Run the focused test and confirm RED.
- [ ] Add BigQuery CTEs `retention_daily_activity`, `retention_instances`, `retention_summary`, and `retention_bucket_rows` using exact `COUNT(DISTINCT user_pseudo_id)`.
- [ ] Return only aggregate rows; never return `user_pseudo_id` or event/session IDs.
- [ ] Run focused tests and Functions build.

### Task 4: Behavioral conversion aggregates

**Files:**
- Modify: `functions/src/admin_product_analytics.ts`
- Modify: `functions/src/admin_product_analytics.test.ts`

- [ ] Add failing contracts for the ten allowlisted paywall/purchase stages, stage app-instance counts, conversion rates, context/source/plan/variant breakdowns, normalized failure codes, and close reasons.
- [ ] Run the focused test and confirm RED.
- [ ] Extend the BigQuery event allowlist and parameter extraction without arbitrary property passthrough.
- [ ] Add `conversion_summary`, `conversion_dimension_rows`, `conversion_failure_rows`, and `conversion_close_rows`.
- [ ] Return a disclosure code `behavioral_purchase_is_not_revenuecat_truth`.
- [ ] Run focused tests and Functions build.

### Task 5: Admin v2 learning UI

**Files:**
- Create: `admin/v2/learning-dropoff.js`
- Modify: `admin/v2/product-analytics.js`
- Modify: `admin/index.html`
- Test: `tests/admin_growth_analytics_contract.test.ts`

- [ ] Add failing Admin contracts for the mount point, one script include, callable-only data flow, checkpoint/error/coverage tables, and non-causal wording.
- [ ] Run the test and confirm RED.
- [ ] Add the mount point inside Product Analytics and render learning aggregates with escaped values, loading/empty/partial states, and accessible tables.
- [ ] Run the contract test and `node --check admin/v2/learning-dropoff.js`.

### Task 6: Admin v2 retention UI

**Files:**
- Create: `admin/v2/retention-analytics.js`
- Modify: `admin/v2/product-analytics.js`
- Modify: `admin/index.html`
- Test: `tests/admin_growth_analytics_contract.test.ts`

- [ ] Add failing contracts for D1/D7/D30, denominator eligibility, active-day buckets, cohort definition, freshness, and “app instances” wording.
- [ ] Run the test and confirm RED.
- [ ] Render cards and tables without calling app instances users or people.
- [ ] Run the contract test and JavaScript syntax check.

### Task 7: Admin v2 conversion UI

**Files:**
- Create: `admin/v2/conversion-funnels.js`
- Modify: `admin/v2/product-analytics.js`
- Modify: `admin/index.html`
- Test: `tests/admin_growth_analytics_contract.test.ts`

- [ ] Add failing contracts for stage counts/rates, breakdowns, failure/close tables, and RevenueCat truth disclosure.
- [ ] Run the test and confirm RED.
- [ ] Render the funnel and accessible tables using the existing Product Analytics response.
- [ ] Run the contract test and JavaScript syntax check.

### Task 8: Integrated verification

**Files:**
- Modify: `scripts/admin-v2-smoke.mjs`
- Test: `tests/admin_v2_smoke_current_contract.test.ts`

- [ ] Add the three modules and mount points to the local read-only smoke allowlist.
- [ ] Run all focused root and Functions tests.
- [ ] Run `npm run build` in `functions`.
- [ ] Run `node scripts/admin-v2-smoke.mjs` and all four `node --check` commands.
- [ ] Run protected-file diff checks and confirm no onboarding, age-gate, legal, or RevenueCat entitlement changes.
- [ ] Submit the final evidence packet to the advisor and require `DECISION: APPROVED`.

### Task 9: Per-attempt lesson analytics identity

**Files:**
- Create: `app/lesson_analytics_attempt.ts`
- Modify: `app/firebase.ts`
- Modify: `app/lesson1.tsx`
- Test: `tests/lesson_analytics_attempt.test.ts`
- Test: `tests/lesson_dropoff_analytics_contract.test.ts`

- [ ] Write a failing unit test requiring `createLessonAnalyticsAttempt()` to return a non-empty UUID, stable start time, and terminal-once guard.
- [ ] Run the focused tests and confirm RED on the missing module and parameters.
- [ ] Implement a memory-only attempt object; never persist it or include user content.
- [ ] Add `lesson_attempt_id`, `total_phrases`, and elapsed time to start/answer/abandon/complete events while preserving the existing lesson UI and navigation.
- [ ] Run the focused tests and confirm GREEN.

### Task 10: Per-impression paywall analytics identity

**Files:**
- Create: `app/paywall_analytics_impression.ts`
- Modify: `app/paywall_a.tsx`
- Modify: `app/paywall_b.tsx`
- Modify: `app/paywall_c.tsx`
- Modify: `app/paywall_purchase.ts`
- Test: `tests/paywall_analytics_impression.test.ts`
- Test: `tests/paywall_purchase_behavior.test.ts`

- [ ] Write a failing unit test requiring one random ID and stable start time per mounted paywall.
- [ ] Run the focused tests and confirm RED.
- [ ] Create the impression once per paywall mount and pass it into the existing purchase hook.
- [ ] Attach `paywall_impression_id` and `time_since_impression_ms` to canonical shown, CTA, store-start, completed, cancelled, failed, close, and exit-offer events.
- [ ] Run focused tests and confirm GREEN; do not change any paywall visual or onboarding behavior.

### Task 11: Attempt/impression-aware aggregate quality

**Files:**
- Modify: `functions/src/admin_product_analytics.ts`
- Modify: `functions/src/admin_product_analytics.test.ts`
- Modify: `admin/v2/learning-diagnostics.js`
- Modify: `admin/v2/conversion-diagnostics.js`

- [ ] Write failing contracts for distinct lesson attempts, distinct paywall impressions, missing-ID coverage, and P50/P90 time-to-CTA/result.
- [ ] Run the Functions test and confirm RED.
- [ ] Extend the existing bounded BigQuery scan with the two random IDs and elapsed parameters, returning aggregate counts only.
- [ ] Render attempt/impression coverage and timing without returning raw IDs.
- [ ] Run Functions build, focused Jest, Admin syntax checks, and local smoke.
