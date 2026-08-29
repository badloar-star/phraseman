# Voice Minute Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unused MAX subscription with verified, non-expiring paid AI-teacher minute packs.

**Architecture:** The server owns immutable external purchase and call-charge events in a dedicated voice-minute journal. A transactional wallet projection reserves and settles paid seconds. The client treats RevenueCat purchase completion as pending until the server verifies and credits the matching product.

**Tech Stack:** React Native/Expo, RevenueCat, Firebase Functions v2, Firestore transactions and rules, Jest, TypeScript.

---

### Task 1: Define the immutable minute-pack domain and its RED tests

**Files:**
- Create: `functions/src/voice_minutes.ts`
- Create: `functions/src/voice_minutes.test.ts`
- Modify: `functions/src/max_voice_mint.ts`

- [ ] **Step 1: Write failing unit tests for the immutable event reducer.**

  Cover the exact `phraseman_voice_minutes_30`, `phraseman_voice_minutes_120`, and `phraseman_voice_minutes_300` product allowlist; unknown products; identical purchase-event retry; same source id with a different payload; refund reversal; and a paid call charge with the same `sessionId` retried twice.

- [ ] **Step 2: Run the unit test to verify RED.**

  Run: `Push-Location functions; npx jest --runInBand --no-cache src/voice_minutes.test.ts; Pop-Location`

  Expected: the test fails because `voice_minutes.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure domain module.**

  Export a product-to-seconds catalogue, immutable event validation, source-id fingerprint validation, event-to-balance reduction, and the explicit `trial | legacy_max | paid_minutes | admin` access type. Reject any product not in the fixed allowlist.

- [ ] **Step 4: Re-run the unit test to verify GREEN.**

  Run: `Push-Location functions; npx jest --runInBand --no-cache src/voice_minutes.test.ts; Pop-Location`

  Expected: all reducer and idempotency cases pass.

### Task 2: Persist verified purchase, refund, reservation, and charge events

**Files:**
- Modify: `functions/src/revenuecat_shards.ts`
- Modify: `functions/src/max_voice_mint.ts`
- Modify: `functions/src/max_voice_session_end.ts`
- Modify: `functions/src/max_voice_watchdog.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/revenuecat_shards.test.ts`
- Test: `functions/src/max_voice_mint.test.ts`
- Test: `functions/src/max_voice_session_end.test.ts`
- Test: `functions/src/max_voice_watchdog.test.ts`

- [ ] **Step 1: Write failing webhook tests.**

  Assert that a production one-time minute purchase writes exactly one server-only grant event and a wallet projection; repeated delivery writes no second grant; a refund appends one reversal; and an unknown product remains ignored without affecting Premium.

- [ ] **Step 2: Run the focused webhook test to verify RED.**

  Run: `Push-Location functions; npx jest --runInBand --no-cache src/revenuecat_shards.test.ts; Pop-Location`

  Expected: new minute-pack assertions fail before production code is added.

- [ ] **Step 3: Add the server transaction path.**

  In one Firestore transaction, store the immutable event at `voice_minute_events/{stableSourceId}`, validate its immutable fingerprint on replay, and update only the server-owned `voice_minute_wallets/{stableUid}` projection. Never write shard fields or `premium_*` fields for minute packs. Bind a refund reversal to the original event id.

- [ ] **Step 4: Write failing call-settlement tests.**

  Assert that a paid-minute mint reserves only available paid seconds; normal end writes one session charge and returns unused seconds; watchdog settlement has the same result; and a retry returns the original receipt.

- [ ] **Step 5: Run the mint, end, and watchdog tests to verify RED.**

  Run: `Push-Location functions; npx jest --runInBand --no-cache src/max_voice_mint.test.ts src/max_voice_session_end.test.ts src/max_voice_watchdog.test.ts; Pop-Location`

  Expected: paid-minute reservation and settlement expectations fail before wiring.

- [ ] **Step 6: Implement transactional reserve and settle wiring.**

  Read the wallet projection and reserve paid seconds only after the one-time trial is unavailable. At final settlement append one charge event bound to `sessionId`, release uncharged reserve seconds, and preserve all completed calls on later refunds. Reuse the exact same settlement helper from the watchdog.

- [ ] **Step 7: Re-run the focused server tests to verify GREEN.**

  Run: `Push-Location functions; npx jest --runInBand --no-cache src/voice_minutes.test.ts src/revenuecat_shards.test.ts src/max_voice_mint.test.ts src/max_voice_session_end.test.ts src/max_voice_watchdog.test.ts; Pop-Location`

  Expected: all selected suites pass.

### Task 3: Add client minute-pack purchasing and the MAX wallet UI

**Files:**
- Create: `modules/voice_minutes/purchase.ts`
- Create: `modules/voice_minutes/wallet.ts`
- Modify: `app/revenuecat_init.ts`
- Modify: `app/revenuecat_projection_sync.ts`
- Modify: `app/max_paywall.tsx`
- Modify: `app/max_call_prestart.tsx`
- Modify: `components/paywall/PaywallPlanCards.tsx`
- Modify: `components/paywall/PaywallPlanTiles.tsx`
- Test: `tests/voice_minutes_purchase.test.ts`
- Test: `tests/max_paywall_minutes.test.ts`

- [ ] **Step 1: Write failing client tests.**

  Assert that the client selects only `voice_minutes` packages from the exact 30/120/300 product ids; does not treat a pack as Premium or MAX entitlement; keeps a purchase pending until the server wallet confirms it; and renders the server/store supplied minute and price values on MAX.

- [ ] **Step 2: Run the client tests to verify RED.**

  Run: `npx jest --runInBand --no-cache tests/voice_minutes_purchase.test.ts tests/max_paywall_minutes.test.ts`

  Expected: tests fail because the minute-pack client modules and UI states are absent.

- [ ] **Step 3: Implement minimal client purchase and wallet modules.**

  Add a fixed product-id-to-minute catalogue only for package selection, invoke RevenueCat one-time purchases, persist an account-scoped pending source id, and poll the server-owned wallet confirmation. A store dialog success alone never increments the visible balance.

- [ ] **Step 4: Replace subscription copy and actions in MAX UI.**

  Remove the subscription activation and restore controls from the MAX purchase surface. Render the current paid-minute balance and three purchase buttons from store availability.

- [ ] **Step 5: Re-run client tests to verify GREEN.**

  Run: `npx jest --runInBand --no-cache tests/voice_minutes_purchase.test.ts tests/max_paywall_minutes.test.ts tests/max_call_home_entry_contract.test.ts`

  Expected: all selected suites pass.

### Task 4: Preserve system contracts and retire the subscription-only surfaces

**Files:**
- Modify: `firestore.rules`
- Modify: `functions/src/account_delete.ts`
- Modify: `functions/src/auth_merge.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
- Modify: `functions/src/admin_analytics_core.ts`
- Modify: `functions/src/admin_analytics_trends_core.ts`
- Modify: `app/manage_subscription.tsx`
- Modify: `app/(tabs)/settings.tsx`
- Modify: `tests/max_release_blockers.test.ts`
- Create: `tests/voice_minutes_lifecycle_contract.test.ts`

