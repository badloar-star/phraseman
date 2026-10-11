# Task packet: вариант (в) v2 — правки по opus-ревью (diff без коммита)

Governance-ID: TG-AEA4BD2CC60A
Status: In progress (координатор 05.10: обновить diff по ревью C1/H2/M1–M4 + тесты, без коммита до «да» владельца)
Owner: сессия 1 · ЯДРО

## Outcome

Diff v2 рядом с C:\Temp\claude\core_coin_fix_v_2026-10-05.diff:
- C1: уплотнение берёт только траты, чей единственный durable-источник — operationStorageKey (конверты платного спина и
  любые другие источники исключаются по множеству id);
- H2: тест сбоя между multiRemove и записью проекции;
- M1: проверка суммы до multiRemove;
- M2: отчёт о повторах трат с предсказуемым id;
- M3: комментарий-инвариант у поля;
- M4: контракт на settledSpendOperationIds;
- тесты из ревью (нехватка, sync/practice/reconcile, boot peek, порча −10.5/строка).

## Scope

app/level_spin_star_grants.ts, tests/coin_compaction_logs_contract.test.ts. Правка — во временном состоянии дерева,
после снятия diff файлы возвращаются к базе (md5). Коммита нет.

## Architecture

Как v1 (compactedSpendTotal в overlay) + множество «id только из operationStorageKey» из сканирования восстановления.

## Security and privacy

Не меняется; логи без uid.

## Technical debt

Траты с внешним источником (конверт платного спина) не уплотняются и остаются записью — размер проекции растёт на них
до появления удаления конверта; их немного (по одной на неоткрытый спин).

## Verification

Новые тесты + кошелёк/руны; синтаксис @babel/parser.

## Rollback

Diff не применён; откат не нужен.
