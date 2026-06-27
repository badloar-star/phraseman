# Phraseman Criticality Registry

Дата реестра: 2026-06-26.

Статус: первичный реестр важности по доступному коду. Полный пакет методических документов не найден, поэтому этот файл фиксирует безопасную рабочую схему до ревью хозяина.

## Правило работы

Перед изменением кода сначала определить критичность зоны:

- T0: можно сломать деньги, прогресс, вход, удержание, безопасность или данные пользователя. Нужен отдельный план и явное одобрение.
- T1: можно заметно сломать основной UX, навигацию, тосты, лиги, арену, старт приложения. Нужны точный реестр носителей и узкие тесты.
- T2: обычная продуктовая логика, контент, отдельные экраны, локальные UI-состояния. Нужны локальные проверки.
- T3: документация, dev-превью, генераторы, отчёты, не-runtime материалы. Можно править легче, но не трогать runtime побочно.

Всегда:

- сначала понять носители класса, потом править;
- не удалять функциональность без явной просьбы;
- все T0-изменения делать обратимо и с guardrail;
- если есть выбор "дешевле" против "свежее" - остановиться и спросить;
- если роль файла/фичи не ясна - не упрощать и не удалять.

## Owner Direction

Это общий ориентир хозяина проекта, действует поверх отдельных реестров:

- Optimistic UI везде, где это безопасно: пользователь сразу видит отклик, а сервер потом подтверждает или аккуратно reconciles state.
- Приложение должно быть очень быстрым: не лагать, не греть телефон, не держать JS thread тяжёлыми задачами, не блокировать первый экран сетью.
- Серверные записи должны быть разумными и дешёвыми: не писать каждый микрошаг опыта/статистики/состояния отдельно, а использовать очереди, batching, ledger, debounce/throttle и server reconciliation.
- Уровень, XP, streak, shards, premium/VIP и другие важные показатели не должны откатываться: если где-то было больше, поздний sync/restore/client cache не имеет права перезаписать это меньшим значением.
- Если "мгновенно для UI", "дёшево для сервера" и "абсолютно свежо" конфликтуют, сначала предложить хозяину выбор простыми словами.

## T0 - святое

### Деньги, Premium, VIP, RevenueCat

Почему T0: ошибка может дать платный доступ бесплатно, отрезать платящего пользователя, сломать восстановление покупки или исказить доход.

Носители:

- `app/revenuecat_init.ts`
- `app/paywall_purchase.ts`
- `app/premium_revenuecat_state.ts`
- `app/premium_guard.ts`
- `app/premium_context.ts`
- `components/PremiumContext.tsx`
- `app/premium_progress.ts`
- `app/premium_trial_eligibility.ts`
- `app/vip_revoke_client.ts`
- `app/referral_vip.ts`
- `functions/src/revenuecat_shards.ts`
- `functions/src/premium_status.ts`
- `functions/src/premium_expiry_cron.ts`
- `functions/src/vip_revoke.ts`
- `functions/src/vip_orphan_reconcile.ts`
- `functions/src/telegram_premium_bot.ts`
- `firestore.rules` premium/VIP protected keys.

Перед правкой:

- показать, какие premium/VIP поля меняются;
- проверить server/client authority;
- проверить restore purchase / webhook / expiry / VIP revoke path;
- добавить или запустить узкие tests по premium/VIP.

### XP, уровень, weekly XP, streak

Почему T0: пользовательский прогресс не должен откатываться никогда.

Носители:

- `app/xp_manager.ts`
- `app/xp_level_restore.ts`
- `app/progress_events_client.ts`
- `app/cloud_sync.ts`
- `app/weekly_xp.ts`
- `app/streak_safety.ts`
- `app/streak_repair.ts`
- `app/streak_revive.ts`
- `app/streak_freeze.ts`
- `app/streak_wager.ts`
- `functions/src/progress_events.ts`
- `functions/src/reset_weekly_xp.ts`
- `functions/src/xp_levels.ts`
- `functions/src/auth_merge.ts`
- `firestore.rules` server-owned progress keys.

Инварианты:

- total XP не уменьшается при weekly reset;
- user level не откатывается при restore/merge/migration;
- streak не ломается из-за даты, timezone, restore или merge;
- duplicate progress events не начисляют второй раз;
- клиент не может напрямую писать server-only progress keys.

