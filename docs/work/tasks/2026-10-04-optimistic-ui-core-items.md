# Task packet: Optimistic UI items handed over by Core (mistake hide/undo, streak freeze, stats refresh key)

Governance-ID: TG-7CA8F708192A
Status: In progress
Owner: Claude session «App Check» (82577f25), by Core and coordinator (2026-10-04)
Related epic/enabler: Optimistic UI protocol

## Outcome

Confirmed on HEAD 40a9f7ddf and fixed: (1) hiding or restoring a mistake no longer fails silently (rejection logged, error toast); (2) the streak freeze button reacts at once, is guarded against repeated taps and rolls back with a toast on failure; (3) the stats refresh de-duplication is keyed by study target so a refresh for one target is never returned to a caller asking for another.

## Scope

In scope: app/mistake_practice_session.tsx hide/undo handlers, app/streak_stats.tsx handleFreezeStreak, app/statsCache.ts refreshStatsCache; small contract tests.
Out of scope: paywall locks and the saved limit guard (Core), account switch (AccountV2), the streak day logic of section 137.

## Architecture

No change. In-flight promises become a per-target map; the freeze handler gets a ref latch and local state first; hide/undo keep their write order and gain a catch.

## Security and privacy

None.

## Technical debt

- Contain: hide/undo still wait for their storage writes before showing the undo banner; a fully optimistic version would need the event-sourcing order reworked.

## Verification

Related suites and the PM-229 ratchet; type check of touched files.

## Rollback

Revert the commit.
