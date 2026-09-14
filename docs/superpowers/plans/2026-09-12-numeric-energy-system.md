# Numeric Energy System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five-slot raster energy economy with one animated 0–100 numeric system, fixed activity prices, midnight overcharge gifts, proportional video recovery, Plus Pro infinity, and shared energy UI on every production surface.

**Architecture:** A pure versioned energy domain owns constants, settlement, migration, pricing, gift effects, and visual transactions. `EnergyContext` remains the single runtime coordinator and publishes durable ledger projections to one shared numeric HUD; activity starts resolve their cost from a typed catalog and atomically bind each debit to the exact session or match entitlement. The `numeric_energy_v2` rollout is coordinated across readers, writers, rewards, and UI so no build mixes the old 0–5 scale with the new 0–100 scale.

**Tech Stack:** TypeScript, React Native, Expo Router, AsyncStorage, React Native Reanimated, Jest, React Native Testing Library, project `PressableHybrid`/hybrid modal primitives.

---

## Execution boundaries

- Implement in the current checkout. Project rules prohibit creating a branch, worktree, fork, or delegated coding task without the owner's explicit request.
- Preserve the dirty worktree. Stage and commit only the exact files named in the active task; never use `git add .`.
- Before Task 13 touches Learning V2, fully reread `docs/v2/СТАРТ В2.md` and its required route, run the prescribed drift check, and continue only with `ON TRACK`.
- Do not bypass Git hooks. At plan-writing time commits are blocked by unrelated Learning V2 bundled-audio guard findings in `app/learning_v2_course_released_session_client_v3.ts` and `app/learning_v2_course_session_audio_preload_v1.ts`. The owning task must restore those contracts before the commit steps below are attempted; this energy work must not repair or overwrite those unrelated edits.
- Every Jest, TypeScript, build, or other heavy command must acquire and release the shared semaphore. The exact PowerShell pattern used below is mandatory.
- The pearl refill remains a client-authoritative durable composite operation. No standalone pearl debit or direct server balance writer may be added.
- Arena files are protected. Modify only the exact energy lines described here; never restore or overwrite their current contents from another revision.
- Keep the existing reward IDs (`energy_full`, `energy_plus1`, `energy_plus2`, `energy_plus3`) as storage/receipt identities. Only their effects and presentation change.

## File map

### New domain files

- `app/energy_contract.ts` — fixed capacities, rates, activity keys, typed prices, and visual-state resolver.
- `app/energy_state_v2.ts` — pure V2 payload validation, settlement, time-to-threshold, and legacy migration.
- `app/energy_gift_effects.ts` — pure +20/+40/+60/full/expiry stacking rules.
- `app/energy_visual_transactions.ts` — typed deduplicated visual transaction bus.
- `app/energy_copy.ts` — nine-locale energy copy and pluralized pearl/action labels.

### New shared UI files

- `components/EnergyBoltIcon.tsx` — vector bolt, no raster dependency.
- `components/AnimatedEnergyNumber.tsx` — UI-thread integer-by-integer balance renderer.
- `components/EnergyHudPill.tsx` — the only compact header indicator.
- `components/EnergyInfoPopover.tsx` — anchored information surface with bottom-sheet fallback.
- `components/InsufficientEnergySheet.tsx` — shared activity-aware recovery/refill surface.
- `components/EnergySpendCue.tsx` — local `−N` feedback at the pressed CTA.
- `components/EnergyRewardPresentation.tsx` — full/+20/+40/+60/turbo/free-window reward artwork.

### Retired files and assets

- Delete `components/EnergySpendFlightHost.tsx` after all old flight events are gone.
- Delete `components/EnergyIcon.tsx` and `components/energyIconLayout.ts` after their last consumers and tests are migrated.
- Delete `assets/images/energy/energy-start-cost.webp`.
- Delete `assets/images/level-spin-rewards/energy_full.webp`.
- Delete `assets/images/level-spin-rewards/energy_plus2.webp`.
- Delete `assets/images/level-spin-rewards/energy_plus3.webp`.

## Shared test command

For each Jest step, substitute the listed test paths into this exact command:

```powershell
bash .claude/semaphore/slot.sh acquire "jest numeric energy"; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; try { npx jest --runInBand --no-cache --runTestsByPath <TEST_PATHS>; if ($LASTEXITCODE -ne 0) { throw "jest failed" } } finally { bash .claude/semaphore/slot.sh release }
```

Expected on a red step: Jest reports the named missing export or changed assertion. Expected on a green step: every listed suite prints `PASS`, and the semaphore release prints a successful release.

---

### Task 1: Freeze the numeric economy and price catalog

**Files:**
- Create: `app/energy_contract.ts`
- Create: `tests/energy_contract.test.ts`
- Modify: `app/remote_flags.ts:213-219,396-399,596-598`
- Modify: `constants/theme.ts` at `getMaxEnergyForLevel`
- Modify: `tests/energy_level_capacity.test.ts`
- Modify: `tests/energy_free_remote_gate_contract.test.ts`

- [ ] **Step 1: Write the failing fixed-contract tests**

```ts
import {
  ENERGY_BASE_CAPACITY,
  ENERGY_BONUS_CAPACITY_LIMIT,
  ENERGY_PASSIVE_UNIT_MS,
  ENERGY_VIDEO_UNIT_MS,
  activityEnergyCost,
  type EnergyActivityKey,
} from '../app/energy_contract';

describe('numeric energy contract', () => {
  it('uses 100 base, 300 active cap, +1/6m passive and +1/36s video', () => {
    expect(ENERGY_BASE_CAPACITY).toBe(100);
    expect(ENERGY_BONUS_CAPACITY_LIMIT).toBe(200);
    expect(ENERGY_PASSIVE_UNIT_MS).toBe(360_000);
    expect(ENERGY_VIDEO_UNIT_MS).toBe(36_000);
  });

  it.each<[EnergyActivityKey, number]>([
    ['flashcards', 10], ['lesson_words', 10], ['irregular_verbs', 10],
    ['preposition_drill', 10], ['mistake_practice', 10],
    ['classic_lesson', 20], ['learning_v2_session', 20], ['ai_dialog', 20],
    ['personal_plan_exercise', 20], ['diagnostic_test', 20], ['level_exam', 20],
    ['arena_match', 25], ['theory', 0], ['reading', 0], ['video', 0], ['max_call', 0],
  ])('%s costs %i', (key, cost) => expect(activityEnergyCost(key)).toBe(cost));
});
```

Add a rollout assertion that `numeric_energy_v2` exists as a boolean remote key and defaults to `false` until Task 17 performs the coordinated activation.

- [ ] **Step 2: Run the test and verify it fails**

Run the shared Jest command with `tests/energy_contract.test.ts tests/energy_level_capacity.test.ts tests/energy_free_remote_gate_contract.test.ts`.

Expected: FAIL because `app/energy_contract.ts` does not exist and the existing capacity tests still expect 5/6.

- [ ] **Step 3: Add the typed contract and remove level-based capacity**

```ts
export const ENERGY_SCHEMA_VERSION = 2 as const;
export const ENERGY_BASE_CAPACITY = 100 as const;
export const ENERGY_BONUS_CAPACITY_LIMIT = 200 as const;
export const ENERGY_ACTIVE_CAPACITY_LIMIT = 300 as const;
export const ENERGY_PASSIVE_UNIT_MS = 6 * 60 * 1000;
export const ENERGY_VIDEO_UNIT_MS = 36 * 1000;
export const ENERGY_MICRO_UNITS_PER_UNIT = 1_000_000 as const;

export type EnergyActivityKey =
  | 'flashcards' | 'lesson_words' | 'irregular_verbs' | 'preposition_drill' | 'mistake_practice'
  | 'classic_lesson' | 'learning_v2_session' | 'ai_dialog' | 'personal_plan_exercise'
  | 'diagnostic_test' | 'level_exam' | 'arena_match'
  | 'theory' | 'reading' | 'video' | 'max_call';

const ENERGY_ACTIVITY_PRICES: Readonly<Record<EnergyActivityKey, 0 | 10 | 20 | 25>> = Object.freeze({
  flashcards: 10,
  lesson_words: 10,
  irregular_verbs: 10,
  preposition_drill: 10,
  mistake_practice: 10,
  classic_lesson: 20,
  learning_v2_session: 20,
  ai_dialog: 20,
  personal_plan_exercise: 20,
  diagnostic_test: 20,
  level_exam: 20,
  arena_match: 25,
  theory: 0,
  reading: 0,
  video: 0,
  max_call: 0,
});

export function activityEnergyCost(activity: EnergyActivityKey): 0 | 10 | 20 | 25 {
  return ENERGY_ACTIVITY_PRICES[activity];
}
```

Add the `numeric_energy_v2` boolean key, default it to `false`, and export `isNumericEnergyV2Enabled()`. Define the new fixed values in `energy_contract.ts`, but keep the legacy runtime remote defaults and `getMaxEnergyForLevel` behavior behind the disabled branch until Task 17. When the flag is enabled, resolve `max_energy` as 100, `energy_recovery_interval_ms` as `ENERGY_PASSIVE_UNIT_MS`, and ignore the level slot bonus.

- [ ] **Step 4: Update capacity guards and run green tests**

Add enabled-flag assertions for exactly 100 at every level and a remote snapshot that cannot change it away from 100; retain an explicit disabled-flag compatibility assertion for the old runtime. Run the shared Jest command from Step 2.

Expected: PASS for all three suites.

- [ ] **Step 5: Commit the contract**

```powershell
git add app/energy_contract.ts app/remote_flags.ts constants/theme.ts tests/energy_contract.test.ts tests/energy_level_capacity.test.ts tests/energy_free_remote_gate_contract.test.ts
git commit -m "feat: define numeric energy contract"
```

---

### Task 2: Implement V2 settlement and one-time legacy migration

**Files:**
- Create: `app/energy_state_v2.ts`
- Create: `tests/energy_state_v2.test.ts`
- Modify: `app/energy_system.ts:10-368`
- Modify: `app/energy_peek_cache.ts`
- Modify: `tests/energy_system.test.ts`

- [ ] **Step 1: Write failing pure migration and settlement tests**

