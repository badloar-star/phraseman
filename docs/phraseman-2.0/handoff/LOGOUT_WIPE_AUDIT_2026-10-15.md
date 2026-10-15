# Выход из аккаунта и смена аккаунта: что остаётся на телефоне (статический разбор, 15.10 ~06:20)

Только чтение. Код не менялся. Подтверждение — логами `[ACC-SWITCH-WIPE]` / `[STABLE-ID-CLEAR]` в прогоне №7, когда владелец разрешит эмулятор. Чинить после №7, сначала логи (правило владельца).

## Как устроено

### Путь выхода и смены

Выход и «Сменить аккаунт» — один путь:
- `AccountLogoutFlow.tsx:103` / `settings.tsx:1545` → `signOutAndWipeForAccountSwitch` (`auth_provider.ts:3963`).
- Порядок шагов:
  1. принудительная синхронизация;
  2. аварийная копия данных (`cloud_sync.ts:5938`);
  3. маркер карантина;
  4. `signOut` → `wipeLocalAccountData` → `clearStableId` → `ensureAnonUser` (`account_switch_quarantine.ts:919-1013`).
- Перезагрузки JS после смены нет: модульные кэши в памяти живут дальше.

### Что именно стирается

Тело стирания — `wipeLocalAccountDataUnsafeBody` (`cloud_sync.ts:6076`). Удаляется только то, что есть в списках:
- `SYNC_KEYS` (`:493`);
- `accountLocalDataKeysForToday` (`:895`);
- префиксы `ACCOUNT_LOCAL_KEY_PREFIXES` (`:699`, скан `getAllKeys`);
- `WIPE_ONLY_*` (`:852`).

**Всё, чего нет в списках, переживает и выход, и смену аккаунта.**

### Что есть только при удалении аккаунта

`AsyncStorage.clear()`, снятие push-токена и уведомлений, очистка кэша Firestore (`auth_provider.ts:962-969`, `4836-4853`). При выходе их нет.

## 🔴 Попадает в интерфейс или логику СЛЕДУЮЩЕГО аккаунта

| Ключ / кэш | Где пишется | Что увидит / получит аккаунт B |
|---|---|---|
| `streak_plus_freeze_pending_v1` — **моё, 63aae09ef этой ночью** | `app/streak_freeze_pending.ts:83` | У B сработает разрешение отложенной заморозки A: потратится заморозка Plus или пересчитается серия B по числам A. **Чинить первым.** |
| `lessons_pearl_unlocked_v1(_fr)` | `client_shard_semantic_reducer.ts:149` (чтение `lesson_lock_system.ts:254`) | Уроки, открытые A, открыты у B. |
| Диалоги: `dialogs_completed_ids_v1`, `dialogs_free_lifetime_count_v3`, `dialogue_v2_voice_attempts_v1` (+ память `memory` / `hydrated`), `dialogue_v2_why_allowance:v1` (+ `revealedIds`) | `dialogs_progress.ts:89`, `dialogs_limit_session.ts:53`, `dialogue_v2_voice_daily_limit.ts:91`, `dialogue_v2_why_allowance.ts:90` | У B история пройденных диалогов A и израсходованные A лимиты (голос, бесплатные ответы). |
| Статистика: `stats_preload_cache_v5` + модульный `_cache` (`myName`, `totalStreak`), `lifetime_profile_stats_snapshot_v1` | `statsCache.ts:133` (`_cache` `:66`), `lifetime_profile_stats.ts:164` | B видит имя, серию и счётчики A на экране статистики, пока кэш не обновится. |
| Серия: `streak_server_sync_day_v1`, `streak_week_day_markers_v1`, память `streakTouchedDayKey` / `streakSweptDayKey`, `streak_day_signal` `state` | `streak_server_sync.ts:64`, `streak_week_markers.ts:97`, `hall_of_fame_utils.ts:166-167`, `streak_day_signal.ts:62` | Если A засчитал день в этом процессе, у B день не засчитается до завтра; серия B не уйдёт на сервер в этот день. |
| `ban_status_cached_v1` (+ `_at`) | `_layout.tsx:2078` | Бан A (кэш 30 мин) применяется к B. |
| `premium_free_freeze_month_v1`, `premium_celebration_*`, `vip_celebration_*` | `premium_freeze_allowance.ts:91`, `premium_celebration_state.ts:90,123`, `vip_celebration_state.ts:41,109` | Израсходованные A заморозки съедают лимит B. Поздравления Plus / VIP — по состоянию A. |
| Мелочь: `community_pack_liked_ids_v1`, `study_target_v1`, счётчики `paywall_personalization`, шаг онбординга | `packSocialStorage.ts:35`, `study_target.ts:109`, `paywall_personalization.ts:31`, `CleanOnboarding.tsx:258-265` | Лайки наборов A, язык изучения A (возможно, так задумано), персонализация пейвола, онбординг с шага A. |

