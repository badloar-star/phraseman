# Заливка прогресса v2 и акцент статистики на accentGraphic (находка по кадру Главной «Аврора/1», светлая)

Governance-ID: TG-2E7A91C0B4D6
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (кадр Сверки `home_L1_light_v2`: полоса «0 / 50» на карточке продолжения урока остаётся бледно-мятной)

## Outcome
Полоса прогресса в v2-палитре (Главная, карточки продолжения, V2Kit) и акцент статистики (заливка/линия) берут `accentGraphic`: в светлых градиентных темах — глубже (≥3:1), в тёмном оформлении ровно прежний `accent`.

## Scope
`constants/v2StyleGlassVariant.ts` (поле `progressFill`), `constants/statsThemeChromeFromTokens.ts` (`statsAccentFromTokens`), два теста, закреплявшие старое значение: `tests/v2_palette_theme_levels.test.cjs`, `tests/theme_chrome_from_tokens.test.ts`. Экраны не трогаются.

## Architecture
Токен `accentGraphic` уже есть в `GlassTokens` (c62e8fc70); там, где `accent` и так виден, он равен `accent`, поэтому изменение видно только на светлых градиентных темах.

## Security and privacy
Только цвета.

## Technical debt
Сканер светлого акцента обходит только `app/` и `components/`, поэтому эти места в `constants/` он не видел; добавление `constants/` в его корни — отдельным шагом с пересчётом базовой линии.

## Verification
Оба теста при свободной памяти и слоте; проверка скриптом равенства `accentGraphic` и `accent` в тёмном уже есть в `accent_graphic_token`; пересъёмка кадра Главной «Аврора/1» светлая.

## Rollback
git revert.