```ts
import { migrateLegacyEnergyState, settleEnergyState, timeUntilEnergyAtLeast } from '../app/energy_state_v2';

const NOW = 1_800_000_000_000;

describe('energy state v2', () => {
  it('migrates whole and partial legacy slots without losing progress', () => {
    expect(migrateLegacyEnergyState({ current: 3, lastRecoveryTime: NOW - 15 * 60_000 }, NOW))
      .toMatchObject({ schemaVersion: 2, current: 70, recoveryCreditMicrounits: 0 });
  });

  it('carries a non-integer legacy fraction into microunits', () => {
    expect(migrateLegacyEnergyState({ current: 3, lastRecoveryTime: NOW - 60_000 }, NOW))
      .toMatchObject({ schemaVersion: 2, current: 60, recoveryCreditMicrounits: 666_666 });
  });

  it('settles +1 every six minutes and stops at the active cap', () => {
    const settled = settleEnergyState({
      schemaVersion: 2, current: 86, lastSettledAt: NOW,
      recoveryCreditMicrounits: 0, recoveryDivisionRemainder: 0,
    }, { nowMs: NOW + 14 * 6 * 60_000, unitMs: 6 * 60_000,
      bonusEnergy: 0, bonusCapacity: 0, bonusExpiresAt: 0 });
    expect(settled.state.current).toBe(100);
  });

  it('calculates exact time to an activity threshold', () => {
    expect(timeUntilEnergyAtLeast({
      current: 8,
      required: 20,
      unitMs: 360_000,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    }))
      .toBe(12 * 360_000);
  });
});
```

- [ ] **Step 2: Run the new suite and verify it fails**

Run the shared Jest command with `tests/energy_state_v2.test.ts tests/energy_system.test.ts`.

Expected: FAIL because the V2 module is missing and `energy_system` still returns legacy fields.

- [ ] **Step 3: Implement the pure V2 state**

```ts
import {
  ENERGY_BASE_CAPACITY,
  ENERGY_MICRO_UNITS_PER_UNIT,
  ENERGY_PASSIVE_UNIT_MS,
} from './energy_contract';

export type EnergyStateV2 = Readonly<{
  schemaVersion: 2;
  current: number;
  lastSettledAt: number;
  recoveryCreditMicrounits: number;
  recoveryDivisionRemainder: number;
}>;

export type SettledEnergy = Readonly<{
  state: EnergyStateV2;
  bonusEnergy: number;
  bonusCapacity: number;
  bonusExpiresAt: number;
}>;

export function migrateLegacyEnergyState(
  legacy: Readonly<{ current: number; lastRecoveryTime: number }>, nowMs: number,
): EnergyStateV2 {
  const legacyUnitMs = 30 * 60_000;
  const safeCurrent = Math.max(0, Math.min(5, Math.floor(legacy.current)));
  const elapsed = Math.max(0, nowMs - legacy.lastRecoveryTime);
  const completed = Math.min(5 - safeCurrent, Math.floor(elapsed / legacyUnitMs));
  const settledLegacy = safeCurrent + completed;
  const elapsedWithinSlot = settledLegacy >= 5 ? 0 : elapsed - completed * legacyUnitMs;
  const scaledNumerator = elapsedWithinSlot * 20;
  const wholeProgress = Math.floor(scaledNumerator / legacyUnitMs);
  const fractionalNumerator = scaledNumerator % legacyUnitMs;
  const microNumerator = fractionalNumerator * ENERGY_MICRO_UNITS_PER_UNIT;
  return {
    schemaVersion: 2,
    current: Math.min(ENERGY_BASE_CAPACITY, settledLegacy * 20 + wholeProgress),
    lastSettledAt: nowMs,
    recoveryCreditMicrounits: Math.floor(microNumerator / legacyUnitMs),
    recoveryDivisionRemainder: Math.floor(
      ((microNumerator % legacyUnitMs) * ENERGY_PASSIVE_UNIT_MS) / legacyUnitMs,
    ),
  };
}

export function settleEnergyState(
  state: EnergyStateV2,
  input: Readonly<{
    nowMs: number;
    unitMs: number;
    bonusEnergy: number;
    bonusCapacity: number;
    bonusExpiresAt: number;
  }>,
): SettledEnergy {
  const elapsed = Math.max(0, input.nowMs - state.lastSettledAt);
  const earnedNumerator = elapsed * ENERGY_MICRO_UNITS_PER_UNIT + state.recoveryDivisionRemainder;
  const earnedMicrounits = Math.floor(earnedNumerator / input.unitMs);
  const divisionRemainder = earnedNumerator % input.unitMs;
  const totalMicrounits = state.recoveryCreditMicrounits + earnedMicrounits;
  const recovered = Math.floor(totalMicrounits / ENERGY_MICRO_UNITS_PER_UNIT);
  const activeBonusCapacity = input.bonusExpiresAt > input.nowMs
    ? Math.max(0, Math.min(200, input.bonusCapacity))
    : 0;
  const activeBonusEnergy = Math.min(activeBonusCapacity, Math.max(0, input.bonusEnergy));
  const nextBase = Math.min(ENERGY_BASE_CAPACITY, state.current + recovered);
  const baseRecovered = nextBase - state.current;
  const nextBonus = Math.min(activeBonusCapacity, activeBonusEnergy + recovered - baseRecovered);
  const full = nextBase + nextBonus >= ENERGY_BASE_CAPACITY + activeBonusCapacity;
  return {
    state: {
      ...state,
      current: nextBase,
      lastSettledAt: input.nowMs,
      recoveryCreditMicrounits: full ? 0 : totalMicrounits % ENERGY_MICRO_UNITS_PER_UNIT,
      recoveryDivisionRemainder: full ? 0 : divisionRemainder,
    },
    bonusEnergy: nextBonus,
    bonusCapacity: activeBonusCapacity,
    bonusExpiresAt: activeBonusCapacity > 0 ? input.bonusExpiresAt : 0,
  };
}

export type EnergyRateSegment = Readonly<{ endAtMs: number; unitMs: number }>;

export function settleEnergyAcrossRateSegments(
  opening: SettledEnergy,
  segments: readonly EnergyRateSegment[],
): SettledEnergy {
  return segments.reduce((current, segment) => settleEnergyState(current.state, {
    nowMs: segment.endAtMs,
    unitMs: segment.unitMs,
    bonusEnergy: current.bonusEnergy,
    bonusCapacity: current.bonusCapacity,
    bonusExpiresAt: current.bonusExpiresAt,
  }), opening);
}

export function timeUntilEnergyAtLeast(input: Readonly<{
  current: number;
  required: number;
  unitMs: number;
  recoveryCreditMicrounits: number;
  recoveryDivisionRemainder: number;
}>): number {
  const missing = Math.max(0, input.required - input.current);
  if (missing === 0) return 0;
  const remainingNumerator =
    missing * ENERGY_MICRO_UNITS_PER_UNIT * input.unitMs
    - Math.max(0, input.recoveryCreditMicrounits) * input.unitMs
    - Math.max(0, input.recoveryDivisionRemainder);
  return Math.max(0, Math.ceil(remainingNumerator / ENERGY_MICRO_UNITS_PER_UNIT));
}

export function normalizeEnergyMicrounits(value: number): number {
  return Math.max(0, Math.min(ENERGY_MICRO_UNITS_PER_UNIT - 1, Math.floor(value)));
}
```

Validate every integer, reject malformed legacy timestamps through the existing fail-safe path, and split settlement at timed recovery-effect expiry boundaries so boost time is applied only while the effect is active. The code above establishes the exact micro-unit arithmetic; the production function must call the same arithmetic once for each `[start, effectExpiry]` and `[effectExpiry, now]` segment.

- [ ] **Step 4: Wire V2 reads/writes and prove idempotent migration**

In `app/energy_system.ts`, replace `EnergyState` with `EnergyStateV2`, read `schemaVersion`, migrate only legacy payloads, and persist the migrated payload while holding `withStorageLock`. Update admin fill/drain, add, reset, countdown, active-cap recovery, and peek cache to use `lastSettledAt` and fixed base 100. Add a test that reading the same migrated state twice returns the same value and does not multiply by 20 again.

Run the shared Jest command with `tests/energy_state_v2.test.ts tests/energy_system.test.ts tests/energy_bonus_runtime_contract.test.ts`.

Expected: PASS and no assertion containing a 5/6 capacity remains in these suites.

- [ ] **Step 5: Commit V2 storage**

```powershell
git add app/energy_state_v2.ts app/energy_system.ts app/energy_peek_cache.ts tests/energy_state_v2.test.ts tests/energy_system.test.ts tests/energy_bonus_runtime_contract.test.ts
git commit -m "feat: migrate energy storage to v2"
```

---

### Task 3: Scale bonus capacity, expiry, and full-charge gift math

**Files:**
- Create: `app/energy_gift_effects.ts`
- Create: `tests/energy_gift_effects.test.ts`
- Modify: `app/bonus_energy_store.ts`
- Modify: `app/spin_gift_storage_integrity.ts`
- Modify: `tests/bonus_energy_store.test.ts`
- Modify: `tests/bonus_energy_capacity_contract.ts`

- [ ] **Step 1: Write failing gift-effect tests**

```ts
import { applyEnergyCapacityGift, fillEnergyToActiveCap, expireEnergyGift } from '../app/energy_gift_effects';

const MIDNIGHT = 1_800_028_800_000;

describe('numeric energy gifts', () => {
  it.each([[1, 20, 120], [2, 40, 140], [3, 60, 160]])(
    'energy_plus%i adds %i and fills to %i', (legacyAmount, added, expected) => {
      expect(applyEnergyCapacityGift({ base: 34, bonus: 0, capacity: 0, expiresAt: 0 }, added, MIDNIGHT))
        .toEqual({ base: 100, bonus: expected - 100, capacity: added, expiresAt: MIDNIGHT });
    },
  );

  it('stacks to 300 and never above 300', () => {
    expect(applyEnergyCapacityGift({ base: 90, bonus: 180, capacity: 180, expiresAt: MIDNIGHT }, 60, MIDNIGHT))
      .toEqual({ base: 100, bonus: 200, capacity: 200, expiresAt: MIDNIGHT });
  });

  it('full charge fills the active cap and expiry preserves only base', () => {
    expect(fillEnergyToActiveCap({ base: 41, bonus: 2, capacity: 40, expiresAt: MIDNIGHT }))
      .toMatchObject({ base: 100, bonus: 40 });
    expect(expireEnergyGift({ base: 83, bonus: 40, capacity: 40, expiresAt: MIDNIGHT }))
      .toEqual({ base: 83, bonus: 0, capacity: 0, expiresAt: 0 });
  });
});
```

