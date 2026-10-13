# opaqueControl в тёмном — нейтральный и нейтральная плитка значка режима (продолжение 4801981d8)

Governance-ID: TG-DA0CFA22F029
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (решение координатора: «ДА на следующий шаг, окно 07:00 через safe_commit»)

## Outcome
В тёмном оформлении при любой теме: (1) `opaqueControl` (поле ввода и кнопка «Отмена» в диалогах, пилюли, подложки значков) — нейтральный `#34343A` вместо тонированного (у «Авроры» было `#2B3839` — зелёное «на сером» внутри нейтральных окон); (2) плитка значка режима тренировки (`iconTileColors`) — нейтральный градиент вместо градиента цвета темы (зелёный→фиолетовый у «Авроры»). Образец стиля «Тень» (cards-v2 №27, плитки `.tile` плоские нейтральные) это подтверждает. Светлое оформление не меняется.

## Scope
`constants/liquidGlassThemePalette.ts` (расширение `withNeutralDarkSheet` полем `opaqueControl`), `components/mistakes-panel/panelPaint.ts` (`iconTileColors`), тесты: `tests/neutral_dark_opaque_sheet.test.ts` (проверка control), `tests/theme_intensity_slider.test.ts` (`opaqueControl` в производных токенах), новая проверка плитки; запись в журнал. Файлы Дизайна и Авторизации кодом не трогаются: они получают нейтраль через токен.

## Architecture
Тот же приём, что `withNeutralDarkSheet`: после `buildThemeTokens` в тёмном подменяются `opaqueSheet` и `opaqueControl`, а все производные (плашки, контраст текста) считаются от них. `iconTileColors` возвращает нейтральную пару в тёмном и прежнюю цветную в светлом (`g.isLight`).

## Security and privacy
Только цвет; данных нет.

## Technical debt
Подложка и поле/кнопки внутри окон теперь нейтральны; `PaywallPlus` и оболочка шторок (`HybridSheetShell`, Г3) по-прежнему тонируются акцентом — зона Дизайна.

## Verification
До коммита зелёные: `accent_graphic_token`, `theme_sheet_plate_lighter`, `theme_muted_text_aa`, `theme_non_text_contrast`, `theme_contrast_report`, `two_theme_new_screens_contrast`, `theme_accent_text_contrast`, `neutral_dark_opaque_sheet`, `shadow_sheet_plates`, `theme_intensity_slider` и все тесты, читающие `opaqueControl` (по слоту, один процесс). После коммита — Сверке «после»: окно удаления (поле/«Отмена») и cards-v2-027.

## Rollback
git revert коммита.
