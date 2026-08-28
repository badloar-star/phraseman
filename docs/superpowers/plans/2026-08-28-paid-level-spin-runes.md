# Paid Level Spin For Runes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an immediate 300-rune level spin whose debit and exact reward are one recoverable composite, preserve free spins, and remove the 160/day and 180/session practice-rune ceilings.

**Architecture:** Extend the existing client-authoritative rune operation journal with a paid-spin exact result, then let the local spin claimer commit the rune projection, immutable operation, reward receipt, reveal state, journal, and sync outbox in one `AsyncStorage.multiSet`. Keep practice settlement as one semantic session receipt; when its total exceeds the star ledger's structural per-record bound, the server deterministically expands it into multiple star-ledger rows inside the same Firestore transaction.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage, expo-image, Firebase callable functions, Firestore transactions, Jest/ts-jest.

**Workspace constraint:** The owner forbids a new worktree/branch without explicit authorization, and this checkout already contains unrelated staged and unstaged work. Do not revert, restage, or commit those changes. Source checkpoints use focused diffs and tests instead of commits unless every touched path is proven clean before the task.

---

## File map

- `modules/phone-state/domains/economy.ts`: canonical paid-spin exact-result schema, parser, fingerprint, and phone-state reducer acceptance.
- `app/level_spin_star_grants.ts`: paid-spin debit preparation and rune projection integration; preserve the current practice/customization work already present in this file.
- `app/local_level_spins.ts`: free and paid claim orchestration, exact local receipt, one composite local commit, and recovery semantics.
- `app/level_spin_local_contract.ts`: distinguish legacy/free receipts from rune-paid receipts without weakening gift/catalog validation.
- `app/phone_state_economy_bridge.ts`: validate and append the paid-spin semantic operation to phone-state persistence.
- `app/level_reward_spin.tsx`: subscribe to canonical rune balance and dispatch free versus paid claims.
- `components/LevelSpinFinishLine.tsx`: approved two-button footer and canonical assets.
- `functions/src/practice_rune_grant.ts`: remove the gameplay ceilings and deterministically chunk only at the structural star-ledger boundary.
- `firestore.rules`: no mutation; focused contract test proves the legacy server-owned daily field remains protected.
- Focused tests listed below: RED/GREEN evidence and regression contracts.

### Task 1: Canonical paid-spin economy receipt

**Files:**
- Modify: `modules/phone-state/domains/economy.ts`
- Create: `tests/paid_level_spin_rune_operation.test.ts`
- Modify: `tests/economy_constitution_contract.test.ts`

- [ ] **Step 1: Write failing schema and reducer tests**

Add tests that construct this exact semantic result and assert parse/fingerprint/reducer acceptance:

```ts
const exact = {
  schemaVersion: 'client-paid-level-spin-rune-operation.v1',
  operationId: `paid_level_spin:${requestId}`,
  ownerStableId: 'owner-a',
  accountGeneration: 7,
  requestId,
  giftId: 'energy_full',
  catalogVersion: 6,
  runeDelta: -300,
  price: 300,
  balanceBefore: 900,
  balanceAfter: 600,
  reason: 'paid_level_spin',
  createdAtMs: 1_777_777_777,
  requestFingerprint: '',
} as const;
```

Cover rejection for wrong price, mismatched balance arithmetic, unknown gift/catalog pair, reused operation id with altered gift, wrong owner, and standalone `delta: -300` outside the exact result.

- [ ] **Step 2: Run RED**

Run under the shared semaphore:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest paid spin economy RED"
try { npx jest tests/paid_level_spin_rune_operation.test.ts tests/economy_constitution_contract.test.ts --runInBand } finally { & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release }
```

Expected: FAIL because `PaidLevelSpinRuneOperationV1`, its parser/fingerprint, and reducer kind do not exist.

- [ ] **Step 3: Implement the canonical type and validation**

Add an exact-result type with fixed price and reason, plus helpers:

```ts
export type PaidLevelSpinRuneOperationV1 = Readonly<{
  schemaVersion: 'client-paid-level-spin-rune-operation.v1';
  operationId: string;
  ownerStableId: string;
  accountGeneration: number;
  requestId: string;
  giftId: string;
  catalogVersion: number;
  runeDelta: -300;
  price: 300;
  balanceBefore: number;
  balanceAfter: number;
  reason: 'paid_level_spin';
  createdAtMs: number;
  requestFingerprint: string;
}>;

