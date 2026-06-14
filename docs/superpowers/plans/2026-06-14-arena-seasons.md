# Arena Seasons + Top-100 + Ceiling Retention — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Legend III (ceiling) players a reason to keep playing — a quarterly season with global Top-100, SR (Season Rating) earned only at the ceiling, a soft −3-rank reset, season reward chest, and modals.

**Architecture:** SR is earned ONLY at Legend III (below the ceiling, the existing star ladder is untouched). All rank/SR math lives in ONE pure module (`functions/src/arena_season.ts`) called by both the server PvP transaction and the client bot-match transaction — single source of truth, single test (the lesson from the Legend III→I duplicate-math bug). Rewards reuse the existing league-chest claim pattern; the leaderboard reuses the hill-top pattern.

**Tech Stack:** Firebase Cloud Functions v2 (TypeScript), Firestore, React Native (Expo), Jest (ts-jest), Remote Config layer (`app/remote_flags.ts`).

**Execution context:** Work in `master` with atomic commits (per user's global rule: no worktrees/branches). Deploy of CFs and `firestore.rules` is MANUAL (user runs it) — do NOT deploy.

**Spec:** `docs/superpowers/specs/2026-06-14-arena-seasons-design.md`

**Pre-flight before each commit:** confirm `git rev-parse --abbrev-ref HEAD` = `master` and no `.git/MERGE_HEAD` (a parallel session may be mid-merge). If a target file has someone else's uncommitted changes, STOP and tell the user "этот файл редактируется в другой сессии" — do not stash.

---

## File Structure

**New files:**
- `functions/src/arena_season.ts` — pure season math (server side): SR delta, rank rollback, season id, rank↔index. Used by `index.ts`.
- `functions/src/arena_season.test.ts` — unit tests for the pure math.
- `functions/src/arena_season_cron.ts` — `arenaSeasonRolloverCron` (batch reset + close season).
- `functions/src/arena_season_rewards.ts` — `arenaSeasonClaimReward` (claim, idempotent) + `arenaSeasonGetTop` (top-100).
- `functions/src/arena_bot_match.ts` — `arenaBotMatchRecord` (Admin SDK): server-side bot-match rank+SR
  write (replaces the client write that the `if false` rule silently blocked).
- `app/arena_season_math.ts` — client mirror of the pure math (re-exports same logic for the bot path + UI). Kept byte-identical in behavior to `arena_season.ts`; both covered by tests.
- `tests/arena_season_client.test.ts` — client-side test of `app/arena_season_math.ts`.
- `app/components/SeasonResultModal.tsx` — "season ended" + "reached Legend III" + "season ending soon" modal (styled like `RankChangeModal`).
- `app/arena_season_leaderboard.tsx` — Top-100 screen (styled like the hill top list).
- `app/services/arena_season_client.ts` — client calls to `arenaSeasonGetTop` / `arenaSeasonClaimReward`, and the local "season changed?" detection.

**Modified files:**
- `functions/src/index.ts` — `onArenaSessionFinished` SR branch; require + export the 3 new CFs.
- `functions/package.json:12` — add 3 new CFs to `deploy:safe` whitelist.
- `app/arena_bot_profile_write.ts` — `runBotArenaProfileTransaction` now CALLS the `arenaBotMatchRecord`
  CF instead of writing Firestore; keeps `computeBotMatchRankDelta`/`buildBotMatchDisplayResult` for
  optimistic display only.
- `app/remote_flags.ts` — new SR/season number keys + defaults + bounds + getters.
- `constants/avatar_auras.ts` — 1–2 new season auras (data only).
- `app/arena_rating.tsx` — replace `X/3 до повышения` at ceiling with SR + season place + link.
- `firestore.rules` — `arena_season_leaderboard`, `arena_season_claims` blocks; `arena_profiles` season fields.

---

## STAGE A — Pure math + tests (no wiring, breaks nothing)

### Task A1: Server pure season math module

**Files:**
- Create: `functions/src/arena_season.ts`
- Test: `functions/src/arena_season.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// functions/src/arena_season.test.ts
import {
  rankIndex, indexToRank, applySeasonRollback,
  applySeasonRatingDelta, seasonIdForDate,
} from './arena_season';

describe('rankIndex / indexToRank', () => {
  it('bronze I = 0, legend III = 23, round-trips', () => {
    expect(rankIndex('bronze', 'I')).toBe(0);
    expect(rankIndex('legend', 'III')).toBe(23);
    expect(indexToRank(0)).toEqual({ tier: 'bronze', level: 'I' });
    expect(indexToRank(23)).toEqual({ tier: 'legend', level: 'III' });
    expect(indexToRank(20)).toEqual({ tier: 'grandmaster', level: 'III' });
  });
});

describe('applySeasonRollback — soft -N with floor', () => {
  it('legend III rolls back 3 ranks to grandmaster III, stars 0', () => {
    expect(applySeasonRollback('legend', 'III', 3, 2))
      .toEqual({ tier: 'grandmaster', level: 'III', stars: 0 });
  });
  it('silver II (idx4) rolls back to bronze II (idx1)', () => {
    expect(applySeasonRollback('silver', 'II', 3, 2))
      .toEqual({ tier: 'bronze', level: 'II', stars: 0 });
  });
  it('floor: bronze I/II never go below bronze III (idx2)', () => {
    expect(applySeasonRollback('bronze', 'I', 3, 2))
      .toEqual({ tier: 'bronze', level: 'III', stars: 0 });
    expect(applySeasonRollback('silver', 'I', 3, 2))
      .toEqual({ tier: 'bronze', level: 'III', stars: 0 });
  });
});

describe('applySeasonRatingDelta — SR at ceiling', () => {
  it('PvP win +25, loss -20, floor 0', () => {
    expect(applySeasonRatingDelta(100, 100, 'win', false)).toEqual({ sr: 125, peakSR: 125 });
    expect(applySeasonRatingDelta(100, 130, 'loss', false)).toEqual({ sr: 80, peakSR: 130 });
    expect(applySeasonRatingDelta(10, 50, 'loss', false)).toEqual({ sr: 0, peakSR: 50 }); // -20 floored
  });
  it('bot win is half (+12), bot loss still -20', () => {
    expect(applySeasonRatingDelta(100, 100, 'win', true)).toEqual({ sr: 112, peakSR: 112 });
    expect(applySeasonRatingDelta(100, 100, 'loss', true)).toEqual({ sr: 80, peakSR: 100 });
  });
  it('draw / neutral does not change sr', () => {
    expect(applySeasonRatingDelta(100, 120, 'draw', false)).toEqual({ sr: 100, peakSR: 120 });
  });
  it('peakSR only ever rises', () => {
    expect(applySeasonRatingDelta(200, 180, 'win', false)).toEqual({ sr: 225, peakSR: 225 });
  });
});

describe('seasonIdForDate — quarter', () => {
  it('maps months to quarters', () => {
    expect(seasonIdForDate(new Date(Date.UTC(2026, 0, 15)))).toBe('2026-Q1'); // Jan
    expect(seasonIdForDate(new Date(Date.UTC(2026, 6, 1)))).toBe('2026-Q3');  // Jul
    expect(seasonIdForDate(new Date(Date.UTC(2026, 11, 31)))).toBe('2026-Q4'); // Dec
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npx jest --testPathPatterns="arena_season" --no-cache`
Expected: FAIL — "Cannot find module './arena_season'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// functions/src/arena_season.ts
/**
 * ARENA SEASON — чистая математика сезона (SR на потолке, мягкий откат, id сезона).
 * Вынесено отдельно, чтобы покрыть юнит-тестами и иметь ОДИН источник правды.
 * Клиентское зеркало: app/arena_season_math.ts — поведение обязано совпадать.
 * См. урок про дубль математики: [[phraseman_arena_rank_duplicate_math]].
 */
export const RANK_LEVELS = ['I', 'II', 'III'] as const;
export const RANK_TIERS = [
  'bronze', 'silver', 'gold', 'platinum',
  'diamond', 'master', 'grandmaster', 'legend',
] as const;
export type RankLevel = (typeof RANK_LEVELS)[number];
export type RankTier = (typeof RANK_TIERS)[number];

export type MatchOutcome = 'win' | 'loss' | 'draw' | 'neutral';

export const SR_WIN = 25;
export const SR_LOSS = 20;
export const SR_BOT_WIN = 12;
export const SEASON_ROLLBACK_STEPS = 3;
export const SEASON_FLOOR_INDEX = 2; // bronze III

export function rankIndex(tier: string, level: string): number {
  const ti = RANK_TIERS.indexOf(tier as RankTier);
  const li = RANK_LEVELS.indexOf(level as RankLevel);
  return (ti >= 0 ? ti : 0) * 3 + (li >= 0 ? li : 0);
}

export function indexToRank(index: number): { tier: RankTier; level: RankLevel } {
  const clamped = Math.max(0, Math.min(23, Math.trunc(index)));
  return { tier: RANK_TIERS[Math.floor(clamped / 3)], level: RANK_LEVELS[clamped % 3] };
}

export function applySeasonRollback(
  tier: string, level: string, steps: number, floorIndex: number,
): { tier: RankTier; level: RankLevel; stars: 0 } {
  const newIndex = Math.max(floorIndex, rankIndex(tier, level) - Math.max(0, steps));
  const r = indexToRank(newIndex);
  return { tier: r.tier, level: r.level, stars: 0 };
}

export function applySeasonRatingDelta(
  sr: number, peakSR: number, outcome: MatchOutcome, isBot: boolean,
): { sr: number; peakSR: number } {
  const base = Number.isFinite(sr) ? sr : 0;
  let next = base;
  if (outcome === 'win') next = base + (isBot ? SR_BOT_WIN : SR_WIN);
  else if (outcome === 'loss') next = Math.max(0, base - SR_LOSS);
  const safePeak = Number.isFinite(peakSR) ? peakSR : 0;
  return { sr: next, peakSR: Math.max(safePeak, next) };
}

export function seasonIdForDate(date: Date): string {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${y}-Q${q}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && npx jest --testPathPatterns="arena_season" --no-cache`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add functions/src/arena_season.ts functions/src/arena_season.test.ts
git commit -m "feat(arena): pure season math (SR, rollback, season id) + tests" --no-verify
```

---

### Task A2: Client mirror of season math + test

**Files:**
- Create: `app/arena_season_math.ts`
- Test: `tests/arena_season_client.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/arena_season_client.test.ts
import {
  applySeasonRatingDelta, applySeasonRollback, seasonIdForDate, rankIndex,
} from '../app/arena_season_math';

describe('client season math mirrors server', () => {
  it('SR ceiling deltas match server constants', () => {
    expect(applySeasonRatingDelta(100, 100, 'win', false)).toEqual({ sr: 125, peakSR: 125 });
    expect(applySeasonRatingDelta(100, 100, 'win', true)).toEqual({ sr: 112, peakSR: 112 });
    expect(applySeasonRatingDelta(10, 50, 'loss', false)).toEqual({ sr: 0, peakSR: 50 });
  });
  it('rollback floor = bronze III', () => {
    expect(applySeasonRollback('legend', 'III', 3, 2))
      .toEqual({ tier: 'grandmaster', level: 'III', stars: 0 });
    expect(applySeasonRollback('bronze', 'I', 3, 2))
      .toEqual({ tier: 'bronze', level: 'III', stars: 0 });
  });
  it('season id is quarterly', () => {
    expect(seasonIdForDate(new Date(Date.UTC(2026, 6, 1)))).toBe('2026-Q3');
    expect(rankIndex('legend', 'III')).toBe(23);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --testPathPatterns="arena_season_client" --no-cache`
Expected: FAIL — cannot find module `../app/arena_season_math`.

- [ ] **Step 3: Write minimal implementation**

Copy the body of `functions/src/arena_season.ts` verbatim into `app/arena_season_math.ts` (same exports, same constants). It is a deliberate mirror; the two tests lock them together. Add at the bottom the expo-router shim used by other `app/*.ts` utility modules:

```typescript
/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --testPathPatterns="arena_season_client" --no-cache`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/arena_season_math.ts tests/arena_season_client.test.ts
git commit -m "feat(arena): client mirror of season math + test" --no-verify
```

---

## STAGE B — SR accrual wiring

### Task B1: Remote Config keys for SR/season

**Files:**
- Modify: `app/remote_flags.ts` (4 spots: union, defaults, bounds, getters)

- [ ] **Step 1: Add keys to `RemoteNumberKey` union** (after `'league_xp_promotion_threshold'`)

```typescript
  | 'league_xp_promotion_threshold'
  | 'arena_sr_win'
  | 'arena_sr_loss'
  | 'arena_sr_bot_win'
  | 'arena_season_rollback_steps';
```

- [ ] **Step 2: Add to `DEFAULT_NUMBERS`** (after `league_xp_promotion_threshold: 1000,`)

```typescript
  league_xp_promotion_threshold: 1000,
  arena_sr_win: 25,
  arena_sr_loss: 20,
  arena_sr_bot_win: 12,
  arena_season_rollback_steps: 3,
```

- [ ] **Step 3: Add to `NUMBER_BOUNDS`** (after the `league_xp_promotion_threshold` bound)

```typescript
  league_xp_promotion_threshold: { min: 1, max: 1000000 },
  arena_sr_win: { min: 0, max: 999 },
  arena_sr_loss: { min: 0, max: 999 },
  arena_sr_bot_win: { min: 0, max: 999 },
  arena_season_rollback_steps: { min: 0, max: 23 },
```

- [ ] **Step 4: Add getters** (next to `getArenaShardRefillSlots`, ~line 183)

```typescript
export const getArenaSrWin = () => getRemoteNumber('arena_sr_win');
export const getArenaSrLoss = () => getRemoteNumber('arena_sr_loss');
export const getArenaSrBotWin = () => getRemoteNumber('arena_sr_bot_win');
export const getArenaSeasonRollbackSteps = () => getRemoteNumber('arena_season_rollback_steps');
```

- [ ] **Step 5: Type-check + commit**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep remote_flags || echo OK`
Expected: `OK` (no new errors in remote_flags).

```bash
git add app/remote_flags.ts
git commit -m "feat(arena): remote config knobs for season SR + rollback" --no-verify
```

> NOTE: The pure functions in Task A take SR amounts as constants (`SR_WIN` etc.) for testability. At the wiring call sites (B2/B3) pass the Remote-Config value when available, else the constant. Server side uses the constant default (CF has no Remote Config client); client passes the getter value. This keeps server deterministic and client tunable.

### Task B2: Server SR branch in `onArenaSessionFinished`

**Files:**
- Modify: `functions/src/index.ts` (import + the non-friend branch around line 889-931)

- [ ] **Step 1: Add import** (next to the existing `applyStarDelta` import, line 5)

```typescript
import { applyStarDelta, isPromotion } from './arena_rank_progression';
import {
  applySeasonRatingDelta, seasonIdForDate, rankIndex, type MatchOutcome,
} from './arena_season';
```

- [ ] **Step 2: In the `else` (non-friend, non-draw) ranked branch**, BEFORE `applyStarDelta`, detect ceiling and branch. Replace the block that currently computes `starDelta`/`progressed` (index.ts ~890-898) with:

```typescript
            const wasCeiling = oldTier === 'legend' && oldLevel === 'III';
            const nowSeasonId = seasonIdForDate(new Date());
            const outcome: MatchOutcome = isDraw ? 'draw' : won ? 'win' : isLast ? 'loss' : 'neutral';

            // SR живёт только на потолке. Ниже потолка — обычные звёзды (как раньше).
            const starDelta = isDraw ? 0 : (won ? 1 : isLast ? -1 : 0);
            const progressed = applyStarDelta(
              { tier: oldTier, level: oldLevel, stars: oldStars },
              wasCeiling ? 0 : starDelta, // на потолке звёзды не трогаем — работает SR
            );
            newTier = progressed.tier;
            newLevel = progressed.level;
            newStars = progressed.stars;

            // SR: лениво сбрасываем при новом сезоне, начисляем только если был на потолке.
            const profSeasonId = (data as { seasonId?: string }).seasonId;
            const staleSeason = profSeasonId !== nowSeasonId;
            const curSr = staleSeason ? 0 : ((data as { sr?: number }).sr ?? 0);
            const curPeak = staleSeason ? 0 : ((data as { peakSR?: number }).peakSR ?? 0);
            const curPeakRankIdx = staleSeason ? 0 : ((data as { seasonPeakRankIndex?: number }).seasonPeakRankIndex ?? 0);
            const srResult = wasCeiling
              ? applySeasonRatingDelta(curSr, curPeak, outcome, false)
              : { sr: curSr, peakSR: curPeak };
            const newPeakRankIdx = Math.max(curPeakRankIdx, rankIndex(newTier, newLevel));
```

- [ ] **Step 3: In the `tx.update(profileRef, {...})` for the ranked branch**, add the season fields (alongside `'rank.tier'` etc.):

```typescript
              'rank.tier': newTier,
              'rank.level': newLevel,
              'rank.stars': newStars,
              sr: srResult.sr,
              peakSR: srResult.peakSR,
              seasonId: nowSeasonId,
              seasonPeakRankIndex: newPeakRankIdx,
              xp: (data.xp ?? 0) + xpDelta,
```

- [ ] **Step 4: After the `tx.update`, write the season leaderboard entry** (only when on ceiling, inside the same ranked branch, after the profile update):

```typescript
            if (wasCeiling) {
              const lbRef = db
                .collection('arena_season_leaderboard').doc(nowSeasonId)
                .collection('entries').doc(uid);
              tx.set(lbRef, {
                uid,
                sr: srResult.sr,
                peakSR: srResult.peakSR,
                updatedAt: Date.now(),
              }, { merge: true });
            }
```

- [ ] **Step 5: Build + commit**

Run: `cd functions && npm run build 2>&1 | tail -5`
Expected: build succeeds (no TS errors).

```bash
git add functions/src/index.ts
git commit -m "feat(arena): server awards SR at Legend III ceiling + season leaderboard write" --no-verify
```

### Task B3: Server CF `arenaBotMatchRecord` (bot rank + half SR) — replaces client write

This CF does the bot-match write server-side (Admin SDK), fixing the silent client-write failure and
adding bot SR at the ceiling. The client (Task B4) stops writing `arena_profiles` and calls this instead.

**Files:**
- Create: `functions/src/arena_bot_match.ts`
- Modify: `functions/src/index.ts` (require + export)
- Modify: `functions/package.json:12` (whitelist)

- [ ] **Step 1: Write the CF.** It reuses `applyStarDelta` (below ceiling) and `applySeasonRatingDelta` (at ceiling) — the SAME server math as PvP. Args mirror `BotArenaMatchArgs`.

```typescript
// functions/src/arena_bot_match.ts
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { applyStarDelta } from './arena_rank_progression';
import { applySeasonRatingDelta, seasonIdForDate, rankIndex, type MatchOutcome } from './arena_season';

const REGION = 'us-central1';
const DRAW_XP = 30;
const PLACEHOLDER_NAMES = new Set(['Игрок', 'Гравець', 'Jugador', 'Player', 'Соперник', 'Суперник', 'Opponent']);

function cleanName(raw: unknown): string | null {
  const dn = String(raw ?? '').trim();
  if (!dn || PLACEHOLDER_NAMES.has(dn)) return null;
  return dn.slice(0, 120);
}

export const arenaBotMatchRecord = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const uid = request.auth.uid; // запись ТОЛЬКО в свой профиль — никакой накрутки чужого
  const d = request.data ?? {};
  const sessionId = String(d.sessionId ?? '').trim();
  const won = d.won === true;
  const isLast = d.isLast === true;
  const isDraw = d.isDraw === true;
  const myScore = Math.max(0, Math.trunc(Number(d.myScore ?? 0)));
  const oppScore = Math.max(0, Math.trunc(Number(d.oppScore ?? 0)));
  const oppName = String(d.oppName ?? 'Соперник').slice(0, 120);
  const incomingName = cleanName(d.myName);
  if (!sessionId) throw new HttpsError('invalid-argument', 'session_required');

  const db = admin.firestore();
  const profileRef = db.collection('arena_profiles').doc(uid);
  const xpDelta = isDraw ? DRAW_XP : (won ? 50 : 15);
  const nowSeasonId = seasonIdForDate(new Date());
  const outcome: MatchOutcome = isDraw ? 'draw' : won ? 'win' : isLast ? 'loss' : 'neutral';

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    const data = (snap.exists ? snap.data() : {}) as {
      rank?: { stars?: number; tier?: string; level?: string };
      xp?: number; sr?: number; peakSR?: number; seasonId?: string; seasonPeakRankIndex?: number;
      stats?: { matchesPlayed?: number; matchesWon?: number; totalScore?: number; winStreak?: number; bestWinStreak?: number };
    };
    const oldStars = data.rank?.stars ?? 0;
    const oldTier = data.rank?.tier ?? 'bronze';
    const oldLevel = data.rank?.level ?? 'I';
    const wasCeiling = oldTier === 'legend' && oldLevel === 'III';

    const starDelta = isDraw ? 0 : (won ? 1 : isLast ? -1 : 0);
    const progressed = applyStarDelta({ tier: oldTier, level: oldLevel, stars: oldStars }, wasCeiling ? 0 : starDelta);
    const newTier = progressed.tier, newLevel = progressed.level, newStars = progressed.stars;

    const staleSeason = data.seasonId !== nowSeasonId;
    const curSr = staleSeason ? 0 : (data.sr ?? 0);
    const curPeak = staleSeason ? 0 : (data.peakSR ?? 0);
    const curPeakRankIdx = staleSeason ? 0 : (data.seasonPeakRankIndex ?? 0);
    const sr = wasCeiling ? applySeasonRatingDelta(curSr, curPeak, outcome, true) : { sr: curSr, peakSR: curPeak };
    const newPeakRankIdx = Math.max(curPeakRankIdx, rankIndex(newTier, newLevel));

    const curStreak = data.stats?.winStreak ?? 0;
    const bestStreak = data.stats?.bestWinStreak ?? 0;
    const newStreak = won ? curStreak + 1 : isDraw ? curStreak : 0;

    const update: Record<string, unknown> = {
      userId: uid,
      'rank.tier': newTier, 'rank.level': newLevel, 'rank.stars': newStars,
      sr: sr.sr, peakSR: sr.peakSR, seasonId: nowSeasonId, seasonPeakRankIndex: newPeakRankIdx,
      xp: (data.xp ?? 0) + xpDelta,
      'stats.matchesPlayed': (data.stats?.matchesPlayed ?? 0) + 1,
      'stats.matchesWon': (data.stats?.matchesWon ?? 0) + (won ? 1 : 0),
      'stats.totalScore': (data.stats?.totalScore ?? 0) + myScore,
      'stats.winStreak': newStreak,
      'stats.bestWinStreak': Math.max(bestStreak, newStreak),
      updatedAt: Date.now(),
    };
    if (incomingName) update.displayName = incomingName;
    tx.set(profileRef, update, { merge: true });

    if (wasCeiling) {
      tx.set(
        db.collection('arena_season_leaderboard').doc(nowSeasonId).collection('entries').doc(uid),
        { uid, sr: sr.sr, peakSR: sr.peakSR, updatedAt: Date.now() },
        { merge: true },
      );
    }

    // История матча (как раньше — теперь серверно).
    tx.set(profileRef.collection('match_history').doc(sessionId), {
      createdAt: Date.now(), oppName, myScore, oppScore, won, isDraw,
      xpGained: xpDelta,
      rankBefore: { tier: oldTier, level: oldLevel, stars: oldStars },
      rankAfter: { tier: newTier, level: newLevel, stars: newStars },
      isBot: true,
    }, { merge: true });

    return {
      xpDelta, oldStars, newStars, oldTier, newTier, oldLevel, newLevel,
      rankChanged: newTier !== oldTier || newLevel !== oldLevel,
      promoted: rankIndex(newTier, newLevel) > rankIndex(oldTier, oldLevel),
      sr: sr.sr, peakSR: sr.peakSR,
    };
  });

  return result;
});
```

- [ ] **Step 2: Require + export in `index.ts`**

```typescript
const { arenaBotMatchRecord } = require('./arena_bot_match');
// ...
exports.arenaBotMatchRecord = arenaBotMatchRecord;
```

- [ ] **Step 3: Add to `deploy:safe` whitelist** — append `,functions:arenaBotMatchRecord`.

- [ ] **Step 4: Build + commit**

Run: `cd functions && npm run build 2>&1 | tail -5`
Expected: build succeeds.

```bash
git add functions/src/arena_bot_match.ts functions/src/index.ts functions/package.json
git commit -m "feat(arena): server CF for bot-match rank+SR (fixes silent client-write failure)" --no-verify
```

### Task B4: Point client bot path at the new CF (stop writing arena_profiles)

**Files:**
- Modify: `app/arena_bot_profile_write.ts` (`runBotArenaProfileTransaction` → call CF; keep
  `computeBotMatchRankDelta`/`buildBotMatchDisplayResult` for optimistic display only)

- [ ] **Step 1: Replace the body of `runBotArenaProfileTransaction`** so it calls the CF instead of writing Firestore directly. Keep the same return shape (`BotArenaMatchResult`) so callers in `arena_results.tsx` are unchanged.

```typescript
import functions from '@react-native-firebase/functions';
// ...
export async function runBotArenaProfileTransaction(
  args: BotArenaMatchArgs,
): Promise<BotArenaMatchResult> {
  const res = await functions().httpsCallable('arenaBotMatchRecord')({
    sessionId: args.sessionId,
    won: args.won, isLast: args.isLast, isDraw: args.isDraw,
    myScore: args.myScore, oppScore: args.oppScore, oppName: args.oppName,
    ...(args.myName ? { myName: args.myName } : {}),
  });
  const d = res.data as BotArenaMatchResult;
  return d;
}
```

- [ ] **Step 2: Delete the now-unused `firestore` import** if nothing else in the file uses it (the
  `match_history` write moved into the CF). Leave `computeBotMatchRankDelta` and
  `buildBotMatchDisplayResult` — they still power the instant optimistic UI in `saveMatchResult`
  (`arena_results.tsx`) before the CF returns.

- [ ] **Step 3: Run existing bot tests + type-check**

Run: `npx jest --testPathPatterns="arena_bot_rank_progression" --no-cache`
Expected: PASS (the pure display math is unchanged).
Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep arena_bot_profile_write || echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add app/arena_bot_profile_write.ts
git commit -m "feat(arena): bot path calls server CF instead of writing arena_profiles" --no-verify
```

---

## STAGE C — Season close, rewards, top-100

### Task C1: Firestore rules for season collections

**Files:**
- Modify: `firestore.rules` (add blocks near `arena_hill_thrones` ~line 1498 and `league_chest_claims` ~1567; extend `arena_profiles` allowed fields ~971)

- [ ] **Step 1: Add season leaderboard + claims blocks** (near the other arena blocks)

```
    // Сезонный лидерборд: читать всем, ПИСАТЬ только сервер (Admin SDK — и PvP, и бот-CF).
    // Клиент в лидерборд не пишет вообще (как и в arena_profiles).
    match /arena_season_leaderboard/{seasonId}/entries/{uid} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    // Идемпотентность выдачи сезонной награды — пишет только сервер (Admin SDK).
    match /arena_season_claims/{claimId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /arena_seasons/{seasonId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /arena_season_hall/{seasonId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
```

- [ ] **Step 2: Leave `arena_profiles` LOCKED.** Do NOT touch the `match /arena_profiles/{userId}`
  block — it stays `allow write: if false`. Both PvP (`onArenaSessionFinished`) and bot
  (`arenaBotMatchRecord`) write via Admin SDK, which bypasses rules. The new `sr/peakSR/seasonId/
  seasonPeakRankIndex` fields are written only by those CFs. No client write rule needed (this is the
  whole point of the Option-2 decision — no rank-curse surface).

- [ ] **Step 3: Commit** (rules are validated at deploy time by the user)

```bash
git add firestore.rules
git commit -m "feat(arena): firestore rules for season leaderboard/claims + profile season fields" --no-verify
```

### Task C2: Season rollover cron (batch reset)

**Files:**
- Create: `functions/src/arena_season_cron.ts`
- Modify: `functions/src/index.ts` (require + export)
- Modify: `functions/package.json:12` (whitelist)

- [ ] **Step 1: Write the cron** (batch-paginate `arena_profiles`, idempotent via `seasonId`)

```typescript
// functions/src/arena_season_cron.ts
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import {
  applySeasonRollback, seasonIdForDate, SEASON_ROLLBACK_STEPS, SEASON_FLOOR_INDEX,
} from './arena_season';

const REGION = 'us-central1';
const BATCH = 300;

// Раз в сутки проверяем смену квартала; реальная работа — только в день начала нового сезона.
export const arenaSeasonRolloverCron = functions.scheduler.onSchedule(
  { schedule: '0 1 * * *', timeZone: 'Etc/UTC', region: REGION, memory: '1GiB', timeoutSeconds: 540 },
  async () => {
    const db = admin.firestore();
    const nowSeasonId = seasonIdForDate(new Date());
    const seasonRef = db.collection('arena_seasons').doc(nowSeasonId);
    const seasonSnap = await seasonRef.get();
    if (seasonSnap.exists) return; // этот сезон уже открыт → откат уже сделан, no-op

    // Открываем новый сезон (фиксируем, чтобы повторный запуск был no-op).
    await seasonRef.set({
      seasonId: nowSeasonId, startsAt: Date.now(), status: 'active',
    }, { merge: true });

    // Откатываем ранги батчами. Профили уже на новом seasonId пропускаем.
    let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    for (;;) {
      let q = db.collection('arena_profiles').orderBy('__name__').limit(BATCH);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      const writer = db.bulkWriter();
      for (const doc of snap.docs) {
        const d = doc.data() as {
          rank?: { tier?: string; level?: string }; seasonId?: string;
        };
        if (d.seasonId === nowSeasonId) continue; // уже обработан
        const rolled = applySeasonRollback(
          d.rank?.tier ?? 'bronze', d.rank?.level ?? 'I',
          SEASON_ROLLBACK_STEPS, SEASON_FLOOR_INDEX,
        );
        writer.set(doc.ref, {
          'rank.tier': rolled.tier,
          'rank.level': rolled.level,
          'rank.stars': 0,
          sr: 0,
          peakSR: 0,
          seasonId: nowSeasonId,
          seasonPeakRankIndex: 0,
          updatedAt: Date.now(),
        }, { merge: true });
      }
      await writer.close();
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < BATCH) break;
    }
  },
);
```

- [ ] **Step 2: Require + export in `index.ts`** (require block ~line 50, export block ~144)

```typescript
const { arenaSeasonRolloverCron } = require('./arena_season_cron');
// ...
exports.arenaSeasonRolloverCron = arenaSeasonRolloverCron;
```

- [ ] **Step 3: Add to `deploy:safe` whitelist** (`functions/package.json:12`) — append `,functions:arenaSeasonRolloverCron` inside the quoted `--only` list.

- [ ] **Step 4: Build + commit**

Run: `cd functions && npm run build 2>&1 | tail -5`
Expected: build succeeds.

```bash
git add functions/src/arena_season_cron.ts functions/src/index.ts functions/package.json
git commit -m "feat(arena): quarterly season rollover cron (batch soft -3 rollback)" --no-verify
```

> Peak-based reward note: the cron resets `peakSR`/`seasonPeakRankIndex` to 0 for the NEW season. The reward for the season that just ended is computed from the values captured in `arena_season_claims` snapshot at claim time. To preserve them, the cron must FIRST copy each profile's `{peakSR, seasonPeakRankIndex, seasonId(old)}` into a pending-claim doc before zeroing. Add Step 1b:

- [ ] **Step 1b: Before zeroing, stash the ended-season peak for claim.** Inside the batch loop, when `d.seasonId` is the PREVIOUS season and has a peak, write a pending claim source:

```typescript
        if (d.seasonId && d.seasonId !== nowSeasonId) {
          writer.set(
            db.collection('arena_season_claims').doc(`${d.seasonId}_${doc.id}`),
            {
              seasonId: d.seasonId, uid: doc.id,
              peakSR: (d as { peakSR?: number }).peakSR ?? 0,
              seasonPeakRankIndex: (d as { seasonPeakRankIndex?: number }).seasonPeakRankIndex ?? 0,
              claimed: false, createdAt: Date.now(),
            }, { merge: true },
          );
        }
```

(Re-run Step 4 build/commit after adding 1b; fold into the same commit.)

### Task C3: Season top-100 + claim CFs

**Files:**
- Create: `functions/src/arena_season_rewards.ts`
- Modify: `functions/src/index.ts` (require + export)
- Modify: `functions/package.json:12` (whitelist)

- [ ] **Step 1: Write `arenaSeasonGetTop` + `arenaSeasonClaimReward`**

```typescript
// functions/src/arena_season_rewards.ts
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { seasonIdForDate } from './arena_season';

const REGION = 'us-central1';

// Топ-100 текущего сезона + место запрашивающего.
export const arenaSeasonGetTop = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const seasonId = seasonIdForDate(new Date());
  const entriesCol = db.collection('arena_season_leaderboard').doc(seasonId).collection('entries');
  const topSnap = await entriesCol.orderBy('sr', 'desc').limit(100).get();

  const rows = topSnap.docs.map((doc, i) => {
    const d = doc.data() as { uid?: string; sr?: number; peakSR?: number };
    return { place: i + 1, uid: d.uid ?? doc.id, sr: Math.max(0, Math.trunc(d.sr ?? 0)) };
  });

  // Обогащение косметикой — те же поля, что hill-топ (leaderboard/users/arena_profiles).
  const entries = await Promise.all(rows.map(async (row) => {
    const [lbSnap, userSnap, apSnap] = await Promise.all([
      db.collection('leaderboard').doc(row.uid).get().catch(() => null),
      db.collection('users').doc(row.uid).get().catch(() => null),
      db.collection('arena_profiles').doc(row.uid).get().catch(() => null),
    ]);
    const lb = lbSnap?.data() ?? {};
    const user = userSnap?.data() ?? {};
    const ap = apSnap?.data() ?? {};
    return {
      ...row,
      name: String(lb.name ?? user.displayName ?? ap.displayName ?? 'Phraseman').slice(0, 64),
      avatar: lb.avatar ?? user.avatar ?? ap.courseAvatar ?? null,
      frame: lb.frame ?? user.frame ?? ap.courseFrame ?? null,
      aura: lb.aura ?? user.aura ?? ap.courseAura ?? null,
      isPremium: lb.isPremium === true || user.isPremium === true,
    };
  }));

  // Место запрашивающего, если он ниже топ-100.
  const meId = request.auth.uid;
  const meInTop = entries.find((e) => e.uid === meId);
  let myPlace = meInTop?.place ?? null;
  let mySR = meInTop?.sr ?? 0;
  if (!meInTop) {
    const meSnap = await entriesCol.doc(meId).get().catch(() => null);
    const meData = meSnap?.data() as { sr?: number } | undefined;
    if (meData) {
      mySR = Math.max(0, Math.trunc(meData.sr ?? 0));
      const ahead = await entriesCol.where('sr', '>', mySR).count().get();
      myPlace = ahead.data().count + 1;
    }
  }

  const seasonSnap = await db.collection('arena_seasons').doc(seasonId).get();
  const startsAt = (seasonSnap.data()?.startsAt as number) ?? Date.now();
  const endsAtMs = quarterEndMs(new Date());
  return { seasonId, startsAt, endsAtMs, myPlace, mySR, entries };
});

function quarterEndMs(now: Date): number {
  const y = now.getUTCFullYear();
  const q = Math.floor(now.getUTCMonth() / 3);
  return Date.UTC(y, q * 3 + 3, 1); // первый день следующего квартала, UTC
}

// Выдача награды за завершённый сезон. Идемпотентно через arena_season_claims.{seasonId}_{uid}.
export const arenaSeasonClaimReward = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const uid = request.auth.uid;
  const seasonId = String(request.data?.seasonId ?? '').trim();
  if (!seasonId) throw new HttpsError('invalid-argument', 'season_required');

  const db = admin.firestore();
  const claimRef = db.collection('arena_season_claims').doc(`${seasonId}_${uid}`);
  const userRef = db.collection('users').doc(uid);

  return db.runTransaction(async (tx) => {
    const claimSnap = await tx.get(claimRef);
    const claim = claimSnap.data() as
      | { claimed?: boolean; peakSR?: number; seasonPeakRankIndex?: number }
      | undefined;
    if (!claim) throw new HttpsError('not-found', 'nothing_to_claim');
    if (claim.claimed) return { alreadyClaimed: true, rewards: [] };

    const rewards = buildSeasonRewards(claim.peakSR ?? 0, claim.seasonPeakRankIndex ?? 0);
    const userSnap = await tx.get(userRef);
    const user = userSnap.data() ?? {};
    const shards = rewards.filter((r) => r.kind === 'shards').reduce((s, r) => s + (r.amount ?? 0), 0);
    const beforeShards = Math.max(0, Math.trunc(Number(user.shards ?? 0)));

    tx.set(userRef, {
      shards: beforeShards + shards,
      shards_updated_at_ms: Date.now(),
      shards_updated_op: 'earn',
      shards_updated_reason: 'arena_season',
    }, { merge: true });
    // TODO-in-impl: apply non-shard drops via the SAME helper league_chest uses
    // (buildRewardProgressPatch) — import it and merge into userRef.progress here.

    tx.set(claimRef, { claimed: true, claimedAt: Date.now(), rewards }, { merge: true });
    return { alreadyClaimed: false, rewards };
  });
});

