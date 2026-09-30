# Task packet: Account V2 — клиентский пакет синхронизации, ремонт №2

Governance-ID: TG-CF3E51F11C41
Status: In progress
Owner: Claude session (Account V2, /loop)

## Outcome

Закрыть SPEC HOLD повторного ревью (SECURITY APPROVE):
- P1: при сбитых и затем исправленных часах несинхронизированные операции безвозвратно уходили в `sync_operation_expired`. Решение: хранить в pending ещё и местное время постановки; истекать только если ОБЕ оценки возраста (местная и с поправкой на сервер) > 170 сут; иначе лог и операция живая. Карантин `sync_operation_expired` сделать возвратным через requeue (сервер ответит duplicate при повторе, TTL 180 > 170). Тест «смещение +56 лет, затем часы исправлены → ничего не истекло».
- P2: перевыпуск SRS учитывает и подтверждённые более поздние правки той же сущности (номер больше), и считается ВНУТРИ транзакции markResolved (планировщик передаётся функцией).
- P3: firstFailureAtMs = min(firstFailureAtMs, serverNow); пауза в памяти зажата тем же пределом (25 ч); учёт неудач привязан к голове очереди, а не к batchId; незаписанный учёт в памяти не перезаписывает паузу requeue; `sync_receipt_invalid_exhausted` — тоже возвратный; несогласованная запись индекса unresolved удаляется с логом, а не роняет listUnresolved; шапка functions/src/accounts_v2_adapter/callable.ts (только комментарий) — «И ≥5, И ≥24 ч, карантин возвратный (requeue)»; немые catch в records/runner_ports/effects — лог причины (кодом, без данных).

## Scope

In scope: modules/account-session-v2/account_sync*.ts, tests/account_sync*_v2.test.ts, functions/src/accounts_v2_envelope_parity.test.ts, functions/src/accounts_v2_adapter/errors.ts (+тест) при необходимости синхронизации контракта, комментарий шапки functions/src/accounts_v2_adapter/callable.ts. Out of scope: подключение к app, деплой, commit.

## Architecture

Без изменения модели; устойчивость к переводу часов, возвратные карантины.

## Security and privacy

Без новых данных; логи кодами.

## Technical debt

Accept temporarily: UI карантина/конфликтов — Пакет 6.

## Verification

RED→GREEN; все tests/account_sync*_v2; functions src/accounts_v2_; строгая проверка типов; eslint; мутации; повторное ревью.

## Rollback

Копия `.tmp_client_sync_backup3/`.