export function paidLevelSpinOperationId(requestId: string): string | null;
export function parsePaidLevelSpinRuneOperation(input: unknown): PaidLevelSpinRuneOperationV1 | null;
export async function paidLevelSpinRuneFingerprint(
  input: Omit<PaidLevelSpinRuneOperationV1, 'schemaVersion' | 'requestFingerprint'>,
): Promise<string>;
export async function hasValidPaidLevelSpinRuneFingerprint(input: unknown): Promise<boolean>;
```

Register only `paid_level_spin_rune_purchase` in the zero-outer-delta semantic reducer. The exact result itself carries `runeDelta: -300`; no standalone debit API is introduced.

- [ ] **Step 4: Run GREEN and inspect the focused diff**

Run the same command and expect both suites PASS. Then run:

```powershell
git diff --check -- modules/phone-state/domains/economy.ts tests/paid_level_spin_rune_operation.test.ts tests/economy_constitution_contract.test.ts
```

### Task 2: Prepare and persist one local paid-spin composite

**Files:**
- Modify: `app/level_spin_star_grants.ts`
- Modify: `app/local_level_spins.ts`
- Modify: `app/level_spin_local_contract.ts`
- Modify: `app/phone_state_economy_bridge.ts`
- Create: `tests/paid_level_spin_local_composite.test.ts`

- [ ] **Step 1: Write failing local-composite tests**

Use the existing AsyncStorage/account-generation test harness. Assert:

```ts
const receipt = await claimLocalLevelSpinWithRunes();
expect(receipt.paymentKind).toBe('runes');
expect(receipt.runePrice).toBe(300);
expect(await readLocalLevelSpinBalance()).toBe(freeCreditsBefore);
expect((await getRunesBalance()).balance).toBe(runesBefore - 300);
expect(receipt.baseGiftId).toBe(parsePaidOperation().giftId);
```

Add separate tests for insufficient balance (zero writes), same active receipt on retry (one debit), account-generation change (zero writes), storage fault before the composite write (zero visible debit), and restart recovery (same request id/gift, no second debit).

- [ ] **Step 2: Run RED**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest paid spin composite RED"
try { npx jest tests/paid_level_spin_local_composite.test.ts --runInBand } finally { & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release }
```

Expected: FAIL because the paid claim and receipt fields do not exist.

- [ ] **Step 3: Extend the local receipt as a strict union**

Keep schema-v1/v2 free receipts valid. Extract the shared fields and add a schema-v3 rune-paid branch with:

```ts
type LocalLevelSpinReceiptBase = Readonly<{
  ok: true;
  stableUid: string;
  requestId: string;
  baseGiftId: string;
  premiumGiftId: null;
  createdAtMs: number;
  expiresAtMs: number;
  balanceAfter: number;
  status: 'awaiting_ack' | 'acknowledged';
  revealState?: 'pending' | 'acknowledged';
  deliveries: { base: { state: 'unclaimed' } };
  catalogVersion: 1 | 2 | 3 | 4 | 5 | 6;
  localOnly: true;
}>;

type FreeLocalLevelSpinReceipt = LocalLevelSpinReceiptBase & Readonly<{
  schemaVersion: 1 | 2;
  paymentKind?: 'free_credit';
  creditId: string;
  level: number;
  kind: 'standard' | 'milestone';
}>;

type PaidLocalLevelSpinReceipt = LocalLevelSpinReceiptBase & Readonly<{
  schemaVersion: 3;
  paymentKind: 'runes';
  runeOperationId: string;
  runePrice: 300;
  creditId: `paid_level_spin:${string}`;
  level: 0;
  kind: 'standard';
}>;

export type LocalLevelSpinReceipt = FreeLocalLevelSpinReceipt | PaidLocalLevelSpinReceipt;
```

