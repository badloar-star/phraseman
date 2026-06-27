# Performance And Server Cost Audit - 2026-06-26

Цель аудита: проверить, не осталось ли мест, где приложение часто тикает, читает storage, слушает Firestore или пишет на сервер без разумного ограничения.

## Что проверено

- Таймеры: `setInterval`, частые `setTimeout`, countdown UI.
- Серверные live-read места: Firestore `onSnapshot`.
- Немедленный sync: `syncToCloud({ forceNow: true })`.
- Явные серверные записи: `writeToFirestore: true`, `httpsCallable`.
- Локальное давление: частые `AsyncStorage.getItem/setItem/multiGet`.

## Что безопасно исправлено в этом проходе

- `app/(tabs)/home.tsx`: stats pulse hint больше не держит постоянный 30-second polling. Теперь Home один раз считает, сколько осталось до 3 часов usage, ставит один `setTimeout`, а 30-second retry использует только при ошибке чтения storage.
- `tests/owner_direction_runtime_contract.test.ts`: interval allowlist обновлен, добавлен guard, который не даст вернуть этот Home polling молча.

## Что уже было исправлено раньше в этом performance pass

- Arena question timers: visible UI tick раз в секунду, точный ответ/timeout отдельно.
- Matchmaking elapsed timers: раз в секунду вместо 100-200 ms.
- Energy recovery polling: работает только active app + energy below max + not unlimited.
- Online presence heartbeat: active-only, раз в 5 минут.
- Analytics: exact duplicate event throttle на 750 ms до Firebase/PostHog/AsyncStorage.
- Premium stats lock UI: без `expo-blur`, без live capture, static placeholder.
- Paywall urgency: storage не читается каждую секунду.
- Stats boost countdowns: один общий timer вместо нескольких параллельных.

## Текущий вывод

- Критичных вечных sub-second loops после правок не найдено.
- Оставшиеся 1-second timers в основном являются видимыми countdown UI. Это нормально, если они screen-bound и чистятся на unmount.
- Firestore live listeners и прямые server writes есть, но многие относятся к premium, friends, league, arena, app messages, auth и progress. Их нельзя менять вслепую, потому что можно сломать свежесть данных, экономику или прогресс.
- `forceNow` sync call sites остаются owner-reviewed: auth, premium, XP migration, lesson completion, lesson unlock/intro, avatar/aura, profile card, battle pass.
- Avatar/aura and profile-card cosmetics are no longer broad immediate cloud writes on every cosmetic tap: ownership/economy paths stay immediate, cosmetic switches defer broad sync by 30 seconds.

## Нельзя менять без отдельного решения владельца

- XP/progress/streak/shards authority.
- Premium/auth/server authority.
- Частоту broad cloud sync, если это меняет свежесть данных.
- Firestore live listener -> cache/SWR переходы для league/friends/arena/premium.
- `writeToFirestore: true` policy для важных funnel/user-action/error событий.

## Рекомендуемый следующий порядок

1. Home/startup `AsyncStorage` load audit: сгруппировать безопасные reads, не трогая T0 progress/premium/shards.
2. Firestore listener lifetime audit по экранам: где live listener реально нужен, а где можно cache-first/SWR.
3. Server write policy: оставить прямые server writes только для важных действий, остальные держать local/capped/sampled/batched.
4. T0 sync/shards/progress authority менять только отдельным owner-approved планом: idempotency key, monotonic merge, ledger, rollback protection.

## Проверка

- `npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts --runInBand`
- Результат: 25 tests passed.

## Additional Safe Home Storage Fix

- `app/(tabs)/home.tsx`: avatar/frame/aura hydration теперь читает `user_avatar`, `user_frame`, `USER_AVATAR_AURA_KEY` одним `multiGet` и переиспользует результат для UI и snapshot.
- Раньше Home мог прочитать `user_avatar`/`user_frame` два раза почти подряд во время `loadData`.
- `tests/owner_direction_runtime_contract.test.ts`: добавлен guard, который не даст вернуть дублирующий Home avatar/frame storage read.

