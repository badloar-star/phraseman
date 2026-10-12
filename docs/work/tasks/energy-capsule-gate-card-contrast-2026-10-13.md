# Контраст капсулы энергии и карточки языкового гейта Диалогов (23 темы × 2 оформления × 5 уровней)

Governance-ID: TG-F4EEF78A1808
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (просьба координатора по ночным элементам Дизайна 7b252fa06 и d63f0b90e)

## Outcome
Тест `two_theme_new_screens_contrast` проверяет читаемость цифры и значка энергии на капсуле (opaqueControl) и карточки гейта (заголовок, текст, значок, кнопка «К урокам →») во всех темах; провал, если найдётся, чинится токенами.

## Scope
`tests/two_theme_new_screens_contrast.test.ts` (новые случаи); при провале — `constants/liquidGlassThemePalette.ts`. Экраны не трогаются.

## Architecture
Цвета берутся ровно как в `EnergyBar` (lg.text / lg.accentText / lg.bad на lg.opaqueControl) и `DialogueV2HubLanguageGate` + `DialogueGlassCta` (plateFillFrom, text/secondary, accentInk на accent или text на opaqueControl).

## Security and privacy
Только цвета.

## Technical debt
Новых долгов нет; тест повторяет цвета экранов вручную, поэтому при смене цветов капсулы или карточки гейта случаи нужно обновить вместе с экраном.

## Verification
Точечный прогон файла теста при слоте светофора и свободной памяти.

## Rollback
git revert.
