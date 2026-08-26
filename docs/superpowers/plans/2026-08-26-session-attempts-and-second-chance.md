# Session Attempts and “Second Chance” Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. In this repository, do not create a delegated coding session, branch, or worktree unless the owner explicitly requests that exact action; inline one-writer execution in the current checkout is the safe default.

**Goal:** Give every non-Arena learning session three animated attempts, stop the session after the third pedagogical wrong answer, and let the learner end the session, restore all attempts for 25 runes, or consume the permanent Level Spin gift “Второй шанс”.

**Architecture:** A pure shared attempts reducer and route registry drive one HUD and one recovery modal. Rune and gift recovery are durable, account-scoped, append-only composite operations with stable idempotency keys; no balance setter or orphan debit is introduced. Each learning screen adapts its existing verdict lifecycle to the shared controller, while Learning V2 keeps its mode-native content contracts and adds the shared runtime shell only.

**Tech Stack:** Expo Router, React Native, TypeScript, React Native Reanimated, AsyncStorage, Phone State economy journal, Jest/tsx contract gates, HTML owner mockups.

---

## Source of truth and execution rules

- Product contract: `docs/superpowers/specs/2026-08-26-session-attempts-and-second-chance-design.md`.
- Learning V2 contract: re-read `docs/v2/СТАРТ В2.md` and its current route before any V2 edit and after any compaction, handoff, new error, or owner decision. Continue only on `ON TRACK`.
- Economy contract: `docs/economy/ECONOMY_CONSTITUTION.md`.
- Arena is an explicit exclusion. Do not edit `modules/arena/**`, `components/arena/**`, `app/arena*`, or Arena tests except for a read-only boundary assertion in a new non-Arena registry test.
- Preserve the current dirty checkout. Stage only the paths listed for the current task.
- Do not add the text/toast “Попытка потеряна”. Only the heart animation communicates a lost attempt.
- Use one writer. The current checkout is valid; do not create a branch or worktree without an explicit owner request.

### Heavy-test command template

Every Jest, typecheck, build, or similarly heavy command must use the shared traffic-light slot and release it even on failure:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest session attempts"
try {
  npx jest <focused-test-paths> --runInBand
  if ($LASTEXITCODE -ne 0) { throw "focused Jest failed: $LASTEXITCODE" }
} finally {
  & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release
}
```

Use `npx tsx <focused-gate>` without a slot unless the gate itself launches Jest, TypeScript, a build, or a mass scan.

## Public contracts to add

```ts
export const SESSION_ATTEMPTS_MAX = 3 as const;
export const SESSION_ATTEMPT_RUNE_COST = 25 as const;
export const ATTEMPT_RESTORE_GIFT_ID = 'attempt_restore_all' as const;

export type SessionAttemptsPhase = 'active' | 'awaiting_recovery' | 'ended';

export type SessionAttemptsStateV1 = Readonly<{
  schemaVersion: 'session-attempts-state.v1';
  sessionId: string;
  questionId: string;
  maxAttempts: 3;
  remainingAttempts: 0 | 1 | 2 | 3;
  phase: SessionAttemptsPhase;
  recoveryOrdinal: number;
  processedAnswerAttemptIds: readonly string[];
}>;

export type SessionAttemptVerdict =
  | 'correct'
  | 'pedagogical_wrong'
  | 'no_speech'
  | 'technical_error'
  | 'cancelled';
```

The exact stable IDs are:

```text
gift credit:  attempt_restore_credit:<spinRequestId>.<base|premium>
gift consume: attempt_restore_consume:<sessionId>:<recoveryOrdinal>
rune recovery: session_attempt_recovery:<sessionId>:<recoveryOrdinal>
```

Each operation also contains the stable owner ID, account generation, question ID, exact result, creation time, and SHA-256 request fingerprint. A reused ID with a different fingerprint is an error.

---

### Task 1: Build the pure attempts domain and route registry

**Files:**

- Create: `app/session_attempts/session_attempts_domain.ts`
- Create: `app/session_attempts/session_attempts_registry.ts`
- Create: `tests/session_attempts_domain.test.ts`
- Create: `tests/session_attempts_registry.test.ts`

**Step 1: Write the failing reducer tests**

Cover:

- initial `3/3`, `active`;
- unique wrong verdicts produce `3 → 2 → 1 → 0` and only the third produces `awaiting_recovery`;
- duplicate `answerAttemptId` is a strict replay and does not decrement;
- `correct`, `no_speech`, `technical_error`, and `cancelled` do not decrement;
- `recover_all` at zero returns exactly three attempts and increments `recoveryOrdinal` once;
- `end_session` sets `ended`;
- changing `questionId` preserves the session-level remaining count;
- malformed IDs, recovery while active, and decrement after `ended` fail closed.

Use a transition result that makes UI effects explicit without putting animation in the reducer:

```ts
type SessionAttemptsTransition = Readonly<{
  state: SessionAttemptsStateV1;
  effect: 'none' | 'attempt_consumed' | 'attempts_exhausted' | 'attempts_restored' | 'session_ended';
}>;
```

**Step 2: Run the RED test**

Run the heavy-test template with:

```text
tests/session_attempts_domain.test.ts
```

Expected: FAIL because the domain module does not exist.

**Step 3: Implement the pure reducer**

Keep it framework-free, deterministic, frozen, and bounded. Store at most the last 256 processed answer IDs; compact only IDs belonging to questions that are no longer current. Do not persist answer text or transcripts.

**Step 4: Write the failing registry test**

Define the exact first-wave coverage:

```ts
export const SESSION_ATTEMPT_ROUTES = Object.freeze([
  '/lesson1',
  '/lesson_words',
  '/lesson_irregular_verbs',
  '/mistake_practice_session',
  '/flashcards_blitz_session',
  '/flashcards_listening_session',
  '/flashcards_speaking_session',
  '/learning_v2_direct_session_player_v1',
  '/learning-v2/session/[id]',
] as const);

