# Achievements Foundation V2 — Mechanics Implementation Plan

> **Owner decision:** mechanics first, art second, shelf/board polish third.
> This plan covers mechanics only. The approved product contract is
> `docs/design/ACHIEVEMENTS_FOUNDATION_CATALOG_2026-08-21.md`.

## Goal

Ship one deterministic, account-safe achievement engine for the approved 70 active
awards while preserving the 9 already-earned retired awards. Achievement unlocks
grant XP only; they never grant pearls. XP granted by the unlock batch must not be
fed back into the same evaluation batch.

## Architecture

Keep `app/achievements.ts` as the public compatibility facade for screens and old
call sites, but move the new product rules into small modules:

- `app/achievement_catalog_v2.ts` — exact immutable catalog metadata and thresholds.
- `app/achievement_evaluator_v2.ts` — pure snapshot-to-ID evaluator; no storage,
  network, React Native, or rewards.
- `app/achievement_progress_v2.ts` — account-scoped, monotonic durable evidence and
  idempotent event reduction.
- `app/achievements.ts` — state migration, notifications, one-shot unlock commit and
  post-commit XP reward.

The evaluator runs in two passes. Pass 1 evaluates the 62 visible foundation
awards. Pass 2 evaluates the 8 secret legends against the persisted state that
existed before this batch plus IDs unlocked by pass 1. `legend_full_cabinet` may
unlock in pass 2, but no legend recursively causes another legend in that same
batch.

## Canonical IDs and thresholds

The implementation must use the exact IDs and copy in the approved catalog. The
mechanical threshold maps are:

```ts
export const STREAK_THRESHOLDS = {
  streak_3: 3, streak_7: 7, streak_14: 14, streak_30: 30,
  streak_60: 60, streak_100: 100, streak_150: 150, streak_200: 200,
  streak_250: 250, streak_365: 365, streak_500: 500, streak_750: 750,
  streak_1000: 1000,
} as const;

export const XP_THRESHOLDS = {
  xp_100: 100, xp_250: 250, xp_500: 500, xp_1000: 1_000,
  xp_2500: 2_500, xp_5000: 5_000, xp_10000: 10_000,
  xp_20000: 20_000, xp_50000: 50_000, xp_75000: 75_000,
  xp_100000: 100_000, xp_150000: 150_000, xp_250000: 250_000,
  xp_500000: 500_000, xp_750000: 750_000, xp_1000000: 1_000_000,
  xp_2000000: 2_000_000,
} as const;

export const SHARD_MAX_THRESHOLDS = {
  shards_100: 100, shards_250: 250, shards_500: 500, shards_1000: 1_000,
  shards_2500: 2_500, shards_5000: 5_000, shards_10000: 10_000,
} as const;

export const FOREGROUND_THRESHOLDS_MS = {
  time_foreground_10h: 10 * 60 * 60_000,
  time_foreground_50h: 50 * 60 * 60_000,
  time_foreground_100h: 100 * 60 * 60_000,
  time_foreground_250h: 250 * 60 * 60_000,
  time_foreground_500h: 500 * 60 * 60_000,
  time_foreground_1000h: 1000 * 60 * 60_000,
} as const;
```

League IDs map 1:1 to `CLUBS[0..11]` using new immutable IDs:
`league_reached_copper`, `league_reached_bronze`, `league_reached_silver`,
`league_reached_gold`, `league_reached_platinum`, `league_reached_emerald`,
`league_reached_sapphire`, `league_reached_ruby`, `league_reached_diamond`,
`league_reached_black_diamond`, `league_reached_ether`,
`league_reached_supreme`.

## Durable progress contract

Store one account-scoped JSON document under
`achievement_foundation_progress_v2` and add it to normal cloud-sync merge rules.
The serialized shape is:

```ts
export interface AchievementFoundationProgressV2 {
  version: 2;
  maxEligibleShardBalance: number;
  reachedLeagueIds: number[];
  processedLeagueWeeks: string[];
  championWeeks: string[];
  championLeagueIds: number[];
  diamondPlusConsecutiveWeeks: number;
  lastDiamondPlusWeekId: string | null;
  comeback: null | {
    returnDate: string;
    windowEndDate: string;
    activeDates: string[];
    qualified: boolean;
  };
  paidAccess: { plus: boolean; pro: boolean };
}
```

