# Ядро · админские записи: проверка прав ДО разбора входа (Ревизор L732, бэклог стр. 93)

Status: In progress
Owner: 1 · ЯДРО (NIGHT_BACKLOG_2026-10-26 стр. 93)

## Outcome
`adminGrantAccess` и `adminSetUserBan` сначала проверяют admin-claim и право роли, потом разбирают команду. Раньше
не-админ с кривой командой получал `invalid-argument`, с правильной — `permission-denied`: по разнице кодов можно было
подбирать формат админской команды. Теперь любой не-админ получает только `permission-denied`.

## Scope
In scope: `functions/src/admin_access_controls.ts` (порядок двух строк в двух функциях),
`functions/src/admin_access_controls.test.ts` (поведенческий тест через `.run`).
Out of scope: выкладка — по «да» владельца в общем пакете сервера; админка (`admin/v2/legacy.html`) не меняется —
админ с правами получает те же ответы, что и раньше.

## Architecture
Без изменений: та же функция `actor`, тот же `normalize*Input`, порядок вызова. `requireAdminAppCheck` остаётся первым
(он запломбирован и возвращается сразу).

## Security and privacy
Убирает оракул формата для не-админов. Данных не добавляет.

## Technical debt
Нет новой. Тот же порядок стоит проверить в остальных админских писателях — отдельной задачей, если Ревизор попросит.

## Verification
`functions/src/admin_access_controls.test.ts`, `functions/src/admin_sensitive_writes.test.ts`,
`tests/firebase_cost_controls_contract.test.ts`; узкая проверка типов functions.

## Rollback
Откат коммита (сервер не выложен).
