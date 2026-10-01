# PM-233 — ledger существующих покупок и прав (preflight + сухой прогон, 2026-10-01)

Пакет: `docs/work/tasks/pm233-purchase-ledger-2026-10-01.md` (Governance-ID TG-0E8A9744F2D3).
База: ветка `feature/referral-roulette`, HEAD `dad5070501f14b4fb80e29b28f97c49dbd0e5e69` (рабочее дерево грязное
чужими сессиями; на файлы, по которым сняты ссылки, это не влияет). Исполнитель: Claude Opus 5.5, субагент.

**Только код и документы.** Боевая база, эмулятор, RevenueCat, App Store / Google Play, Stripe, PayPal и Telegram
не открывались. Записей в Firestore, деплоя, push и правок кода приложения/функций нет. App Check не трогался.

## Что сделано

1. Собрана таблица ledger: **39 продуктов/прав** — 8 за реальные деньги, 1 смешанный (промокоды/сертификаты),
   22 внутриигровых (жемчуг, монеты, звёзды, траты), 7 выданных бесплатно, 1 запись-история.
   Статусы: **17 keep · 2 convert_decided · 9 retire_decided · 11 needs_decision**; вопросов владельцу — **13**.
2. Таблица — данные в read-only скрипте `scripts/pm233_purchase_ledger_dry_run.mjs` (`LEDGER`). Скрипт сам
   сканирует код (`app`, `components`, `hooks`, `modules`, `functions/src`, `constants`, `firestore.rules`,
   `admin/v2/legacy.html`; без тестов/проб/сгенерированного) по пяти типам маркеров права:
   товар магазина (`phraseman_premium|shards|voice_minutes|max_*`), коллекция покупок/кошелька/квитанций,
   локальный ключ владения (`*_owned|paid|purchased|unlocked_*_vN`), поле Plus (`vip_*`, `premium_rc_*`,
   `intro_access_*`, `loyalty_gift_*`), callable/HTTP, двигающий ценность. На HEAD найдено **203 маркера**:
   все разнесены по строкам ledger или в `IGNORED` с причиной; **uncovered = 0, stale = 0**.
3. Сторож `scripts/pm233_purchase_ledger_dry_run.test.mjs` (node:test, 5 проверок): полнота по маркерам кода
   и отсутствие «протухших» маркеров; синтетический новый товар/коллекция/ключ ловится; каждая строка заполнена,
   у `needs_decision` есть вопрос `Q-233-N`; объёмы в проде — `unknown`, не 0; скрипт без импортов
   firebase/сети/child_process и без записи файлов; `--prod` отклоняется кодом 2.

## PM-233-A2: почему «одна покупка» здесь не выборка

Ни одной цифры объёма в этом файле нет — все объёмы `unknown`. Вместо них — план агрегатов
(`node scripts/pm233_purchase_ledger_dry_run.mjs --prod-count-plan`): **35 запросов `.count()`** по 26 продуктам,
только коллекции/фильтры, без выгрузки документов, uid и PII. Скрипт их **не исполняет** (`executes: false`);
запуск — отдельной read-only командой по решению владельца, результат записывается сюда числом + дата + SHA.
13 продуктов агрегатом не считаются (право живёт только в локальном хранилище телефона или в сторе):
`coin_rank, profile_card_pro, themes, streak_freeze, boosts_season_pass, energy, dialog_quota_and_billing,
official_packs, lessons_pearl_unlock, tournaments_bank, max_subscription, friend_gifts, quests` — для них объём
можно получить только из консолей сторов/RevenueCat или из строки-итога миграции на телефоне
(как `gifts_to_coins_migrations`).

Стоимость будущего прод-подсчёта: агрегат `.count()` тарифицируется ≈1 чтение на 1000 записей индекса;
35 запросов — разово, порядок десятков–сотен чтений (точно — `unknown` до запуска). Постоянной нагрузки нет:
новых jobs/listeners/таймеров/cron этот пакет не добавляет; сам скрипт читает только файлы репозитория.

## Ledger

Колонки: продукт → деньги (`real` реальные · `in_app` внутриигровые · `granted` выдано · `mixed` · `record`) →
источник транзакции → где хранится право → писатели (W) / читатели (R) `file:line` на HEAD →
судьба в 2.0 по `docs/MIGRATIONS.md` / `03_DECISIONS.md` / `PROGRESS.md` (D30–D65) → статус → риск потери.
Живые места каждого маркера печатает `--json` (`liveLocations`).

