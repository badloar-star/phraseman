---
phase: 01-foundation-friend-codes-data-model-security
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - app/xp_manager.ts
  - app/cloud_sync.ts
  - app/weekly_xp.ts
  - functions/src/reset_weekly_xp.ts
  - functions/src/index.ts
  - functions/src/reset_weekly_xp.test.ts
  - tests/weekly_xp.test.ts
autonomous: true
requirements: [XP-01, XP-02, XP-03, XP-04, TEST-06]

must_haves:
  truths:
    - "Every successful XP gain in registerXP() increments AsyncStorage 'weekly_xp' by the same finalDelta as 'user_total_xp'"
    - "Every successful XP gain also writes progress.weekly_xp and progress.weekly_xp_period_start to users/{canonicalUid} via cloud_sync (not via direct write — must flow through SYNC_KEYS)"
    - "weekly_xp_period_start equals ISO date (YYYY-MM-DD) of the most recent Monday 00:00 UTC"
    - "Cloud Function resetWeeklyXpCron runs every Monday 00:00 UTC with timeZone 'UTC' and zeroes progress.weekly_xp for ALL users without touching progress.user_total_xp"
    - "Existing pushMyScore call site in xp_manager.ts is preserved unchanged (same arguments, same conditions)"
    - "firestore_leaderboard.ts is NOT modified"
  artifacts:
    - path: "app/weekly_xp.ts"
      provides: "Weekly XP increment helper + period-start computation"
      exports: ["addWeeklyXp", "getCurrentWeekStartIso", "WEEKLY_XP_KEY", "WEEKLY_XP_PERIOD_START_KEY"]
    - path: "app/xp_manager.ts"
      provides: "Existing XP entrypoint extended to call addWeeklyXp(finalDelta) on each gain"
      contains: "addWeeklyXp"
    - path: "app/cloud_sync.ts"
      provides: "SYNC_KEYS includes 'weekly_xp' and 'weekly_xp_period_start' so they sync to users/{uid}.progress"
      contains: "'weekly_xp'"
    - path: "functions/src/reset_weekly_xp.ts"
      provides: "Implementation of resetWeeklyXp() — paginated batch update setting progress.weekly_xp = 0"
      exports: ["resetWeeklyXp"]
    - path: "functions/src/index.ts"
      provides: "resetWeeklyXpCron scheduled export, every Monday 00:00 UTC"
      contains: "resetWeeklyXpCron"
    - path: "functions/src/reset_weekly_xp.test.ts"
      provides: "Cloud Function unit test verifying weekly_xp zeroed but user_total_xp unchanged"
    - path: "tests/weekly_xp.test.ts"
      provides: "Client-side unit test verifying addWeeklyXp increments AsyncStorage and getCurrentWeekStartIso returns Monday"
  key_links:
    - from: "app/xp_manager.ts:registerXP (after AsyncStorage.setItem('user_total_xp', ...))"
      to: "app/weekly_xp.ts:addWeeklyXp"
      via: "await addWeeklyXp(finalDelta) when finalDelta > 0"
      pattern: "addWeeklyXp\\(finalDelta\\)"
    - from: "app/cloud_sync.ts:SYNC_KEYS"
      to: "Firestore: users/{canonicalUid}.progress.weekly_xp"
      via: "AsyncStorage key 'weekly_xp' added to SYNC_KEYS array (already-existing sync pipeline picks it up)"
      pattern: "'weekly_xp'"
    - from: "functions/src/index.ts"
      to: "functions.scheduler.onSchedule({ schedule: '0 0 * * 1', timeZone: 'UTC' })"
      via: "named export resetWeeklyXpCron — Monday 00:00 UTC cron expression"
      pattern: "resetWeeklyXpCron"
    - from: "functions/src/reset_weekly_xp.ts:resetWeeklyXp"
      to: "Firestore: users/* batch update progress.weekly_xp = 0"
      via: "paginated query + batch.update with FieldValue, NEVER touches progress.user_total_xp"
      pattern: "weekly_xp.*0|progress.weekly_xp"
---

