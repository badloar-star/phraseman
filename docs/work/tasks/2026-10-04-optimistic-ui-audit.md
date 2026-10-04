# Task packet: Optimistic UI audit of today's screens and small fixes

Governance-ID: TG-0ED4BDA1E4DB
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: Optimistic UI protocol

## Outcome

A table in INBOX shows, for each screen touched today (mistake practice, statistics, training setup, saved/my packs, swipe, Plus paywall, explanation sheets, video, account switch), whether the response is instant, rolls back on error, guards double taps and avoids full-screen spinners. Small safe gaps are fixed in files that have no foreign uncommitted edits: Saved card delete (double-tap race and stale rollback).

## Scope

In scope: INBOX table; app/flashcards/useCollectionData.ts deleteCardById guard and rollback; a source contract for it.
Out of scope: files with other sessions' uncommitted edits (settings.tsx, auth_provider.ts, mistake_practice_session.tsx, paywall_purchase.ts) which are reported in the table only.

## Architecture

No change. A per-id in-flight set and a targeted rollback inside the existing handler.

## Security and privacy

None.

## Technical debt

- Contain: remaining gaps are listed in the INBOX table with file:line and the smallest fix.

## Verification

Related saved-collection contracts and type check green.

## Rollback

Revert the commit.