| # | Продукт / право | Деньги | Источник транзакции | Где хранится | Писатели / читатели | Судьба в 2.0 | Статус | Риск |
|---|---|---|---|---|---|---|---|---|
| 1 | **Plus — подписка в сторе (месяц / год)** `plus_store_subscription` | real | RevenueCat: покупка в приложении (Purchases.purchasePackage) → вебхук INITIAL_PURCHASE/RENEWAL/CANCELLATION/EXPIRATION/TRANSFER; ручная сверка revenueCatPremiumReconcileMine | RevenueCat (источник правды); users/{uid}.premium, premiumExpiry; users/{uid}.progress.premium_rc_*; users/{uid}/access_projection/current; revenuecat_premium_events; revenuecat_premium_lineages; revenuecat_reconcile_reservations | W: `app/paywall_purchase.ts:661`, `app/manage_subscription_purchase.ts:76`, `functions/src/revenuecat_shards.ts:697`, `functions/src/revenuecat_shards.ts:1295`, `functions/src/revenuecat_reconcile.ts:389`, `functions/src/access_projection.ts:79`, `functions/src/premium_expiry_cron.ts:296`<br>R: `app/revenuecat_premium_access.ts:37`, `components/PremiumContext.tsx:573`, `functions/src/premium_status.ts:233`, `app/revenuecat_projection_sync.ts:58` | Сохраняется. Единственный пейвол — «Честный пробный период» (D115/D116/D117). В Account V2 не копируется — derive из RevenueCat/access_projection (inventory p.plus, r.plus, s.plus). (D115, D116, D117) | keep | high |
| 2 | **Plus — пожизненный (разовая покупка в сторе)** `plus_store_lifetime` | real | RevenueCat NON_RENEWING_PURCHASE phraseman_premium_lifetime_v1 → тот же вебхук | как у подписки + premium_rc_product_id = phraseman_premium_lifetime_v1 (lineage kind lifetime) | W: `functions/src/revenuecat_shards.ts:229`, `functions/src/revenuecat_premium_lineage.ts:113`<br>R: `app/revenuecat_init.ts:43`, `app/revenuecat_premium_access.ts:15` | Сохраняется (вечный Pro). Для владельцев вечного Pro призы рулетки — монеты (D100/D105). (D100, D105) | keep | high |
| 3 | **Оплаченные чеки Plus, которые НЕ дали доступ (denials)** `plus_revenuecat_denials` | real | Тот же вебхук: отказ owner_lineage_limit / transfer_lineage_limit / удалённый аккаунт / неизвестная среда | revenuecat_premium_denials/{receiptId или transfer_*} | W: `functions/src/revenuecat_shards.ts:500`, `functions/src/revenuecat_shards.ts:655`, `functions/src/revenuecat_shards.ts:1125`<br>R: `functions/src/jarvis/all_departments_callables.ts:173` | Решения 2.0 нет. Это люди, которые заплатили, но Plus не получили. | needs_decision → Q-233-1 | high |
| 4 | **Plus с сайта (Stripe / PayPal, воронка knowlyapps.com/start/)** `plus_web_checkout` | real | webCheckoutCreate → stripeWebhook; paypalOrderCreate → paypalOrderCapture; выдача ВРУЧНУЮ через промокод (promoCodeRedeem / админка) | web_premium_orders/{id} (status paid_pending_manual_activation и далее); после активации users/{uid}.progress.vip_* (vip_plan promo/promo_lifetime); Stripe-подписка у провайдера | W: `functions/src/web_checkout.ts:2957`, `functions/src/web_checkout.ts:3113`, `functions/src/web_checkout.ts:3311`, `functions/src/promo_codes.ts:262`<br>R: `functions/src/web_checkout.ts:3437`, `functions/src/web_activation_reminders.ts:26`, `functions/src/email_delivery_watchdog.ts:39` | Решениями 2.0 не затронуто — продолжает работать. | keep → Q-233-2 | high |
| 5 | **Plus за Telegram Stars (бот)** `plus_telegram_stars` | real | telegramPremiumWebhook (successful_payment, валюта XTR) → заявка; ручная выдача adminActivateTelegramPremiumOrder | telegram_premium_orders, telegram_premium_dead_letter; после активации users/{uid}.progress.vip_* | W: `functions/src/telegram_premium_bot.ts:670`, `functions/src/telegram_premium_bot.ts:1036`, `functions/src/telegram_premium_admin.ts:256`<br>R: `functions/src/telegram_premium_bot.ts:546`, `functions/src/admin_alert_sources_revenue.ts:183` | Решениями 2.0 не затронуто. | keep | medium |
| 6 | **Промокоды и подарочные сертификаты на Plus** `plus_promo_and_certificates` | mixed | promoCodeRedeem (код из админки, веб-заказа, сертификата, Telegram); партии сертификатов adminCreateGiftCertificateBatch | promo_codes/{code}; users/{uid}/promo_redemptions/{code}; gift_certificate_deliveries; gift_certificate_archive; admin_gift_certificate_batch_operations; результат — progress.vip_* (vip_plan promo) | W: `functions/src/promo_codes.ts:182`, `functions/src/promo_codes.ts:423`, `functions/src/web_checkout.ts:2180`, `app/promo_code_client.ts`<br>R: `functions/src/promo_codes.ts:614`, `functions/src/admin_daily_digest.ts:785` | Решениями 2.0 не затронуто; погашенный код = выданный VIP, хранится в progress.vip_* (derive). | keep | medium |
| 7 | **Plus-дни без стора: VIP из админки, реферальный VIP, квесты, рулетка** `plus_vip_admin_referral` | granted | adminGrantAccess (D86 «дни Plus»), adminMigrateLegacyAdminPremium, referralClaimVipReward, adminRepairPendingReferralPurchase, приз рулетки (дни) | users/{uid}.progress.vip_active / vip_plan / vip_from / vip_until / vip_admin_override / vip_admin_grant_at / vip_granted_by / vip_revoked_at; progress.admin_premium_override; локально premium_vip_storage | W: `functions/src/admin_access_controls.ts:158`, `functions/src/referral.ts:415`, `functions/src/referral.ts:999`, `functions/src/admin_referral_purchase_repair.ts:313`, `functions/src/telegram_premium_admin.ts:212`<br>R: `app/cloud_sync.ts:450`, `app/premium_vip_storage.ts:113`, `functions/src/premium_status.ts:233` | Сохраняется: ручные выдачи — монеты и дни Plus (D86); рулетка — дни Plus (D100). В Account V2 — derive (inventory p.plus). (D86, D99, D100) | keep | medium |
| 8 | **Вводный полный доступ (онбординг) и подарок лояльности** `plus_intro_loyalty` | granted | introFullAccessClaim (сервер, разово); подарок лояльности | users/{uid}.progress.intro_access_until_ms / intro_access_granted_at_ms / loyalty_gift_until_ms / loyalty_gift_granted_at_ms; локально intro_full_access_* | W: `functions/src/gift_access.ts:67`, `functions/src/gift_access.ts:108`, `app/gift_access_cloud.ts:77`<br>R: `app/gift_access_cloud.ts:32`, `app/intro_full_access.ts:53`, `app/cloud_sync.ts:1141` | Сохраняется: онбординг не трогаем (D115, D126). В Account V2 — derive из progress (PLUS_PROGRESS_NOTE). (D115, D126) | keep | low |
| 9 | **Метки «платил за Plus/Pro» для достижений** `plus_paid_achievement_markers` | record | Вебхук RevenueCat при подтверждённой оплате | users/{uid}.progress.achievement_access_plus_paid_v1 / achievement_access_pro_paid_v1 | W: `functions/src/revenuecat_shards.ts:708`<br>R: `app/achievement_progress_v2.ts:12` | Запись-история; в Account V2 derive (inventory p.plus). Достижения остаются (OD8). (OD8) | keep | low |
| 10 | **Жемчуг за реальные деньги (пакеты 30/80/180/420)** `pearls_store_packs` | real | RevenueCat consumable → вебхук; сейчас продукт помечен снятым (лог [D103] revenuecat_shard_product_retired) | revenuecat_shard_transactions; revenuecat_shard_refunds; баланс users/{uid}.shards (+shard_log); локально shards_store_purchased_total_v1, незавершённые покупки app/shards_pending_grants.ts | W: `functions/src/revenuecat_shards.ts:895`, `app/shards_pending_grants.ts`<br>R: `functions/src/admin_shard_refunds.ts:86`, `functions/src/admin_analytics.ts:177`, `functions/src/auth_merge.ts:903` | Сгорает без компенсации (D103, D70); пакеты в сторах снимает владелец. Остатки обнуляет только клиент (D84). (D70, D84, D103) | retire_decided → Q-233-3 | high |
| 11 | **Жемчуг (shards) — заработанный/потраченный баланс и его журналы** `pearls_balance` | in_app | Награды (уроки, репорты, рассылки, квесты, рулетка), траты (темы, ауры, заморозка, уроки, наборы, турниры) | users/{uid}.shards (+shards_updated_*); users/{uid}/shard_log; локальные журналы shards_earn_op_ledger_v1 / shard_spend_op_ledger_v1 / client_shard_semantic_paid_v1; users/{uid}/external_economy_events | W: `app/shards_system.ts:626`, `app/shards_system.ts:806`, `app/pearl_retire_d70.ts`, `functions/src/external_economy_events.ts:52`<br>R: `app/economy/external_shard_event_sync.ts:199`, `functions/src/admin_user_profile.ts:382` | Удаляется без компенсации; клиент один раз обнуляет (pearl_retire_d70, D84). Серверные данные — чистка после релиза (D90). (D70, D84, D90, D103) | retire_decided | medium |
| 12 | **Монеты (бывшие руны) — кошелёк** `coins_wallet` | in_app | Начисления: practiceRuneGrant, videoWatchRunesClaim, levelSpinStarGrant, Шпиль (spire_coins), продажа набора автору, adminGrantReward (coins), рулетка (вечный Pro), квесты, gifts_to_coins; траты: ранг, визитка Про, наборы, диалоги/подсказки/реплики | users/{uid}.stars (баланс), users/{uid}/star_operations/{opId}; users/{uid}.coinWalletLimitsV1, coinReconcileV1; локально журнал app/level_spin_star_grants.ts | W: `app/level_spin_star_grants.ts:1409`, `app/level_spin_star_grants.ts:2110`, `functions/src/stars_ledger.ts:574`, `functions/src/practice_rune_grant.ts:302`, `functions/src/video_watch_runes.ts:188`, `functions/src/level_spin_star_grant.ts:314`, `functions/src/admin_grant.ts:181`, `functions/src/coin_reconcile_v1.ts:313`<br>R: `app/runes_system.ts:79`, `app/level_spin_star_grants.ts:2642`, `functions/src/quests.ts:158` | Остаётся на месте, руны → монеты 1:1 = переименование (D03, OD10; inventory r.runes_balance keep_in_place). (D03, D34, OD10) | keep | high |
| 13 | **Кошелёк курса Learning V2 (звёзды доступа / «руны курса»)** `learning_v2_wallet` | in_app | Награды за сессии курса, +1 за исправленную ошибку (grantMistakeCorrectionReward), бывшая биржа жемчуг→звёзды, settlement | локально learning_v2_owner_repository:v1:<scope> (WalletStateV1, access_star); users/{uid}.v2_access_stars; v2_wallet_reward_receipts | W: `functions/src/learning_v2_wallet_reward_callable.ts:138`, `functions/src/mistake_practice_wallet_reward.ts:183`, `functions/src/coin_exchange_wallet_reward.ts:8`<br>R: `app/learning_v2_wallet_balance_store.ts:98`, `modules/learning-v2/contracts/wallet.ts:76` | Не переносится (OD10, inventory r.stars_balance drop). (OD10) | retire_decided | medium |
| 14 | **Открытые за звёзды «ворота» Learning V2** `learning_v2_access_gates` | in_app | finalizeLearningV2AccessPurchase | users/{uid}/v2_gate_receipts/{seasonId}__{gateId} | W: `functions/src/learning_v2_access_production_callable.ts:16`<br>R: `functions/src/learning_v2_access_production_callable.ts:23` | Решения нет: Learning V2 включён в 2.0 (D96), а кошелёк звёзд не переносится (OD10). (D96, OD10) | needs_decision → Q-233-4 | medium |
| 15 | **Ранг монеты (покупка повышения за монеты)** `coin_rank` | in_app | upgradeCoinRank → prepareRuneSpend (локально) | локально coin_rank_v1:<owner> (+ синхронизация префиксом в cloud_sync) | W: `app/coin_rank_upgrade_v1.ts:66`<br>R: `app/coin_rank_state_v1.ts:21`, `hooks/use_my_coin_rank.ts:17` | Новый продукт 2.0, сохраняется (D34/D60). (D34, D60, D93) | keep | medium |
| 16 | **Визитка «Про» (10 000 монет)** `profile_card_pro` | in_app | purchaseProfileCardPro (локально, списание монет) | локально profile_card_pro_v1:<owner>; публичная проекция public_profiles | W: `app/profile_card_pro_v1.ts:65`<br>R: `app/profile_card_pro_state_v1.ts:14` | Сохраняется (D73, D93, D114). (D73, D93, D114) | keep | medium |
| 17 | **Косметика: образы аватара и ауры (за жемчуг и руны, плюс подарки)** `cosmetics_avatars_auras` | in_app | Старые экраны кастомизации (удалены), подарки | progress/локально custom_avatar_owned_v1, custom_avatar_gift_owned_v1, avatar_aura_owned_v1, avatar_aura_gift_owned_v1, user_avatar_aura | W: `app/cloud_sync.ts:391`, `app/cloud_sync.ts:2533`<br>R: `app/cloud_sync.ts:1608`, `constants/customization_storage_keys.ts:4` | Удаляется целиком, включая купленное (D102, D108); неиспользованные подарки — монетами по таблице gifts_to_coins (D53, D57). (D57, D61, D102, D108) | needs_decision → Q-233-5 | medium |
| 18 | **Темы оформления (раньше за жемчуг)** `themes` | in_app | Покупка темы за жемчуг (удалена), «дедушкины» темы | owned_theme_modes_v1, grandfathered_theme_modes_v1 (локально + progress) | W: `app/theme_ownership_store.ts:87`, `app/theme_ownership_merge.ts:48`<br>R: `app/cloud_sync.ts:379` | Все темы бесплатны (D119) — купленное право стало шире, потери нет. (D38, D119) | keep | low |
| 19 | **Заморозка серии (купленная за жемчуг) и бесплатная заморозка Plus** `streak_freeze` | in_app | Покупка заморозки (удалена); ежемесячная бесплатная для Plus | локально/progress streak_freeze, chain_shield, premium_free_freeze_used | W: `app/premium_freeze_allowance.ts:62`<br>R: `app/(tabs)/home.tsx:2449`, `app/premium_freeze_allowance.ts:48` | Купленные заморозки не переносятся; у Plus бесплатная остаётся (D101, D107, OD7). (D101, D107, OD7) | retire_decided | low |
| 20 | **Бусты (клубный, лиги, XP), Season Pass, щит цепочки** `boosts_season_pass` | in_app | Покупка за жемчуг (Season Pass 350), подарки | club_gift_free_boost_v1, gift_xp_multiplier, chain_shield (progress/root); локально season_pass_gift_inventory_v2:, season_pass_claim_composite_v1: | W: `app/cloud_sync.ts:666`<br>R: `app/gifts_to_coins_inventory_v1.ts:55` | Удаляются вместе с XP и лигой (D58, D09); незабранные награды Season Pass — монеты по таблице (D53); потраченный жемчуг не компенсируется (D70/D103, PM-180). (D09, D53, D58, D70, D103) | retire_decided | low |
| 21 | **Энергия (запас, бонусная энергия из подарков, пропуск дневной квоты)** `energy` | in_app | Восстановление по времени, подарки (бонус), пропуск квоты за жемчуг (удалён, но прочитанные пропуска действуют) | локально energy_state (+progress.energy_state), bonus energy (bonus_energy_store), revenue_quota_pass:v1:* | W: `app/energy_session_operation_ledger.ts:892`, `app/energy_system.ts:152`, `app/bonus_energy_store.ts:39`<br>R: `app/energy_system.ts:74`, `app/revenue_quota_store.ts:53` | Запас 5, сверх — обрезается до 5 (D06, D98); энергия из подарков в компенсации = 0 монет (gifts_to_coins_table ENERGY_ITEM_COINS). (D06, D72, D87, D98) | retire_decided | low |
| 22 | **Диалоги, купленные за руны** `dialog_rune_unlocks` | in_app | buyDialogAccessLocally (сейчас выключено: rank_access_only) → aiDialogSyncPurchase | локально ai_dialog_owned_ids_v1:<stableId>, ai_dialog_owned_outbox_v1:<stableId>; users/{uid}/dialog_access/owned | W: `app/ai_dialog_ownership.ts:138`, `functions/src/ai_dialog_sync_purchase.ts:96`<br>R: `app/ai_dialog_ownership.ts:62` | Старые покупки диалогов за руны не учитываются; доступ — только ранг монеты (D124, D05). aiDialogSyncPurchase в index.ts не экспортируется. (D05, D124) | needs_decision → Q-233-6 | medium |
| 23 | **+10 ответов в Диалогах за 300 монет** `dialog_extra_replies` | in_app | buyDialogExtraRepliesLocally → aiDialogBuyExtraReplies | premium_dialog_quotas/{quota} поле extraCapThisMonth; users/{uid}/reward_claims/dialog_extra_replies_*; локально ai_dialog_extra_replies_* | W: `app/ai_dialog_extra_replies_client.ts:216`, `functions/src/ai_dialog_extra_replies.ts:172`<br>R: `functions/src/premium_dialog.ts:284`, `functions/src/dialog_quota_contract.ts:45` | Квота Free — 30 ответов в месяц (D111); судьба покупки «+10» в 2.0 не записана. (D111) | needs_decision → Q-233-7 | low |
| 24 | **Квота ответов Диалогов и подсказки за монеты** `dialog_quota_and_billing` | in_app | Сервер считает ответы; подсказка — buyDialogHintLocally (разовая трата) | premium_dialog_quotas, premium_dialog_billing; локально счётчик подсказок | W: `functions/src/premium_dialog.ts:68`, `functions/src/premium_dialog.ts:1416`, `app/ai_dialog_hint_economy.ts:123`<br>R: `functions/src/dialog_quota_contract.ts:33` | Free 30/месяц, Plus — тихий потолок 300/сутки (D111, D123). (D111, D123) | keep | low |
| 25 | **Покупка набора сообщества (за руны/монеты; раньше — за жемчуг)** `community_pack_purchase` | in_app | buyCommunityPackLocally (локально, монеты); старые покупки за жемчуг — community_pack_purchases | локально community_pack_paid_ids_v1:<stableId>, community_owned_pack_ids_v1, community_owned_pack_titles_v1; community_pack_purchases (legacy) | W: `app/community_packs/packPurchase.ts:79`, `app/community_packs/schema.ts:34`<br>R: `app/target_storage_keys.ts:559`, `functions/src/account_delete.ts:187` | Наборы сообщества остаются, цена в монетах (D85); членство переносится в Account V2 (inventory p.community_packs carry). Возврат покупки админом удалён (D110). (D68, D85, D110) | keep | medium |
| 26 | **Выплата автору набора за продажу** `community_pack_author_payout` | in_app | communitySyncPackRuneSale (сервер: монеты автору, opId pack_sale:{pack}:{buyer}) | community_pack_rune_sales; users/{author}/community_seller_inbox; users/{author}/star_operations | W: `functions/src/community_pack_rune_sale.ts:140`, `functions/src/community_pack_rune_sale.ts:253`<br>R: `app/community_packs/schema.ts:40` | Выплата монетами (D85). (D85) | keep | low |
| 27 | **Подарочные наборы карточек (ваучеры, гранты из рассылок)** `pack_gifts` | granted | communityRedeemPackGiftVoucher, flashcardPackGiftRedeem, flashcardPackGiftSyncState, flashcardPackGiftGrantGlobalBroadcast | flashcard_pack_gift_claims, flashcard_pack_gift_entitlements, flashcard_pack_gift_grants; локально flashcard_pack_gift_inventory_v2 | W: `functions/src/community_packs.ts:1137`, `functions/src/community_packs.ts:1280`, `functions/src/global_broadcast_claim.ts:181`<br>R: `app/flashcards/pack_trial_gift.ts:38` | Подарки убираются (D09); официальные наборы удалены (D68). Callable всё ещё экспортированы в functions/src/index.ts:602–605. (D09, D68) | needs_decision → Q-233-8 | low |
| 28 | **Официальные наборы карточек (купленные за жемчуг)** `official_packs` | in_app | Магазин наборов (удалён) | flashcards_owned_packs_v1, flashcards_market_dev_owned_v1 (локально + progress) | W: `app/cloud_sync.ts:491`<br>R: `app/target_storage_keys.ts:576` | Удаляются вместе с разделом жемчуга без компенсации (D68; inventory p.official_packs drop). (D68) | retire_decided | low |
| 29 | **Уроки V1, открытые за жемчуг** `lessons_pearl_unlock` | in_app | buyLessonWithPearls (покупка удалена) | локально lessons_pearl_unlocked_v1 (+семантический журнал жемчуга) | W: `app/economy/client_shard_semantic_reducer.ts:112`<br>R: `app/lessons_pearl_unlock_storage.ts:17`, `app/lesson_lock_system.ts:161` | Открытые уроки остаются открытыми (PM-148-A2, D121, D122). (D121, D122) | keep | medium |
| 30 | **Звёзды Арены и купленные за них украшения** `arena_stars_and_shop` | in_app | Матчи Арены, магазин звёзд (клиент удалён D83) | arena_v2_star_ledger, arena_v2_entitlements; progress arena_* | W: `functions/src/arena_expansion_core.ts:26`<br>R: `functions/src/account_delete.ts:318` | Магазин удалён, купленные украшения «в данных не трогаем» (D79); при этом данные Арены чистятся после релиза (D90). (D79, D83, D90) | needs_decision → Q-233-9 | low |
| 31 | **Турниры: взнос/банк в жемчуге** `tournaments_bank` | in_app | tournamentClaimReward (не экспортирован), еженедельная выплата | коллекции турниров; жемчуг | W: `functions/src/tournaments.ts:4516`<br>R: — | Турниры выключены, жемчуг удалён без компенсации (D70). (D70, D74) | retire_decided | low |
| 32 | **Подписка MAX (phraseman_max_monthly_v1)** `max_subscription` | real | RevenueCat; клиент чек больше не признаёт, сверка отвечает retired_max_product | RevenueCat / стор | W: —<br>R: `app/revenuecat_premium_access.ts:7`, `functions/src/revenuecat_reconcile.ts:355` | MAX законсервирован (D11, пломба 2026-09-04). (D11) | needs_decision → Q-233-10 | high |
| 33 | **Минуты голосового звонка MAX (30/120/300) и пробные минуты** `max_voice_minutes` | real | RevenueCat consumable → вебхук (ветка voice_minutes всё ещё начисляет); adminGrantVoiceMinutes; voiceMinuteWalletMine | voice_minute_wallets, voice_minute_events, voice_minute_denials; voice_call_quotas (пробник/резервы), voice_call_billing | W: `functions/src/revenuecat_shards.ts:1342`, `functions/src/voice_minutes.ts:447`, `functions/src/admin_voice_minutes.ts:92`, `functions/src/max_voice_quota.ts:461`<br>R: `functions/src/voice_minutes_api.ts:46`, `modules/voice_minutes/catalog.ts:6` | Законсервировано (D11); код и данные не удаляются. (D11, D81) | needs_decision → Q-233-11 | high |
| 34 | **Реферальная рулетка: спины и призы** `referral_roulette` | granted | referralClaimSpin (за приглашённого) → referralSpin; призы — дни Plus или монеты для вечного Pro | users/{uid}/referral_spin_credit_ledger, users/{uid}/referral_spins; progress referral_spin* | W: `functions/src/referral_claim_spin.ts:69`, `functions/src/referral_spin.ts:138`, `functions/src/referral_spin.ts:430`<br>R: `app/roulette_spin_client.ts:244`, `functions/src/admin_referrals.ts:1021` | Остаётся (D80, D99, D100, D105, D106). (D80, D99, D100, D105, D106) | keep | low |
| 35 | **Подарки, спины уровня (бесплатные и платные), дневной путь** `gifts_level_spins` | in_app | Уровни/подарки (удалены); платный спин за руны | users/{uid}/level_spin_credits, level_spin_results; level_gift_reservations; локально paid_level_spin_envelope_v1 / paid_level_spin_outbox_v1; gifts_to_coins_migrations/{uid} | W: `app/gifts_to_coins_migration_v1.ts:516`, `functions/src/gifts_to_coins_report.ts:98`, `functions/src/level_spin_star_grant.ts:314`<br>R: `functions/src/coin_reconcile_v1.ts:227`, `app/gifts_to_coins_table_v1.ts:24` | Неиспользованное — в монеты при первом запуске 2.0, молча; таблица «Средне» medium.v2 (платный спин ≥ цены, потолок 20 бесплатных, жемчуг 0) (D51, D53, D70). (D09, D51, D53, D65, D70) | convert_decided | medium |
| 36 | **Подарки друзьям** `friend_gifts` | in_app | Подарок другу (удалён) | friend_gifts_sent / friend_gifts_received / friend_gift_history / friend_gift_daily_limits | W: —<br>R: `functions/src/account_delete.ts:274` | Подарки убраны (D09). (D09) | retire_decided | low |
| 37 | **Награды рассылок, за репорты и админ-награды во «входящих»** `broadcast_report_rewards` | granted | globalBroadcastClaim, claimReportReward (ответ на репорт), adminGrantReward | users/{uid}/shard_rewards, users/{uid}/reward_claims | W: `functions/src/admin_grant.ts:190`, `functions/src/global_broadcast_claim.ts:102`, `functions/src/report_replies.ts:525`, `functions/src/referral.ts:1164`<br>R: `app/global_broadcast_modal.ts:413`, `functions/src/admin_user_profile.ts:504` | Жемчуг в наградах заменён монетами; репорт — 300/600/1000 монет (D104, D109). (D104, D109) | convert_decided | low |
| 38 | **Квесты: дни Plus и жемчуг за выполнение** `quests` | granted | questClaimReward | reward_claims + external_economy_events; дни Plus в premium/vip | W: `functions/src/quests.ts:351`, `functions/src/quests.ts:405`<br>R: — | Решения в 2.0 нет (блок «Сегодня» D49 — новая механика). (D49) | needs_decision → Q-233-12 | low |
| 39 | **Коллекционные предметы (сеты, бонус жемчуга за сет)** `collectibles` | granted | collectiblesClaimDrop (выключенная совместимая заглушка) | collectibles_owned_v1, collectibles_state_v1 (server-owned в progress + локально) | W: `functions/src/collectibles_retired.ts:28`, `app/collectibles/storage.ts:195`<br>R: `app/collectibles/storage.ts:101` | В inventory Account V2 — hold no_owner_decision (p.collectibles). | needs_decision → Q-233-13 | low |

