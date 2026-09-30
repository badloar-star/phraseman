# D70 — инвентаризация жемчуга (shards) и ход удаления (2026-09-30)

Решения: D70 (удалить вместе с остатками, без компенсации; D15 отменён), D84 (остатки
обнуляет только клиент, боевую базу не трогаем), D78 (удалять код, не заглушки), D85
(наборы сообщества — за монеты), D86 (админ-выдачи: монеты и дни Plus), PM-148-A2
(уроки, открытые жемчугом, остаются открытыми).

Терминология в коде: **жемчуг = `shards`/«осколки»/`oskolok`/`pearls`**; **монеты =
руны = `stars`** (клиент — `app/level_spin_star_grants.ts`, сервер — `functions/src/stars_ledger.ts`).
«Биржа монет» (`coin_exchange*`) на деле меняла ЖЕМЧУГ на звёзды курса Learning V2.

Не относится к валюте (пропускать при поиске): `modules/learning-v2/content/**`,
`*session_shard*`/`*course_shard*` (нарезка контента), `owner_repository*` (radix-шарды),
`tournament*` room sharding, косметика `aura-pearl-breath`, материал аватара `pearl`.

Действия: **delete** · **convert-to-coins** · **keep-history-read-only** ·
**UI-owned-by-design** (правит сессия «Дизайн»). Статус: ✅ сделано в этом заходе,
⏳ осталось.

## 1. Сделано в этом заходе

| Путь | Тип | Действие | Статус |
|---|---|---|---|
| `app/coin_exchange.tsx`, `app/coin_exchange_client.ts`, `app/coin_exchange_wallet_outbox.ts` | spend (UI + клиент биржи) | delete | ✅ |
| `app/_layout.tsx` — `Stack.Screen coin_exchange`, эффект `resumePendingCoinExchangeWalletRewards` | bootstrap | delete | ✅ |
| `app/navigation_back.ts` `'/coin_exchange'`; `components/dev/motion_showcase/sections/screens_profile.tsx` пункт; `showcase_copy.ts` `coin_exchange_title` | route/UI-copy | delete | ✅ |
| `app/learning_v2_owner_repository_runtime.ts` `commitLearningV2CoinExchangeReward` | grant (обёртка) | delete (тест переведён на `commitLearningV2ServerWalletReward`) | ✅ |
| `metro.config.js` стор-заглушка, `store_release_stubs/coin_exchange_wallet_outbox_stub.ts`, `router.ctx.js` исключение | build | delete | ✅ |
| `functions/src/coin_exchange.ts` (+`coin_exchange_core.ts`, тесты): `getCoinExchangeQuote`, `getCoinExchangeHistory`, `exchangeCoinsForStars`, `adminSetCoinExchangeRate`, `recalcCoinExchangeRate` (крон), `adminGetCoinExchangeCenter` | server spend/cron | delete (+ экспорты в `functions/src/index.ts`, `functions-admin/index.ts`) | ✅ |
| `functions/src/shards_apply_delta.ts` (+тест) | server (отключённая заглушка) | delete (+экспорт) | ✅ |
| `functions/src/shard_reward_catalog.ts` (+тест) | server (мёртвый код) | delete | ✅ |
| `app/energy_shard_refill.ts` (+`tests/energy_refill_price_fairness.test.ts`), событие `energy_purchased_shards` | spend (живых вызовов не было) | delete | ✅ |
| `app/quota_day_pass.ts` (+`tests/quota_day_pass_contract.test.ts`), `REVENUE_DAY_PASS_PRICE_PEARLS` | spend (живых вызовов не было) | delete; уже купленные пропуска читает `revenue_daily_quota.ts` | ✅ |
| `app/release_wave_bonus.ts` (+probe), `RELEASE_WAVE_BONUS_*` в `app/config.ts` | grant (выключен) | delete | ✅ |
| `app/pearl_retire_d70.ts` + запуск в `app/_layout.tsx` (+20 с, лениво) | balance | **новая** одноразовая/идемпотентная миграция `[PEARL-RETIRE]`: одно списание всего остатка в журнале жемчуга; Firestore не трогает; `lessons_pearl_unlocked_v1` не трогает | ✅ |
| `app/cloud_sync.ts` префикс `pearl_retire_d70_receipt_v1:` | storage-key | account-local | ✅ |
| `tests/d70_pearls_removed.probe.ts` | ратчет | новый | ✅ |

