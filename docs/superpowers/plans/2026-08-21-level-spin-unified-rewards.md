# Level Spin Unified Rewards Implementation Plan

> **For agentic workers:** Execute inline in the current checkout. The owner did not authorize a branch, worktree, or delegated coding task.

**Goal:** Replace the local level-spin pool with the approved weighted reward catalog, remove avatar/aura rewards from new rolls, and make XP, pearls, unified stars, energy, hints, shields, XP boosts, and rare Plus-day rewards deliver exactly once.

**Architecture:** Keep the interactive spin device-owned and deterministic from its durable `requestId`. Version receipts to catalog v2 while continuing to parse/claim v1 receipts. Reuse the client pearl operation ledger, unified server `stars_ledger`, level-gift effect receipts, and account-scoped VIP snapshots. Star gifts are durable local intents and server-synced `grant` operations, so they do not alter earned/competitive star counters.

**Tech Stack:** React Native / Expo, TypeScript, AsyncStorage, Firebase Functions v2, Firestore transaction ledger, Jest.

---

## Task 1: Lock the v2 catalog and weighted picker with RED tests

**Files:**
- Create: `app/level_spin_reward_catalog.ts`
- Create: `tests/level_spin_reward_catalog.test.ts`
- Modify: `app/local_level_spins.ts`
- Modify: `app/level_spin_local_contract.ts`

1. Assert the exact approved IDs and relative weights.
2. Assert removed XP/pearl/star values and avatar/aura IDs are absent.
3. Assert deterministic weighted boundary selection without a 100-percent constraint.
4. Assert catalog-v1 receipts remain valid and catalog-v2 receipts validate.
5. Run the focused tests and confirm RED.
6. Implement the catalog, picker, and receipt compatibility; re-run to GREEN.

## Task 2: Add display definitions for every v2 reward

**Files:**
- Modify: `app/level_gift_system.ts`
- Modify: `tests/level_gift_locale.test.ts`
- Create: `tests/level_spin_reward_definitions.test.ts`

1. Assert every v2 ID resolves through `ALL_LEVEL_GIFT_DEFS` with all eight interface locales.
2. Add spin-only definitions without adding them to legacy level-gift roll pools.
3. Keep historical avatar/aura definitions for old receipts.
4. Run definition/locale suites to GREEN.

## Task 3: Deliver local XP, pearls, Plus, and consumables exactly once

**Files:**
- Modify: `app/level_gift_system.ts`
- Modify: `tests/level_gift_effect_exactly_once.test.ts`
- Create: `tests/level_spin_currency_rewards.test.ts`

1. Add RED tests for every XP amount, every pearl amount, Plus 3/7-day stacking, and replay safety.
2. Route XP through the occurrence-derived `registerXP` event.
3. Route pearls through one stable `commitShardCreditOperation` composite credit.
4. Stage Plus expiry in the existing effect receipt, stack from `max(now, vip_until)`, then emit entitlement events.
5. Reuse existing energy, hint, shield, bank, and timed-multiplier handlers.
6. Run focused effect suites to GREEN.

## Task 4: Sync spin stars into the unified star ledger

**Files:**
- Create: `app/level_spin_star_grants.ts`
- Modify: `app/level_gift_system.ts`
- Modify: `app/local_level_spins.ts`
- Modify: `app/community_packs/functionsClient.ts`
- Modify: `functions/src/stars_ledger.ts`
- Modify: `functions/src/level_reward_spins.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/stars_ledger.test.ts`
- Create: `tests/level_spin_star_grants.test.ts`

1. Assert server reason `level_spin_grant` is class `grant`, increases only balance/grantedTotal, and replays freely.
2. Assert the client outbox is account-scoped, request-idempotent, closed-catalog-only, and removed only after a matching acknowledgement.
3. Implement the callable using fixed amounts and `prepareStarOperations`/`commitStarOperations` with op ID `level_spin:<requestId>`.
4. Enqueue before returning local success; trigger immediate best-effort sync and retry when the Spin surface is read.
5. Reconcile the app snapshot from the acknowledged server balance; never create a local star balance.
6. Run focused star tests to GREEN.

## Task 5: Contracts, documentation, and focused verification

**Files:**
- Modify only if schema changes require it: `firestore.rules`, `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
- Modify: `docs/v2/HANDOVER.md`
- Modify: `docs/arena/OWNER_DECISIONS.md`

1. Confirm no new client Firestore writer/collection was introduced; otherwise update Rules and Jarvis together.
2. Record the catalog and the distinction between granted spendable stars and earned competitive stars.
3. Run focused catalog, local-spin, definition/locale, effect, pearl/Plus, outbox, and star-ledger suites.
4. Run `git diff --check`; inspect only touched-file diffs and preserve unrelated staged/user changes.
5. Run verification-before-completion. Do not deploy, migrate production data, commit, or change staging.