Рамки профиля (`user_frame`): покупки в коде не найдено — это выбор оформления, не право. Карточные
«tiers» из матрицы MIGRATIONS (`card tiers`) в коде на HEAD не найдены (0 совпадений) — отдельной строки нет.
Тестовый «без Plus» (`app/tester_premium_override.ts`) — только локальный переключатель, прав не хранит.

## Открытые вопросы владельцу (решение не закрываю сам)

- **Q-233-1** (`plus_revenuecat_denials`, риск высокий): оплаченные, но отклонённые чеки Plus (`owner_lineage_limit`,
  `transfer_lineage_limit`, удалённый аккаунт) — разбирать вручную, выдать дни Plus (D86) или оставить?
- **Q-233-2** (`plus_web_checkout`): подтвердить, что веб-оплата (Stripe/PayPal) и ручная активация живут в 2.0 без
  изменений; заказы в `paid_pending_manual_activation` уже оплачены.
- **Q-233-3** (`pearls_store_packs`, высокий): пакеты жемчуга уже сняты в App Store / Google Play (D103)? Вебхук теперь
  ничего не начисляет за `phraseman_shards_*` — нужен ли ручной возврат за покупки после снятия на сервере?
- **Q-233-4** (`learning_v2_access_gates`): ворота Learning V2, открытые за звёзды (`v2_gate_receipts`), остаются
  открытыми, раз звёзды не переносятся (OD10), а V2 входит в 2.0 (D96)?
