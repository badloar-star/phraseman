# Task packet: blitz deck picker opens from the cached list

Governance-ID: TG-8203D79486B5
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04), DQA finding
Related epic/enabler: owner rule "every section opens instantly"

## Outcome

The deck picker sheet inside the blitz screen draws the deck list from the in-memory snapshot or the disk snapshot on its first frame, while the fresh list loads in the background; only the very first open in the app's life (no snapshot anywhere) shows the placeholder. A [BLITZ-PICKER] line records the data source and the time to the first list.

## Scope

In scope: app/flashcards_blitz_session.tsx (hydrate the snapshot on mount, set options from the peek at open, background load replaces only when different), one source contract.
Out of scope: deck_options loading itself, the sheet layout, other training modes.

## Architecture

Reuses peekFcDeckOptions and hydrateFcDeckOptionsSnapshot from the deck options module (the hub already calls the hydration; a direct link into blitz skipped it). The existing load stays as the authority.

## Security and privacy

The snapshot is keyed by the account scope inside the deck options module, so one account never sees another's list; the log line holds counts and durations only.

## Technical debt

- Contain: the hydration call is repeated per mode screen; a shared entry hook would remove the duplication.

## Verification

Source contract for the order peek, disk snapshot, background load and the log tag; blitz suites and type check.

## Rollback

Revert the commit.
