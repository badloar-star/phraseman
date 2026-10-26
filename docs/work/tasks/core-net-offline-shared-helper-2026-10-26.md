# Ядро · общий помощник «нет сети» для каталога, «Сохранённых», Пика и очереди зовов (координатор 26.10)

Governance-ID: TG-92F78AAF9AA2
Governance-ID: TG-354C5B9DF487
Status: In progress
Owner: 1 · ЯДРО

## Outcome
Одно правило «нет сети» везде, где его решал одиночный снимок NetInfo: `isConnected === false` — сразу;
`isInternetReachable === false` — только 5 с подряд; `null`/неизвестно — сеть есть; возврат — сразу. Журнал `[NET-BANNER]`
с меткой места (`home_scene`, `friends_offline`, `friends_network_back`, `cards_catalog`, `cards_saved_load`).

## Scope
In scope: новый `app/net_offline_step.ts` (чистое решение + подписка с таймером, без импортов RN); перевод на него
`components/home/v2/scene/home_net_banner_step.ts` (переэкспорт) и `use_home_scene_offline.ts`,
`app/flashcards/useCatalogOffline.ts` (+ `catalogOfflineVerdict` — мгновенное решение), `app/flashcards/useSavedLoadOffline.ts`,
`app/friends_together/nudge_queue.ts` (`isOfflineNow`, `subscribeOffline`, `subscribeNetworkBack`). Тесты: новый на
подписку, перепривязка `catalog_offline_state`, `friends_offline_strip`. Пик (`components/spire/spire_config_offline.ts`)
меняется только через `catalogOfflineVerdict`.
Out of scope: «Диалоги» (свои правила с 22.10), глобальный `OfflineBanner` (свой probe в `app/net_status.ts`).

## Architecture
`netOfflineStep(prev, snapshot, nowMs)` — чистое решение со временем. `trackNetOffline(place, subscribe, onDecision, deps)` —
подписка: на каждое сообщение решение + один таймер перепроверки тем же снимком; отписка снимает таймер. Разовые проверки
(перед зовом, запасной конфиг Пика) — `netOfflineInstant`: офлайн только при `isConnected === false`, ждать 5 с перед тапом
нельзя, а reachable=false сам по себе ещё не «нет сети» (отправка попробует, сбой уйдёт в очередь / «Повторить»).
Каталог (разовый `NetInfo.fetch`) при reachable=false перечитывает через 5 с и подтверждает тем же `netOfflineStep`.
Новых запросов в сеть нет.

## Security and privacy
Не касается данных: в журнал идут флаги NetInfo, тип подключения и метка места.

## Technical debt
«Диалоги» держат своё правило (reachable не блокирует никогда) — сводить в общий помощник отдельно, если решит координатор.

## Verification
Тесты: чистое решение (null/unknown, <5 с / ≥5 с, connected=false, возврат, дребезг), подписка с поддельным таймером
(подтверждение через 5 с, сброс при возврате, отписка снимает таймер), каталог, полоса друзей. Проверка типов затронутых файлов.

## Rollback
Откат коммита.