## 2. Клиент — ядро и логика (не UI)

| Путь | Тип | Что | Действие | Риск |
|---|---|---|---|---|
| `app/shards_system.ts` (2.7k строк) | balance/ledger/sync/spend/grant | баланс, `addShards*`, `spendShards*`, `commitShard*`, `awardOneTime*`, `claimReferralSpinPearls`, `loadShardsFromCloud`, `forceSyncShardsToCloud`, очередь `shardsApplyDelta` | delete ПОСЛЕ снятия всех вызовов (40 импортёров); до того — keep (history) | очень высокий: смена аккаунта, lock'и |
| `app/economy/client_shard_operation_ledger.ts` | ledger | неизменяемый журнал + зеркало PhoneState | keep-history-read-only, потом delete вместе с ядром | очень высокий |
| `app/economy/client_shard_semantic_reducer.ts` | ledger/history | материализация грантов при слиянии; `lesson_pearl_unlock` → `lessons_pearl_unlocked_v1` | keep-history-read-only (исторические открытия уроков) | высокий |
| `app/economy/external_shard_event_sync.ts` | sync/credit | применяет `users/{uid}/external_economy_events` | keep, пока сервер пишет события; потом delete | высокий |
| `app/economy/client_shard_operation_sync.ts`, `client_shard_semantic_id.ts`, `economy_daily_stats_reporter.ts` | sync/ledger | шимы | delete с ядром | низкий |
| `app/shards_delta_queue.ts` | sync | офлайн-очередь к удалённому `shardsApplyDelta` (сервер теперь ответит not-found → очередь снимет строку как перманентный отказ) | delete | средний (auth_provider, cloud_sync) |
| `app/shards_pending_grants.ts` | sync (реальные деньги) | незавершённые покупки жемчуга RevenueCat | keep-history-read-only до вопроса В-3 | высокий |
| `app/lessons_pearl_unlock.ts` | spend (выключен флагом) | `buyLessonWithPearls` | delete — **блок: импортирует `app/(tabs)/lessons.tsx` (Дизайн)** | низкий |
| `app/lessons_pearl_unlock_flag.ts` | spend gate | `LESSON_PEARL_UNLOCK_ENABLED=false` | delete вместе с выше | низкий |
| `app/lessons_pearl_unlock_storage.ts`, `lesson_lock_system.ts`, `lessons_tab_state.ts`, `monetization_policy.ts` | history | чтение исторических открытий | **keep-history-read-only (PM-148-A2)** | средний |
| `app/streak_freeze_purchase.ts` | spend | заморозка за 10 жемчуга | convert-to-coins или delete — **вопрос В-1** | средний |
| `app/streak_revive.ts` | spend | восстановление серии 15–100 жемчуга | convert-to-coins или delete — **вопрос В-1** | средний |
| `app/customization_purchase_intent.ts`, `customization_purchase_validation.ts`, `customization_purchase_cta.ts`, `customization_catalog.ts`, `customization_draft.ts`, `customization_snapshot.ts`, `constants/custom_avatars.ts`, `constants/avatar_auras.ts` | spend | аватар/аура/рестайл за жемчуг ИЛИ руны; реальных денег нет | convert-to-coins (руновая ветка уже есть) — **вопрос В-2** по ценам; старые v1-намерения читать | высокий |
| `app/lesson_bonus_grant.ts` | grant (0) | `addShards('lesson_first')` + retry | delete вместе с вызовом в `lesson_complete.tsx` | низкий |
| `app/report_reward_bundle.ts`, `app/app_messages.ts`, `app/user_notifications.ts` | grant | `pearls` в наборе награды за репорт | delete ветку жемчуга; старые 4-польные наборы парсить | высокий (сервер синхронно) |
| `app/global_broadcast_modal.ts` | grant | `rewardType:'shards'` | delete ветку (сервер синхронно) | средний |
| `app/collectibles/storage.ts` | grant | `bonusShards` сет-бонус | delete ветку | средний |
| `app/survey_flow_controller.ts`, `survey_client.ts`, `survey_offer_model.ts`, `survey_completion_marker.ts` | grant (0) | награда жемчугом 0 | delete проводку награды; опросы оставить | низкий |
| `app/roulette_prizes.ts`, `app/roulette_spin_client.ts` | grant | призы-жемчуг рулетки (сервер рулетку свернул) | delete | средний |
| `app/daily_journey_rewards.ts`, `daily_journey_gift_*.ts`, `daily_journey_copy.ts` | grant (мёртвый) | ячейки `pearls` | delete ячейки; старые `pearls` парсить | средний |
| `app/level_gift_system.ts`, `level_spin_reward_catalog.ts`, `level_spin_local_contract.ts`, `modules/phone-state/domains/economy.ts` (`pearls_N`) | history | id призов в старых квитанциях | **keep-history-read-only** (иначе рунный кошелёк читается как битый) | высокий |
| `app/achievement_*_v2.ts`, `app/achievements.ts`, `constants/achievement*` | history/UI | ачивки «держи N жемчуга» | снять вычисление; открытые оставить | средний |
| `app/lifetime_profile_stats.ts`, `stats_daily_breakdown.ts`, `statsCache.ts`, `user_stats.ts`, `app_snapshot_*.ts`, `home_screen_hydration.ts`, `streak_safety.ts`, `target_storage_keys.ts` | history/balance | счётчики/поля жемчуга | delete поля | низкий |
| `app/mastery.ts`, `profile_card_system.ts`, `config.ts`, `paywall_copy.ts`, `shop_catalog.ts`, `flashcards/marketplace.ts`, `flashcards/constants.ts`, `events.ts` (`shards_*`), `energy_visual_transactions.ts`, `reward_flight_*.ts` | UI-copy/constants | остатки (нули, цены, ярлыки) | delete | низкий |
| `app/oskolok.ts`, `app/coin_icons.ts` (`PEARL_ICONS`), `app/shard_earn_ui.ts`, `constants/shard_plurals.ts`, `shard_modal_chrome.ts`, `terms_es.ts`, `customization_storage_keys.ts`, `levelGiftRewardIcons.ts` | UI-copy | иконки/склонения | delete после снятия UI | низкий |
| `app/pearl_store_retired.ts` | UI-copy | тост «мало жемчуга» | delete вместе с `streak_stats.tsx`/`StreakReviveModal.tsx` | низкий |
| `app/dev_shards_grant.ts` | grant (dev) | — | **не трогал: dev*Grant удаляет другой исполнитель** | — |
| `app/revenuecat_pending_correlation.ts`, `firebase.ts` (аналитика покупок жемчуга) | sync/history | — | delete после В-3 | средний |
| `app/auth_provider.ts`, `auth_clean_install_recovery_adoption.ts`, `referral_bootstrap.ts`, `cloud_sync.ts` | sync | `loadShardsFromCloud`, очереди при смене аккаунта | delete последними | высокий |
| `modules/learning-v2/contracts/access_boost.ts`, `access_quote.ts`, `policies/decision_registry.ts`, `progress/*` (`awarded.shards`) | contract/history | хэшируемые контракты | keep (дрейф хэшей) — вопрос В-6 | высокий |
| `community_packs/*` | spend | **уже в рунах** (`priceRunes`); `priceShards:0` только совместимость | delete compat-поле | низкий |