## Home LoadData Storage Batching

- `app/(tabs)/home.tsx`: базовые ключи `user_name`, `streak_count`, `week_days_done`, `user_total_xp`, selected title и `streak_last_shown` теперь читаются одним `multiGet`.
- Special-title counters, freeze/free-freeze and login/comeback/personal-best banner keys also use grouped `multiGet` reads.
- Last-opened lesson progress now reuses the already-loaded 32 lesson progress entries instead of doing a second storage read for the same lesson.
- Shards, premium, progress, league, daily tasks, medals and cloud sync authority were not changed.
- `tests/owner_direction_runtime_contract.test.ts`: guard blocks these Home hot-path reads from regressing back to separate `getItem` calls.

## Firestore Listener Audit

- Добавлен `FIRESTORE_LISTENER_AUDIT_2026-06-26.md`.
- Runtime listeners в этом этапе не менялись.
- Вывод: live listeners для premium, remote config, arena sessions/rooms, friends, league/chat и app messages требуют owner decision перед изменением свежести.
- Лучшие будущие cost candidates: league chest bonus listeners, AppMessagesInbox two-listener model, DailyPhrase live query, Home league previews.

## Server Write Policy Audit

- Добавлен `SERVER_WRITE_POLICY_AUDIT_2026-06-26.md`.
- Runtime server writes в этом этапе не менялись.
- Добавлен guardrail в `tests/owner_direction_runtime_contract.test.ts`: все явные `writeToFirestore: true` call sites теперь owner-reviewed.
- Вывод: progress/shards/cloud sync/league/arena writes нельзя менять без owner-approved T0 plan; будущие savings лучше искать в telemetry policy, paywall funnel batching и shards shop revenue/debug events.

## T0 Approval Checklist

- Добавлен `T0_PROGRESS_SHARDS_SYNC_APPROVAL_CHECKLIST_2026-06-26.md`.
- Runtime XP/progress/shards/sync не менялся.
- Checklist фиксирует обязательные вопросы перед правкой: current authority, desired authority, offline behavior, duplicate retry, monotonic merge, idempotency key, tests.

## Paywall Funnel Cost Fix

- `app/paywall_funnel.ts`: добавлена short-term dedupe защита для одинаковых funnel events за 750 ms.
- `shown` по-прежнему дедупится на mount/session, остальные шаги теперь защищены от double tap / duplicate call.
- In-memory dedupe cache capped at 64 keys.
- Покупки, RevenueCat, premium access, XP, shards и sync не менялись.
- `tests/owner_direction_runtime_contract.test.ts`: добавлен guard на TTL + duplicate window + cache cap.

## Shards Shop Open Telemetry Fix

- `app/shards_shop.tsx`: `shards_shop:open` теперь пишет Firestore только один раз на mounted shop tab.
- Повторный focus того же tab всё ещё пишет local activity queue, но без server write.
- Shards balance, purchase flow, RevenueCat, pack clicks, purchase success и shard authority не менялись.
- `tests/owner_direction_runtime_contract.test.ts`: добавлен guard на `firestoreOpenTabsRef` и conditional `writeToFirestore`.

## App Activity Queue Storage Fix

- `app/app_activity.ts`: local activity queue теперь читает `AsyncStorage` один раз в in-memory cache, а дальше переиспользует cache.
- После каждого принятого telemetry event capped queue всё равно сразу пишется обратно в storage.
- Это убирает лишний `AsyncStorage.getItem(app_activity_queue_v1)` на каждый telemetry event, но не меняет Firestore policy.
- `tests/owner_direction_runtime_contract.test.ts`: guard проверяет cache, cap 200, sampled/error policy и explicit Firestore allowlist.

## Analytics Queue Storage Fix