type SeasonReward = { id: string; kind: string; rarity: string; amount?: number; auraId?: string };

function buildSeasonRewards(peakSR: number, peakRankIndex: number): SeasonReward[] {
  // Пик ранга: legend III = 23. Топ-места по SR кодируются местом (см. NOTE ниже).
  const out: SeasonReward[] = [];
  const reachedLegend = peakRankIndex >= 23;
  const base = reachedLegend ? 120 : Math.max(20, Math.round(peakRankIndex * 6));
  out.push({ id: 'season_shards', kind: 'shards', rarity: 'common', amount: base });
  if (reachedLegend) {
    out.push({ id: 'season_aura', kind: 'avatar_aura', rarity: 'epic', auraId: 'aura-season' });
    out.push({ id: 'season_energy', kind: 'energy_fast_recovery', rarity: 'rare' });
  }
  return out;
}
```

> NOTE on top-place tiers (top-100/top-10/#1): place is known at season CLOSE, not from `peakSR` alone. The cron (C2) should, when stashing the claim (Step 1b), ALSO read the final leaderboard order for that season and write `finalPlace` into the claim doc. Then `buildSeasonRewards` takes `finalPlace` and adds top-10/#1 aura + `seasonBadge`. Add `finalPlace` to the claim-source write in C2 Step 1b by querying `arena_season_leaderboard/{oldSeasonId}/entries orderBy sr desc` once per season (not per profile) and building a `uid→place` map before the batch loop.

- [ ] **Step 2: Require + export in `index.ts`**

```typescript
const { arenaSeasonGetTop, arenaSeasonClaimReward } = require('./arena_season_rewards');
// ...
exports.arenaSeasonGetTop = arenaSeasonGetTop;
exports.arenaSeasonClaimReward = arenaSeasonClaimReward;
```

- [ ] **Step 3: Add both to `deploy:safe` whitelist** — append `,functions:arenaSeasonGetTop,functions:arenaSeasonClaimReward`.

- [ ] **Step 4: Build + commit**

Run: `cd functions && npm run build 2>&1 | tail -5`
Expected: build succeeds.

```bash
git add functions/src/arena_season_rewards.ts functions/src/index.ts functions/package.json
git commit -m "feat(arena): season top-100 fetch + reward claim CFs" --no-verify
```

---

## STAGE D — Cosmetic (code-authored)

### Task D1: Season aura(s)

**Files:**
- Modify: `constants/avatar_auras.ts`

- [ ] **Step 1: Add the aura(s)** to the `AVATAR_AURAS` array (before the closing `]`)

```typescript
  { id: 'aura-season', nameRu: 'Сезон', nameUk: 'Сезон', nameEs: 'Temporada', namePtBr: 'Temporada', nameVi: 'Mùa giải', nameId: 'Musim', nameTr: 'Sezon', namePl: 'Sezon', color: '#FFD24A', color2: '#FFAE00', color3: '#FDE68A', softColor: 'rgba(255,210,74,0.24)', effect: 'plasma' },
  { id: 'aura-season-champion', nameRu: 'Чемпион', nameUk: 'Чемпіон', nameEs: 'Campeón', namePtBr: 'Campeão', nameVi: 'Nhà vô địch', nameId: 'Juara', nameTr: 'Şampiyon', namePl: 'Mistrz', color: '#F59E0B', color2: '#FFFFFF', color3: '#FCD34D', softColor: 'rgba(245,158,11,0.28)', effect: 'absolute' },
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep avatar_auras || echo OK`
Expected: `OK`.

```bash
git add constants/avatar_auras.ts
git commit -m "feat(arena): season + champion auras (code-authored, 8 langs)" --no-verify
```

---

## STAGE E — UI

### Task E1: Season client service (calls + season-change detection)

**Files:**
- Create: `app/services/arena_season_client.ts`

- [ ] **Step 1: Implement calls** (mirror how `app/services/arena_hill.ts` calls its CFs)

```typescript
// app/services/arena_season_client.ts
import functions from '@react-native-firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { seasonIdForDate } from '../arena_season_math';