## 3. Клиент — экраны

| Путь | Что | Действие |
|---|---|---|
| `app/(tabs)/home.tsx`, `components/home/use_home_reward_collect.ts` | баланс/иконка жемчуга, заморозка за 10 жемчуга, анимации | **UI-owned-by-design** |
| `app/(tabs)/lessons.tsx` | `buyLessonWithPearls`, кнопка «Открыть · N» | **UI-owned-by-design** |
| `app/lesson_menu.tsx`, `components/NoEnergyModal.tsx`, `components/survey/SurveyRewardPanel.tsx`, `components/ReportErrorButton.tsx` | только комментарии | UI-owned-by-design |
| `app/streak_stats.tsx`, `components/StreakReviveModal.tsx` | трата на заморозку/восстановление, строки «заработано/потрачено» | convert-to-coins или delete (В-1) |
| `app/lesson_complete.tsx`, `exam.tsx`, `diagnostic_test.tsx`, `level_exam.tsx`, `components/level-exam/LevelExamV2.tsx`, `lesson_words.tsx`, `lesson_irregular_verbs.tsx`, `preposition_drill.tsx`, `lesson1.tsx`, `learning-v2/session/[id].tsx` | начисления с суммой 0 | delete вызовы |
| `app/referrals.tsx`, `components/roulette_win_modal.tsx` | приз-жемчуг рулетки | delete ветку |
| `app/shop.tsx` | превью-кошелёк/категория `pearls` | convert-to-coins |
| `app/shards_shop.tsx` | уже редирект | delete (+`Stack.Screen`, `appArtBackdropRegistry`, витрина, `pm057` проба) |
| `app/flashcards/CardPackShardPaywallModal.tsx`, `app/flashcards_collection.tsx`, `app/flashcards_market_dev.tsx` | ветка `currency='shards'`; прод уже в рунах | delete ветку жемчуга |
| `components/GlobalShardsEarnedHost.tsx` (+слот `shardsEarned` в `overlay_arbiter_core.ts`) | тост «+N жемчуга» | delete |
| `components/GlobalBroadcastModal.tsx`, `NotificationCenterButton.tsx`, `AppMessagesInbox.tsx`, `FirstPurchaseSealCelebration.tsx`, `daily_journey/DailyJourneyRevealScene.tsx`, `customization/*`, `flashcards/FlashcardsHubHeader.tsx`, `ThemeContext.tsx` (`setOskolokThemeMode`), `reward_v2/RewardCardV2.tsx`, `RegistrationPromptModal.tsx`, `RewardModalBackdrop.tsx` | показ/иконки жемчуга | delete / convert-to-coins |
| `app/(tabs)/settings.tsx`, `components/account/AccountLogoutFlow.tsx` | «незавершённое списание жемчуга» при смене аккаунта | delete вместе с очередью |
| `components/dev/**` | витрина | delete пункты |

