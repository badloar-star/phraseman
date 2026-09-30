# Task packet: Learning V2 map back button no longer reopens the just-closed session

Governance-ID: TG-D893125003D2
Status: Planned
Owner: Claude session (feature/referral-roulette)
Related epic/enabler: none

## Outcome

On the Learning V2 lesson map, pressing the back button after a session was
opened and closed currently reopens that same session instead of leaving the
map. After the fix, back always leaves the map/course screen normally,
regardless of whether a session was opened and closed earlier in the visit.
Success measure: manual repro (map → open session → close/finish session →
press back on map/course) lands outside Learning V2, not back inside the
session screen.

## Scope

In scope: `app/learning-v2/session/[id].tsx` — the three exit points that call
`router.replace("/learning-v2/course")` (the X/close button, the intro's
`onBack`, and the completion ceremony's "back to map" button). Each is missing
the `markNextNavigationAsReplace()` call that the shared back-stack tracker
(`app/navigation_back.ts`) requires before a same-section `replace`, so the
just-left session entry stays in the tracked stack and becomes the "back"
target from the next screen.

Out of scope: any other screen's navigation-back wiring, the `navigation_back.ts`
tracker logic itself (a well-established, already-used pattern elsewhere), and
unrelated Learning V2 behavior.

## Architecture

Current boundary: `app/navigation_back.ts` keeps its own shadow stack of
navigation entries (`rememberNavigationPath`, called from `_layout.tsx` on every
route change) so that `safeRouterBack`/hardware Back can compute a safe target
independent of the native history. When a screen intentionally leaves via
`router.replace(...)` to a screen in the *same* navigation section, the tracker
by default still **pushes** a new entry (matching the push semantics of the
underlying router.replace-into-same-section case), unless the leaving screen
calls `markNextNavigationAsReplace()` first — which tells the tracker to pop the
current entry before pushing the new one, so the replaced screen doesn't linger
as a valid "back" target. This exact pattern is already used by ~20 other
session/flow screens (lesson1.tsx, flashcards_*_session.tsx, mistake_practice_session.tsx,
personal_plan*.tsx, etc.).

Intended boundary: same mechanism, applied to the three missing call sites in
`app/learning-v2/session/[id].tsx`. No change to `navigation_back.ts` itself.

No architecture change beyond adding the missing calls — this brings the
Learning V2 session screen in line with the established convention.

## Security and privacy

No auth, authorization, secrets, or personal-data impact. Pure client-side
navigation-history bookkeeping.

## Technical debt

Pay now: this is the direct fix, not a workaround. No new debt introduced.

## Verification

- Manual: open a Learning V2 lesson map → open a session → close it via the X
  button → press back from the resulting course/map screen → confirm it does
  not reopen the closed session.
- Repeat for: finishing a session via the completion ceremony's "back to map"
  button, and backing out of the session during the intro (before practice
  starts).
- No automated test added (pure navigation-stack bookkeeping fix matching an
  existing, already-tested pattern used by many other screens); rely on manual
  verification above.

## Rollback

Revert the three `markNextNavigationAsReplace()` call additions in
`app/learning-v2/session/[id].tsx`. No data migrations, no entitlements
involved.