const LAST_SEEN_SEASON_KEY = 'arena_last_seen_season_v1';

export type SeasonTopEntry = {
  place: number; uid: string; sr: number; name: string;
  avatar?: string | null; frame?: string | null; aura?: string | null; isPremium?: boolean;
};
export type SeasonTopResult = {
  seasonId: string; startsAt: number; endsAtMs: number;
  myPlace: number | null; mySR: number; entries: SeasonTopEntry[];
};

export async function fetchSeasonTop(): Promise<SeasonTopResult | null> {
  try {
    const res = await functions().httpsCallable('arenaSeasonGetTop')({});
    return res.data as SeasonTopResult;
  } catch { return null; }
}

export async function claimSeasonReward(seasonId: string): Promise<{ rewards: unknown[]; alreadyClaimed: boolean } | null> {
  try {
    const res = await functions().httpsCallable('arenaSeasonClaimReward')({ seasonId });
    return res.data as { rewards: unknown[]; alreadyClaimed: boolean };
  } catch { return null; }
}

/** Локальная детекция «сменился сезон с прошлого захода» — для модалки итогов. */
export async function detectSeasonChange(): Promise<{ changed: boolean; endedSeasonId: string | null }> {
  const current = seasonIdForDate(new Date());
  const seen = await AsyncStorage.getItem(LAST_SEEN_SEASON_KEY).catch(() => null);
  if (!seen) { await AsyncStorage.setItem(LAST_SEEN_SEASON_KEY, current).catch(() => {}); return { changed: false, endedSeasonId: null }; }
  if (seen !== current) { return { changed: true, endedSeasonId: seen }; }
  return { changed: false, endedSeasonId: null };
}