export const SESSION_ATTEMPT_DENYLIST = Object.freeze([
  '/arena',
  '/arena/**',
] as const);
```

The test must assert uniqueness, no Arena prefix in the allowlist, all known energy-start learning routes are classified, and every route has an integration contract test path.

**Step 5: Implement the registry and run GREEN**

Run:

```text
tests/session_attempts_domain.test.ts tests/session_attempts_registry.test.ts
```

Expected: PASS.

**Step 6: Commit only this task**

```powershell
git add -- app/session_attempts/session_attempts_domain.ts app/session_attempts/session_attempts_registry.ts tests/session_attempts_domain.test.ts tests/session_attempts_registry.test.ts
git diff --cached --check
git commit -m "feat: add shared session attempts domain"
```

---

### Task 2: Add localized copy, shared HUD, and recovery modal

**Files:**

- Create: `app/session_attempts/session_attempts_copy.ts`
- Create: `components/session_attempts/SessionAttemptsHud.tsx`
- Create: `components/session_attempts/SessionAttemptsRecoveryModal.tsx`
- Modify: `constants/motionHybrid.ts`
- Create: `tests/session_attempts_copy.test.ts`
- Create: `tests/session_attempts_hud.test.tsx`
- Create: `tests/session_attempts_recovery_modal.test.tsx`
- Create: `tests/session_attempts_no_toast_contract.test.ts`

**Step 1: Write copy and component RED tests**

The copy test requires all interface locales: `ru`, `uk`, `en`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`. The Russian contract includes:

```ts
{
  exhaustedTitle: 'Попытки закончились',
  exhaustedBody: 'Восстановите все 3 попытки и повторите этот вопрос.',
  useGift: 'Использовать подарок',
  restoreForRunes: 'Восстановить · 25 рун',
  endSession: 'Завершить сессию',
  permanentGift: 'Без срока действия',
}
```

The HUD test requires one accessible element with value equivalent to “Попытки: 2 из 3”, three fixed slots, filled/outline state, and no individually focusable hearts.

The modal test requires:

- `HybridAlertShell` as the shell;
- gift, runes, exit focus order when gift count is positive;
- no empty gift row when count is zero;
- disabled rune CTA with inline insufficient-balance reason;
- busy state disables all three actions;
- no outside-tap or hardware-back dismissal;
- lime primary CTA uses a dark foreground token.

The no-toast test scans new shared files and all registered screen files for `Попытка потеряна`, `Attempt lost`, and calls that create a lost-attempt toast.

**Step 2: Run RED**

Run the heavy-test template with:

```text
tests/session_attempts_copy.test.ts tests/session_attempts_hud.test.tsx tests/session_attempts_recovery_modal.test.tsx tests/session_attempts_no_toast_contract.test.ts
```

Expected: FAIL because the shared UI does not exist.

**Step 3: Add motion tokens**

Add named attempt-loss timings and reduced-motion values to `constants/motionHybrid.ts`; screens must not contain their own `40/80/80/60` sequences afterward. Use only transform and opacity:

```ts
attemptLoss: {
  shakeOffsets: [0, -5, 5, -3, 0],
  shakeSegmentMs: 60,
  consumedScale: 0.72,
  consumedFadeMs: 180,
  exhaustedModalDelayMs: 240,
}
```

If existing named tokens already express the same motion, reuse them and make the test assert the canonical token rather than duplicating values.

**Step 4: Implement `SessionAttemptsHud`**

Use Reanimated shared values on the UI thread. Accept `remainingAttempts`, `lossSequence`, `reduceMotion`, and theme colors. Reserve width from the first frame. Update the accessibility value after the visible state changes, but never render a toast or extra label.

**Step 5: Implement `SessionAttemptsRecoveryModal`**

Required props:

```ts
type Props = Readonly<{
  visible: boolean;
  giftCount: number;
  runeBalance: number | null;
  busyAction: 'gift' | 'runes' | 'end' | null;
  inlineError: string | null;
  onUseGift(): void;
  onUseRunes(): void;
  onEndSession(): void;
}>;
```

Focus the title on open, trap focus inside the shell, expose the rune price and gift count in accessibility labels, and preserve the existing theme language. Do not add a store link.

**Step 6: Run GREEN and commit**

Run the four focused tests. Expected: PASS.

```powershell
git add -- app/session_attempts/session_attempts_copy.ts components/session_attempts/SessionAttemptsHud.tsx components/session_attempts/SessionAttemptsRecoveryModal.tsx constants/motionHybrid.ts tests/session_attempts_copy.test.ts tests/session_attempts_hud.test.tsx tests/session_attempts_recovery_modal.test.tsx tests/session_attempts_no_toast_contract.test.ts
git diff --cached --check
git commit -m "feat: add attempts HUD and recovery modal"
```

---

### Task 3: Add the permanent account-scoped gift journal

**Files:**

- Create: `app/session_attempts/session_attempt_restore_inventory.ts`
- Modify: `modules/phone-state/domains/economy.ts`
- Modify: `app/phone_state_economy_bridge.ts`
- Create: `tests/session_attempt_restore_inventory.test.ts`
- Modify: `tests/phone_state_economy_bridge.test.ts`

**Step 1: Write RED tests for credits, stacking, replay, and lifetime**

Model two immutable exact-result schemas:

```ts
type AttemptRestoreGiftCreditV1 = Readonly<{
  schemaVersion: 'client-attempt-restore-gift-credit.v1';
  operationId: string;
  ownerStableId: string;
  spinRequestId: string;
  lane: 'base' | 'premium';
  giftId: 'attempt_restore_all';
  quantity: 1;
  createdAtMs: number;
  requestFingerprint: string;
}>;

type AttemptRestoreGiftConsumeV1 = Readonly<{
  schemaVersion: 'client-attempt-restore-gift-consume.v1';
  operationId: string;
  ownerStableId: string;
  sessionId: string;
  questionId: string;
  recoveryOrdinal: number;
  quantity: 1;
  attemptsGranted: 3;
  createdAtMs: number;
  requestFingerprint: string;
}>;
```

Tests must prove:

- the same Spin occurrence credits exactly once;
- two occurrences stack to count 2;
- a consume decrements exactly one and cannot make count negative;
- replaying a consume is idempotent;
- same operation ID with a different fingerprint fails;
- account A never changes account B;
- no serialized credit/projection contains `expiresAtMs`;
- a credit remains available after an injected clock advance of 365 days;
- malformed or oversize journals fail closed.

