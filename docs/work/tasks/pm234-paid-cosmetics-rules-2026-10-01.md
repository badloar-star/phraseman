# Task packet: PM-234 — правила для оплаченной косметики/бустов (сводка решений)

Governance-ID: TG-0AE4918142EE
Status: Done
Owner: Claude session (Account V2 → очередь координатора)

## Outcome

Закрыть критерии PM-234 (A1: жемчуг 1:10 не заменяет компенсацию всех покупок; A2: grandfathering/refund/альтернатива согласованы) evidence-документом `docs/phraseman-2.0/evidence/PM-234_paid_cosmetics_boosts_rules.md`, сводящим уже принятые решения владельца (D70/D84/D101–D103/D107/D108/D124/D136–D140) по каждой категории реестра PM-233.

## Scope

Только новый evidence-файл и строка в CLAIMS.md. Out of scope: код, данные, новые решения.

## Architecture

Таблица «категория → судьба → решения» поверх реестра PM-233.

## Security and privacy

Без данных пользователей.

## Technical debt

Accept temporarily: статусы задач в реестре (tasks.json) меняет координатор — здесь только evidence и CLAIMS.

## Verification

Каждая строка ссылается на существующее решение в 03_DECISIONS.md; сверка с реестром PM-233.

## Rollback

Удалить файл.
