# Тёмное поле/кнопка шторок чуть светлее: opaqueControl #34343A → #3A3A40 (согласовано координатором 13.10)

Governance-ID: TG-26F9B5B1CF06
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0»

## Outcome
В тёмном оформлении нейтральный тон поля ввода и кнопки «Отмена» в шторках и окнах становится `#3A3A40` вместо `#34343A`: контраст к подложке `#28282E` растёт с ≈1,19 до ≈1,30, поля и кнопки лучше отделяются от подложки. Цвет по-прежнему нейтральный и одинаковый у всех тем и уровней; светлое оформление не меняется.

## Scope
Одна константа `SHADOW_CONTROL_NEUTRAL_DARK` в `constants/liquidGlassThemePalette.ts` и сторож `tests/neutral_dark_opaque_sheet.test.ts`. Плитка значка режима (`iconTileColors`) и фон «глины» в `themed_art_clay_accent_contrast` — отдельные значения, не трогаются.

## Architecture
Все потребители читают `opaqueControl` из `liquidGlassTokens` через `withNeutralDarkSheet`; одна точка правки. Проверены тесты на контраст и плиты: accent_graphic_token, theme_sheet_plate_lighter, shadow_sheet_plates/paint, theme_intensity_slider и др. (295 зелёных).

## Security and privacy
Только цвет; данных и разрешений не касается.

## Technical debt
Значение подобрано по замеру координатора; возможный второй шаг — токен «поле» отдельно от «кнопка».

## Verification
Точечный прогон девяти тестов (295 проверок). Сверке — кадры шторок/окон в тёмном оформлении.

## Rollback
git revert коммита (возврат `#34343A`).
