# Referrals Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live Referral admin section an accessible, mobile-safe dashboard that reports referral Plus purchases and every roulette result accurately.

**Architecture:** Add a read-only, admin-gated dashboard projection in `functions/src/admin_referrals.ts`. It joins referral attributions with server-owned real-purchase status, display names, and the immutable spin receipt whose `creditId` identifies the attribution. `admin/v2/legacy.html` calls that projection and renders summary metrics, filterable human-readable relationships, and prize distribution without changing referral, payment, or award state.

**Tech Stack:** Firebase Functions v2 + Firestore, Firebase Web SDK, single-file HTML/CSS/JavaScript admin, Vitest/Jest contract tests.

---

## File structure

- Modify `functions/src/admin_referrals.ts`: add the read-only dashboard callable and narrow typed serialization for rows, individual spin receipts, and prize distribution.
- Modify `functions/src/index.ts`: export the new callable.
- Modify `admin/v2/legacy.html`: replace the stale referral tab and its final runtime overrides with the responsive dashboard and client-side rendering/filtering.
- Modify `functions/src/admin_referrals.test.ts` (or create it if absent): exercise the pure data-shaping helper rather than Firebase network state.
- Modify `tests/admin_revenue_analytics_contract.test.ts`: preserve the single live admin surface contract and add stable assertions for human-readable purchase/roulette content.

### Task 1: Create a server-owned, read-only referral dashboard projection

**Files:**

- Modify: `functions/src/admin_referrals.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/admin_referrals.test.ts`

- [ ] **Step 1: Write failing unit tests for the dashboard row projection.**

  Cover these fixed cases: a `pending` attribution is rendered as `awaiting_purchase`; a `qualified` row with `qualifiedBy='premium_purchase'` is rendered as `plus_purchased`; an active store plan is required to mark `plusPurchased`; a spin receipt with `creditId === referralCreditId(attributionId)` attaches its prize to that exact invitation; a non-referral or different-credit spin does not attach.

- [ ] **Step 2: Run the focused Functions test and confirm it fails because the projection helper is missing.**

  Run: `npm --prefix functions test -- admin_referrals.test.ts`

- [ ] **Step 3: Add a pure exported/internal-testable projection helper.**

  The helper receives serialized attribution, user progress, resolved display names and spin receipts. It returns only: `referrerStableId`, `referrerName`, `refereeStableId`, `refereeName`, `createdAtMs`, `plusPurchased`, `purchasedAtMs`, `roulette` (`not_spun` or receipt `{ prizeDays, prizeKind, prizePearls, createdAtMs }`). It never treats admin VIP, gifted access, a lesson, or a client-writable field as a purchase.

- [ ] **Step 4: Implement `adminGetReferralDashboard`.**

  Require the existing `assertAdmin`. Accept `limit` and cursor. Fetch referral attributions newest first, fetch both user documents in batches, calculate `plusPurchased` from the same server-owned store predicate as `markRefereeQualified`, and fetch spin receipts by the deterministic referral credit IDs in batches compatible with Firestore `in` limits. Return:

  ```ts
  {
    ok: true,
    rows: ReferralDashboardRow[],
    summary: { totalInvited, plusPurchased, rouletteSpun },
    roulette: { totalSpins, byPrize: Record<string, number> },
    nextCursor: number | null,
  }
  ```

  `roulette.totalSpins` and `byPrize` must count all receipt records, not only the current referral page. Prize percentages remain derived in the client from `totalSpins`, guarded against zero.

- [ ] **Step 5: Export the callable and rerun the focused test.**

  Add `adminGetReferralDashboard` to the existing admin-referral export block in `functions/src/index.ts`. Run the command from Step 2 and expect PASS.

- [ ] **Step 6: Commit the server projection and its test.**

  Commit only the three files in this task with message `feat: add referral admin dashboard data`.

### Task 2: Replace the live referral tab with the responsive dashboard

**Files:**

- Modify: `admin/v2/legacy.html`
- Test: `tests/admin_revenue_analytics_contract.test.ts`

- [ ] **Step 1: Write the failing admin contract assertions.**

  Require the sole live file path, `adminGetReferralDashboard`, labels `Всего приглашено`, `Купили Plus`, `Конверсия в Plus`, `Прокрутили рулетку`, and the non-technical status text `Ожидает покупки`. Assert the obsolete visible phrase `ждём урок` is absent from the final referral renderer.

- [ ] **Step 2: Run the focused contract test and confirm the new assertions fail.**

  Run: `npx jest tests/admin_revenue_analytics_contract.test.ts --runInBand`

- [ ] **Step 3: Replace only the final effective referral tab markup and runtime overrides.**

  Keep all existing controls and the profile-opening/revoke capability. Add a labelled search input and filter controls for all / Plus purchased / awaiting purchase / spun / not spun. Use the shared callable cache pattern already present in the admin script. The refresh action calls `adminGetReferralDashboard`; it must have a loading and retryable error state.

- [ ] **Step 4: Render mobile-safe cards and accessible desktop rows.**

  At wide widths display inviter → invitee, Plus status and roulette status in a table-like grid. At narrow widths switch each record to a card; never truncate a name into a UID, never produce page-wide horizontal scrolling, and preserve 44px targets. Use dark foreground text on every bright-green status treatment.

- [ ] **Step 5: Render roulette analytics from returned aggregate data.**

  Show total spins, the highest-count prize with count and percentage, a compact semantic bar chart, and an accessible table (`prize`, `count`, `share`). If `totalSpins` is zero, show an explicit empty state instead of `0%` as a claimed most-frequent prize.

- [ ] **Step 6: Run the focused contract test and commit the UI/test pair.**

  Run the command from Step 2 and expect PASS. Commit only `admin/v2/legacy.html` and the changed contract test with message `feat: redesign referrals admin dashboard`.

### Task 3: Verify correctness, security boundaries and browser layouts

**Files:**

- Verify: `functions/src/admin_referrals.ts`, `functions/src/index.ts`, `admin/v2/legacy.html`
- Verify: `functions/src/admin_referrals.test.ts`, `tests/admin_revenue_analytics_contract.test.ts`, `tests/admin_single_surface_contract.test.ts`

- [ ] **Step 1: Run focused test gates.**

  Run:

  ```powershell
  npm --prefix functions test -- admin_referrals.test.ts
  npx jest tests/admin_revenue_analytics_contract.test.ts tests/admin_single_surface_contract.test.ts --runInBand
  ```

  Expected: all selected suites pass without source writes.

- [ ] **Step 2: Run read-only static audits.**

  Confirm the final referral renderer contains no user-facing `UID`, `pending`, `qualified`, `rewarded`, `ждём урок`, or `урок пройден` labels; inspect that the only data mutation remaining is the pre-existing separated revoke action. Confirm `adminGetReferralDashboard` calls `assertAdmin` before all reads.

- [ ] **Step 3: Perform browser layout audit at 375, 768, 1024 and 1440 px.**

  Verify no viewport-width overflow, readable labels, visible focus states, clear empty/loading/error states, and that every status includes text in addition to colour. Capture only temporary audit evidence outside tracked source.

- [ ] **Step 4: Inspect the final diff and report deploy readiness.**

  Do not deploy Firebase Functions or Hosting automatically: these are release actions. Report the exact required deployment order (`functions` then `hosting:admin`) and whether all gates pass.

- [ ] **Step 5: Commit any test-only audit correction.**

  If Task 3 requires a source correction, add a narrowly scoped regression test before the correction and commit it with the fix. Otherwise do not create an empty commit.
