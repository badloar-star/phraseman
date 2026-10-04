# Task packet: explanation sheet draws cached text on its first frame

Governance-ID: TG-6343950A7A99
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: owner rule "every section opens instantly"

## Outcome

When the learner presses the explain button, the explanation already stored on disk is moved into the in-memory result cache during the touch and the sheet-open animation, so the sheet opens with the text and no skeleton flash. Network behaviour is unchanged.

## Scope

In scope: app/explain_phrase_client.ts (read helper), app/explain_phrase_request.ts (prefill), components/ExplainButton.tsx (call on touch and on open), a source contract.
Out of scope: the sheet layout and the server call.

## Architecture

The sheet's request hook already reuses a ready in-memory result before any state change; the prefill only fills that cache earlier from the local disk cache using the same request key.

## Security and privacy

None: local cache only.

## Technical debt

- Contain: if the disk read is slower than the sheet mount, behaviour is the old one (skeleton, then text).

## Verification

Source contract; type check; explanation suites.

## Rollback

Revert the commit.
