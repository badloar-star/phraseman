# Task packet: strict ready gate - nothing is reported done without an emulator snapshot next to the mockup

Governance-ID: TG-60EEC6129FD2
Status: In progress
Owner: App Check session (Claude), lane 3 (parity gate scripts)
Related epic/enabler: owner 04.10: strictly forbidden to say done until the owner gets a side-by-side comparison of every screen with the mockup

## Outcome

A script gate that answers one question before any readiness message: for each given parity row, does a real emulator snapshot exist, is its hash recorded, and is it newer than the last change of the screen code. Without it the message must not be sent. Success: the gate fails for the hub today and passes only after a fresh snapshot is recorded.

## Scope

In scope: scripts/port_ready_gate.mjs, its test, docs/phraseman-2.0/PORT_READY_GATE.md, code mapping of the hub parity rows. Out of scope: the release parity gate itself, application code.

## Architecture

Standalone read-only script over docs/phraseman-2.0/registries/visual_parity.json; reuses the evidence fields (evidence, evidence_at, evidence_sha256, code) the release gate already defines; no network.

## Security and privacy

No data or services. No privacy impact.

## Technical debt

Contain: the release gate stays the final authority; this gate only stops premature readiness claims.

## Verification

Run the new test; run the script for the hub rows and expect a failure listing the missing evidence.

## Rollback

Delete the script, test and doc.
