# Arena Stage 2 — Implementation Specification
**Stars replace points · client-authoritative play · offline completion · flat Firestore cost**

Version: `arena-stars.v3` / `arena-duel.v2`
Status: executable. Every disagreement between the three lenses and three critics is resolved below with the rationale and the losing option named.

---

## 0. Verification pass — what is actually true in the uploaded tree

I read `functions/src/arena_v2_core.ts`, `functions/src/arena_v2.ts`, `functions/src/arena_expansion_core.ts`, `modules/arena/contract.ts`, `modules/arena/schedule.ts`, `modules/arena/task_adapter.ts`, `modules/arena/duel_blueprint.ts`, `app/arena_client.ts`, `app/arena_match.tsx`, `app/arena_results.tsx`, `components/arena/ArenaQuestion.tsx`, `components/arena/ArenaPlayers.tsx`, `docs/arena/HANDOVER.md`.

**Confirmed facts (these override any lens claim that contradicts them):**

| Claim | Verdict | Evidence |
|---|---|---|
| Current per-match star ceilings are **34 / 38 / 44 / 48** by division band, not 44–52 | **TRUE** — critic right, game-design proposal wrong | `arena_v2_core.ts:243-248` × `:508-521`, recomputed by hand below |
| Quick match = 5 tasks is **NOT implemented** | **TRUE** | `arena_v2.ts:364-370` `selectedTaskEnvelope(matchId, pool, now, divisionIndex)` → `selectArenaTasks(pool, matchId, divisionIndex)` with no `matchMode`; `:386`, `:453`, `:1203` call `validateArenaPrivateEnvelope(envelope)` with no mode |
| `match.taskCount` is declared client-side but **never written** | **TRUE** | declared `contract.ts:86`, read by `arenaMatchTaskCount` `contract.ts:131`; zero writers in `arena_v2.ts` |
| Displayed timer is **11 s on an 8 s task** | **TRUE** | `schedule.ts:20` reads `stateDeadlineAtMs`, set at `arena_v2.ts:615` to `startsAtMs + arenaTaskDurationMs` = `1500 + ANSWER + 1500` |
| Wrong answers cost **zero** tie-break time | **TRUE** | `arena_v2.ts:524` `if (receipt.points > 0) totals.elapsedMs += receipt.elapsedMs` |
| Bot is a fixed wall on 8 s tasks | **TRUE** | `arena_v2_core.ts:394` `medianResponseMs = 7500 - division*150`; `:409-410` clamps to `ANSWER_MS - 700` = 7300. `P(lognormal(ln 7500, 0.35) > 7300) = 53.1%` |
| Bot disclosed to the user | **TRUE, 4 sites** | `arena_v2.ts:287` (`playerSnapshot`), `:451` (`publicPlayers`), `:459` (`opponentKind:'bot'` in the public doc), `arena_results.tsx:59` (`player.isBot ? arenaText(lang,'bot')`), `ArenaPlayers.tsx:19`. `isBot` is **not declared** on `ArenaPlayer` (`contract.ts:21-31`) |
| Quick match **currently credits** season stars | **TRUE** | `arena_v2_core.ts:503` excludes only `friend`/`series`; `arena_expansion_core.ts:203` `baseStars: mode === 'quick' \|\| mode === 'ranked'` |
| Settle writes ~14–16 docs/player, not 3 | **TRUE** | `arena_v2.ts:940` `evidenceRows.forEach(tx.set(...))` = 1 mastery doc **per task per player**, plus profile, season, receipt, matchLab (`:908`), 2 starLedger rows (`:926`, `:933`), activityDays (`:941`), spinCredit (`:946`); mastery reads at `:749-760` are 1 `tx.get` per task per player |
| `resolveArenaOutcome` draws on a 2000 ms band | **TRUE** | `arena_v2_core.ts:74`, used `:452`; `fullySolved` branch `:446-450` |
| `taskIndex` hardcoded `0..9` | **TRUE** | `arena_v2.ts:1449`, `:1510` |
| `duel_blueprint.ts:17` rejects 5-task plans | **TRUE** | hardcodes `ARENA_QUESTION_COUNT` |
| `ensureBotReceipt` default elapsed is on the wrong scale | **TRUE** | `arena_v2.ts:545` uses `arenaTaskDurationMs` (reading+answer+grace) where `plan.elapsedMs` is answer-window scale |
| `arenaTaskStars` is shared with expansion modes | **TRUE** | `arena_expansion.ts:373, 828, 865` |

**Ceiling arithmetic, recomputed (this is the number everything else is calibrated against):**

```
div 0-5   [1,1,1,1,1,1,1,1,2,2] → 3+3+3+3+4+3+3+3+4+5 = 34
div 6-11  [1,1,1,2,2,1,2,2,2,2] → 3+3+3+4+5+3+4+4+4+5 = 38
div 12-17 [2,2,2,2,2,2,2,2,3,3] → 4+4+4+4+5+4+4+4+5+6 = 44
div 18-23 [2,2,2,3,3,3,3,2,3,3] → 4+4+4+5+6+5+5+4+5+6 = 48
```
Flattening to 40 is **+17.6 %** for the bottom band and **−16.7 %** for the top, *and* deletes the entire quick-match inflow. **The season pass is retuned whether or not anyone decides to.** See §12.

**Not verifiable from the upload — hard gate before coding §5.3:** `functions/src/tournament_core.ts` was not provided. `verifyTournamentAnswer`, `toPublicTournamentTask`, `applySpeedMatchAttempt`, `validateTournamentTask` and the `answerFingerprints` format are all load-bearing. Also absent: `modules/arena/idempotency.ts`, `hooks/use_runtime_active.ts`, `hooks/use_visible_wall_clock.ts`, `modules/arena/arena_cosmetics.ts`, `package.json`. §5.3 and §14 name the exact checks the engineer must run first.

---

## 1. Rulings — every disagreement resolved

