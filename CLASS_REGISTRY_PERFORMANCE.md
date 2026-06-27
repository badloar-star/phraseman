# Performance And Runtime Registry

Дата: 2026-06-26.

Статус: первый проход по коду, потому что внешний файл `phraseman-performance-brief.md` не найден. Runtime не менялся.

## Purpose

Этот реестр фиксирует места, которые влияют на скорость старта, JS-thread, батарею, память, таймеры, подписки и шум в dev-runtime.

Правило: performance fix не должен удалять существующую фичу. Если ускорение требует меньше свежести данных или отключения функциональности, это stop point для хозяина.

## Owner Performance Bar

Хозяин проекта отдельно задал планку:

- приложение не должно лагать;
- телефон не должен греться из-за polling, тяжёлого startup, лишних re-render или частых storage/server writes;
- первый экран не ждёт сеть;
- тяжёлые warmups уходят после первого paint / после interactions;
- любые горячие циклы, интервалы, подписки и очереди должны иметь понятный cap/cleanup/throttle.

## Startup Path

Главный носитель:

- `app/_layout.tsx`

Что найдено:

- Native splash скрывается только после `ready` и `firstContentReady`.
- Есть fallback: `setReady(true)` через 1200 ms.
- Local hydration ограничена через `Promise.race(..., 350 ms)`.
- App Check warmup ограничен через `Promise.race(..., 1200 ms)`.
- Heavy init запускается после первого контента и `InteractionManager.runAfterInteractions`.
- Optional warmups (`prime lessons`, `shop warm`, deferred images, flashcards collection) вынесены после первого экрана.

Инварианты:

- первый экран не должен ждать сеть;
- heavy init не должен блокировать первый paint;
- `restoreFromCloud()` должен идти раньше `syncToCloud()`;
- warmups должны быть cancel-safe / catch-safe.

## Timers, Subscriptions, And JS Thread

Носители:

- `app/_layout.tsx`
- `contexts/MatchmakingContext.tsx`
- `hooks/use-arena-session.ts`
- `hooks/use-arena-room-run.ts`
- `hooks/use-arena-rank.ts`
- `components/ActionToast.tsx`
- `components/AchievementContext.tsx`

Что найдено:

- Achievements flush стал event-driven; комментарий прямо говорит, что polling каждые 4 секунды убран.
- ActionToast имеет внутреннюю очередь и ограничение.
- Arena/matchmaking используют интервалы для countdown/search state.
- `hooks/use-arena-rank.ts` держит Firestore `onSnapshot` для arena profile.
- AppState listeners используются для background sync, store-return modal, intro/loyalty gates.
- Current `setInterval(...)` call sites are locked by `tests/owner_direction_runtime_contract.test.ts`; new intervals require updating an owner-reviewed allowlist.
- Current Firestore `.onSnapshot(...)` call sites are locked by `tests/owner_direction_runtime_contract.test.ts`; new live listeners require updating an owner-reviewed allowlist.
- `hooks/use-arena-room-run.ts` private-room question timer now uses a once-per-second visible tick plus a separate exact timeout instead of a 250 ms loop.
- `components/EnergyContext.tsx` now runs 30-second recovery polling only when the app is active, energy is below max, and unlimited mode is off.
- `app/online_presence.ts` now keeps presence heartbeat active-only and uses a 5-minute cadence instead of 1-minute Cloud Function pings.
- `app/analytics.ts` now drops exact duplicate `trackEvent` calls within 750 ms before Firebase/PostHog/AsyncStorage work.
- `components/ActiveBoostBar.tsx` no longer starts its 1-second countdown interval when there are no active boosts.
- `components/ArenaDuelEmojiReact.tsx` cooldown timer no longer recreates a 320 ms interval on every tick; it uses a 1-second interval plus final timeout.
- `components/LeagueChatPanel.tsx` undo-hide countdown now ticks once per second instead of 250 ms; actual hide remains controlled by the existing exact `setTimeout`.
- `app/arena_game.tsx` acceptance countdown and `app/arena_results.tsx` rematch countdown now tick once per second instead of 500 ms.
- `components/HomeTheoAdvisorCard.tsx` typewriter now uses a 33 ms frame-friendly cadence with multiple characters per tick instead of one render per character at 10-18 ms.
- `app/streak_stats.tsx` now uses one shared boost countdown interval for club, personal league, group league, and gift timers instead of four parallel intervals.
- `components/StatsPremiumBlur.tsx` no longer uses live blur or view capture; locked stats use a lightweight static Premium placeholder with lock/CTA.
- `components/paywall/PaywallPriceUrgency.tsx` now computes the active countdown locally and calls `getUrgencyState()` only when the window expires, not every second.
- `contexts/MatchmakingContext.tsx` and legacy `hooks/use-matchmaking.ts` now tick visible matchmaking elapsed time once per second instead of 200 ms / 100 ms.
- `hooks/use-arena-session.ts` and `hooks/use-arena-mock.ts` now use a once-per-second visible question timer plus a separate exact timeout instead of 100 ms question loops.