- [ ] **Step 2: Run red tests**

Run the shared Jest command with `tests/energy_gift_effects.test.ts tests/bonus_energy_store.test.ts tests/bonus_energy_capacity_contract.ts`.

Expected: FAIL because the pure effect module is missing and current bonuses are stored in legacy 1/2/3 units.

- [ ] **Step 3: Implement the pure gift rules**

```ts
import { ENERGY_BASE_CAPACITY, ENERGY_BONUS_CAPACITY_LIMIT } from './energy_contract';

export type EnergyPools = Readonly<{ base: number; bonus: number; capacity: number; expiresAt: number }>;
export type EnergyGiftEffect =
  | Readonly<{ kind: 'full'; amount: 0 }>
  | Readonly<{ kind: 'capacity'; amount: 20 | 40 | 60 }>;

export const ENERGY_GIFT_EFFECTS = Object.freeze({
  energy_full: { kind: 'full', amount: 0 },
  energy_plus1: { kind: 'capacity', amount: 20 },
  energy_plus2: { kind: 'capacity', amount: 40 },
  energy_plus3: { kind: 'capacity', amount: 60 },
} satisfies Readonly<Record<'energy_full' | 'energy_plus1' | 'energy_plus2' | 'energy_plus3', EnergyGiftEffect>>);

export function energyGiftEffectForRewardId(id: keyof typeof ENERGY_GIFT_EFFECTS): EnergyGiftEffect {
  return ENERGY_GIFT_EFFECTS[id];
}

export function fillEnergyToActiveCap(pools: EnergyPools): EnergyPools {
  const capacity = Math.min(ENERGY_BONUS_CAPACITY_LIMIT, Math.max(0, pools.capacity));
  return { ...pools, base: ENERGY_BASE_CAPACITY, bonus: capacity, capacity };
}

export function applyEnergyCapacityGift(pools: EnergyPools, added: number, midnightMs: number): EnergyPools {
  const capacity = Math.min(ENERGY_BONUS_CAPACITY_LIMIT, Math.max(0, pools.capacity) + Math.max(0, added));
  return { base: ENERGY_BASE_CAPACITY, bonus: capacity, capacity, expiresAt: midnightMs };
}

export function expireEnergyGift(pools: EnergyPools): EnergyPools {
  return { base: Math.min(ENERGY_BASE_CAPACITY, Math.max(0, pools.base)), bonus: 0, capacity: 0, expiresAt: 0 };
}
```

- [ ] **Step 4: Migrate account-scoped bonus payloads once**

Add `schemaVersion: 2` to `BonusEnergyState`; when the parser sees an unversioned `amount/capacity` payload, multiply both by 20, clamp capacity to 200, clamp amount to capacity, preserve `expiresAt`, and write the upgraded payload only inside the account transition lock. Keep the zero-amount capacity snapshot until local midnight.

Run the shared Jest command from Step 2.

Expected: PASS, including an added round-trip case proving `3 → 60` occurs once.

- [ ] **Step 5: Commit gift math**

```powershell
git add app/energy_gift_effects.ts app/bonus_energy_store.ts app/spin_gift_storage_integrity.ts tests/energy_gift_effects.test.ts tests/bonus_energy_store.test.ts tests/bonus_energy_capacity_contract.ts
git commit -m "feat: scale temporary energy gifts"
```

---

### Task 4: Upgrade the durable session ledger and runtime context

**Files:**
- Modify: `app/energy_session_operation_ledger.ts`
- Modify: `components/EnergyContext.tsx`
- Modify: `components/energy_start_confirmation.ts`
- Modify: `tests/energy_session_operation_ledger_probe.mjs`
- Modify: `tests/energy_session_callsites_contract.ts`
- Modify: `tests/energy_start_confirmation_contract.test.ts`

- [ ] **Step 1: Extend the ledger probe with 10/20/25 debit cases**

```js
assert.deepEqual(planEnergySessionDebit({
  baseEnergy: 100, bonusEnergy: 40, bonusCapacity: 40, bonusExpiresAt: NOW + DAY,
  refundCredit: 0, lastSettledAt: NOW, recoveryCreditMicrounits: 0,
  recoveryDivisionRemainder: 0, maxEnergy: 100,
}, 25, NOW).split, { bonus: 25, refundCredit: 0, base: 0 });

assert.equal(planEnergySessionDebit({
  baseEnergy: 19, bonusEnergy: 0, bonusCapacity: 0, bonusExpiresAt: 0,
  refundCredit: 0, lastSettledAt: NOW, recoveryCreditMicrounits: 0,
  recoveryDivisionRemainder: 0, maxEnergy: 100,
}, 20, NOW), null);
```

Add a retry assertion that the same `operationId` and request fingerprint return the original receipt without a second 20-unit debit, plus a refund assertion that restores the exact bonus/base split.

- [ ] **Step 2: Run the probe and contract tests red**

Run: `node tests/energy_session_operation_ledger_probe.mjs`.

Then run the shared Jest command with `tests/energy_session_callsites_contract.ts tests/energy_start_confirmation_contract.test.ts`.

Expected: the probe fails because the V1 projection does not contain V2 time/fraction fields; the confirmation contract fails because it still expects flight coordination.

- [ ] **Step 3: Version the projection without weakening idempotency**

Use this projection shape consistently in ledger records and `EnergyContext`:

```ts
export type EnergySessionProjection = Readonly<{
  schemaVersion: 2;
  baseEnergy: number;
  bonusEnergy: number;
  bonusCapacity: number;
  bonusExpiresAt: number;
  refundCredit: number;
  lastSettledAt: number;
  recoveryCreditMicrounits: number;
  recoveryDivisionRemainder: number;
  maxEnergy: 100;
}>;
```

Keep the existing prepared record, grant receipt, request fingerprint, account-generation lock, storage lock, recovery of interrupted writes, and keyed compensation. Update `publishProjection` to write the full V2 base payload and versioned bonus payload in the same locked publication.

- [ ] **Step 4: Make the context resolve typed activity prices**

Replace amount-first public APIs with activity-first APIs while keeping the receipt intent explicit:

```ts
confirmActivityStart: (
  activity: EnergyActivityKey,
  intent: EnergySessionIntent,
) => Promise<EnergyStartResult>;
refundActivityStart: (operationId: string, reason: string) => Promise<void>;
```

`confirmActivityStart` must call `activityEnergyCost(activity)`, return `unlimited` for Plus/free-window, return `spent` immediately for a zero-price activity without creating a debit, and otherwise call `commitEnergySessionStart` once. Do not emit any visual decrease until the ledger result is `applied`; an `already-applied` retry must settle UI without replaying the transaction.

While `numeric_energy_v2` is disabled, the compatibility branch maps every non-zero catalog activity to the legacy one-slot debit and leaves the old UI semantics active. On verified Plus Pro activation, settle elapsed recovery, set base energy to 100, preserve active bonus capacity/expiry, publish one `entitlement` transaction, and cancel the full-charge notification. Free-window and tester unlimited modes never overwrite the underlying balance.

Run the probe and both Jest suites from Step 2.

Expected: PASS; durable operations still bind debit and exact grant, and no public callsite can supply an arbitrary numeric price.

- [ ] **Step 5: Commit ledger integration**

```powershell
git add app/energy_session_operation_ledger.ts components/EnergyContext.tsx components/energy_start_confirmation.ts tests/energy_session_operation_ledger_probe.mjs tests/energy_session_callsites_contract.ts tests/energy_start_confirmation_contract.test.ts
git commit -m "feat: bind numeric energy prices to session receipts"
```

---

### Task 5: Add the visual transaction bus and remove optimistic flight semantics

**Files:**
- Create: `app/energy_visual_transactions.ts`
- Create: `tests/energy_visual_transactions.test.ts`
- Modify: `app/events.ts:15-43`
- Modify: `components/EnergyContext.tsx:780-977`
- Modify: `app/energy_spend_latency_trace.ts`
- Modify: `tests/energy_start_cost_contract.test.ts`

- [ ] **Step 1: Write failing transaction-deduplication tests**

```ts
import { energyVisualTransactions, type EnergyVisualTransaction } from '../app/energy_visual_transactions';

it('publishes each operation once', () => {
  const seen: EnergyVisualTransaction[] = [];
  const unsubscribe = energyVisualTransactions.subscribe((event) => seen.push(event));
  const event = { operationId: 'energy:lesson:attempt-1', from: 86, to: 66, reason: 'spend', source: 'lesson' } as const;
  energyVisualTransactions.publish(event);
  energyVisualTransactions.publish(event);
  unsubscribe();
  expect(seen).toEqual([event]);
});
```

- [ ] **Step 2: Run red tests**

Run the shared Jest command with `tests/energy_visual_transactions.test.ts tests/energy_start_cost_contract.test.ts`.

Expected: FAIL because the bus does not exist and the old contract requires `energy_spent_on_start`.

- [ ] **Step 3: Implement a bounded transaction bus**

```ts
export type EnergyVisualTransaction = Readonly<{
  operationId: string;
  from: number;
  to: number;
  reason: 'spend' | 'passive' | 'video' | 'gift' | 'refill' | 'refund' | 'expiry' | 'entitlement';
  source?: 'lesson' | 'training' | 'arena' | 'video' | 'gift' | 'pearls' | 'system';
}>;

type Listener = (event: EnergyVisualTransaction) => void;
const listeners = new Set<Listener>();
const delivered = new Set<string>();

export const energyVisualTransactions = {
  publish(event: EnergyVisualTransaction): void {
    if (delivered.has(event.operationId)) return;
    delivered.add(event.operationId);
    if (delivered.size > 256) delivered.delete(delivered.values().next().value as string);
    listeners.forEach((listener) => listener(event));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  resetForTest(): void { delivered.clear(); listeners.clear(); },
};
```

- [ ] **Step 4: Publish only committed transitions**

In `EnergyContext`, capture `from = base + bonus + refundCredit` before a mutation and publish one transaction after a committed projection is applied. Use the durable operation ID for spend/refund, a stable timestamp/key for passive/video/gift/refill/expiry, and never publish on `insufficient`, `failed`, speculative tap, or `already-applied`. Remove `optimisticFlightRef`, motion target refs, rollback-flight code, and every `energy_spent_on_start` emit. Update latency trace stages to `tap → ledger commit → visual transaction → HUD settled`.