Перед правкой:

- отдельное одобрение хозяина;
- реестр всех ключей progress, которых касается изменение;
- тест на monotonic merge/reset;
- тест на idempotency, если есть eventId/server submit.

### Shards, gifts, rewards, energy

Почему T0: это внутренняя валюта и награды, влияет на удержание и покупки.

Носители:

- `app/shards_system.ts`
- `app/shards_shop.tsx`
- `app/shards_shop_cache.ts`
- `app/energy_system.ts`
- `components/EnergyContext.tsx`
- `app/level_gift_system.ts`
- `app/level_gift_inventory.ts`
- `app/friend_gifts.ts`
- `functions/src/revenuecat_shards.ts`
- `functions/src/daily_tasks_shards.ts`
- `functions/src/friend_gifts.ts`
- `functions/src/league_chest.ts`
- `functions/src/collectibles.ts`

Инварианты:

- balance не становится отрицательным;
- paid/earned shards не теряются при restore;
- награда не выдаётся дважды из-за retry;
- UI не показывает награду, которая не записана.

### Auth, stable id, merge, account deletion

Почему T0: ошибка может потерять аккаунт, склеить чужие данные, удалить лишнее или заблокировать вход.

Носители:

- `app/auth_provider.ts`
- `app/cloud_sync.ts`
- `app/stable_id.ts`
- `app/user_id_policy.ts`
- `app/account_delete_timeout.ts`
- `components/DeleteAccountConfirmModal.tsx`
- `functions/src/auth_identity.ts`
- `functions/src/auth_merge.ts`
- `functions/src/account_delete.ts`
- `functions/src/leaderboard.ts` name ownership and stable uid resolution.
- `firestore.rules`

Инварианты:

- stable id - главный user id для user progress;
- Firebase Auth uid - auth token / rules identity;
- provider link - восстановление stable id;
- merge сохраняет максимум прогресса и не переносит premium клиентом;
- account delete удаляет только своё и покрывает новые коллекции.

Перед правкой:

- отдельный план;
- тесты auth/merge/account delete;
- проверить `auth_links`, `users`, `leaderboard`, league/friend/community references.

### Security rules and deploy gates

Почему T0: ошибка может открыть данные или дать клиенту писать валюту/премиум.

Носители:

- `firestore.rules`
- `storage.rules`
- `functions/src/callable_options.ts`
- `scripts/deploy_lock_guard.mjs`
- `scripts/scan_secrets.mjs`
- `.gitleaks.toml`

Перед правкой:

- отдельное одобрение;
- narrow security tests;
- не ослаблять rules ради быстрого fix.

## T1 - основной продукт и заметный UX

### Event bus, toasts, overlay arbiter

Почему T1: стартовый файл называет это первым заметным провалом. Ошибка ломает видимость наград, сообщений, обновлений, modal flow.

Носители:

- `app/events.ts`
- `components/OverlayArbiter.tsx`
- `components/overlay_arbiter_core.ts`
- `components/ActionToast.tsx`
- `components/AchievementToast.tsx`
- `components/DailyTaskRewardToast.tsx`
- `components/InGameToast.tsx`
- `components/CoachToast.tsx`
- `components/MatchFoundToast.tsx`
- `components/StreakRiskToastHost.tsx`
- `components/BillingIssueToastHost.tsx`
- `components/ThemedBlockingAlertHost.tsx`
- Root mounts in `app/_layout.tsx`

Риски:

- тост не появляется;
- тост появляется дважды;
- модалка держит слот навсегда;
- native modal handoff вызывает зависание;
- наградная модалка закрывается таймером и пользователь теряет контекст.

### App startup, onboarding, update gates, navigation

Носители:

- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `components/onboarding.tsx`
- `components/MaintenanceGate.tsx`
- `components/ForceUpdateGate.tsx`
- `components/UpdateModal.tsx`
- `components/ReleaseNotesModal.tsx`
- `components/NotificationPermissionModal.tsx`
- `components/DeferredRedirect.tsx`
- `app/navigation_back.ts`

Риски:

- blank screen;
- splash не закрывается;
- onboarding/paywall/update перекрывают друг друга;
- активный таб мигает или сбивается;
- back navigation ломает flow.