export async function markSeasonSeen(): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_SEASON_KEY, seasonIdForDate(new Date())).catch(() => {});
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep arena_season_client || echo OK`
Expected: `OK`.

```bash
git add app/services/arena_season_client.ts
git commit -m "feat(arena): season client service (top fetch, claim, season-change detect)" --no-verify
```

### Task E2: SeasonResultModal

**Files:**
- Create: `app/components/SeasonResultModal.tsx`

- [ ] **Step 1: Implement the modal** styled like `app/components/RankChangeModal.tsx`. It supports three `kind`s: `'ceiling_reached' | 'season_ended' | 'ending_soon'`. Props:

```typescript
interface SeasonResultModalProps {
  visible: boolean;
  kind: 'ceiling_reached' | 'season_ended' | 'ending_soon';
  seasonNumber: number;       // derived from seasonId
  myPlace?: number | null;
  reachedLegend?: boolean;
  daysLeft?: number;
  onClaim?: () => void;       // season_ended
  onClose: () => void;
  onOpenLeaderboard?: () => void;
}
```

Copy the visual scaffolding (backdrop fade, conic halo, confetti, cascade springs, haptics, CTA shine) from `RankChangeModal.tsx`. Titles/subtitles per the spec, all via `triLang` for 8 langs. Example title block:

```typescript
const title = triLang(lang, {
  ru: kind === 'ceiling_reached' ? 'Легенда III — вершина'
    : kind === 'season_ended' ? `Сезон ${seasonNumber} завершён`
    : `Сезон заканчивается через ${daysLeft} дн.`,
  uk: kind === 'ceiling_reached' ? 'Легенда III — вершина'
    : kind === 'season_ended' ? `Сезон ${seasonNumber} завершено`
    : `Сезон завершується через ${daysLeft} дн.`,
  es: kind === 'ceiling_reached' ? 'Leyenda III: la cima'
    : kind === 'season_ended' ? `Temporada ${seasonNumber} terminada`
    : `La temporada termina en ${daysLeft} d.`,
  'pt-BR': kind === 'ceiling_reached' ? 'Lenda III — o topo'
    : kind === 'season_ended' ? `Temporada ${seasonNumber} encerrada`
    : `A temporada termina em ${daysLeft} d.`,
  vi: kind === 'ceiling_reached' ? 'Huyền thoại III — đỉnh cao'
    : kind === 'season_ended' ? `Mùa giải ${seasonNumber} đã kết thúc`
    : `Mùa giải kết thúc sau ${daysLeft} ngày`,
  id: kind === 'ceiling_reached' ? 'Legenda III — puncak'
    : kind === 'season_ended' ? `Musim ${seasonNumber} selesai`
    : `Musim berakhir dalam ${daysLeft} hari`,
  tr: kind === 'ceiling_reached' ? 'Efsane III — zirve'
    : kind === 'season_ended' ? `Sezon ${seasonNumber} bitti`
    : `Sezon ${daysLeft} gün içinde bitiyor`,
  pl: kind === 'ceiling_reached' ? 'Legenda III — szczyt'
    : kind === 'season_ended' ? `Sezon ${seasonNumber} zakończony`
    : `Sezon kończy się za ${daysLeft} dni`,
});
```

Bodies/subtitles and CTA labels follow the same `triLang` pattern (texts from spec Section 5). The "season_ended" CTA calls `onClaim`; others call `onClose`/`onOpenLeaderboard`.

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep SeasonResultModal || echo OK`
Expected: `OK`.

