---
plan: 02
phase: 01-foundation-friend-codes-data-model-security
status: complete
completed: 2026-05-04
commit: 620e4ab
---

## Summary

Added weekly XP tracking (AsyncStorage + Firestore sync) and Cloud Function cron that resets weekly_xp every Monday 00:00 UTC. Global leaderboard and pushMyScore untouched.

## Files Modified / Created

- `app/weekly_xp.ts` — NEW: addWeeklyXp(), getCurrentWeekStartIso(), WEEKLY_XP_KEY, WEEKLY_XP_PERIOD_START_KEY
- `app/xp_manager.ts` — PATCHED: import addWeeklyXp + call after setItem('user_total_xp', ...) when finalDelta > 0 (lines 20, 189-191)
- `app/cloud_sync.ts` — PATCHED: 'weekly_xp' and 'weekly_xp_period_start' added to SYNC_KEYS (lines 27-29)
- `functions/src/reset_weekly_xp.ts` — NEW: resetWeeklyXp() — paginated batch update (PAGE_SIZE=200, BATCH_SIZE=400)
- `functions/src/index.ts` — PATCHED: export resetWeeklyXpCron schedule '0 0 * * 1' timeZone UTC (lines 13, 71-74)
- `tests/weekly_xp.test.ts` — NEW: 11 tests (4 pure + 4 addWeeklyXp + 2 source-grep integration checks)
- `functions/src/reset_weekly_xp.test.ts` — NEW: 6 tests (500-user pagination, total XP preservation, period_start update)

## Invariants Verified

- pushMyScore call signature unchanged — grep: `pushMyScore(resolvedName, newTotal, weekPoints,` (XP-04/D-04)
- firestore_leaderboard.ts untouched — git diff empty
- functions/src/sync_leaderboard.ts untouched — git diff empty
- weekly_xp writes NEVER touch leaderboard/{uid} — grep clean
- reset function NEVER writes user_total_xp — grep clean (only in comments)
- Cron expression literal '0 0 * * 1', timeZone: 'UTC' (D-07)

## Test Results

```
PASS tests/weekly_xp.test.ts
Tests: 11 passed, 11 total

functions/ $ npx jest reset_weekly_xp
Tests: 6 passed, 6 total
```
