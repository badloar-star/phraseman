# Task packet: learning_v2_stars_ledger — 2 красных теста (устаревший фейк расписки)

Governance-ID: TG-179ECC6AD225
Status: Done — 18/18
Owner: Ядро; поручение координатора 03.10

## Outcome
Тесты «повтор занятия из outbox» и «повторное открытие» ждут already_applied, получают rejected/op_conflict: фейк tx.get возвращает расписку `{ seq: 7 }`, а журнал позже стал сверять расписку с операцией полностью (isSameOperationReceipt — защита от подмены opId). Правка только теста: существующая расписка берётся из реального первого прохода (как в проде).

## Scope
functions/src/learning_v2_stars_ledger.test.ts. Код журнала не меняется.

## Architecture / Security and privacy
Без изменений поведения сервера. Проверка opId-подмены остаётся.

## Technical debt
Нет.

## Verification
Файл 18/18; мутация: подменить delta в расписке → тест ловит op_conflict (существующие тесты stars_ledger).

## Rollback
git revert.
