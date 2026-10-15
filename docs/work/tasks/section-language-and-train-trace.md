# Task packet: язык раздела (доводки) и трасса [NAV-PAINT-TRACE] перехода «Тренировать → первый кадр хаба»

Governance-ID: TG-C88B906582F4
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: реестр релиза `release-ledger-2026-10-15.md` — R60, R70; замечания Ревизора по `2d06352db`.

## Outcome

(1) Сброс языка раздела «Карточки» при пустом снимке языка из Настроек не молчит: причина `snapshot_null` в журнале `[SECTION-LANG]`, язык уточняется из хранилища.
(2) Переход с экрана ролика / «Моих наборов» на хаб Карточек (≈6,9 с до кадра) получает временную трассу `[NAV-PAINT-TRACE]`: отметки с мс от тапа — navigate, blur/unmount ролика и плеера, mount и первый render хаба, прогрев колод, runAfterInteractions, onLayout.

## Scope

In scope: `app/flashcards/pack_language_preferences.ts`, новый `app/train_nav_trace.ts`, отметки в `app/lingman_video_watch.tsx`, `app/flashcards_my_packs.tsx`, `app/flashcards/FlashcardsHubScreen.tsx`, `components/youtube/YoutubeInlinePlayer.tsx`, тесты.
Out of scope: исправление самой задержки — по фактам из трассы отдельным коммитом.

## Architecture

Трасса — модульный счётчик (старт по тапу, отметки только 20 с после него), без setState и ре-рендеров, `console.warn` (production вырезает `console.log`). Сброс языка: ленивое чтение хранилища только в ветке пустого снимка.

## Security and privacy

Данные не собираются и не передаются; в журнал идут метки и миллисекунды, без идентификаторов пользователя.

## Technical debt

Трасса временная: после починки задержки отметки убрать, логи ранних выходов оставить.

## Verification

Тест `section_language_snapshot_null`; прогон затронутых наборов тестов и сторожа i18n зоны (метки на английском); трассу снимают Макеты на эмуляторе.

## Rollback

`git revert` коммита.