## 4. Сервер (`functions/src`)

| Путь | Тип | Что | Действие | Риск |
|---|---|---|---|---|
| `admin_grant.ts` `adminGrantReward` (`type:'shards'`), `adminSetShardBalance` | server grant | внешние события жемчуга | `adminSetShardBalance` delete; `adminGrantReward` → монеты — **вопрос В-4** (см. ниже) | средний; админка шлёт `type:'shards'` из 4 мест |
| `revenuecat_shards.ts` | grant (реальные деньги) | продукты `phraseman_shards_30/80/180/420`, возвраты; тот же вебхук обслуживает Plus | снять ТОЛЬКО ветку жемчуга, вебхук оставить — **вопрос В-3** | высокий |
| `admin_shard_refunds.ts` | history | список возвратов | keep-history-read-only до В-3 | низкий |
| `report_replies.ts`, `admin_reports_center.ts` | grant | `pearls` в `REPORT_REWARD_TIERS` | delete поле синхронно с клиентом и админкой | высокий |
| `global_broadcast_claim.ts`, `admin_global_broadcast.ts`, `global_broadcast_public_schema.ts` | grant | `rewardType:'shards'` | delete тип | средний |
| `referral_spin.ts`, `referral_spin_logic.ts` | grant | `REFERRAL_SPIN_PRIZE_PEARLS` | delete (рулетка свёрнута) | средний |
| `admin_referrals.ts` | history | откат старых реф. бонусов жемчугом | keep-history-read-only | средний |
| `community_packs.ts` | spend/grant | `UGC_PACK_PRICE_SHARDS=10`, `priceShards`, возврат 10 жемчуга, `LEVEL_GIFT_*shards*` | convert: возврат в руны; `priceShards` только читать | средний |
| `community_pack_rune_sale.ts` | grant (руны) | выплата автору монетами | keep — **D85 уже выполнено** | — |
| `tournaments.ts`, `tournament_weekly_payout.ts`, `tournament_economy.ts` | spend/grant | взнос/банк турнира в жемчуге | delete/convert — зона соревнований, не трогал | высокий |
| `arena_v2*.ts` | grant | `{kind:'shards'}` сезонная награда | **не трогал: Арена** | — |
| `shard_survey*.ts` | server | опросы; награда уже 0 | оставить опросы, снять `rewardShards` | низкий |
| `learning_v2_access_*`, `content_studio/decision_registry.ts` | contract | `accessBoostPriceShards` | вопрос В-6 | высокий |
| `admin_user_profile.ts`, `admin_daily_digest.ts`, `admin_alert_sources_revenue.ts`, `admin_analytics*.ts` | analytics-read | выручка/история жемчуга | keep-history-read-only (история выручки) | низкий |
| `auth_merge.ts`, `account_delete.ts` | ledger | спеки слияния/удаления коллекций жемчуга | **keep** (право на удаление данных) | — |
| `external_economy_events.ts` | ledger | общий писатель событий | keep до снятия всех вызовов | — |
| `dev_shards_grant.ts` | dev | — | не трогал (другой исполнитель) | — |
| `firestore.rules` | rules | `hasNoShardWrites` (оставить), `shard_operation_receipts`/`shard_earn_daily_counters` (мёртвые, можно снять), `coin_exchange_trades`/`economy_exchange_history` (история) | правка правил — отдельно, с деплоем владельца | низкий |