**Step 2: Run RED**

Run focused Jest:

```text
tests/session_attempt_restore_inventory.test.ts tests/phone_state_economy_bridge.test.ts
```

Expected: FAIL on missing parsers and inventory module.

**Step 3: Extend Phone State semantic grants**

Add exact parsers and two zero-delta semantic kinds:

```text
attempt_restore_inventory_credit
attempt_restore_inventory_consume
```

The outer Phone State economy delta stays `0`; the exact result owns the gift quantity. This avoids mixing gift counts or rune amounts into the legacy generic balance while still persisting immutable closed semantics.

Update `commitPhoneStateNonMonetaryEconomyGrant` to accept only exact validated results for those kinds. Never add a generic arbitrary payload path.

**Step 4: Implement the local append-only inventory projection**

Use account-generation checks, `withAccountTransitionLock`, `withStorageLock`, prepared intent, per-operation storage, and a bounded projection/outbox. Keep the public API narrow:

```ts
readAttemptRestoreGiftCount(token): Promise<number>
creditAttemptRestoreGiftFromSpin(input): Promise<{ duplicate: boolean; count: number }>
prepareAttemptRestoreGiftConsume(input): Promise<PreparedAttemptRestoreGiftConsume>
syncPendingAttemptRestoreGiftOperations(token): Promise<{ synced: number; pending: number }>
```

The final consume commit will be coordinated atomically by Task 5; do not expose a standalone `consumeGift()` that could separate the debit from the attempts grant.

**Step 5: Run GREEN and commit**

Expected: both focused tests PASS.

```powershell
git add -- app/session_attempts/session_attempt_restore_inventory.ts modules/phone-state/domains/economy.ts app/phone_state_economy_bridge.ts tests/session_attempt_restore_inventory.test.ts tests/phone_state_economy_bridge.test.ts
git diff --cached --check
git commit -m "feat: add permanent attempt restore inventory"
```

---

### Task 4: Extend the canonical rune projection with a composite recovery debit

**Files:**

- Modify: `app/level_spin_star_grants.ts`
- Modify: `modules/phone-state/domains/economy.ts`
- Modify: `app/phone_state_economy_bridge.ts`
- Create: `tests/session_attempt_rune_operation.test.ts`
- Modify: `tests/level_spin_star_grants.test.ts`
- Modify: `tests/economy_constitution_contract.test.ts`

**Step 1: Write RED economy tests**

Add `SessionAttemptRuneRecoveryExactResultV1`:

```ts
type SessionAttemptRuneRecoveryExactResultV1 = Readonly<{
  schemaVersion: 'client-session-attempt-recovery-rune-operation.v1';
  operationId: string;
  ownerStableId: string;
  accountGeneration: number;
  sessionId: string;
  questionId: string;
  recoveryOrdinal: number;
  runeDelta: -25;
  attemptsGranted: 3;
  balanceBefore: number;
  balanceAfter: number;
  reason: 'restore_all_session_attempts';
  createdAtMs: number;
  requestFingerprint: string;
}>;
```

Tests must prove:

- one exact payload contains `-25` and `attemptsGranted: 3`;
- no standalone rune debit API is exported;
- insufficient balance fails before prepared intent becomes committed;
- retry returns the same receipt and balance;
- reused ID/different payload fails;
- fault before commit changes nothing;
- fault after durable commit but before UI reply replays the grant without a second debit;
- a later server star snapshot does not erase the durable local debit;
- account switch blocks stale token writes;
- offline Phone State sync failure does not roll back local result;
- economy guard still rejects `spendRunes`, direct `progress.stars =`, and orphan negative operations.

**Step 2: Run RED**

Run:

```text
tests/session_attempt_rune_operation.test.ts tests/level_spin_star_grants.test.ts tests/economy_constitution_contract.test.ts
```

Expected: FAIL because the projection accepts only star-credit operations.

**Step 3: Generalize the existing rune projection without changing its public read seam**

Migrate the projection schema from `client-level-spin-star-projection.v2` to `.v3` with a parser that upgrades `.v2` losslessly. Its operation union becomes:

```ts
type LocalRuneOperation =
  | LevelSpinStarCreditExactResult
  | SessionAttemptRuneRecoveryExactResultV1;
```

Projection rules:

- an unacknowledged Spin credit contributes `+amount`;
- an acknowledged Spin credit contributes `0` overlay because the server balance contains it;
- every valid recovery operation contributes `-25` permanently;
- visible balance is `serverBalance + localOverlay`, must never be negative;
- `serverEarnedTotal` remains unchanged by purchase;
- server acknowledgement may compact only acknowledged Spin credits, never recovery debits.

Keep `app/runes_system.ts` read-only and preserve `readUnifiedLevelSpinStars`, `peekStoredLevelSpinStarsForBoot`, and subscription behavior.

**Step 4: Extend Phone State with one closed zero-delta semantic kind**

Add:

```text
session_attempt_recovery_rune_debit
```

The Phone State outer delta is `0`; `runeDelta: -25` is validated inside the exact result. This records the immutable operation without contaminating the legacy generic economy balance.

**Step 5: Add a prepare-only API**

Export an internal, typed preparation function from `level_spin_star_grants.ts` that calculates and validates the recovery operation but does not separately commit it. Task 5’s coordinator will durably write the rune operation and attempt receipt together. Do not export `spendRunes`.

**Step 6: Run GREEN and commit**

Expected: all three focused tests PASS.

```powershell
git add -- app/level_spin_star_grants.ts modules/phone-state/domains/economy.ts app/phone_state_economy_bridge.ts tests/session_attempt_rune_operation.test.ts tests/level_spin_star_grants.test.ts tests/economy_constitution_contract.test.ts
git diff --cached --check
git commit -m "feat: add composite rune attempt recovery"
```

---

### Task 5: Add the crash-safe recovery coordinator and React hook

**Files:**

- Create: `app/session_attempts/session_attempt_recovery.ts`
- Create: `hooks/useSessionAttempts.ts`
- Create: `tests/session_attempt_recovery.test.ts`
- Create: `tests/use_session_attempts.test.tsx`

