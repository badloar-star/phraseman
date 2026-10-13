# Task packet: ночная проверка на регрессии (коммиты кода с 12.10 22:00)

Governance-ID: TG-18DE7F7A12A3
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10)

## Outcome

docs/phraseman-2.0/NIGHT_REGRESSION_2026-10-13.md: изменённые за ночь файлы app/ components/ modules/ hooks/ constants/ → покрывающие
тесты (по импорту или чтению исходника) → прогон группами по 5–8 файлов, jest --runInBand (одна нить) только при свободной памяти ≥ 2 ГБ →
группа зелёная/красная → для красной: коммит и зона. Чужое не чинить; красное — сразу координатору.

## Scope

In scope: сопоставление и прогон (scratchpad), отчёт. Out of scope: правки кода.

## Architecture

Скрипт ожидания памяти + светофор на каждую группу; лог каждой группы отдельно.

## Security and privacy

Только чтение и тесты.

## Technical debt

- Contain: нет.

## Verification

Счётчики PASS/FAIL по каждой группе, причина красного по коду и blame.

## Rollback

Удалить отчёт.