All reducers are monotonic. Arrays are normalized, unique, bounded and sorted.
`processedLeagueWeeks` is the idempotency guard. A league result is accepted only
when its server-confirmed `weekId`, `points`, `prevLeagueId`, `newLeagueId`, rank
and total are present. Copper requires `points > 0`. Champion counters use unique
week IDs, never UI modal displays. Diamond+ continuity uses ISO-week adjacency;
duplicate or older results cannot increment it.

`maxEligibleShardBalance` consumes the existing
`eligibleAchievementBalance` payload so bought pearl packs do not fake a balance
milestone. Spending never lowers the historical maximum.

## Task 1 — Lock the catalog contract with tests

**Files:**

- Create `tests/achievement_foundation_catalog_v2.test.ts`.
- Create `scripts/guard_achievement_foundation_v2.mjs` as the lightweight local gate.
- Modify `app/achievement_catalog_v2.ts`.

**Red assertions:**

1. Exactly 70 non-retired definitions and exactly 9 retired definitions.
2. 62 visible and 8 secret active definitions.
3. Every ID is unique; no active ID refers to lessons, cards, Max, dialogs,
   mistakes, exams, or daily tasks.
4. Exact category counts are 14/17/7/12/4/6/2/8.
5. No active definition contains a pearl reward field; every active definition
   has positive XP and approved RU name/description.
6. Published existing IDs keep their original metric semantics.

**Green implementation:** move all active definitions and exact approved RU copy
into the catalog module. Keep the 9 historical definitions in the same exported
catalog with `retired: true`. Export `ACTIVE_FOUNDATION_IDS` and
`SECRET_FOUNDATION_IDS` for guards and UI filtering.

**Verify:**

```powershell
node scripts/guard_achievement_foundation_v2.mjs
```

## Task 2 — Build the pure two-pass evaluator

**Files:**

- Create `app/achievement_evaluator_v2.ts`.
- Create `tests/achievement_evaluator_v2.test.ts`.

**Snapshot contract:**

```ts
export interface AchievementFoundationSnapshot {
  streakDays: number;
  cleanStreakDays: number;
  totalXpBeforeAchievementRewards: number;
  maxEligibleShardBalance: number;
  reachedLeagueIds: readonly number[];
  championCount: number;
  championLeagueIds: readonly number[];
  diamondPlusConsecutiveWeeks: number;
  foregroundMs: number;
  paidAccess: Readonly<{ plus: boolean; pro: boolean }>;
  activeDaysTotal: number;
  accountAgeDays: number;
  comebackQualified: boolean;
  unlockedBeforeBatch: ReadonlySet<string>;
}
```

**Red assertions:** every threshold boundary (`n-1`, `n`), clean-year safety,
all 12 league mappings, unique champion counts, Diamond+ streak, Plus/Pro facts,
and all eight legend conjunctions. Explicitly prove that XP reward from an ID in
the returned batch is not an evaluator input.

**Green implementation:** `evaluateFoundationAchievements(snapshot)` returns an
ordered unique ID list. It must be a pure function and must not import
AsyncStorage, events, XP manager or Firestore.

## Task 3 — Add monotonic account-scoped progress reduction

**Files:**

- Create `app/achievement_progress_v2.ts`.
- Create `tests/achievement_progress_v2.test.ts`.
- Modify `app/cloud_sync.ts`.

**Red assertions:** malformed JSON repairs to defaults; shard max never decreases;
duplicate league week is a no-op; out-of-order weeks cannot inflate streaks;
champion weeks are unique; arrays are bounded; account-generation changes abort
writes; cloud restore merges max/union/true without losing evidence.

**Green implementation:** read/write through `withAccountTransitionLock` and
`withStorageLock`, validate `captureAccountGeneration`, and expose pure reducer
helpers for deterministic testing. Add a custom merge strategy for this key;
plain LWW is forbidden for monotonic evidence.

## Task 4 — Replace branch-heavy unlocking with snapshot evaluation

**Files:**

- Modify `app/achievements.ts`.
- Modify `app/achievements_es_locale.ts` only to keep locale fallback valid for
  active IDs; do not invent translations during mechanics.
- Modify `tests/achievements.test.ts` or add
  `tests/achievement_foundation_integration.test.ts`.

**Red assertions:** old unlocked states survive; nine retired states appear only
when previously earned; new IDs are added locked; one event unlocks one batch;
batch persists before XP reward; backfill is silent; no pearl claim appears; an
achievement XP reward cannot recursively unlock a later XP threshold.

**Green implementation:** retain `checkAchievements` as a compatibility facade,
reduce the incoming evidence, build one snapshot from durable sources, call the
pure evaluator once, merge the returned IDs atomically, then award XP after the
unlock state is durable. Deleted legacy event types remain immediate no-ops.

