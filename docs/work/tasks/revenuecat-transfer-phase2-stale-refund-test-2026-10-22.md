# Task packet: набор revenuecat_transfer_phase2 не компилируется — устаревший кейс возврата жемчуга

Governance-ID: TG-9D2D0074FBDF
Status: Done
Owner: Ядро (сессия 1), по поручению координатора 22.10 (находка Ревизора, deploy-pack «Красные наборы»)

## Outcome

Набор `functions/src/revenuecat_transfer_phase2.test.ts` снова компилируется и выполняется. Проверки переноса подписки (TRANSFER) больше не молчат, хотя группа В (isPlus) правит этот денежный обработчик.

## Причина

Кейс «refunds a merged loser purchase against the mapped canonical winner» зовёт `__revenueCatWebhookTestHooks.handleShardRefundEvent`. Обработчик возврата наборов жемчуга удалён в efe19ae9d (30.09), вместе с `revenuecat_shard_refund_lifecycle.test.ts`. Жемчуг — снятый товар (D103/D136/D139). Любое его событие, в том числе REFUND, уходит в `handleRetiredProductEvent`: лог-отказ, без записей, сигнал владельцу, если были списаны деньги. Это поведение уже проверено в `revenuecat_shards.test.ts:722` (`it.each(['REFUND', …])('ignores %s without any write')`).

TS2339 роняет весь набор ещё до первого утверждения: «Tests: 0 total».

## Scope

Удалён только этот один кейс. Код обработчика не меняется, остальные 11 кейсов набора не тронуты.

## Architecture

Кейс сторожил снятую механику, поэтому замены нет. Текущее поведение покрыто в соседнем наборе.

## Security and privacy

Данных и путей денег не меняет.

## Technical debt

Нет.

## Verification

`npx jest --no-watchman src/revenuecat_transfer_phase2.test.ts` (в functions, через слот) — все кейсы зелёные. Точечно `revenuecat_shards.test.ts`.

## Rollback

Вернуть кейс через git — он снова не скомпилируется, пока нет обработчика.
