# Task packet: тон тостов-сообщений Карточек и число ошибок в превью итога (Макеты, разбор diff 13.10)

Governance-ID: TG-4BD6EB39684B
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по разбору MACETS_DIFF_TRIAGE_R1_2026-10-13.md

## Outcome

1. cards-082: тост «Видео сейчас не открывается» — тон info («Сообщение»), а не error («Что-то пошло не так»), в трёх местах: строка набора, герой набора, экран набора из видео.
2. cards-072: тост «Набор сохранён на устройстве, публикация не завершена» — тон info; настоящие ошибки сохранения остаются error.
3. cards-v2-051/052: превью итога Карточек (`dev_state`-ссылка `next=/dev_cards_result_preview?state=good|grow`) отдаёт 8 и 14 ошибок вместо двух, число в «Ошибки N» совпадает со списком.

## Scope

In scope: `app/flashcards/VideoPackRow.tsx`, `PackVideoHero.tsx`, `VideoSetView.tsx` (одна строка в каждом), `app/community_pack_create.tsx` (одна строка), `app/flashcards/dev_cards_result_fixture.ts`, сторожа тона и счётчика.

Out of scope: чипы A1/A2/B1 и чип языка каталога (образец к коду, решение Макетов), счётчик «4/3» своих наборов (решение владельца), аватары-монеты в откликах, превью новой карточки — отдельные пункты.

## Architecture

Тон тоста задаёт первый аргумент `actionToastTri('info' | 'error', …)`; тексты и логика не меняются. Фикстура превью — чистый модуль без React: список ошибок режется по числу неверных ответов, ids различны.

## Security and privacy

Данных не касается. Превью работает только в dev-сборке.

## Technical debt

Contain: слова-ошибки превью (Boarding pass, Luggage и т.д.) — тема «Путешествия» как у макета; переводы на русский в фикстуре, не интерфейс.

## Verification

Точечные прогоны `tests/info_toast_tone_cards_contract.test.ts`, `tests/dev_cards_result_fixture_counts.test.ts` и `tests/aa_r1_switches_cards_friends.test.ts` через test:one под светофором.

## Rollback

git revert коммита.
