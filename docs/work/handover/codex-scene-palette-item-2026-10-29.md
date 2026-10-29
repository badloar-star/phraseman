# Пункт для записки Codex: сцена 29.10 (сессия «4 · ТЕМЫ»)

Основная записка `codex-review-2026-10-28.md` сейчас правится другой сессией (в `git status` — изменена), поэтому пункт лежит отдельным файлом;
координатор/Ревизор переносит его в записку одной вставкой.

## Пункт: красный `tests/safe_top_one_canvas_contract.test.ts` из-за `components/packs/CommunityPackCheckScene.tsx`

Тест «режим „от края до края“ включён, строку статуса никто не красит» ищет в исходниках `<StatusBar … backgroundColor=… (не "transparent")>` или
`translucent={false}`. Сейчас находит один файл — `components/packs/CommunityPackCheckScene.tsx` (твой, незакоммиченный). Красным был и до сцены 29.10.
Что сделать: в `CommunityPackCheckScene.tsx` не красить `StatusBar` (`backgroundColor` убрать / `"transparent"`, `translucent` не выключать): зона часов — часть общего полотна экрана.
Не чинить тест и не расширять его допуски.

## Пункт: Пик (SpireScene / SpireScenePedestal) на `scenePalette`

Патч и порядок — `docs/work/handover/scene-approved-peak-and-dialogs-geometry-2026-10-29.md`, раздел 1. Делается после того, как ты закоммитишь свои правки в `SpireScene.tsx`,
`SpireScenePedestal.tsx`, `SpireHomeScreen.tsx` (чужие незакоммиченные правки я не трогаю). Источник цвета фона Пика — только `scenePalette(themeId, appearance, 'peak', W, H, { dp })`
из `components/scene/scene_palette.ts`; общий слой отрисовки — `components/scene/SceneBackdrop.tsx` (по готовому результату) или `SceneBackdropFill.tsx` (сам меряет область).