<objective>
Добавить недельный XP трекинг (separate from total XP) и Cloud Function, сбрасывающую `progress.weekly_xp` каждый понедельник 00:00 UTC. Глобальный лидерборд (`leaderboard/{uid}`, `pushMyScore`, `syncLeaderboardCron`) НЕ ТРОГАТЬ — это отдельная подсистема.

Purpose: Friends Hall of Fame в Phase 3 будет иметь тогглер "Всё время / Эта неделя". `weekly_xp` — это источник данных для "Эта неделя".
Без weekly_xp + cron всё ломается на Phase 3.

Output:
- `app/weekly_xp.ts` — новый модуль (helper + period-start utility)
- `app/xp_manager.ts` — точечный патч: +1 await call после `setItem('user_total_xp', ...)`
- `app/cloud_sync.ts` — два ключа в `SYNC_KEYS`
- `functions/src/reset_weekly_xp.ts` — реализация cron
- `functions/src/index.ts` — регистрация cron в `firebase-functions/v2/scheduler`
- Tests: client (`tests/weekly_xp.test.ts`) + cloud function (`functions/src/reset_weekly_xp.test.ts`)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@CLAUDE.md
@app/xp_manager.ts
@app/cloud_sync.ts
@app/firestore_leaderboard.ts
@functions/src/index.ts
@functions/src/sync_leaderboard.ts

<interfaces>
<!-- Existing contracts the executor must honor unchanged -->

From app/xp_manager.ts:registerXP — POST-INSERT POINT (after these existing lines):
```typescript
// 3. Обновляем глобальный счетчик user_total_xp (XP никогда не уходит в минус)
const totalXPRaw = await AsyncStorage.getItem('user_total_xp');
const currentTotal = parseInt(totalXPRaw || '0');
const newTotal = Math.max(0, currentTotal + finalDelta);
await AsyncStorage.setItem('user_total_xp', String(newTotal));
// ↑ INSERT addWeeklyXp(finalDelta) call HERE, only when finalDelta > 0.
```

From app/cloud_sync.ts:SYNC_KEYS array (line ~20):
```typescript
const SYNC_KEYS = [
  'user_total_xp',
  'user_prev_xp',
  // ... existing keys ...
  // ↑ INSERT 'weekly_xp' and 'weekly_xp_period_start' alongside identity/progress block
];
```

From functions/src/index.ts (existing scheduled cron pattern — REFERENCE, lines 61-64):
```typescript
export const syncLeaderboardCron = functions.scheduler.onSchedule(
  { schedule: 'every 2 hours', timeZone: 'UTC' },
  async () => { await syncLeaderboardFromUsers(); }
);
// ↑ Use IDENTICAL pattern for resetWeeklyXpCron with schedule '0 0 * * 1' and timeZone 'UTC'.
```

From functions/src/sync_leaderboard.ts (PATTERN REFERENCE for batched user iteration — lines 13-94):
```typescript
// Use IDENTICAL pagination strategy: orderBy('__name__'), limit(200), batches of 400.
// DO NOT modify this file — only mirror its structure.
```
</interfaces>