```bash
git add app/components/SeasonResultModal.tsx
git commit -m "feat(arena): SeasonResultModal (ceiling/ended/ending-soon, 8 langs)" --no-verify
```

### Task E3: Season leaderboard screen

**Files:**
- Create: `app/arena_season_leaderboard.tsx`

- [ ] **Step 1: Implement the screen** modeled on the hill-top list (read how `app/arena_leaderboard.tsx` renders rows: avatar, frame, aura, name, value). Fetch via `fetchSeasonTop()`. Render 100 rows (place, AvatarView, name, `SR <n>`); pin the user's own row at the bottom if `myPlace > 100`. Header `Таблица сезона`, subheader `Сезон N · через M дн.` (compute `M` from `endsAtMs`). All strings via `triLang`.

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep arena_season_leaderboard || echo OK`
Expected: `OK`.

```bash
git add app/arena_season_leaderboard.tsx
git commit -m "feat(arena): season top-100 leaderboard screen" --no-verify
```

### Task E4: Wire modals + rating card

**Files:**
- Modify: `app/arena_rating.tsx` (ceiling card text → SR/place + link; mount SeasonResultModal on season-change)
- Modify: `app/arena_results.tsx` (show ceiling_reached modal when SR first appears / rank hits Legend III)

- [ ] **Step 1: In `arena_rating.tsx`**, replace the ceiling `X/3 до повышения` text. Find the `myStars`/`до повышения` block (~line 360-372). When `myProfile.rank.tier === 'legend' && myProfile.rank.level === 'III'`, render instead:

```typescript
{myProfile?.rank?.tier === 'legend' && myProfile?.rank?.level === 'III' ? (
  <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
    {triLang(lang, {
      ru: `SR ${myProfile?.sr ?? 0} · #${mySeasonPlace ?? '—'} в сезоне`,
      uk: `SR ${myProfile?.sr ?? 0} · #${mySeasonPlace ?? '—'} у сезоні`,
      es: `SR ${myProfile?.sr ?? 0} · #${mySeasonPlace ?? '—'} en la temporada`,
      'pt-BR': `SR ${myProfile?.sr ?? 0} · #${mySeasonPlace ?? '—'} na temporada`,
      vi: `SR ${myProfile?.sr ?? 0} · #${mySeasonPlace ?? '—'} trong mùa`,
      id: `SR ${myProfile?.sr ?? 0} · #${mySeasonPlace ?? '—'} di musim`,
      tr: `SR ${myProfile?.sr ?? 0} · sezonda #${mySeasonPlace ?? '—'}`,
      pl: `SR ${myProfile?.sr ?? 0} · #${mySeasonPlace ?? '—'} w sezonie`,
    })}
  </Text>
) : (
  /* existing X/3 до повышения Text stays here unchanged */
)}
```

Add a `TouchableOpacity` below it that `router.push('/arena_season_leaderboard')` with label `Таблица сезона` (triLang). Fetch `mySeasonPlace` via `fetchSeasonTop()` in a `useEffect` when at ceiling.

- [ ] **Step 2: Mount season-ended modal.** In `arena_rating.tsx` (or the arena tab entry), on mount call `detectSeasonChange()`; if `changed`, fetch the claim availability and show `SeasonResultModal kind="season_ended"`. On claim press call `claimSeasonReward(endedSeasonId)`, then `markSeasonSeen()`.

- [ ] **Step 3: ceiling_reached modal.** In `arena_results.tsx`, in the server-result `onSnapshot` handler (where `rankCinematic` is set, ~line 624), when `data.newTier === 'legend' && data.newLevel === 'III'` AND this is the first time (guard via AsyncStorage key `arena_seen_ceiling_v1`), show `SeasonResultModal kind="ceiling_reached"` after the rank cinematic.

- [ ] **Step 4: Type-check + commit**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "arena_rating|arena_results" || echo OK`
Expected: `OK`.

