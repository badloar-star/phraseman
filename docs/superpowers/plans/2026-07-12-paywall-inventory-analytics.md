# Paywall Inventory Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure whether RevenueCat packages were initially ready for each consented paywall impression and expose aggregate readiness diagnostics in Admin v2.

**Architecture:** A pure classifier converts resolved package presence into a finite status and 0/1 flags. The shared purchase hook emits one consent-gated resolution event after its initial load and automatic retry; BigQuery collapses it to one row per impression and returns aggregates only.

**Tech Stack:** React Native/Expo, RevenueCat SDK, Firebase Analytics, BigQuery SQL, Firebase Functions v2, TypeScript/Jest, vanilla Admin v2 JavaScript.

---

### Task 1: Inventory classifier

**Files:**
- Create: `app/paywall_inventory_analytics.ts`
- Test: `tests/paywall_inventory_analytics.test.ts`

- [ ] Write a failing table test for `ready`, `partial_core`, `no_core_packages`, and `load_failed`, including lifetime expected/missing.
- [ ] Run `npx jest --runTestsByPath tests/paywall_inventory_analytics.test.ts --no-cache --runInBand` and confirm the module is missing.
- [ ] Implement `classifyPaywallInventory(packages, options)` returning only finite status, 0/1 package flags, and clamped `load_attempts`.
- [ ] Run the focused test and confirm GREEN.

### Task 2: One initial resolution event per impression

**Files:**
- Modify: `app/paywall_purchase.ts`
- Test: `tests/paywall_purchase_behavior.test.ts`

- [ ] Add a failing source/lifecycle contract requiring `paywall_inventory_resolved`, a per-impression dedupe ref, and no raw error/product/price fields.
- [ ] Run the focused test and confirm RED.
- [ ] Make the load attempt return resolved packages instead of reading React state; emit once after initial load plus automatic retry using `paywallImpressionParams(impression)`.
- [ ] Exclude `DEV_IAP_BYPASS`; do not emit on unmount or manual retry after the first resolution.
- [ ] Run focused Jest and targeted ESLint.

### Task 3: Bounded BigQuery readiness aggregates

**Files:**
- Modify: `functions/src/admin_product_analytics.ts`
- Modify: `functions/src/admin_product_analytics.test.ts`

- [ ] Add failing contracts for the event allowlist, finite parameters, first resolution per impression, coverage denominator, potential default-plan blockage, selected-plan missing, and P50/P90 resolution time.
- [ ] Run the Functions test and confirm RED.
- [ ] Add `inventory_resolution_facts`, `selected_plan_facts`, and `conversion_inventory_rows` without returning impression IDs.
- [ ] Parse `conversion_inventory` rows and merge by safe context/source in the callable response.
- [ ] Run Functions Jest and `npm run build`.

### Task 4: Admin v2 Store/package readiness block

**Files:**
- Modify: `admin/v2/conversion-diagnostics.js`
- Modify: `tests/admin_product_analytics_contract.test.ts`

- [ ] Add a failing contract for a separate readiness table, potential-blocking wording, coverage, status counts, missing plans, and P50/P90.
- [ ] Run the focused Admin test and confirm RED.
- [ ] Render a compact escaped table before the behavioral funnel; do not add columns to the existing wide funnel table.
- [ ] Run Admin Jest, `node --check`, and local smoke.

### Task 5: Integrated verification

**Files:**
- Test: all files above plus protected-file checks.

- [ ] Run focused root Jest, Functions Jest/build, targeted ESLint, Admin syntax check, and local smoke.
- [ ] Confirm zero diff in `components/CleanOnboarding.tsx` and age/legal files.
- [ ] Submit the actual final state to Advisor and require `DECISION: APPROVED`.