Run the shared Jest command from Step 2 plus `tests/energy_start_confirmation_contract.test.ts`.

Expected: PASS and a source scan finds zero `energy_spent_on_start` emitters.

- [ ] **Step 5: Commit the transaction boundary**

```powershell
git add app/energy_visual_transactions.ts app/events.ts components/EnergyContext.tsx app/energy_spend_latency_trace.ts tests/energy_visual_transactions.test.ts tests/energy_start_cost_contract.test.ts tests/energy_start_confirmation_contract.test.ts
git commit -m "feat: publish committed energy transactions"
```

---

### Task 6: Make video recovery truly proportional at 100 units/hour

**Files:**
- Rewrite: `app/energy_video_watch_credit.ts`
- Modify: `hooks/use_video_watch_energy_boost.ts`
- Modify: `components/youtube/VideoEnergyBoostBadge.tsx`
- Modify: `tests/energy_video_watch_credit.test.ts`
- Modify: `tests/use_video_watch_energy_boost_super_sunday.test.ts`

- [ ] **Step 1: Replace old timer-pull tests with fractional watch tests**

```ts
it('earns exactly one energy per 36 verified watched seconds', () => {
  expect(planVideoEnergyCredit({ watchedMs: 36_000, remainderMs: 0, current: 86, activeCap: 100 }))
    .toEqual({ credited: 1, current: 87, remainderMs: 0 });
  expect(planVideoEnergyCredit({ watchedMs: 18_000, remainderMs: 18_000, current: 87, activeCap: 100 }))
    .toEqual({ credited: 1, current: 88, remainderMs: 0 });
});

it('does not stack passive recovery into a second video rate', () => {
  expect(planVideoEnergyCredit({ watchedMs: 72_000, remainderMs: 0, current: 98, activeCap: 100 }))
    .toEqual({ credited: 2, current: 100, remainderMs: 0 });
});
```

- [ ] **Step 2: Run red video suites**

Run the shared Jest command with `tests/energy_video_watch_credit.test.ts tests/use_video_watch_energy_boost_super_sunday.test.ts`.

Expected: FAIL because current code pulls the next legacy unit to ten minutes instead of crediting watched time.

- [ ] **Step 3: Implement proportional verified-watch credit**

```ts
export function planVideoEnergyCredit(input: Readonly<{
  watchedMs: number; remainderMs: number; current: number; activeCap: number;
}>): Readonly<{ credited: number; current: number; remainderMs: number }> {
  const total = Math.max(0, Math.floor(input.watchedMs)) + Math.max(0, Math.floor(input.remainderMs));
  const possible = Math.floor(total / ENERGY_VIDEO_UNIT_MS);
  const credited = Math.min(Math.max(0, input.activeCap - input.current), possible);
  return {
    credited,
    current: input.current + credited,
    remainderMs: input.current + credited >= input.activeCap ? 0 : total - credited * ENERGY_VIDEO_UNIT_MS,
  };
}
```

Persist the remainder in the V2 energy payload under the shared storage lock. Credit only player-reported verified playing segments; pause, seek, buffering, hidden playback, and duplicate progress IDs add nothing. Publish one `video` visual transaction per credited integer batch.

- [ ] **Step 4: Preserve Plus rune behavior and update badge copy**

For Plus Pro, leave energy unchanged and keep the existing rune path at 3 runes/minute, 6 on Super Sunday, daily cap 600. For free users render `+1 энергия каждые 36 сек просмотра` and the next-unit progress; replace the raster image with `EnergyBoltIcon` once Task 9 lands.

Run the shared Jest command from Step 2.

Expected: PASS for free energy math and unchanged Plus/Super Sunday rune assertions.

- [ ] **Step 5: Commit video recovery**

```powershell
git add app/energy_video_watch_credit.ts hooks/use_video_watch_energy_boost.ts components/youtube/VideoEnergyBoostBadge.tsx tests/energy_video_watch_credit.test.ts tests/use_video_watch_energy_boost_super_sunday.test.ts
git commit -m "feat: credit video energy at one per 36 seconds"
```

---

### Task 7: Rescale accelerated recovery and energy notifications

**Files:**
- Modify: `app/boons/boon_effects_energy.ts`
- Modify: `app/services/league_chest_rewards.ts:40`
- Modify: `functions/src/league_chest.ts:23-24,297-301,392-395,612-685`
- Modify: `app/notifications.ts:2019-2140`
- Modify: `tests/boon_effects_energy.test.ts`
- Modify: `tests/boon_energy_override_roundtrip.test.ts`
- Modify: `tests/league_chest_goal.test.ts`
- Create: `functions/src/league_chest_energy_rate.test.ts`
- Modify: `tests/notifications_energy_full.test.ts`

- [ ] **Step 1: Write failing 4-minute and exact-notification tests**

```ts
expect(LEAGUE_CHEST_ENERGY_MS).toBe(4 * 60 * 1000);
applyRemoteConfigSnapshot({ numbers: { energy_recovery_interval_ms: 6 * 60 * 1000 } });
await applyTurboRegenOverride();
await expect(readBoonEnergyOverrideMs()).resolves.toBe(4 * 60 * 1000);
expect(timeUntilEnergyAtLeast({
  current: 86,
  required: 100,
  unitMs: 6 * 60_000,
  recoveryCreditMicrounits: 0,
  recoveryDivisionRemainder: 0,
})).toBe(84 * 60_000);

const openingAtZero = {
  state: {
    schemaVersion: 2 as const,
    current: 0,
    lastSettledAt: NOW,
    recoveryCreditMicrounits: 0,
    recoveryDivisionRemainder: 0,
  },
  bonusEnergy: 0,
  bonusCapacity: 0,
  bonusExpiresAt: 0,
};
const acrossExpiry = settleEnergyAcrossRateSegments(openingAtZero, [
  { endAtMs: NOW + 8 * 60_000, unitMs: 4 * 60_000 },
  { endAtMs: NOW + 14 * 60_000, unitMs: 6 * 60_000 },
]);
expect(acrossExpiry.state.current).toBe(3);
```

Add notification cases for active bonus capacity, Plus/free-window suppression, rescheduling after spend/refund/video/gift, and quiet-hour shifting without changing the underlying projection.

In `functions/src/league_chest_energy_rate.test.ts`, assert the server drop and client validator both use `4 * 60 * 1000`; the test must fail if either side returns the legacy 20-minute value.

- [ ] **Step 2: Run red recovery suites**

Run the shared Jest command with `tests/boon_effects_energy.test.ts tests/boon_energy_override_roundtrip.test.ts tests/league_chest_goal.test.ts tests/notifications_energy_full.test.ts`.

Then run the function test under its own semaphore slot:

```powershell
bash .claude/semaphore/slot.sh acquire "jest league energy"; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; try { Push-Location functions; npx jest --runInBand --no-cache --runTestsByPath src/league_chest_energy_rate.test.ts; if ($LASTEXITCODE -ne 0) { throw "functions jest failed" } } finally { Pop-Location; bash .claude/semaphore/slot.sh release }
```

Expected: FAIL on the current 20-minute league override and legacy 5-slot timing.

- [ ] **Step 3: Set all approved accelerated rates**

Set both client `LEAGUE_CHEST_ENERGY_MS` and server `ENERGY_MS` to four minutes so the confirmed external reward and client validator stay identical. Set seasonal/weekly `turbo_regen` to four minutes per unit for its existing duration. Keep `energy_free_window` as a debit entitlement from 19:00–22:00 local time; it must not modify or refill the stored balance. When two interval overrides overlap, continue selecting the fastest active interval.

- [ ] **Step 4: Drive notifications from the same projection**

Schedule `Энергия восстановлена` using the settled V2 current value, active cap, exact fractional progress, and selected recovery interval. Cancel while Plus/free-window makes the next activity free, then reschedule from the untouched underlying balance when that entitlement ends. Retain quiet hours 23:00–08:00.

Run the shared Jest command from Step 2.

Expected: PASS with no notification formula using a hardcoded 5, 6, 20 minutes, or 30 minutes.

- [ ] **Step 5: Commit recovery rewards and notifications**

```powershell
git add app/boons/boon_effects_energy.ts app/services/league_chest_rewards.ts functions/src/league_chest.ts functions/src/league_chest_energy_rate.test.ts app/notifications.ts tests/boon_effects_energy.test.ts tests/boon_energy_override_roundtrip.test.ts tests/league_chest_goal.test.ts tests/notifications_energy_full.test.ts
git commit -m "feat: rescale energy recovery rewards"
```

---

### Task 8: Preserve the pearl value with an atomic base-only refill

**Files:**
- Modify: `app/energy_shard_refill.ts`
- Modify: `components/NoEnergyModal.tsx` temporarily; final replacement occurs in Task 11
- Modify: `tests/energy_refill_price_fairness.test.ts`
- Modify: `tests/energy_refill_contract.test.ts`
- Modify: `tests/season_reward_pearls_atomic.test.ts`

- [ ] **Step 1: Write failing price examples and composite-operation assertions**

```ts
it.each([[86, 3], [8, 19], [0, 20], [99, 1], [100, 1]])(
  'base %i costs %i pearls', (base, expected) => {
    expect(energyRefillShardCost(base)).toBe(expected);
  },
);
```

Assert the operation grant is `{ kind: 'energy_refill', subjectId: 'base_energy', payload: { current: 100 } }`, the local write leaves bonus state untouched, and a retry replays the same composite receipt without charging twice.

- [ ] **Step 2: Run red refill suites**

Run the shared Jest command with `tests/energy_refill_price_fairness.test.ts tests/energy_refill_contract.test.ts tests/season_reward_pearls_atomic.test.ts`.

Expected: FAIL because the current formula charges one pearl per legacy slot.

- [ ] **Step 3: Replace the price function and V2 local write**

```ts
export function energyRefillShardCost(baseEnergy: number): number {
  const have = Math.max(0, Math.min(100, Math.floor(Number(baseEnergy) || 0)));
  return Math.max(1, Math.ceil((100 - have) / 5));
}
```

