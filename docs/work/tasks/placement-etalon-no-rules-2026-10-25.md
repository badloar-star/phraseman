# Task packet: эталон теста «Не хочу с начала» — старт без правил, без «ещё 2 вопроса» и точек попыток

Governance-ID: TG-86D5BD05D473
Status: In progress
Owner: 3 · МАКЕТЫ (заказ координатора 25.10, владелец «да хочу макет!»)
Related epic/enabler: замки владельца 25.10 bf3cabfd8 (старт без правил), d9182a2df (без плашки «Ещё 2 вопроса»); координатор: один вопрос на тему, стоп на первой ошибке

## Outcome

Эталон docs/design/v2-app/chapter-exam-season.html, раздел 6 совпадает со словом владельца 25.10: старт — только плитка, «Проверим, что ты уже знаешь», абзац и кнопки (без .rules); кадра «Ошибка → ещё 2» и плашки .extra нет; точек попыток .tries нет (один вопрос на тему); описание раздела — стоп на первой ошибке. Сверка не находит расхождения по старту и плашке.

## Scope

In scope: docs/design/v2-app/chapter-exam-season.html (раздел 6 и его CSS), docs/design/v2-app/approved-2026-10-21.lock.json (хэш пересчитан scripts/approved_2026_10_21_lock_update.mjs), этот пакет.

Out of scope: код теста — движок (PLACEMENT_TEST_EXTRA_QUESTIONS_V1) и точки PlacementTries остаются за Learning V2; разделы 1–5 эталона.

## Architecture

No architecture change: правка документа-эталона и хэша замка одобренных макетов (тест approved_2026_10_21_locked).

## Security and privacy

Данных нет: макет, сеть не используется.

## Technical debt

- Accept temporarily: в коде до правки Learning V2 остаются точки попыток и два доп. вопроса после ошибки — эталон уже без них; владелец — координатор/Learning V2, выход — их коммит.

## Verification

node --test tests/approved_2026_10_21_locked.test.mjs; снимок раздела 6 playwright, ошибок консоли 0; поиск .rules/.extra/.tries/tExtra в файле — пусто.

## Rollback

git revert коммита — эталон и хэш вернутся вместе.
