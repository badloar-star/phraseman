# Светлые или тёмные значки строки состояния по яркости сцены (функция для 3 · МАКЕТЫ)

Governance-ID: TG-6441D17BA3B0
Governance-ID: TG-95EBBBABC563
Governance-ID: TG-9BC66921F5AA

## Outcome
Координатор 24.10: 3 · МАКЕТЫ сделали Р2 (useLightStatusBar — всегда light-content, пока сцена под часами). Сцена Диалогов в светлых темах светлая — там нужны тёмные значки. Дать Макетам чистую функцию `statusBarIconsOnScene(sceneTop): 'light' | 'dark'` и тест по 23 темам × 2 оформлениям; встраивают они сами в свой хук.

## Scope
In scope: `components/v2/scene_status_bar_icons.ts`, `tests/scene_status_bar_icons.test.ts`.
Out of scope: `hooks/use_scene_status_bar.ts`, `app/(tabs)/_layout.tsx`, экраны сцен (файлы Макетов и Дизайна).

## Architecture
Порог яркости тот же, что у круга «назад» на сцене (`back_on_scene.ts`, 0,18): тёмная сцена — светлые значки, светлая — тёмные. Выбирается вариант с большим контрастом белого/чёрного к верху сцены; тест требует контраст значков к сцене ≥ 3 для верха Главной, Диалогов и Сезона во всех темах.

## Security and privacy
Данных не касается.

## Technical debt
Долга не добавляется.

## Verification
Тест: Главная/Диалоги/Сезон × 23 темы × 2 оформления — выбранные значки ≥ 3 к верху сцены; тёмная сцена → 'light', светлая → 'dark'.

## Rollback
Удалить функцию и тест.