Build the next V2 base payload from the currently stored state, set only `current: 100`, preserve timing/fraction fields, and pass that exact write together with the pearl debit to `commitShardCompositeOperation`. Use one stable idempotency key exposed by the existing composite API; do not write a standalone debit.

- [ ] **Step 4: Update refill copy and run green tests**

Display `Заполнить до 100 за {cost} {pearlForm}` and never claim to fill an active overcharge cap. Run the shared Jest command from Step 2.

Expected: PASS; 86→100 costs 3 and bonus capacity is unchanged.

- [ ] **Step 5: Commit pearl refill**

```powershell
git add app/energy_shard_refill.ts components/NoEnergyModal.tsx tests/energy_refill_price_fairness.test.ts tests/energy_refill_contract.test.ts tests/season_reward_pearls_atomic.test.ts
git commit -m "feat: preserve pearl value for numeric energy"
```

---

### Task 9: Build the vector bolt and integer-by-integer animated number

**Files:**
- Create: `components/EnergyBoltIcon.tsx`
- Create: `components/AnimatedEnergyNumber.tsx`
- Create: `tests/animated_energy_number.test.tsx`
- Modify: `constants/motionHybrid.ts:169-191`

- [ ] **Step 1: Write failing animation contract tests**

```tsx
it('renders every integer between 86 and 66 in order', () => {
  const frames = buildEnergyIntegerFrames(86, 66);
  expect(frames).toEqual(Array.from({ length: 21 }, (_, index) => 86 - index));
});

it('uses one final frame for reduced motion', () => {
  expect(buildEnergyIntegerFrames(86, 66, true)).toEqual([66]);
});

it('bounds long deltas to 12–28 ms per integer', () => {
  expect(energyFrameDurationMs(20)).toBeGreaterThanOrEqual(12);
  expect(energyFrameDurationMs(20)).toBeLessThanOrEqual(28);
});
```

- [ ] **Step 2: Run the new UI suite red**

Run the shared Jest command with `tests/animated_energy_number.test.tsx`.

Expected: FAIL because the component and frame helpers do not exist.

- [ ] **Step 3: Implement deterministic frame planning**

```ts
export function buildEnergyIntegerFrames(from: number, to: number, reduceMotion = false): number[] {
  const start = Math.round(from);
  const end = Math.round(to);
  if (reduceMotion || start === end) return [end];
  const direction = end > start ? 1 : -1;
  return Array.from({ length: Math.abs(end - start) + 1 }, (_, index) => start + direction * index);
}

export function energyFrameDurationMs(delta: number): number {
  return Math.max(12, Math.min(28, Math.round(420 / Math.max(1, Math.abs(delta)))));
}
```

Render the value through Reanimated `AnimatedTextInput` and `useAnimatedProps`, with `tabular-nums`, fixed capsule width, and no React state update per frame. `EnergyBoltIcon` must use `react-native-svg` paths, inherit semantic color, set `accessible={false}`, and contain no `Image` or `require()`.

- [ ] **Step 4: Add transaction playback and ownership rules**

Subscribe to `energyVisualTransactions`; accept an `ownerActive` prop so only the focused visible HUD animates, while hidden mounts jump to `to`. Queue transactions serially, dedupe by operation ID, morph finite value to `∞` in 240 ms, and cancel timers/worklets on unmount. Reduced Motion always sets the final semantic state immediately.

Run the shared Jest command from Step 2.

Expected: PASS, including unmount cleanup, duplicate-operation, infinity, hidden-owner, and reduced-motion cases.

- [ ] **Step 5: Commit the animated primitive**

```powershell
git add components/EnergyBoltIcon.tsx components/AnimatedEnergyNumber.tsx constants/motionHybrid.ts tests/animated_energy_number.test.tsx
git commit -m "feat: add animated numeric energy primitive"
```

---

### Task 10: Build the shared HUD pill, copy, and energy information surface

**Files:**
- Create: `app/energy_copy.ts`
- Create: `components/EnergyHudPill.tsx`
- Create: `components/EnergyInfoPopover.tsx`
- Create: `tests/energy_hud_pill.test.tsx`
- Create: `tests/energy_copy.test.ts`
- Modify: `components/EnergyBar.tsx` into a compatibility wrapper during migration

- [ ] **Step 1: Write failing state, copy, and accessibility tests**

```tsx
it.each([[86, 'normal'], [19, 'low'], [140, 'overcharge']])(
  'maps %i to %s', (value, state) => expect(resolveEnergyVisualState(value, false, false)).toBe(state),
);

it('announces infinity and the reason without relying on color', () => {
  const { getByLabelText } = render(<EnergyHudPill ownerActive />);
  expect(getByLabelText(/безлимитная энергия.*Plus Pro/i)).toBeTruthy();
});
```

Add copy matrix assertions for `ru`, `uk`, `en`, `es`, `pt`, `vi`, `id`, `tr`, and `pl`, including normal recovery, low energy, overcharge until midnight, Plus Pro, free window until 22:00, video rate, and pearl refill.

- [ ] **Step 2: Run red HUD suites**

Run the shared Jest command with `tests/energy_hud_pill.test.tsx tests/energy_copy.test.ts`.

Expected: FAIL because the HUD/copy modules do not exist.

- [ ] **Step 3: Implement the compact pill**

The pill must render `EnergyBoltIcon` plus `AnimatedEnergyNumber`, use a 44×44 minimum press target, fixed numeric width, dark capsule, violet normal accent, coral low accent, gold overcharge accent, and violet infinity outline. It opens `EnergyInfoPopover`; it never hides for Plus.

Use this state resolver:

```ts
export type EnergyVisualState = 'normal' | 'low' | 'overcharge' | 'unlimited';
export function resolveEnergyVisualState(value: number, plus: boolean, freeWindow: boolean): EnergyVisualState {
  if (plus || freeWindow) return 'unlimited';
  if (value > 100) return 'overcharge';
  return value < 20 ? 'low' : 'normal';
}
```

- [ ] **Step 4: Implement popover/sheet fallback and compatibility wrapper**

The information surface shows current/active cap, `+1 каждые 6 минут`, exact next-unit and full times, `Перегруз до полуночи` with expiry when active, Plus/free-window reason, `Смотреть видео · +1 каждые 36 сек`, and the base-only pearl refill CTA. On narrow/collision-prone layouts render the same content in the project hybrid bottom sheet. Make legacy `EnergyBar` export `<EnergyHudPill>` so each old header migrates without a visual split.

Run the shared Jest command from Step 2 plus `tests/energy_restore_modals_locale_runtime.test.ts`.

Expected: PASS in all nine locales and every press target is at least 44×44.

- [ ] **Step 5: Commit HUD and copy**

```powershell
git add app/energy_copy.ts components/EnergyHudPill.tsx components/EnergyInfoPopover.tsx components/EnergyBar.tsx tests/energy_hud_pill.test.tsx tests/energy_copy.test.ts tests/energy_restore_modals_locale_runtime.test.ts
git commit -m "feat: add shared numeric energy hud"
```

---

### Task 11: Replace cost badges, insufficient-energy modals, and local spend feedback

**Files:**
- Rewrite: `components/EnergyCostBadge.tsx`
- Create: `components/InsufficientEnergySheet.tsx`
- Create: `components/EnergySpendCue.tsx`
- Replace: `components/NoEnergyModal.tsx` with a compatibility adapter
- Modify: `tests/energy_cost_badge_plus.test.tsx`
- Modify: `tests/no_energy_modal_locale_runtime.test.ts`
- Create: `tests/insufficient_energy_sheet.test.tsx`

- [ ] **Step 1: Write failing activity-aware UI tests**

```tsx
it.each([['flashcards', '−10'], ['classic_lesson', '−20'], ['arena_match', '−25']])(
  '%s resolves %s', (activity, label) => {
    const { getByText } = render(<EnergyCostBadge activity={activity as EnergyActivityKey} />);
    expect(getByText(label)).toBeTruthy();
  },
);

it('keeps price visible for Plus Pro', () => {
  const { getByText } = render(<EnergyCostBadge activity="arena_match" />);
  expect(getByText('Включено в Plus Pro')).toBeTruthy();
});
```

For the insufficient sheet, assert required/current energy, exact time-to-enough, video option, affordable/unaffordable pearl CTA, Plus offer, and no duplicated nested modal.

- [ ] **Step 2: Run red modal/badge suites**

Run the shared Jest command with `tests/energy_cost_badge_plus.test.tsx tests/no_energy_modal_locale_runtime.test.ts tests/insufficient_energy_sheet.test.tsx`.

Expected: FAIL because the badge still defaults to 1 and hides for Plus.

- [ ] **Step 3: Make badge price catalog-driven**

Change the required prop to `activity: EnergyActivityKey`; resolve the price through `activityEnergyCost`, render vector bolt + `−N`, and render `Включено в Plus Pro` instead of returning `null`. For zero-price activities render nothing. Keep pointer events off so the parent CTA owns the press.

- [ ] **Step 4: Implement one shared insufficient sheet and local cue**

`InsufficientEnergySheet` receives `activity`, settled current energy, pearl balance, video availability, and entitlement state; it calls `timeUntilEnergyAtLeast` for the exact threshold. `EnergySpendCue` appears next to the pressed CTA for 180–240 ms on press intent, but the HUD changes only after the durable receipt commits. On failed/cancelled starts the cue fades and no reduced final balance remains. Make `NoEnergyModal` translate its old `minRequired` callers to an explicit activity only until Task 13 removes those callers.

Run the shared Jest command from Step 2.

Expected: PASS and no badge contains a raster `Image`.

- [ ] **Step 5: Commit shared start UI**

```powershell
git add components/EnergyCostBadge.tsx components/InsufficientEnergySheet.tsx components/EnergySpendCue.tsx components/NoEnergyModal.tsx tests/energy_cost_badge_plus.test.tsx tests/no_energy_modal_locale_runtime.test.ts tests/insufficient_energy_sheet.test.tsx
git commit -m "feat: replace energy cost and shortage ui"
```

---

### Task 12: Convert every energy reward source and inventory receipt

