# Task packet: defer flashcard pending-grant maintenance past the startup read burst

Governance-ID: TG-7C3E9A52B104
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: cold start I/O

## Outcome

The one-time sweep of the training pending-grant journal (getAllKeys plus per-record reads, measured up to 5.7 s on a weak phone) no longer competes with the first screens for the AsyncStorage queue: it starts a few seconds after the first frame instead of right after interactions.

## Scope

In scope: components/use_flashcard_training_grant_boot_maintenance.ts scheduling only (extra delay after runAfterInteractions).
Out of scope: the maintenance logic itself, the journal format, energy refunds.

## Architecture

No change; scheduling only. The sweep is local and idempotent, records live 24 h, so a few seconds of delay is invisible.

## Security and privacy

None.

## Technical debt

- Contain: still a full-key listing at boot; a future change can read through the storage snapshot.

## Verification

Cold-start trace shows the [STARTUP-READS] flashcard_pending_grants line later and no read burst under it during first screens; type check.

## Rollback

Revert the commit.
