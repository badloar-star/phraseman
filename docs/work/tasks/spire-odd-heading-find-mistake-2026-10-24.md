# Task packet: заголовок задания Пика «Найди лишнее» → «Найди ошибку» ×9 (Переводчик, решение координатора 24.10)

Governance-ID: TG-09A718B3B10D
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

6 · СВЕРКА: задание find_oddity с вариантами про city/village неоднозначно — заголовок «Найди лишнее» обещает поиск по смыслу,
а все задания этого типа проверяют грамматику (шаблоны пулов «…с ошибкой согласования» / «…с грамматической ошибкой»).
Решение координатора: заголовок типа → «Найди ошибку» на 9 языках; запись в боевой пул и карантин не нужны.
ru «Найди ошибку», uk «Знайди помилку», en «Find the mistake», es «Encuentra el error», pt-BR «Encontre o erro»,
vi «Tìm lỗi sai», id «Temukan kesalahan», tr «Hatayı bul», pl «Znajdź błąd». Все короче прежних — места хватает.

## Scope

In scope: `promptOdd` в `components/spire/spire_game_strings.ts`; prompt tOdd и пометка в `docs/design/v2-app/spire-gaps-states.html`.
Out of scope: облачный пул заданий (разовое чтение, список координатору; правка данных — после релиза с владельцем).

## Architecture

No architecture change — только текст.

## Security and privacy

Не применимо.

## Technical debt

- Владельцу координатор сообщит утром: заголовок был в утверждённом макете; откат одной строкой.
- Задания с двумя или нулём ошибок в облачном пуле останутся до правки данных после релиза.

## Verification

Точечные сторожи строк Пика (spire_oddity_prompt и тесты, читающие spire_game_strings); разбор файла babel.

## Rollback

`git revert <коммит>`.
