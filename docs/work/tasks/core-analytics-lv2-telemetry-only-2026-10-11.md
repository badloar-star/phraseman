# Task packet: события Learning V2 сняты со склада аналитики до включения V2

Governance-ID: TG-07C99DF91AD9
Status: In progress
Owner: 1 · ЯДРО
Related epic/enabler: analytics_contract_audit (красный на HEAD), решение координатора 00:02

## Outcome

`analytics_contract_audit` перестаёт требовать события Learning V2 в SQL склада и метрику для них: Learning V2 в
релиз не идёт (решение координатора 00:02), серверных правок SQL сейчас нет. Четыре события помечаются
`warehouse: "telemetry_only"` — значение уже есть в типе `ProductAnalyticsWarehouse`; отправка событий не меняется
(поле влияет только на список склада и аудит).

## Scope

In scope: `app/product_analytics_governance.json` (4 записи learning_v2_*), `tests/product_analytics_event_catalog.test.ts`
(ожидаемый список склада), пост-релизная строка в INBOX.

Out of scope: `scripts/analytics-contract-audit.mjs` (правит другая сессия, незакоммичено — не трогаю),
`functions/src/admin_product_analytics.ts` (серверная выкладка — владелец, после релиза), отправка телеметрии V2.

## Architecture

No architecture change: существующее значение перечисления. Инвариант: на складе только события, которые читает SQL
и у которых есть метрика.

## Security and privacy

Нет новых данных: события V2 и их поля не меняются; меньше событий уходит в складской отчёт.

## Technical debt

Accept temporarily: события V2 не на складе. Владелец — координатор/владелец продукта; выход — при включении V2
вернуть `warehouse: "product"`, добавить события в SQL склада и метрику (серверная выкладка владельцем).

## Verification

Сторож каталога (jest), аудит контрактов (закоммиченная версия скрипта и рабочая), если рабочая принадлежит другой
сессии — только отчёт.

## Rollback

Вернуть `"warehouse": "product"` у четырёх событий (`git revert`).