`localLevelSpinReceiptToInventory` must accept `level: 0` only for that paid branch. Free receipt validation remains byte-for-byte strict. `releaseUndeliveredLocalLevelSpin` must never mint a free credit for a paid receipt; it leaves the exact paid receipt pending for recovery.

- [ ] **Step 4: Add paid debit preparation to the sole rune writer**

Add:

```ts
export const PAID_LEVEL_SPIN_RUNE_PRICE = 300 as const;

export async function preparePaidLevelSpinRunePurchase(input: Readonly<{
  token: AccountGenerationToken;
  requestId: string;
  giftId: string;
  catalogVersion: number;
  createdAtMs: number;
}>, lease?: AccountTransitionLockLease): Promise<Readonly<{
  duplicate: boolean;
  operation: PaidLevelSpinRuneOperationV1;
  balanceBefore: number;
  balanceAfter: number;
  durableWrites: readonly (readonly [string, string])[];
}>>;
```

It reads `visibleProjection`, fails with `paid_level_spin_runes_insufficient`, binds the exact gift to the fingerprint, and returns the operation/projection writes without publishing a partial state.

- [ ] **Step 5: Commit the local spin and rune writes together**

Implement `claimLocalLevelSpinWithRunes()` alongside `claimLocalLevelSpin()`. Under one account-transition critical section it recovers an active receipt, selects the gift, prepares the debit, and performs one `AsyncStorage.multiSet` containing:

```ts
export function paidLevelSpinOutboxKey(ownerStableId: string): string {
  return `paid_level_spin_outbox_v1:${encodeURIComponent(ownerStableId)}`;
}

[
  ...paidRunePreparation.durableWrites,
  [paidLevelSpinOutboxKey(owner), JSON.stringify(nextOutbox)],
  [localLevelSpinStateKey(owner), JSON.stringify(nextState)],
  [LEVEL_SPIN_BALANCE_CACHE_KEY, JSON.stringify({ owner, balance: current.credits.length })],
  [LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify(nextGiftJournal)],
  [LEVEL_SPIN_PENDING_REVEAL_KEY, JSON.stringify({ owner, receipt })],
]
```

After the commit, hydrate/publish the rune projection, emit balance events, and start best-effort phone-state sync. Validate `paid_level_spin_rune_purchase` in `commitPhoneStateNonMonetaryEconomyGrant` before append.

- [ ] **Step 6: Run GREEN and the existing free-spin regressions**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest paid and free spin composite GREEN"
try { npx jest tests/paid_level_spin_local_composite.test.ts tests/local_level_spins.test.ts tests/local_spin_energy_reload_deadlock_contract.test.ts tests/local_level_spin_storage_integrity.test.ts --runInBand } finally { & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release }
```

Expected: PASS with no free-credit regression.

### Task 3: Approved two-button spin UI

**Files:**
- Modify: `app/level_reward_spin.tsx`
- Modify: `components/LevelSpinFinishLine.tsx`
- Create: `tests/paid_level_spin_ui_contract.test.ts`

- [ ] **Step 1: Write failing UI contract tests**

Assert the paid button appears before the free button, uses the rune asset and price 300, and the free button uses `spinTicketImageSource()`:

```ts
expect(paidIndex).toBeLessThan(freeIndex);
expect(source).toContain("require('../assets/images/level-spin-rewards/stars_10.webp')");
expect(source).toContain('spinTicketImageSource()');
expect(source).toContain('PAID_LEVEL_SPIN_RUNE_PRICE');
expect(source).toContain('claimLocalLevelSpinWithRunes');
```

Also assert dark text on the gold surface, both 56 px touch targets, localized accessibility text, disabled paid state below 300, and no confirmation-modal symbol or call.

- [ ] **Step 2: Run RED**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest paid spin UI RED"
try { npx jest tests/paid_level_spin_ui_contract.test.ts --runInBand } finally { & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release }
```

Expected: FAIL because the second action/assets are absent.

- [ ] **Step 3: Implement the screen state and footer**

`LevelRewardSpinScreen` initializes from `peekRunes()`, refreshes with `getRunesBalance()`, subscribes with `subscribeRunesSnapshot`, and adds `runPaid()` using the existing busy/account-generation gates. Pass `runeBalance`, `paidSpinPrice`, and `onPaidSpin` to `LevelSpinFinishLine`.