**Step 1: Write RED recovery-coordinator tests**

The coordinator is the only writer allowed to complete a recovery:

```ts
commitSessionAttemptRecovery({
  source: 'runes' | 'gift',
  token,
  sessionState,
}): Promise<Readonly<{
  duplicate: boolean;
  source: 'runes' | 'gift';
  attemptsState: SessionAttemptsStateV1;
  receiptId: string;
}>>
```

Tests inject failures at:

1. before prepared intent;
2. after prepared intent;
3. during `multiSet`;
4. after durable operation/receipt but before prepared cleanup;
5. after cleanup but before returned result;
6. after account-generation change.

For rune source, the one durable commit contains the rune operation, updated rune projection, and attempt recovery receipt. For gift source, it contains the consume operation, updated gift projection, and the same recovery receipt. On restart, recovery of prepared intents must converge to exactly one debit/consume and exactly one attempts grant.

**Step 2: Run RED**

Run focused Jest:

```text
tests/session_attempt_recovery.test.ts tests/use_session_attempts.test.tsx
```

Expected: FAIL because the coordinator and hook do not exist.

**Step 3: Implement durable recovery**

Use one account-transition critical section and one storage mutex for the local composite. Persist:

- prepared intent;
- immutable operation record;
- updated resource projection;
- immutable attempt recovery receipt;
- current attempts state snapshot.

Use `AsyncStorage.multiSet` for the commit group, then clear prepared intent. Publish the rune projection or gift count only after the durable group succeeds. Queue Phone State sync afterward as best effort.

**Step 4: Implement `useSessionAttempts`**

The hook owns the reducer, loss animation sequence, persisted zero-attempt state, gift/rune reads, and recovery action busy/error state. It must expose adapters, not screen-specific routing:

```ts
{
  state,
  lossSequence,
  giftCount,
  runeBalance,
  registerVerdict(input),
  updateQuestion(questionId),
  recoverWithGift(),
  recoverWithRunes(),
  endAttemptsSession(),
  hydrate(),
}
```

`registerVerdict` must return its effect synchronously enough for screens to pause timers/audio before the modal appears. Persist and show the modal again after remount when phase is `awaiting_recovery`.

**Step 5: Run GREEN and commit**

Expected: both tests PASS.

```powershell
git add -- app/session_attempts/session_attempt_recovery.ts hooks/useSessionAttempts.ts tests/session_attempt_recovery.test.ts tests/use_session_attempts.test.tsx
git diff --cached --check
git commit -m "feat: coordinate durable attempt recovery"
```

---

### Task 6: Add “Второй шанс” to Level Spin and materialize it exactly once

**Files:**

- Modify: `app/level_spin_reward_catalog.ts`
- Modify: `app/level_gift_system.ts`
- Modify: `app/level_spin_reward_asset_manifest.ts`
- Modify: `app/level_spin_reward_assets.ts`
- Modify: `app/level_reward_spins_client.ts`
- Modify: `app/local_level_spins.ts`
- Create: `assets/images/level-spin-rewards/attempt_restore_all.webp`
- Modify: `tests/level_spin_reward_catalog.test.ts`
- Modify: `tests/level_spin_reward_definitions.test.ts`
- Modify: `tests/level_spin_reward_asset_manifest.test.ts`
- Modify: `tests/level_spin_reward_assets.test.ts`
- Modify: `tests/level_spin_reward_art.test.ts`
- Modify: `tests/level_gift_effect_exactly_once.test.ts`
- Modify: `tests/local_level_spin_auto_delivery.test.ts`

**Step 1: Write RED catalog and delivery tests**

Add `attempt_restore_all` as `ordinary` with weight `40_796`, bump `LEVEL_SPIN_REWARD_CATALOG_VERSION` from 5 to 6, and preserve the owner-approved aggregate energy probability by changing the current energy overrides to `18_544`, `18_544`, and `3_708`. This recalculation preserves the concurrently approved full-avatar reward and every other v5 weight. The resulting total is `271_974`; the new gift and all energy rewards each occupy `40_796 / 271_974 = 14.99996%`. Calculate both probabilities from the actual total:

```ts
const entry = LEVEL_SPIN_REWARD_CATALOG.find(({ id }) => id === 'attempt_restore_all')!;
expect(entry.weight / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.15, 4);
const energyWeight = ['energy_full', 'energy_plus2', 'energy_plus3']
  .map((id) => LEVEL_SPIN_REWARD_CATALOG.find((entry) => entry.id === id)!.weight)
  .reduce((sum, weight) => sum + weight, 0);
expect(energyWeight / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.15, 4);
```

Also assert:

- the ID exists once in catalog, definitions, manifest, and static require map;
- server/local seeded pick can select it;
- claim replay produces one inventory credit;
- the Spin occurrence reaches terminal claimed/delivered state after credit materialization;
- the gift never enters the 72-hour pending/active expiry path;
- two independent Spin occurrences produce count 2.

**Step 2: Run RED**

Run focused Jest with all seven listed tests. Expected: FAIL on missing reward ID/art/definition/effect.

**Step 3: Wire source before creating the asset**

Add the ID to `ORDINARY_REWARD_IDS`, manifest, and literal static `require()` first. Use a new art family only if needed; otherwise classify it under `protection`. Definition copy:

```ts
{
  id: 'attempt_restore_all',
  rarity: 'common',
  spinTier: 'ordinary',
  icon: '♥',
  weight: 40_796,
  titleRU: 'Второй шанс',
  titleUK: 'Другий шанс',
  titleES: 'Segunda oportunidad',
  descRU: 'Восстанавливает все 3 попытки во время сессии',
  descUK: 'Відновлює всі 3 спроби під час сесії',
  descES: 'Restaura los 3 intentos durante una sesión',
}
```

Fill the other six planned interface locales in `SPIN_REWARD_PLANNED_LOCALE`; fallback is not acceptable for this new learner-facing item.

**Step 4: Create and validate one bundled WebP**

