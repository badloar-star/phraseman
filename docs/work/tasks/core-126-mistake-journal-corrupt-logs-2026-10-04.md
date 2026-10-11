# Task packet: §126 п.5 — «Мои ошибки» не открываются: логи на каждую проверку целостности журнала

Governance-ID: TG-94EA8E61CB15
Status: Logs first (no behaviour change)
Owner: Ядро

## Outcome
Каждая из 8 проверок в loadMistakeEventJournalFresh (корень, цикл страниц, нет страницы, битый JSON страницы, хеш/версия/область страницы, нет куска/хеш куска, число событий) при отказе пишет [MISTAKE-JOURNAL] corrupt с причиной и числами (eventCount, страниц, кусков, источник чтения: снапшот или хранилище) и бросает ту же ошибку. Поведение не меняется.

## Scope
app/mistake_practice_store.ts (только логи). Гипотеза для проверки по логам: §122 (d91542b60) перевёл чтение на снапшот — устаревшая страница/кусок дал бы hash/missing.

## Architecture
Один помощник corruptJournal(reason, detail) рядом с чтением; без новых чтений хранилища.

## Security and privacy
В логе нет содержимого ошибок пользователя — только причины, счётчики и префиксы хешей (8 знаков).

## Technical debt
Восстановление журнала после повреждения (карантин + пустой журнал) — отдельной правкой после диагноза по логам.

## Verification
Тесты журнала ошибок (store, cloud merge, account isolation, session resume), typecheck.

## Rollback
Откат коммита.
