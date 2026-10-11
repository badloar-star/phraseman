# Task packet: сторожа логики центра уведомлений — подписка и мгновенное зачисление награды за ответ на жалобу

Governance-ID: TG-94EA8E61CB15
Status: Done
Owner: 1 · Ядро; поручение координатора 04.10 (логическая часть красных сторожей центра уведомлений)

## Outcome
Разбор по фактам (git log -S), регрессии нет, мой e118983fd ни при чём:
- `subscribeUserAppMessages` убран из центра снимком 95eec1717 (01.08). Замена равноценная и дешевле: кэш сразу,
  при открытии центра — свежее разовое чтение (`minIntervalMs: 0`), в закрытом виде — не чаще 12 ч, при возврате
  в приложение — обновление. Соседний сторож уже закрепляет «центр только из кэша, без подписки».
- `claimReportReplyShardsOptimistically` переименован в `claimReportReplyCoinsOptimistically` (осколки → монеты,
  D70/D104; 53063c465). Optimistic UI цел: `markReplyClaimedLocally` сразу, защита от двойного тапа
  (`optimisticReportClaimIdsRef`), без `await` и спиннера.
- Возобновление незавершённых зачислений после перезапуска (`resumePendingReportReplyShardClaims` в cloud_sync)
  на месте; немой `.catch(() => {})` заменён записью причины (`swallowError`, PM-229) — сторож ждал старую форму.
Сторожа обновлены под текущий код: проверяют суть (кэш→свежее чтение при открытии, мгновенная отметка, возобновление).

## Scope
tests/app_messages_read_persistence_ui_contract.test.ts (2 проверки), tests/app_messages_background_refresh_contract.test.ts (1 проверка).
Проверки вида (numberOfLines, left: -14) — сессии 2, не тронуты.

## Architecture
Без изменений кода.

## Security and privacy
Не затрагивается.

## Technical debt
Старые имена с «Shards» (resumePendingReportReplyShardClaims, ключи хранилища) остаются при переходе на монеты — переименование отдельной задачей, чтобы не сломать сохранённые на устройствах очереди.

## Verification
Логические проверки обоих наборов зелёные; оставшиеся красные — только проверки вида (сессия 2).

## Rollback
Откат коммита.
