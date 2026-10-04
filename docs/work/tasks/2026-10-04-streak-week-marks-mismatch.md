# Task packet: week circles on "Твои результаты" disagree with the streak counter

Governance-ID: TG-7CA8F708192A
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04), complaint "streak hangs for 11 days"
Related epic/enabler: streak display consistency

## Outcome

With streak N and the last counted day known, the last min(N,7) days ending at that day are marked in the week row, whatever the foreground-time journal says. The week and its "today" are computed on the device's local calendar day, like the streak counter, not on the UTC day. A [STREAK-WEEK] log line shows the inputs (streak counter, last counted day, local and UTC day, offset, per-day time and mark) so the real device case can be read from logs.

## Scope

In scope: modules/stats_activity_rows.ts (marks and local today), app/statsCache.ts (read last_active_date, log), app/streak_stats.tsx buildLearningCoachMetrics (local today and week dates), a test.
Out of scope: streak counting itself (streak_service / streak_safety), freeze date keys.

## Architecture

The week marks were derived only from foreground time per UTC day (60 s threshold) while the counter uses the local last_active_date. The fix unions both evidence sources instead of replacing the time-based one.

## Security and privacy

None: local values only.

## Technical debt

- Contain: the foreground-time journal is still keyed by UTC day; days far from the streak are still time-based.

## Verification

New test: streak N with the last counted day today or yesterday marks min(N,7) days; stale last day marks nothing; existing activity-row probes green.

## Rollback

Revert the commit.
