# Task packet: single-flight the startup read of the notifications cache

Governance-ID: TG-C0268EF1B3B4
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: cold start I/O

## Outcome

fin7 traces showed the account-scoped notifications cache key read six times at startup (bell button, community tab dot and others each awaiting the owner before the in-memory copy exists). One read per owner now serves all concurrent callers, so the queue carries one call instead of six.

## Scope

In scope: app/user_notifications.ts readCachedUserNotifications (in-flight promise per owner) and a test.
Out of scope: user_settings (already has its boot read scope), cloud_migration_v1 (read after a network round trip, after the first frame), money journals.

## Architecture

Per-owner in-flight map, cleared when the read settles; result semantics (owner re-check, purge write, memory remember) unchanged.

## Security and privacy

None: same local cache, same owner scoping; the owner is re-checked after the read exactly as before.

## Technical debt

- Contain: the individual slow-call durations in the startup trace are one shared queue stall, not per-key slowness; fewer calls is the real lever.

## Verification

New test: five concurrent calls cause one storage read and equal results; type check; existing account cache suite green.

## Rollback

Revert the commit.