### Модульные кэши в памяти без сброса при смене

| Кэш | Где |
|---|---|
| `_medalsCacheByTarget` | `medal_utils.ts:223` |
| `_analyticsCache` / `peekActivity365Analytics` | `activity_365_analytics.ts:539` |
| `current` / `peekTodayTasks` (нет проверки владельца) | `today_tasks_store.ts:83`, `use_today_tasks.ts:89` |
| `achievementCountPeek`, `recentAchievementIdsPeek` | `streak_stats.tsx:1089` |
| `peekByTarget` (сброс не проверен) | `diagnostic_test_state.ts:19` |

## 🔴 Приватность на устройстве (в интерфейсе не видно)

- **Push-токен и локальные уведомления A не снимаются при выходе** — устройство после смены получает пуши A. Снимаются только при удалении (`auth_provider.ts:4836-4853`). Место для правки: `performCurrentProviderSignOut` (`auth_provider.ts:5145-5195`).
- **Кэш документов Firestore SDK** чистится только при удалении (`firestore_cache_clear.ts:26`). Место: `markFirestoreCacheClearPending('signout')` в `wipeLocalAccountDataUnsafeBody` (`cloud_sync.ts:6243`).
- **Аварийная копия данных A** (`account_switch_emergency_backup_*`, `cloud_sync.ts:5938`) лежит открытым текстом до 30 дней (`account_switch_backup_restore.ts:43`). Она нужна для восстановления A. Риск принимается осознанно — вопрос владельцу.
- База `phone-state` (SQLCipher) и SecureStore `account_authority.binding.v2.<uidHash>` — привязаны к аккаунту, не стираются. Утечки в интерфейс нет, но остаются на диске.

## Привязано к аккаунту (ключ содержит uid), в чужой интерфейс не попадает, но не чистится

`spire_*:uid:lang`, `today_tasks_v1:`, `story_events_v1:`, `energy_session_*`, `practice_rune_*`, `progress_server_event_queue_v1:`, `report_reward_bundle_claims_v1:`, `community_pack_paid_ids_v1:`, `feature_intro_seen_v1::`, `flashcard_pack_gift_inventory_v2::uid:`, `user_notifications_cache_v2:`, `referral_spin_credits_v1:` — рост диска на общем телефоне, не утечка.

## Что стирается правильно

- `SYNC_KEYS`: имя, аватар, серия, достижения, уроки, карточки, премиум, VIP, осколки, `user_stats_v1`.
- Монеты: `level_spin_star_*:`, `coin_rank_v1:`.
- Очереди `v2:outbox`, `pending_shard_grants_*`.
- Память и снимки диалогов V2.
- `screen_snapshots_v1`, `friends_tab_swr_v1`, `profile_card_public_v1`.
- `stable_id` (SecureStore, AsyncStorage, память).
- Кэш премиума (`beginPremiumAccountTransition`).
- Снимок Главной (`resetAppSnapshotForAccountSwitch`).

## План (после №7, сначала логи)

1. **Логи.** В `wipeLocalAccountDataUnsafeBody` — `[ACC-SWITCH-WIPE] survivors=[…]`: перечень ключей, оставшихся после стирания (скан `getAllKeys` минус `KEEP` и привязанные к uid). №7 покажет живой список, а не статический.
2. **Ключи 🔴 → в `accountLocalDataKeysForToday` / `WIPE_ONLY_*`.** Первым — `streak_plus_freeze_pending_v1`.
3. **Модульные кэши** — сброс через `subscribeAccountGeneration` (как у energy_peek, story_events).
4. **Выход: снять push-токен и уведомления, пометить кэш Firestore к очистке** — как при удалении.
5. **Сторож:** тест, который пишет каждый известный ключ, зовёт стирание и требует пустой список выживших, кроме `KEEP` и привязанных к uid.
