# ЭТАП 1 — Единый менеджер звёзд + XP для Арены
## Implementation specification (executable verbatim)

---

## 0. Verification basis

I re-read the **live** repo through the device mount, not the 39-file arena slice. Path on device: `~/Documents/phraseman` (the ux holder is right: `~/phraseman` is `____СТАРАЯ_НЕАКТУАЛЬНАЯ_КОПИЯ`). Everything below is grounded in code I opened:

| Claim | Verdict |
|---|---|
| `settleMatch(tx, …)` takes a `Transaction` and credits the **same user twice** in one tx (`match_earn` @ `functions/src/arena_v2.ts:953`, `mastery_thresholds` @ `:960`) | **CONFIRMED** — kills the single-op primitive |
| Arena has **zero** XP code (`grep user_total_xp\|xpDelta\|totalXp` over `arena_v2.ts`, `arena_expansion.ts`, `arena_v2_core.ts`, `arena_client.ts` → 0 hits) | **CONFIRMED** (D-69 real) |
| `league_groups/{groupId}.members` is a **map** with `points`, written by `projectProgressToCurrentLeague` (`progress_events.ts:372-419`) | **CONFIRMED** — the cost critic's "600k reads/day leaderboard" fear is **wrong**; it is a mirror, so the D-11 cost is +1 shared-doc write, not N reads |
| `progress.*` is a **string** map; `week_points_v2` is a JSON string `{weekKey, points}` | **CONFIRMED** |
| `getLeagueWeekPoints` (`league_groups.ts:137`) = `Math.max(currentWeeklyXp, currentV2Points)`; `progress_events.ts:405` = `Math.max(existingPoints, existingLeaderboardPoints, result.weekXp)` | **CONFIRMED** — mixed-unit leaderboard is real |
| `firestore.rules:156` `hasNoShardWrites()` / `:182` `newDocHasNoShardWrites()` are `affectedKeys().hasAny([...])` deny-lists on **top-level** keys; `users/{uid}` update/create is otherwise client-allowed | **CONFIRMED** — the "deny writes to `users/{uid}.stars`" phrasing is not expressible; the deny-list is |
| `shardsApplyDelta` tx = **5-6 reads / 3 writes**, earn amount validated against a server catalog (`shards_apply_delta.ts:235-345`) | **CONFIRMED** — cost holder's "2R/2W" is wrong |
| `masteryThresholdStarsLifetime` feeds `remaining = 500 - lifetimeThresholdStars` (`arena_expansion_core.ts:332`) | **CONFIRMED** — a cap, not a balance |
| `arenaSeasonStars` floors by `arenaDailyMultiplier` `[1,1,1,1,0.5,0.5]` and clamps to `160 - dailyStarsBefore` (`arena_v2_core.ts:497-506`) | **CONFIRMED** |
| `arena_season_pass.tsx:57/61` gate claims on `(home?.season.stars ?? 0) < level.stars` | **CONFIRMED** — stale season counter grants rewards |
| `buildProgressBaseline`, `getWeekKey`, `getWeekStartIso` exported; `authoritativeProgressPatch` (`:356`) and `progressServerStateFromProgress` (`:336`) **not** exported | **CONFIRMED** — 2-word change needed |
| `PendingShardDelta.localApplied` invariant (`shards_delta_queue.ts:22-27`) | **CONFIRMED** |
| `account_delete.ts:227` `ARENA_EXPANSION_USER_SUBCOLLECTIONS` already sweeps `arena_v2_star_ledger` | **CONFIRMED** — must be extended |

---

## 1. Every disagreement resolved, with the losing option named