### League, arena, matchmaking, leaderboard

Носители:

- `app/league_*`
- `app/firestore_leagues.ts`
- `app/firestore_leaderboard.ts`
- `app/arena_*`
- `contexts/MatchmakingContext.tsx`
- `functions/src/league_*`
- `functions/src/leaderboard.ts`
- `functions/src/matchmaking.ts`
- `functions/src/game_loop.ts`
- `functions/src/arena_*`

Риски:

- неправильный рейтинг/лига;
- ghost room/session;
- очередь матча зависает;
- leaderboard показывает неверного пользователя;
- league reward теряется или дублируется.

### Notifications, reminders, retention surfaces

Носители:

- `app/notifications.ts`
- `app/settings_notifications.tsx`
- `components/NotificationPermissionModal.tsx`
- `app/app_resume_policy.ts`
- `app/foreground_usage_ms.ts`
- `functions/src/re_engage_push.ts`

Риски:

- спам уведомлениями;
- потеря streak reminder;
- неверные разрешения;
- плохой UX после возврата в приложение.

## T2 - продуктовая логика, контент, UI

### Lessons, quizzes, diagnostics, personal plan

Носители:

- `app/lesson*.tsx`
- `app/lesson_data*.ts`
- `app/lesson_intro_screens*.ts`
- `app/preposition_drill.tsx`
- `app/diagnostic_test.tsx`
- `app/diagnosis_training*.ts`
- `app/personal_plan*.ts`
- `app/(tabs)/quizzes.tsx`
- `app/quizzes/*`

Риски:

- неправильный ответ;
- плохой distractor;
- некорректная локализация;
- сломанный progress внутри конкретной тренировки.

Если изменение начисляет XP/reward или пишет progress - зона становится T0.

### Flashcards and community packs

Носители:

- `app/flashcards.tsx`
- `app/flashcards/*`
- `app/community_packs/*`
- `functions/src/community_packs.ts`

Если изменение касается покупки pack, ownership или shards - зона становится T0.

### UI components, themes, visual polish

Носители:

- `components/*`
- `components/ui/*`
- `constants/theme.ts`
- `components/ThemeContext.tsx`
- `constants/motion.ts`

Особое правило:

- на lime/salad/neon-green CTA, badge, pill, correct surfaces использовать тёмный foreground, не белый.

### AI explanations, compass, premium dialog

Носители:

- `app/explain_*`
- `app/ai_*`
- `app/compass/*`
- `functions/src/explain_*`
- `functions/src/premium_dialog.ts`
- `functions/src/compass.ts`

Если изменение касается paid gating, quota, OpenAI cost или premium-only access - зона становится T0/T1.

## T3 - низкий риск

Примеры:

- docs and reports, если они не являются runtime contract;
- dev preview routes;
- admin lab screens без production use;
- carousel/social/content generation scripts, если не пишут runtime assets;
- screenshots and qa artifacts;
- `.codex-tmp/`, `tmp/`, `qa-artifacts/`, `.logs/` reports.

Ограничение: T3 не даёт права удалять существующую функциональность.

## Stop points

Остановиться и спросить хозяина:

1. Перед любым изменением в T0.
2. После реестра класса и до первых кодовых правок.
3. Если fix кажется проще сделать удалением фичи.
4. Если нужно выбрать между дешёвым кешем и свежими серверными данными.
5. Если один fix конфликтует с другой существующей возможностью.

## Suggested first class registry

Начать без правок кода:

1. `CLASS_REGISTRY_EVENTS_TOASTS.md`: все emitters/listeners/hosts/action_toast/overlay keys.
2. `CLASS_REGISTRY_STATE_AUTHORITY.md`: XP, level, streak, shards, premium/VIP, cloud sync, server progress events.
3. `CLASS_REGISTRY_SERVER_BATCHING.md`: server writes, local queues, idempotency, optimistic UI, reconciliation.
4. `CLASS_REGISTRY_PERFORMANCE.md`: startup, tab deferred loading, image preload, timers, subscriptions, render hot paths.
5. `CLASS_REGISTRY_NAV_LAYOUT_CONTENT.md`: navigation, layout, localization/content, date/time, haptics.
