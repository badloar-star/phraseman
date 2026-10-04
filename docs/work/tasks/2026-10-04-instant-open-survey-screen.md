# Task packet: survey screen opens without a full-screen spinner

Governance-ID: TG-68E08DDA3473
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: owner rule "every section opens instantly"

## Outcome

The survey route no longer shows a full-screen spinner while it confirms the account: when the in-memory stable id already matches the route scope, the screen is verified in the first render, and the canonical check still runs in the background and closes the route on a mismatch.

## Scope

In scope: app/survey_screen.tsx identity check ordering, one source contract test.
Out of scope: survey content, the handoff, other screens from the audit (listed in INBOX for assignment).

## Architecture

Initial state is computed synchronously from the stable id peek; the existing asynchronous canonical check is kept as the authority and can downgrade to rejected.

## Security and privacy

None: same checks, only the order changes; a mismatch still rejects the route.

## Technical debt

- Contain: the rest of the instant-open audit table is handed out in INBOX.

## Verification

Source contract for the sync-first path and the background authority check; type check.

## Rollback

Revert the commit.