## 5. Админка `admin/v2/legacy.html`

Выдачи жемчуга: `bulkGrantShards` (≈50674), `window.grantReward` `REWARD_TYPES=[shards]`
(≈46240), `editShards` → `adminSetShardBalance` (≈22757), кнопка «💎» у репорта (≈27760),
рассылка `rewardType shards` (≈29245–29554), набор награды репорта с `pearls` (≈28024,
28281–28323). Показ: колонка/сортировка баланса (≈21506–21640), секция «Осколки» в карточке
(≈22618–22700), центр возвратов RevenueCat (≈30241–30394), аналитика `an2-shards`, воронка
`shards_shop_*`, «Задания» (`QUEST_REWARD_KINDS` с `pearls`, сервер уже отвергает).
Действие: снять вместе с серверными путями (по D86 — оставить монеты и дни Plus).
**В этом заходе не менялась** (файл активно правят другие сессии; серверный контракт
`adminGrantReward` не менялся, так что админка не сломана).

## 6. Почему `adminGrantReward` не переведён на монеты (В-4)

Серверный путь монет есть (`stars_ledger.ts`: `prepareStarOperations`/`commitStarOperations`,
причина `'admin_grant'` уже объявлена). Но клиентский кошелёк монет подхватывает
`users/{uid}.stars` только в ответах Арены, видео и диалогов (`mergeLevelSpinServerStars`);
общего канала «сервер начислил монеты → кошелёк на телефоне» нет, а Арена удаляется.
Перевод выдачи без канала доставки = админ «выдал», человек не увидел. Тот же вопрос
касается выплат авторам наборов (D85).

## 7. Вопросы владельцу

- **В-1.** Заморозка серии (10 жемчуга) и восстановление серии (15–100 жемчуга): перевести
  на монеты (по какой цене?) или удалить функции целиком?
- **В-2.** Кастомизация (аватар/аура/рестайл) продавалась за жемчуг ИЛИ руны; реальных денег
  нет. Оставить только цену в монетах (какую для ауры — у неё была только цена в жемчуге)?
- **В-3.** Жемчуг, купленный за РЕАЛЬНЫЕ деньги (RevenueCat `phraseman_shards_*`, магазин
  закрыт PM-057): обнуляем без компенсации и возвраты этих покупок сервер больше не
  обрабатывает — подтвердить? Незавершённые оплаченные зачисления (`shards_pending_grants`)
  после D70 тоже просто сгорают?
- **В-4.** Канал доставки серверных монет на телефон после удаления Арены (см. §6) — нужен
  для D86 (админ-выдача монет) и D85 (выплата автору).
- **В-5.** Награды за репорт/рассылки/сет-бонус коллекций сейчас частично в жемчуге —
  убрать жемчужную часть без замены или добавить монеты?
- **В-6.** Хэшируемые контракты Learning V2 (`accessBoostPriceShards`, `awarded.shards`):
  переименование сломает подписи — оставляем как есть?

## 8. Проверки этого захода

См. отчёт исполнителя (команды и точные результаты).

## 9. Заход 2 (2026-09-30): решения D101–D104, D85, D86

Ратчет `tests/d70_pearls_removed.probe.ts`: **34 → 11** файлов.

