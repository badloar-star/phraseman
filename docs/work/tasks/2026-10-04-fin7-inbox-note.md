# Task packet: fin7 cold-start measurement note in INBOX

Governance-ID: TG-8D86EDD82C7B
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: cold start I/O

## Outcome

INBOX records the fin7 numbers (first frame and storage calls after the day's changes, weak profile) so the next session can compare.

## Scope

In scope: one appended section in docs/phraseman-2.0/INBOX_COORDINATOR_FROM_CORE.md.
Out of scope: any code.

## Architecture

None. Documentation only.

## Security and privacy

None.

## Technical debt

- Contain: first frame still about 7-11 s on the weak emulator profile; that is emulator memory pressure, not the app on a real phone.

## Verification

Numbers copied from the measurement logs in the session scratchpad.

## Rollback

Revert the commit.
