# Task packet: тест уровня английского — бредовые и неоднозначные задания

Governance-ID: TG-E99BC77E5C28
Status: In progress
Owner: Learning V2 session; жалобы владельца через координатора 28.10

## Outcome

Тест уровня (`app/learning_v2_placement_v1.ts`) не показывает задания, бессмысленные на английском или в переводе, и задания, где
верны несколько вариантов (пример владельца: «they are going to pay» и «they are paying»). Таблица id → проблема → решение → новый текст.
Список id для Переводчика, структура для флага «Пожаловаться» (Дизайн), согласование состава с Входом.

## Scope

Тест уровня своего банка не имеет: берёт задания `context_gap_grammar` уроков 1–22 (factory_native). Контент курса пишет фабрика Codex
(`content/learning-v2-course/**`, `modules/learning-v2/content/factory_native/**` — не трогаю). Решение в моей зоне: стоп-лист id
заданий для теста в `app/learning_v2_placement_v1.ts` (eligible) + сторож-тест; правки самих заданий уроков — таблицей фабрике/Теории.

## Architecture

eligible() отбрасывает id из стоп-листа `LEARNING_V2_PLACEMENT_EXCLUDED_IDS_V1` (с причиной у каждого). Лог `[PLACEMENT] excluded`.

## Security and privacy

Нет данных.

## Technical debt

Сами задания уроков остаются, пока фабрика их не перепишет — стоп-лист убирает их только из теста уровня.

## Verification

Выгрузка всех кандидатов (tsx), разбор по каждому; сторож-тест на стоп-лист; тесты теста уровня; проверка типов.

## Rollback

Revert коммита.