| Решение | Что сделано |
|---|---|
| D101 | `hall_of_fame_utils.ts` больше не создаёт оффер восстановления (`markStreakLost` снят) — серия просто сбрасывается. `streak_stats.tsx`: убраны платная заморозка, модалки «подтвердить/не хватает жемчуга», восстановление, мёртвый `StreakStatsHero`; осталась только бесплатная заморозка Plus. `streak_freeze_purchase.ts`, `streak_revive.ts`, `StreakReviveModal.tsx` держатся ТОЛЬКО импортом из `app/(tabs)/home.tsx` (Дизайн). |
| D102 | Удалён мёртвый кластер редактора/покупки косметики: 14 модулей `app/customization_*` (purchase_intent, editor_*, purchase_*, rune_purchase, dev_*, draft, service, catalog) + 5 компонентов `components/customization/*` и их тесты. Рендер уже купленных аур/аватаров (AvatarView, custom_avatars, avatar_auras, snapshot/selection) пока жив. |
| D103 | `revenuecat_shards.ts`: пакеты `phraseman_shards_*` не начисляются, возвраты не списываются — лог `[D103]` + алерт `revenuecat_webhook_shards` на оплату. Plus/Pro/минуты голоса не тронуты. |
| D104 | Рассылки: тип `coins` через `stars_ledger` (новая причина `global_broadcast`, grant), клиент доливает снапшот через `mergeLevelSpinServerStars`; старый `shards` → ничего. Репорты: жемчужная часть набора не начисляется (монеты 300/600/1000 уже в наборе). Сет-бонус коллекций: сервер дропы уже не выдаёт — начисление снято. |
| D85 | `community_packs.ts`: убраны `UGC_PACK_PRICE_SHARDS`, запись `priceShards`, возврат 10 жемчуга (возврат только помечает покупку). |
| D86 | `adminGrantReward`: тип `coins` (1..5000) через `stars_ledger`, причина `admin_grant`; `adminSetShardBalance` удалён (экспорты, deploy-лента, админка). Дни Plus — существующий `adminGrantAccess`. |
| прочее | Нулевые начисления жемчуга сняты из урока/экзаменов/диагностики/слов/глаголов/предлогов; опрос и `shard_survey.ts` без события; `admin_referrals.ts` не списывает старые реф. бонусы жемчугом. |

## 10. Заход 3 (2026-09-30): D107, D108, D110

Ратчет косметики: `tests/d108_cosmetics_removed.probe.ts` (6 UI-файлов «Дизайна», только сокращается).

| Решение | Что сделано |
|---|---|
| D107 | `hall_of_fame_utils.ts`: пропуск дня спасает только бесплатная заморозка Plus; ветки «починка уроком» и «Подарок путешествия спас цепочку» сняты. Удалены `app/daily_journey_protected_day.ts` и его тест; `lesson_complete.tsx` больше не зовёт `recordLessonForRepair`; событие достижения `streak_repair` снято. `app/streak_repair.ts` — заглушка «починки нет» только для импорта с Главной. Журнал заморозок «Путешествия дня» (`daily_journey_freeze_ledger.ts`) остался: он защищает серию самого путешествия, не серию дней. |
| D108 | `AvatarView` не рисует ауры и `custom:`-аватары. Удалены: `AvatarAura`, `PremiumAvatarHalo`, `components/avatar-aura/*`, `CustomAvatarBadge`, `Avatar100Portrait`, каталоги `avatar100_*`, `avatar_phenomena_*`, `custom_avatar_asset_host`, `customization_dev_access`, `cosmetic_asset_availability`, `spin_avatar_gift_pool`, `customization_selection_runtime`, клиентский и серверный архив косметики (`cosmeticAssetCatalogGet`, `adminGetCosmeticAssetArchive`, `adminSetCosmeticAssetSaleStatus` + раздел «Архив ассетов» в админке), `bot_cosmetics` (боты Шпиля без аур и Plus-метки), мёртвый серверный розыгрыш подарков уровня. `level_gift_system.ts`: выдача аур/аватаров снята, старые квитанции читаются по форме. `constants/avatar_auras.ts` и `constants/custom_avatars.ts` — заглушки «косметики нет» для импортов «Дизайна». Снимок `customization` без купленного/подаренного/ауры; публичный профиль публикует `aura: null` и базовый аватар вместо `custom:`. |
| D110 | `adminRefundCommunityPackPurchase` удалён: функция, экспорты (functions, functions-admin), кнопки/вызов/контракт `ugc.refund` в админке, тесты, запись реестра команд. |

Осталось (не тронуто намеренно): журнал выбора косметики и ключи косметики в `app/cloud_sync.ts` (файл активно правит другая сессия); id `cosmetic_*` в каталоге спина (только история квитанций); dev-макет магазина `app/shop*.ts` (товар «Случайная аура» за жемчуг); копирайт про ауру в пейволе (`avatar_aura`), `VipSurveyModal`, `release_notes_copy`; флаг `gate_avatar_auras_premium` (0 вызовов); пайплайны ассетов `scripts/avatar100`, `scripts/avatar-phenomena`.