- `app/analytics.ts`: local `analytics_queue` теперь читает `AsyncStorage` один раз в in-memory cache, а дальше переиспользует cache.
- После каждого принятого product analytics event capped queue всё равно сразу пишется обратно в storage.
- Firebase/PostHog dispatch, 750 ms duplicate guard, cap 200 и `flushAnalytics` сохранены.
- Это убирает лишний `AsyncStorage.getItem(analytics_queue)` на каждый analytics event и не меняет server write policy.
- `tests/owner_direction_runtime_contract.test.ts`: guard проверяет cache, cap 200, duplicate guard и очистку cache при `clearEventQueue`.
- `tests/analytics_queue_cache.test.ts`: behavioral test проверяет, что два принятых analytics event делают один storage read и два durable writes.

## App Health Throttle Storage Fix

- `app/app_health.ts`: warning/critical diagnostics теперь используют bounded in-memory throttle cache на 128 fingerprint'ов.
- Первая допустимая ошибка по-прежнему пишет throttle timestamp в `AsyncStorage` и, если разрешено, отправляет `app_error`.
- Повтор той же ошибки внутри throttle-окна теперь отсекается до `AsyncStorage.getItem`, Crashlytics и `submitClientReport`.
- Warning throttle остался 30 минут, critical throttle остался 10 минут.
- `tests/app_health_throttle_cache.test.ts`: behavioral test проверяет, что два одинаковых warning подряд дают один throttle storage read/write и один server report.
- `tests/owner_direction_runtime_contract.test.ts`: guard фиксирует cache, cache limit и порядок throttle-check.

## Client Reports Callable Cache

- `app/client_reports.ts`: общий шлюз `submitClientReport` теперь переиспользует один callable для Cloud Function `submitClientReport`.
- Параллельные client reports теперь делят один in-flight AppCheck warmup вместо запуска warmup на каждый report.
- AppCheck warmup не кешируется навечно после завершения: если AppCheck не поднялся, будущие reports смогут попробовать снова через обычную `initFirebaseAppCheckIfAvailable`.
- Server write policy не менялась: какие reports уходят на сервер, осталось как было.
- `tests/client_reports_cache.test.ts`: behavioral test проверяет один callable, один concurrent AppCheck warmup и сохранение двух фактических report calls.
- `tests/owner_direction_runtime_contract.test.ts`: guard фиксирует callable cache и in-flight AppCheck warmup.

## Ideas Client Callable Cache

- `app/ideas_client.ts`: non-T0 отправка пользовательских идей теперь переиспользует callable для `submitUserIdea`.
- Параллельные idea submits делят один in-flight AppCheck warmup.
- Payload, Cloud Function name, AppCheck call и итоговый server submit не менялись.
- Это уменьшает JS/native setup work на повторных идеях, но не меняет server write policy.
- `tests/ideas_client_cache.test.ts`: behavioral test проверяет один callable setup, один concurrent AppCheck warmup и сохранение каждого фактического submit.
- `tests/owner_direction_runtime_contract.test.ts`: guard фиксирует callable cache и неизменность payload fields для `submitUserIdea`.

## Online Presence Guard Adjustment

- `app/online_presence.ts` сейчас отсутствует, и `_layout.tsx` не запускает `installOnlinePresenceHeartbeat`.
- Guardrail обновлен: если online presence вернут, тест снова потребует active-only heartbeat и 5-minute cadence.

## User Report Throttle Cache - 2026-06-27

- `app/user_report.ts`: repeated user/pack reports inside the 30-second shared throttle now stop at an in-memory timestamp cache.
- First successful report still awaits server delivery and writes durable `last_user_report_ts` to `AsyncStorage`.
- Repeated spam taps no longer reread the throttle key and do not create another `submitClientReport` call.
- Report payloads, server routing, UI result states and failure semantics were not changed.
- XP, progress, streak, shards, premium, auth and cloud sync were not touched.
- `tests/user_report_throttle_cache.test.ts`: behavioral test covers one server call and one throttle read for two immediate report attempts.
- `tests/owner_direction_runtime_contract.test.ts`: guard locks this cache and awaited report delivery.

## Error Report Throttle Cache - 2026-06-27

