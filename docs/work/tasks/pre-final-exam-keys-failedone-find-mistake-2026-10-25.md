# Task packet: перед финалом 06:30 — ключи экзамена ×9, failedOne, строки «Найди ошибку» на решение владельца (Переводчик, 25.10)

Governance-ID: TG-90F1B1AA1233
Status: In progress
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Координатор 25.10, три пункта:
1. Проверить, что 8 ключей экзамена из 981cd8090 в `components/learning-v2/season/season_copy_card.ts` есть на 9 языках
   (вычитка и 3 правки — b25b4037c).
2. `failedOne` (не удалось удалить одну ошибку) — 9 языков, когда Learning V2 добавит ключ.
3. «Найди ошибку» — строки, подготовленные на решение владельца (ниже).

## «Найди ошибку» — строки на решение владельца

Заголовок типа задания Пика `promptOdd` в `components/spire/spire_game_strings.ts`. ВНИМАНИЕ: замена уже применена коммитом
c0029b09d по решению координатора 24.10 (19:5x, «вариант 2 … владельцу сообщу утром, откатывается одной строкой»).
Владелец выбирает одно из двух:

| язык | Было («Найди лишнее») | Сейчас в коде («Найди ошибку») |
|---|---|---|
| ru | Найди лишнее | Найди ошибку |
| uk | Знайди зайве | Знайди помилку |
| en | Find the odd one out | Find the mistake |
| es | Encuentra la intrusa | Encuentra el error |
| pt-BR | Encontre o intruso | Encontre o erro |
| vi | Tìm từ khác loại | Tìm lỗi sai |
| id | Temukan yang berbeda | Temukan kesalahan |
| tr | Farklı olanı bul | Hatayı bul |
| pl | Znajdź niepasujące | Znajdź błąd |

Почему «ошибку»: все задания этого типа проверяют грамматическую ошибку («Найдите фразу, которую нужно исправить»), а «лишнее»
зовёт искать по смыслу — на city/village (Сверка 24.10) человек искал лишнее слово.
Вернуть «Найди лишнее»: `git revert c0029b09d` (строка + пометка в `docs/design/v2-app/spire-gaps-states.html`).

## Scope

In scope: проверка ключей экзамена; `failedOne` в `app/mistake_clear_all_copy.ts` после появления ключа; этот документ.
Out of scope: откат c0029b09d без слова владельца.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Если владелец выберет «Найди лишнее» — нужен `git revert c0029b09d`, переводы обратно уже есть в истории.

## Verification

Скрипт подсчёта переводов по каждому ключу (нужно 9); сторожа экзамена; при `failedOne` — `informal_address_ru_uk_guard`.

## Rollback

`git revert <коммит>`.