## Task 5 — Wire streak, XP, balance, active days and foreground time

**Files:**

- Modify `app/events.ts`.
- Modify `app/foreground_usage_ms.ts`.
- Modify `app/hall_of_fame_utils.ts`.
- Modify `app/achievements_screen.tsx` only if its opening backfill needs the new
  snapshot entry point.

**Red assertions:** foreground emits only after a durable flush and never counts
background; active-day count decodes the existing bitset; 30-day inactivity arms
one comeback window and 7 distinct active dates within the next 10 qualify it;
shard replacement/spend cannot lower max; streak safety blocks only
`streak_clean_365`, not ordinary streak awards.

**Green implementation:** add typed, low-frequency evidence events. Do not add a
second timer. Reuse the existing five-minute foreground flush. On screen open,
run one lightweight snapshot backfill so users do not need to wait for the next
timer boundary.

## Task 6 — Make league evidence confirmed and idempotent

**Files:**

- Modify `app/league_engine.ts` without changing promotion/demotion logic.
- Modify `app/(tabs)/home.tsx`.
- Modify `app/club_screen.tsx`.
- Modify focused league-result contract tests.

Extend `LeagueResult` with immutable evidence:

```ts
weekId: string;
points: number;
confirmed: boolean;
```

Server documents produce `confirmed: true`. A locally calculated fallback may
still drive the existing modal, but it cannot award league achievements until a
confirmed result arrives. Both UI hosts may submit the same result; progress
reduction deduplicates by `weekId`. Preserve all owner-mandated zero-point
demotion and six-hour cache logic unchanged.

Test Copper `points > 0`, every reached league, duplicate host delivery, first
place in distinct weeks, Supreme champion, and four adjacent Diamond+ weeks.

## Task 7 — Observe production paid-access facts (critical boundary)

**Files:**

- Modify `functions/src/revenuecat_shards.ts`.
- Modify its focused tests.
- Modify `app/cloud_sync.ts` and `app/achievement_progress_v2.ts`.
- Modify `firestore.rules`.
- Modify the relevant `functions/src/jarvis/*_firestore_fetcher.ts` only if it
  reads the changed progress shape.
- Modify `functions/src/jarvis/jarvis_data_contract_guard.test.ts`.

In the existing idempotent RevenueCat transaction, append server-owned progress
facts only for `environment === PRODUCTION` and a genuine paid origin:

- Plus: `INITIAL_PURCHASE` with non-`TRIAL` period for a Plus subscription.
- Pro: `NON_RENEWING_PURCHASE` for the lifetime Pro product.

Do not award on trial, renewal, restore, admin grant, promo, gift, transfer or
sandbox. The facts are immutable booleans and observe the existing receipt; they
do not modify entitlement, price, balance, refunds or access. Client sync may read
them but never upload them. Update Firestore and Jarvis contracts in the same
change.

Because this touches money/access, implement and review it as an isolated patch
after Tasks 1–6 pass their deterministic gates.

## Task 8 — Migration and light verification

**Files:**

- Modify `scripts/guard_achievement_catalog_v2.mjs` if its retired/active counts
  need the new exact contract.
- Add only narrowly scoped contract tests required above.

Migration is additive: preserve unlocked timestamps and notification state for
known IDs, retain nine earned retired IDs, add new active IDs locked, and create
the V2 evidence document from existing XP/streak/shard/time/league state. Never
show a toast for historical backfill.

Run only lightweight local gates on this machine:

```powershell
node scripts/guard_achievement_foundation_v2.mjs
node scripts/guard_achievement_catalog_v2.mjs
node -e "const ts=require('typescript'); /* transpile only touched TS files */"
```

Run focused Jest tests in CI or only when the machine is stable:

```powershell
npx jest tests/achievement_foundation_catalog_v2.test.ts tests/achievement_evaluator_v2.test.ts tests/achievement_progress_v2.test.ts --runInBand
```

## Mechanics acceptance criteria

- Active shelf contains exactly the approved 70 awards; 9 historical awards are
  retained only for users who already earned them.
- No active award depends on Learning V1, Max, dialogs, cards or mistake practice.
- Unlocking never creates or claims pearls.
- Thresholds and composite conditions are deterministic and separately tested.
- League and purchase awards use confirmed, idempotent evidence.
- Existing achievement history survives migration and backfill creates no toast
  storm.
- No full build, broad Jest suite, emulator or background worker is required for
  local verification.

