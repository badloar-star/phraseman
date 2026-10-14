# Task packet: выход из аккаунта 13 с — сперва логи стадий сброса stable_id (clearStableId 1,1 с)

Governance-ID: TG-B4D491B7080C
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: ACC-SPEED, прогон №5 (dep:wipeLocalData 3,0 с, dep:clearStableId 1,1 с), координатор 14.10 (пункт 3)

## Outcome

Правило «сперва логи»: до любой починки — замер каждой стадии сброса stable_id: ожидание предыдущей операции, два удаления из
SecureStore, сверочное чтение, AsyncStorage (удаление, сверка, метка), оповещение подписчиков. Одна строка [STABLE-ID-CLEAR]
с мс по стадиям. Стадии стирания данных уже пишутся ([ACC-SWITCH-WIPE] wipe_stages) — Сверке: включить обе метки в журнал №6.

## Scope

In scope: `app/stable_id.ts` (clearStableIdStorage, clearStableId — только замеры), без изменения порядка и проверок.
Out of scope: ускорение (после цифр №6).

## Architecture

performance.now-часы (identityTraceClockMs), одна строка console.warn в конце (и при сбое — со стадией, после которой упало).

## Security and privacy

В строке только миллисекунды и имена стадий — без id.

## Technical debt

Contain: строку оставить навсегда (немых медленных стадий быть не должно).

## Verification

Тесты stable_id / смены аккаунта зелёные; синтаксис; типы.

## Rollback

Убрать строку лога.