- **Q-233-5** (`cosmetics_avatars_auras`): образы/ауры, купленные за **руны** (= монеты 2.0), удаляются без возврата
  монет (D108) — или по «индивидуальной политике ledger» из MIGRATIONS?
- **Q-233-6** (`dialog_rune_unlocks`): диалоги, купленные за руны, «не учитываются» (D124) — вернуть потраченные монеты
  или нет?
- **Q-233-7** (`dialog_extra_replies`): покупка «+10 ответов за 300 монет» остаётся в 2.0? Купленное в текущем месяце
  сохраняется в месячном счётчике (D111)?
- **Q-233-8** (`pack_gifts`): непогашенные ваучеры на наборы сообщества — в библиотеку, в монеты или аннулировать?
  И снимать ли 4 экспортированных callable подарков наборов (D78)?
- **Q-233-9** (`arena_stars_and_shop`): D79 «купленные украшения не трогаем» против D90 «данные Арены чистятся» —
  исключает ли чистка `arena_v2_entitlements`? Остаток звёзд Арены — без компенсации?
- **Q-233-10** (`max_subscription`, высокий): есть ли активные подписки `phraseman_max_monthly_v1`? Клиент и сверка их
  больше не признают, а стор может продолжать списывать деньги — отменить/вернуть (делает владелец в консолях).
