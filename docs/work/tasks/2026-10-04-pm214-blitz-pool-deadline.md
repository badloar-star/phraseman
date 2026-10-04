# Task packet: PM-214 — blitz shows "try again" when the card pool never loads

Governance-ID: TG-2500740B58E1
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: PM-214 A2 (no endless skeleton), D158 pattern (deadline plus retry)

## Outcome

If the blitz screen is still waiting for its card pool after the idle watchdog (20 s without a new step), it now shows the same "could not open your training data, try again" panel it already uses for a stuck energy check, and the retry button restarts the pool load. Before, only the energy check could reach that panel and a hanging pool read left the skeleton forever.

## Scope

In scope: app/flashcards_blitz_session.tsx (watchdog branch, retry bumps a pool reload revision), one source contract.
Out of scope: the energy and grant logic, other training modes (Speaking already has its own watchdog).

## Architecture

The pool effect gets a revision in its dependencies; its existing cancelled flag discards the abandoned run. The watchdog reuses the quotaUnavailable panel.

## Security and privacy

No data is added or changed; the screen reads the same local card lists as before.

## Technical debt

- Contain: the panel text speaks about training data in general; a pool-specific message is not introduced.

## Verification

Source contract for the watchdog branch and the retry wiring; blitz behaviour suites and type check stay green.

## Rollback

Revert the commit.