- `app/error_report.ts`: repeated lesson bug reports inside the 60-second throttle now stop at an in-memory timestamp cache.
- First valid report still awaits `submitClientReport('error_report')`, then writes durable `last_error_report_ts`, then starts the existing non-blocking `registerXP(10, 'achievement_reward', ...)` bonus.
- Repeated spam taps no longer reread throttle storage, collect metadata, send another server report, or trigger another XP bonus path.
- Report payloads, UI result states, server delivery, throttle window and XP bonus order were not changed.
- Progress/shards/premium/auth/cloud sync were not touched.
- `tests/error_report_throttle_cache.test.ts`: behavioral test covers one server report and one XP call for two immediate attempts.
- `tests/owner_direction_runtime_contract.test.ts`: guard locks cache and the order server -> throttle write -> XP bonus.

## User Warning Check Cache - 2026-06-27

- `app/user_warning_check.ts`: repeated Home/admin warning checks inside the 25-minute cooldown now stop at an in-memory timestamp cache.
- First real check still reads `user_warnings_last_fetch_at_v1`, reads seen warning ids, queries `user_warnings`, and writes the new fetch timestamp.
- Repeated Home refreshes in the same cooldown no longer reread warning throttle storage and do not query Firestore again.
- Admin warning behavior, seen warning storage and visible warning result were not changed.
- XP, progress, streak, shards, premium, auth and cloud sync were not touched.
- `tests/user_warning_check_cache.test.ts`: behavioral test covers one storage throttle read and one Firestore query for two immediate checks.
- `tests/owner_direction_runtime_contract.test.ts`: guard locks this cache before the Firestore query.

## Prompt Gate Storage Grouping - 2026-06-27

- `app/after_win_upsell_gate.ts`: after-win upsell gate now reads `after_win_upsell_last_shown_v1` and `streak_paywall_shown` with one `AsyncStorage.multiGet`.
- `app/winback_offer.ts`: winback gate now reads last-active and shown-at keys with one `AsyncStorage.multiGet`.
- `app/review_utils.ts`: `canShowReview` now reads sessions, last prompted, rated flag and show count with one `AsyncStorage.multiGet`.
- Prompt logic, cooldowns, premium gating, native review behavior and mark/write functions were not changed.
- Purchases, RevenueCat, XP, progress, streak, shards, auth and cloud sync were not touched.
- Existing behavior tests for after-win/winback plus locale review tests cover the same decisions; owner guard now locks grouped reads.

## Focused Verification Update - 2026-06-27

- Combined focused gate passed: 15 suites, 95 tests.
- Covered report throttles, warning cooldown cache, prompt gate storage grouping, client report/App Check caches, analytics/app-health caches, Firebase cost guardrails, static premium stats veil and the owner runtime contract.
- `git diff --check` passed for the active touched files; Windows only reported LF-to-CRLF line-ending warnings.
- Safe non-T0 scope is closed for this pass.
- Remaining runtime changes are owner-decision work: T0 progress/shards/sync authority, live listener freshness changes, `forceNow` policy changes and Firebase Console App Check provider confirmation.

## T0 Monotonic Progress Mirror Pass - 2026-06-27

- `app/progress_events_client.ts`: late server mirrors no longer reduce local `user_total_xp` or current-week XP. Weekly values are only preserved when they belong to the same week.
- `app/cloud_sync.ts`: cloud restore now unions unlocked lesson lists and keeps stronger level exam progress instead of relocking lessons/exams from stale cloud data.
- `app/friend_quests.ts`: friend quest reward XP mirror no longer overwrites a higher local XP value with a lower returned `callerXp`.
- No extra server writes were added.
- Server ledger, queueing, App Check, shards authority, premium/auth authority and sync debounce policy were not changed.
- Focused T0 tests passed during implementation; final combined gate is recorded in the checklist.

## T0 Shards Timestamp Mirror Pass - 2026-06-27

