# Task packet: roll back the optimistic unread marker when marking a video seen fails

Governance-ID: TG-C3D9A5BFFC8B
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: Optimistic UI protocol

## Outcome

Opening a video in the Lingman catalog already lowers the unread badge at once. If saving "seen" to storage fails, the badge now returns to its previous value and the reason is logged, instead of an unhandled rejection and a badge that silently disagrees with storage.

## Scope

In scope: openVideo in app/lingman_videos.tsx. The audit items "double player push" (this tree opens the player by local state, one id, so no double push exists) and "swipe memory write errors" (flush already logs its reason) and the explain sheet retry (gaveUp leads to the refresh button, D158) need no change.
Out of scope: the load-time markSeen calls that a source contract pins verbatim.

## Architecture

None; one catch with a restore of the previous unread count.

## Security and privacy

None.

## Technical debt

- Contain: the two load-time markSeen calls still have no catch; the contract test pins their exact text.

## Verification

Lingman suites green; type check.

## Rollback

Revert the commit.