| # | Dispute | Ruling | Loser |
|---|---|---|---|
| R1 | Does quick match compute stars? | **`matchStars` is computed for every mode and always decides the outcome. `bankedStars` is mode-gated.** Two names, never one flag. | Backend proposal's `recomputeArenaRunStars({starsEnabled})` — it makes both quick players score 0 and hands every quick match to the fastest random tapper. |
| R2 | Old ceiling / retune needed? | **34/38/44/48. Retune is mandatory,** plus a hard `Math.min(rawStars, ceiling(mode))` clamp so `40×4=160` is enforced, not assumed. | Game-design "44–52, nothing to retune". |
| R3 | `first` = first to *answer* or first to be *correct*? | **First to be CORRECT.** A wrong opponent tap never blocks your third star. | Literal reading of decision 2 — it creates a denial move and an unexplainable UI state. |
| R4 | Comparison basis | **Client-measured `raceElapsedMs`, quantised to 100 ms buckets.** `first = opponentHasNoCorrect \|\| bucket(mine) <= bucket(theirs)`. Equal bucket → both get 3. Never server receive time. | Both "raw ms strict `<`" (120 Hz devices carry a systematic ≤16.6 ms/tap advantage, ~166 ms over a ranked match) and "server receive time" (charges carrier latency). |
| R5 | Optimistic vs pending third star | **Optimistic — and the server uses the identical player-favourable rule, so it is never retracted.** No `pending` state, no `wallet = max()`, no dual scoreboard. See R6. | Backend "base-2-then-upgrade" (silent batch upgrades offline), client-critic "`pending`" (decision 8 becomes dead code in every offline match), game-design "`wallet = max(displayed, recomputed)` + outcome from truth" (two numbers on one results screen). |
| R6 | Offline double-first | **Legal and final.** One number: the star totals the server computes with the player-favourable rule are what is displayed, banked *and* used for the outcome, for **both** seats. Clamped to the mode ceiling. | Ranked reconciliation. It produces "you scored 40 / you lost to 36", which every player reads as a bug — the critic is right. |
| R7 | speed_match scoring | **1 star per pair matched on the FIRST attempt for that left item.** Wrong tap → that pair is worth 0 but still resolves so the board completes. Max 4. Speed remains irrelevant. | Literal "1 star per correct pair": 4 pairs × 4 options = ≤16 taps in 18 s = a guaranteed 4 stars, the highest-value task in the match, requiring zero knowledge. **Flagged for owner sign-off in §15, but ship this version.** |
| R8 | Combo across speed_match | **4/4 first-attempt increments; 3/4 holds without incrementing; ≤2/4 resets.** Ship relaxed from day one. | Strict reset — the combo becomes payable at idx 2 and is then immediately tested at idx 4 against the hardest requirement in the match; the game-design lens' own worked example fires it once in ten tasks. |
| R9 | Tie-break time | **Two aggregates.** `raceElapsedMs` (raw clamped, first-bonus only) and `tieBreakElapsedMs` (`correct ? clamped : FULL WINDOW`). | Single raw-elapsed aggregate — a 400 ms wrong guess beats a 6 s correct answer. |
| R10 | Draw band | **Delete `ARENA_V2_TIME_TIE_BREAK_MS`. Compare `tieBreakElapsedMs` in 100 ms buckets;** equal bucket → draw. | Both "exact-ms only" (unreachable draws + refresh-rate lottery) and "keep 2000 ms" (silently draws ~3 % of decided matches). One quantum, `ARENA_TIME_QUANTUM_MS = 100`, used for R4 and R10. |
| R11 | `fullySolved` branch | **Delete.** Justified by decision 1 alone — stars, then time, then draw. Do **not** justify it with "equal stars + unequal correct is only reachable via partial boards"; the combo makes it reachable (2+2+3 = 3+... ). | Game-design's false lemma. |
| R12 | RP softener | **Rejected.** `ARENA_V2_RP_TABLE` is exactly zero-sum; +20/−12 injects 8 RP per close match into a ladder where `division = floor(rp/100)` drives content difficulty that no longer pays more stars. "A loss is not wasted" is delivered by star + XP credit, which decision 1 already guarantees. | Game-design's `-12` softener. |
| R13 | Bot retune | **`median = ANSWER_MS × 0.55`, flat. Drop the division term from the median;** keep division in `baseAccuracy`. Clamp `[800, ANSWER_MS − 400]`. | Division-scaled median: quick pays XP `∝ matchStars`, so a faster bot at high division pays a stronger player *less* XP. Inversion. |
| R14 | Bot concealment | **State the threat model honestly: decision 10 protects against the player in the UI, not against a proxy.** Once tasks + answers ship to the device, wire-level concealment is unachievable. Do the three things that work: delete all 4 live disclosure sites, ship the tick array under one neutral name in every payload, and **equalise settle latency with a fixed minimum dwell** so "results appear instantly ⟺ bot" stops being a signal. | "`opponentTimeline: null` for humans is indistinguishable" — non-null ⟺ bot is a perfect classifier. |
| R15 | Live opponent signal | **Ship RTDB in stage 2** for the tick only (~30 lines, one `set` per answer, one `onChildAdded`). Zero Firestore cost. | Deferring it: killing the match listener while RTDB is stage 3 leaves human-vs-human with **no** opponent signal at all — decision 9 satisfied only for bots, in the mode where bots live. That is also a new bot tell. |
| R16 | Ranked + offline | **Ranked requires connectivity to START.** Offline completion is absolute for quick/friend. Ranked mid-match disconnection completes locally and uploads late; the match settles on the deadline; the late report banks stars/XP but never reopens outcome or RP. | "24 h late window for ranked" — it is dead code as written (`settleMatch` writes receipts for *both* seats, so the absent player's `tx.create` gate always throws by the time they reconnect) and it lets a player farm a frozen opponent. |
| R17 | Idempotency key | **`(stableUid, matchId)`.** Delete the client-minted `reportId` and `finishToken` entirely. | Client-minted keys: they break on backup-restore, collide with the existing per-user receipt subcollection, and reinvent a stronger primitive that already ships. |
| R18 | Outbox retry | **Failure-classed.** `offline`/`transient` never increment attempts and retry until the 7-day match TTL; `gated` holds indefinitely with a visible "update the app" prompt; `rejected` drops after 1 attempt. Cap eviction drops the **oldest**. | "dead after 5 attempts" ≈ 6.5 minutes — it deletes the result of a match played on a plane. Decision 6 inverted. |
| R19 | Client answer key format | **Ship `answerFingerprints` as a sibling of `payload`,** plus the shared normalise+hash routine. Do **not** write a plaintext solution extractor. | `ArenaTaskSolution {correctIndex \| acceptedTokenSequences \| correctIndexByPair}` — a new per-mode extractor that must agree with `verifyTournamentAnswer` on 4000 tasks, with no test oracle and a silent-divergence failure mode ("it said correct, then I got 0 stars"). |
| R20 | Accept returns the start payload? | **No.** `startsAtMs` does not exist until the *second* accept (`arena_v2.ts:651-659`). Split: `arenaV2MatchPlan` returns the creation-time half; the short-lived match listener supplies the anchor. | Backend proposal's inline accept payload — the first accepter (half of all players) gets `startsAtMs: undefined`. |
| R21 | Delete the match listener entirely? | **No — scope it.** Listener active during `accepting` + `countdown` and again after `finished`. Zero reads for the whole play window. | "delete `useArenaMatch` from the screen" — `arenaV2FindMatch` can return `status:'waiting'`, the 12 s two-sided accept has no other data source, and settlement must arrive somehow. |
| R22 | `arenaTaskStars` rewrite | **Leave it alone.** Duels get a new engine; Today/Ghost/Rival keep the old one until explicitly re-costed. | Rewriting the shared function — it silently re-tunes three other economies with different caps. |
| R23 | `onSpeedAttempt` signature | **Widen to `boolean \| Promise<boolean>`,** normalise inside `ArenaQuestion`. | `=> boolean` — it is a compile break in `arena_today.tsx:172` and `arena_match_lab.tsx:91`, which keep the round-trip architecture. |
| R24 | 28 px reserved slot prevents reflow | **False as stated.** `arena_match.tsx` renders three conditional siblings (`:177` serverCheck, `:178` verdict, `:179` error) inside `styles.question` (`flex:1, justifyContent:'center'`). Reserve or delete **all three**. Copy budget is **2 lines / 40 chars**, set from Russian, not 22 chars set from English. | Game-design's layout and copy analysis. |
| R25 | Cost target | **2 writes/player is unreachable without the mastery-signature collapse.** Prioritise that (self-contained, no client impact) over the season-doc merge. Honest interim number: 3. | "profile + season + receipt = 3, merge to reach 2". |

---

## 2. The star rules, stated once

```
ARENA_TASK_COUNT       ranked/friend = 10, quick = 5
ARENA_ANSWER_MS        guess_phrase 8000, fill_gap 8000, find_oddity 10000,
                       translate_build 14000, speed_match 18000
ARENA_TIME_QUANTUM_MS  100
ARENA_STARS_CORRECT       2
ARENA_STARS_CORRECT_FIRST 3
ARENA_STARS_PER_PAIR      1     (first-attempt pairs only)
ARENA_COMBO_THRESHOLD     3
ARENA_COMBO_BONUS         1     (flat, never escalates)
ARENA_MATCH_STAR_CEILING  ranked/friend 40, quick 19
```

**Per task `i`:**

```
base(i):
  speed_match           → firstAttemptPairs(i)          // 0..4
  other, correct        → first(i) ? 3 : 2
  other, wrong/timeout  → 0

first(i) = correct(i) AND (
             opponentCorrect(i) === false
             OR bucket(opponentRaceElapsedMs) >= bucket(raceElapsedMs)
           )
  where bucket(ms) = Math.floor(ms / 100)
  opponent unknown (offline / no event / never arrived) ⇒ opponentCorrect = false ⇒ first = true

comboCounts(i):
  speed_match  → 'increment' if firstAttemptPairs === 4
                 'hold'      if firstAttemptPairs === 3
                 'reset'     otherwise
  other        → 'increment' if correct, else 'reset'

streakAfter(i) = increment ? streakAfter(i-1)+1 : hold ? streakAfter(i-1) : 0
combo(i)       = streakAfter(i) >= 3 ? 1 : 0

stars(i) = base(i) + combo(i)

raceElapsedMs(i)     = clamp(tapMs - answerWindowOpenMs, 0, ARENA_ANSWER_MS[mode])
tieBreakElapsedMs(i) = correct(i) ? raceElapsedMs(i) : ARENA_ANSWER_MS[mode]
```

Difficulty **no longer affects stars at all**. `arenaDifficultyPlan` already selects difficulty *for* the player from their division; keeping a multiplier would pay high-division players 5/3 for identical effort.

**Outcome:** `matchStars` desc → `bucket(tieBreakElapsedMs)` asc → draw. Nothing else.

**Ceilings, derived from the fixed `ARENA_V2_MODE_ORDER`:**
```
ranked base 3,3,3,3,4,3,3,3,3,4 = 32 ; combo on idx2..idx9 = 8 ; total 40
quick  base 3,3,3,3,4            = 16 ; combo on idx2..idx4 = 3 ; total 19
mutual full timeout, ranked: 0 stars each, tieBreak 116000 ms each → exact draw
mutual full timeout, quick:  0 stars each, tieBreak  58000 ms each → exact draw
```

**Worked example — mediocre ranked (corrected; the game-design lens charged idx6 8.0 s where the rule demands the 10 s `find_oddity` window):**
```
idx0 correct/second      2  streak 1
idx1 wrong               0  streak 0
idx2 correct/first       3  streak 1
idx3 correct/second      2  streak 2
idx4 speed_match 3/4     3  streak HOLDS at 2      ← R8 relaxed rule
idx5 correct/second      2  streak 3 → combo +1 → 3
idx6 timeout             0  streak 0
idx7 correct/second      2  streak 1
idx8 correct/first       3  streak 2
idx9 speed_match 4/4     4  streak 3 → combo +1 → 5
                                                    total 24 matchStars
tieBreak 4.2 + 8.0 + 5.1 + 9.4 + 18.0 + 6.0 + 10.0 + 7.2 + 10.5 + 12.3 = 90.7 s
```

---

## 3. `modules/arena/stars.ts` — the pure star engine (canonical)

This file is the **single source of truth** and is byte-copied into `functions/src/arena_stars_v3.ts` (§13, parity test T-P1). No React, no Firebase, no `Date.now()`, no I/O.

```ts
export const ARENA_STARS_RULES_VERSION = 'arena-stars.v3' as const;

export const ARENA_ANSWER_MS = Object.freeze({
  guess_phrase: 8_000, fill_gap: 8_000, find_oddity: 10_000,
  translate_build: 14_000, speed_match: 18_000,
} as const);

export const ARENA_TIME_QUANTUM_MS = 100;
export const ARENA_STARS_CORRECT = 2;
export const ARENA_STARS_CORRECT_FIRST = 3;
export const ARENA_STARS_PER_PAIR = 1;
export const ARENA_COMBO_THRESHOLD = 3;
export const ARENA_COMBO_BONUS = 1;
export const ARENA_SPEED_MATCH_PAIRS = 4;

/** Stars a mode may BANK to the season/wallet. Match stars are always computed. */
export type ArenaStarPolicy = 'banked' | 'unbanked' | 'none';
export const ARENA_STAR_POLICY: Readonly<Record<ArenaEntryMode, ArenaStarPolicy>> = Object.freeze({
  ranked: 'banked',
  quick:  'none',      // decision 3: XP only
  friend: 'unbanked',
  series: 'unbanked',
  today:  'banked',    // unchanged; Today keeps arenaTaskStars, see R22
  ghost:  'none',
});

export function arenaMatchStarCeiling(taskCount: number): number {
  // 3 per non-speed task, 4 per speed task, +1 combo from index 2 onward.
  return taskCount === 5 ? 19 : taskCount === 10 ? 40 : 0;
}

export function arenaTimeBucket(ms: number): number {
  return Math.floor(Math.max(0, ms) / ARENA_TIME_QUANTUM_MS);
}

export function arenaClampRaceMs(elapsedMs: number, mode: ArenaTaskMode): number {
  const max = ARENA_ANSWER_MS[mode];
  if (!Number.isFinite(elapsedMs)) return max;
  return Math.round(Math.max(0, Math.min(elapsedMs, max)));
}

/* ------------------------------ task outcome ------------------------------ */

export type ArenaTaskOutcomeStatus = 'correct' | 'wrong' | 'timeout' | 'broken';

export type ArenaTaskOutcome = Readonly<{
  taskIndex: number;
  mode: ArenaTaskMode;
  status: ArenaTaskOutcomeStatus;
  /** ms from THIS device's answer-window open, clamped to ARENA_ANSWER_MS[mode]. */
  raceElapsedMs: number;
  /** speed_match only: pairs matched on the FIRST attempt for that left item. 0..4 */
  firstAttemptPairs: number;
  /** speed_match only: pairs resolved at all, for board-completion UI. 0..4 */
  resolvedPairs: number;
  /** Sanitized, bounded. {selectedIndex} | {tokens} | {pairs} | null */
  answer: unknown;
}>;

/* ------------------------------- award ----------------------------------- */

export type ArenaStarLineReason =
  | 'base_correct' | 'base_pairs' | 'first' | 'combo'
  | 'wrong' | 'timeout' | 'broken';

export type ArenaStarLineState = 'earned' | 'missed' | 'not_applicable';

export type ArenaStarLine = Readonly<{
  reason: ArenaStarLineReason;
  stars: number;
  state: ArenaStarLineState;
  /** first/missed only: how much faster the opponent was, ms. */
  behindByMs?: number;
  /** base_pairs only. */
  pairs?: number;
  /** combo only. */
  comboRun?: number;
}>;

/** Copy key + interpolation params. UI never composes its own sentence. */
export type ArenaStarHeadline = Readonly<{
  key: 'starFirst' | 'starSecond' | 'starSecondUnknownDelta'
     | 'starPairsFull' | 'starPairsPartial' | 'starPairsNone'
     | 'starWrong' | 'starTimeout' | 'starBroken';
  stars: number;
  behindSeconds?: number;   // one decimal
  pairs?: number;
}>;

export type ArenaStarAward = Readonly<{
  stars: number;
  base: number;
  firstBonus: 0 | 1;
  comboBonus: 0 | 1;
  comboRunAfter: number;
  tieBreakElapsedMs: number;
  lines: readonly ArenaStarLine[];
  headline: ArenaStarHeadline;
}>;

export function arenaAwardStars(input: Readonly<{
  mode: ArenaTaskMode;
  status: ArenaTaskOutcomeStatus;
  raceElapsedMs: number;
  firstAttemptPairs: number;
  /** null = unknown ⇒ player is credited first (decision 6). */
  opponentRaceElapsedMs: number | null;
  opponentCorrect: boolean;
  comboRunBefore: number;
}>): ArenaStarAward;

/* ------------------------------- run ------------------------------------- */

export type ArenaRunScore = Readonly<{
  rulesVersion: typeof ARENA_STARS_RULES_VERSION;
  perTask: readonly ArenaStarAward[];
  matchStars: number;          // clamped to arenaMatchStarCeiling(taskCount)
  rawMatchStars: number;       // pre-clamp, telemetry only
  tieBreakElapsedMs: number;
  raceElapsedMs: number;
  correctCount: number;
  firstCount: number;
  longestCombo: number;
  brokenCount: number;
}>;

export function arenaScoreRun(input: Readonly<{
  modes: readonly ArenaTaskMode[];
  own: readonly ArenaTaskOutcome[];
  /** null at index i ⇒ nothing known about the opponent on that task. */
  opponent: readonly (ArenaTaskOutcome | null)[];
}>): ArenaRunScore;

/* ------------------------------ outcome ---------------------------------- */

export type ArenaDuelOutcome = 'win' | 'loss' | 'draw';

export function arenaResolveDuel(
  left:  Pick<ArenaRunScore, 'matchStars' | 'tieBreakElapsedMs'>,
  right: Pick<ArenaRunScore, 'matchStars' | 'tieBreakElapsedMs'>,
): Readonly<{ left: ArenaDuelOutcome; right: ArenaDuelOutcome; reason: 'stars' | 'time' | 'draw' }>;

/* ------------------------------- banking --------------------------------- */

export function arenaBankedStars(input: Readonly<{
  mode: ArenaEntryMode;
  matchStars: number;
  taskCount: number;
  eligibleMatchIndex: number;
  dailyStarsBefore: number;
}>): number;   // 0 unless policy === 'banked'; clamped by ceiling, multiplier, 160/day

export function arenaMatchXp(input: Readonly<{
  mode: ArenaEntryMode;
  matchStars: number;
  outcome: ArenaDuelOutcome;
  completed: boolean;
}>): number;   // quick: 5*matchStars + 10 completion + 20 win. See §15 XP-1.
```

**`arenaAwardStars` behaviour table (this IS the spec; T-S1..T-S9 assert it):**

| mode | status | pairs | opponent | stars | headline |
|---|---|---|---|---|---|
| non-speed | correct | – | none/slower/equal bucket | 2 + 1 first (+combo) | `starFirst` |
| non-speed | correct | – | correct, faster bucket | 2 (+combo) | `starSecond` w/ `behindSeconds` |
| non-speed | correct | – | correct, faster, elapsed unknown | 2 (+combo) | `starSecondUnknownDelta` |
| non-speed | wrong | – | any | 0, combo reset | `starWrong` |
| non-speed | timeout | – | any | 0, combo reset | `starTimeout` |
| non-speed | broken | – | any | 0, **combo preserved, no combo bonus paid** | `starBroken` |
| speed_match | any | 4 | any | 4 (+combo), streak++ | `starPairsFull` |
| speed_match | any | 3 | any | 3 (+combo if already ≥3), streak holds | `starPairsPartial` |
| speed_match | any | 0–2 | any | pairs, combo reset | `starPairsPartial`/`starPairsNone` |

`broken` preserves the combo run (the player did nothing wrong) but **pays no combo bonus on that task** — otherwise a rendering crash is a source of free stars.

---

## 4. Match-start payload

Two-part delivery. **R20:** `startsAtMs` does not exist until the second accept.

### 4.1 `arenaV2MatchPlan({ matchId })` — creation-time half, idempotent, re-fetchable

Called on accept-screen mount, and again as the recovery path after reinstall / storage purge / corrupt MMKV.

```ts
export type ArenaMatchPlanWire = Readonly<{
  schemaVersion: 'arena-match-plan.v2';
  rulesVersion: 'arena-stars.v3';
  matchId: string;
  mode: ArenaEntryMode;
  viewerSeat: 'a' | 'b';
  taskCount: number;                     // arenaTaskCount(mode): 5 quick, 10 otherwise
  countdownMs: number;                   // ARENA_V2_COUNTDOWN_MS 3200
  readingMs: number;                     // ARENA_V2_READING_MS 1500
  revealMs: number;                      // ARENA_V2_REVEAL_MS 1200
  rules: Readonly<{
    starsCorrect: 2; starsCorrectFirst: 3; starsPerPair: 1;
    comboThreshold: 3; comboBonus: 1;
    timeQuantumMs: 100;
    starPolicy: ArenaStarPolicy;         // 'banked' | 'unbanked' | 'none'
    awardsRankPoints: boolean;
    matchStarCeiling: number;            // 40 | 19
  }>;
  tasks: readonly ArenaPlanTask[];
  opponent: Readonly<{
    seat: 'a' | 'b'; name: string; avatar?: string; aura?: string; rank: number;
  }>;
  /** ALWAYS PRESENT, ALWAYS AN ARRAY. Empty for a live opponent. See R14. */
  opponentTicks: readonly ArenaOpponentTick[];
  liveChannelPath: string;               // `arena_live/${matchId}` — RTDB, live in stage 2
  planHash: string;                      // sha256 of the canonicalized tasks array
  issuedAtMs: number;
}>;

export type ArenaPlanTask = Readonly<{
  taskId: string;
  taskIndex: number;
  mode: ArenaTaskMode;
  kind: ArenaPublicTask['kind'];
  difficulty: number;
  answerMs: number;                      // ARENA_ANSWER_MS[mode]
  /** EXACTLY today's toArenaPublicTask() output. Never contains answers. */
  payload: Readonly<Record<string, unknown>>;
  /** SIBLING of payload, never inside it — keeps task_adapter.ts:25 a live leak detector. */
  answerFingerprints: readonly string[];
  /** speed_match only: items[i].correctIndex, already plaintext in the sealed task. */
  pairSolution?: readonly number[];      // length 4
}>;

export type ArenaOpponentTick = Readonly<{
  taskIndex: number;
  /** ms from THAT task's answer-window open — same scale as own raceElapsedMs. */
  raceElapsedMs: number;
  correct: boolean;
}>;
```

**MUST NOT appear on the wire:** opponent `stableUid`/`authUid`; `opponentKind`; `isBot` on any player projection; `botSeed`, `botSeedCommitment`, `botPlan`; any `points`/`score`/`scores` field (not even as `0`); reward preview, `starsEarned`, season balances, `spinPity`/`rollBps`; `arenaPublication` Merkle proofs; task-pool cursors; per-pair `explanation.wrongOptionReasons` and `explanation` (strip them — the client renders no explanations mid-match; this is most of the payload size and the answer to the 3G risk).

**Budget:** `ARENA_PLAN_BUDGET_BYTES = ARENA_V2_PRIVATE_BUDGET_BYTES` (384 KB). It must be **≥** the private budget, never below — a plan that passes creation and fails at start after both players accepted is unacceptable. Validated at creation, not at start.

### 4.2 Start anchor — from the scoped match listener

`startsAtMs = match.stateDeadlineAtMs` while `match.state === 'countdown'`. The listener is active during `accepting` and `countdown` only, then unsubscribed (§8.2). No `serverNowMs`, no skew correction: the client anchors its monotonic origin the moment it observes `countdown`, and all subsequent timing is monotonic-local.

---

## 5. Match-finish payload

### 5.1 `arenaV2MatchFinish(submission)`

```ts
export type ArenaMatchReport = Readonly<{
  schemaVersion: 'arena-match-report.v2';
  rulesVersion: 'arena-stars.v3';
  matchId: string;
  seat: 'a' | 'b';
  mode: ArenaEntryMode;
  planHash: string;
  taskCount: number;
  startedAtWallMs: number;
  finishedAtWallMs: number;
  tasks: readonly ArenaTaskOutcome[];        // exactly taskCount, index-ordered, no gaps
  /** What the player was SHOWN. Compared server-side, logged, never trusted. */
  shownMatchStars: number;
  abandoned: boolean;
  clockSuspect: boolean;
}>;

export type ArenaMatchFinishResponse = Readonly<{
  ok: true;
  status: 'awaiting_opponent' | 'settled';
  replay: boolean;
  late: boolean;
  /** Present iff status === 'settled'. */
  result?: ArenaMatchResult;
  /** Server-recomputed per-task breakdown; drives the results-screen replay. */
  score?: ArenaRunScore;
  starsDelta: number;   // score.matchStars - shownMatchStars. Alert if != 0.
}>;

export type ArenaMatchResult = Readonly<{
  outcome: ArenaDuelOutcome;
  reason: 'stars' | 'time' | 'draw';
  ownStars: number;
  opponentStars: number;
  ownTieBreakMs: number;
  opponentTieBreakMs: number;
  /** Largest per-task star deficit; ties broken by the LATEST index. */
  decisiveTaskIndex: number | null;
  bankedStars: number;
  seasonStarsAfter?: number;
  xpEarned: number;
  ratingDelta: number;
  ratingAfter: number;
  rankAfter: number;
  spinAwarded: boolean;
  spinReceiptId?: string;
  bestCombo: number;
  firstCount: number;
}>;
```

**No `stars` total submitted as authority. No `score`. No `points`. No `comboRuns` array — combo is refolded server-side. No `finishToken` (R17). No `clientCorrect`/`clientStars` diagnostic fields (R17) — `shownMatchStars` is the one comparison field and it exists solely to emit the `arena_star_mismatch` counter.**

### 5.2 Server-side recompute — determinism, not defence

State the purpose honestly (decision 5 rules anti-cheat out of scope): the recompute exists so the **credited number matches the displayed number even from an old build with stale constants**, and so star tuning ships server-side without an app release.

1. Correctness comes from `verifyTournamentAnswer(sealedTask, outcome.answer)` — never from the report's `status`. `status: 'timeout' | 'broken'` is accepted as-is and forces `correct = false`.
2. `raceElapsedMs = arenaClampRaceMs(reported, mode)`. `timeout` forces `raceElapsedMs = ARENA_ANSWER_MS[mode]`. A lying client can only make itself slower. Clamping's real job is surviving device clock drift on a run played hours earlier offline.
3. `firstAttemptPairs` is recomputed from the sealed `pairSolution` and the submitted per-pair attempt log; a pair whose first attempt was wrong scores 0 regardless of what the report claims.
4. Combo is refolded from the server's own correctness stream.
5. `arenaScoreRun` is called with the opponent's frozen `ArenaTaskOutcome[]` where available, `null` where not — the player-favourable rule (R5/R6) applies identically on both sides.
6. `taskIndex` bounds come from `privateDoc.tasks.length` (the **sealed** length), never from the declared mode — in-flight matches created before the §7 fix have 10 sealed tasks.

### 5.3 HARD GATE before writing any of §5.2 or §4.1

`functions/src/tournament_core.ts` was not in the upload. Before writing a line of the plan payload the engineer must run and record:

- **G1** — Is `verifyTournamentAnswer` implemented over `answerFingerprints` (hash-of-normalised-answer), or over plaintext payload fields? If fingerprints: ship them per R19 and extract the normalise+hash routine into `modules/arena/answer_check.ts`, imported by both sides.
- **G2** — If the fingerprint salt is server-secret or per-task keyed, the client cannot verify locally. Fallback, in this order: (a) ship the salt (anti-cheat is out of scope, decision 5); (b) if the salt is shared with a non-Arena system, mint an Arena-only per-match salt at seal time and ship it in `ArenaPlanTask.answerFingerprints` recomputed under it.
- **G3** — Does `toPublicTournamentTask` strip `items[i].correctIndex` for `speed_match`? `adaptTournamentTaskForArena` (`arena_v2_core.ts:206-224`) sets it; if the public projection strips it, `pairSolution` must be lifted from the **sealed** task, not the public one.
- **G4** — Confirm `applySpeedMatchAttempt`'s per-pair semantics so `firstAttemptPairs` is computable client-side identically.

---

## 6. Local match state machine

Three layers. The screen is none of them.

### 6.1 `modules/arena/monotonic.ts`

```ts
let last = 0;
export function arenaMonotonicNowMs(): number {
  const raw = typeof (globalThis as any).performance?.now === 'function'
    ? (globalThis as any).performance.now() : Date.now();
  last = Math.max(last, raw);   // never goes backwards regardless of source
  return last;
}
export function arenaMonotonicEpochId(): string;   // uuid, minted once per JS process
export function arenaMonotonicIsSynthetic(): boolean;  // true when performance.now() is absent
```

The `Math.max` latch is mandatory: in React Native the `performance` polyfill has historically been `Date`-derived, in which case "immune to clock changes" is false and the fallback silently produces a wall clock. On iOS a mach-derived clock does not advance while the device sleeps, so **on resume take the worse of the two clocks**: `elapsed = max(monoDelta, wallDelta)` when `wallDelta > 0`. Under-counting elapsed is the exploitable direction; over-counting only costs a task.

### 6.2 `modules/arena/match_machine.ts` — pure reducer

No React, no Firebase, no clock read inside. Every event carries its own time. The plan is passed as an argument, never stored in state: state stays ~2 KB and JSON-serialisable, the plan stays up to 384 KB and immutable.

```ts
export type ArenaLocalPhaseKind = 'countdown' | 'reading' | 'answer' | 'reveal' | 'finished';

export type ArenaLocalMatchState = Readonly<{
  schemaVersion: 'arena-local-match.v2';
  matchId: string;
  seat: 'a' | 'b';
  mode: ArenaEntryMode;
  taskCount: number;
  planHash: string;

  phase: ArenaLocalPhaseKind;
  taskIndex: number;
  phaseStartedAtMonoMs: number;
  phaseStartedAtWallMs: number;
  phaseBudgetMs: number;
  monoEpochId: string;

  outcomes: readonly ArenaTaskOutcome[];
  /** speed_match scratch for the CURRENT task: attempts per left item. */
  pairAttempts: Readonly<Record<number, number>>;
  pairFirstAttemptCorrect: Readonly<Record<number, boolean>>;

  awards: readonly ArenaStarAward[];      // resolved awards, index-aligned with outcomes
  matchStars: number;
  comboRun: number;
  longestCombo: number;
  correctCount: number;
  firstCount: number;
  tieBreakElapsedMs: number;

  opponentByTask: Readonly<Record<number, ArenaOpponentTick>>;
  opponentFinished: boolean;
  /** Set at tap; the award resolves at this monotonic instant. See §9.2. */
  awardResolveAtMonoMs: number | null;

  clockSuspect: boolean;
  lastEventAtMonoMs: number;
  lastEventAtWallMs: number;
  startedAtWallMs: number;
  finishedAtWallMs: number | null;
  abandoned: boolean;
}>;

export type ArenaLocalEvent =
  | { type: 'tick';              monoNowMs: number }
  | { type: 'answer';            monoNowMs: number; wallNowMs: number; answer: unknown }
  | { type: 'speed_attempt';     monoNowMs: number; pairIndex: number; selectedIndex: number }
  | { type: 'award_resolve';     monoNowMs: number }
  | { type: 'opponent_answered'; monoNowMs: number; tick: ArenaOpponentTick }
  | { type: 'opponent_finished'; monoNowMs: number }
  | { type: 'resume';            monoNowMs: number; wallNowMs: number; monoEpochId: string }
  | { type: 'task_broken';       monoNowMs: number; taskIndex: number }
  | { type: 'abandon';           monoNowMs: number; wallNowMs: number };

export function arenaLocalMatchInit(
  plan: ArenaMatchPlan,
  at: Readonly<{ monoNowMs: number; wallNowMs: number; monoEpochId: string; countdownRemainingMs: number }>,
): ArenaLocalMatchState;

export function arenaLocalMatchReduce(
  plan: ArenaMatchPlan,
  state: ArenaLocalMatchState,
  event: ArenaLocalEvent,
): ArenaLocalMatchState;

export function arenaLocalMatchReport(
  plan: ArenaMatchPlan,
  state: ArenaLocalMatchState,
): ArenaMatchReport | null;   // null until phase === 'finished'

export const ARENA_LOCAL_ABANDON_MS = 10 * 60 * 1_000;
export function arenaLocalMatchAbandoned(state: ArenaLocalMatchState, wallNowMs: number): boolean;
```

**Clock-suspect detector — compare like origins.** The proposed version compared `wallNowMs - lastEventAtWallMs` against `monoNowMs - phaseStartedAtMonoMs`: two different origins, so with a 250 ms tick `wallDelta ≈ 250` while `monoDelta` grows toward 8000 and the condition can essentially never fire. Correct form, using the `lastEventAtMonoMs` field the proposal omitted:

```ts
const wallDelta = event.wallNowMs - state.lastEventAtWallMs;
const monoDelta = event.monoNowMs - state.lastEventAtMonoMs;
if (wallDelta < 0 || Math.abs(wallDelta - monoDelta) > 5_000) next.clockSuspect = true;
```
`clockSuspect` rides in the report as telemetry. It never voids stars and never aborts a match.

**Cold restart.** `state.monoEpochId !== event.monoEpochId` ⇒ the persisted monotonic origin is meaningless. Fall back to wall clock exactly once: `elapsed = clamp(wallNow - phaseStartedAtWallMs, 0, phaseBudgetMs)`. If the clamp saturates, or `clockSuspect` is set, the in-flight task is finalised as `timeout` (0 stars) and the match resumes at `taskIndex + 1`. **Never award stars from a reconstructed elapsed.**

**Backgrounding.** No timer runs while backgrounded (RN throttles them anyway; relying on them is a bug). On `resume`, the reducer fast-forwards through as many tasks as the elapsed time covers, finalising each as `timeout`.

**Abandon.** Past `ARENA_LOCAL_ABANDON_MS`, resume auto-finalises all remaining tasks as timeouts, sets `abandoned: true`, and routes to results.

### 6.3 `modules/arena/local_clock.ts`

```ts
export type ArenaLocalPhase =
  | { kind: 'countdown'; remainingMs: number }
  | { kind: 'reading';  taskIndex: number; remainingMs: number }
  | { kind: 'answer';   taskIndex: number; remainingMs: number; budgetMs: number }
  | { kind: 'reveal';   taskIndex: number; remainingMs: number; award: ArenaStarAward }
  | { kind: 'finished' };

export function arenaLocalPhase(state: ArenaLocalMatchState, monoNowMs: number): ArenaLocalPhase;
```
`remainingMs = phaseBudgetMs - (monoNow - phaseStartedAtMonoMs)`. **The answer timer runs from reading-end for exactly `ARENA_ANSWER_MS[mode]`.** `ARENA_V2_RECEIVE_GRACE_MS` is deleted from the client path entirely — there is no receive, so there is nothing to grant grace for. This is the fix for the 11-s-on-an-8-s-task defect.

### 6.4 `hooks/use_arena_local_match.ts` — the only place with effects

```ts
export function useArenaLocalMatch(input: Readonly<{
  matchId: string | null;
  active: boolean;                 // useRuntimeActive()
  startsAtMs: number | null;       // from the scoped listener during 'countdown'
}>): Readonly<{
  ready: boolean;
  plan: ArenaMatchPlan | null;
  state: ArenaLocalMatchState | null;
  phase: ArenaLocalPhase;
  opponent: ArenaOpponentIndicator;
  submitAnswer: (answer: unknown) => void;
  submitSpeedAttempt: (pairIndex: number, selectedIndex: number) => boolean;
  markTaskBroken: (taskIndex: number) => void;
  abandon: () => void;
}>;
```

Timers: `setInterval(250)` dispatching `tick` for the visible counter, **plus** a precise `setTimeout(remainingMs + 8)` for each phase boundary, **plus** a dedicated `setTimeout` for the 600 ms award resolve. `useVisibleWallClock(active, 1000)` is removed from `arena_match.tsx:42` — a 1 Hz tick cannot drive an 8 s window without visible stutter, and it cannot drive a 600 ms resolve at all.

---

## 7. Quick match = 5 tasks — PREREQUISITE, lands before everything else

Owner decision 4 is unimplemented. Ship this as its own commit **first**; the entire plan contract assumes `taskCount` is real.

1. `arena_v2.ts:364` — `selectedTaskEnvelope(matchId, pool, now, divisionIndex, mode: ArenaV2Mode)`.
2. `arena_v2.ts:370` — `selectArenaTasks(pool, matchId, divisionIndex, mode)`.
3. `arena_v2_core.ts:283` — `arenaDifficultyPlan(clamped, matchMode)`; today the difficulty plan and the mode order are sliced by different rules.
4. All `validateArenaPrivateEnvelope` call sites pass mode: `arena_v2.ts:386`, `:453`, `:1203`; `arena_expansion.ts:272`, `:1836`.
5. `arena_v2.ts:455-470` — write `taskCount: arenaTaskCount(mode)` into `publicDoc`.
6. `arena_v2.ts:1449`, `:1510` — replace `int(taskIndex,'task_index',0,9)` with a bound of `privateDoc.tasks.length - 1`.
7. `modules/arena/duel_blueprint.ts:16-19` — `isValidArenaBlueprint(value, taskCount = ARENA_QUESTION_COUNT)`; assert `taskCount / 5` of each mode.
8. Callers of `selectedTaskEnvelope` at `arena_v2.ts:1192`, `:1304`, `:1328`, `:1776` pass their mode.

Without this, a quick match seals 10 tasks, the client renders `6 / 5` … `10 / 5` with `V2Segments total={5} done={9}`, and the 19-star quick ceiling does not exist.

---

## 8. Settlement state machine

### 8.1 States

`accepting → countdown → playing → awaiting_opponent → settled | abandoned`

`task_active` and `task_reveal` disappear from the server entirely — they become client-local phases. `activateTask` and `beginReveal` (`arena_v2.ts:602-637`), which each write the match doc once per task (20 writes per ranked match, independent of `submittedBy`/`scores`), are **deleted**. This is what actually reaches the cost target; moving two fields to RTDB does not.

New match-doc fields: `submittedSeats: ('a'|'b')[]`, `settleDueAtMs`, `abandonDueAtMs`, `settledAtMs`, `settleReason`, `absentSeat?`, `pendingSeats?`, `taskCount`, `schemaVersion: 'arena-duel.v2'`.
Deleted: `currentPublicTask`, `currentTaskIndex`, `submittedBy`, `scores`, `closedField`, `readingEndsAtMs`, per-task `version` bumps, `opponentKind`, `isBot` on players.

### 8.2 Timings — ordered, not coincidentally equal

```
ARENA_DUEL_EXPECTED_RUN_MS(tasks) =
  ARENA_V2_COUNTDOWN_MS + Σ (arenaTaskDurationMs(mode) + ARENA_V2_REVEAL_MS)
  // reuse arenaTaskDurationMs; do NOT restate the sum — it silently omits
  // ARENA_V2_RECEIVE_GRACE_MS, which is 15 s of missing slack per ranked match.

ARENA_DUEL_ABANDON_MS      = 10 * 60_000     // client-side auto-finalise
ARENA_DUEL_SETTLE_WINDOW_MS = 20 * 60_000    // from match CREATION, not first report
ARENA_DUEL_LATE_WINDOW_MS   = 24 * 60 * 60_000   // quick/friend only
ARENA_DUEL_SWEEP_BATCH      = 200
ARENA_DUEL_MIN_SETTLE_DWELL_MS = 900         // R14: equalise bot/human results latency

settleDueAtMs  = createdAtMs + ARENA_DUEL_SETTLE_WINDOW_MS
abandonDueAtMs = createdAtMs + ARENA_DUEL_SETTLE_WINDOW_MS + 10 * 60_000
```
The invariant that must hold and that the two 10-minute constants in the proposals violated: `settleWindow > abandonWindow + maxRemainingPlayMs`. With a 10-task match, max remaining play is ~3 min; 20 > 10 + 3. A player who backgrounds at task 3, returns at 9:30 and needs two more minutes is **not** settled against while actively playing.

### 8.3 Transitions

**T1 — First finisher.** Writes `runs.{seat}` into the private doc, `state = 'awaiting_opponent'`, `submittedSeats = [seat]`. Credits nothing. Returns `{ status: 'awaiting_opponent', replay: false, late: false }`.

**T2 — Second finisher.** `arenaDuelSettlementReady(privateDoc)` is true, so `settleArenaDuel()` runs in the same transaction and credits both sides. This is the common path; it costs no scheduled function.

**T3 — One-sided, deadline passed.** Two forcers.
*Fast path:* the present client calls `arenaV2MatchSettle({matchId})` once `now > settleDueAtMs` (a no-op read when already settled).
*Guaranteed path:* `arenaV2DuelSettleSweep`, `onSchedule` every 2 minutes, `where state == 'awaiting_opponent' and settleDueAtMs <= now limit 200`, bounded concurrency 8.
The absent side is **synthesised** as an all-timeout run — every task `status:'timeout'`, `raceElapsedMs = ARENA_ANSWER_MS[mode]`, `firstAttemptPairs: 0` — so `arenaScoreRun` has exactly one code path and the present player naturally earns the 3-star first bonus on every correct answer.

Mode split (R16):
- **ranked** — the absent seat takes the loss, the RP, the profile counters, and its `{matchId}` receipt. `settleReason: 'opponent_absent'`. A late ranked report banks stars/XP through the `{matchId}__stars` gate only; it never reopens outcome or RP.
- **quick / friend** — the forced settlement writes **no** `{matchId}` receipt, no profile write and no `matches`/`losses` increment for the absent seat. `pendingSeats: ['b']`, `settleReason: 'awaiting_late_submit'`. The present player's per-task outcomes are frozen in the private doc. A late submission within 24 h is judged against those frozen outcomes and writes its own receipts. Outcomes may be asymmetric (both seats can read "win"); acceptable in modes with no rating, and neither player can observe the other's result screen.

**T4 — Neither submits.** Sweep sets `state = 'abandoned'` at `abandonDueAtMs`, no stars, no RP; reuses the existing `clearActiveProfiles()` / `closeMatchQueues()`.

**T5 — Late submit after settlement.** See T3 mode split. Past the window: `{ status:'settled', late:true, replay:false }` with zero credit and `lateRejected: 'window_expired' | 'ranked_window_closed'`.

**T6 — Bot matches** never enter `awaiting_opponent`; the bot's outcomes are derived from `opponentTicks` and settlement fires on the human's finish — **held behind `ARENA_DUEL_MIN_SETTLE_DWELL_MS`** so results latency does not classify the opponent (R14).

**T7 — Concurrent finishes.** Both `arenaV2MatchFinish` calls may land in the same instant; both read `runs` as empty and both try to settle. Firestore serialises this correctly **only if both the match doc and the private doc are read inside the transaction before any write**. Do not optimise the private-doc read away.

**T8 — `arenaV2CleanupHourly` reconciler.** Add `'client_authoritative'` to the set of states it refuses to advance. Today it walks non-terminal matches through the server state machine (25 per run, so an orphan can wait nearly an hour) and would force transitions that contradict the client's authoritative report.

### 8.4 Idempotency — three layers, one guarantee

| Layer | Key | What it guarantees |
|---|---|---|
| 1 | `arena_v2_match_private/{matchId}.runs.{seat}` + `arenaRunFingerprint(report)` = sha256 of canonicalized `tasks[]` | Idempotent **before** any receipt exists — i.e. throughout the `awaiting_opponent` window, which layer 2 cannot cover. Same fingerprint → return the stored response verbatim with `replay: true`. Different fingerprint → `HttpsError('already-exists','arena_run_conflict')`, stored run wins. |
| 2 | `users/{stableUid}/arena_v2_receipts/{matchId}` via `tx.create()` (`arena_v2.ts:901`) | **THE exactly-once gate for outcome + RP + profile counters.** Do not soften to `set({merge:true})`. |
| 3 | `users/{stableUid}/arena_v2_receipts/{matchId}__stars` via `tx.create()` | **THE exactly-once gate for banked stars + XP + wallet + ledger.** Separate from layer 2 precisely so a late quick/friend report can bank stars against an already-decided match without colliding with an outcome receipt. |

`clientRunId`, `reportId` and `finishToken` are **deleted** (R17). The natural key is `(stableUid, matchId)`: server-minted, unforgeable, uncollidable across users, already implemented, and — unlike a client-minted id — correct when a device is restored from an iCloud/Android backup and replays a stored MMKV plan.

Client side: the run is written to the outbox **before** the first finish attempt and deleted only on `status:'settled'` or `replay:true`.

### 8.5 Migration guard

`privateDoc.totals[uid].score` currently sums `receipt.points` (100 per correct). Deploying a build where `score` is a star count with no guard settles every in-flight match by comparing `800` against `22`. The private doc has no schema version field.

Add `privateDoc.schemaVersion`. `settleArenaDuel` accepts only `'arena-duel.v2'`; documents without it route to the legacy `settleMatch` path, which stays in the tree for one release. Cutover requires either this guard **or** a drain of max match duration (~2.5 min) + accept window — ship the guard.

---

## 9. Client UX — decisions 8 and 9

### 9.1 Layout — reserve or delete all three siblings

`arena_match.tsx` renders three conditional siblings inside `styles.question` (`flex:1, justifyContent:'center'`): `serverCheck` (`:177`), `verdict` (`:178`), `error` (`:179`). Any height change re-centres the column and moves the answer buttons under the player's thumb mid-tap. One reserved 28 px slot does not fix this.

- **Delete** `serverCheck` outright (line 177) and its key in `modules/arena/copy.ts:20`. Under decision 5 there is no round trip to wait for. Delete the `submitting` state with it — it also gates `ArenaQuestion`'s `locked` prop (`:171`).
- **Replace** `verdict` (`:178`) with `<ArenaStarAward />`, fixed height **56 px**, reserved from task start, two lines max.
- **Reserve** the `error` slot at fixed height or delete it (under decision 5 the only errors are plan-validation failures, which happen before the countdown).

### 9.2 Award timing — two moments, both inside the answer window

- **T+0 (tap):** instant verdict colour on the chosen option, pure local check, zero network. `2` stars fly to the counter with a 120 ms stagger. A third slot appears immediately as an empty outline star with a bolt glyph — **the shape is reserved so nothing moves later**.
- **T+600 ms:** the slot resolves, **always**, whether or not the opponent has answered.

The invariant that makes 600 ms safe, which the game-design lens asserted without stating: **any opponent correct answer faster than yours was already sent before your tap.** You are awaiting delivery of a past message, not a future action. 600 ms covers RTDB in-flight at p95. It fails only when the opponent is offline and flushes minutes later — decision 6's main case — and the accepted consequence is a symmetric double-first that is credited and never recomputed (R6). Do **not** wait for reveal: reveal can be five seconds after your tap and the causal link is gone.

The 600 ms resolve needs its own `setTimeout`; the screen's only clock today ticks once per second.

### 9.3 Copy — Russian budget, not English

**2 lines / 40 characters**, not one line / 22. `"+2 — они были быстрее на 0,4 с"` is 30 characters; the English original was 27. Russian is the app's primary language.

New keys in `modules/arena/copy.ts` (all 8 locales), keyed by `ArenaStarHeadline.key`:

| key | RU | note |
|---|---|---|
| `starFirst` | `+3 — вы были первым` | gold |
| `starSecond` | `+2 — соперник быстрее на {s} с` | real delta, one decimal — "0,4 с" says the race is winnable, "они были быстрее" says nothing |
| `starSecondUnknownDelta` | `+2 — соперник успел раньше` | degraded form |
| `starPairsFull` | `+4 — все 4 пары с первой попытки` | **the speed_match gap the game-design lens missed** — 20 % of ranked tasks had no string |
| `starPairsPartial` | `+{n} — {n} из 4 с первой попытки` | |
| `starPairsNone` | `0 — пары не сошлись` | |
| `starWrong` | `0 — комбо сброшено` | |
| `starTimeout` | `0 — время вышло` | |
| `starBroken` | `Задание пропущено` | combo preserved |
| `comboChip` | `×{n} · +1` | |

### 9.4 Combo chip — separate surface

Combo is **not** in the award slot. `<ArenaComboChip />` is pinned to the player's own counter in the `ArenaPlayers` header, appears the instant the third consecutive correct lands, and stays for the rest of the run. Two systems competing for the same pixels on an 8 s timer is how you lose both.

### 9.5 Opponent indicator (decision 9)

The existing 86 px `ArenaPlayers` header only. A dot with three states: dim idle; filled **plus one 180 ms pulse at the exact moment their event lands**; slow 1 s breathe once you have answered and are waiting. `ArenaOpponentIndicator`:

```ts
export type ArenaOpponentIndicator = Readonly<{
  status: 'unknown' | 'thinking' | 'answered' | 'finished';
  taskIndex: number;
  pulseAtMonoMs: number | null;
}>;
```

**Mid-match opponent star count is not rendered.** It does not exist without per-answer writes, which is exactly what was deleted. `V2Counter` shows the viewer's own stars; the opponent's slot shows the dot. This is an explicit product change from today's live `match.scores`.

### 9.6 Accessibility — one announcement

`arena_match.tsx` sets `accessibilityLiveRegion="polite"` on the verdict text. Adding a second content change 600 ms later in the same region makes TalkBack and VoiceOver queue both and read serially for over two seconds, overlapping the next task on an 8 s window. **Compose exactly one announcement at T+600 ms** containing verdict + stars + reason; the T+0 verdict surface is `accessibilityLiveRegion="none"`.

### 9.7 Results screen — the five things a loss must deliver

1. Open on a per-task star bar, `taskCount` segments, yours over theirs, 300 ms sweep. The player must see **where** it was lost before they see **that** it was lost.
2. Credit every star scored regardless of outcome, stated in level terms. **Blocked on the shared star manager — see §15 SM-3.**
3. Name the decisive task deterministically: largest per-task star deficit, ties broken by the **latest** index. One tap into Match Lab.
4. Two opponent-independent records that survive a loss: `Лучшее комбо ×4` and `Первым на 2 из 10`. The second is the most actionable number in the feature — the player can move it next match without knowing any more English.
5. Render from **local state first** (your stars, XP, combo — all known offline, instant) and merge the settled `ArenaMatchResult` when it arrives. The outcome line shows an explicit "waiting for opponent" state with the opponent's recorded progress and a countdown — **not** a spinner. A ranked player who force-quits leaves their opponent waiting, and that is the exact case where a frustrated player closes the app and never sees their win.

`Play Again` is the primary CTA, pre-focused, target under 5 s from results to the next countdown.

---

## 10. Opponent feed — one interface, three adapters

```ts
// modules/arena/opponent_feed.ts
export type ArenaOpponentEvent = Readonly<{
  taskIndex: number;
  /** ms since THEIR answer window opened, clamped to that mode's budget. */
  raceElapsedMs: number;
  correct: boolean;
  receivedAtMonoMs: number;
  finished?: boolean;
}>;

export type ArenaOpponentFeed = Readonly<{
  subscribe: (listener: (event: ArenaOpponentEvent) => void) => () => void;
  /** fire-and-forget BY CONTRACT — returns void so no contributor can await it. */
  publish: (event: Omit<ArenaOpponentEvent, 'receivedAtMonoMs'>) => void;
  close: () => void;
}>;

export type ArenaOpponentFeedFactory = (input: Readonly<{
  matchId: string; seat: 'a' | 'b'; opponentSeat: 'a' | 'b';
  ticks: readonly ArenaOpponentTick[]; liveChannelPath: string;
}>) => ArenaOpponentFeed;
```

`answeredAtMs` (a wall timestamp from a device whose clock you have just declared untrustworthy) and `starsTotal` (opponent private state that leaks their answer pattern) are **not** on the event. `raceElapsedMs` is the only competitive input, and it is the same quantity `first()` consumes on both devices and on the server.

**Adapters:**
- `app/arena_opponent_rtdb.ts` — `onChildAdded` at `arena_live/{matchId}/{opponentSeat}`; `publish` = `set()` + `onDisconnect().remove()`. Payload `{ e: raceElapsedMs, c: 0|1 }`, ~40 bytes, 10 writes/player/ranked match, zero Firestore cost.
- `app/arena_opponent_scripted.ts` — `ticks.length > 0` ⇒ schedule one local `setTimeout(raceElapsedMs)` per task after that task's reading phase ends, emitting the identical event shape. Zero network, zero latency, works offline, fires at exactly the right moment.
- `app/arena_opponent_noop.ts` — registry default and offline fallback.

Selection is inside the registry (`ticks.length > 0 ? scripted : rtdb`), never in the screen. `arena_match.tsx` imports only the registry and the type.

**RTDB rules** (`database.rules.json`): the server writes `arena_live/{matchId}/seats/{authUid} = 'a'|'b'` at match creation. A client may write `arena_live/{matchId}/{seat}/**` iff `root.child('arena_live/'+matchId+'/seats/'+auth.uid).val() === seat`; both participants may read the whole match node. TTL cleanup rides on the existing hourly job.

---

## 11. Offline upload queue

```ts
// modules/arena/result_outbox.ts
export type ArenaOutboxFailure = 'offline' | 'transient' | 'gated' | 'rejected';

export type ArenaOutboxEntry = Readonly<{
  schemaVersion: 'arena-outbox.v2';
  matchId: string;                 // the idempotency key (R17)
  report: ArenaMatchReport;
  enqueuedAtWallMs: number;
  attempts: number;                // incremented ONLY for 'rejected'
  nextAttemptAtWallMs: number;
  lastFailure: ArenaOutboxFailure | null;
}>;

export async function enqueueArenaReport(report: ArenaMatchReport): Promise<void>;
export async function flushArenaOutbox(wallNowMs?: number):
  Promise<Readonly<{ sent: number; kept: number; dropped: number }>>;
export function peekArenaOutbox(): readonly ArenaOutboxEntry[];
export function arenaOutboxClassify(error: unknown): ArenaOutboxFailure;

export const ARENA_OUTBOX_MAX = 20;
export const ARENA_OUTBOX_TTL_MS = 7 * 24 * 60 * 60 * 1_000;   // == ARENA_V2_MATCH_TTL_MS
```

**Storage:** key-per-report `arena.outbox.v2.<matchId>` plus an ordered index key `arena.outbox.v2.index`. **Never a single JSON array** — a crash mid-write would corrupt every queued match.

**Retry policy (R18):**

| class | trigger | attempts | behaviour |
|---|---|---|---|
| `offline` | no connectivity, DNS, timeout | **not incremented** | retry on the next flush trigger, forever, until TTL |
| `transient` | 5xx, `deadline-exceeded`, App Check refresh | **not incremented** | jittered backoff 1 s / 4 s / 15 s / 60 s / 5 min, then every 5 min, until TTL |
| `gated` | `arena_client_update_required` | not incremented | hold indefinitely, surface "обновите приложение, чтобы засчитать матч", **never drop** |
| `rejected` | schema invalid, unknown match, unauthorized | 1 | drop with telemetry |

**TTL:** drop only past `ARENA_OUTBOX_TTL_MS` — past that the server match doc is gone (`ARENA_V2_MATCH_TTL_MS`) and settlement can never succeed. **Cap eviction drops the OLDEST**, never the newest; the newest is the match the player just played.

**Single-flight:** module-level `let flushing: Promise<...> | null` plus an in-memory `Set<string> inFlight`, so a foreground event and a NetInfo event firing together produce one call.

**Flush triggers:** app foreground (`useRuntimeActive`), NetInfo regaining connectivity, `arena_results.tsx` mount, and a 60 s ticker while foregrounded. No background-fetch task — it buys little and costs a native config surface.

### 11.1 Persistence — `modules/arena/match_store.ts`

```ts
export function saveArenaPlan(plan: ArenaMatchPlan): void;
export function loadArenaPlan(matchId: string): ArenaMatchPlan | null;
export function saveArenaProgress(state: ArenaLocalMatchState): void;    // SYNCHRONOUS
export function loadArenaProgress(matchId: string): ArenaLocalMatchState | null;
export function setArenaActiveMatch(matchId: string | null): void;
export function getArenaActiveMatch(): string | null;
export function clearArenaPlan(matchId: string): void;      // called at MATCH END
export function clearArenaProgress(matchId: string): void;  // called at UPLOAD SUCCESS
```

Keys: `arena.plan.v2.<matchId>` (immutable, ≤384 KB, written once), `arena.progress.v2.<matchId>` (mutable, ~2 KB, debounced 250 ms + **synchronous on background**), `arena.active.v2`.

**Retention (correcting the proposal, which maximised exposure):** delete the plan **at match end**, the moment the report is minted — not at upload success. The report is self-contained at ~2 KB. Steady-state offline storage is 20 × 2 KB, not 20 × 384 KB, and the answer-bearing blob lives for one match instead of potentially a week.

The plan blob must be excluded from telemetry payloads, log statements and crash-report attachments. A separate key makes that exclusion mechanical rather than a review-time promise.

**Engine:** `react-native-mmkv`, because the background-transition write must be synchronous — AsyncStorage can lose the last snapshot when the OS suspends the process, and that snapshot is the one taken during the 14 s `translate_build` where suspension actually happens. **Verify against `package.json` before anything else in this design is committed** (§14 P-1). Without MMKV the fallback is not "a rare lost task": every backgrounded match resumes one task stale and that task is finalised as a timeout.

---

## 12. Cost — the honest numbers

**Per ranked match, today:** ~12 answer submits + 8–16 per-pair attempt submits + syncs, each opening a transaction that reads the match doc **and** a private doc budgeted at 384 KB and full-rewrites both via `tx.set`; plus 10 `activateTask` + 10 `beginReveal` match-doc writes; plus a settle transaction doing ~28 reads and ~28 writes.

**After stage 2:**

| | reads | writes |
|---|---|---|
| Creation (shared) | ≤10 `tournamentTasks` + config | 2 (`match`, `private`) |
| Accept / countdown listener | 2–4 snapshots per player, seconds only | 1 accept |
| **Whole play window** | **0** | **0** |
| Finish + settle (shared txn) | `match` 1 + `private` 1 + per player (profile 1, season 1, receipt 1, receipt__stars 1) | `match` 1 + `private` 1 + per player: profile 1 + receipt 1 + receipt__stars 1 |

**The 2-writes-per-player target is unreachable without all three of:**
1. **Mastery-signature collapse** (do this first — self-contained, no client impact): `users/{uid}/arena_v2_mastery/signatures` holding `{ [signatureHash]: expiresAtMs }`, pruned on write, capped, with one `expireAt`. Turns 10 reads + 10 writes per player into 1 + 1. **Without this the redesign does not reduce per-match writes at all — it moves them from play time to settle time.**
2. **Fold `matchLab` and both `starLedger` rows into the receipt document**, which is already the exactly-once gate and already TTL'd at 400 days. The ledger's "independent second guard" is illusory — it lives in the same transaction as the receipt.
3. **Merge `users/{uid}/arena_v2_seasons/{seasonId}` into `arena_v2_profiles/{uid}.season`.** Needs a backfill and a dual-read window; `arenaV2Home`, `arenaV2SeasonClaim` and the season-pass screen all read the standalone doc today. **Blocked on the shared star manager — §15 SM-1.**

If (3) is deferred, the honest number is **3 writes/player**. Say so in the plan; do not claim 2.

**Sweep load:** `limit 200` every 2 minutes caps forced settlements at 6000/hour. A regional network incident that drops thousands of matches at once builds a backlog. The client-forced `arenaV2MatchSettle` must be the primary path with the sweep as backstop, and the sweep needs bounded concurrency (8) or it exhausts transaction retries against itself.

---

## 13. Files

### Create

| Path | Change |
|---|---|
| `modules/arena/stars.ts` | **Canonical** pure star engine v3: `arenaAwardStars`, `arenaScoreRun`, `arenaResolveDuel`, `arenaBankedStars`, `arenaMatchXp`, all constants, `ARENA_STAR_POLICY`. |
| `functions/src/arena_stars_v3.ts` | Byte-identical checked-in copy of the above (functions has its own `rootDir`); parity enforced by T-P1. |
| `modules/arena/monotonic.ts` | Latched monotonic clock + process epoch id + synthetic-clock detector. |
| `modules/arena/local_clock.ts` | `arenaLocalPhase(state, monoNow)` — phase + `remainingMs` from monotonic origin + budget. Replaces `arenaClockPhase` for duels. |
| `modules/arena/match_machine.ts` | Pure local reducer: `arenaLocalMatchInit`, `arenaLocalMatchReduce`, `arenaLocalMatchReport`, `arenaLocalMatchAbandoned`. |
| `modules/arena/match_plan.ts` | `normalizeArenaMatchPlan`, `validateArenaMatchPlan` (validate-at-intake over every task), `arenaMatchPlanHash`. |
| `modules/arena/answer_check.ts` | `arenaVerifyLocalAnswer`, `arenaVerifySpeedPair` — shared normalise+fingerprint routine, client twin of `verifyTournamentAnswer`. |
| `modules/arena/result_outbox.ts` | Failure-classed offline queue, key-per-report, single-flight, oldest-first eviction. |
| `modules/arena/match_store.ts` | MMKV plan/progress/active-pointer persistence with synchronous background write. |
| `modules/arena/opponent_feed.ts` | `ArenaOpponentEvent`, `ArenaOpponentFeed`, `ArenaOpponentIndicator` types. |
| `modules/arena/opponent_feed_registry.ts` | `setArenaOpponentFeedFactory` / `createArenaOpponentFeed`; no-op default. |
| `hooks/use_arena_local_match.ts` | The only effectful layer: timers, AppState, persistence, feed wiring, outbox handoff. |
| `app/arena_opponent_rtdb.ts` | RTDB adapter — `onChildAdded` subscribe, `set()` + `onDisconnect().remove()` publish. |
| `app/arena_opponent_scripted.ts` | Local `setTimeout` adapter driven by `opponentTicks`. |
| `app/arena_opponent_noop.ts` | Registry default / offline fallback. |
| `components/arena/ArenaTaskBoundary.tsx` | Error boundary around the question renderer; `onError` → `task_broken` event. |
| `components/arena/ArenaStarAward.tsx` | Fixed 56 px reserved award slot; renders `ArenaStarHeadline`; single live-region announcement at T+600 ms. |
| `components/arena/ArenaComboChip.tsx` | Persistent combo chip pinned to the viewer's counter. |
| `functions/src/arena_duel_v3.ts` | `arenaV2MatchPlan`, `arenaV2MatchFinish`, `arenaV2MatchSettle`, `arenaV2DuelSettleSweep`, `settleArenaDuel`, `arenaDuelSynthesizeAbsentRun`, `arenaDuelExpectedRunMs`. |
| `functions/src/arena_stars_v3.test.ts` | Star engine unit tests (T-S*). |
| `functions/src/arena_duel_v3.test.ts` | Settlement state machine + idempotency tests (T-D*). |
| `tests/arena_stars_parity.test.ts` | Byte + behavioural parity between the two star files (T-P*). |
| `tests/arena_match_machine.test.ts` | Reducer determinism, resume, cold restart, abandon (T-M*). |
| `tests/arena_result_outbox.test.ts` | Failure classing, TTL, eviction, single-flight (T-O*). |

### Modify

| Path | Change |
|---|---|
| `functions/src/arena_v2_core.ts` | Thread `matchMode` into `arenaDifficultyPlan` at `:283`; delete `ARENA_V2_TIME_TIE_BREAK_MS` (`:74`) and the `fullySolved` branch (`:446-450`); rewrite `resolveArenaOutcome` to `{matchStars, tieBreakElapsedMs}` in 100 ms buckets; retune `buildArenaBotBlueprint` median to `ANSWER_MS × 0.55` flat with clamp `[800, ANSWER_MS−400]`; add `arenaOpponentTicks(plan, tasks)`; add `arenaDuelExpectedRunMs`. **Leave `arenaTaskStars`, `scoreArenaAnswer`, `scoreArenaSpeedProgress` in place for the expansion modes (R22).** |
| `functions/src/arena_v2.ts` | §7 quick-task-count fixes (`:364`, `:370`, `:386`, `:453`, `:455-470`, `:1192`, `:1203`, `:1304`, `:1328`, `:1449`, `:1510`, `:1776`); delete `activateTask`/`beginReveal`/`advanceMatch` task loop, `arenaV2SubmitAnswer`, `arenaV2SubmitSpeedAttempt`, `ensureBotReceipt`, `shortenDeadlineToBotPlan`, `fillTimeoutReceipts`, `refreshPublicTotals`; fix `storeReceipt:524` (accumulate elapsed unconditionally) in the legacy path; **remove `isBot` at `:287` and `:451` and `opponentKind` at `:459` from all public surfaces**; collapse mastery signatures to one doc (`:749-760`, `:940`); fold matchLab + starLedger into the receipt; add `privateDoc.schemaVersion` guard; write `arena_live/{matchId}/seats/{authUid}`; add `'client_authoritative'` to the hourly reconciler's refuse-list at `:1959`. |
| `functions/src/arena_expansion_core.ts` | `arenaRunEligibility` `:203`: `baseStars: mode === 'ranked'` (quick no longer banks stars); add `xp: mode === 'quick'`; `dailyEligibleMatches` must increment **only** for star-crediting modes — otherwise four quick matches burn the `1,1,1,1,0.5,0.5` ladder and halve the income of the ranked matches that follow. |
| `functions/src/arena_expansion.ts` | Rewrite ghost-duel `hostScore`/`guestScore` at `:467-468` (summed points) to stars, or ghost duels silently compare zeros; leave `arenaTaskStars` call sites at `:373`, `:828`, `:865` untouched; pass mode to `validateArenaPrivateEnvelope` at `:272`, `:1836`; bound `taskIndex` by sealed length at `:805`, `:836`. |
| `modules/arena/contract.ts` | `ArenaPlayer.score` → `stars`; **add `isBot`? NO — delete every reader instead**; delete `ArenaMatch.scores`, `currentPublicTask`, `currentTaskIndex`, `submittedBy`, `opponentKind`; `ArenaMatchReward.hostScore/guestScore` → `hostStars/guestStars`; add `xpEarned`; add `ArenaMatchStatus` values `playing`/`awaiting_opponent`; add all §4/§5 types. |
| `modules/arena/schedule.ts` | Keep `arenaClockPhase` for Today/Ghost/legacy only; add a deprecation header naming `local_clock.ts` as the duel replacement; delete after the drain release. |
| `modules/arena/task_adapter.ts` | Move the `'answer' in payload` throw at `:25` out of the shared adapter into a public-projection-only guard — the plan is *supposed* to contain answers as a sibling, and the guard must keep detecting accidental leaks *into* `payload`. |
| `modules/arena/duel_blueprint.ts` | `isValidArenaBlueprint(value, taskCount)` — mode-aware, accepts 5-task quick plans. |
| `modules/arena/copy.ts` | Delete `serverCheck` (`:20`); add the 10 §9.3 keys in all 8 locales; keep `bot` (`:53`) unused-but-present only if some non-duel surface needs it, otherwise delete. |
| `app/arena_client.ts` | Delete `arenaV2SubmitAnswer` (`:146`), `arenaV2SubmitSpeedAttempt` (`:153`) and their `& {correct, points}` return types; add `arenaV2MatchPlan`, `arenaV2MatchFinish`, `arenaV2MatchSettle`; scope `useArenaMatch` per §8; register the RTDB feed factory at bootstrap. |
| `app/arena_match.tsx` | **Rewrite**, not refactor. Delete `useVisibleWallClock` (`:42`), `submitting` (`:45`), the `deadlineSyncAttemptsRef` block (`:80-96`), `pruneArenaSubmissionIds` (`:100`), `submit`/`speedAttempt` (`:116-143`), `serverCheck` (`:177`). Drive everything from `useArenaLocalMatch`; wrap the question in `ArenaTaskBoundary`; render `ArenaStarAward` + `ArenaComboChip`; keep the accept/decline card and the scoped listener for `accepting`/`countdown`. |
| `app/arena_results.tsx` | Remove `player.isBot ? arenaText(lang,'bot')` (`:59`); render local summary first, merge settled result; add the per-task star bar, decisive-task line, best-combo / first-count records, "waiting for opponent" state with countdown. |
| `app/arena.tsx` | Read `arena.active.v2` on mount; show a "continue match" affordance routing to `/arena_match?matchId=…`; flush the outbox. |
| `app/arena_today.tsx`, `app/arena_match_lab.tsx` | No behaviour change — but they must still compile against the widened `onSpeedAttempt` signature (`:172`, `:91`). |
| `components/arena/ArenaQuestion.tsx` | `onSpeedAttempt: (p, s) => boolean \| Promise<boolean>` (`:15`), normalised internally; track per-pair attempt counts and expose `firstAttemptPairs` via `onMatchingComplete`; lock a pair after its first wrong attempt resolves it (R7). |
| `components/arena/ArenaPlayers.tsx` | Delete the `player?.isBot && botLabel` branch (`:19`) and the `botLabel` prop; `V2Counter` renders stars; `useCountUp` driven by star deltas so `+2`/`+3` lands as an event; opponent slot renders the indicator dot, not a count. |
| `firestore.rules` / `firestore.indexes.json` | Index `arena_v2_matches (state ASC, settleDueAtMs ASC)` for the sweep; `arena_v2_matches (state ASC, abandonDueAtMs ASC)`; add the `__stars` receipt path to the closed-collection rules. |
| `database.rules.json` | New file or new node: `arena_live/{matchId}` — seat-scoped write, participant read (§10). |
| `package.json` | Add `react-native-mmkv` if absent (§14 P-1); add `@react-native-firebase/database`. |
| `docs/arena/HANDOVER.md`, `docs/arena/README.md` | Document `arena-stars.v3`, the settlement state machine, the RTDB channel, the honest bot threat model (R14), and the ranked-requires-connectivity rule (R16). |

---

## 14. Prerequisites the engineer must clear before coding

| # | Check | Blocks |
|---|---|---|
| **P-1** | `react-native-mmkv` in `package.json`? | §11.1. Without it, every backgrounded match resumes one task stale and that task times out. |
| **P-2** | `functions/src/tournament_core.ts` — gates G1–G4 in §5.3 | §4.1, §5.2. The plan payload cannot be written without knowing the fingerprint scheme. |
| **P-3** | `modules/arena/idempotency.ts`, `hooks/use_runtime_active.ts`, `hooks/use_visible_wall_clock.ts` — not in the upload | §6.4 wiring. `idempotency.ts` collapses to nothing under R17. |
| **P-4** | Does an app-wide XP store exist outside `arena/`? | §15 XP-1. No arena file references XP at all. |
| **P-5** | `@react-native-firebase/database` installed and RTDB provisioned for the project? | §10, decision 9. |
| **P-6** | Ship §7 (quick = 5 tasks) as its own commit and verify in staging | Everything. |

---

## 15. BLOCKED ON THE SHARED STAR MANAGER (Этап 1)

Owner decision: **stars are one global app currency.** `docs/arena/HANDOVER.md:305` records today's opposite: *"Learning V2 wallets/stars не читаются и не пишутся"* — Arena stars are a closed system. Task #6 (`Этап 1: единый менеджер звёзд`) is still `pending`. The following **cannot be completed** in stage 2 alone. Ship stage 2 with each item behind the named seam, then close them in Этап 1.

| # | Item | Why it is blocked | Seam to ship now |
|---|---|---|---|
| **SM-1** | Merging `users/{uid}/arena_v2_seasons/{seasonId}` into `arena_v2_profiles/{uid}.season` | The season doc is one of two competing star ledgers. Merging it inside Arena entrenches the split ledger the global manager must dissolve, and forces a second migration. | Keep the standalone season doc. **Per-player writes are 3, not 2.** State this number in the plan. |
| **SM-2** | Retuning `ARENA_V2_SEASON_LEVEL_STARS = 50`, the 160/day cap and `ARENA_V2_DAILY_MULTIPLIERS` | Inflow changes by **+17.6 % (div 0–5) to −16.7 % (div 18–23)** *and* the entire quick-match inflow is deleted, over a 63-day season with unbounded levels (`arenaSeasonLevelUnlocked` has no upper bound, so the error compounds). Retuning against an Arena-only model is wasted work once Learning stars feed the same wallet. | Ship `arenaBankedStars` with the hard clamp `Math.min(rawStars, arenaMatchStarCeiling(taskCount))` so `40 × 4 = 160` is *enforced*. Keep every constant at today's value. Add a `arena_star_inflow_daily` telemetry counter, bucketed by division band, from day one — Этап 1 needs that data. Also fix the duplicated constant at `arena_v2.ts:867` (`Math.floor(starsAfter / 50)` hardcodes 50 instead of using `ARENA_V2_SEASON_LEVEL_STARS`). |
| **SM-3** | Results-screen copy `"22 звезды — 44 % уровня 12"` (decision: a loss must bank something visible) | Requires a single authoritative level curve across Arena and Learning. Printing the Arena-local curve now guarantees the number changes under the player later. | Render `"+22 ★"` with no level framing. The level line lands in Этап 1. |
| **SM-4** | Quick-match **XP** (owner decision 3: quick awards *only* XP) | There is no XP concept in `arena_v2.ts`, `arena_v2_core.ts`, `arena_expansion_core.ts` or `modules/arena/contract.ts`. `arenaMatchXp` has no anchor to the app's XP curve — 125 XP for a perfect quick match is either trivial or dominant relative to a lesson and **nobody in any of the three proposals knows which**. | Ship `arenaMatchXp` as a pure function and `ArenaMatchResult.xpEarned` on the wire. Write the credit behind the `{matchId}__stars` receipt gate to a **stub** `arenaAwardXp()` that logs and no-ops when the global store is absent (P-4). Quick match therefore ships with **display-only XP** — flag this to the owner: **until Этап 1, quick match banks nothing.** That is a regression from today, where quick credits season stars. If that is unacceptable for the interim, the only alternative is keeping `baseStars: mode === 'quick' \|\| 'ranked'` for one release, which contradicts decision 3. Owner call. |
| **SM-5** | Folding `arena_v2_star_ledger` rows into the receipt (§12 item 2) | The ledger is the audit trail the global wallet will inherit. Its schema is an Этап 1 decision. | Keep both `tx.create` ledger rows as they are today. **Per-match write savings are ~85 % rather than ~93 %.** |
| **SM-6** | `profile.starWalletBalance` as the single balance | Two balances (`season.stars` gross, `profile.starWalletBalance` spendable) plus Learning's own is exactly what the global manager unifies. | No change. Arena continues to write both. |

**Additional items requiring explicit owner sign-off (not blocked, but deviations from the literal decision text):**

- **OWN-1 (R7)** — speed_match scores pairs matched **on the first attempt**, not "1 star per correct pair" literally. The literal rule makes speed_match a guaranteed 4 stars via ≤16 exhaustive taps in an 18 s window, more than any other task, requiring zero knowledge. The current server rule subtracts `wrongAttempts` (`arena_v2_core.ts:518`) precisely to prevent this, and the redesign deletes that subtraction.
- **OWN-2 (R16)** — **ranked requires connectivity to start.** Decision 6 (offline completion) and ranked RP integrity cannot both be fully satisfied: if a report can arrive days late, either the opponent waits or the match settles without you. Offline completion stays absolute for quick/friend; ranked mid-match disconnection completes locally and settles on the deadline.
- **OWN-3 (R15)** — RTDB ships in stage 2, not stage 3. Decision 7 defers it, but decision 9 is unimplementable without it once per-answer Firestore writes stop, and a bot-only indicator is the worst possible partial implementation.
- **OWN-4 (R14)** — decision 10 is scoped to the UI, not the wire. Once tasks and answers ship to the device, wire-level bot concealment is unachievable. Do not later reject a design for failing a test it was never going to pass.
- **OWN-5 (§9.5)** — the live opponent **star count** disappears from the match screen. Only a thinking/answered/finished dot remains. It cannot exist without per-answer writes.

---

## 16. Smoke tests — concrete assertions

### Star engine — `functions/src/arena_stars_v3.test.ts`

- **T-S1** `arenaAwardStars({mode:'guess_phrase', status:'correct', raceElapsedMs:3000, opponentRaceElapsedMs:null, opponentCorrect:false, comboRunBefore:0})` → `stars === 3`, `firstBonus === 1`, `headline.key === 'starFirst'`.
- **T-S2** Same with `opponentRaceElapsedMs:2000, opponentCorrect:true` → `stars === 2`, `headline.key === 'starSecond'`, `headline.behindSeconds === 1.0`.
- **T-S3** `opponentRaceElapsedMs:2000, opponentCorrect:false` (opponent answered **wrong** first) → `stars === 3`. Asserts R3: a wrong opponent answer never blocks the third star.
- **T-S4** `raceElapsedMs:3040, opponentRaceElapsedMs:3010, opponentCorrect:true` → **both** buckets are 30 → `stars === 3` for both seats. Asserts R4: a 30 ms gap does not decide a star.
- **T-S5** `mode:'speed_match', firstAttemptPairs:4` → `stars === 4`, `firstBonus === 0`; with `comboRunBefore:2` → `stars === 5`, `comboRunAfter === 3`.
- **T-S6** `mode:'speed_match', firstAttemptPairs:3, comboRunBefore:4` → `stars === 3 + 1`, `comboRunAfter === 4` (**holds**, does not increment, does not reset — R8).
- **T-S7** `mode:'speed_match', firstAttemptPairs:2, comboRunBefore:5` → `comboRunAfter === 0`.
- **T-S8** `status:'broken', comboRunBefore:4` → `stars === 0`, `comboRunAfter === 4`, `comboBonus === 0`. A rendering crash costs one task and yields no free stars.
- **T-S9** `status:'wrong'` → `tieBreakElapsedMs === ARENA_ANSWER_MS[mode]` regardless of `raceElapsedMs`. A 400 ms wrong guess is charged the full window.
- **T-S10** Perfect ranked run (10 correct, all first, both boards 4/4) → `arenaScoreRun(...).matchStars === 40`, `firstCount === 10`, `longestCombo === 10`, exactly 8 tasks with `comboBonus === 1`.
- **T-S11** Perfect quick run (5 tasks) → `matchStars === 19`, exactly 3 tasks with `comboBonus === 1`.
- **T-S12** The §2 mediocre worked example → `matchStars === 24`, `tieBreakElapsedMs === 90_700`. **Asserts idx6 `find_oddity` timeout is charged 10 000 ms, not 8 000** — the game-design lens broke its own rule in the one artefact engineers copy into fixtures.
- **T-S13** Both seats fully timed out, ranked → `matchStars === 0` each, `tieBreakElapsedMs === 116_000` each, `arenaResolveDuel(...).reason === 'draw'`. Quick → `58_000` each, draw.
- **T-S14** Fully offline ranked run: both seats credited first on all 10 tasks → each `rawMatchStars === 40`, `matchStars === 40`. No path produces `matchStars > 40`. Asserts R6 + the ceiling clamp; a 50-star ranked match must be unreachable.
- **T-S15** `arenaResolveDuel({matchStars:22, tieBreakElapsedMs:60_000},{matchStars:22, tieBreakElapsedMs:60_040})` → `draw` (same 100 ms bucket). `…60_140` → `left: 'win', reason: 'time'`.
- **T-S16** `arenaBankedStars({mode:'quick', matchStars:19, …}) === 0`; `{mode:'friend'} === 0`; `{mode:'ranked', matchStars:40, eligibleMatchIndex:0, dailyStarsBefore:120} === 40`; `dailyStarsBefore:150` → `10` (160 cap).
- **T-S17** Difficulty is not an input to `arenaAwardStars` — the function signature contains no `difficulty` field, and `arenaScoreRun` over identical outcomes at difficulty 1 and difficulty 3 returns identical `matchStars`.

### Parity — `tests/arena_stars_parity.test.ts`

- **T-P1** `modules/arena/stars.ts` and `functions/src/arena_stars_v3.ts` are byte-identical after stripping the generated-file header. **Fails CI on any drift.**
- **T-P2** The full cross product `mode(5) × status(4) × firstAttemptPairs(0..4) × comboRunBefore(0..4) × opponentRaceElapsedMs({null, mine−200, mine−50, mine, mine+200}) × opponentCorrect(2)` produces identical `ArenaStarAward` objects from both modules. Runs in **both** package test suites.

### Local machine — `tests/arena_match_machine.test.ts`

- **T-M1** Replaying the same event sequence from `arenaLocalMatchInit` twice produces deep-equal states. The reducer contains no `Date.now()`, no `Math.random()`.
- **T-M2** `resume` with the **same** `monoEpochId` after `9_000 ms` on an 8 s `guess_phrase` finalises that task as `timeout` and advances to `taskIndex + 1`; total stars unchanged for already-answered tasks.
- **T-M3** `resume` with a **different** `monoEpochId` (cold restart) finalises the in-flight task as `timeout`, never awards stars from a reconstructed elapsed, and preserves all prior awards.
- **T-M4** `resume` where `wallDelta = 40_000` and `monoDelta = 1_000` (iOS sleep) uses `max(monoDelta, wallDelta)` → fast-forwards; under-counting is never chosen.
- **T-M5** Clock-suspect detector fires when `wallDelta - monoDelta > 5_000` on a `tick` event, and does **not** fire on a normal 250 ms tick. Asserts the origin-mismatch bug is fixed (`lastEventAtMonoMs` exists and is used).
- **T-M6** `arenaMonotonicNowMs()` never returns a value lower than a previous call, even when the underlying source jumps backwards.
- **T-M7** `abandon` past `ARENA_LOCAL_ABANDON_MS` finalises all remaining tasks as timeouts, sets `abandoned: true`, and `arenaLocalMatchReport` returns a report with exactly `taskCount` entries.
- **T-M8** `task_broken` at index 4 with `comboRun === 4` yields `outcomes[4].status === 'broken'`, `comboRun === 4` after, `awards[4].stars === 0`, and the match continues to index 5.
- **T-M9** `award_resolve` fires at `tap + 600 ms` even when **no** `opponent_answered` event ever arrives, and the resolved award is `stars === 3` for a correct answer.
- **T-M10** An `opponent_answered` event arriving at `tap + 4_000 ms` (after resolve) **does not change** `awards[i].stars`. Asserts never-retract.
- **T-M11** speed_match: pair 0 first attempt wrong, second attempt right → `firstAttemptPairs` does not count pair 0; the pair still resolves so the board completes.
- **T-M12** `arenaLocalMatchReport` returns `null` until `phase === 'finished'`, then a report whose `tasks.length === taskCount` with no index gaps.

### Settlement — `functions/src/arena_duel_v3.test.ts`

- **T-D1** Two `arenaV2MatchFinish` calls, different seats → first returns `status:'awaiting_opponent'` and credits nothing; second returns `status:'settled'` and both receipts exist.
- **T-D2** Replaying seat A's identical report → `replay: true`, byte-identical `result`, and exactly one `arena_v2_receipts/{matchId}` document.
- **T-D3** Replaying seat A with a **different** answer fingerprint under the same match → `HttpsError('already-exists','arena_run_conflict')`; the stored run is unchanged.
- **T-D4** Ranked, seat B never submits, `now > settleDueAtMs`, `arenaV2MatchSettle` by seat A → B's run is synthesised as all-timeout, A earns the first bonus on every correct answer, B's receipt exists with the loss and RP, `settleReason === 'opponent_absent'`.
- **T-D5** Quick, seat B never submits, forced settle → **no** `{matchId}` receipt for B, `pendingSeats === ['b']`, `settleReason === 'awaiting_late_submit'`. B submits 6 hours later → `late: true`, B's `{matchId}__stars` receipt is created, A's receipt and A's recorded outcome are **untouched**.
- **T-D6** Ranked late submit after settlement → `late: true`, `lateRejected: 'ranked_window_closed'` for outcome/RP, but the `{matchId}__stars` receipt **is** created (the player keeps the stars they earned).
- **T-D7** Two simultaneous `arenaV2MatchFinish` calls in the same transaction window → exactly one settlement, exactly two receipts, no double credit. Both the match doc and the private doc are read before any write.
- **T-D8** `settleDueAtMs > abandonDueAtMs - ARENA_DUEL_ABANDON_MS + maxRemainingPlayMs` holds for `taskCount` 5 and 10. A player resuming at 9:30 into a 10-minute abandon window is not settled against.
- **T-D9** A finish submitting 10 answers for a **quick** match whose sealed envelope has 5 tasks → rejected. A finish submitting 5 answers for a **legacy** quick match whose sealed envelope has 10 tasks → bounded by `privateDoc.tasks.length`, not by mode, and recomputes over the 5 submitted with the remaining 5 as timeouts.
- **T-D10** A private doc without `schemaVersion` routes to the legacy `settleMatch` path and its point-valued `totals.score` is never compared against a star total.
- **T-D11** `shownMatchStars: 40` with a server recompute of `40` → `starsDelta === 0`. A tampered `shownMatchStars: 99` → `starsDelta === -59`, the `arena_star_mismatch` counter increments, and the **credited** value is the recomputed 40.
- **T-D12** A client claiming `raceElapsedMs: 0` on every task still receives at most the mode ceiling, and `timedOut` forces `raceElapsedMs = ARENA_ANSWER_MS[mode]`.
- **T-D13** A bot match settles no earlier than `ARENA_DUEL_MIN_SETTLE_DWELL_MS` after the human's finish call. Asserts R14's latency equalisation.
- **T-D14** `arenaV2DuelSettleSweep` with 500 eligible matches settles 200 and leaves 300; a second run settles the rest; no match is settled twice.
- **T-D15** Per ranked match, count Firestore writes across creation + accept + finish + settle. Asserts **≤ 3 writes per player** plus 4 shared, and **zero** writes between countdown-end and finish.

### Payload / disclosure

- **T-X1** `arenaV2MatchPlan` response, serialised, contains none of: `isBot`, `opponentKind`, `botSeed`, `botPlan`, `botSeedCommitment`, `points`, `score`, `scores`, `stableUid` of the opponent, `authUid`, `arenaPublication`, `spinPity`, `rollBps`, `starsEarned`. Asserted by a **substring scan of the JSON**, not by type checking.
- **T-X2** `opponentTicks` is present and is an array in **every** plan response — empty for a human opponent, `taskCount` entries for a bot. Never `null`, never absent.
- **T-X3** No file under `app/` or `components/` references `player.isBot` or `match.opponentKind`. Enforced by a source-scan test (the existing `arena_expansion_client_source_contract.test.ts` pattern).
- **T-X4** `adaptArenaTask(plan.tasks[i].payload)` does **not** throw `arena_public_task_contains_answer_metadata` for any task in a generated plan — i.e. `answerFingerprints` rides as a sibling, never inside `payload`, and the leak detector stays live.
- **T-X5** A serialised plan for the largest possible ranked envelope is `< ARENA_PLAN_BUDGET_BYTES` and `ARENA_PLAN_BUDGET_BYTES >= ARENA_V2_PRIVATE_BUDGET_BYTES`. Explanations and `wrongOptionReasons` are absent from the plan.

### Outbox — `tests/arena_result_outbox.test.ts`

- **T-O1** An `offline` failure does **not** increment `attempts`; after 50 offline flushes the entry still exists and is still retried.
- **T-O2** A `gated` failure holds indefinitely; the entry is never dropped.
- **T-O3** A `rejected` failure drops the entry after exactly 1 attempt with telemetry.
- **T-O4** An entry older than `ARENA_OUTBOX_TTL_MS` is dropped on the next flush.
- **T-O5** With 20 entries queued, enqueueing a 21st evicts the **oldest** by `enqueuedAtWallMs`, never the newest.
- **T-O6** Two concurrent `flushArenaOutbox()` calls issue exactly one network call per entry.
- **T-O7** Storage is key-per-report: corrupting `arena.outbox.v2.<matchIdA>` leaves `<matchIdB>` readable and flushable.
- **T-O8** After `status:'settled'`, `clearArenaProgress` runs and `arena.plan.v2.<matchId>` is **already absent** (deleted at match end, not at upload).

### Timer / UI

- **T-U1** On a `guess_phrase` task the answer countdown starts at **8**, not 11, and reaches 0 exactly `ARENA_ANSWER_MS.guess_phrase` after the reading phase ends. Regression test for the confirmed defect.
- **T-U2** Rendering `<ArenaStarAward>` in every one of its 10 headline states produces the same measured height (56 px), and the answer buttons' `pageY` is identical across all of them.
- **T-U3** Exactly one `accessibilityLiveRegion` announcement fires per task, at T+600 ms.
- **T-U4** Every headline string, in all 8 locales, is ≤ 40 characters and wraps to at most 2 lines at the smallest supported font scale.
- **T-U5** `arena_today.tsx` and `arena_match_lab.tsx` compile and pass their existing tests against the widened `onSpeedAttempt` signature.
- **T-U6** With a scripted feed, the opponent indicator pulse fires within 50 ms of `tick.raceElapsedMs` after the reading phase ends — decision 9, offline, zero network.