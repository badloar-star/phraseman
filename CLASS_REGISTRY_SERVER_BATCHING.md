# Server Batching And Reconciliation Registry

Дата: 2026-06-26.

Статус: первый проход по коду, потому что внешний файл `phraseman-server-batching-brief.md` не найден. Runtime не менялся.

## Purpose

Этот реестр отвечает на простой вопрос: где приложение пишет данные на сервер, где есть очередь/батч/ledger, а где риск рассинхрона или лишних Firebase-записей.

Главное правило: если действие влияет на деньги, XP, уровень, streak, shards, premium/VIP, auth или удаление аккаунта, это T0. Runtime-правки только после отдельного решения хозяина.

## Owner Direction: Cheap Server, Fast UI, No Rollbacks

Хозяин проекта отдельно зафиксировал ориентир:

- UI должен быть optimistic: действие ощущается мгновенным.
- Сервер не должен получать отдельную запись на каждое мелкое изменение опыта, статистики или состояния.
- Правильный путь похож на большие language-learning apps: локальная очередь, разумная агрегация, debounce/throttle, batching, idempotency key, server ledger, reconciliation.
- Поздняя серверная/локальная синхронизация не должна уменьшать уже выросшие показатели. Для XP, level, streak, shards, rewards и premium state нужен monotonic merge или server-authoritative result.

## Good Reference Pattern

### Server-authoritative progress events

Client:

- `app/progress_events_client.ts`
- Локальная очередь: `progress_server_event_queue_v1`.
- Ограничение очереди: максимум 100 событий.
- `flushInFlight` не даёт двум flush-циклам одновременно гонять одну очередь.
- При успехе серверный результат зеркалится в AsyncStorage через `mirrorProgressResultToLocal(...)`.
- При ошибке событие кладётся в очередь и будет повторено позже.

Server:

- `functions/src/progress_events.ts`
- `progressSubmitEvent` работает в транзакции.
- Idempotency через `users/{uid}/progress_events/{eventId}`.
- Daily cap через `progress_daily_counters/{day}`.
- XP/streak/level считаются на сервере и записываются в `users/{uid}.progress`.

Это эталон для T0-прогресса: event id, ledger, транзакция, server result, local mirror.

## Server Write Classes

### Class A: idempotent user action

Хороший вариант для горячих действий пользователя.

Найденные носители:

- `functions/src/progress_events.ts`: XP/progress event ledger.
- `functions/src/daily_tasks_shards.ts`: `reward_claims/daily_tasks_all_{dayKey}`.
- `functions/src/collectibles.ts`: claim drop через transaction.
- `functions/src/profile_card_upgrade.ts`: upgrade через transaction.
- `functions/src/league_chest.ts`: league reward transaction.
- `functions/src/friend_gifts.ts`: gifts/quests через transaction.
- `functions/src/community_packs.ts`: purchase/moderation через transaction.
- `functions/src/revenuecat_shards.ts`: webhook writes in transaction.

Ожидаемый контракт:

- callable/webhook validates identity;
- one logical action has one stable idempotency key;
- duplicate retry returns existing result or no-op;
- balance/progress updates happen in the same transaction as claim marker;
- client UI is reconciled from server result.

### Class B: batch maintenance / cleanup

Для фоновых, админских или cron задач.

Найденные носители:

- `functions/src/account_delete.ts`: `bulkWriter`, `db.batch()`, explicit flush points.
- `functions/src/arena_cleanup.ts`: `bulkWriter`.
- `functions/src/arena_season_cron.ts`: `bulkWriter`.
- `functions/src/reset_weekly_xp.ts`: batched weekly reset.
- `functions/src/sync_leaderboard.ts`: batched leaderboard sync.
- `functions/src/league_finalize_cron.ts`: batched league finalization.
- `functions/src/re_engage_push.ts`: batched push state updates.
- `functions/src/friend_activity_mirror.ts`: rolling mirror batches.

Ожидаемый контракт:

- page through data, do not load whole collection blindly;
- flush before fetching/deleting the next page when needed;
- retry-safe writes;
- no mixed identity deletes;
- narrow tests around new collection coverage.

### Class C: local queue / eventual sync

Client-side queues that should never block core UX.

Носители:

- `app/progress_events_client.ts`: durable T0 progress queue.
- `app/analytics.ts`: `analytics_queue`, capped at 200, debug/reserve queue.
- `app/app_activity.ts`: `app_activity_queue_v1`, capped at 200, Firestore only for explicit debug or 1% sampled errors.
- `app/cloud_sync.ts`: broad AsyncStorage to cloud sync/restore layer.
- `app/_layout.tsx`: flushes pending progress, syncs on startup/background, restores before pushing local state.

Ожидаемый контракт:

- queues have a hard cap;
- logging never breaks product behavior;
- background sync is throttled;
- optimistic UI has a later server reconciliation path;
- T0 queues have idempotency, not only "best effort".

### Class D: mixed local-first wallet

Носитель:

- `app/shards_system.ts`

Что найдено:

- Есть in-memory + AsyncStorage balance cache.
- Есть `applyShardDeltaToCloud(...)` through client Firestore transaction.
- Есть local fallback after cloud timeout.
- Есть `syncShardsToCloud(...)` and `loadShardsFromCloud(...)`.
- Есть server Cloud Function для daily tasks reward: `functions/src/daily_tasks_shards.ts`.
- `firestore.rules` уже защищает top-level shard writes for ordinary clients.

Статус:

- Это T0 architecture decision.
- Не менять runtime без отдельного плана.
- Возможные направления: переводить cloud-enabled shard mutations на Cloud Functions или явно закрепить local-first fallback как продуктовый контракт.

## Startup / Sync Sequencing

Носитель:

- `app/_layout.tsx`
- `app/cloud_sync.ts`

Найденный порядок:

- local hydration has a 350 ms startup budget;
- first screen is protected by a 1200 ms safety timer;
- cloud hydration starts early but first frame is not blocked by network/App Check;
- heavy init runs after first content + `InteractionManager.runAfterInteractions`;
- `restoreFromCloud()` runs before `syncToCloud()` to avoid pushing empty local data over cloud state;
- background `syncToCloud()` is delayed and throttled to avoid repeated writes.

Это хороший базовый порядок. Любая правка startup sync должна сохранять "restore before sync".

## Cloud Sync Write Audit

Default sync behavior:

- `app/cloud_sync.ts` has `SYNC_DEBOUNCE_MS = 5 * 60_000`.
- `syncInFlight` serializes broad sync.
- `pendingSync` schedules a later run when another sync request arrives during an active sync.
- `syncToCloud({ deferMs })` sets one timer and returns if a timer already exists.
- Plain `syncToCloud()` is debounced by `lastSuccessfulSyncAt`.

Explicit `forceNow` callers found:

- `app/auth_provider.ts`: account swap/sign-in pre-sync. T0 auth path, expected immediate.
- `app/premium_revenuecat_state.ts`: entitlement/purchase state. T0 money path, expected immediate.
- `app/xp_manager.ts`: one-time XP formula migration only. T0 progress migration, expected immediate.
- `app/lesson_complete.tsx`: lesson completion medal/progress. T0/T1 completion path, needs cost audit before changing.
- `app/lesson1.tsx`: intro shown flag and lesson 1 unlock path. Needs cost audit before changing.
- `app/avatar_select.tsx`: avatar/aura purchases remain immediate; already-owned cosmetic avatar/aura switches defer broad cloud sync by 30 seconds.
- `app/profile_card_upgrade.tsx`: profile card level upgrades remain immediate; theme/motion/public-focus cosmetics defer broad cloud sync by 30 seconds.
- `app/arena_battle_pass_store.ts`: battle pass store. T0/T1 reward/economy path.

Plain debounced sync callers found:

- `app/stats_daily_breakdown.ts`
- `app/user_stats.ts`
- `app/_layout.tsx`
- auth post-hooks in `app/auth_provider.ts`

Owner decision needed before runtime changes:

- Keep `forceNow` only for account, purchase, one-time migration, and immediately user-visible paid/economy actions.
- Convert non-critical profile/stat/content changes to `syncToCloud({ deferMs })` or plain debounced sync only after checking current UX expectations.

## Cost / Freshness Stop Points

Остановиться и спросить хозяина, если нужно выбрать:

- fresh server read on every screen open vs cached/stale-while-revalidate data;
- immediate Firestore write per tap vs local queue + later flush;
- optimistic balance update vs waiting for server result;
- background sync frequency below/above 60 seconds;
- keeping local shard fallback vs strict server-authoritative wallet.

## Existing Guardrails Found

Запускались и зелёные в этом проходе:

- `tests/owner_direction_runtime_contract.test.ts`
- `tests/firebase_cost_controls_contract.test.ts`
- `tests/arena_firestore_cost_controls.test.ts`
- `tests/progress_events_client_queue.test.ts`
- `tests/progress_events_engine.test.ts`
- `tests/progress_event_type_contract.test.ts`
- `tests/firestore_rules_security.test.ts`
- `tests/daily_tasks_shards_claim.cloud.test.ts`
- `tests/shards_spend_cloud_timeout.test.ts`

Не запускались в этом проходе, но относятся к классу:

- `functions/src/progress_events.test.ts`
- `functions/src/revenuecat_shards.test.ts`
- `functions/src/account_delete.test.ts`
- `tests/cloud_sync_*`
- `tests/personal_plan_cloud_sync_contract.test.ts`

## Next Safe Work

Без T0 runtime-правок можно:

- расширять `tests/owner_direction_runtime_contract.test.ts`, если появляется новый общий принцип batching/reconciliation;
- провести owner-approved audit по `forceNow` call sites и перевести безопасные non-critical writes на deferred/debounced sync;
- добавить документированный owner decision по shards authority;
- расширить registry по cloud sync keys, но только targeted search, без чтения всего проекта.

Runtime T0 fix candidates require approval:

- shard wallet authority;
- cloud sync merge semantics;
- premium/VIP restore or expiry;
- auth/stable id merge;
- progress XP/streak event semantics.
