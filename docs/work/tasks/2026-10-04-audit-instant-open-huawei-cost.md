# Task packet: instant-open audit of all sections, Huawei server-recognition cost, PM-010 baseline evidence

Governance-ID: TG-55013851E841
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: owner rule "every section opens instantly"; PM-010

## Outcome

INBOX gets (1) a table of screens, what each waits for on entry and the cure, with small safe fixes applied in files that have no foreign uncommitted edits; (2) a server speech-recognition cost model for devices without Google services with measured inputs and clearly marked assumptions; (3) the PM-010 weak-device baseline report (evidence file, criterion A2 accepted).

## Scope

In scope: read-only audit by agents, INBOX notes, evidence file, small fixes found by the audit, registry block write for PM-010-A2.
Out of scope: reading production data without the owner's permission in chat, adding analytics events (privacy check first), tasks owned by other sessions.

## Architecture

None for the notes; any small fix keeps the screen contract and only changes the order of cache and network.

## Security and privacy

No personal data read. A future analytics event for recognizer availability would need the privacy policy check before release.

## Technical debt

- Contain: cost model uses assumptions where production counts are unavailable; the queries needed are listed so the numbers can be replaced.

## Verification

Prices copied from the provider pages named in the note; measurement numbers copied from the scratchpad logs; fixes covered by tests and type check.

## Rollback

Revert the commit.
