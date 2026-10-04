# Task packet: remove the dead screen app/learning-v2/lesson/[id].tsx

Governance-ID: TG-D749E07FF314
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator §129 (Design session verification of 04.10)
Related epic/enabler: PM-220 launch closure (sync-mode router bundles every route), PhraseMan 2.0 simplification

## Outcome

The 1704-line legacy Learning V2 lesson route is removed. Nothing navigates to it (Design's grep over app, components, modules, hooks, constants, scripts, app.json and the native intent file; repeated here with git grep); the course opens through the Lessons tab and app/learning-v2/session/[id].tsx. The launch bundle shrinks and ten source guards that read the file follow what remains.

## Scope

In scope: delete the screen; drop the backdrop branch in components/appArtBackdropRegistry.ts; update every guard that reads the file by meaning (not by blind removal); the stale comment in constants/devRoutes.ts; the listed path in the content-factory plan test.
Out of scope: app/learning-v2/session/[id].tsx and the course list; audio assets under assets/audio/learning-v2/lesson1.

## Architecture

No architecture change: a leaf route with no importers goes away. Deep links phraseman://learning-v2/lesson/<id> now resolve to the router not-found route; no in-app link produces them.

## Security and privacy

No data change. A removed route reduces the reachable surface.

## Technical debt

- Pay now: dead 1.7k-line screen kept alive by guards and the launch bundle.
- Contain: guards that protected behaviour of the removed screen are re-pointed at the screen that still owns that behaviour, or removed with the reason written.

## Verification

git grep shows no references; every touched guard green; type check; export bundle still builds; route count drops by one.

## Rollback

Revert the commit (the screen is restored byte for byte).

Governance-ID: TG-77C3A255C0D7
Governance-ID: TG-960FA5E9D55C
