# Task packet: PM-214 — comments sheet never spins forever

Governance-ID: TG-2500740B58E1
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: PM-214 loading states (A2: real errors are not hidden by an endless skeleton)

## Outcome

If the comments feed does not answer within 8 s (offline or slow), the sheet stops spinning, says it could not load and offers a retry; a late answer is still merged when it arrives. The registry note named this sheet as having no deadline.

## Scope

In scope: app/community_packs/PackCommentsSheet.tsx (deadline, error line with retry), one source contract.
Out of scope: the blitz screen deadline (separate row), the Firestore fetch itself.

## Architecture

Promise.race between the existing fetch and a timer; the original fetch keeps running and is applied through the same code path when it resolves, so merge and write-permission logic are unchanged.

## Security and privacy

No new data is read or stored: the sheet still reads the same comment feed under the same account checks, and only the waiting behaviour changes.

## Technical debt

- Contain: the retry only re-runs the sheet effect; a shared deadline helper for other sheets is not introduced here.

## Verification

Source contract; type check; pack comment suites.

## Rollback

Revert the commit.
