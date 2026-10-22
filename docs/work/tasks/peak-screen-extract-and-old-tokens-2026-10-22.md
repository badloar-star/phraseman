# Task packet: Peak screen under 400 lines by extraction; remove the old homeSceneTokens(accent)

Governance-ID: TG-3275FFA6A1D3
Status: In progress
Owner: 3 · МАКЕТЫ (coordinator conditions for Peak v2 3a/3b, 22.10)
Related epic/enabler: Peak v2 scene (c83690658, 735052c46, 4709384a8), Home scene tokens (a9d95506f, e3d1bdc36)

## Outcome

1. SpireHomeScreen stays at or below 400 lines by moving a real piece of the screen into its own component or hook (coordinator: do not inflate, extract), and the comment lines joined earlier to fit the limit are restored to their original form.
2. The old homeSceneTokens(accent) and its helpers are deleted in a separate commit once nothing calls them; if Today still calls it, the coordinator is told instead.
3. Confirmed for the coordinator: the scene pedestal and All participants use only the room the screen already reads (no new Firestore reads); foreign files (SpireStepResultMoment.tsx) untouched; community.tsx had no foreign changes.

## Scope

In scope: components/spire/SpireHomeScreen.tsx, a new component/hook file next to it, components/home/v2/scene/home_scene_tokens.ts and tests that use the old function.
Out of scope: Today and Dialogs screens (other sessions), Peak behaviour.

## Architecture

Pure extraction: the moved block keeps the same props, strings and testIDs; text guards that read SpireHomeScreen are checked before choosing the block. No behaviour change.

## Security and privacy

None.

## Technical debt

- Pay now: joined comment lines are restored; the dead old token function is removed.

## Verification

All tests that read SpireHomeScreen/SpireTower/SpireClimbDock/community/tabs layout through the slot; type check of the touched files; line count of the screen.

## Rollback

Revert the commits; behaviour is unchanged by design.