- **Q-233-11** (`max_voice_minutes`, высокий): остатки купленных минут MAX — заморозить до возврата раздела или вернуть
  деньги? Сняты ли пакеты минут с продажи (ветка вебхука `revenuecat_shards.ts:1342` всё ещё зачисляет минуты)?
  Оставлять ли кнопку `adminGrantVoiceMinutes` в админке?
- **Q-233-12** (`quests`): квесты (`questClaimReward`, награды — дни Plus и жемчуг) остаются в 2.0? Если да — жемчуг → монеты?
- **Q-233-13** (`collectibles`): коллекции удаляются в 2.0 (в инвентаре Account V2 сейчас `hold no_owner_decision`)?

## Расхождения, найденные по пути (не исправлял — вне scope)

1. **Жемчуг ×10 в MIGRATIONS устарел.** `docs/MIGRATIONS.md` («Жемчуг → остаток ×10 монет»), D15, D45 и D53
   («жемчуг ×10») отменены D70/D84/D103 — жемчуг сгорает без компенсации. Код уже следует D70: таблица
   `app/gifts_to_coins_table_v1.ts:33` `PEARL_COINS = 0` (версия `medium.v2`). В формулировке пакета «жемчуг→монеты D103»
   — D103 как раз про сгорание, не про конвертацию. Матрицу MIGRATIONS стоит пометить `superseded`.
