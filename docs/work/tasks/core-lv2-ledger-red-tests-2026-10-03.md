# Task packet: learning_v2_stars_ledger — 2 красных теста (устаревший фейк расписки)

Governance-ID: TG-179ECC6AD225
Governance-ID: TG-3EB6CB827EB4
Status: Done — 18/18
Owner: Ядро; поручение координатора 03.10

## Outcome
Тесты «повтор занятия из outbox» и «повторное открытие» ждут already_applied, получают rejected/op_conflict: фейк tx.get возвращает расписку `{ seq: 7 }`, а журнал позже стал сверять расписку с операцией полностью (isSameOperationReceipt — защита от подмены opId). Правка только теста: существующая расписка берётся из реального первого прохода (как в проде).

## Scope
functions/src/learning_v2_stars_ledger.test.ts. Код журнала не меняется.

## Architecture
Только тестовый фейк: расписка «уже проведённой» операции = реальная расписка первого прохода.

## Security and privacy
Поведение сервера не меняется; проверка подмены opId (isSameOperationReceipt) остаётся.

## Technical debt
Принято: нет нового долга; фейк журнала в других тестах не трогали.

## Verification
Файл 18/18; мутация: подменить delta в расписке → тест ловит op_conflict (существующие тесты stars_ledger).

## Rollback
git revert.
