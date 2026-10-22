# Task packet: лента истории «Сегодня» — вычитка 9 языков (Переводчик → 4 · ТЕМЫ)

Governance-ID: TG-678F34E723E2
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Файл `components/home/v2/today_activity_history_copy.ts` (11b7e2e34). Месяцы, формат даты и «N из M» верны на всех
9 языках (ru «мая» в родительном, vi «{день} thg {месяц}», tr «2 / 3»).

Исправлена озвучка дня `todayHistoryDayA11y` — порядок слов звучал как «завершён: 2 из 3»:
- es «completado 2 de 3» → **«2 de 3 completados»**;
- pt-BR «concluído 2 de 3» → **«2 de 3 concluídos»**;
- tr «tamamlandı 2 / 3» → **«2 / 3 tamamlandı»** (глагол в конце).

Верно без правок: ru, uk, en, vi, id, pl.

## Scope

In scope: три строки текста. Out of scope: логика, вёрстка, ru.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync` файла; поиск тестов со старыми строками — нет.

## Rollback

`git revert <коммит>`.