Create a transparent, compressed `attempt_restore_all.webp` matching the existing universal Spin art grammar: a dark compact token with three restrained heart/attempt marks and no lettering. Do not generate unused variants or raw sources under `assets/images/**`.

Run:

```powershell
node scripts/validate-level-spin-reward-asset.mjs --id attempt_restore_all --source .codex-tmp/level-spin-rewards/sources/attempt_restore_all.png --qa-dir .codex-tmp/level-spin-rewards/qa/attempt_restore_all
```

Expected: PASS for format, alpha, transparent corners, safe bounds, and dimensions.

**Step 5: Materialize the Spin effect**

Add a dedicated `case 'attempt_restore_all'` in the existing gift application switch. It must call `creditAttemptRestoreGiftFromSpin` with the immutable `requestId + lane + giftId` authority, and only then allow the outer claim lifecycle to complete. Do not save this gift via `saveUnclaimedGift`, `GIFT_TTL_MS`, first-seen expiry, or an arbitrary count setter.

**Step 6: Run GREEN and commit**

Expected: catalog, art, definition, exact-once, and local auto-delivery tests PASS.

```powershell
git add -- app/level_spin_reward_catalog.ts app/level_gift_system.ts app/level_spin_reward_asset_manifest.ts app/level_spin_reward_assets.ts app/level_reward_spins_client.ts app/local_level_spins.ts assets/images/level-spin-rewards/attempt_restore_all.webp tests/level_spin_reward_catalog.test.ts tests/level_spin_reward_definitions.test.ts tests/level_spin_reward_asset_manifest.test.ts tests/level_spin_reward_assets.test.ts tests/level_spin_reward_art.test.ts tests/level_gift_effect_exactly_once.test.ts tests/local_level_spin_auto_delivery.test.ts
git diff --cached --check
git commit -m "feat: add second chance spin gift"
```

---

### Task 7: Show the permanent gift in “Твои подарки”

**Files:**

- Modify: `app/level_gift_active_inventory.ts`
- Modify: `app/level_gifts_inventory.tsx`
- Modify: `tests/level_gift_active_inventory.test.ts`
- Modify: `tests/level_gifts_single_list_contract.test.ts`
- Create: `tests/session_attempt_restore_inventory_ui.test.tsx`

**Step 1: Write RED inventory UI tests**

Require one row when count is positive:

- title `Второй шанс`;
- count badge `×N`;
- description `Восстанавливает все 3 попытки во время сессии`;
- lifetime `Без срока действия`;
- no countdown component and no `expiresAtMs`;
- tap opens an information modal explaining that use becomes available only when attempts reach zero;
- no proactive Apply button;
- zero count omits the row.

**Step 2: Run RED**

Run focused Jest:

```text
tests/level_gift_active_inventory.test.ts tests/level_gifts_single_list_contract.test.ts tests/session_attempt_restore_inventory_ui.test.tsx
```

Expected: FAIL because the permanent consumable is not read by inventory UI.

**Step 3: Add a non-expiring inventory item**

Extend the active-item view model with explicit lifetime semantics rather than a fake far-future timestamp:

```ts
lifetime: { kind: 'permanent' } | { kind: 'expires'; expiresAtMs: number }
```

Adapt existing rows to preserve their current behavior and render the new row from `readAttemptRestoreGiftCount`. Do not weaken the 72-hour expiry for any existing gift.

**Step 4: Run GREEN and commit**

```powershell
git add -- app/level_gift_active_inventory.ts app/level_gifts_inventory.tsx tests/level_gift_active_inventory.test.ts tests/level_gifts_single_list_contract.test.ts tests/session_attempt_restore_inventory_ui.test.tsx
git diff --cached --check
git commit -m "feat: show permanent second chance gifts"
```

---

### Task 8: Replace Blitz-only lives termination with the shared attempts shell

**Files:**

- Modify: `app/flashcards/blitz_logic.ts`
- Modify: `app/flashcards_blitz_session.tsx`
- Modify: `tests/fc_blitz.test.ts`
- Create: `tests/fc_blitz_attempts_integration.test.tsx`

**Step 1: Write RED integration tests**

Prove:

- Blitz still starts with three attempts;
- first and second wrong answers animate/decrement and continue;
- third wrong pauses the timer at its exact remaining value and opens the shared modal after the consumed-heart animation;
- it does not call `finish` automatically after 600 ms;
- gift/rune recovery returns to the same `roundId`, question, option order, score, and combo, with timer resuming from the saved remainder;
- ending from the modal uses the existing result/finalization path and preserves already earned score;
- background while exhausted does not leak timer time;
- no lost-attempt toast exists.

**Step 2: Run RED**

Run:

```text
tests/fc_blitz.test.ts tests/fc_blitz_attempts_integration.test.tsx
```

Expected: existing Blitz unit tests pass, new integration test fails on auto-finish and missing shared modal.

**Step 3: Adapt Blitz**

Keep the question/score/combo logic in `blitz_logic.ts`, but make `useSessionAttempts` authoritative for session attempts. Remove the local magic shake timing and the `setTimeout(finish, 600)` out-of-lives branch; render `SessionAttemptsHud` in the existing top slot and `SessionAttemptsRecoveryModal` above the task.

Map timeout only according to existing Blitz semantics. If current timeout finishes the whole Blitz rather than grading one answer, preserve that behavior; do not invent a timeout attempt loss.

**Step 4: Run GREEN and commit**

```powershell
git add -- app/flashcards/blitz_logic.ts app/flashcards_blitz_session.tsx tests/fc_blitz.test.ts tests/fc_blitz_attempts_integration.test.tsx
git diff --cached --check
git commit -m "feat: add recoverable attempts to blitz"
```

---

### Task 9: Integrate ordinary lesson, vocabulary, and irregular verbs

**Files:**

- Modify: `app/lesson1.tsx`
- Modify: `app/lesson_words.tsx`
- Modify: `app/lesson_irregular_verbs.tsx`
- Create: `tests/lesson_session_attempts_integration.test.tsx`
- Create: `tests/lesson_words_attempts_integration.test.tsx`
- Create: `tests/irregular_verbs_attempts_integration.test.tsx`

**Step 1: Write three RED integration tests**

For each screen assert:

