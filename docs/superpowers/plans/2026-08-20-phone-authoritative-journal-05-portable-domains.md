# PhoneState Portable Domains and Generic Sync Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every remaining portable personal domain to explicit PhoneState reducers and retire the giant generic snapshot without deleting product functionality.

**Architecture:** The approved legacy inventory is partitioned into domain facades. Each wave converts writes first, proves shadow convergence, converts reads, runs a cohort cutover, and only then removes that domain from generic snapshot sync. Existing specialized journals are imported with original IDs and their public APIs become adapters over PhoneState or the shared external-event coordinator.

**Tech Stack:** TypeScript, PhoneStateStore, AsyncStorage compatibility mirrors, React Native, Jest

---

## File map

- Create `modules/phone-state/domains/preferences.ts`: per-field HLC registers.
- Create `modules/phone-state/domains/cards.ts`: card/deck OR-set and tombstones.
- Create `modules/phone-state/domains/practice.ts`: plan, mistake, trainer progress facts/registers.
- Create `modules/phone-state/domains/economy.ts`: composite ordinary pearl adapter.
- Create `modules/phone-state/domains/learning_v2.ts`: required-session personal completion adapter.
- Create `modules/phone-state/domain_ownership.ts`: inventory-derived ownership and writer guard.
- Modify existing domain stores/adapters named below; do not replace screens or remove capabilities.
- Modify `app/cloud_sync.ts`, `app/target_storage_keys.ts`: remove a domain only after its gate.
- Retain device-only session caches outside portable sync by explicit inventory classification.

### Task 1: Inventory-derived domain ownership guard

**Files:**
- Create: `modules/phone-state/domain_ownership.ts`
- Create: `scripts/guard_phone_state_portable_writers.mjs`
- Create: `tests/phone_state_portable_writer_guard.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing ownership test**

```ts
test('every portable inventory row has exactly one facade owner', () => {
  const audit = auditPortableDomainOwnership();
  expect(audit.unownedKeys).toEqual([]);
  expect(audit.multiplyOwnedKeys).toEqual([]);
});