<locked_decisions>
From .planning/STATE.md and CLAUDE.md (NON-NEGOTIABLE):
- D-04: NEVER modify `pushMyScore` external contract or anything in `firestore_leaderboard.ts`
- D-05: NEVER modify global `syncLeaderboardCron` or `functions/src/sync_leaderboard.ts`
- D-06: weekly_xp lives in `users/{uid}.progress.weekly_xp` only — never in `leaderboard/{uid}`
- D-07: Reset cron runs Monday 00:00 UTC (cron `0 0 * * 1`, timeZone `'UTC'`)
- D-08: All user-scoped writes go through `getCanonicalUserId()` chain (already enforced via existing `cloud_sync` pipeline)
</locked_decisions>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create weekly_xp client module + integrate into xp_manager + extend SYNC_KEYS</name>
  <files>app/weekly_xp.ts, app/xp_manager.ts, app/cloud_sync.ts, tests/weekly_xp.test.ts</files>

  <read_first>
    - app/weekly_xp.ts (verify it does not exist yet — fresh create)
    - app/xp_manager.ts (FULL READ — must understand registerXP flow, lock ordering, leaderboard call site lines 247-271)
    - app/cloud_sync.ts (READ lines 15-110 for SYNC_KEYS array shape and ordering convention)
    - app/firestore_leaderboard.ts (DO NOT MODIFY — read only to confirm pushMyScore signature stays unchanged)
    - tests/use_audio_guard.test.ts OR tests/club_boosts.test.ts (reference pattern for mocking AsyncStorage in client tests)
    - CLAUDE.md (per D-04: pushMyScore is INVIOLABLE; per project rules: no `console.log`)
  </read_first>

  <behavior>
    - Test 1: `getCurrentWeekStartIso(new Date('2026-05-04T12:00:00Z'))` returns `'2026-05-04'` (Monday at 12:00 → same Monday)
    - Test 2: `getCurrentWeekStartIso(new Date('2026-05-03T23:59:59Z'))` returns `'2026-04-27'` (Sunday → previous Monday)
    - Test 3: `getCurrentWeekStartIso(new Date('2026-05-05T00:00:00Z'))` returns `'2026-05-04'` (Tuesday → most recent Monday)
    - Test 4: `getCurrentWeekStartIso(new Date('2026-05-04T00:00:00Z'))` returns `'2026-05-04'` (Monday at 00:00 sharp)
    - Test 5: `addWeeklyXp(50)` when no prior weekly_xp exists → AsyncStorage `weekly_xp = '50'` AND `weekly_xp_period_start = currentWeekStartIso(now)`
    - Test 6: `addWeeklyXp(30)` when AsyncStorage has `weekly_xp='50'` and same period_start → AsyncStorage `weekly_xp = '80'`
    - Test 7: `addWeeklyXp(40)` when AsyncStorage has `weekly_xp='100'` but period_start is OLD week → AsyncStorage `weekly_xp = '40'` (reset on stale period)
    - Test 8: `addWeeklyXp(0)` and `addWeeklyXp(-5)` are no-ops (do not write)
    - Test 9: After Task changes, `app/xp_manager.ts` calls `addWeeklyXp(finalDelta)` exactly once per `registerXP` invocation when `finalDelta > 0`
    - Test 10: `app/cloud_sync.ts:SYNC_KEYS` includes both `'weekly_xp'` and `'weekly_xp_period_start'`
  </behavior>

  <action>
    **STEP A — Create `app/weekly_xp.ts`** with EXACTLY these exports:

    ```typescript
    import AsyncStorage from '@react-native-async-storage/async-storage';

    export const WEEKLY_XP_KEY = 'weekly_xp';
    export const WEEKLY_XP_PERIOD_START_KEY = 'weekly_xp_period_start';

    /**
     * Returns ISO date (YYYY-MM-DD) of the most recent Monday at 00:00 UTC.
     * Aligned with resetWeeklyXpCron (Monday 00:00 UTC) so client-side period_start
     * matches the server-side reset boundary exactly.
     *
     * Pure function — no side effects, no AsyncStorage. Trivially testable.
     */
    export function getCurrentWeekStartIso(now: Date = new Date()): string {
      // Day-of-week in UTC: 0=Sun..6=Sat. Convert to Mon=0..Sun=6.
      const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
      const daysSinceMonday = (utcDay + 6) % 7; // Mon→0, Tue→1, ..., Sun→6
      const monday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysSinceMonday,
      ));
      const yyyy = monday.getUTCFullYear();
      const mm = String(monday.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(monday.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    /**
     * Increment weekly XP counter in AsyncStorage. Mirrors XP-01 contract:
     * called from xp_manager.registerXP() right after user_total_xp is written.
     *
     * - delta <= 0 is a no-op (XP-01: only positive gains accumulate weekly).
     * - If stored period_start differs from current week, the counter resets
     *   (defensive: Cloud Function reset is the primary mechanism, but client-side
     *   self-heal protects offline-then-online scenarios where the cron ran while
     *   the device was offline and local cache is stale).
     * - Cloud sync via SYNC_KEYS picks up these keys → users/{uid}.progress.weekly_xp.
     */
    export async function addWeeklyXp(delta: number): Promise<void> {
      if (!delta || delta <= 0) return;
      const currentPeriod = getCurrentWeekStartIso();
      const [storedXpRaw, storedPeriodRaw] = await Promise.all([
        AsyncStorage.getItem(WEEKLY_XP_KEY),
        AsyncStorage.getItem(WEEKLY_XP_PERIOD_START_KEY),
      ]);
      const storedPeriod = storedPeriodRaw ?? '';
      const storedXp = parseInt(storedXpRaw ?? '0', 10) || 0;
      const newXp = (storedPeriod === currentPeriod) ? storedXp + delta : delta;
      await AsyncStorage.multiSet([
        [WEEKLY_XP_KEY, String(newXp)],
        [WEEKLY_XP_PERIOD_START_KEY, currentPeriod],
      ]);
    }

    /* expo-router route shim: keeps utility module from warning when discovered as route */
    export default function __RouteShim() { return null; }
    ```

    **STEP B — Patch `app/xp_manager.ts`**:
    1. Add import at top: `import { addWeeklyXp } from './weekly_xp';`
    2. Locate the existing block (line ~181-184):
       ```typescript
       const totalXPRaw = await AsyncStorage.getItem('user_total_xp');
       const currentTotal = parseInt(totalXPRaw || '0');
       const newTotal = Math.max(0, currentTotal + finalDelta);
       await AsyncStorage.setItem('user_total_xp', String(newTotal));
       ```
    3. IMMEDIATELY AFTER the `setItem('user_total_xp', ...)` line and BEFORE the existing `if (finalDelta > 0) { emitAppEvent('xp_changed'); }` block, insert:
       ```typescript
       // XP-01: Track weekly XP in lockstep with total XP. addWeeklyXp internally
       // ignores delta <= 0 and self-heals stale week period. Synced to Firestore
       // via SYNC_KEYS in cloud_sync.ts → users/{canonicalUid}.progress.weekly_xp.
       if (finalDelta > 0) {
         await addWeeklyXp(finalDelta);
       }
       ```
    4. DO NOT modify the existing `pushMyScore(...)` call (lines 260-270). DO NOT change any other line. DO NOT introduce `console.log`.

    **STEP C — Patch `app/cloud_sync.ts`**:
    Add `'weekly_xp'` and `'weekly_xp_period_start'` to the `SYNC_KEYS` array, in the "Идентичность и базовый прогресс" block (right after `'user_total_xp'` and `'user_prev_xp'` for visibility):
    ```typescript
    const SYNC_KEYS = [
      // ── Идентичность и базовый прогресс ────────────────────────────────────────
      'user_total_xp',
      'user_prev_xp',
      // XP-01: Weekly XP tracking — synced so users/{uid}.progress.weekly_xp matches device.
      'weekly_xp',
      'weekly_xp_period_start',
      'user_name',
      // ... rest unchanged
    ```

    **STEP D — Create `tests/weekly_xp.test.ts`** with all 10 behaviors. Mock AsyncStorage in-memory like `tests/stable_id.test.ts`. For test 9, just import `app/xp_manager.ts` — no execution needed; use grep on the file via `fs.readFileSync` to confirm the call exists. For test 10, similarly read `app/cloud_sync.ts` and assert both keys are present in the source.

    Constraints:
    - All exports typed (per `~/.claude/rules/typescript/coding-style.md`).
    - No `any` casts.
    - No `console.log`.
    - DO NOT modify `app/firestore_leaderboard.ts`. DO NOT modify `pushMyScore` arguments or call site.
    - DO NOT modify `functions/src/sync_leaderboard.ts`.
    - All Firestore writes MUST flow through the existing `cloud_sync` pipeline (no direct Firestore calls in `weekly_xp.ts`).
  </action>

  <verify>
    <automated>npm test -- --testPathPattern=weekly_xp</automated>
  </verify>

  <acceptance_criteria>
    - `app/weekly_xp.ts` exists with exports `WEEKLY_XP_KEY`, `WEEKLY_XP_PERIOD_START_KEY`, `getCurrentWeekStartIso`, `addWeeklyXp` (grep: each export present)
    - `app/weekly_xp.ts` does NOT import Firestore (grep: `firestore` returns 0 matches in `app/weekly_xp.ts`)
    - `app/xp_manager.ts` contains `import { addWeeklyXp } from './weekly_xp';` (grep: `from './weekly_xp'`)
    - `app/xp_manager.ts` contains `await addWeeklyXp(finalDelta)` (grep: `addWeeklyXp\\(finalDelta\\)`)
    - `app/xp_manager.ts` still contains the existing `pushMyScore(` call with the same 9-arg signature (grep: `pushMyScore\\(\\s*resolvedName,\\s*newTotal,\\s*weekPoints,` — call site unchanged)
    - `app/cloud_sync.ts` contains both `'weekly_xp'` and `'weekly_xp_period_start'` strings inside SYNC_KEYS (grep: both literals present)
    - `tests/weekly_xp.test.ts` exists with at least 10 `test(` or `it(` blocks (grep -c: >= 10)
    - `npm test -- --testPathPattern=weekly_xp` exits 0
    - `git diff app/firestore_leaderboard.ts` returns NO output (file untouched)
    - `git diff functions/src/sync_leaderboard.ts` returns NO output (file untouched)
    - `grep -n "console\\.log" app/weekly_xp.ts` returns 0 matches
  </acceptance_criteria>

  <done>
    `addWeeklyXp` is called from `registerXP` on every positive XP gain. `weekly_xp` and `weekly_xp_period_start` flow to Firestore via existing `cloud_sync` pipeline. `pushMyScore` and `firestore_leaderboard.ts` remain bit-for-bit identical. All client-side tests pass.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement resetWeeklyXp Cloud Function + scheduled cron + cloud function test</name>
  <files>functions/src/reset_weekly_xp.ts, functions/src/reset_weekly_xp.test.ts, functions/src/index.ts</files>

  <read_first>
    - functions/src/reset_weekly_xp.ts (verify it does not exist yet — fresh create)
    - functions/src/sync_leaderboard.ts (FULL READ — IDENTICAL pagination/batch pattern, lines 13-94)
    - functions/src/index.ts (READ lines 1-65 — see existing `syncLeaderboardCron` pattern; we extend with `resetWeeklyXpCron`)
    - functions/src/arena_scoring.test.ts OR functions/src/matchmaking.test.ts (reference: jest pattern for Cloud Functions, firebase-admin mocking)
    - functions/package.json (verify firebase-functions v2 scheduler API and that jest is configured)
    - CLAUDE.md (per D-05: do NOT modify sync_leaderboard.ts; per D-07: Monday 00:00 UTC)
  </read_first>

  <behavior>
    - Test 1: `resetWeeklyXp()` iterates all users in `users/*` and writes `progress.weekly_xp = 0` via batch
    - Test 2: `resetWeeklyXp()` does NOT modify `progress.user_total_xp` (assertion: original total xp unchanged after run)
    - Test 3: `resetWeeklyXp()` updates `progress.weekly_xp_period_start` to the current Monday ISO date (so client knows the new period started)
    - Test 4: `resetWeeklyXp()` paginates through > 200 users (test with 500 fake users — verify all are processed)
    - Test 5: `resetWeeklyXp()` skips users without a `progress` field (defensive — empty docs do not throw)
    - Test 6: `functions/src/index.ts` exports `resetWeeklyXpCron` as a scheduled function with cron expression `'0 0 * * 1'` (Monday 00:00) and `timeZone: 'UTC'`
  </behavior>

  <action>
    **STEP A — Create `functions/src/reset_weekly_xp.ts`**:

    ```typescript
    import * as admin from 'firebase-admin';

    /**
     * Returns ISO date (YYYY-MM-DD) of the most recent Monday 00:00 UTC.
     * Mirrors app/weekly_xp.ts:getCurrentWeekStartIso so client and server agree
     * on the boundary. (Cron fires Monday 00:00 UTC → Monday is 'now'.)
     */
    function getCurrentWeekStartIso(now: Date = new Date()): string {
      const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
      const daysSinceMonday = (utcDay + 6) % 7;
      const monday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysSinceMonday,
      ));
      const yyyy = monday.getUTCFullYear();
      const mm = String(monday.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(monday.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    /**
     * Resets progress.weekly_xp to 0 for ALL users. Does NOT touch
     * progress.user_total_xp — XP-04 inviolant: total xp survives the reset.
     *
     * Pagination: orderBy('__name__'), limit(200), batches of 400 (mirrors
     * functions/src/sync_leaderboard.ts pattern — proven for ~50k users).
     *
     * Side effect: also sets progress.weekly_xp_period_start to the current
     * Monday ISO date so clients see a fresh period without local recompute.
     */
    export async function resetWeeklyXp(): Promise<{ updated: number; skipped: number }> {
      const db = admin.firestore();
      const period = getCurrentWeekStartIso();
      const BATCH_SIZE = 400;
      const PAGE_SIZE = 200;
      let batch = db.batch();
      let updated = 0;
      let skipped = 0;
      let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        let query: FirebaseFirestore.Query = db.collection('users').orderBy('__name__').limit(PAGE_SIZE);
        if (lastDoc) query = query.startAfter(lastDoc);
        const snap = await query.get();
        if (snap.empty) break;
        lastDoc = snap.docs[snap.docs.length - 1];

        for (const doc of snap.docs) {
          const data = doc.data();
          // Defensive: docs without a progress field should not throw.
          if (!data || typeof data !== 'object') { skipped++; continue; }
          // Use dotted-path update to preserve existing progress fields.
          batch.set(doc.ref, {
            progress: {
              weekly_xp: '0',
              weekly_xp_period_start: period,
            },
          }, { merge: true });
          updated++;
          if (updated % BATCH_SIZE === 0) {
            await batch.commit();
            batch = db.batch();
          }
        }
      }

      if (updated % BATCH_SIZE !== 0) {
        await batch.commit();
      }

      console.log(`resetWeeklyXp: updated=${updated}, skipped=${skipped}, period=${period}`);
      return { updated, skipped };
    }
    ```

    **STEP B — Patch `functions/src/index.ts`** to register the cron:

    1. Add a `require` line in the same block as the other deferred requires (after line 11):
       ```typescript
       // eslint-disable-next-line @typescript-eslint/no-var-requires
       const { resetWeeklyXp } = require('./reset_weekly_xp');
       ```

    2. After the existing `syncLeaderboardCron` export (line 64), add:
       ```typescript
       // ─── Weekly XP reset cron (XP-02) ────────────────────────────────────────────
       // Runs every Monday 00:00 UTC. Zeroes progress.weekly_xp for ALL users without
       // touching progress.user_total_xp. Cron expression '0 0 * * 1' = at 00:00 on Monday.
       export const resetWeeklyXpCron = functions.scheduler.onSchedule(
         { schedule: '0 0 * * 1', timeZone: 'UTC' },
         async () => { await resetWeeklyXp(); }
       );
       ```

    DO NOT modify `syncLeaderboardCron` or any line of `functions/src/sync_leaderboard.ts`.

    **STEP C — Create `functions/src/reset_weekly_xp.test.ts`** mirroring the existing `functions/src/arena_scoring.test.ts` style. Use an in-memory mock for `admin.firestore()` returning a fake collection with seeded users.

    Sketch:
    ```typescript
    jest.mock('firebase-admin', () => {
      const docs = new Map<string, any>();
      const fakeBatch = () => {
        const ops: Array<() => void> = [];
        return {
          set: (ref: any, data: any) => { ops.push(() => Object.assign(docs.get(ref.id) ?? {}, deepMerge(docs.get(ref.id), data))); },
          commit: async () => { ops.forEach(op => op()); },
        };
      };
      // ... fake collection().orderBy().limit().startAfter().get() returning docs in pages of 200
      return {
        firestore: () => ({ collection: ..., batch: fakeBatch }),
      };
    });
    ```

    Verify Tests 1-5 by seeding 500 users with `progress.user_total_xp = '1000'` and `progress.weekly_xp = '50'`, running `resetWeeklyXp()`, then asserting:
    - All 500 docs now have `progress.weekly_xp = '0'`
    - All 500 docs still have `progress.user_total_xp = '1000'` (XP-04)
    - `progress.weekly_xp_period_start` is set to the current Monday ISO

    Verify Test 6 by reading `functions/src/index.ts` source via `fs.readFileSync` and asserting the strings `'resetWeeklyXpCron'`, `'0 0 * * 1'`, and `"timeZone: 'UTC'"` are all present.

    Constraints:
    - DO NOT modify `functions/src/sync_leaderboard.ts` (per D-05).
    - Use `firebase-functions/v2/scheduler` API (already imported in `index.ts` as `functions.scheduler.onSchedule`).
    - Cron must be `'0 0 * * 1'` literally (NOT `'every monday 00:00'`) — explicit cron is more portable across firebase-functions versions.
    - `timeZone` MUST be `'UTC'` (per D-07).
    - Per CLAUDE.md leaderboard inviolance: must NEVER write to `leaderboard/{uid}` from this function.
  </action>

  <verify>
    <automated>cd functions && npm test -- --testPathPattern=reset_weekly_xp</automated>
  </verify>

  <acceptance_criteria>
    - `functions/src/reset_weekly_xp.ts` exists with `export async function resetWeeklyXp` (grep: `export async function resetWeeklyXp`)
    - `functions/src/reset_weekly_xp.ts` contains pagination via `orderBy('__name__').limit(` (grep: `orderBy\\('__name__'\\)`)
    - `functions/src/reset_weekly_xp.ts` writes `progress.weekly_xp` (grep: `weekly_xp`)
    - `functions/src/reset_weekly_xp.ts` does NOT write `user_total_xp` (grep: `user_total_xp` returns 0 matches in this file)
    - `functions/src/reset_weekly_xp.ts` does NOT write to `leaderboard` collection (grep: `leaderboard` returns 0 matches in this file)
    - `functions/src/index.ts` contains `export const resetWeeklyXpCron` (grep: `export const resetWeeklyXpCron`)
    - `functions/src/index.ts` contains the literal string `'0 0 * * 1'` (grep: `0 0 \\* \\* 1`)
    - `functions/src/index.ts` contains `timeZone: 'UTC'` near `resetWeeklyXpCron` (grep: `timeZone: 'UTC'` — appears twice now: once for syncLeaderboard, once for reset)
    - `git diff functions/src/sync_leaderboard.ts` returns NO output (file untouched)
    - `functions/src/reset_weekly_xp.test.ts` contains at least 6 test blocks (grep -c `^(test|it)\\(` >= 6)
    - `cd functions && npm test -- --testPathPattern=reset_weekly_xp` exits 0
  </acceptance_criteria>

  <done>
    `resetWeeklyXpCron` registered to fire Monday 00:00 UTC. `resetWeeklyXp()` zeroes `progress.weekly_xp` for all users in batches without touching `progress.user_total_xp` or anything in `leaderboard/`. All cloud function tests pass. Existing `syncLeaderboardCron` unchanged.
  </done>
