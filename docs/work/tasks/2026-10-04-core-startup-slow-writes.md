# Task packet: slow startup writes (stats_daily_breakdown, app_messages_cache) off the first-frame path

Governance-ID: TG-0AA4B7F3C1D2
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: PM-220 cold start, finding from the fin2/fin3/fin4 measurements (writes of 2.9-3.2 s on the cold start)

## Outcome

The two largest writes of the cold start stop happening when nothing changed: stats reconcile writes only a changed merge result, the app-messages cache writes only a changed snapshot. Success: the writes disappear from the [COLD-START-IO] top list on an unchanged start; no behaviour change when data changed.

## Scope

In scope: app/stats_daily_breakdown.ts (reconcileStatsDailyBreakdownWithCloud), app/app_messages.ts (readCachedSnapshot, writeCachedSnapshot); tests.
Out of scope: the write queue itself, other startup writers.

## Architecture

Skip-if-unchanged: compare the serialised result with the stored raw (read through the storage snapshot) before writing. A write that is skipped is identical to a write that changes nothing, so readers see the same data.

## Security and privacy

No new data, no new keys.

## Technical debt

- Pay now: pointless rewrites of unchanged cache data on every start.
- Contain: other startup writers are listed in the INBOX after the next measurement.

## Verification

Unit tests for both skip and write paths; existing app_messages and stats suites; type check; cold-start measurement.

## Rollback

Revert the commit.

Governance-ID: TG-0AA4B7F3C1D2
(см. выше; пакет для медленных записей. Лог [WORD-AUDIO] для заикания озвучки слов — тот же пакет.)

Governance-ID: TG-BB975BB1E9BB
(2026-10-04: трасса холодного старта пишет операции дольше 1,5 с отдельной строкой; rollback = git revert.)
