# Г1, Г2 и Г5 разбора diff: нейтральная подложка и плашки шторок «Тень» (тёмное) и общий токен включённого переключателя

Governance-ID: TG-56982EE0ADDD
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (решение координатора по разбору 249bad18d: Г1 да, окно :30, только тёмное; Г5 да, общий токен `switchOnTone`)

## Outcome
0. (вариант (а) координатора, добавлено 13.10) `opaqueSheet` в ТЁМНОМ оформлении = нейтральный `#28282E` при любой теме: одна правка токенов (`withNeutralDarkSheet` в `constants/liquidGlassThemePalette.ts`), светлое не тронуто; ~35 потребителей подложки получают нейтраль без правки их кода. Сторож `tests/neutral_dark_opaque_sheet.test.ts`; в `tests/theme_intensity_slider.test.ts` `opaqueSheet` добавлен в производные токены; в `tests/flashcards_deck_picker_liquid_glass_source_contract.test.mjs` — заглушка нового импорта.
1. Плашки и плитки внутри нижних шторок «Мои ошибки» (`PanelKit.SheetRow`) и «Режим тренировки» (`FlashcardsTrainingModeSheet`) в тёмном оформлении нейтральны при любой теме (≈ образец (60,60,68)→(48,48,56)), а не окрашены тоном темы.
2. В `components/settings/switch_chrome.ts` появляется токен `switchOnTone(glass)`: дорожка включённого переключателя — цвет акцента темы, бегунок — тёмная «чернильная» подпись акцента (как `.gs-sw.on` образца settings-gaps-states). Замену трёх копий `LocalSwitch` делает Авторизация в окно :00 по хэшу этого коммита.

## Scope
Файлы: `components/v2/shadow_sheet_paint.ts` (функция плашек шторки), `components/mistakes-panel/PanelKit.tsx` (одна строка в SheetRow), `app/flashcards/FlashcardsTrainingModeSheet.tsx` (одна строка у плиток), `components/settings/switch_chrome.ts` (новая функция), два новых теста. Сторож `theme_sheet_plate_lighter` не менялся и остаётся зелёным. Файлы настроек и приватности (`LocalSwitch`) не трогаю.

## Architecture
Плашки: `shadowSheetPlateTokens(g)` — в тёмном возвращает копию токенов с `plateFillFrom/To`, смешанными от нейтральной базы шторки (`#28282E`/`#1E1E24`) с белым 9,5 % / 7,5 %; в светлом — прежние `sheetPlateTokens`. Кэш по объекту токенов. Переключатель: `switchOnTone` берёт `accentGraphic` (в тёмном равен `accent`, в светлом проверен на контраст) и `accentInk`.

## Security and privacy
Только цвет; данных нет.

## Technical debt
Заливка подложек остальных шторок и центральных диалогов остаётся от `opaqueSheet` (Г2, после R1). `switchOnTone` пока не подключён к экранам: подключение — у Авторизации (privacy_settings) и Дизайна.

## Verification
Новые тесты `tests/shadow_sheet_plates.test.ts` и `tests/switch_on_tone.test.ts`, сторожа `theme_sheet_plate_lighter`, `shadow_sheet_paint` и `light_accent_graphics_ratchet` по слоту; пересъёмка mistakes-panel-021 и cards-v2-027 Сверкой.

## Rollback
git revert коммита.