</task>

</tasks>

<verification>
Plan-level checks:
1. `npm test -- --testPathPattern=weekly_xp` (client) passes.
2. `cd functions && npm test -- --testPathPattern=reset_weekly_xp` (cloud) passes.
3. `git diff app/firestore_leaderboard.ts` and `git diff functions/src/sync_leaderboard.ts` both return empty (D-04, D-05 invariants).
4. Grep `pushMyScore\\(` in `app/xp_manager.ts` shows the same 9-arg call as before (D-04).
5. `cd functions && npm run build` succeeds (TypeScript compiles).
</verification>

<success_criteria>
- XP-01: `weekly_xp` field tracked in AsyncStorage and synced to Firestore via SYNC_KEYS. — VERIFIED via Tests 5-6 (Task 1) and grep.
- XP-02: `resetWeeklyXpCron` runs Monday 00:00 UTC. — VERIFIED via Test 6 (Task 2) and grep `'0 0 * * 1'`.
- XP-03: `weekly_xp_period_start` ISO date computed and stored. — VERIFIED via Tests 1-7 (Task 1) and Test 3 (Task 2).
- XP-04: `pushMyScore` and `firestore_leaderboard.ts` unchanged; `user_total_xp` survives reset. — VERIFIED via grep + Test 2 (Task 2).
- TEST-06: Cloud Function test verifies zeroing without touching total xp on 500 fake users. — VERIFIED via Tests 1-5 (Task 2).
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-friend-codes-data-model-security/01-foundation-friend-codes-data-model-security-02-SUMMARY.md` capturing: file paths modified, exact line numbers of inserts in `xp_manager.ts` and `cloud_sync.ts`, cron expression used, test counts, and confirmation that `firestore_leaderboard.ts` + `sync_leaderboard.ts` are bit-for-bit unchanged (`git diff` empty).
</output>
