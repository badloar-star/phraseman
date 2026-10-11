# Task packet: PM-229 клиент закрыт (app_snapshot_bootstrap) + сторож friend_lookup + проверка срока блокировки разбора фразы

Governance-ID: TG-94EA8E61CB15
Status: Done
Owner: 1 · Ядро; поручение координатора 04.10 (три пункта после 17047a3c8)

## Outcome
1. `app/app_snapshot_bootstrap.ts`: последние 5 немых обработчиков клиента пишут причину через
   noteSwallowedAs/noteSwallowedHandler (значения по умолчанию прежние). Клиентская проба PM-229: 5 → 0, база пустая.
2. `functions/src/friend_lookup.test.ts`: причина падения по git log -S — см. Verification ниже.
3. Разбор фразы: блокировка генерации УЖЕ имеет срок — `LOCK_TTL_MS = 165 000` (explain/explain_cache.ts):
   устаревшую блокировку перехватывает следующий запрос (claimPendingLock), чтение не считает её «в ожидании».
   Вечного зависания нет; худший случай — ожидание до 2¾ мин после сбоя снятия. Код не меняется.

## Scope
app/app_snapshot_bootstrap.ts (через временный индекс от HEAD — в рабочей копии отличаются окончания строк),
tests/pm229_silent_catch.probe.ts (база), functions/src/friend_lookup.test.ts.

## Architecture
Без новых чтений/записей; только запись причины в журнал при уже существующих сбоях.

## Security and privacy
Не затрагивается.

## Technical debt
Значения по умолчанию при сбое старта (null/false) сохранены — менять поведение старта не в рамках PM-229.

## Verification
Проба PM-229 клиента PASS с пустой базой; tsc по файлу; тесты friend_lookup.

## Rollback
Откат коммита.