test('writer scanner reports an unauthorized direct write with its exact path', () => {
  expect(scanWriterFixture("AsyncStorage.setItem('user_total_xp', '1')"))
    .toEqual([{ key: 'user_total_xp', owner: 'progress', line: 1 }]);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_portable_writer_guard.test.ts`

Expected: FAIL and print the exact current direct writers.

- [ ] **Step 3: Define explicit owners**

```ts
export type PortableDomainOwner =
  | 'progress'
  | 'preferences'
  | 'cards'
  | 'practice'
  | 'economy'
  | 'learning_v2';

export const PORTABLE_DOMAIN_OWNERS: Readonly<Record<string, PortableDomainOwner>> =
  buildOwnersFromValidatedInventory();
```

The writer guard parses AsyncStorage/storage-helper writes and allows portable keys only in `legacy_reader`, `legacy_mirror`, the declared owner facade, and an exact temporary migration allowlist carrying an expiry release. No wildcard allowlist is accepted. Its CLI accepts repeated `--domain <owner>` filters so each wave can reach zero independently.

- [ ] **Step 4: Add the package guard and commit**

Add `"guard:phone-state-writers": "node scripts/guard_phone_state_portable_writers.mjs"`.

Run: `npm run guard:phone-state-writers`

Expected at this stage: non-zero with exact violations. Commit the guard and baseline owner map; each following task must reduce violations for its domain to zero.

```powershell
git add modules/phone-state/domain_ownership.ts scripts/guard_phone_state_portable_writers.mjs tests/phone_state_portable_writer_guard.test.ts package.json
git commit -m "test: assign portable state domain owners"
```

### Task 2: Preferences, language, and customization registers

**Files:**
- Create: `modules/phone-state/domains/preferences.ts`
- Create: `tests/phone_state_preferences.test.ts`
- Modify: `app/study_languages.ts`
- Modify: `app/language_welcome.tsx`
- Modify: `app/(tabs)/settings.tsx`
- Modify: `app/customization_snapshot.ts`
- Modify: `app/avatar_select.tsx`
- Modify: `app/flashcards/deck_options.ts`
- Modify: `app/flashcards/mode_prefs.ts`
- Modify: `app/flashcards/tabbar_state.ts`

- [ ] **Step 1: Write failing per-field merge tests**

```ts
test('independent device edits to different fields both survive', () => {
  const merged = mergePreferenceOperations([
    setPreference('device-a', 4, 'app_lang', 'es'),
    setPreference('device-b', 8, 'user_avatar', 'avatar-7'),
  ]);
  expect(merged).toMatchObject({ app_lang: 'es', user_avatar: 'avatar-7' });
});

test('same-field tie uses counter then deviceId, never XP or wall time', () => {
  expect(resolveRegister(setPreference('a', 9, 'app_lang', 'es'), setPreference('b', 9, 'app_lang', 'fr')).value)
    .toBe('fr');
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_preferences.test.ts`

Expected: FAIL with missing facade.

- [ ] **Step 3: Implement one operation per changed field**

```ts
export interface PersonalPreferencesApi {
  setField(field: string, value: unknown, idempotencyKey: string): Promise<void>;
  readFields(fields: readonly string[]): Promise<Readonly<Record<string, unknown>>>;
}
```

Validate fields against the inventory owner map. Unique public nickname, premium/access, Auth identity, moderation, and remote config are excluded and keep their server contracts. Adapt the named storage modules to commit through the facade, then mirror for old readers.

- [ ] **Step 4: Convert reads, run the writer guard, and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/phone_state_preferences.test.ts
npm run guard:phone-state-writers -- --domain preferences
```

Expected: PASS and zero preference writer violations.

```powershell
git add modules/phone-state/domains/preferences.ts tests/phone_state_preferences.test.ts app/study_languages.ts app/language_welcome.tsx 'app/(tabs)/settings.tsx' app/customization_snapshot.ts app/avatar_select.tsx app/flashcards/deck_options.ts app/flashcards/mode_prefs.ts app/flashcards/tabbar_state.ts
git commit -m "feat: move personal preferences to field registers"
```

### Task 3: Custom cards and decks as OR-sets

**Files:**
- Create: `modules/phone-state/domains/cards.ts`
- Create: `tests/phone_state_cards_merge.test.ts`
- Modify: `app/flashcards/custom_cards_store.ts`
- Modify: `app/flashcards_card_editor.tsx`
- Modify: `app/flashcards/deck_selection.ts`
- Modify: `app/flashcards/deck_sources.ts`
- Modify: `app/flashcards/useCollectionData.ts`
- Modify: `app/community_packs/communityOwnedStorage.ts`

- [ ] **Step 1: Write failing OR-set/tombstone tests**

```ts
test('remote old add cannot resurrect a deleted card', () => {
  const state = replayCards([
    addCard('card-1', clock('a', 1), { front: 'one', back: 'uno' }),
    deleteCard('card-1', clock('a', 3)),
    addCard('card-1', clock('b', 2), { front: 'old', back: 'viejo' }),
  ]);
  expect(state.visibleCards).not.toHaveProperty('card-1');
});

test('editing one card never overwrites unrelated device cards', () => {
  expect(replayCards([addCard('a', clock('a', 1), cardA), addCard('b', clock('b', 1), cardB)]).visibleIds)
    .toEqual(['a', 'b']);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_cards_merge.test.ts`

Expected: FAIL with missing cards facade.

- [ ] **Step 3: Implement semantic card/deck operations**

Expose `addCard`, `updateCardFields`, `deleteCard`, `addDeck`, `updateDeckFields`, `deleteDeck`, and `setDeckMembership`. Payload size is bounded before commit; card text stays inside encrypted SQLite locally. Marketplace/community ownership confirmed by the server enters as external entitlement, not a forgeable personal add.

- [ ] **Step 4: Convert named stores and verify**

Run:

```powershell
npx jest --runInBand --runTestsByPath tests/phone_state_cards_merge.test.ts
npm run guard:phone-state-writers -- --domain cards
```

Expected: PASS and zero card/deck writer violations.

```powershell
git add modules/phone-state/domains/cards.ts tests/phone_state_cards_merge.test.ts app/flashcards/custom_cards_store.ts app/flashcards_card_editor.tsx app/flashcards/deck_selection.ts app/flashcards/deck_sources.ts app/flashcards/useCollectionData.ts app/community_packs/communityOwnedStorage.ts
git commit -m "feat: merge personal cards with tombstones"
```

### Task 4: Personal plans, mistake practice, and trainer progress

**Files:**
- Create: `modules/phone-state/domains/practice.ts`
- Create: `tests/phone_state_practice_merge.test.ts`
- Modify: `app/mistake_practice_store.ts`
- Modify: `app/mistake_practice_session_store.ts`
- Modify: `app/mistake_practice_cloud_merge.ts`
- Modify: `app/personal_plan_progress.ts`
- Modify: `app/personal_plan_state.ts`
- Modify: `app/personal_plan_day_runtime_storage_adapter.ts`
- Modify: `app/personal_plan_exercise_submission_store.ts`
- Modify: `app/personal_plan_attempt_events.ts`
- Modify: `app/trainer_store.ts`

- [ ] **Step 1: Stabilize the owned source before editing**

These personal-plan/mistake files may contain concurrent owner work. Before implementation, require a clean ownership handoff or an exact approved commit containing that work. Never restore, overwrite, or delete them from another snapshot.

- [ ] **Step 2: Write failing semantic merge tests**

```ts
test('plan task completions union while mutable selections use field clocks', () => {
  const state = replayPractice([
    completeTask('device-a', 'day-1:listening'),
    completeTask('device-b', 'day-1:quiz'),
    selectPlanMode('device-a', 2, 'intensive'),
    selectPlanMode('device-b', 3, 'balanced'),
  ]);
  expect(state.completedTasks).toEqual(['day-1:listening', 'day-1:quiz']);
  expect(state.planMode).toBe('balanced');
});

test('mistake facts union and session draft remains explicitly scoped', () => {
  const state = replayPractice([captureMistake('a'), captureMistake('b')]);
  expect(state.mistakeIds).toEqual(['a', 'b']);
  expect(portabilityOf('active_audio_buffer')).toBe('device_only');
});
```

- [ ] **Step 3: Implement fact/register/session contracts**

Completed tasks, attempts, captured mistakes, and mastered facts are immutable sets. Mutable plan choice and per-item learning strength use field/entity clocks. Large transient audio buffers, animation state, and resumable UI internals remain device-only unless the inventory explicitly declares a bounded portable draft.

- [ ] **Step 4: Adapt existing stores without replacing screens**

Keep every current screen/feature. Existing store methods become facades over PhoneState and preserve their return types. `mistake_practice_cloud_merge.ts` stops snapshot winner selection after cohort cutover and consumes PhoneState projections instead.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_practice_merge.test.ts `
  tests/mistake_practice_cloud_merge.test.ts `
  tests/mistake_practice_account_isolation.test.ts `
  tests/personal_plan_cloud_merge.test.ts `
  tests/personal_plan_account_race.test.ts
npm run guard:phone-state-writers -- --domain practice
```

Expected: PASS and zero practice writer violations.

```powershell
git add modules/phone-state/domains/practice.ts tests/phone_state_practice_merge.test.ts app/mistake_practice_store.ts app/mistake_practice_session_store.ts app/mistake_practice_cloud_merge.ts app/personal_plan_progress.ts app/personal_plan_state.ts app/personal_plan_day_runtime_storage_adapter.ts app/personal_plan_exercise_submission_store.ts app/personal_plan_attempt_events.ts app/trainer_store.ts
git commit -m "feat: journal personal practice progress"
```

### Task 5: Ordinary economy and Learning V2 adapters

**Files:**
- Create: `modules/phone-state/domains/economy.ts`
- Create: `modules/phone-state/domains/learning_v2.ts`
- Create: `tests/phone_state_existing_journal_adapters.test.ts`
- Modify: `app/economy/client_shard_operation_ledger.ts`
- Modify: `app/economy/client_shard_operation_sync.ts`
- Modify: `app/economy/external_shard_event_sync.ts`
- Modify: `app/shards_system.ts`
- Modify: `modules/learning-v2/progress/progress_outbox.ts`
- Modify: `modules/learning-v2/progress/progress_outbox_flush.ts`
- Modify: `modules/learning-v2/progress/required_session_local_commit.ts`
- Modify: `app/learning_v2_completion_background_scheduler.ts`
- Modify: `app/friend_gift_outbox.ts`

- [ ] **Step 1: Write failing import/adapter tests**

```ts
test('existing shard operation ID imports once and preserves its exact grant', async () => {
  const h = journalAdapterHarness(existingShardOperation());
  await h.importAndReplayTwice();
  expect(h.phoneOperationsById(existingShardOperation().operationId)).toHaveLength(1);
  expect(h.grants()).toEqual([existingShardOperation().grant]);
});

test('Learning V2 local completion uses shared journal/coordinator without a second outbox item', async () => {
  const h = journalAdapterHarness();
  await h.commitLearningCompletion('mutation-1');
  expect(h.personalOperations('mutation-1')).toHaveLength(1);
  expect(h.legacyOutboxPending()).toBe(0);
});
```

- [ ] **Step 2: Run and prove failure**

Run: `npx jest --runInBand --runTestsByPath tests/phone_state_existing_journal_adapters.test.ts`

Expected: FAIL because existing journals are still separate.

- [ ] **Step 3: Make existing APIs adapters, not parallel authorities**

`commitClientShardOperation` keeps its API and Economy Constitution semantics but commits one PhoneState composite economy operation. The old operation ledger becomes an import/compatibility reader only. `client_shard_operation_sync.ts` stops full key/history scans and delegates segment sync.

Learning V2 required-session personal completion commits through `domains/learning_v2.ts`; server-confirmed competitive/access outcomes remain external. Friend gifts remain external inter-user intents but register their durable retry stream with the shared coordinator rather than a separate timer.

- [ ] **Step 4: Run economy/Learning V2 gates and commit**

Run:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_existing_journal_adapters.test.ts `
  tests/economy_constitution_contract.test.ts `
  tests/learning_v2_progress_outbox_flush.test.ts `
  tests/progress_events_client_queue.test.ts
npm run guard:phone-state-writers -- --domain economy --domain learning_v2
```

Expected: PASS; no standalone debit, no full-history rescan, and no duplicate outbox authority.

```powershell
git add modules/phone-state/domains/economy.ts modules/phone-state/domains/learning_v2.ts tests/phone_state_existing_journal_adapters.test.ts app/economy/client_shard_operation_ledger.ts app/economy/client_shard_operation_sync.ts app/economy/external_shard_event_sync.ts app/shards_system.ts modules/learning-v2/progress/progress_outbox.ts modules/learning-v2/progress/progress_outbox_flush.ts modules/learning-v2/progress/required_session_local_commit.ts app/learning_v2_completion_background_scheduler.ts app/friend_gift_outbox.ts
git commit -m "refactor: unify personal journals and retries"
```

### Task 6: Per-domain cutover and generic snapshot retirement

**Files:**
- Create: `tests/phone_state_generic_sync_retirement.test.ts`
- Modify: `app/cloud_sync.ts`
- Modify: `app/target_storage_keys.ts`
- Modify: `tests/cloud_sync_lesson_union_restore.test.ts`
- Modify: `tests/cloud_sync_customization_account_isolation.test.ts`

- [ ] **Step 1: Cut over one domain at a time**

For `preferences`, `cards`, `practice`, `economy`, and `learning_v2`, require in order:

1. zero direct writer violations;
2. opening import fixtures pass;
3. shadow projection has zero unexplained mismatch;
4. reads use the domain facade;
5. 1% → 10% → 50% → 100% cohort health is clean;
6. only then remove that domain’s keys from `SYNC_KEYS` and restore loops.

- [ ] **Step 2: Write the failing final retirement test**

```ts
test('generic cloud sync contains no portable personal domain keys', () => {
  const inventory = portableInventoryKeys();
  const generic = genericCloudSyncKeys();
  expect(generic.filter((key) => inventory.includes(key))).toEqual([]);
});

test('every remaining cloud sync key is external, device bootstrap, or compatibility scoped', () => {
  expect(classifyRemainingGenericKeys()).toEqual({ unknown: [], portable: [] });
});
```

- [ ] **Step 3: Retire giant snapshot behavior**

After all domain gates and two stable releases, remove generic full snapshot upload, global XP/streak restore winner logic, and per-device `LAST_SYNC_SNAPSHOT` conflict authority. Retain only narrowly named external/bootstrap compatibility functions with independent TTL/cursors. Do not delete account backup/delete flows.

- [ ] **Step 4: Run the complete universal-journal gate and commit**

Run:

```powershell
npm run guard:phone-state-inventory
npm run guard:phone-state-writers
npx jest --runInBand --runTestsByPath `
  tests/phone_state_generic_sync_retirement.test.ts `
  tests/phone_state_portable_writer_guard.test.ts `
  tests/phone_state_preferences.test.ts `
  tests/phone_state_cards_merge.test.ts `
  tests/phone_state_practice_merge.test.ts `
  tests/phone_state_existing_journal_adapters.test.ts `
  tests/phone_state_account_isolation.test.ts `
  tests/economy_constitution_contract.test.ts `
  tests/firestore_rules_security.test.ts
```

Expected: PASS, `unknown=0`, `portable generic sync keys=0`, and no unowned writer.

```powershell
git add app/cloud_sync.ts app/target_storage_keys.ts tests/phone_state_generic_sync_retirement.test.ts tests/cloud_sync_lesson_union_restore.test.ts tests/cloud_sync_customization_account_isolation.test.ts
git commit -m "refactor: retire generic personal snapshot sync"
```

## Plan 5 completion gate

- Every inventory row is portable, external, or device-only with one explicit owner.
- Every portable writer goes through a domain facade.
- Cards/decks cannot resurrect after tombstones.
- Personal plan/mistake/trainer state converges without removing current screens.
- Ordinary economy preserves immutable composite grants and may represent debt after concurrent offline spend.
- Learning V2 and gift intents share durable coordinator semantics without duplicate timers/outboxes.
- Generic giant snapshot contains no portable personal state and no global conflict winner.