In the ready footer render:

```tsx
<Pressable testID="level-spin-paid-start" disabled={paidDisabled} onPress={onPaidSpin}>
  <Image source={RUNE_ASSET} style={styles.ctaAsset} contentFit="contain" />
  <Text style={styles.paidSpinCtaText}>{paidLabel}</Text>
  <Text style={styles.paidSpinCtaText}>{paidSpinPrice}</Text>
</Pressable>
<Pressable testID="level-spin-start" disabled={freeDisabled} onPress={handleCtaPress}>
  {spinAsset ? <Image source={spinAsset} style={styles.ctaAsset} contentFit="contain" /> : null}
  <Text style={styles.spinCtaText}>{ctaLabel}</Text>
</Pressable>
```

Use the approved gold surface with `#0F0D13` foreground. Hide the paid action during result handling so existing `ЕЩЁ СПИН`/`ЗАКРЫТЬ` semantics remain unchanged.

- [ ] **Step 4: Run GREEN plus existing motion/entry contracts**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest paid spin UI GREEN"
try { npx jest tests/paid_level_spin_ui_contract.test.ts tests/level_reward_spin_motion.test.ts tests/spin_sound_events_contract.test.ts tests/home_spin_entry_contract.test.ts tests/stats_spin_entry_contract.test.ts --runInBand } finally { & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release }
```

### Task 4: Remove practice-rune gameplay ceilings without weakening ledger safety

**Files:**
- Modify: `functions/src/practice_rune_grant.ts`
- Modify: `functions/src/practice_rune_grant.test.ts`
- Modify: `app/level_spin_star_grants.ts`
- Create: `tests/practice_rune_no_caps_contract.test.ts`

- [ ] **Step 1: Replace cap assertions with failing no-cap/chunk tests**

Delete assertions that require 160/day or reject 181/session. Add tests that:

```ts
expect(parsePracticeRuneComposite(makeComposite({ amount: 181 }))).not.toBeNull();
expect(parsePracticeRuneComposite(makeComposite({ amount: 12_345 }))).not.toBeNull();
expect(splitPracticeRuneStarOperations(makeComposite({ amount: 12_345 })))
  .toEqual(expect.arrayContaining([
    expect.objectContaining({ delta: 5_000 }),
    expect.objectContaining({ delta: 5_000 }),
    expect.objectContaining({ delta: 2_345 }),
  ]));
```

The integration transaction test must prove all chunks are applied in one call and the aggregate receipt equals 12,345. A source contract test must prove `practice_runes_daily`, `practice_rune_daily_cap_reached`, and both gameplay cap constants are absent from `practice_rune_grant.ts`, while `firestore.rules` still protects the legacy field.

- [ ] **Step 2: Run RED**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest practice rune caps RED"
try {
  npx jest tests/practice_rune_no_caps_contract.test.ts --runInBand
  if ($LASTEXITCODE -eq 0) { Push-Location functions; try { npx jest src/practice_rune_grant.test.ts --runInBand } finally { Pop-Location } }
} finally { & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release }
```

Expected: FAIL on amounts above 180 and missing chunk helper.

- [ ] **Step 3: Remove the cap-specific state and add deterministic structural chunks**

Remove `PRACTICE_RUNE_MAX_PER_SESSION`, `PRACTICE_RUNE_MAX_PER_DAY`, `practiceRuneDayKey`, `readPracticeRuneDaily`, the daily rejection, and the transaction write to `practice_runes_daily`.

Add:

```ts
export function splitPracticeRuneStarOperations(
  composite: PracticeRuneComposite,
): readonly StarOpRequest[] {
  const chunkCount = Math.ceil(composite.amount / STAR_OP_MAX_ABS_DELTA);
  const chunks: StarOpRequest[] = [];
  let remaining = composite.amount;
  for (let index = 0; remaining > 0; index += 1) {
    const delta = Math.min(remaining, STAR_OP_MAX_ABS_DELTA);
    chunks.push(Object.freeze({
      opId: chunkCount === 1
        ? composite.operationId
        : `practice_rune:${composite.requestFingerprint.slice(0, 40)}_${index + 1}`,
      delta,
      reason: 'practice_session',
      sourceKind: `practice_${composite.activity}`,
      sourceId: `${composite.sessionKey}.${composite.completionOrdinal}.${index + 1}`,
      earnedAtMs: composite.createdAtMs,
      meta: {
        clientFingerprint: composite.requestFingerprint,
        settlementOperationId: composite.operationId,
        chunkIndex: index + 1,
        chunkCount,
      },
    }));
    remaining -= delta;
  }
  return Object.freeze(chunks);
}
```

