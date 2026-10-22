# Task packet: Peak whole-tower guard fix, then «Диалоги» scene-choice mockups page

Governance-ID: TG-2D8B43975B47
Status: In progress
Owner: 3 · МАКЕТЫ (coordinator 22.10; follow-up of TG-D9066484C74E)
Related epic/enabler: peak-full-tower-2026-10-22 (TG-D9066484C74E), scenes-radius-dialogs-choose-2026-10-22

## Outcome

1. The Peak whole-tower commit goes in green: the check failed on one guard of my own — «manual scroll up hides the rows below the coins»
   used the largest crown headroom (376 = TOP_PAD), where the window already shows the whole drawing and nothing can scroll (0 hidden rows
   is correct). The guard now scrolls a typical league (headroom 266) and separately asserts that at 376 there is nothing to scroll.
2. docs/design/v2-app/dialogs-scene-choose.html — the coordinator's main priority: «Диалоги» stay a scene, choosing a dialog inside the scene
   is as clear as choosing an episode in «Уроки»; 4 variants × 3 frames (choose → what I will see → started), phones 390×844, dark + light,
   real data only (76 dialogs, partners and their manner, goals, briefings, rank locks, 30 replies a month without Plus).
3. Reply to 2 · ДИЗАЙН: the Home scene radius is already 32 on HEAD (c1d6870a7).

## Scope

In scope: tests/spire_scene_layout.test.ts (one guard), docs/design/v2-app/dialogs-scene-choose.html (new static page on the scenes-compact
skeleton: fonts/, assets/Ionicons.ttf, assets/v2art).
Out of scope: application code of «Диалоги»; dialogs-redesign.html (2 · ДИЗАЙН, rejected); Home (committed).

## Architecture

No architecture change: a test expectation and a static design page. Mockup data is generated from content/dialogues-v2/authoring and
shared/generated/dialogue_v2_ui_copy.ru (no invented titles, partners, goals, stars or durations).

## Security and privacy

None: test code and a design page with the app's fictional characters; no data, permissions or services.

## Technical debt

- Pay now: the scroll guard matches the whole-tower geometry.
- Accept temporarily: partner pictures do not exist yet — the mockup uses the etalon's letter placeholder (owner of art: 4 · ТЕМЫ / owner).

## Verification

tests/spire_scene_layout.test.ts green through the slot (with the rest of the Peak guards); mockup: headless capture of every phone in both
themes, no overflow or overlaps, scene ≤ 392 dp, no status-bar band; path and commit hash sent to the coordinator.

## Rollback

Revert the commits.
