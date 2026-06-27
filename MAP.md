# Phraseman Code Map

Дата карты: 2026-06-26.

Статус: первичная карта по доступному коду. Стартовый файл `C:\Users\badlo\Downloads\phraseman-00-START-HERE.md` прочитан. Остальные документы пакета (`phraseman-agent-operating-rules.md`, `phraseman-problem-classes.docx`, `phraseman-bugfix-tracker.md`, `phraseman-server-batching-brief.md`, `phraseman-performance-brief.md`) в Downloads, Desktop, Documents, OneDrive, `C:\appsprojects` и ближайших архивах не найдены.

## 1. Общая форма проекта

Phraseman - Expo / React Native приложение на TypeScript.

Главные признаки стека:

- `package.json`: Expo 54, React 19, React Native 0.81, Expo Router, Firebase Auth / Firestore / Functions, RevenueCat (`react-native-purchases`), PostHog, Jest.
- `app.json`: native app `app.phraseman`, EAS Updates, Firebase, App Check, iOS/Android настройки, asset bundling.
- `tsconfig.json`: strict TypeScript, alias `@/*`.
- `functions/package.json`: Firebase Functions на Node 22, TypeScript, Jest.
- `tests/setup_jest_write_guard.js`: тесты защищают исходники от записи.

Рабочие зоны по количеству файлов на момент осмотра:

- `app/`: около 822 TS/TSX/JSON рабочих файлов. Основная клиентская логика, экраны, storage, синхронизация, уроки, экономика.
- `components/`: около 232 файлов. UI-компоненты, модалки, тосты, провайдеры.
- `functions/src/`: около 146 файлов. Серверная логика Firebase Functions.
- `tests/`: около 710 тестов. Большой набор контрактных и регрессионных проверок.
- `constants/`: около 40 файлов. Темы, тексты, ассеты, справочники.
- `hooks/`: около 24 файлов. Аудио, haptics, экранные утилиты, streak freeze.
- `contexts/`: `MatchmakingContext`.
- `modules/phrase-widget/`: native widget module; при обычной карте игнорировать build output внутри модуля.

## 2. Вход приложения

Главные точки старта:

- `index.js`: native entry point.
- `app/index.tsx`: редирект на `/(tabs)/home`.
- `app/_layout.tsx`: главный RootLayout и AppContent. Здесь поднимаются провайдеры, splash, update gates, onboarding, глобальные модалки, синхронизация, preload, RevenueCat, Firebase, XP/session checks.
- `app/(tabs)/_layout.tsx`: кастомная нижняя навигация, deferred loading табов, prewarm табов, active tab state.

Главные табы:

- `app/(tabs)/home.tsx`: главный экран.
- `app/(tabs)/lessons.tsx`: список уроков.
- `app/(tabs)/arena.tsx`: арена.
- `app/(tabs)/friends.tsx`: друзья.
- `app/(tabs)/settings.tsx`: настройки.
- `app/(tabs)/quizzes.tsx`: quiz screen, не входит в нижнюю пятёрку табов как обычный пункт.

Главные провайдеры из `app/_layout.tsx`:

- `ThemeProvider`
- `LangProvider`
- `StudyTargetProvider`
- `PremiumProvider`
- `EnergyProvider`
- `AchievementProvider`
- `MatchmakingProvider`
- `OverlayArbiterProvider`

## 3. T0-зоны: деньги, прогресс, вход, удержание

Деньги / Premium / VIP:

- `app/revenuecat_init.ts`
- `app/paywall_purchase.ts`
- `app/premium_revenuecat_state.ts`
- `app/premium_guard.ts`
- `app/premium_context.ts`
- `components/PremiumContext.tsx`
- `app/premium_progress.ts`
- `app/premium_trial_eligibility.ts`
- `app/vip_revoke_client.ts`
- `functions/src/revenuecat_shards.ts`
- `functions/src/premium_status.ts`
- `functions/src/premium_expiry_cron.ts`
- `functions/src/vip_revoke.ts`
- `functions/src/vip_orphan_reconcile.ts`
- `functions/src/telegram_premium_bot.ts`

Прогресс / XP / уровень / streak / weekly XP:

- `app/xp_manager.ts`
- `app/progress_events_client.ts`
- `app/xp_level_restore.ts`
- `app/streak_safety.ts`
- `app/streak_repair.ts`
- `app/streak_revive.ts`
- `app/streak_freeze.ts`
- `app/streak_wager.ts`
- `app/weekly_xp.ts`
- `app/cloud_sync.ts`
- `functions/src/progress_events.ts`
- `functions/src/reset_weekly_xp.ts`
- `functions/src/xp_levels.ts`

Валюта / shards / gifts / energy:

- `app/shards_system.ts`
- `app/shards_shop.tsx`
- `app/energy_system.ts`
- `components/EnergyContext.tsx`
- `app/level_gift_system.ts`
- `app/level_gift_inventory.ts`
- `app/friend_gifts.ts`
- `functions/src/revenuecat_shards.ts`
- `functions/src/daily_tasks_shards.ts`
- `functions/src/friend_gifts.ts`