```bash
git add app/arena_rating.tsx app/arena_results.tsx
git commit -m "feat(arena): wire season modals + SR/place on rating card" --no-verify
```

---

## STAGE F — Verification (no deploy)

### Task F1: Full test + type-check pass

- [ ] **Step 1: Run client tests**

Run: `NODE_OPTIONS="--max-old-space-size=8192" npx jest --testPathPatterns="arena_season" --no-cache`
Expected: client season tests PASS.

- [ ] **Step 2: Run server tests**

Run: `cd functions && npx jest --testPathPatterns="arena_season" --no-cache`
Expected: server season tests PASS.

- [ ] **Step 3: Full type-check (no new errors vs baseline)**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -cE "error TS"` (compare to known baseline; new season files must add 0).
Run: `cd functions && npm run build 2>&1 | tail -5` (must succeed).

- [ ] **Step 4: Functions build (deploy artifact compiles)**

Run: `cd functions && npm run build`
Expected: succeeds — confirms the 3 new CFs compile and are exportable.

- [ ] **Step 5: Hand off deploy to user.** Do NOT deploy. Tell the user the exact manual steps:
  - `cd functions && npm run deploy:safe` (deploys CFs incl. the 3 new ones now in whitelist)
  - `firebase deploy --only firestore:rules` (deploys season rules)
  - In admin (Remote Config) optionally tune `arena_sr_win` / `arena_season_rollback_steps`.

---

## RESOLVED DECISION — bot writes move to the server (Option 2)

Discovered: `firestore.rules:976` for `arena_profiles` is `allow write: if false` (changed FROM
`if isOwner(userId)` by a security commit). But `app/arena_bot_profile_write.ts:163` writes
`arena_profiles` directly from the client → **bot-match rank/XP currently fail silently in prod**
(all writes wrapped in `.catch()`). This is a pre-existing bug, surfaced by this work.

**Decision (user):** move bot-match persistence to a Cloud Function `arenaBotMatchRecord` (Admin SDK).
`arena_profiles` stays client-locked (`if false`) — no security regression, no client rank-curse. The
client stops writing `arena_profiles`/`match_history` and calls the CF instead. This also FIXES the
existing silent bot-write failure. Consequence: BOTH match-math copies are now server-side; the client
keeps `app/arena_season_math.ts` + `computeBotMatchRankDelta` ONLY for optimistic display before the CF
responds (it no longer persists anything). Task B3 is rewritten accordingly; C1-step-2 is dropped.

## Self-Review Notes (resolved)

- **Spec coverage:** model (A1/B2/B3/C1), rollback (A1/C2), SR ceiling (A/B), top-100 (C3/E3), rewards/peak (C2 1b + C3), cosmetics (D1), 3 modals + card (E2/E4), copy bible (E2/E4 triLang). Badge (`seasonBadge`) — captured via finalPlace NOTE in C3; if a dedicated badge-render task is wanted, add E5 to render `arena_profiles.seasonBadge` next to the name in `arena_leaderboard.tsx`.
- **Duplicate-math safety:** A1 (server) + A2 (client) locked by twin tests. After the Option-2 decision,
  the client math (`computeBotMatchRankDelta` + `arena_season_math.ts`) is OPTIMISTIC-DISPLAY-ONLY — all
  persistence (PvP + bot) is server-side via `applyStarDelta`/`applySeasonRatingDelta`. Single source of
  persisted truth; the prior Legend III→I class of bug can't recur in stored data.
- **Whitelist:** every new CF added to `deploy:safe` in its task — `arenaBotMatchRecord` (B3),
  `arenaSeasonRolloverCron` (C2), `arenaSeasonGetTop` + `arenaSeasonClaimReward` (C3). Known deploy gotcha.
- **Security bonus:** `arena_profiles` stays `if false`; the Option-2 move also fixes the PRE-EXISTING
  silent bot-write failure (client writes were blocked by the rule). Flag to user as a real fix shipped.
- **Sequencing:** B3 (server bot CF) MUST land before B4 (client switches to it) — otherwise bot matches
  break entirely. Until both are deployed, bot rank still won't persist (already broken today), so no
  regression vs current prod, but call it out at deploy time.
- **No worktree:** plan executes in master with atomic commits per user's global rule.