2. **Инвентарь Account V2 не знает 7 подколлекций прав** `users/{uid}/*`: `dialog_access`, `reward_claims`,
   `promo_redemptions`, `shard_rewards`, `referral_spins`, `v2_gate_receipts`, `external_economy_events`
   (`functions/src/accounts_v2_migration/inventory.ts:274–308`). По его же правилу они уйдут в `hold/unknown_field`
   и остановят перенос аккаунта. Нужна строка-судьба для каждой (связано с Q-233-4/6/7/8).
3. **MAX законсервирован, но деньги за минуты всё ещё принимаются:** ветка `voice_minutes` вебхука
   (`functions/src/revenuecat_shards.ts:1317–1343`) и `voiceMinuteWalletMine` (`functions/src/index.ts:906`) живы,
   `adminGrantVoiceMinutes` вызывается из `admin/v2/legacy.html`. Клиентского потребителя минут нет. → Q-233-11.
4. **`aiDialogSyncPurchase` не экспортирован** (`functions/src/ai_dialog_sync_purchase.ts:96` есть, в `index.ts` нет),
   а клиент (`app/ai_dialog_ownership.ts:292`) его вызывает. Покупка за руны выключена флагом (`rank_access_only`),
   но старые записи в outbox будут вечно получать not-found. Влияет на Q-233-6.
