# Task packet: guard the deferred grant sweep with a test; clear stale staged set; fin7 startup measurement

Governance-ID: TG-4DF08963C319
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: cold start I/O

## Outcome

The 4 s deferral of the training pending-grant sweep is locked by a test: it does not start early, is cancelled on unmount and never runs twice for one account generation. The start of a training does not depend on the sweep (prepare and reconcile go through the journal under the shared storage lock, and orphan cleanup runs inside the same lock, so it cannot delete a manifest that prepare is writing). The shared git index no longer holds a stale gift-removal set. A cold-start measurement (calls, first frame, 8 starts, weak profile) after today's changes is added to the INBOX.

## Scope

In scope: one new rntl test plus its entry in the rntl config; git index cleanup by path (working files untouched); fin7 measurement on the emulator with the standard cleanup; an INBOX note.
Out of scope: the sweep logic, the journal format, Core's staged dialogue-memory set (left for Core).

## Architecture

No change. Test only; the sweep keeps its single-flight (per-generation Set in the hook, per-account lifecycle queue and storage lock in the journal).

## Security and privacy

None.

## Technical debt

- Contain: the sweep still lists all storage keys once per boot.

## Verification

New test green, type check of touched files, fin7 numbers recorded, git diff --cached shows only Core's set.

## Rollback

Revert the commit.