- HUD is present from the first active question;
- only its existing honest wrong branch calls `registerVerdict({ verdict: 'pedagogical_wrong' })`;
- correct feedback/XP behavior is unchanged;
- third wrong opens the shared modal and prevents auto-advance;
- recovery retains the same current item, options/order, current learner-attempt count, and earned rewards;
- exit uses the screen’s existing completion/close route without refunding start energy;
- no toast or added attempt-loss sound exists.

**Step 2: Run RED**

Run the three new focused tests. Expected: FAIL on missing HUD/controller wiring.

**Step 3: Integrate one screen at a time**

Order:

1. `app/lesson1.tsx`;
2. `app/lesson_words.tsx` at its existing `isRight === false` branch around the current feedback/telemetry path;
3. `app/lesson_irregular_verbs.tsx` at its existing `isCorrect === false` branch.

On exhaustion, retain wrong corrective feedback but cancel the scheduled next-item callback. Resume the same item only after recovery. Do not reset each screen’s existing per-question answer counter.

**Step 4: Run GREEN and commit**

```powershell
git add -- app/lesson1.tsx app/lesson_words.tsx app/lesson_irregular_verbs.tsx tests/lesson_session_attempts_integration.test.tsx tests/lesson_words_attempts_integration.test.tsx tests/irregular_verbs_attempts_integration.test.tsx
git diff --cached --check
git commit -m "feat: add attempts to lesson practice modes"
```

---

### Task 10: Integrate mistake practice, listening, and speaking/voice

**Files:**

- Modify: `app/mistake_practice_session.tsx`
- Modify: `app/flashcards_listening_session.tsx`
- Modify: `app/flashcards_speaking_session.tsx`
- Modify: `modules/mistake-practice/voice_verdict.ts`
- Create: `tests/mistake_practice_attempts_integration.test.tsx`
- Create: `tests/fc_listening_attempts_integration.test.tsx`
- Create: `tests/fc_speaking_attempts_integration.test.tsx`
- Modify: `tests/mistake_practice_voice_verdict.test.ts`

**Step 1: Write RED verdict-boundary tests**

Require this mapping:

| Existing outcome | Shared verdict | Costs an attempt |
|---|---|---:|
| correct/PASS | `correct` | no |
| explicit wrong/FAIL | `pedagogical_wrong` | yes |
| `no_speech`, `stalled` | `no_speech` or `technical_error` | no |
| `denied`, `unavailable`, audio focus/storage/network failure | `technical_error` | no |
| cancelled recording/input | `cancelled` | no |

Tests also require active playback/recording to stop before the exhausted modal opens, and no partial voice result to be submitted as a learner answer.

**Step 2: Run RED**

Run:

```text
tests/mistake_practice_attempts_integration.test.tsx tests/fc_listening_attempts_integration.test.tsx tests/fc_speaking_attempts_integration.test.tsx tests/mistake_practice_voice_verdict.test.ts
```

Expected: FAIL on missing shared wiring.

**Step 3: Integrate the three screens**

- In mistake practice, register only `correct === false` after `classifyMistakeVoiceVerdict` returns pedagogical `FAIL`; preserve corrective feedback and scheduler data.
- In listening, pause playback and preserve the current card/answer order at zero.
- In speaking, stop the hold recorder safely, discard nonterminal capture, and register a wrong only after the existing pedagogical verdict has been accepted.

Render the common HUD/modal and use each screen’s existing final result path for `end`.

**Step 4: Run GREEN and commit**

```powershell
git add -- app/mistake_practice_session.tsx app/flashcards_listening_session.tsx app/flashcards_speaking_session.tsx modules/mistake-practice/voice_verdict.ts tests/mistake_practice_attempts_integration.test.tsx tests/fc_listening_attempts_integration.test.tsx tests/fc_speaking_attempts_integration.test.tsx tests/mistake_practice_voice_verdict.test.ts
git diff --cached --check
git commit -m "feat: add attempts to listening and voice practice"
```

---

### Task 11: Integrate Learning V2 without changing curriculum content

**Files:**

- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Modify: `app/learning-v2/session/[id].tsx`
- Modify: `docs/v2/mockups/02-phrase-builder.html`
- Modify: `docs/v2/mockups/03-listen-choose.html`
- Modify: `docs/v2/mockups/05-listen-build.html`
- Modify: `docs/v2/mockups/06-context-gap.html`
- Modify: `docs/v2/mockups/07-speed-match.html`
- Modify: `docs/v2/mockups/14-repeat-compare.html`
- Modify: `docs/v2/mockups/23-modals-states.html`
- Modify: `docs/v2/mockups/25-learning-v2-motion-catalog.html`
- Modify: `docs/v2/mockups/index.html`
- Create: `tests/learning_v2_session_attempts_runtime_gate.ts`
- Create: `tests/learning_v2_session_attempts_mockup_gate.ts`
- Create: `tests/learning_v2_session_attempts_motion_gate.ts`
- Create: `tests/fixtures/learning-v2/session-attempts/manifest.json`
- Create: `tests/fixtures/learning-v2/session-attempts/02-phrase-builder.png`
- Create: `tests/fixtures/learning-v2/session-attempts/03-listen-choose.png`
- Create: `tests/fixtures/learning-v2/session-attempts/05-listen-build.png`
- Create: `tests/fixtures/learning-v2/session-attempts/06-context-gap.png`
- Create: `tests/fixtures/learning-v2/session-attempts/07-speed-match.png`
- Create: `tests/fixtures/learning-v2/session-attempts/14-repeat-compare.png`
- Create: `tests/fixtures/learning-v2/session-attempts/modal-without-gift.png`
- Create: `tests/fixtures/learning-v2/session-attempts/modal-with-gift.png`
- Create: `tests/fixtures/learning-v2/session-attempts/motion-receipt.json`
- Modify: `docs/v2/HANDOVER.md`

**Step 1: Re-enter the mandatory V2 route**

Fully re-read `docs/v2/СТАРТ В2.md` and all files it currently routes for a runtime/owner-mockup change. Run:

```powershell
npm run learning-v2:lesson1-authoring-preflight
```