**Files:**
- Modify: `app/level_gift_system.ts`
- Modify: `app/level_gift_active_inventory.ts`
- Modify: `app/level_gift_inventory.ts`
- Modify: `app/level_spin_reward_catalog.ts`
- Modify: `app/daily_journey_rewards.ts`
- Modify: `app/daily_journey_gift_activation.ts`
- Modify: `app/daily_journey_gift_inventory_adapter.ts`
- Modify: `app/friends_together/chest_reward_apply.ts`
- Modify: `app/quests_client.ts`
- Modify: `app/season_reward_apply.ts`
- Modify: `app/season_pass_gift_inventory.ts`
- Modify: `app/season_pass_track_config.ts`
- Modify: `app/boons/boon_active_status_copy.ts`
- Modify: `app/boons/boon_copy.ts`
- Modify: `app/boons/boon_config.ts`
- Modify: `app/boons/boon_types.ts`
- Modify: `app/services/league_chest_rewards.ts`
- Modify: focused gift/reward tests listed below

- [ ] **Step 1: Write the failing cross-source reward matrix**

Create `tests/numeric_energy_reward_sources.test.ts` with this canonical matrix:

```ts
const EXPECTED = Object.freeze({
  energy_full: { kind: 'full', amount: 0 },
  energy_plus1: { kind: 'capacity', amount: 20 },
  energy_plus2: { kind: 'capacity', amount: 40 },
  energy_plus3: { kind: 'capacity', amount: 60 },
});

it('keeps every source on the canonical energy effect', () => {
  expect(Object.fromEntries(Object.keys(EXPECTED).map((id) => [
    id,
    energyGiftEffectForRewardId(id as keyof typeof EXPECTED),
  ]))).toEqual(EXPECTED);
});
```

Add file-backed assertions that the level gift, wheel, Daily Journey, Friends Together `energyRefilled`, quests `energy_full`, season full/turbo, league fast recovery, tester previews, and active inventory import the canonical resolver instead of applying literal 1/2/3 amounts. Assert each application emits one stable receipt/visual transaction.

- [ ] **Step 2: Run reward suites red**

Run the shared Jest command with `tests/numeric_energy_reward_sources.test.ts tests/level_gift_effect_exactly_once.test.ts tests/daily_journey_gift_activation.test.ts tests/friends_together_claims_client.test.ts tests/season_reward_apply_offline.test.ts`.

Expected: FAIL on legacy 1/2/3 amounts and direct writers that do not publish V2 effects.

- [ ] **Step 3: Route each source through canonical gift effects**

Use this exact mapping without renaming receipt IDs:

| Source ID | Domain call |
|---|---|
| `energy_full` | `fillEnergyToActiveCap` |
| `energy_plus1` | `applyEnergyCapacityGift(pools, 20, midnight)` |
| `energy_plus2` | `applyEnergyCapacityGift(pools, 40, midnight)` |
| `energy_plus3` | `applyEnergyCapacityGift(pools, 60, midnight)` |
| Friends `energyRefilled` | `fillEnergyToActiveCap` |
| Quest full reward | `fillEnergyToActiveCap` |
| League `energy_fast_recovery` | existing-duration override at 4 min/unit |
| Season/boon `turbo_regen` | existing-expiry override at 4 min/unit |
| `energy_free_window` | debit entitlement only, 19:00–22:00 local |

Every application holds the existing account/storage lock, writes one versioned state, preserves idempotency receipt keys, and publishes one `gift` or `entitlement` visual transaction after commit.

- [ ] **Step 4: Update inventory labels and run all focused reward suites**

Change visible labels to `Полный заряд`, `+20 до полуночи`, `+40 до полуночи`, `+60 до полуночи`, `Быстрое восстановление`, `Восстановление ускорено`, and `Занятия без энергии`. Preserve existing expiries and ownership/account-generation guards.

Run the shared Jest command with:

`tests/numeric_energy_reward_sources.test.ts tests/level_gift_effect_exactly_once.test.ts tests/level_gift_active_inventory.test.ts tests/level_gift_inventory.test.ts tests/level_spin_reward_definitions.test.ts tests/daily_journey_gift_activation.test.ts tests/daily_journey_gift_inventory_contract.test.ts tests/friends_together_claims_client.test.ts tests/quests_core.test.ts tests/season_reward_apply_offline.test.ts tests/boon_effects_energy.test.ts`.

Expected: PASS and no source grants literal bonus amounts 1, 2, or 3.

- [ ] **Step 5: Commit reward behavior**

```powershell
git add app/level_gift_system.ts app/level_gift_active_inventory.ts app/level_gift_inventory.ts app/level_spin_reward_catalog.ts app/daily_journey_rewards.ts app/daily_journey_gift_activation.ts app/daily_journey_gift_inventory_adapter.ts app/friends_together/chest_reward_apply.ts app/quests_client.ts app/season_reward_apply.ts app/season_pass_gift_inventory.ts app/season_pass_track_config.ts app/boons/boon_active_status_copy.ts app/boons/boon_copy.ts app/boons/boon_config.ts app/boons/boon_types.ts app/services/league_chest_rewards.ts tests/numeric_energy_reward_sources.test.ts tests/level_gift_effect_exactly_once.test.ts tests/level_gift_active_inventory.test.ts tests/level_gift_inventory.test.ts tests/level_spin_reward_definitions.test.ts tests/daily_journey_gift_activation.test.ts tests/daily_journey_gift_inventory_contract.test.ts tests/friends_together_claims_client.test.ts tests/quests_core.test.ts tests/season_reward_apply_offline.test.ts tests/boon_effects_energy.test.ts
git commit -m "feat: migrate every energy reward source"
```

---

### Task 13: Migrate every activity start and price preview

**Files:**
- Modify paid start files enumerated in `tests/energy_session_callsites_contract.ts`
- Modify: `components/AiDialogBriefingScreen.tsx`
- Modify: `components/DialogScenarioTile.tsx`
- Modify: `components/DialogsTabContent.tsx`
- Modify: `components/DialogVerdictScreen.tsx`
- Modify: `components/feedback/ResultsSequence.tsx`
- Modify: `components/arena/ArenaModeSheet.tsx`
- Modify: `components/arena/ArenaRankHybrid.tsx`
- Modify: `components/mistake-practice/MistakePracticeSetupSheet.tsx`
- Modify: `components/mistake-practice/MistakePracticeLoopNode.tsx`
- Modify: `components/LearningV2SessionOutcomeSheet.tsx`
- Modify: `components/level-exam/LevelExamIntro.tsx`
- Modify: `app/arena_match.tsx`
- Modify: `app/arena_results.tsx`
- Modify: `app/diagnostic_test.tsx`
- Modify: `app/exam.tsx`
- Modify: `app/flashcards_training_setup.tsx`
- Modify: `app/flashcards/DeckPickerSheet.tsx`
- Modify: `app/flashcards/SessionResultScreen.tsx`
- Modify: `app/learning-v2/lesson/[id].tsx`
- Modify: `app/lesson_complete.tsx`
- Modify: `app/lesson_intro_screens.tsx`
- Modify: `app/lesson_menu.tsx`
- Modify: `app/max_voice_review.tsx`
- Modify: `app/personal_plan.tsx`
- Modify: `app/personal_plan_exercise_transition.tsx`
- Modify: `app/personal_plan_quiz.tsx`
- Modify: `app/personal_plan_stats_screen.tsx`
- Audit every remaining caller returned by `rg -l "EnergyCostBadge" app components`; add any newly introduced caller to this task and to the contract before editing it.
- Modify: `tests/energy_session_callsites_contract.ts`
- Modify: `tests/exam_energy_charge_timing_contract.test.ts`
- Modify: `tests/arena_owner_requested_ui_contract.test.ts`

- [ ] **Step 1: Reread the Learning V2 route and run drift check**

Read `docs/v2/СТАРТ В2.md` completely and every document it currently requires. Run the prescribed drift-check command and record `ON TRACK`. If it does not report `ON TRACK`, stop Task 13 and resolve only the reported Learning V2 contract with the owner/owning task before touching `app/learning-v2/**`.

- [ ] **Step 2: Strengthen the callsite contract before production edits**

Make the contract assert the exact activity key at every debit site:

```ts
const paidStarts = {
  'app/ai_dialog_session.tsx': 'ai_dialog',
  'app/arena_friend_duel.tsx': 'arena_match',
  'app/arena_invite.tsx': 'arena_match',
  'app/arena_matchmaking.tsx': 'arena_match',
  'app/arena_today.tsx': 'arena_match',
  'app/diagnostic_test.tsx': 'diagnostic_test',
  'app/exam.tsx': 'level_exam',
  'app/flashcards_blitz_session.tsx': 'flashcards',
  'app/flashcards_recall_session.tsx': 'flashcards',
  'app/flashcards_speaking_session.tsx': 'flashcards',
  'app/flashcards_swipe.tsx': 'flashcards',
  'app/learning-v2/session/[id].tsx': 'learning_v2_session',
  'app/learning_v2_direct_session_player_v1.tsx': 'learning_v2_session',
  'app/lesson_irregular_verbs.tsx': 'irregular_verbs',
  'app/lesson_words.tsx': 'lesson_words',
  'app/lesson1.tsx': 'classic_lesson',
  'app/level_exam.tsx': 'level_exam',
  'app/mistake_practice_session.tsx': 'mistake_practice',
  'app/personal_plan_exercise.tsx': 'personal_plan_exercise',
  'app/preposition_drill.tsx': 'preposition_drill',
  'components/level-exam/LevelExamV2.tsx': 'level_exam',
} as const;
```

For each file, require `confirmActivityStart('<key>', intent)` and reject `confirmSpendOne`, `confirmSpendAmount`, numeric energy constants, or arbitrary numeric `cost` props. Assert `app/max_call_prestart.tsx` uses `max_call` and creates no debit.

- [ ] **Step 3: Run the contract red**

Run the shared Jest command with `tests/energy_session_callsites_contract.ts tests/exam_energy_charge_timing_contract.test.ts tests/arena_owner_requested_ui_contract.test.ts`.

Expected: FAIL listing every legacy callsite still using the old APIs or implicit `−1` badge.

- [ ] **Step 4: Migrate starts, retries, replays, and previews**

Replace each start with the exact key from Step 2. Use `activity="flashcards"` on deck/training/retry badges; `activity="classic_lesson"` or `activity="learning_v2_session"` on lesson map/start/outcome/retry; `activity="ai_dialog"` on dialog hero/scenario/retry; `activity="personal_plan_exercise"` on plan cards/transitions/results; `activity="level_exam"` on diagnostic/exam surfaces; and `activity="arena_match"` on mode/invite/duel/today/match/results/replay/revenge. Theory, reading, video, navigation, and MAX prestart use zero-price keys and show no badge.

