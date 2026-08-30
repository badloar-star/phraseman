# Daily Journey Gift Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Daily Journey preview into an automatic, animated delivery of a real delayed-use gift, with durable unread state and direct Home/Statistics entry points into the existing Gifts inventory.

**Architecture:** Add an account-scoped append-only Daily Journey occurrence/claim journal and expose pure pending/unread projections. Render those occurrences through an adapter in the existing Gifts inventory; claim with the existing client-authoritative reward ledgers. Home owns the measured Statistics-card target and the Dev-only repeat grant trigger, while the modal owns presentation and reports a landing event.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage/account locks, existing phone-state/economy ledgers, React Native Animated/Reanimated, Jest/ts-jest.

---

## File map

- Create `app/daily_journey_gift_inbox.ts`: occurrence validation, prepared commit, immutable claim receipts, projections, unread watermark, account isolation, app events.
- Create `app/daily_journey_gift_activation.ts`: exact adapters from Daily Journey payloads to existing pearl/rune/spin/energy/freeze grant paths.
- Modify `components/dev/dailyJourneyRewardPreviewModel.ts`: expose exact reward payload/assets used by both modal and journal.
- Modify `components/dev/DailyJourneyRewardPreviewModal.tsx`: large artwork, no copy/decision controls, Skip-to-flight, measured delivery target, landing callback.
- Modify `app/level_gifts_inventory.tsx`: merge pending Daily Journey occurrences, claim them, and mark the displayed revision snapshot seen.
- Modify `app/(tabs)/home.tsx`: Dev grant button, measured Statistics target/pulse, stable centered Spin plus right Gift entry, unread subscription.
- Modify `app/streak_stats.tsx`: unread subscription, indicator/hop, direct inventory navigation.
- Modify `app/events.ts`: typed Daily Journey inbox/landing events if the event catalog is closed.
- Tests: `tests/daily_journey_gift_inbox.test.ts`, `tests/daily_journey_gift_activation.test.ts`, `tests/daily_journey_home_stats_contract.test.ts`, and existing Daily Journey/Dev Hub/inventory/economy contracts.

### Task 1: Immutable occurrence journal and unread projection

**Files:**
- Create: `app/daily_journey_gift_inbox.ts`
- Test: `tests/daily_journey_gift_inbox.test.ts`

- [ ] **Step 1: Write failing validation/idempotency/account tests**

Test the public contract:

```ts
const first = await commitDailyJourneyGift({ operationId: 'daily-dev-000000000001', day: 1, cycle: 1, source: 'daily_journey_dev', reward: { kind: 'pearls', amount: 10 } }, token);
const replay = await commitDailyJourneyGift(sameInput, token);
expect(first.status).toBe('committed');
expect(replay.status).toBe('already_committed');
await expect(commitDailyJourneyGift({ ...sameInput, reward: { kind: 'pearls', amount: 20 } }, token)).rejects.toThrow('daily_journey_occurrence_conflict');
expect((await readDailyJourneyGiftProjection(token)).unreadCount).toBe(1);
```

Also cover invalid rune `<100`, day outside `1..50`, wrong owner after account switch, prepared-intent recovery, and two deliberate unique Dev IDs producing two pending occurrences.

- [ ] **Step 2: Run RED**

Run the single focused Jest file under the repository semaphore. Expected: module/functions missing.

- [ ] **Step 3: Implement minimal journal**

Export these stable APIs:

```ts
commitDailyJourneyGift(input, token): Promise<{ status: 'committed' | 'already_committed'; occurrence: DailyJourneyGiftOccurrenceV1 }>;
readDailyJourneyGiftProjection(token?): Promise<{ pending: readonly DailyJourneyGiftPendingItem[]; pendingCount: number; unreadCount: number; latestRevision: number; seenRevision: number }>;
markDailyJourneyGiftSnapshotSeen(snapshotRevision, token?): Promise<boolean>;
readDailyJourneyGiftClaimState(operationId, token?): Promise<'pending' | 'claimed' | 'missing'>;
```

Use `withAccountTransitionLock` plus the storage lock. Persist a prepared envelope before the occurrence/projection multi-write; verify the written occurrence; clear prepared only after verification. Fingerprint canonical JSON with SHA-256. Store owner-scoped keys only. Emit `daily_journey_gifts_changed` after successful commit/seen/claim projection changes.

- [ ] **Step 4: Run GREEN and commit only Task 1 files**

Expected: focused journal tests pass with zero failures.

### Task 2: Exactly-once delayed activation

**Files:**
- Create: `app/daily_journey_gift_activation.ts`
- Modify: `app/daily_journey_gift_inbox.ts`
- Test: `tests/daily_journey_gift_activation.test.ts`

- [ ] **Step 1: Write failing exact-mapping and recovery tests**

Cover all six kinds, duplicate claim, failure after prepared intent, retry, and account switch. Assert energy methods are never called by `commitDailyJourneyGift`; they are called only by `claimDailyJourneyGift`.

- [ ] **Step 2: Run RED**

Expected: `claimDailyJourneyGift` and activation adapter are absent.

- [ ] **Step 3: Implement activation adapters**

Add:

```ts
claimDailyJourneyGift(operationId, token?): Promise<{ status: 'claimed' | 'already_claimed' }>;
```