5. **Компенсация подарков считается только на телефоне** (`app/gifts_to_coins_migration_v1.ts:516`); сервер видит
   одну строку-итог (`gifts_to_coins_migrations`). Для ledger это значит: объём компенсации в проде появится только
   после релиза 2.0 и только у тех, кто запустил приложение.

## Связь с критериями

- **PM-233-A1** — выполнено как evidence: источник транзакций и список затронутых продуктов есть (таблица выше +
  `LEDGER`), хранилище и писатели/читатели указаны, полнота подтверждена сторожем по маркерам кода. Приёмка — за
  ревьюером и владельцем (13 открытых вопросов).
- **PM-233-A2** — выполнено как формат: объёмы `unknown`, есть план агрегатов без PII; фактический прод-подсчёт
  NOT_RUN (нужна команда владельца).

## Проверки

- `node --test scripts/pm233_purchase_ledger_dry_run.test.mjs` — 5/5 pass (≈2 с).
- `node scripts/pm233_purchase_ledger_dry_run.mjs --check` — `products=39 markers=203 uncovered=0 stale=0`, код 0.
- `node scripts/pm233_purchase_ledger_dry_run.mjs --prod` — отказ, код 2.
- Все `file:line` из `LEDGER` существуют на HEAD (проверено скриптом: 0 битых ссылок).
- Эмулятор Firestore: NOT_RUN (сухой прогон по коду; эмулятору нечего показать без сидов покупок).
- Прод-агрегаты: NOT_RUN (по правилам пакета).
- Независимое ревью полноты: NOT_RUN (делает координатор).

## Откат

Три новых файла (`scripts/pm233_purchase_ledger_dry_run.mjs`, `.test.mjs`, этот evidence) — удаление = откат.
Код приложения, функций, правила, данные не менялись.

## Ответы владельца (2026-10-01) → D136–D140
- Q-233-10/11 (MAX): удалить денежный код MAX (ветка вебхука минут, подписка, `adminGrantVoiceMinutes`), ничего не возвращать — D136.
- Q-233-1 (denials Plus): выдать всем Plus; прод — только по команде владельца — D137.
- Q-233-5/6 (косметика, диалоги за руны): без возврата — D138.
- Q-233-2: веб-оплата остаётся; Q-233-3: приём покупок жемчуга — удалить код; Q-233-4: ворота V2 никто не открывал; Q-233-7: «+10 ответов» убрать — D139.
- Q-233-8: подарочные наборы — удалить код, ваучеры аннулировать; Q-233-9: Арена — чистить (D90); Q-233-12/13: квесты и коллекции убрать — D140.
