# Строка состояния над сценой — по яркости верха сцены (Р2, продолжение)

Governance-ID: TG-EE182356C991

## Outcome
Координатор 24.10 (замечание 4 · ТЕМЫ к Р2 462683435): хук ставил светлые значки всегда, а верх сцены в части тем может быть светлым.
4 · ТЕМЫ дали чистую функцию sceneStatusBarStyle(sceneTop) (components/v2/scene_status_bar_icons.ts, тест по 23 темам × 2 оформления,
порог как у круга «назад»). Хук берёт стиль из неё.

## Scope
hooks/use_scene_status_bar.ts (параметр sceneTop, стиль входа), app/(tabs)/_layout.tsx (Главная — верх сцены), TodaySceneView.tsx
(«Сегодня» — tokens.sceneTop), мой тест. Функцию Тем не трогаю. Обложка Сезона — без цвета (градиент главы), светлые значки как прежде.

## Architecture
useSceneStatusBar(tag, on, why, sceneTop) → pushStackEntry({ barStyle: sceneTop ? sceneStatusBarStyle(sceneTop) : 'light-content' }).
Смена стиля — снять старый вход, поставить новый.

## Security and privacy
Нет данных.

## Technical debt
Нет.

## Verification
Срез типов, тесты хука, «Сегодня», оболочки вкладок, тест Тем.

## Rollback
git revert коммита.
