# Task packet: Peak v2 «Scene» in code, step 3a — scene components, flag, dev route

Governance-ID: TG-1C6198F6893A
Governance-ID: TG-2C6E6FBDA756
Status: In progress
Owner: 3 · МАКЕТЫ (request from 0 · КООРДИНАТОР, 22.10)
Related epic/enabler: peak-scene-v2.html (V2, locked 3ea39f80c), Home Scene tokens (homeSceneTokensForTheme)

## Outcome

The approved Peak V2 «pedestal in front of the tower» exists in code as standalone components under components/spire/scene: theme-token scene (always max level), the tower as the scene hero (SpireTower variant 'scene'), the 2-1-3 pedestal with coins on the blocks, own place line, «Все участники», five entry states with the etalon texts (9 languages, Peak is ru/uk). Flag SPIRE_SCENE_V2_ENABLED (dev on, release off). Dev route /dev_spire_scene_preview?state=day|search|eve|zero|off&theme=<id>&appearance=dark|light[&plus=1] for «Сверка», cut from the store bundle. Wiring into SpireHomeScreen is step 3b.

## Scope

In scope: components/spire/scene/* (strings, model, palette, podium, scene, preview fixtures), SpireTower variant prop, SpireClimbDock scene labels (playIn, searching) as optional props, useSpireScene dark constant, app/dev_spire_scene_preview.tsx, router.ctx.js store exclusion, tests/spire_scene_contract.test.ts.
Out of scope: SpireHomeScreen (3b), community header tint (3b), server/room logic, Moments files (foreign uncommitted SpireStepResultMoment.tsx).

## Architecture

Pure model (state by the etalon entry table: search → eve (< 6 h and promotion reachable) → zero (Free, energy 0) → day; offline is an overlay line) + presentational SpireScene fed with ready data. Colours: homeSceneTokensForTheme (max level). Fixed scene ink in spire_scene_palette.ts (scene is always dark). Type on the 16/13 scale (D145). No new reads.

## Security and privacy

None: presentation only; dev route has no network and is excluded from store builds.

## Technical debt

- Contain: scene backdrop duplicates HomeSceneStage's backdrop structure; exit = extract a shared SceneBackdrop when the Home stage is next touched.
- Contain: 3b wiring pending; flag off in release.

## Verification

Babel parse, targeted type check (slot), contract test (model, strings 9 languages, route guards), store route guard (node --test), typography and colour ratchets for new files.

## Rollback

Flag off by default in release; revert commits for the route and components; SpireTower/SpireClimbDock props are optional with unchanged defaults.