- [ ] **Step 1: Write failing lifecycle contract tests.**

  Assert that client rules deny all minute-event and wallet writes; account deletion purges minute journals and wallet projections; account merge retains the canonical owner without duplicating a purchase; Jarvis describes the new collection; and settings never call paid minutes a MAX subscription or expose a MAX subscription management action.

- [ ] **Step 2: Run the lifecycle contract test to verify RED.**

  Run: `npx jest --runInBand --no-cache tests/voice_minutes_lifecycle_contract.test.ts`

  Expected: the new lifecycle contract fails before connected-system changes are made.

- [ ] **Step 3: Implement the connected-system changes.**

  Close both new collections to clients in Firestore Rules, add exact deletion and merge ownership handling, update the Jarvis data-contract table and admin analytics taxonomy, remove every new-sale MAX subscription CTA, and preserve legacy renewal/expiry/refund code paths.

- [ ] **Step 4: Re-run lifecycle and existing MAX contract tests to verify GREEN.**

  Run: `npx jest --runInBand --no-cache tests/voice_minutes_lifecycle_contract.test.ts tests/max_release_blockers.test.ts tests/firestore_rules_security.test.ts`

  Expected: all selected suites pass with no remaining subscription-only UI assertions.

### Task 5: Prepare store rollout without changing production sale state

**Files:**
- Modify: `docs/superpowers/specs/2026-08-28-voice-minute-packs-design.md`
- Create: `docs/qa/VOICE_MINUTE_PACKS_SANDBOX_MATRIX.md`

- [ ] **Step 1: Write the sandbox matrix.**

  Include iOS and Android purchase, pending purchase, cancel, duplicate webhook, refund before and after use, reinstall/restore, account switch, legacy MAX overlap, and accessibility checks. For every row require device, OS, build, store account, timestamp, expected wallet receipt, and evidence path.

- [ ] **Step 2: Perform focused static verification before any dashboard mutation.**

  Run the Task 2–4 test commands, then `Push-Location functions; npm run build; Pop-Location`, with the repository heavy-process semaphore held for the build.

  Expected: all focused checks pass before any consumable product is created.

- [ ] **Step 3: Create only unpublished consumable products after code verification.**

  In App Store Connect and Google Play create the three exact one-time products, attach them to RevenueCat offering `voice_minutes`, attach no entitlement, and keep all products unpublished. Record the store identifiers and sandbox evidence in the matrix.

- [ ] **Step 4: Keep the legacy MAX subscription unavailable to new users only after sandbox success.**

  Remove the MAX offering and subscription from the app, RevenueCat, and stores. Preserve the MAX teacher UI; it now only displays the paid-minute wallet and purchases.