Риски:

- забытый interval после unmount;
- repeated AppState listeners on remount;
- подписка Firestore без unsubscribe;
- setState после unmount;
- polling на hot screens.

## Hot Timer Audit

Observed on 2026-06-26:

- Most intervals have cleanup on unmount or phase change.
- `hooks/use-arena-session.ts` and `hooks/use-arena-mock.ts` already avoid per-tick re-render by only setting visible timer state when the displayed second changes.
- `hooks/use-arena-room-run.ts` now follows the same exact-timeout pattern for private arena rooms.
- `components/ActiveBoostBar.tsx` stays idle when no active boost exists.
- `components/ArenaDuelEmojiReact.tsx` now updates cooldown UI once per second instead of sub-second interval recreation.
- `components/LeagueChatPanel.tsx` no longer re-renders undo-hide countdown four times per second.
- Arena acceptance/rematch countdown text now follows visible-second cadence.
- Home Theo typewriter keeps the same effect while reducing render count on the Home screen.
- Stats boost countdown rows now share one timer on the stats screen.
- Premium stats lock veil is now flat/static instead of realtime `expo-blur`.
- Paywall urgency timer no longer reads storage every second while the UI countdown is active.
- `app/services/arena_db.ts` avoids listening to the whole matchmaking queue; it polls the aggregate `app_meta/matchmaking_searching` every 30 seconds.
- `app/services/arena_feature_flags.ts` polls feature flags every 30 minutes.
- `app/services/arena_hill.ts` polls throne state every 5 minutes.

Hot spots left for later review:

- 1-second countdown displays on boost/streak/lesson/test screens. These are user-visible timers, but several on one screen can add up.
- Sub-second arena/rematch/chat UI timers such as 250/320/500 ms should stay screen-bound and cleanup-protected.
- Any new polling must update `tests/owner_direction_runtime_contract.test.ts` intentionally.

## Local Queues And Storage Pressure

Носители:

- `app/analytics.ts`
- `app/app_activity.ts`
- `app/progress_events_client.ts`
- `app/cloud_sync.ts`
- `app/shards_system.ts`
- `hooks/use-flashcards.ts`

Что найдено:

- `analytics_queue` capped at 200.
- `app_activity_queue_v1` capped at 200.
- `progress_server_event_queue_v1` capped at 100.
- Broad `syncToCloud()` is debounced and serialized in `app/cloud_sync.ts`; `forceNow` is an explicit bypass for special paths.
- Activity Firestore writes are opt-in or 1% sampled for errors.
- Flashcards have in-memory cache and write lock.
- Shards have in-memory balance cache to avoid UI flicker.

Риски:

- large JSON values in AsyncStorage blocking screens;
- per-tap storage writes on hot UI;
- uncapped debug/report queues;
- repeated `multiGet` over broad key lists on startup.

## Dev Runtime Noise

Носители:

- `app/_layout.tsx`
- `app/perf-monitor.ts`
- `tests/dev_runtime_performance_contract.test.ts`
- `scripts/dev-android-emulator.ps1`

Что найдено:

- `installDevRuntimePerformanceGuards()` is guarded by test.
- Repeated RNFirebase deprecation warning spam is filtered.
- `perf-monitor.ts` is DEV-only.
- Android emulator fast mode exists for responsiveness checks.

Инвариант:

- dev diagnostics must not flood Metro or hide real runtime failures.

## Existing Guardrails Found

Запускались в этом общем проходе:

- `tests/owner_direction_runtime_contract.test.ts`
- `tests/firebase_cost_controls_contract.test.ts`
- `tests/arena_firestore_cost_controls.test.ts`
- `tests/app_events_overlay_registry.test.ts`
- `tests/progress_events_client_queue.test.ts`
- `tests/shards_spend_cloud_timeout.test.ts`
- `tests/stats_premium_blur_performance_contract.test.ts`
- `tests/stats_premium_blur_cache.test.ts`
- `tests/paywall_urgency.test.ts`
- `tests/paywall_dev_preview.test.ts`

Выявлены как relevant, но не запускались в этом performance pass:

- `tests/dev_runtime_performance_contract.test.ts`
- `tests/league_chat_cache_first.test.ts`
- `tests/async_storage_null_bind_guard.test.ts`

## Safe Candidate Fixes

Можно делать без T0 runtime approval, если изменение локальное и покрыто тестом:

- расширять owner-direction guardrails на startup, queues, polling и monotonic restore;
- добавить статический guard на отсутствие achievement polling;
- добавить test на startup sequencing: first content before heavy init;
- добавить guard на capped analytics/activity queues;
- проверить cleanup timers/subscriptions в конкретном hook/component.

Нельзя делать без отдельного решения:

- менять частоту cloud sync, если это влияет на свежесть данных;
- переписывать shard/progress/premium sync;
- убирать preload/warmup фичу вместо переноса её после первого paint;
- отключать analytics/activity полностью ради скорости.
