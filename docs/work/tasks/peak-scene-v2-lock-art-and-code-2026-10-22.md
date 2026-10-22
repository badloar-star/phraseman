# Task packet: Peak v2 — lock V2 etalon, decide on the art brief, Peak v2 in code behind a flag + dev route

Governance-ID: TG-2C6E6FBDA756
Status: In progress
Owner: 3 · МАКЕТЫ (requests from 0 · КООРДИНАТОР, 22.10)
Related epic/enabler: Peak v2 mockup peak-scene-v2.html (02e6e51e3), Home «Scene» blocks (home_scene_tokens, HomeSceneView)

## Outcome

1. peak-scene-v2.html is an approved etalon: owner chose V2 «Пьедестал перед башней»; V1 and V3 stay on the page marked as rejected; file hash under the 21.10 lock.
2. The night art brief docs/work/PEAK_SCENE_ART_BRIEF_2026-10-22.md (26 pictures for variant A with a crown hero) gets a clear verdict for V2 (hero = tower from code): rewritten for V2 or marked cancelled, with reasons per state (no energy, no network, week results).
3. Peak v2 in the app behind SPIRE_SCENE_V2_ENABLED (dev on, release off), built from the Scene blocks (theme tokens, tower renderer, pedestal 2-1-3), plus dev route /dev_spire_scene_preview?state=day|search|eve|zero|off&theme=<id>&appearance=dark|light for «Сверка». Success: five entry states render like the etalon, release keeps the current Peak.

## Scope

In scope: docs/design/v2-app/peak-scene-v2.html (V1/V3 marked rejected), lock script + APPROVED note, the art brief file, new Peak scene components under components/spire (or the existing Peak folder), the flag, the dev route, a contract test.

Out of scope: server logic of rooms/weeks, energy rules, Peak data fetching (reuse what the screen already has), Home screen, other sessions' uncommitted Peak files (checked before editing; work around them).

## Architecture

Peak screen keeps its data sources; behind the flag the top part becomes a «Scene»: theme-token background (same formula as the Home Scene), the tower from the existing renderer without its plate/window, the weekly room as a 2-1-3 pedestal in front of the tower, my place line and «Все участники»; the «Играть» dock stays. Dev route renders the same view from fixtures. No new reads.

## Security and privacy

No new data, permissions or services. Dev route unreachable in store builds (Redirect), no network in fixtures. Privacy policy not affected.

## Technical debt

- Contain: flag off in release until the owner sees it on the emulator; exit = owner's word, then flip the flag.
- Accept temporarily: rejected V1/V3 stay in the etalon page for history (coordinator's request).

## Verification

Headless check of the regenerated page (phones, overflow, clashes, seams), lock guard test; for code: babel parse, targeted type check and unit/contract tests through the slot; route log for each state.

## Rollback

Flag off (default in release) hides the new Peak scene; revert commits for route and components; lock revert by reverting the lock commit.