Auth / identity / account deletion:

- `app/auth_provider.ts`
- `app/cloud_sync.ts`
- `app/stable_id.ts`
- `app/user_id_policy.ts`
- `app/account_delete_timeout.ts`
- `components/DeleteAccountConfirmModal.tsx`
- `functions/src/auth_identity.ts`
- `functions/src/auth_merge.ts`
- `functions/src/account_delete.ts`
- `functions/src/leaderboard.ts`

Security / authority:

- `firestore.rules`
- `storage.rules`
- `functions/src/callable_options.ts`
- `scripts/deploy_lock_guard.mjs`
- `scripts/scan_secrets.mjs`
- `.gitleaks.toml`

## 4. События, тосты, оверлеи

Это первый рабочий кластер из стартового файла.

Носители:

- `app/events.ts`: типизированный event bus через `DeviceEventEmitter`; включает `action_toast`, `xp_changed`, `premium_activated`, `vip_activated`, `league_*`, `streak_*`, `shards_*`, `daily_task_*`.
- `components/OverlayArbiter.tsx`: единый арбитр модалок/тостов, чтобы одновременно не открывалось несколько слоёв.
- `components/overlay_arbiter_core.ts`: приоритеты overlay, список auto-evictable тостов, native modal handoff gap.
- `components/ActionToast.tsx`
- `components/AchievementToast.tsx`
- `components/DailyTaskRewardToast.tsx`
- `components/InGameToast.tsx`
- `components/CoachToast.tsx`
- `components/MatchFoundToast.tsx`
- `components/StreakRiskToastHost.tsx`
- `components/BillingIssueToastHost.tsx`
- `components/ThemedBlockingAlertHost.tsx`

Связь с `app/_layout.tsx`: все глобальные toast/modal hosts монтируются в RootLayout под `OverlayArbiterProvider`.

## 5. Cloud sync и авторитет состояния

Главный клиентский файл:

- `app/cloud_sync.ts`

Он отвечает за:

- анонимного пользователя;
- stable id;
- restore/sync progress;
- список storage keys для синхронизации;
- merge local/cloud progress;
- связь с Premium/VIP;
- восстановление/ремонт streak и XP-level migration;
- account deletion timeout.

Серверная пара:

- `functions/src/progress_events.ts`: server-authoritative XP/streak/progress events, caps, idempotency по event id.
- `functions/src/auth_identity.ts`: stable uid ownership and identity resolution.
- `functions/src/auth_merge.ts`: merge accounts and progress.
- `functions/src/reset_weekly_xp.ts`: weekly reset без сброса total XP.
- `firestore.rules`: запрещает клиенту писать server-only progress keys, premium/VIP keys, защищает shards.

Ключевой инвариант: уровень, XP, streak, premium/VIP, shards и пользовательский прогресс не должны откатываться из-за клиента, merge, reset или restore.

## 6. Уроки, обучение, контент

Уроки и учебные экраны:

- `app/lesson1.tsx`
- `app/lesson_menu.tsx`
- `app/lesson_complete.tsx`
- `app/lesson_words.tsx`
- `app/lesson_irregular_verbs.tsx`
- `app/preposition_drill.tsx`
- `app/level_exam.tsx`
- `app/exam.tsx`
- `app/diagnostic_test.tsx`

Данные уроков:

- `app/lesson_data_1_8.ts`
- `app/lesson_data_9_16.ts`
- `app/lesson_data_17_24.ts`
- `app/lesson_data_25_32.ts`
- `app/lesson_data_all.ts`
- `app/lesson_data_types.ts`
- `app/lesson_prepositions*.ts`
- `app/lesson_intro_screens*.ts`
- `app/error_traps/*`

Тренировки и персональный план:

- `app/active_recall.ts`
- `app/personal_plan*.ts`
- `app/diagnosis_training*.ts`
- `app/trainer*.tsx`

Flashcards / marketplace:

- `app/flashcards.tsx`
- `app/flashcards/*`
- `app/community_packs/*`
- `functions/src/community_packs.ts`

## 7. Лиги, арена, социальное

Лиги:

- `app/league_engine.ts`
- `app/firestore_leagues.ts`
- `app/firestore_leaderboard.ts`
- `app/league_screen.tsx`
- `app/league_chat_system.ts`
- `app/firestore_league_chat.ts`
- `app/services/league_chest_rewards.ts`
- `functions/src/league_groups.ts`
- `functions/src/league_chat.ts`
- `functions/src/league_chest.ts`
- `functions/src/league_finalize_cron.ts`
- `functions/src/leaderboard.ts`
- `functions/src/compute_leaderboard_stats.ts`

Арена:

