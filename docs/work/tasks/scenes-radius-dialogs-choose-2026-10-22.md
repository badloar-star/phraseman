# Task packet: scenes at 32 radius, full-bleed guard follows Peak, and «Диалоги»: choosing a dialog inside the scene (mockups)

Governance-ID: TG-D9066484C74E
Status: In progress
Owner: 3 · МАКЕТЫ (coordinator 22.10, ~13:05)
Related epic/enabler: TG-1669267668FC (scenes 46 %, scenes-compact.html variant 2); dialogs scene (DialogsSceneStage, 2 · ДИЗАЙН 8922e9ca5)

## Outcome

1. Before the Today and Peak commits (coordinator, from 2 · ДИЗАЙН and Ревизор): the Home and Today scenes end with a 32 radius like `.sc`
   in scenes-compact.html (they had 36; Peak and Dialogs already 32); the Today hero size 160 type-checks (TodayRings has the 160 size);
   tests/lessons_full_bleed_safe_area_contract follows the tab shell rename homeFullBleedPages → tabFullBleedPages that the Peak commit
   brings (green on HEAD and after the commit).
2. Main priority after those commits: docs/design/v2-app/dialogs-scene-choose.html — 3–4 variants of the «Диалоги» screen where the dialogs
   stay a SCENE (the language of Home, Today, Peak, Season) and choosing a dialog happens inside the scene as clearly as choosing an
   episode in «Уроки» (Season carousel of cards). Owner: «Диалоги остаются именно СЦЕНОЙ, но надо переделать эту сцену… чтобы было
   понятно, как выбирать — как выбирать уроки». Each variant shows 3 frames: choose → what I will see (partner, goals, voice) → started.
   Success: the coordinator can open one page in a browser and the owner picks a variant.

## Scope

In scope: components/home/v2/scene/HomeSceneStage.tsx and components/home/v2/today_scene/TodaySceneView.tsx (radius only),
tests/lessons_full_bleed_safe_area_contract.test.ts (one expected string), docs/design/v2-app/dialogs-scene-choose.html (new page on
kit.css like scenes-compact.html: phones 390×844, variant numbers, dark theme and a light switch).

Out of scope: application code of «Диалоги» (DialogsSceneStage, lists, data) — only the mockup; dialogs-redesign.html of 2 · ДИЗАЙН
(rejected by the owner, not edited); new data the app does not have — no stars, no durations (not in the dialog data).

## Architecture

No architecture change: two style numbers, one guard string, one static mockup page. The mockup uses real dialog data (4 themes ×
19 ranks = 76 dialogs, real titles, partners, goals, rank locks, the 30-replies limit without Plus) read from the app sources.

## Security and privacy

No data, permissions or services: style constants, a test string and a static design page. Partner names are the app's fictional characters.

## Technical debt

- Pay now: Home/Today radius 36 drifted from the mockup's 32 — fixed here.
- Accept temporarily: the mockup page is a design reference only; the chosen variant becomes a separate implementation task (owner of the
  choice: the owner via the coordinator).

## Verification

Types for the Today view and rings; tests: today_scene_*, home scene tests, lessons_full_bleed_safe_area_contract, safe_top_one_canvas_contract
(through the slot). Mockup: headless capture of every phone (dark and light), no horizontal overflow, scene ≤ 46 %, no status-bar band,
texts fit (no overlaps); page path and commit hash sent to the coordinator.

## Rollback

Revert the commits: the radius returns to 36, the guard string to homeFullBleedPages together with the Peak commit, the mockup page disappears.