Keep each existing durable `EnergySessionIntent`, acknowledgement, entry-failure refund, Arena reconnect exemption, and retry identity. A genuinely new retry increments its existing attempt/session revision and therefore gets a new receipt.

Run the shared Jest command from Step 3.

Expected: PASS; contract count includes all current spend and preview surfaces and rejects any implicit default cost.

- [ ] **Step 5: Commit callsite migration**

Stage only the files reported by `git diff --name-only` for this task plus the three tests, then run:

```powershell
git commit -m "feat: apply numeric energy prices everywhere"
```

---

### Task 14: Replace all reward raster presentation with one dynamic component

**Files:**
- Create: `components/EnergyRewardPresentation.tsx`
- Modify: `components/LevelSpinRewardModal.tsx`
- Modify: `components/daily_journey/DailyJourneyRevealScene.tsx`
- Modify: `components/friends_together/FriendsChestModal.tsx`
- Modify: `components/LevelGiftModal.tsx`
- Modify: `components/LevelGiftDualModal.tsx`
- Modify: `components/LevelSpinFinishLine.tsx`
- Modify: `components/QuestSheetModal.tsx`
- Modify: `components/QuestTaskCard.tsx`
- Modify: `components/SeasonGiftModal.tsx`
- Modify: `components/BoonActivatedHost.tsx`
- Modify: `components/LeagueChestOpenModal.tsx`
- Modify: `app/(tabs)/friends.tsx`
- Modify: `app/club_screen.tsx`
- Modify: `app/season_pass.tsx`
- Audit tester/dev preview consumers returned by the exact scan below and add every newly introduced file to the retirement contract before editing it.
- Modify: `app/theme_ui_assets.ts`
- Modify: `app/level_spin_reward_assets.ts`
- Modify: `app/level_spin_reward_asset_manifest.ts`
- Modify focused reward art tests

- [ ] **Step 1: Inventory every raster consumer and freeze it in a guard**

Run:

```powershell
rg -n "energy-start-cost|energy_full\.webp|energy_plus2\.webp|energy_plus3\.webp|EnergyIcon" app components tests
```

Create `tests/energy_raster_retirement_contract.test.ts` that scans `app`, `components`, and `tests` and permits references only inside this retirement test until Step 4.

- [ ] **Step 2: Write failing presentation tests**

```tsx
it.each([
  ['full', 'Полный заряд'], ['plus20', '+20'], ['plus40', '+40'],
  ['plus60', '+60'], ['turbo', 'Быстрое восстановление'], ['freeWindow', 'Без энергии'],
])('renders %s without raster assets', (variant, label) => {
  const { getByText, UNSAFE_queryAllByType } = render(<EnergyRewardPresentation variant={variant as EnergyRewardVariant} />);
  expect(getByText(label)).toBeTruthy();
  expect(UNSAFE_queryAllByType(Image)).toHaveLength(0);
});
```

Run the shared Jest command with `tests/energy_raster_retirement_contract.test.ts tests/level_spin_reward_art.test.ts tests/daily_journey_reveal_scene_contract.test.ts tests/level_gift_reward_icons.test.ts`.

Expected: FAIL with the complete list of remaining raster consumers.

- [ ] **Step 3: Implement the dynamic reward visual**

Build each variant from `EnergyBoltIcon`, a dark rounded plate, tabular text, and semantic violet/gold/coral accents. Gold/lime filled surfaces must use dark foreground. Supply localized accessibility labels and Reduced Motion final-state rendering. Do not create replacement image files.

Export and use this closed variant type so reward adapters cannot invent an unreviewed visual:

```ts
export type EnergyRewardVariant =
  | 'full'
  | 'plus20'
  | 'plus40'
  | 'plus60'
  | 'turbo'
  | 'freeWindow';
```

- [ ] **Step 4: Replace every consumer and clear manifests**

Use `EnergyRewardPresentation` in level gifts, wheel result, Daily Journey reveal, Friends Together chest, quests, season/boon modals, active inventory, finish line, and tester previews. Remove the four energy raster entries from theme/reward asset maps and manifests; do not remove unrelated rewards.

Run the scan from Step 1. Expected: only the retirement test contains those basenames.

Run the shared Jest command from Step 2 plus `tests/level_spin_reward_assets.test.ts tests/level_spin_reward_asset_manifest.test.ts tests/level_gift_images.test.ts`.

Expected: PASS.

- [ ] **Step 5: Commit presentation migration**

Stage the new component, all exact scan-reported consumers, manifests, and focused tests, then run:

```powershell
git commit -m "feat: replace energy reward raster art"
```

---

### Task 15: Retire the old flight, slot renderer, and energy assets

**Files:**
- Delete: `components/EnergySpendFlightHost.tsx`
- Delete: `components/EnergyIcon.tsx`
- Delete: `components/energyIconLayout.ts`
- Delete: `assets/images/energy/energy-start-cost.webp`
- Delete: `assets/images/level-spin-rewards/energy_full.webp`
- Delete: `assets/images/level-spin-rewards/energy_plus2.webp`
- Delete: `assets/images/level-spin-rewards/energy_plus3.webp`
- Modify: `app/_layout.tsx`
- Modify: `constants/motionHybrid.ts`
- Delete or rewrite: `tests/energy_icon_layout.test.ts`
- Modify: `tests/energy_start_cost_contract.test.ts`
- Modify: `tests/sage_porcelain_asset_fallbacks_contract.test.ts`

- [ ] **Step 1: Prove zero production references before deletion**

Run:

```powershell
rg -n "EnergySpendFlightHost|EnergyIcon|energyIconLayout|ENERGY_SPEND_TRANSFER_HYBRID|energy_spent_on_start|energy-start-cost|energy_full\.webp|energy_plus2\.webp|energy_plus3\.webp" app components constants hooks tests
```

Expected before deletion: references only in the files/tests named in this task. If any other production consumer appears, migrate it to `EnergyHudPill`, `EnergyBoltIcon`, or `EnergyRewardPresentation` before continuing.

- [ ] **Step 2: Rewrite retirement guards first**

Make `tests/energy_start_cost_contract.test.ts` assert that `app/_layout.tsx` has no flight host, `app/events.ts` has no old event, `EnergyContext` has no optimistic flight state, and numeric transactions exist. Make the asset fallback test reject the four retired basenames instead of requiring them.

Run the shared Jest command with `tests/energy_start_cost_contract.test.ts tests/energy_raster_retirement_contract.test.ts tests/sage_porcelain_asset_fallbacks_contract.test.ts`.

Expected: FAIL while the old files/assets still exist.

- [ ] **Step 3: Remove the old host and motion constant**

Remove the import/mount from `app/_layout.tsx`, remove `ENERGY_SPEND_TRANSFER_HYBRID`, and delete the three obsolete component files. Confirm no other motion constant or shared icon behavior is removed.

- [ ] **Step 4: Delete only the four verified unreferenced assets**

After Step 1 reports zero production references, delete exactly the four files listed above. Run the Step 1 scan again.

Expected: no production matches; test matches are only negative guard strings.

Run the shared Jest command from Step 2.

Expected: PASS and no old/new animation overlap is possible.

- [ ] **Step 5: Commit retirement**

```powershell
git add app/_layout.tsx constants/motionHybrid.ts tests/energy_start_cost_contract.test.ts tests/energy_raster_retirement_contract.test.ts tests/sage_porcelain_asset_fallbacks_contract.test.ts
git add -u components/EnergySpendFlightHost.tsx components/EnergyIcon.tsx components/energyIconLayout.ts assets/images/energy/energy-start-cost.webp assets/images/level-spin-rewards/energy_full.webp assets/images/level-spin-rewards/energy_plus2.webp assets/images/level-spin-rewards/energy_plus3.webp tests/energy_icon_layout.test.ts
git commit -m "refactor: retire legacy energy flight and assets"
```

---

### Task 16: Put the numeric HUD on every screen and remove ad-hoc counters

**Files:**
- Modify: `app/(tabs)/home.tsx`
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `app/lesson_menu.tsx`
- Modify: `app/ai_dialog_home.tsx`
- Modify: `app/preposition_drill.tsx`
- Modify: Learning V2 map/resource/session/outcome headers
- Modify: flashcard collection/deck/training/result headers
- Modify: diagnostic/exam/personal-plan/Arena/mistake-practice headers and modals found by the scans below
- Create: `tests/energy_hud_surface_contract.test.ts`

- [ ] **Step 1: Create a complete surface inventory test**

Build the inventory from both scans:

```powershell
rg -l "EnergyBar|EnergyHudPill|EnergyIcon" app components
rg -l "energy.*current|current.*energy|maxEnergy|bonusEnergy" app components -g "*.tsx"
```

In `tests/energy_hud_surface_contract.test.ts`, list every user-visible energy header/modal/tester surface explicitly and assert it imports `EnergyHudPill` or the temporary `EnergyBar` wrapper. Reject ad-hoc text such as `${energy}/${maxEnergy}`, raster bolts, or hidden Plus indicators.

- [ ] **Step 2: Run the inventory test red**

Run the shared Jest command with `tests/energy_hud_surface_contract.test.ts tests/energy_hud_pill.test.tsx`.

Expected: FAIL listing Home and every remaining custom/slot renderer.

- [ ] **Step 3: Replace each visible header**

Use `<EnergyHudPill ownerActive={screenFocused && surfaceVisible} />` on Home, Lessons, lesson menu, Learning V2, AI Dialog, flashcards, prepositions, irregular verbs, diagnostics/exams, personal plans, Arena, and mistake practice. Pass modal visibility into `ownerActive` so a covered or background HUD settles immediately and never replays when uncovered. Keep existing navigation, buttons, safe-area layout, and Arena behavior unchanged.

- [ ] **Step 4: Verify compact/narrow and large-number layouts**

Add RNTL cases for 0, 8, 19, 86, 100, 140, 300, and ∞; portrait narrow width; dynamic type at 1.2; overcharge expiry; and simultaneous mounted headers with one active owner. Run the shared Jest command from Step 2.

Expected: PASS; no header width changes during counter animation and all pills remain tappable at 44×44.

- [ ] **Step 5: Commit all surface replacements**

Stage only the files enumerated by the inventory test and run:

