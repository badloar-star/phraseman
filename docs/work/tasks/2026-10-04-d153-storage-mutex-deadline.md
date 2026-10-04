# Task packet: D153 — storage mutex deadline value and holder diagnostics

Governance-ID: TG-2500740B58E1
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: PM-215 bounded concurrency, D153 runtime contract of background work

## Outcome

The storage lock has one named deadline, STORAGE_LOCK_DEADLINE_MS = 13 s (worst measured hold 4 268 ms times three, never below 2 s). The deadline variant of the lock uses it by default, and any waiter that is still queued after it writes one [STORAGE-MUTEX] line with the holder tag and how long the holder has held the lock, instead of waiting in silence. Waiting itself is not cancelled for existing callers.

## Scope

In scope: app/storage_mutex.ts (constant, holder tracking, watchdog, default deadline), tests, the D153 entry and the PM-215 registry note (A3 numbers agreed by the coordinator).
Out of scope: changing the semantics of withStorageLock for its hundreds of callers, the foreground queue deadline (10 s, app_resume_policy).

## Architecture

The holder is recorded when the lock is granted (a short caller tag from the stack) and cleared on release; a per-waiter timer unref'd after the deadline only logs. withStorageLockDeadline keeps its contract and gains a default timeout and a richer log line on timeout.

## Security and privacy

The log line contains a source location tag and durations only; no user data, keys or values are written.

## Technical debt

- Contain: the holder tag comes from a stack frame and is minified in release builds; it is resolved with the source map like the cold-start callers tag.

## Verification

Unit tests with fake timers: a never-released holder makes a waiter log once with the holder tag; the deadline variant times out at the default and releases correctly; existing mutex suites stay green.

## Rollback

Revert the commit.