Chunk ids derive from the immutable request fingerprint plus index, fit the star-ledger id regex, and are stable across retry. Call `prepareStarOperations` once with the full chunk array inside the existing transaction. Validate aggregate receipts and return the post-transaction balance/earned total. Client practice parsing in `app/level_spin_star_grants.ts` accepts any positive safe integer; it keeps exact fingerprint and projection arithmetic checks.

- [ ] **Step 4: Run GREEN**

Run the RED command again. Expected: PASS, no writes to `practice_runes_daily`, exact aggregate award preserved.

### Task 5: Contract integration and final verification

**Files:**
- Modify: `tests/economy_constitution_contract.test.ts`
- Verify only: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
- Verify only: `firestore.rules`

- [ ] **Step 1: Run the paid-spin and no-cap focused matrix**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest paid spin final matrix"
try {
  npx jest tests/paid_level_spin_rune_operation.test.ts tests/paid_level_spin_local_composite.test.ts tests/paid_level_spin_ui_contract.test.ts tests/practice_rune_no_caps_contract.test.ts tests/economy_constitution_contract.test.ts tests/local_level_spins.test.ts --runInBand
  if ($LASTEXITCODE -eq 0) {
    Push-Location functions
    try { npx jest src/practice_rune_grant.test.ts src/jarvis/jarvis_data_contract_guard.test.ts --runInBand } finally { Pop-Location }
  }
} finally {
  & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release
}
```

Expected: all selected suites PASS, zero failing tests.

- [ ] **Step 2: Run the repository TypeScript validation under the shared slot**

```powershell
New-Item -ItemType Directory -Force '.codex-tmp/paid-spin-runes' | Out-Null
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "tsc paid spin runes"
try {
  npm run typecheck *> '.codex-tmp/paid-spin-runes/tsc.log'
  $typecheckExit = $LASTEXITCODE
  Get-Content '.codex-tmp/paid-spin-runes/tsc.log' -Tail 40
  if ($typecheckExit -ne 0) { throw "typecheck failed with exit $typecheckExit" }
} finally {
  & 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release
}
```

Expected: exit 0. The full log remains at `.codex-tmp/paid-spin-runes/tsc.log`.

- [ ] **Step 3: Inspect exact diffs and guard against collateral edits**

```powershell
git diff --check -- app/level_reward_spin.tsx app/level_spin_local_contract.ts app/local_level_spins.ts app/level_spin_star_grants.ts app/phone_state_economy_bridge.ts components/LevelSpinFinishLine.tsx modules/phone-state/domains/economy.ts functions/src/practice_rune_grant.ts functions/src/practice_rune_grant.test.ts tests/paid_level_spin_rune_operation.test.ts tests/paid_level_spin_local_composite.test.ts tests/paid_level_spin_ui_contract.test.ts tests/practice_rune_no_caps_contract.test.ts tests/economy_constitution_contract.test.ts
git diff --stat -- app/level_reward_spin.tsx app/level_spin_local_contract.ts app/local_level_spins.ts app/level_spin_star_grants.ts app/phone_state_economy_bridge.ts components/LevelSpinFinishLine.tsx modules/phone-state/domains/economy.ts functions/src/practice_rune_grant.ts
```

Confirm no Arena files, reward weights, free-spin credit rules, App Check settings, admin surfaces, or unrelated staged Learning V2 files changed.

- [ ] **Step 4: Leave the shared checkout safe**

Do not stage or commit source files that already contained unrelated user edits. Report the implementation paths, focused test evidence, any remaining unrelated failures, and the unchanged pre-existing staged set.
