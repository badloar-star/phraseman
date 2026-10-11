# Текст на акценте по теме и типы ленивой кривой

Governance-ID: TG-82B26C7451EE

## Outcome
В светлой теме каталога наборов зелёный текст на чёрной заливке (бейдж «Топ», пилюли «Новые»/«Топ», «+») читается: цвет берётся из токена темы. Пять ошибок типов от ленивой кривой и ref закрыты.

## Scope
`app/flashcards/FlashcardsCategoryHub.tsx`, `app/flashcards_packs.tsx`, `app/community_packs/CommunityPackSocialBar.tsx`, `app/flashcards/CollectionListView.tsx`, `app/flashcards/DeckSelectionTile.tsx` (замена `t.correctText` на `t.textOnGold`), `components/KitTouchable.tsx` (forwardRef), `components/modal_fx/HybridSheetShell.tsx`, `components/referral_sheet_shell.tsx` (тип кривой), сторож `tests/two_theme_static_colors_contract.test.ts`, pin-хэши двух тестов Карточек, RNTL-тест ref.

## Architecture
`textOnGold` в `makeLiquidGlassTheme` равен `accentInk` темы: текст на акценте всегда в паре с акцентом. `correctText` остаётся для заливки `t.correct` (зелёной). Остальные файлы с `correctText` (около 30) не трогал: нужно проверять, на какой заливке стоит текст.

## Security and privacy
Данные не затрагиваются.

## Technical debt
В остальных файлах `t.correctText` может стоять на `t.accent` — тот же дефект в светлой теме; найдёт Сверка или следующий проход (список по поиску `correctText`).

## Verification
Сторож two_theme (40 тестов), kit_touchable (4), pin-тесты Карточек, полная проверка типов — 0 ошибок; 28 наборов тестов оболочек зелёные.

## Rollback
Откатить коммит.