Expected before edits: PASS; current English ordinal 1 remains DRAFT; ordinals 2–56 remain forbidden; MANUAL HOLD is unchanged.

**Step 2: Write RED runtime and owner-mockup gates**

The runtime gate requires both live players to:

- mount the shared HUD/modal shell;
- classify only a released pedagogical wrong as attempt-consuming;
- exclude no-speech/technical voice outcomes;
- pause Speed Match timer and voice/audio controls while exhausted;
- preserve `practiceIndex`, current task ID, deterministic answer order, `wrongCount`, and learner attempt/evidence data across recovery;
- avoid changing session content, authoring registry, or ordinals 2–56.

The mockup gate requires the fixed three-heart HUD in all six active HTML modes and both zero-attempt modal variants in `23-modals-states.html`. The motion gate requires canonical loss timing and a reduced-motion final-state example in `25-learning-v2-motion-catalog.html`.

**Step 3: Run RED**

```powershell
npx tsx tests/learning_v2_session_attempts_runtime_gate.ts
npx tsx tests/learning_v2_session_attempts_mockup_gate.ts
npx tsx tests/learning_v2_session_attempts_motion_gate.ts
```

Expected: FAIL because HUD/modal states are absent.

**Step 4: Integrate the runtime shell**

In both live players, call the shared controller only at the final local/released verdict boundary. Do not change activity payloads, distractors, source shards, evidence hashes, content fingerprints, or reward formulas. Pause local audio/voice/timer before showing the modal and restore the exact current activity after recovery.

**Step 5: Update exact owner mockups**

Add the same non-layout-shifting attempt HUD to all six active mode mockups. Add:

- zero attempts without gift;
- zero attempts with gift count;
- insufficient rune state;
- busy purchase/use state;
- reduced-motion final heart state.

Use dark text/icons on lime buttons. Do not add the lost-attempt toast.

Record the owner decision from 2026-08-26 in `docs/v2/HANDOVER.md`: the owner approved the visual direction, renamed the user-facing resource to “попытки”, and explicitly rejected the loss toast.

**Step 6: Generate exact fingerprints and golden evidence**

Create deterministic SHA-256 values in `tests/learning_v2_session_attempts_mockup_gate.ts` from the exact HTML bytes. Capture owner-viewport screenshots into `tests/fixtures/learning-v2/session-attempts/` using the filenames listed above. `manifest.json` binds each PNG to its HTML SHA-256, owner viewport, theme, state, capture time, and image SHA-256. `motion-receipt.json` records the measured shake/scale/fade/modal durations, easing names, platform, renderer, and reduced-motion final state. The gate must reject missing, stale, or unbound evidence.

**Step 7: Run GREEN and V2 gates**

Run the three new tsx gates, then:

```powershell
npm run learning-v2:mode-native-authoring-gate
npm run learning-v2:lesson1-authoring-gate
npm run learning-v2:lesson1-authoring-preflight
```

Expected:

- new attempts gates PASS;
- mode-native and lesson-1 gates PASS;
- preflight still reports ordinal 1 DRAFT and ordinals 2–56 forbidden;
- no content or authoring status changes.

**Step 8: Commit**

Stage only the exact runtime, mockup, gate, golden/receipt, and handover paths touched in this task. Verify the staged list before committing.

```powershell
git diff --cached --name-only
git diff --cached --check
git commit -m "feat: add attempts shell to learning v2"
```

---

### Task 12: Add global wiring, persistence, and lifecycle guards

**Files:**

- Create: `tests/session_attempts_screen_wiring_contract.test.ts`
- Create: `tests/session_attempts_lifecycle.test.tsx`
- Modify: `app/session_attempts/session_attempts_registry.ts`
- Modify: `app/_layout.tsx`
- Modify: `app/phone_state_runtime.ts`

**Step 1: Write RED global guards**

The source contract must assert every route in `SESSION_ATTEMPT_ROUTES` imports/renders the common HUD and modal or delegates to a common player that does. It must fail if:

- a known energy-start learning route is unclassified;
- any Arena route imports attempts UI;
- a registered screen retains a local third-wrong auto-finish branch;
- a registered screen renders a lost-attempt toast;
- a screen creates its own three-heart constants or motion timings.

The lifecycle test covers:

- cold start while `awaiting_recovery`;
- background/foreground while exhausted;
- account switch;
- restart after rune/gift durable commit but before UI response;
- concurrent double tap on rune/gift CTA;
- timer/audio/voice remains stopped beneath the modal;
- exiting preserves prior progress and does not refund energy.

**Step 2: Run RED**

Run:

```text
tests/session_attempts_screen_wiring_contract.test.ts tests/session_attempts_lifecycle.test.tsx
```

Expected: FAIL on any missing lifecycle hook or duplicate local mechanism.

**Step 3: Connect startup/account hydration narrowly**

Use the same owner/account generation boundary that hydrates rune credits. Recover prepared attempt recovery and gift operations after identity is established, then publish the current rune projection and gift count. Never hydrate another account’s session state.

**Step 4: Remove only superseded local attempt code**

Once all integration tests are green, remove Blitz’s duplicated local lives animation/state constants that are now replaced by the common component. Do not remove scoring, timer, result, or any unrelated feature.

**Step 5: Run GREEN and commit**

```powershell
git add -- app/session_attempts/session_attempts_registry.ts app/_layout.tsx app/phone_state_runtime.ts tests/session_attempts_screen_wiring_contract.test.ts tests/session_attempts_lifecycle.test.tsx
git diff --cached --check
git commit -m "test: guard attempts across learning sessions"
```

---

### Task 13: Jarvis, Firestore, and economy contract impact check

**Files:**

- Inspect: `functions/src/jarvis/*_firestore_fetcher.ts`
- Inspect/modify if the semantic grant registry is enumerated: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
- Inspect: `firestore.rules`
- Modify: `tests/economy_constitution_contract.test.ts`
- Create: `tests/session_attempts_data_contract.test.ts`

**Step 1: Write the data-contract test**

Assert:

- no new top-level Firestore collection is introduced;
- persistence uses the existing owner-scoped Phone State/economy journal path;
- no direct write to `users/{uid}.stars`, `users/{uid}.shards`, or a timestamp/LWW rune balance exists;
- new exact-result schema versions and semantic grant kinds are enumerated in one registry;
- no server code rejects ordinary recovery based on a server-side rune balance;
- Arena competitive outcomes remain outside this operation family.

**Step 2: Run RED or evidence-only check**

Run focused Jest:

```text
tests/session_attempts_data_contract.test.ts tests/economy_constitution_contract.test.ts
```

Expected: the new test initially fails until all registries/guards are explicit.

**Step 3: Perform the Jarvis impact check**

Search exact collection/field/semantic-kind reads. If Jarvis does not read the generic Phone State operation payload, record the new schemas in the guard’s intentionally-unread closed-semantics table. If a fetcher does read this operation family, update that exact reader and its guard row in the same commit. Do not add a fake department or surface counts Jarvis cannot derive honestly.

Because no new collection is planned, `firestore.rules` should remain byte-identical. If implementation unexpectedly requires a new collection, stop and obtain a fresh architecture decision before continuing; the approved design explicitly prefers the existing journal.

**Step 4: Run GREEN and commit**

Stage only files actually changed:

```powershell
git add -- tests/session_attempts_data_contract.test.ts tests/economy_constitution_contract.test.ts functions/src/jarvis/jarvis_data_contract_guard.test.ts
git diff --cached --check
git commit -m "test: enforce attempts economy data contract"
```

If the Jarvis guard did not need a change, omit it from `git add`.

---

### Task 14: Focused end-to-end verification and handoff

**Files:**

- Modify only if results require documentation: `docs/superpowers/specs/2026-08-26-session-attempts-and-second-chance-design.md`
- Modify: `docs/v2/HANDOVER.md` only if the final verification status differs from Task 11’s entry
- Create verification artifacts only in the repository’s existing ignored QA/golden locations

**Step 1: Re-run all new deterministic gates**

Run:

```powershell
npx tsx tests/learning_v2_session_attempts_runtime_gate.ts
npx tsx tests/learning_v2_session_attempts_mockup_gate.ts
npx tsx tests/learning_v2_session_attempts_motion_gate.ts
npm run learning-v2:lesson1-authoring-preflight
```

Expected: PASS with no unlock/status drift.

**Step 2: Run the focused Jest bundle under one slot**

Use the heavy-test template and include only:

```text
tests/session_attempts_domain.test.ts
tests/session_attempts_registry.test.ts
tests/session_attempts_hud.test.tsx
tests/session_attempts_recovery_modal.test.tsx
tests/session_attempt_restore_inventory.test.ts
tests/session_attempt_rune_operation.test.ts
tests/session_attempt_recovery.test.ts
tests/session_attempts_screen_wiring_contract.test.ts
tests/session_attempts_lifecycle.test.tsx
tests/fc_blitz_attempts_integration.test.tsx
tests/lesson_session_attempts_integration.test.tsx
tests/lesson_words_attempts_integration.test.tsx
tests/irregular_verbs_attempts_integration.test.tsx
tests/mistake_practice_attempts_integration.test.tsx
tests/fc_listening_attempts_integration.test.tsx
tests/fc_speaking_attempts_integration.test.tsx
tests/level_spin_reward_catalog.test.ts
tests/level_spin_reward_assets.test.ts
tests/level_gift_effect_exactly_once.test.ts
tests/economy_constitution_contract.test.ts
tests/session_attempts_data_contract.test.ts
```

Expected: PASS, no open handles.

**Step 3: Run a manual device journey on the existing development app**

Verify at minimum:

1. ordinary lesson: two wrongs animate, third wrong opens modal;
2. no-gift state: rune and exit actions only;
3. gift state: gift first, runes second, exit third;
4. insufficient runes: only rune CTA blocked;
5. rune recovery: balance decreases once by 25, same question resumes at 3 attempts;
6. gift recovery: count decreases once, same question resumes at 3 attempts;
7. restart during exhausted modal and after durable recovery commit;
8. Blitz timer pauses/resumes at the same remainder;
9. voice no-speech does not remove an attempt; honest wrong does;
10. Learning V2 session-1 preview and all six owner mode mockups;
11. “Твои подарки” shows `Без срока действия` and no countdown;
12. Arena remains unchanged.

Capture screenshots of `3/3`, `2/3`, `1/3`, `0/3`, modal without gift, modal with gift, insufficient runes, and inventory row. Confirm visually that there is no toast.

**Step 4: Inspect the final diff and staged scope**

```powershell
git status --short
git diff --check
git log --oneline -14
```

Review only commits/files from this plan. Preserve unrelated dirty files.

**Step 5: Run the verification-before-completion checklist**

Confirm every acceptance criterion in the design spec with fresh evidence. Do not claim completion while any focused gate, visual state, economy invariant, or V2 status check is unresolved.

**Step 6: Final documentation commit if needed**

If the spec/handover gained only verified status and evidence links:

```powershell
git add -- docs/superpowers/specs/2026-08-26-session-attempts-and-second-chance-design.md docs/v2/HANDOVER.md
git diff --cached --check
git commit -m "docs: record attempts verification evidence"
```

Do not make an empty commit.

---

## Definition of done

- Every registered non-Arena learning route starts at three attempts and renders the shared HUD on the first active frame.
- A unique pedagogical wrong consumes exactly one attempt; technical voice/audio failures consume none.
- The third wrong pauses the active task and opens the approved modal after the heart animation, with no lost-attempt toast.
- Rune and gift recovery are crash-safe, idempotent composites that restore exactly three attempts on the same question.
- Rune recovery costs exactly 25 once, remains client-authoritative/offline-capable, and cannot be overwritten by server snapshot reconciliation.
- “Второй шанс” has measured ~15% Level Spin probability, stacks, syncs, appears in inventory, and never receives a 72-hour expiry.
- Existing energy start cost, rewards, answer evidence, and Arena behavior remain unchanged.
- Learning V2 runtime, six owner mockups, fingerprints, golden screenshots, motion receipt, and preflight are all current without unlocking forbidden sessions.
- All focused tests and manual journeys pass with fresh evidence.
