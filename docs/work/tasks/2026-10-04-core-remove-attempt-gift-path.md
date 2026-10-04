# Task packet: remove the dead "attempt restore gift" path (D09 / D148)

Governance-ID: TG-038B4CA4785D
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: D09 (gifts removed), D148 (old gifts are not converted: removed without compensation)

## Outcome

When the three hearts run out, the screen restores them in exactly one way: the session runes are burned and the attempts come back. The gift branch (recoverWithGift, giftCount, gift rescue overlay, dev gift button) is gone from the hooks, the HUD and the screens. Nothing credits a gift any more (creditAttemptRestoreGiftFromSpin has no callers).

## Scope

Phase A (this packet): hooks/useSessionAttemptAutoReset.ts, hooks/useSessionAttempts.ts, components/session_attempts (HUD, gift overlay deleted), the screen wiring in the eight free screens, tests and gates that mention the gift. The inventoryTrusted flag stays under the clearer name hydrationTrusted (it still means: attempts state was read without failure, so runes are not burned on an unknown).
Phase B (not now): stored gift data, session_attempt_restore_inventory, phone-state economy bridge, cloud_sync: persisted user data, needs its own decision.
Two screens (lesson1, learning_v2_direct_session_player_v1) have foreign uncommitted edits: they are done last, after the edits are committed.

## Architecture

No architecture change: one branch of a decision tree is removed. The prepared-recovery replay at hydration stays (a recovery prepared by an older build must still complete).

## Security and privacy

No new data. Less client code touching the wallet: the gift consumption path (an economic operation) disappears from the UI.

## Technical debt

- Pay now: dead gift UI and wiring in ten screens.
- Contain: stored data and the economy bridge stay; they are listed for Phase B.

## Verification

Type check; the attempts hook and auto-reset tests rewritten for the single path; screen wiring gates updated; the remaining suites that touch attempts stay green.

## Rollback

Revert the commits; no stored data is touched.