```powershell
git commit -m "feat: show numeric energy across every surface"
```

---

### Task 17: Migrate sync, tester/admin previews, rollout flag, and data-contract readers

**Files:**
- Modify: `app/remote_flags.ts`
- Modify: `app/local_account_data.ts`
- Modify: `app/cloud_sync.ts` only if it carries the energy payload
- Modify: `app/phone_state_economy_bridge.ts` and related schema/adapter only if they carry energy
- Modify: tester/dev preview files found by `rg -n "energy" components/dev app -g "*.tsx"`
- Modify: `functions/src/jarvis/*_firestore_fetcher.ts` only if the scan proves a reader exists
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts` only if a Jarvis reader/schema changes
- Modify: `firestore.rules` only if a cloud energy field/collection changes
- Create: `tests/numeric_energy_rollout_contract.test.ts`

- [ ] **Step 1: Add a rollout/data-boundary guard**

```ts
it('uses one coordinated numeric_energy_v2 boundary', () => {
  expect(read('app/remote_flags.ts')).toMatch(/numeric_energy_v2/);
  expect(read('components/EnergyContext.tsx')).toMatch(/numeric_energy_v2/);
  expect(read('components/EnergyContext.tsx')).not.toMatch(/MAX_ENERGY\s*=\s*5/);
});
```

The test must also scan sync, account backup, phone-state, tester/admin preview, and Jarvis files for legacy 5/6 capacities, 1/2/3 gift amounts, and legacy state-only assumptions.

- [ ] **Step 2: Run the boundary test red**

Run the shared Jest command with `tests/numeric_energy_rollout_contract.test.ts tests/phone_state_economy_bridge.test.ts tests/cloud_sync_level_spin_plus_merge.test.ts`.

Expected: FAIL with each remaining legacy boundary.

- [ ] **Step 3: Implement coordinated rollout and compatibility reads**

Add `numeric_energy_v2` default-on for the completed build. While reading old data, migrate it through `migrateLegacyEnergyState`; every write must be V2. The rollback switch may choose the old UI only before any V2 write exists; it must never divide or overwrite a migrated balance. Update tester/admin previews to use 0/8/19/86/100/140/300 and ∞.

- [ ] **Step 4: Audit Jarvis, rules, and phone-state explicitly**

Run:

```powershell
rg -n "energy_state|energy_gift_bonus|max_energy|bonusEnergy|energy" functions/src/jarvis firestore.rules app/phone_state* app/cloud_sync.ts app/local_account_data.ts
```

If Jarvis reads a changed field, update its fetcher and exact row in `jarvis_data_contract_guard.test.ts` in the same task. If a new cloud field/collection is introduced, add a deny/allow rule matching the existing client-authoritative boundary. If energy remains purely local/account-scoped with no cloud schema change, add a test assertion documenting that Jarvis and Firestore rules require no edit.

Run the shared Jest command from Step 2 plus `tests/phone_state_contracts.test.ts` and, only when changed, the Jarvis contract test.

Expected: PASS with no direct server-authoritative personal energy writer.

- [ ] **Step 5: Commit rollout boundaries**

Stage only files that the audit proved necessary, then run:

```powershell
git commit -m "feat: complete numeric energy rollout boundaries"
```

---

### Task 18: Final focused verification and browser acceptance

**Files:**
- Modify only failing numeric-energy files; do not repair unrelated repository work
- Update: `docs/superpowers/specs/2026-09-12-numeric-energy-system-design.md` only if implementation evidence reveals an owner-approved correction
- Create: `.codex-tmp/numeric-energy-v2/verification.md` as ignored evidence, not a committed product file

- [ ] **Step 1: Run static retirement and callsite guards**

```powershell
npx tsx tests/energy_session_callsites_contract.ts
rg -n "energy_spent_on_start|EnergySpendFlightHost|ENERGY_SPEND_TRANSFER_HYBRID|energy-start-cost|energy_full\.webp|energy_plus2\.webp|energy_plus3\.webp" app components constants hooks
```

Expected: callsite contract PASS and zero production matches for retired flight/assets.

- [ ] **Step 2: Run the focused numeric-energy Jest gate under one semaphore slot**

Run the shared Jest command with:

`tests/energy_contract.test.ts tests/energy_state_v2.test.ts tests/energy_gift_effects.test.ts tests/energy_system.test.ts tests/energy_video_watch_credit.test.ts tests/energy_refill_price_fairness.test.ts tests/energy_refill_contract.test.ts tests/energy_visual_transactions.test.ts tests/animated_energy_number.test.tsx tests/energy_hud_pill.test.tsx tests/energy_copy.test.ts tests/energy_cost_badge_plus.test.tsx tests/insufficient_energy_sheet.test.tsx tests/numeric_energy_reward_sources.test.ts tests/energy_raster_retirement_contract.test.ts tests/energy_hud_surface_contract.test.ts tests/numeric_energy_rollout_contract.test.ts tests/notifications_energy_full.test.ts`.

Expected: all listed suites PASS.

- [ ] **Step 3: Run a scoped TypeScript check under the semaphore**

```powershell
bash .claude/semaphore/slot.sh acquire "tsc numeric energy"; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; try { npx tsc --noEmit --pretty false; if ($LASTEXITCODE -ne 0) { throw "tsc failed" } } finally { bash .claude/semaphore/slot.sh release }
```

Expected: exit 0. If unrelated pre-existing errors remain, record exact file/line evidence and verify every changed numeric-energy file with the narrowest available TypeScript gate; do not edit unrelated files.

- [ ] **Step 4: Verify the approved journeys in browser/device**

Use the existing development runtime and verify these exact scenarios:

1. 86 normal → lesson start → local `−20` cue → HUD counts 86 through 66 once.
2. 86 → Arena → counts through 61 once; reconnect to same match costs 0.
3. 19 low state has coral + non-color label and gives exact time to 20/25.
4. 34 + `energy_plus2` → counts to 140, turns gold, says `Перегруз до полуночи`.
5. 140 spend 25 → bonus is spent before base; midnight expiry counts to surviving base.
6. 86 + 36 verified video seconds → 87; pause/buffer/seek gives no credit.
7. Plus Pro always shows ∞, keeps cost value visible as included, and video grants existing runes.
8. Free window shows ∞ until 22:00 without overwriting the underlying balance.
9. 86→100 pearl refill costs 3 and leaves temporary capacity untouched.
10. Reduced Motion jumps to each final state with no rolling, flight, pulse, or loop.

Capture concise results in `.codex-tmp/numeric-energy-v2/verification.md`.

- [ ] **Step 5: Run the Learning V2 and protected-surface focused gates**

Reread the applicable `СТАРТ В2` route, run its drift check, then run only the energy-adjacent Learning V2 gate required by that route. Run the Arena owner UI contract and the economy composite-operation guard. Acquire the shared semaphore for any Jest/build command.

Expected: `ON TRACK`, Learning V2 focused gate PASS, Arena contract PASS, and economy guard PASS. Do not weaken a guard to obtain green.

- [ ] **Step 6: Review the final diff and commit verification fixes**

```powershell
git diff --check
git status --short
git diff -- app/energy_contract.ts app/energy_state_v2.ts app/energy_gift_effects.ts app/energy_visual_transactions.ts app/energy_system.ts components/EnergyContext.tsx components/EnergyHudPill.tsx components/AnimatedEnergyNumber.tsx components/EnergyCostBadge.tsx components/InsufficientEnergySheet.tsx
```

Expected: no whitespace errors, no unrelated changes staged by this work, no retired assets/events, and every visible mutation routes through a unique visual transaction.

Commit only any final numeric-energy corrections:

```powershell
git commit -m "test: verify numeric energy system"
```

## Specification traceability

| Approved specification requirement | Implemented and verified by |
|---|---|
| Base/bonus partitions and 100/300 caps | Tasks 1–4 |
| Fractional recovery with carried division remainder | Tasks 2, 6, 7 |
| Passive +10/hour and turbo +15/hour | Tasks 1, 2, 7 |
| Verified video +100/hour without passive stacking | Task 6 |
| Plus Pro, free-for-all, free window, and tester infinity | Tasks 4, 10, 17 |
| Typed 10/20/25/0 activity catalog | Tasks 1, 4, 13 |
| Atomic start receipt, replay, reconnect, and compensation | Tasks 4, 5, 13 |
| Full and +20/+40/+60 gifts from every source | Tasks 3, 12, 14 |
| Midnight stacking/expiry and visible gold overcharge | Tasks 3, 5, 9, 10, 12 |
| Base-only pearl refill with preserved exchange value | Task 8 |
| Shared pill, popover, shortage sheet, copy, and nine locales | Tasks 9–11, 16 |
| Integer-by-integer motion and Reduced Motion | Tasks 5, 9–11, 18 |
| Removal of old flight and raster assets | Tasks 14, 15 |
| Backward-compatible V2 migration and coordinated rollout | Tasks 2, 3, 17 |
| Rate-aware notifications and quiet hours | Task 7 |
| Account isolation, corruption, concurrency, and no orphan debit | Tasks 3, 4, 8, 12, 17 |
| Performance, accessibility, all-screen and browser acceptance | Tasks 9–11, 16, 18 |

## Completion criteria

- Base capacity is exactly 100 at every level; passive recovery is +1 per six minutes.
- Verified video watching is +1 per 36 seconds for free users; Plus keeps the existing rune path.
- Activity prices are 10/20/25/0 from one typed catalog and cannot diverge between preview, availability, debit, refund, analytics, or tests.
- Plus Pro and the free window show ∞ with their distinct reason; the underlying balance remains intact.
- `energy_plus1/2/3` mean +20/+40/+60 capacity, fill to 120/140/160 from any prior balance, stack to active cap 300, and expire at local midnight.
- Every gift/reward source, inventory, reveal, preview, notification, and receipt uses the new effect.
- Pearl refill uses `max(1, ceil((100-base)/5))`, fills base only, and is one durable composite operation.
- Every visible balance change animates each intermediate integer exactly once; Reduced Motion renders only the final semantic state.
- The old flight host/event/motion and all four energy raster assets are absent, with zero production references.
- All headers and energy modals use the shared HUD/popover/sheet; no ad-hoc 0–5 counter remains.
- Focused energy, Learning V2, Arena, notification, reward, phone-state, and economy guards pass without weakening contracts.
