# Referral Purchase Qualification Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically qualify paid referral attributions from verified RevenueCat writes and repair historical paid `pending` rows through the admin dashboard.

**Architecture:** Route both new and replayed verified Premium outcomes through the existing transactional referral qualifier. Add a bounded admin-dashboard reconciliation pass and remove the unused broad user trigger.

**Tech Stack:** TypeScript, Firebase Cloud Functions v2, Firestore transactions, Jest.

---

### Task 1: Lock the RevenueCat qualification contract

**Files:**
- Modify: `functions/src/revenuecat_shards.test.ts`
- Modify: `tests/firebase_cost_controls_contract.test.ts`

- [ ] Add tests requiring verified applied and duplicate outcomes with a canonical UID to call the referral qualifier, while missing-owner outcomes remain no-ops.
- [ ] Add a source contract that keeps the broad `users/{id}` trigger retired and requires the RevenueCat seam.
- [ ] Run `npm test -- --runInBand src/revenuecat_shards.test.ts` from `functions/` and confirm the new test fails before implementation.

### Task 2: Wire verified RevenueCat outcomes

**Files:**
- Modify: `functions/src/revenuecat_shards.ts`
- Modify: `functions/src/referral.ts`

- [ ] Import `markRefereeQualified` into the RevenueCat module.
- [ ] Add a small testable dispatcher that accepts an outcome UID and delegates to the transactional qualifier.
- [ ] Preserve the processed receipt UID on duplicate delivery and invoke the dispatcher after Premium and transfer transactions commit.
- [ ] Remove the dead `referralOnUserProgressUpdated` definition and its unused Firebase Functions namespace import.
- [ ] Re-run the focused RevenueCat and referral tests and confirm they pass.

### Task 3: Repair historical pending rows on dashboard load

**Files:**
- Modify: `functions/src/admin_referrals.test.ts`
- Modify: `functions/src/admin_referrals.ts`

- [ ] Add failing tests for a maximum 100-row pending query, active-store prefiltering, and best-effort error reporting.
- [ ] Implement `reconcilePendingReferralPurchases` using current user projections and `markRefereeQualified`.
- [ ] Invoke it from `adminGetReferralDashboard` and include a small reconciliation diagnostic in the response.
- [ ] Run the focused admin referral tests and confirm they pass.

### Task 4: Verify the complete change

**Files:**
- Verify only: all modified source and tests.

- [ ] Run focused Jest tests for RevenueCat, referrals, admin referrals, and Firebase cost controls.
- [ ] Run `npm run build` from `functions/`.
- [ ] Inspect `git diff` and confirm no production deployment, unrelated source edit, secret, branch, or worktree change occurred.