Prepare a claim envelope that contains occurrence ID, exact reward, and stable claim operation ID. Delegate credits to existing idempotent client-authoritative APIs, adding narrowly named daily-journey wrappers where an existing wrapper restricts amounts/sources. Never mutate `users/{uid}.shards`; never use a new ID on retry. Persist and verify the immutable claim receipt before removing prepared state. A failed effect leaves the intent retryable and the gift pending.

- [ ] **Step 4: Run GREEN plus `tests/economy_constitution_contract.test.ts`**

Expected: all focused tests pass and the economy guard finds no standalone debit/direct writer.

- [ ] **Step 5: Commit Task 2 files**

### Task 3: Project Daily Journey items into Gifts

**Files:**
- Modify: `app/level_gifts_inventory.tsx`
- Test: `tests/daily_journey_gift_inventory_contract.test.ts`
- Test: existing `tests/level_gift_inventory.test.ts`, `tests/gift_inventory_apply_presentation_contract.test.ts`

- [ ] **Step 1: Write failing coexistence/seen tests**

Require that level/spin items remain unchanged, Daily Journey items use occurrence IDs (not fake levels), claim calls `claimDailyJourneyGift`, and successful first load calls `markDailyJourneyGiftSnapshotSeen(snapshot.latestRevision)`. Failed load must not mark seen.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Add a Daily Journey inventory adapter**

Render Daily Journey pending items as square asset-led tiles in the existing list. Preserve unrelated descriptions and controls. Refresh on `daily_journey_gifts_changed`; after successful activation, reload both item sources. Mark only the revision included in the displayed snapshot as seen.

- [ ] **Step 4: Run GREEN and commit Task 3 files**

### Task 4: Automatic modal delivery

**Files:**
- Modify: `components/dev/DailyJourneyRewardPreviewModal.tsx`
- Modify: `components/dev/dailyJourneyRewardPreviewModel.ts`
- Test: `tests/dev_hub_daily_journey_preview.test.ts`

- [ ] **Step 1: Change the test first**

Require `tileArt` near 78%, absence of `rewardCopy`, detail card, Apply/Later/close controls, exactly one Skip control, target-rect props, automatic flight, landing callback, reduced-motion branch, and exactly one existing intro sound request.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement the sequence**

Replace the final detail state with a delivery state. Props include the committed occurrence, optional measured target rect, `onLanded(occurrenceId)`, and `onDeliveryComplete()`. Skip stops only pre-flight animation and starts flight. Android request-close invokes Skip. Animate transform/opacity only; fallback target is stable top-center. Cancel every running animation/sound on unmount.

- [ ] **Step 4: Run GREEN and commit Task 4 files**

### Task 5: Home Dev grant, landing pulse, and stable bottom entries

**Files:**
- Modify: `app/(tabs)/home.tsx`
- Modify: `components/dev/DevHubSheet.tsx` and `components/dev/devToolRegistry.ts` only as needed to keep the existing preview entry compatible
- Test: `tests/daily_journey_home_stats_contract.test.ts`
- Test: existing `tests/home_spin_entry_contract.test.ts`, `tests/dev_hub_contract.test.ts`

- [ ] **Step 1: Write failing Home tests**

Assert the existing flask remains, a separate `home-dev-daily-journey-button` is gated by `ENABLE_DEV_TOOLS`, each handler press creates a unique operation and opens the modal only after commit, the Statistics card has a measurable ref and one landing pulse, Gift routes directly to `/level_gifts_inventory`, and Spin remains in an independent centered slot while Gift is right-aligned.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement Home orchestration**

Subscribe to `daily_journey_gifts_changed`; load unread projection with account-generation guards. The Dev handler cycles 1..50, captures one UUID per press, commits, measures the card, then opens the modal. On error show recoverable feedback and no success animation. On landing pulse `1 -> 1.035 -> 1`; reduced motion sets scale 1. Gift entry appears only for unread, displays unread count, and opens inventory directly.

- [ ] **Step 4: Run GREEN and commit Task 5 files**

### Task 6: Statistics unread indicator and final gates

**Files:**
- Modify: `app/streak_stats.tsx`
- Test: `tests/daily_journey_home_stats_contract.test.ts`
- Test: existing `tests/stats_tonal_hierarchy_contract.test.ts`

- [ ] **Step 1: Write failing Statistics tests**

Require existing pending badge preservation, a separate unread indicator, lifecycle-bound hop only for unread, reduced-motion suppression, and direct inventory navigation without marking seen on Statistics open.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement unread projection and hop**

Subscribe/load with account guards. Use transform only for a short repeated hop and cancel it on blur, zero unread, reduced motion, and unmount. Do not replace `pendingGiftCount`; add unread semantics beside it.

- [ ] **Step 4: Run focused GREEN gates one suite at a time under the semaphore**

Run the new three suites, Daily Journey preview, Home spin, Statistics hierarchy, gift inventory, Dev Hub, sound catalog/call-site, and economy constitution tests. Run targeted ESLint, `git diff --check`, and one full TypeScript check under the semaphore; report unrelated failures without changing unrelated source.

- [ ] **Step 5: Review exact diff and commit only owned implementation/test files**

Verify no Firestore/Jarvis schema change occurred. If one did, stop and revise the design rather than silently expanding scope.
