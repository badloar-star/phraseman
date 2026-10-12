# Токен accentTextSafe рядом с accentGraphic и коммит пары токенов (ответ Ядру)

Governance-ID: TG-3C68CED35FE7
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (ответ на предложение Ядра: два производных токена, в тёмном байт-в-байт accent)

## Outcome
В `GlassTokens` и `Theme` (через `makeLiquidGlassTheme`) есть два производных токена для потребителей аудита: `accentGraphic` (кольца, полосы, точки, кромки; accent, а где он слился бы со светлым фоном — глубже, ≥ 3:1) и `accentTextSafe` (текст и значки: в светлом `accentText`, в тёмном ровно `accent`). Тёмное оформление байт-в-байт прежнее. Пара токенов закоммичена, чтобы Ядро и Дизайн могли переводить на них экраны.

## Scope
`constants/liquidGlassThemePalette.ts` (токены и `makeLiquidGlassTheme`), `constants/theme.ts` (необязательные поля `Theme`), тест `tests/accent_graphic_token.test.ts`. Экраны и компоненты в этом шаге не меняются.

## Architecture
`accentGraphic = legibleOn(accent, text, поверхности, 3,2)`; `accentTextSafe = isLight ? accentText : accent`. В тёмном оба равны `accent`; в светлом `accentGraphic` равен `accent`, пока тот виден ≥ 3:1 на всех поверхностях.

## Security and privacy
Только цвета; данные не затрагиваются.

## Technical debt
Потребители (разделы аудита) переводятся отдельными коммитами; число мест в базовой линии сторожа уменьшается по мере перевода.

## Verification
`tests/accent_graphic_token.test.ts` (23 темы × 2 оформления × 5 уровней: графика ≥ 3:1, тёмный = accent, accentTextSafe = accent в тёмном), соседние контрастные тесты тем, срез типов по двум файлам констант. Тесты — по слоту светофора.

## Rollback
`git revert` коммита: токены исчезают, потребителей на них ещё нет.