- `app/shards_system.ts`: server-authoritative shard mirror updates can now carry server `updatedAtMs`; stale responses are skipped when local shard meta is newer.
- Legitimate newer server spends can still reduce local balance. This avoids the unsafe global `Math.max` pattern for wallets.
- `friendSendGift`, `friendClaimQuestReward`, `communityPurchasePack`, `leagueActivateGroupBoost`, `leagueChestClaim` and `collectiblesClaimDrop` now return `shardsUpdatedAtMs` when they mirror a shard balance.
- Client call sites pass `updatedAtMs`, `op` and `reason` into `replaceShardsBalanceLocal`.
- No extra Firestore writes were added. This is a payload/merge-safety change, not a cost-increasing write path.
- Existing offline fallback, cloud insufficient reconciliation, admin override and store-purchased shard achievement exclusion were preserved.
- Verification added in `tests/shards_system.test.ts`, `tests/friend_quests.test.ts`, `tests/friend_gifts.test.ts`, `tests/owner_direction_runtime_contract.test.ts`, `functions/src/friend_gifts.test.ts` and `functions/src/community_packs.test.ts`; `functions` build passed.

## Shards Ledger Authority Audit - 2026-06-27

- Added `SHARDS_LEDGER_AUTHORITY_AUDIT_2026-06-27.md`.
- `app/release_wave_bonus.ts`: release wave cloud/local grant now writes wallet freshness metadata. This adds no new server write, only fields on the existing write plus local meta beside the existing local wallet write.
- `app/level_gift_system.ts`: fallback shard grant now uses the shared shard mirror instead of raw `AsyncStorage.setItem('shards_balance', ...)`.
- `tests/owner_direction_runtime_contract.test.ts`: added guards for release-wave shard meta and level-gift fallback.
- Remaining owner decisions are recorded separately: auth merge shard timestamp, friend gift idempotency key, and whether all local fallback wallet mutations should move to callable ledger endpoints.

## Root Startup Storage Batching - 2026-06-27

- `app/_layout.tsx`: startup identity/onboarding local reads now use one `AsyncStorage.multiGet` for `user_prev_xp`, `user_total_xp`, and `onboarding_done` when onboarding is not force-enabled for QA.
- The first-frame network policy was not changed: cloud hydration, App Check, RevenueCat/shop warmups, migrations, sync and leaderboard work remain deferred or backgrounded.
- XP migration behavior was preserved: missing `user_prev_xp` is still initialized from existing `user_total_xp`.
- `tests/owner_direction_runtime_contract.test.ts`: guard now rejects returning these bootstrap reads to separate `getItem` calls.

## Runtime Blur Removal / Top Fade Exception - 2026-06-27

- `app/(tabs)/_layout.tsx`: removed tabbar `BlurView` layers and the `expo-blur` import. The floating tab chrome now uses the existing static tinted overlay.
- `app/(tabs)/_layout.tsx`: tabbar chrome was adjusted to a 95% static black scrim, so content barely shows through without runtime blur.
- `components/TopFadeMask.tsx`: after owner review, the top safe-area fade now renders `MaskedView` + `LinearGradient` + a static scrim with NO `BlurView`/`dimezisBlurView`. This is the owner-approved GPU-friendly compromise: a gradient fade instead of native blur, so it keeps the soft top-edge look without heating the device. The removed tabbar blur stack was about 439,545 physical pixels across three blur layers, ~17.0% of the screen.
- No navigation, tab lazy-load, scroll-collapse, haptics, top fade timing, premium state, XP, shards, auth or server writes were changed.
- `tests/owner_direction_runtime_contract.test.ts`: guard now fails if runtime app UI reintroduces `expo-blur`, `BlurView`, or `dimezisBlurView` anywhere in `app/`, `components/`, `hooks/`, or `contexts/` (including `components/TopFadeMask.tsx`).
- `tests/fabric_background_layout_contract.test.ts`: guard updated for static tab chrome and the static (no-blur) top fade.

## Final Local Closure Status - 2026-06-27

- Startup, local storage batching, timer cadence, static premium lock UI, runtime blur removal, server write allowlists, listener allowlists, optimistic/server-first UX matrix, monotonic XP/progress restore, shard stale-response guards, App Check local code guards and Firebase cost guardrails are now covered by focused tests/audit artifacts.
- The only part not locally provable from this repository is Firebase Console/App Check provider state and deployed function environment flags. That requires checking the Firebase project console/deployment state, not source code.