| # | Question | **WINNER** | **LOSER + why it lost** |
|---|---|---|---|
| 1 | Where the balance lives | **Nested map `stars` on `users/{stableUid}`** | A `stars/{uid}` doc / `arena_v2_profiles` (cost holder's rejected alternative, ledger's rejected alternative). Lost: +1 read per app open, +1 write per credit, and it rebuilds per-section divergence. Flat `stars_*` top-level fields (ux critic) lost too: 9 entries in two rules functions = 9 chances to forget one; we always read-modify-write the whole map anyway. |
| 2 | Subunits vs integers | **Integer stars.** Kill `WALLET_SUBUNITS_PER_STAR`. | Fractional accrual. Lost: every D-08/D-35 rule is an integer; thresholds and league sorts must compare integers. **But the ledger holder's justification is rejected** — the rounding function survives upstream in `arenaSeasonStars` (`Math.floor(raw × multiplier)` then clamp to 160). Mitigation is mandatory receipt `meta` (§3.4). |
| 3 | One op or many per transaction | **`prepareStarOperations(…, ops: StarOpRequest[])` — array** | `applyStarOperationInTx(…, req)` single-op (ledger holder). Lost on verified code: `arena_v2.ts:953` and `:960` credit the same user twice in one tx; two calls both read pre-transaction state, the second `tx.set` erases the first credit and duplicates `seq`. |
| 4 | Read/write phase split | **Two phases: async `prepareStarOperations` (reads only) → sync `commitStarOperations` (writes only)** | A single `applyStarOperationsInTx` that reads and writes (both holders). Lost: Firestore requires **all reads before all writes** in a transaction, and `settleMatch` interleaves. Neither holder addressed this; it would have thrown at runtime on the first ranked match. |
| 5 | `ruleVersion` inside the opId | **NO. Dedup key is `<sourceKind>:<sourceId>`; `ruleVersion` is a receipt body field.** | `'arena_ranked:m_8f3a91:v1'` (ledger holder). Lost: `arenaActor(request, feature, recovery)` re-settle paths + a payout change in ЭТАП 2 mint a new opId for the same event → double credit. A dedup key that changes when the amount changes is not a dedup key. |
| 6 | Idempotency artefact | **Own receipt doc `users/{stableUid}/star_operations/{opId}`, `tx.create` inside the same transaction** | (a) Sharing the host envelope's receipt (cost holder). Lost: `progressSubmitEvent` has **fingerprint-based semantic dedup** (`progress_events.ts:1005-1019`) — a duplicate-suppressed progress event silently swallows the star delta. (b) `stars.seen` map inside the user doc (cost critic). Lost: it fails closed on overflow, i.e. it *rejects legitimate credits* under a retry burst, and a doc-per-op is the artefact support needs anyway. (c) No ledger at all (cost holder's refuse-list). Lost: `SM-5` overrules `§12 item 2`, and with a monotone `earnedTotal` that D-10 forbids decrementing, "we cannot tell why this user has 40 000 stars" is not an acceptable answer. |
| 7 | Reuse `arena_v2_star_ledger` as the receipt collection | **NO — one new `star_operations` collection for all sources** | Reusing the arena collection (ledger critic). Lost: the name lies the moment Learning credits a star, and D-06 forbids a per-section ledger. Cost of the decision: `account_delete.ts` and `firestore.rules` must both be extended (both are in the MODIFY list). |
| 8 | `earnedTotal = balance + spentTotal`? | **Four counters: `balance`, `earnedTotal`, `grantedTotal`, `spentTotal`. Invariant `balance === earnedTotal + grantedTotal - spentTotal`, asserted on every write, abort never repair.** | (a) Two counters with `spendable = earned - spent` (cost holder + ledger holder). Lost on the ux critic's verified point: `coin_exchange.ts` mints stars from purchased coins, and `admin_grant.ts` corrects — money would buy season-pass progress. (b) Silent self-repair. Lost: a ledger that quietly fixes itself has destroyed the evidence. |
| 9 | Season counter | **Stored `seasonId`/`seasonEarned`, lazily rolled on write, **plus** a pure read projection `starsSeasonEarned(stars, activeSeasonId)`** | (a) "Season = `stars.lifetime`" (cost holder). Lost: `ARENA_V2_SEASON_LEVEL_STARS = 50` and `arenaSeasonLevelUnlocked` is unbounded → every existing user is at season level 200 on day one with every reward claimable. (b) `lifetimeAtStart` anchor (cost critic). Lost: unnecessary once `seasonEarned` is its own accumulator, and the anchor breaks on any lifetime correction. (c) Lazy roll with **no** read projection (ledger holder). Lost: `arena_season_pass.tsx:57/61` would gate claims on last season's number until the user's first star op. |
| 10 | Week key helper | **Reuse the two existing identical ISO-week implementations: `getWeekKey(dateKey)` in `functions/src/progress_events.ts:254` (server) and `getWeekKey(d: Date)` in `app/hall_of_fame_utils.ts:165` (client). Add a parity fixture test. No new file.** | (a) `modules/stars/week.ts` + `functions/src/stars_week.ts` byte-identical copy (ledger holder). Lost: it creates a **third and fourth** implementation, and the proposed 200-timestamp fixture compares only the two new ones. (b) `arenaUtcWeekKey` (ledger critic's pick). Lost: it emits Monday `YYYY-MM-DD`, but `week_points_v2` and `getLeagueWeekPoints` compare `YYYY-Www`. It stays untouched for partner weeks. |
| 11 | Week attribution time | **Server-derived from `earnedAtMs`, clamped to `[now − 8d, now]`, routed to `cur` or `prev` bucket. In ЭТАП 1 `earnedAtMs` is always server `now`, so this is inert — the field exists so ЭТАП 2 needs no schema change.** | (a) Pure server commit time, single `{k,v}` slot (ledger holder + cost holder). Lost on the cost critic's case: a Sunday-offline session synced Wednesday poisons two league weeks. (b) Client-supplied week key. Lost: set the clock forward, earn, set it back. |
| 12 | Client optimistic path / outbox in ЭТАП 1 | **DO NOT BUILD IT.** Every star source in ЭТАП 1 is server-initiated and returns a server-confirmed number synchronously. | (a) `app/stars_system.ts` + `app/stars_delta_queue.ts` + `starsApplyOperation` callable (ledger holder **and** ux holder). Lost: zero consumers. It is the largest chunk of the proposed work and is dead code until ЭТАП 2 — and dead code in a ledger is where the first double-credit lives. (b) The ledger holder's own "accepted beat of UX latency on reward unlock" does not even apply, because the number is confirmed before the animation runs. |
| 13 | Monotone display ratchet | **DELETE `displayFloor`, `driftDebt`, the global `Math.max`.** `earnedTotal` is monotone **on the server by construction** (only ever `+= max(0, delta)`), so the client never needs a ratchet. | The ux holder's ratchet + drift-debt + cold-start settlement. Lost three ways: (1) `SHARDS_LEDGER_AUTHORITY_AUDIT_2026-06-27.md` "Owner Direction: Do not apply global Math.max to shard balances"; (2) the ux critic's verified out-of-order-ack bug — `earnedConfirmed = server.earnedTotal` unconditionally makes `spendable` under-report while the big number is masked by `displayFloor`, and the debt then materialises as exactly the cold-start drop the ratchet promised to prevent; (3) with no optimistic path (§12) there is nothing to ratchet. |
| 14 | ≤50★/day auto-regrant on terminal failure | **REJECTED.** | The ux holder's capped auto-regrant. Lost: it is a mint endpoint whose idempotency key is client-generated; installs are free; and stars now gate D-09 season rewards and D-11 league placement, so it is not "a few cents of cosmetic value". Repair path is `admin_grant.ts`, a deliberate manual action that writes its own receipt. |
| 15 | Client-supplied `amount` / `starDelta` | **REJECTED at the type level.** No client payload in ЭТАП 1 carries a star amount. Every amount is server-computed. | `creditStars(source, amount)` from the results screen (ux holder) and "star delta as an extra field in the `progressSubmitEvent` envelope" (cost holder). Lost: `shards_apply_delta.ts:107` already litigated this for a lower-stakes currency; ranked Arena is adversarial; and D-10's monotone counter can never be decremented to repair. |
| 16 | Arena XP delivery | **Server-side, inside the settle transaction, via a new `functions/src/arena_xp.ts` primitive that reuses `buildProgressBaseline` + a newly-exported `authoritativeProgressPatch` from `progress_events.ts`. Same single `tx.set(userRef, …)` as the stars.** | (a) `progressSubmitEvent` callable (ledger holder). Lost: **you cannot invoke a callable inside a Firestore transaction**, and settle credits both players — the opponent who backgrounded the app would get stars and no XP. (b) Full extraction of `applyProgressEventInTx` (ledger critic). Lost on scope: `applyProgressEvent` carries streaks, daily counters, fingerprints, level-spin minting and exam attempt limits — none of which Arena needs. |
| 17 | Shop opId | **`spend_shop:<itemId>_<catalogVersion>`. The entitlement doc stays the one-shot gate.** | `spend_shop:purchase_<requestId>` (ledger holder). Lost: `createArenaRequestId` is `Crypto.randomUUID()` in a `useRef` Map destroyed on unmount (`arena_client.ts:89`, `arena_star_wallet.tsx:41`) — a remount mid-purchase mints a fresh one. R17 forbids exactly this. |
| 18 | Fields deleted | **Eight classified, not five.** See §9. | The ledger holder's five-field list. Lost: it omits `lifetimeWalletStarsSpent` (`arena_expansion.ts:1000`) and, critically, does not protect `masteryThresholdStarsLifetime` — a wholesale strip resets the lifetime 500-star mastery cap to 0 and **permanently uncaps** an inflow that cannot be re-capped after users earn past it. |
| 19 | D-08/D-35 payout numbers in ЭТАП 1 | **NO. Ledger lands with today's `arenaTaskStars` values (3/4/5 by difficulty; speed_match `matched + fullBoardBonus − wrongAttempts`, capped 6). Payout change is ЭТАП 2.** | Landing both at once. Lost: two variables at once, and the receipt/ledger has no baseline to be verified against. |
| 20 | Audit cadence | **On-demand admin callable only.** | Scheduled/sampled audit cron (nobody proposed it, both risk-listed it). Lost to D-52. |

---

## 2. Data model — exact paths and types

### 2.1 Balance document

**Path:** `users/{stableUid}` — the doc the app already reads once at hydration and that `shardsApplyDelta` / `progressSubmitEvent` already write. **Zero additional reads per app open.**

**Field:** one top-level key `stars`, a map.

```ts
// functions/src/stars_ledger.ts  (and re-exported to the client via app/stars_view.ts)
export const STARS_SCHEMA_VERSION = 'stars.v1' as const;

export type StarsState = {
  schemaVersion: typeof STARS_SCHEMA_VERSION;

  /** Spendable. May go up and down. NEVER negative. */
  balance: number;

  /** D-10: earned all time. Monotone by construction — only ever += max(0, delta) for earn ops. */
  earnedTotal: number;

  /** Non-earned inflow: coin exchange, admin grants, refunds. Does NOT unlock D-10 thresholds. */
  grantedTotal: number;

  /** Monotone. */
  spentTotal: number;

  /** D-11. ISO week 'YYYY-Www' from getWeekKey(). */
  weekKey: string;
  weekEarned: number;
  prevWeekKey: string;
  prevWeekEarned: number;

  /** D-09. arenaSeasonWindow(nowMs).seasonId — the ONE tournament season. */
  seasonId: string;
  seasonEarned: number;

  /** Per-user monotone op counter. Audit chain anchor. */
  seq: number;
  lastOpId: string;

  /** Freshness guard for the client. Mirrors shards_updated_at_ms semantics. */
  updatedAtMs: number;
};

export const EMPTY_STARS_STATE: StarsState = {
  schemaVersion: STARS_SCHEMA_VERSION,
  balance: 0, earnedTotal: 0, grantedTotal: 0, spentTotal: 0,
  weekKey: '', weekEarned: 0, prevWeekKey: '', prevWeekEarned: 0,
  seasonId: '', seasonEarned: 0,
  seq: 0, lastOpId: '', updatedAtMs: 0,
};
```

**Hard invariant, asserted on every read-modify-write:**
```
balance === earnedTotal + grantedTotal - spentTotal
```
Violation ⇒ abort the whole transaction with `failed-precondition` `star_ledger_inconsistent`, write nothing, and `console.error('[stars_ledger] INCONSISTENT', {stableUid, stars})`. **Never self-repair.**

### 2.2 Star operation receipt

**Path:** `users/{stableUid}/star_operations/{opId}`

**opId grammar** — deterministic, derived from the source, no `ruleVersion`, no client-minted id:
```
/^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/
```
plus: reject ids starting with `__`, reject a `sourceId` equal to `.` or `..` (illegal Firestore doc ids).

| Source | opId |
|---|---|
| Ranked/quick match base stars | `arena_match:<matchId>` |
| Mastery thresholds crossed at settle | `arena_mastery:<matchId>` |
| Today-mode run | `arena_today:<runId>` |
| Mastery thresholds at today-settle | `arena_today_mastery:<runId>` |
| Partner spotlight | `arena_partner:<weekKey>_<partnerId>_<thresholds.join('_')>` |
| Shop purchase (debit) | `spend_shop:<itemId>_<catalogVersion>` |
| Admin | `admin:<adminOpId>` |

```ts
export const STAR_OP_SCHEMA_VERSION = 'star-op.v1' as const;

export type StarOpReason =
  | 'arena_match' | 'arena_mastery' | 'arena_today' | 'arena_today_mastery'
  | 'arena_partner' | 'spend_shop' | 'admin_grant' | 'admin_revoke' | 'coin_exchange';

/** Which counter a positive delta feeds. Server-owned table, never client-supplied. */
export const STAR_OP_CLASS: Readonly<Record<StarOpReason, 'earn' | 'grant' | 'spend'>> = Object.freeze({
  arena_match: 'earn', arena_mastery: 'earn', arena_today: 'earn',
  arena_today_mastery: 'earn', arena_partner: 'earn',
  spend_shop: 'spend', admin_revoke: 'spend',
  admin_grant: 'grant', coin_exchange: 'grant',
});

export type StarOpRequest = {
  opId: string;
  /** Non-zero safe integer, |delta| <= 5000. Sign must agree with STAR_OP_CLASS. */
  delta: number;
  reason: StarOpReason;
  sourceKind: string;   // == opId prefix
  sourceId: string;     // == opId suffix
  ruleVersion: number;  // body field ONLY, never in the id
  /** Server-clamped to [nowMs - 8d, nowMs]. Omit ⇒ nowMs. */
  earnedAtMs?: number;
  /** <= 10 keys, JSON <= 512 bytes. MANDATORY for arena: see §3.4. */
  meta?: Record<string, string | number | boolean>;
};

export type StarOpReceipt = {
  schemaVersion: typeof STAR_OP_SCHEMA_VERSION;
  opId: string; seq: number; delta: number;
  reason: StarOpReason; opClass: 'earn' | 'grant' | 'spend';
  sourceKind: string; sourceId: string; ruleVersion: number;
  balanceBefore: number; balanceAfter: number;
  earnedTotalAfter: number; grantedTotalAfter: number; spentTotalAfter: number;
  weekKey: string; weekEarnedAfter: number;
  seasonId: string; seasonEarnedAfter: number;
  /** D-69: arena ops carry the XP credited in the SAME transaction. Not a currency merge — one settlement record. */
  xpDelta: number; xpTotalAfter: number;
  authUid: string; deviceId: string | null;
  earnedAtMs: number;   // clamped
  serverAtMs: number;   // authoritative
  meta: Record<string, string | number | boolean>;
  expireAt: FirebaseFirestore.Timestamp;  // serverAtMs + 400d
};
```

### 2.3 Pure read projections — the ONLY legal way to read the week and the season

```ts
// functions/src/stars_ledger.ts  — byte-identical copies live in app/stars_view.ts
export function starsWeekEarned(stars: StarsState | undefined, weekKeyNow: string): number {
  if (!stars) return 0;
  if (stars.weekKey === weekKeyNow) return Math.max(0, stars.weekEarned);
  if (stars.prevWeekKey === weekKeyNow) return Math.max(0, stars.prevWeekEarned);
  return 0;   // stale ⇒ 0, and NO repair write (that is what keeps week rollover free)
}

export function starsSeasonEarned(stars: StarsState | undefined, activeSeasonId: string): number {
  if (!stars || stars.seasonId !== activeSeasonId) return 0;
  return Math.max(0, stars.seasonEarned);
}

export function starsSpendable(stars: StarsState | undefined): number {
  return Math.max(0, stars?.balance ?? 0);
}
```

**Lint rule (mandatory, `eslint.config.js` `no-restricted-syntax`):** any member access `.weekEarned`, `.prevWeekEarned` or `.seasonEarned` outside `functions/src/stars_ledger.ts` and `app/stars_view.ts` is an error. This is the single highest-value guard in the spec — it is the bug that granted season-pass rewards.

---

## 3. Server — the one and only writer

### 3.1 `functions/src/stars_ledger.ts` — exact signatures

```ts
import * as admin from 'firebase-admin';

export type StarLedgerCtx = {
  nowMs: number;
  /** MUST come from arenaSeasonWindow(nowMs).seasonId — one producer, D-09. */
  activeSeasonId: string;
  /** getWeekKey(isoDateUtc(new Date(nowMs))) from progress_events.ts. No other helper. */
  weekKeyNow: string;
  authUid: string;
  deviceId?: string | null;
};

export type StarOpOutcome = {
  status: 'applied' | 'already_applied' | 'rejected';
  errorCode?: 'insufficient_stars' | 'invalid_delta' | 'invalid_op_id'
            | 'invalid_reason' | 'meta_too_large' | 'op_conflict';
  opId: string;
  seq: number;
  appliedDelta: number;
};

export type StarLedgerResult = {
  outcomes: StarOpOutcome[];
  balance: number; earnedTotal: number; grantedTotal: number; spentTotal: number;
  weekKey: string; weekEarned: number;
  seasonId: string; seasonEarned: number;
  seq: number; updatedAtMs: number;
  schemaVersion: typeof STARS_SCHEMA_VERSION;
};

export type StarLedgerPrepared = {
  stableUid: string;
  userRef: admin.firestore.DocumentReference;
  before: StarsState;
  after: StarsState;
  outcomes: StarOpOutcome[];
  /** One entry per op that will actually be written. */
  receipts: Array<{ ref: admin.firestore.DocumentReference; data: StarOpReceipt }>;
  result: StarLedgerResult;
};

/**
 * PHASE 1 — READS ONLY. Must be called before any tx.set/tx.create in the enclosing
 * transaction (Firestore: all reads precede all writes).
 * `userSnap` is passed in so the user document is read EXACTLY ONCE per (uid, transaction).
 * At most ONE call per (stableUid, transaction) — enforced by review + the assertion below.
 */
export async function prepareStarOperations(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  stableUid: string,
  userSnap: admin.firestore.DocumentSnapshot,
  ops: readonly StarOpRequest[],
  ctx: StarLedgerCtx,
): Promise<StarLedgerPrepared>;

/**
 * PHASE 2 — WRITES ONLY. Emits exactly ONE tx.set on users/{stableUid} (carrying
 * `stars` plus whatever `extraUserFields` the caller folds in — that is how Arena XP
 * lands in the same write) and one tx.create per receipt.
 */
export function commitStarOperations(
  tx: admin.firestore.Transaction,
  prepared: StarLedgerPrepared,
  extraUserFields?: Record<string, unknown>,
): StarLedgerResult;

/** Admin-only, on demand. NOT scheduled, NOT sampled. */
export const starsAuditUser: CallableFunction; // ({stableUid, fromSeq?}) => audit report
```

### 3.2 `prepareStarOperations` algorithm — normative

1. `assertSinglePrepare(stableUid, tx)` — a `WeakMap<Transaction, Set<string>>` module-level guard. A second `prepare` for the same uid in the same tx throws `internal` `star_ledger_double_prepare`. This is the mechanical enforcement of ruling #3; do not rely on review.
2. Validate every op **before** touching Firestore. Reject (do not throw) with `status:'rejected'`:
   - `opId` fails the regex / starts with `__` / suffix is `.` or `..` → `invalid_op_id`
   - `delta` not a non-zero safe integer, or `Math.abs(delta) > 5000` → `invalid_delta`
   - `reason` not in `STAR_OP_CLASS`, or sign disagrees with the class (`earn`/`grant` must be `>0`, `spend` must be `<0`) → `invalid_reason`
   - `meta` > 10 keys or `JSON.stringify(meta).length > 512` → `meta_too_large`
   - duplicate `opId` within `ops` → `op_conflict`
3. Read `before = normalizeStars(userSnap.data()?.stars)`. **Assert the invariant.** If `before.earnedTotal + before.grantedTotal - before.spentTotal !== before.balance` and the doc is non-empty → throw `failed-precondition` `star_ledger_inconsistent`.
4. `tx.get` all receipt refs **in one `Promise.all`**.
5. Fold **in memory**, in array order, over a working copy `after = {...before}`:
   - receipt exists → `status:'already_applied'`, `appliedDelta: 0`, `seq` from the stored receipt, **no state change, no write**.
   - `earnedAtMs = clamp(op.earnedAtMs ?? ctx.nowMs, ctx.nowMs - 8*86400_000, ctx.nowMs)`; `opWeekKey = getWeekKey(isoDateUtc(new Date(earnedAtMs)))`.
   - **Week roll (lazy, on write):** if `after.weekKey !== ctx.weekKeyNow` then `{prevWeekKey, prevWeekEarned} = {after.weekKey, after.weekEarned}; after.weekKey = ctx.weekKeyNow; after.weekEarned = 0`.
   - **Season roll (lazy, on write):** if `after.seasonId !== ctx.activeSeasonId` then `after.seasonId = ctx.activeSeasonId; after.seasonEarned = 0`.
   - `cls = STAR_OP_CLASS[op.reason]`.
   - `spend` and `after.balance + op.delta < 0` → `status:'rejected'`, `errorCode:'insufficient_stars'`, **no clamping, no write**. Do not abort the other ops.
   - Apply: `after.balance += op.delta`; if `cls==='earn'` → `after.earnedTotal += op.delta`, and route the weekly bucket: `opWeekKey === after.weekKey ? after.weekEarned += op.delta : opWeekKey === after.prevWeekKey ? after.prevWeekEarned += op.delta : /* older than prev: lifetime only */ 0`; also `after.seasonEarned += op.delta`. If `cls==='grant'` → `after.grantedTotal += op.delta` **only** (no week, no season, no `earnedTotal`). If `cls==='spend'` → `after.spentTotal += -op.delta`.
   - `after.seq += 1`; `after.lastOpId = op.opId`; build the receipt with `balanceBefore`/`balanceAfter` from the working copy, so the chain is `balanceAfter[n] === balanceBefore[n] + delta[n]` and `balanceBefore[n] === balanceAfter[n-1]`.
6. `after.updatedAtMs = ctx.nowMs`; `after.schemaVersion = STARS_SCHEMA_VERSION`.
7. Re-assert the invariant on `after`. Violation ⇒ throw (this catches an arithmetic bug in this function itself).

### 3.3 `commitStarOperations`

```ts
tx.set(prepared.userRef, {
  ...(extraUserFields ?? {}),          // Arena XP lands HERE — one write, not two
  stars: prepared.after,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true });
for (const r of prepared.receipts) tx.create(r.ref, r.data);
return prepared.result;
```
If `prepared.receipts.length === 0` **and** `after` deep-equals `before`, emit **no writes at all** (a pure replay costs 1-2 reads and 0 writes — this is what makes retry cheap under D-52).

### 3.4 Mandatory receipt `meta` for arena earns — the "why 7 and not 14" fix

Every `arena_match` / `arena_today` op **must** carry:
```ts
meta: {
  mode,                 // 'ranked' | 'quick' | 'friend' | 'series'
  rawStars,             // sum of arenaTaskStars before the multiplier
  multiplier,           // arenaDailyMultiplier(eligibleMatchIndex)
  eligibleMatchIndex,
  dailyStarsBefore,
  dailyCapApplied,      // boolean: the 160/day clamp bit
  correct, taskCount,
}
```
Rationale: killing subunits removes a rounding function that does not exist there; the real `Math.floor(raw × multiplier)` + `min(…, 160 − before)` lives in `arenaSeasonStars`. An exact ledger that cannot explain its own numbers produces the same support load as a drifting one. The inputs are already computed at the call site; writing them costs nothing.

### 3.5 No client callable in ЭТАП 1

There is **no** `starsApplyOperation`. Firestore rules deny all client writes to the balance and the receipts (§6). Every credit and debit originates on the server.

---

## 4. Arena XP (D-69) — exact design

### 4.1 Where it is credited from
Inside **`settleMatch`** (`functions/src/arena_v2.ts:717`) and inside the today-settle path in `functions/src/arena_expansion.ts` (~`:515-565`), in the **same transaction and the same `tx.set(userRef, …)`** as the stars. Never from the client, never from a callable.

Reason: settle credits **both** players in one server-side transaction; the opponent may have already backgrounded the app. Client-driven XP means the loser reliably gets stars and no XP.

### 4.2 Which existing code is reused
- `buildProgressBaseline(progress, progressServerState, now)` — `functions/src/progress_events.ts:286`, already exported.
- `authoritativeProgressPatch(state)` — `functions/src/progress_events.ts:356`. **Change `function` → `export function`.** One word.
- `progressServerStateFromProgress(progress, now)` — `:336`. **Change `function` → `export function`.** One word.
- `getWeekKey`, `getWeekStartIso` — `:254`, `:264`, already exported.
- `getLevelFromXP` — `functions/src/xp_levels.ts`, already exported.

**Not** reused: `applyProgressEvent`, the fingerprint dedup, daily counters, level-spin minting, streaks. Arena needs none of them; the star receipt is the idempotency gate.

### 4.3 Formula — `functions/src/arena_xp.ts`

```ts
export const ARENA_XP_RULE_VERSION = 1;

export const ARENA_XP_BASE      = Object.freeze({ ranked: 20, quick: 10, friend: 6, series: 20 });
export const ARENA_XP_PER_CORRECT = Object.freeze({ ranked: 6, quick: 4, friend: 3, series: 6 });
export const ARENA_XP_OUTCOME   = Object.freeze({ win: 30, draw: 15, loss: 0 });  // ranked & series only
export const ARENA_XP_MATCH_CAP = 120;   // hard ceiling per settled match
export const ARENA_XP_DAILY_CAP = 600;   // per stableUid per UTC day

export function arenaMatchXp(input: {
  mode: 'ranked' | 'quick' | 'friend' | 'series';
  correctAnswers: number;   // server-recomputed, from privateDoc.totals — never client-declared
  taskCount: number;
  outcome: 'win' | 'loss' | 'draw';
  dailyXpCredited: number;  // from the season doc, same transaction
}): number {
  const correct = Math.max(0, Math.min(Math.trunc(input.correctAnswers), Math.trunc(input.taskCount)));
  const outcomeBonus = (input.mode === 'ranked' || input.mode === 'series')
    ? ARENA_XP_OUTCOME[input.outcome] : 0;
  const raw = ARENA_XP_BASE[input.mode] + ARENA_XP_PER_CORRECT[input.mode] * correct + outcomeBonus;
  const capped = Math.min(raw, ARENA_XP_MATCH_CAP);
  return Math.max(0, Math.min(capped, ARENA_XP_DAILY_CAP - Math.max(0, input.dailyXpCredited)));
}
```
Worked values: ranked 10/10 correct + win = `20 + 60 + 30 = 110` (under the 120 cap — the cap only bites on abuse). Quick 5/5 = `10 + 20 = 30`. **D-07 holds: quick awards 0 stars but does award XP.** Bots (`uid.startsWith('bot_')`) get nothing.

### 4.4 Cap enforcement — zero extra reads
`dailyXpCredited` is a **new field on the already-read, already-written** `users/{uid}/arena_v2_seasons/{seasonId}` doc, next to `dailyStarsCredited` / `dailyEligibleMatches` / `dailyDayKey`. It resets with the same `sameDay` check those use. **0 extra reads, 0 extra writes.**
Caveat to honour: when `expansionRunKind === 'rival'` the season doc is not written (`arena_v2.ts:947`); in that branch XP is **not** credited either. State it in a comment.

### 4.5 Patch builder

```ts
export function arenaXpUserPatch(input: {
  userData: FirebaseFirestore.DocumentData | undefined;
  xpDelta: number;
  now: Date;
}): {
  patch: Record<string, unknown>;     // { progress: {...}, progressServerState: {...} }
  totalXpAfter: number; levelAfter: number;
  weekKey: string; weekXpAfter: number;
};
```
Implementation: `baseline = buildProgressBaseline(getProgress(userData), userData?.progressServerState, now)` → `state = progressServerStateFromProgress(baseline, now)` → `state.totalXp += xpDelta; state.level = getLevelFromXP(state.totalXp); state.weekXp += xpDelta; state.weekPoints = Math.max(state.weekPoints, state.weekXp)` → `patch = { progress: authoritativeProgressPatch(state), progressServerState: { ...state, updatedAt: serverTimestamp() } }`.

The returned `patch` is passed as `extraUserFields` to `commitStarOperations`. **One `tx.set` on `users/{uid}` carries stars and XP together.**

### 4.6 Client consumption of Arena XP
The settle response gains `xpEarned` and `totalXpAfter`. The client calls the **existing** `patchAppSnapshotFromAuthoritativeCloudProgress` (`app/app_snapshot_store.ts:213`). It does **not** call the local XP manager or `addWeeklyXp` — the server number is authoritative, and the existing `Math.max(local, server)` mirroring makes the higher server value win on the next sync. Double-counting is structurally impossible.

---

## 5. Call-site rewiring — the five server sites

All five follow the same shape. Illustrated on `settleMatch`:

```ts
// PHASE R (reads) — with the other pre-reads, before any tx.set
const userSnaps = await Promise.all(entries.map((e) => tx.get(db.collection('users').doc(e.uid))));
const prepared = await Promise.all(entries.map((e, i) => prepareStarOperations(
  tx, db, e.uid, userSnaps[i],
  [
    ...(starsEarned[i] > 0 ? [{ opId: `arena_match:${match.matchId}`, delta: starsEarned[i],
        reason: 'arena_match', sourceKind: 'arena_match', sourceId: String(match.matchId),
        ruleVersion: ARENA_STAR_RULE_VERSION, meta: {...} } as StarOpRequest] : []),
    ...(masteryWalletAward[i] > 0 ? [{ opId: `arena_mastery:${match.matchId}`, delta: masteryWalletAward[i],
        reason: 'arena_mastery', sourceKind: 'arena_mastery', sourceId: String(match.matchId),
        ruleVersion: ARENA_STAR_RULE_VERSION,
        meta: { thresholds: JSON.stringify(masteryApplied[i].newlyClaimed).slice(0, 200) } }] : []),
  ],
  { nowMs: now, activeSeasonId: season.seasonId,
    weekKeyNow: getWeekKey(isoDateUtc(new Date(now))), authUid: who.authUid },
)));

// PHASE W (writes)
const xp = arenaXpUserPatch({ userData: userSnaps[i].data(), xpDelta, now: new Date(now) });
const ledger = commitStarOperations(tx, prepared[i], xp.patch);
// reward payload for the client:
reward.starsEarned      = ledger.outcomes.reduce((s, o) => s + Math.max(0, o.appliedDelta), 0);
reward.starsBalance     = ledger.balance;
reward.starsEarnedTotal = ledger.earnedTotal;
reward.seasonStarsAfter = ledger.seasonEarned;
reward.xpEarned         = xpDelta;
reward.totalXpAfter     = xp.totalXpAfter;
```

| # | Site | File / anchor | opIds |
|---|---|---|---|
| 1 | Ranked/quick match settle | `functions/src/arena_v2.ts` `settleMatch` (`:717`), star sites `:861-877`, `:953`, `:960` | `arena_match:<matchId>`, `arena_mastery:<matchId>` |
| 2 | Today-mode settle | `functions/src/arena_expansion.ts:515-565` | `arena_today:<runId>`, `arena_today_mastery:<runId>` |
| 3 | Partner spotlight | `functions/src/arena_expansion.ts:1753-1772` | `arena_partner:<weekKey>_<partnerId>_<thresholds>` |
| 4 | Shop purchase (debit) | `functions/src/arena_expansion.ts:973-1010` | `spend_shop:<itemId>_<catalogVersion>` — debit and entitlement in the **same** tx; entitlement `exists` still short-circuits to `already_owned` with no debit |
| 5 | Season-pass claim gate | `functions/src/arena_expansion.ts` / `arena_v2.ts` home builders | reads `starsSeasonEarned(stars, arenaSeasonWindow(now).seasonId)`; season level = `Math.floor(seasonEarned / ARENA_V2_SEASON_LEVEL_STARS)` |

**Caps that must survive untouched** (they are rate limits, not balances): `dailyStarsCredited`, `dailyEligibleMatches`, the `160 − dailyStarsBefore` clamp in `arenaSeasonStars` (`arena_v2_core.ts:505`), `ARENA_TODAY_STARS_CAP = 30`, `ARENA_PARTNER_WEEKLY_CAP = 30`, per-mode `claimedThresholds`, and **`arena_v2_profiles.masteryThresholdStarsLifetime`** which feeds `remaining = 500 − lifetimeThresholdStars` (`arena_expansion_core.ts:332`). Removing that last one permanently uncaps mastery inflow — the one economic failure that cannot be walked back after launch.

---

## 6. Firestore rules — field-level, not path-level

In `firestore.rules`, add `'stars'` to the array in **both** `hasNoShardWrites()` (`:156`) and `newDocHasNoShardWrites()` (`:182`). One key, because `stars` is one top-level map.

Add under `match /users/{userId}`, next to `shard_operation_receipts` (`:1392`):
```
match /star_operations/{opId} {
  allow read: if userDocOwnerMatchesAuth(userId);
  allow write: if false;
}
```

Also audit `app/cloud_sync.ts` `SYNC_KEYS`: **no** star key may ever ride the generic outgoing patch. Add the assertion to the smoke tests.

Rationale: Firestore rules cannot deny a single field on a document the client is otherwise allowed to write, and the client **does** write `users/{uid}` (that is cloud sync). `firestore.rules:175-178` records that this exact hole already shipped once for shards on the create path. Without this, `updateDoc(users/{uid}, {stars: {...balance: 999999}})` wins the season and the league.

---

## 7. Client — read-only, zero listeners

### 7.1 Store slice — `app/app_snapshot_store.ts`

```ts
export interface AppSnapshotStars extends AppSnapshotMeta {
  balance: number;        // spendable
  earnedTotal: number;    // D-10, monotone
  weekEarned: number;     // already projected through starsWeekEarned()
  seasonEarned: number;   // already projected through starsSeasonEarned()
  seasonId: string;
  weekKey: string;
  updatedAtMs: number;    // freshness guard
}
// AppSnapshot gains:  stars?: AppSnapshotStars;

export function useStarsBalance(): number;      // -> stars.balance
export function useStarsEarnedTotal(): number;  // -> stars.earnedTotal
export function useStarsSeasonEarned(): number;
export function useStarsWeekEarned(): number;
export function peekLastKnownStars(): AppSnapshotStars | null;   // sync memory peek, no await

/** THE reconciliation. Nothing else may write the stars slice. */
export function applyAuthoritativeStars(payload: {
  balance: number; earnedTotal: number; weekEarned: number;
  seasonEarned: number; seasonId: string; weekKey: string; updatedAtMs: number;
}): void;
```

`applyAuthoritativeStars` **ignores** any payload whose `updatedAtMs` is **strictly less than** the currently stored `updatedAtMs`. This is the verified `shards_updated_at_ms` pattern (`SHARDS_LEDGER_AUTHORITY_AUDIT_2026-06-27.md`) and it is what kills the out-of-order-ack class of bug outright. There is no `displayFloor`, no `driftDebt`, no `Math.max`.

Hydration: the stars slice is populated from the **same** `users/{uid}` read that already hydrates `progress.shards` and `profile.totalXp`, in `app/app_snapshot_bootstrap.ts`, before the first paint. **+0 reads per app open.**

`resetAppSnapshotForAccountSwitch()` (`:265`) already wipes the whole snapshot — the stars slice inherits that for free. Verify with a test.

### 7.2 Award animation

- `app/events.ts`: add `'stars_earned'` next to `shards_earned` (`:63`) and `'stars_balance_updated'` next to `shards_balance_updated` (`:72`). **Do not** add `stars_credit_failed` — with no optimistic path there is no client-side failure to report.
- `components/StarAwardHost.tsx`, mounted in `app/_layout.tsx:3779` beside `<GlobalShardsEarnedHost />`. Single-flight queue in `app/star_award_queue.ts`; batches within 250 ms merge; otherwise queue with a 120 ms gap; never two flights at once.
- Batch grammar (adopted verbatim from the ux holder — this part was right): `n ≤ 5` → n sprites, 60 ms stagger, ≤400 ms; `6 ≤ n ≤ 12` → 6 sprites, 45 ms stagger; `n > 12` → 8 sprites, 35 ms stagger, odometer roll 700 ms, one `+N` label at the origin. **Never more than 8 sprites, never longer than 900 ms.** One haptic on the first landing (Light) and the last (Medium), one sound per batch.
- `hooks/use_star_counter_display.ts`: eases **to** the target, ≤900 ms; retargets rather than restarting; **snaps** on unmount / background / route change; instant when `use_reduce_motion` or `device_perf_tier` says so; never driven by an animation completion callback.
- `components/GlobalStarCounter.tsx` is the **only** component allowed to render the earned-all-time number.

### 7.3 What the counter shows
- Global header chip → **`balance`** (spendable). This is what `arena.tsx:147` already renders.
- `earnedTotal` and `seasonEarned` appear **only** on progress bars, with a different label and a non-wallet glyph, reusing the existing `spendable` / `seasonEarned` split at `arena_star_wallet.tsx:70`.
- Since ЭТАП 1 has no optimistic credits, the displayed number is **always** server-confirmed. There is no second number and no staleness window.
- `arena_star_wallet.tsx:50`: map the server's `arena_store_insufficient_stars` to the `insufficient` state and refresh the balance immediately, instead of the current generic `error` card. `:44` keeps pre-gating on the server snapshot.

### 7.4 D-10 explanation — exact Russian copy (adopted verbatim; this was the ux holder's best work)
1. Permanent caption under the counter on the season/star screen:
   «Это все звёзды, что ты заработал за всё время. Покупки его не уменьшают — награды сезона остаются твоими.»
2. Tap the header counter → tooltip:
   «★ — заработано за всё время: открывает награды и сезон.\nДля покупок есть отдельный баланс, он тратится, а прогресс — нет.»
3. Shop header line, always visible:
   «Заработано за всё время: 1 240 ★ · Доступно для трат: 310 ★»
4. One-time `ActionToast` type `'info'` on the first spend:
   «Звёзды списаны с баланса. Счётчик «заработано» не изменится — прогресс к наградам сохраняется.»

One noun per concept: «заработано» vs «доступно для трат». Never «кошелёк» / «валюта» / «баланс звёзд» as a synonym for the counter.

### 7.5 Naming fence
Six existing files own "star" for lesson **quality** scores: `app/lesson_star_score.ts`, `app/speaking_score_stars.ts`, `components/StarDisplayShared.tsx`, `components/SpeakingScoreStars.tsx`, `components/SpeakingInlineResultStars.tsx`, `components/PhraseContentStars.tsx`. Add a one-line header comment to each: `// Это оценка качества урока, а не валюта. Валюта — functions/src/stars_ledger.ts.` Currency prefixes are reserved: `GlobalStar*`, `stars_*`. The currency star must be a **visually distinct asset** (filled gold, facet highlight) from the outline lesson-score star.

---

## 8. D-11 — how leagues switch to weekly stars later

**Shipped in ЭТАП 1 (shape only, metric stays XP):**

`week_points_v2` becomes `JSON.stringify({ weekKey, points, metric })` where `metric: 'xp' | 'stars'`. A missing `metric` reads as `'xp'` (backward compatible). Add a single config constant:

```ts
// functions/src/league_metric.ts  +  app/league_metric.ts  (2 lines each)
export const LEAGUE_WEEK_METRIC: 'xp' | 'stars' = 'xp';   // flip in ЭТАП N
```

Every reader must **discard points whose `metric` differs from `LEAGUE_WEEK_METRIC`**, and the `Math.max` must never be taken **across** metric versions. Three sites carry the `Math.max` that would otherwise pin high-XP users to their XP number forever after the swap:
- `functions/src/league_groups.ts:137` — `Math.max(currentWeeklyXp, currentV2Points)`
- `functions/src/progress_events.ts:405` — `Math.max(existingPoints, existingLeaderboardPoints, result.weekXp)`
- `app/hall_of_fame_utils.ts:186-193` — `Math.max(weekly_xp, legacy week_points)`

Shipping `metric` now is a 3-line change per site. Retrofitting it after users hold mixed-unit `week_points_v2` rows is a data migration.

**The swap itself (later stage), naming the two functions the brief asks for:**

1. **`getLeagueWeekPoints(progress, nowMs)`** — `functions/src/league_groups.ts:137`. Becomes:
   `LEAGUE_WEEK_METRIC === 'stars' ? starsWeekEarned(userDoc.stars, getWeekKey(isoDateUtc(new Date(nowMs)))) : <current XP logic>`. It gains a `stars` argument from the caller's already-loaded user doc — **0 extra reads**.
2. **`getMyWeekPoints()`** — `app/hall_of_fame_utils.ts:176`. Becomes: read `useStarsWeekEarned()` from the snapshot store instead of the `week_points_v2` AsyncStorage key — **0 reads**.

Plus one mirror site, which is where the real D-11 cost lives and must be budgeted honestly: **`projectProgressToCurrentLeague`** (`functions/src/progress_events.ts:372`) writes `league_groups/{groupId}.members[uid].points`. `league_groups` is a **shared member-map document** (verified — the cost critic's fear of N user-doc reads per leaderboard render is wrong, but this write is real). When the metric flips, every star credit must also project to that doc: **+1 shared-doc write per star batch**, in a follow-up transaction, never on the credit's critical path, and never per answer. Firestore sustains ~1 write/s/doc; at per-match granularity a 30-member group is far under it. `league_finalize_cron` and `leaderboard` keep sorting an opaque `points` and are untouched.

`prevWeekKey`/`prevWeekEarned` exist so `league_finalize_cron`, which runs after Monday 00:00 UTC, cannot read an already-reset counter. Finalize must prefer `prevWeekEarned` when `prevWeekKey` matches the week being finalized — that is exactly what `starsWeekEarned(stars, weekBeingFinalized)` returns. **This branch needs an explicit test with a user who writes an op at 00:00:30 Monday.**

---

## 9. Deletions — eight fields classified, not five

**DELETE outright and fold into the ledger** (nothing is in production; no migration exists to write; this is the only moment it is free):

| Field | Folds into |
|---|---|
| `arena_v2_profiles/{uid}.starWalletBalance` (`arena_v2.ts:873`, `arena_expansion.ts:525,999,1763`) | `stars.balance` |
| `arena_v2_profiles/{uid}.lifetimeWalletStarsEarned` (`arena_v2.ts:874`, `arena_expansion.ts:526,1764`) | `stars.earnedTotal` |
| `arena_v2_profiles/{uid}.lifetimeWalletStarsSpent` (`arena_expansion.ts:1000`) | `stars.spentTotal` |
| `users/{uid}/arena_v2_seasons/{seasonId}.stars` + `.level` (`arena_v2.ts:894-895`) | `stars.seasonEarned`, level derived |
| `users/{uid}/arena_v2_star_ledger/*` writes (`arena_v2.ts:953,960`; `arena_expansion.ts:557,562,1004,1768`) | `users/{uid}/star_operations/{opId}` |
| `users/{uid}.v2_access_stars` | dead (`exchangeCoinsForStars` is behind `false &&`); if revived, it becomes a `coin_exchange` StarOp with `class:'grant'` |
| Learning V2 `WalletStateV1.balanceSubunits` + `WALLET_SUBUNITS_PER_STAR` (AsyncStorage) | deleted; `app/cloud_sync.ts:630` excluding it was correct |
| `season_pass_stars_v1` (AsyncStorage) | deleted; D-09 has one season, counted by `stars.seasonEarned` |

**Keep `arena_v2_star_ledger` in the `ARENA_EXPANSION_USER_SUBCOLLECTIONS` sweep** (`account_delete.ts:227`) for historical docs, and **add `'star_operations'`** to the deletion sweep.

**MUST SURVIVE UNTOUCHED** (caps and claim gates): `dailyStarsCredited`, `dailyEligibleMatches`, `dailyDayKey`, `arenaSeasonStars`'s `160 − dailyStarsBefore` clamp, `ARENA_TODAY_STARS_CAP = 30`, `ARENA_PARTNER_WEEKLY_CAP = 30`, per-mode `claimedThresholds`, **`masteryThresholdStarsLifetime`**, `ARENA_V2_SEASON_LEVEL_STARS = 50`, `arenaUtcWeekKey` (partner weeks).

**Pre-delete probe:** before the Learning-wallet and `v2_access_stars` deletions land, ship one telemetry counter for one release asserting no shipped build holds a non-zero AsyncStorage `learning_v2_owner_repository` wallet or a non-zero `v2_access_stars`. "Nothing is in production" makes the deletion free only if it is exact.

---

## 10. Files

### CREATE
| Path | Purpose |
|---|---|
| `functions/src/stars_ledger.ts` | `StarsState`, `StarOpRequest`, `StarOpReceipt`, `prepareStarOperations`, `commitStarOperations`, `starsWeekEarned`, `starsSeasonEarned`, `starsSpendable`, `starsAuditUser` |
| `functions/src/arena_xp.ts` | `arenaMatchXp`, `arenaXpUserPatch`, `ARENA_XP_*` constants |
| `functions/src/league_metric.ts` | `LEAGUE_WEEK_METRIC` (server) |
| `app/stars_view.ts` | Client copies of `starsWeekEarned` / `starsSeasonEarned` / `starsSpendable` + `StarsState` type |
| `app/league_metric.ts` | `LEAGUE_WEEK_METRIC` (client) |
| `app/star_award_queue.ts` | Single-flight animation batch queue |
| `components/StarAwardHost.tsx` | Global flying-star host |
| `components/GlobalStarCounter.tsx` | The only component rendering the earned-all-time number |
| `hooks/use_star_counter_display.ts` | Ease-to-target display hook with snap-on-interrupt |
| `tests/stars_ledger.test.ts` | §12 assertions S1-S16 |
| `tests/stars_week_parity.test.ts` | §12 assertion S17 |
| `tests/arena_xp.test.ts` | §12 assertions S18-S21 |
| `tests/rules/stars_rules.test.ts` | §12 assertions S22-S24 (emulator) |

### MODIFY
| Path | Change |
|---|---|
| `functions/src/progress_events.ts` | export `authoritativeProgressPatch` and `progressServerStateFromProgress`; add `metric` to both `week_points_v2` writes and to `readWeekPoints` |
| `functions/src/arena_v2.ts` | `settleMatch`: pre-read user docs; `prepareStarOperations` + `arenaXpUserPatch` + `commitStarOperations`; delete `starWalletBalance` / `lifetimeWalletStarsEarned` / season `stars`+`level` / both `starLedger` `tx.create`s; extend `reward` payload |
| `functions/src/arena_expansion.ts` | Same rewiring at today-settle (`:515-565`), partner spotlight (`:1753-1772`), purchase (`:973-1010`); home builders read the projections |
| `functions/src/arena_expansion_core.ts` | Keep `arenaUtcWeekKey` and `arenaApplyMasteryObservations`'s 500-cap untouched; remove wallet-balance fields from the profile shape only |
| `functions/src/league_groups.ts` | `getLeagueWeekPoints`: honour `metric`, no cross-metric `Math.max` |
| `functions/src/account_delete.ts` | add `'star_operations'` to the user-subcollection sweep |
| `functions/src/index.ts` | export `starsAuditUser` |
| `firestore.rules` | `'stars'` into `hasNoShardWrites` + `newDocHasNoShardWrites`; `match /star_operations/{opId}` |
| `app/app_snapshot_store.ts` | `AppSnapshotStars` slice, four selectors, `peekLastKnownStars`, `applyAuthoritativeStars` with the `updatedAtMs` guard |
| `app/app_snapshot_bootstrap.ts` | hydrate the stars slice pre-first-frame from the existing user-doc read |
| `app/events.ts` | `'stars_earned'`, `'stars_balance_updated'` |
| `app/_layout.tsx` | mount `<StarAwardHost />` at `:3779` |
| `app/hall_of_fame_utils.ts` | `getMyWeekPoints`: honour `metric`, no cross-metric `Math.max` |
| `app/arena_results.tsx` | animate `reward.starsEarned`; call `applyAuthoritativeStars` + `patchAppSnapshotFromAuthoritativeCloudProgress` |
| `app/arena_season_pass.tsx` | `:45,57,61` read `home.season.stars` sourced from `starsSeasonEarned` |
| `app/arena_star_wallet.tsx` | `:44,50` gate on server balance; map `arena_store_insufficient_stars` to `insufficient` + refresh |
| `app/arena.tsx` | `:130,147` read the projections |
| `components/arena/ArenaRewards.tsx` | render `starsEarned` + `xpEarned` |
| `app/cloud_sync.ts` | assert no star key in `SYNC_KEYS` |
| `eslint.config.js` | `no-restricted-syntax` ban on `.weekEarned` / `.prevWeekEarned` / `.seasonEarned` outside the two projection files |
| `app/lesson_star_score.ts`, `app/speaking_score_stars.ts`, `components/StarDisplayShared.tsx`, `components/SpeakingScoreStars.tsx`, `components/SpeakingInlineResultStars.tsx`, `components/PhraseContentStars.tsx` | one-line naming-fence header comment each |
| `tests/owner_direction_runtime_contract.test.ts`, `tests/tournament_no_star_loss_contract.test.ts`, `tests/tournament_stars_honesty_contract.test.ts` | update the pinned source substrings — **budget for this or ЭТАП 1 lands red** |

---

## 11. Read / write counts — actual numbers

**Per star credit (general, inside a host transaction that already read the user doc):**
- **0 additional reads** (the user doc is passed in as `userSnap`), **+1 read** for the receipt ref.
- **0 additional document writes** on `users/{uid}` (the balance rides the one `tx.set` that also carries XP), **+1 write** for the receipt.
- ⇒ **1 read, 1 write per operation.**

**Per replayed / duplicate operation:** **1 read, 0 writes.** Retry is therefore cheap by construction.

**Per ranked match settle (2 humans), incremental over today:**
- reads: `+1` user doc × 2 players = **+2**; receipt refs `+1..2` × 2 = **+2..4**. The 2 old `arena_v2_star_ledger` `tx.create`s did not read.
- writes: `+1` `users/{uid}` × 2 = **+2**; star receipts **replace** the arena ledger rows 1:1 = **+0**.
- ⇒ **+4 to +6 reads, +2 writes per ranked match.** Both writes carry stars **and** XP. D-69 forces the user-doc write regardless, so stars ride it at **0 marginal writes**.

**Per app open:** **+0 reads, +0 writes.** The stars map is a field inside the `users/{uid}` document the app already fetches once at hydration.

**Per league week rollover (Monday 00:00 UTC):** **0 reads, 0 writes globally.** No cron, no reset job, no fan-out. Rollover is the lazy `weekKey` comparison at the next credit, and a stale key reads as `0` with **no repair write** — that is the load-bearing detail.

**Per season rollover:** **0 reads, 0 writes.** Same lazy mechanism.

**Listeners:** **0.** No `onSnapshot` on any star-bearing document. **Polling:** **0.** Confirmations ride the settle response.

**TTL:** receipts carry `expireAt = serverAtMs + 400d`. TTL deletions are billed writes — one per operation, 400 days later. At per-match granularity this is ~1 deferred write per match. It belongs in the D-52 arithmetic and is stated here rather than omitted.

---

## 12. Smoke tests — concrete assertions

**Ledger (`tests/stars_ledger.test.ts`)**
- **S1** `prepareStarOperations` with two ops for the same uid in one transaction produces receipts with `seq = n+1` and `seq = n+2`, and `receipt[1].balanceBefore === receipt[0].balanceAfter`. *(The bug that killed the single-op primitive.)*
- **S2** Calling `prepareStarOperations` twice for the same `(stableUid, tx)` throws `star_ledger_double_prepare`.
- **S3** Replaying `arena_match:m1` returns `status:'already_applied'`, `appliedDelta:0`, and `commitStarOperations` emits **0 writes**.
- **S4** After any op sequence, `balance === earnedTotal + grantedTotal − spentTotal`.
- **S5** A user doc whose stored `stars` violates S4 makes `prepareStarOperations` throw `star_ledger_inconsistent` and write nothing.
- **S6** A spend of 250 against a balance of 200 returns `rejected`/`insufficient_stars`, leaves `balance === 200`, and **does not** clamp to 0.
- **S7** `admin_grant` of +100 increases `balance` and `grantedTotal` by 100 and leaves `earnedTotal`, `weekEarned`, `seasonEarned` **unchanged**. *(Money must not buy season progress.)*
- **S8** `delta = 0`, `delta = 5001`, `delta = 1.5`, `opId = '__x:y'`, `opId = 'a:.'`, `reason='spend_shop'` with `delta > 0` each return `rejected` with the correct `errorCode` and cause **0 writes**.
- **S9** Two ops in one array with the same `opId` → the second is `rejected`/`op_conflict`.
- **S10** After a spend of 300, `earnedTotal` is **unchanged**. *(D-10.)*

**Week / season projections**
- **S11** `starsWeekEarned({weekKey:'2026-W31', weekEarned:40, prevWeekKey:'2026-W30', prevWeekEarned:90}, '2026-W32') === 0`, `…, '2026-W31') === 40`, `…, '2026-W30') === 90`.
- **S12** A user whose last op was three weeks ago reads `0` this week **and produces no write** when merely read.
- **S13** A credit at `Monday 00:00:30 UTC` rolls `weekEarned` into `prevWeekEarned`; `starsWeekEarned(stars, lastWeekKey)` still returns last week's total. *(`league_finalize_cron`.)*
- **S14** An op with `earnedAtMs = now − 3d` (previous week) increments `prevWeekEarned`, not `weekEarned`; with `earnedAtMs = now − 30d` it increments `earnedTotal` **only** and no weekly bucket.
- **S15** `earnedAtMs = now + 86_400_000` is clamped to `now`. *(Clock-forward farming.)*
- **S16** `starsSeasonEarned({seasonId:'arena-2026-08-01', seasonEarned:900}, 'arena-2026-10-03') === 0`, and the season-pass claim button is **disabled** in that state. *(The bug that granted a full season pass on day one.)*
- **S17** (`stars_week_parity.test.ts`) Over 400 timestamps — every hour across two year boundaries, plus every Monday 23:59:59.999 / 00:00:00.000 — `progress_events.getWeekKey(isoDateUtc(d))` and `hall_of_fame_utils.getWeekKey(d)` return the **identical** string.

**Arena XP (`tests/arena_xp.test.ts`)**
- **S18** ranked, 10 tasks, 10 correct, win → `110`. quick, 5/5 → `30`. friend, 0 correct → `6`.
- **S19** `dailyXpCredited = 580` → the next ranked match returns `20`, not `110`. `dailyXpCredited = 600` → `0`.
- **S20** A bot participant produces `xpDelta === 0` and **no** `users/bot_*` write.
- **S21** Settling one ranked match produces **exactly one** `tx.set` on each player's `users/{uid}` document, and that write contains both `stars` and `progress.user_total_xp`.

**Rules (`tests/rules/stars_rules.test.ts`, emulator)**
- **S22** A client `update` on `users/{uid}` patching `progress.study_target` **succeeds**; the same update additionally carrying a `stars` key **fails**.
- **S23** A client `create` of `users/{uid}` containing `stars` **fails**.
- **S24** A client `create`/`update`/`delete` on `users/{uid}/star_operations/{opId}` **fails**; `get` by the owner **succeeds**.

**Client**
- **S25** `applyAuthoritativeStars` with `updatedAtMs` **lower** than the stored value leaves the slice unchanged; with a higher value it replaces it. *(Out-of-order ack.)*
- **S26** `resetAppSnapshotForAccountSwitch()` zeroes the stars slice; `peekLastKnownStars()` then returns `null`.
- **S27** `app/cloud_sync.ts` `SYNC_KEYS` contains **no** key matching `/^stars?_/` and no `stars` entry.
- **S28** `useStarDisplayValue` snaps to target on unmount and on `AppState → background`; with `reduceMotion` it sets instantly.
- **S29** A `+24` batch renders **≤ 8** sprites and completes in **≤ 900 ms**.
- **S30** `arena_store_insufficient_stars` renders the `insufficient` state, not the generic error card, and triggers a balance refresh.

**Deletion safety**
- **S31** After a full ЭТАП 1 settle, `arena_v2_profiles/{uid}.masteryThresholdStarsLifetime` is still written and still non-zero after a mastery award, and `arenaApplyMasteryObservations` still refuses to award past a lifetime 500. *(The uncapped-economy regression.)*
- **S32** `dailyStarsCredited`, `dailyEligibleMatches`, `ARENA_TODAY_STARS_CAP`, `ARENA_PARTNER_WEEKLY_CAP` are still enforced after the rewiring.

---

## 13. MUST NOT be built in ЭТАП 1

| Not built | Why |
|---|---|
| `app/stars_system.ts`, `app/stars_delta_queue.ts`, `starsApplyOperation` callable, any client outbox / quarantine / retry classification | **Zero consumers.** Every ЭТАП 1 star source is server-initiated and returns a server-confirmed number synchronously. This is the largest single chunk of the proposed work and it is dead code until ЭТАП 2. Dead code in a ledger is where the first double-credit lives. |
| Any client-supplied star `amount`, including a `starDelta` field on the `progressSubmitEvent` envelope | A modified client sends `1e9` once; `earnedTotal` is monotone by D-10 and can never be decremented to repair, so that account owns every threshold, every season level and the D-11 league forever. |
| `displayFloor`, `driftDebt`, the monotone display ratchet, the cold-start settlement, the ≤50★/day auto-regrant | Contradicts a written owner direction (`SHARDS_LEDGER_AUTHORITY_AUDIT_2026-06-27.md`), institutionalises a known-wrong number, and — with no optimistic path — has nothing to protect. The regrant is a mint endpoint. |
| Any `onSnapshot` or poll on a star-bearing document | D-52. The credit's own response payload already delivers the authoritative totals for free. Accepted cost: a second device does not see a credit until its next app start. |
| Per-answer star operations | Would multiply writes ~10x and put one user doc under contention **inside a live match**. Unit of work is a match/session, permanently. Any future PR proposing per-answer ops must be rejected at review. |
| `modules/stars/week.ts` + `functions/src/stars_week.ts` byte-identical copies | Would be the third and fourth week-boundary implementation. Two already exist and are provably identical (S17). |
| Subunits, fractional stars, `WALLET_SUBUNITS_PER_STAR` | All award rules are integers; thresholds and league sorts must compare integers. |
| A scheduled or sampled ledger audit cron | Recurring read cost for a condition the write path already forbids (S4/S5 abort on the first bad op). `starsAuditUser` is on-demand, for incident response. |
| **The D-11 metric swap itself** | Only the `metric` field and the two projection functions land now. Flipping `LEAGUE_WEEK_METRIC` is a later stage with its own `league_groups` mirror-write budget. |
| **The D-08/D-35 payout numbers** | `arenaTaskStars` keeps today's 3/4/5 and today's `speed_match` formula. Landing a new ledger and new payouts together moves two variables at once and leaves the receipts with no baseline to verify against. ЭТАП 2. |
| Flashcards / daily tasks / achievements / Learning star credits | No source, no catalog, no server recompute exists for them yet. When they land in ЭТАП 2 they need a `shard_reward_catalog.ts`-style server amount catalog + per-source daily budget **before** the first credit, exactly as `shards_apply_delta.ts:107` requires. |
| Cross-`stableUid` ledger merge | Crediting an account with stars it did not earn is the definition of the lie this design exists to prevent. Merging is an admin op that writes its own receipts. |

---

## 14. Trade-offs taken, and the price paid

**Requirement conflicts and how they were settled:**

1. **Ledger correctness vs Firestore cost.** Cost demanded no ledger rows; correctness demanded a receipt per operation. **Correctness wins, and the cost is near-zero because the receipt *is* the idempotency gate** — it was going to be written anyway. Price paid: +1 write per operation (~1 per match) and one deferred TTL delete 400 days later, both stated in §11 rather than hidden.

2. **Never showing a wrong number vs ledger correctness.** The ux holder proposed a monotone display that is allowed to lie upward. **Correctness wins**, but only because I removed the thing that made lying necessary: with no optimistic path, the displayed number is always server-confirmed, so there is no wrong number to hide. **Price paid: the star counter moves ~200-400 ms after the answer lands, not in the same frame.** That is a real UX regression versus the ux holder's design, and it is the deliberate cost of shipping ЭТАП 1 without an outbox. It is bought back in ЭТАП 2, when a client-originated source actually exists and the outbox has a consumer.

3. **Never showing a wrong number vs cross-device truth.** No listener means a credit on phone A is invisible on tablet B until B's next app start. **Cost wins.** Price paid: if the owner later reads D-06's "no divergence between sections" as covering cross-device real time, this design fails that reading and the only fix is a listener.

4. **`insufficient_stars` is a hard rejection with no clamping.** Price paid: any screen that lets a user tap "buy" against a stale balance shows a failure. Mitigated by gating the shop on the server-confirmed balance (§7.3) and by there being no optimistic credit to go stale in ЭТАП 1 — but the state is reachable across devices, so `arena_star_wallet.tsx:50` must render it as `insufficient`, not as a generic error.

5. **Server-derived week attribution.** An offline match earned on Sunday and synced Wednesday lands in the week its `earnedAtMs` says, clamped to 8 days. In ЭТАП 1 this is inert. Price paid: the 8-day clamp means a credit that sat in an outbox for 9 days credits `earnedTotal` but no weekly bucket — silently, with no error. That is deliberate: the alternative is a rank-manipulation vector.

6. **Open risk I am flagging, not resolving.** `resolveStableUidForAuth` is called with `requireKnownIdentity: true, repairLinks: false` on every arena path. If `auth_identity.ts` does not map an anonymous auth uid and its later linked uid to one `stableUid`, stars earned before sign-in are unrecoverable under the no-auto-merge rule. In ЭТАП 1 the exposure is bounded to zero because Arena already requires a known identity — but **before any ЭТАП 2 source (flashcards, daily tasks) can credit a star, this must be verified**, and if it does not merge, the product answer is to require sign-in before any star can be earned, not to relax the merge rule.