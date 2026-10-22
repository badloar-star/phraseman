# Task packet: Scene colours always from the «Максимум» theme level (owner 22.10)

Governance-ID: TG-2153CFC85DC7
Status: In progress
Owner: 3 · МАКЕТЫ (owner's decision via 0 · КООРДИНАТОР, 22.10: «Сцена всегда как в макете»)
Related epic/enabler: homeSceneThemeTokens (a9d95506f), locked etalon home-scene-states.html (f2e478486)

## Outcome

The Home «Scene» is drawn with theme tokens of level 'max' at any slider position, exactly like the approved etalon; the slider changes only the rest of the background and the cards. Dialogs (2 · ДИЗАЙН) and Today (4 · ТЕМЫ) are told to take the same source.

## Scope

In scope: components/home/v2/scene/home_scene_tokens.ts (one entry point homeSceneTokensForTheme), the hook in HomeScene.tsx, tests/home_scene_theme_tokens.test.ts (scene at «Спокойно» = scene at «Максимум»).
Out of scope: Dialogs and Today code (other sessions), theme system, slider.

## Architecture

homeSceneTokensForTheme(themeId, appearance, evening) = homeSceneThemeTokens over liquidGlassTokens(themeId, { level: 'max', appearance }); the Home hook and the dev route use it. The active slider variant is not read by the scene anymore.

## Security and privacy

None: colours only.

## Technical debt

None new; Dialogs/Today migration is handed over with a concrete entry point.

## Verification

Node-only test run (tsx) of the 23-theme guard incl. the new «calm = max» case; babel parse; the heavy suite later through the slot when memory allows.

## Rollback

Revert the commit: the scene follows the slider again.