- `app/arena_game.tsx`
- `app/arena_lobby.tsx`
- `app/arena_room.tsx`
- `app/arena_results.tsx`
- `app/arena_rating.tsx`
- `app/arena_leaderboard.tsx`
- `contexts/MatchmakingContext.tsx`
- `hooks/use-arena-session.ts`
- `hooks/use-arena-room-run.ts`
- `functions/src/game_loop.ts`
- `functions/src/matchmaking.ts`
- `functions/src/arena_rooms.ts`
- `functions/src/arena_rank_progression.ts`
- `functions/src/arena_season*.ts`

Friends / gifts:

- `app/friends_screen.tsx`
- `app/firestore_friends.ts`
- `app/firestore_friend_activity.ts`
- `app/firestore_friend_requests.ts`
- `app/friend_gifts.ts`
- `app/friend_quests.ts`
- `functions/src/friend_codes.ts`
- `functions/src/friend_lookup.ts`
- `functions/src/friend_activity_likes.ts`
- `functions/src/friend_gifts.ts`

## 8. UI, темы, ассеты

Темы и дизайн:

- `constants/theme.ts`
- `constants/goldTheme.ts`
- `constants/motion.ts`
- `components/ThemeContext.tsx`
- `components/ScreenGradient.tsx`
- `components/ui/*`

Важное правило проекта из `AGENTS.md`: на ярко-зелёных/lime/salad поверхностях использовать тёмный текст, не белый.

Ассеты:

- `assets/images/*`
- `assets/fonts/*`
- `app.json` `assetPatternsToBeBundled`

Примечание: большие ассеты, build output и generated caches не читать без необходимости.

## 9. Сервер

Главный экспорт:

- `functions/src/index.ts`

Основные группы:

- Auth/identity: `auth_identity.ts`, `auth_merge.ts`, `account_delete.ts`
- Progress/economy: `progress_events.ts`, `xp_levels.ts`, `reset_weekly_xp.ts`, `revenuecat_shards.ts`
- Premium/VIP: `premium_status.ts`, `premium_expiry_cron.ts`, `vip_revoke.ts`, `vip_orphan_reconcile.ts`, `telegram_premium_bot.ts`
- League/leaderboard: `leaderboard.ts`, `sync_leaderboard.ts`, `league_groups.ts`, `league_chest.ts`, `league_finalize_cron.ts`
- Arena: `matchmaking.ts`, `game_loop.ts`, `arena_rooms.ts`, `arena_season*.ts`, `arena_rank_progression.ts`
- Community packs: `community_packs.ts`
- AI/explain/compass: `explain_*`, `premium_dialog.ts`, `compass.ts`, `weekly_review.ts`, `stats_insights.ts`
- Admin/alerts/reports: `admin_alerts.ts`, `client_reports.ts`, `admin_grant.ts`

## 10. Tests and gates

Root tests:

- `npm test -- --runTestsByPath <test files>` is the narrow default.
- Do not run broad Jest automatically.
- Do not update snapshots or fixtures unless explicitly requested.

Important examples:

- `tests/cloud_sync_*`
- `tests/auth_provider_stable_link.test.ts`
- `tests/flashcard_pack_purchase_refresh_contract.test.ts`
- `tests/firestore_rules_security.test.ts`
- `tests/premium_*`
- `tests/streak_*`
- `tests/arena_*`
- `tests/daily_tasks_*`
- `tests/overlay_*`

Functions tests:

- `functions/src/*.test.ts`
- Run from `functions/` with narrow `npm test -- --runTestsByPath ...` when touching server code.

## 11. What not to touch blindly

Do not edit these areas without a class registry and explicit reason:

- `firestore.rules`
- `app/cloud_sync.ts`
- `app/xp_manager.ts`
- `functions/src/progress_events.ts`
- `functions/src/auth_merge.ts`
- `functions/src/auth_identity.ts`
- `functions/src/revenuecat_shards.ts`
- `functions/src/premium_status.ts`
- `app/paywall_purchase.ts`
- `app/premium_guard.ts`
- `app/streak_*`
- `app/shards_system.ts`
- `functions/src/account_delete.ts`

Do not delete functionality as a side effect of repair.

## 12. Class registries

Created registries:

1. `CLASS_REGISTRY_EVENTS_TOASTS.md`: emitters/listeners/hosts/action_toast/overlay keys.
2. `CLASS_REGISTRY_STATE_AUTHORITY.md`: XP, level, streak, shards, premium/VIP, cloud sync, server progress events.
3. `CLASS_REGISTRY_SERVER_BATCHING.md`: server writes, local queues, idempotency, reconciliation, cost/freshness stop points.
4. `CLASS_REGISTRY_PERFORMANCE.md`: startup, tab deferred loading, timers/subscriptions, local queues, dev runtime noise.
5. `CLASS_REGISTRY_NAV_LAYOUT_CONTENT.md`: navigation, layout, localization/content, date/time, haptics.

Next useful registry:

- Feature-specific registries only when the next bug cluster names a concrete area.
