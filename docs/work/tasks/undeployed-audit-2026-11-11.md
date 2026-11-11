# Аудит: что лежит в проекте, но не выложено на бой (снято 11.11.2026, ~21:20–21:40 UTC)

Только чтение: облако опрошено через `gcloud functions list`, Firebase Rules API, Firebase Hosting API, `eas update:list`.
Сравнение — с веткой `feature/referral-roulette` на момент снятия.

## Как читать раздел про функции

Для каждой функции из `functions/src/index.ts` взят файл, в котором она объявлена, и время его последнего коммита;
оно сравнено со временем последней выкладки функции в облаке. Это **нижняя оценка**: правки в общих модулях, которые
функция только импортирует, сюда не попадают, а массовые коммиты-снимки (перенос/удаление кода) дают «изменено» и там,
где поведение функции не менялось. Перед выкладкой каждой группы нужен разбор по существу.

## Сводка

| Что | Состояние |
|---|---|
| Функции: собственный файл менялся после выкладки | 208 из 379 |
| Функции есть в коде, в облаке нет | 12 (список ниже; часть — намеренно «своя очередь» по `DEPLOY_NOW.md`) |
| Функции есть в облаке, в коде нет | 67 (удалённые разделы; старые сборки ещё могут их вызывать — удалять только по списку координатора) |
| Правила базы (Firestore) | в облаке версия от 06.11; локальный файл менялся 11.11 и отличается |
| Правила хранилища | в облаке версия от 25.10; локальный файл менялся 11.11 и отличается |
| Админка (hosting `admin`) | выложена 10.11 04:19; `admin/v2` менялась 11.11 17:55, плюс незакоммиченные правки `legacy.html` другой сессии |
| Сайт knowlyapps | выложен 11.11 17:08, последний коммит 17:01 — актуален |
| Приложение (обновление по воздуху) | последнее — `2.0.3-OTA1` неделю назад для версии 2.0.3; в коде версия 2.1.1 (151) — всё, что сделано в клиенте после, до игроков не доехало |
| Пик, новые механики | функции выложены 11.11 21:17; накладки недели — см. `peak-expanded-rollout-2026-11-11.md` |
| Пик, задания старых видов Кодекса (2 500) | в проекте отсутствуют; нужен отдельный источник пула (план Кодекса `PEAK-500-RUNTIME-INTEGRATION-PACKET-2026-11-10.md`, вердикт автора — HOLD) |

## Функции в коде, которых нет в облаке

- `webActivationReminderCron` — шлёт настоящие письма оплатившим на сайте; включать осознанно.
- `adminArenaPublicationStage/Status/Activate/Rollback` — публикация пула заданий Пика; «своя очередь».
- `accountsV2SyncApply`, `accountsV2DeletionStatus`, `accountsV2MigrateMine`, `accountsV2PullMine` — у Account V2 свой план.
- `spendCapBillingKillSwitch` — аварийный выключатель расходов.
- `adminSetSpinWeights`, `communityListSellerInbox`, `supportInboxOnNewMail` — в облаке есть под этими именами, скрипт не
  распознал их из-за комментария в блоке экспорта; считать выложенными, но устаревшими (см. таблицу ниже).

## Функции, чей собственный файл менялся после выкладки (208)

Колонки: функция · модуль · выложена · файл изменён · коммит.

```
publicProfileProjectMine	public_profile_projection	deployed 2026-11-06T01:03	changed 2026-11-11T20:47	5d768dc16 feat(functions): уровни навыков в публичном профиле только при визитке Про, друзьям - всегда (D207)
friendsGetProfiles	friends_profiles	deployed 2026-11-06T01:03	changed 2026-11-11T20:47	5d768dc16 feat(functions): уровни навыков в публичном профиле только при визитке Про, друзьям - всегда (D207)
adminListPromoCodes	promo_codes	deployed 2026-09-04T15:44	changed 2026-11-11T19:48	79959a276 fix: заказ Telegram-бота помечается выполненным после ввода кода
promoCodeDelete	promo_codes	deployed 2026-09-04T15:47	changed 2026-11-11T19:48	79959a276 fix: заказ Telegram-бота помечается выполненным после ввода кода
promoCodeBatchUpsert	promo_codes	deployed 2026-09-04T15:44	changed 2026-11-11T19:48	79959a276 fix: заказ Telegram-бота помечается выполненным после ввода кода
promoCodeUpsert	promo_codes	deployed 2026-09-04T15:45	changed 2026-11-11T19:48	79959a276 fix: заказ Telegram-бота помечается выполненным после ввода кода
supportOpsCron	index	deployed 2026-11-06T01:03	changed 2026-11-11T18:26	3c7fae89e feat(functions): api подключена к деплою — экспорт в index.ts и сторож проводки
premiumExpiryReminderCron	index	deployed 2026-10-26T16:41	changed 2026-11-11T18:26	3c7fae89e feat(functions): api подключена к деплою — экспорт в index.ts и сторож проводки
reEngagePushCron	index	deployed 2026-10-26T06:50	changed 2026-11-11T18:26	3c7fae89e feat(functions): api подключена к деплою — экспорт в index.ts и сторож проводки
cleanupExpiredAppMessagesCron	index	deployed 2026-09-04T15:44	changed 2026-11-11T18:26	3c7fae89e feat(functions): api подключена к деплою — экспорт в index.ts и сторож проводки
progressMigrateSnapshot	progress_events	deployed 2026-10-02T01:22	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
progressSubmitEvent	progress_events	deployed 2026-11-05T02:05	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
openAiJobsConfig	openai_jobs_config	deployed 2026-09-04T15:46	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSaveProductCharter	admin_product_charter	deployed 2026-09-04T15:44	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminGetProductCharter	admin_product_charter	deployed 2026-09-04T15:44	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
supportTelegramReplyJobOnCreate	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportArchiveMessages	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportSetStatus	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportSaveDraft	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportSaveInstructions	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportSaveAutomation	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportSaveSignature	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportResolveReplyDelivery	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportCancelReplyBatch	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportDispatchReplyBatch	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportPrepareReplyBatch	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportCancelReply	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportSendReply	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportDispatchReply	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportPrepareReply	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportGenerateReply	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportConversation	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportList	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminSupportPull	support_inbox	deployed 2026-11-06T01:03	changed 2026-11-11T17:43	8a5b8d657 refactor: код Jarvis удалён, общие части перенесены в functions/src/shared_ops (N01)
adminListFeedbackEntries	feedback_entries	deployed 2026-09-12T13:08	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
submitFeedbackEntry	feedback_entries	deployed 2026-10-18T06:40	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
mistakePracticeSyncEvents	mistake_practice_event_sync	deployed 2026-10-22T11:58	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
referralListMyInvites	referral	deployed 2026-09-04T15:47	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
referralClaimVipReward	referral	deployed 2026-10-26T16:51	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
referralApply	referral	deployed 2026-09-21T19:01	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
referralEnsureMyCode	referral	deployed 2026-09-04T15:47	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
accountDeleteCredentialStatus	account_delete	deployed 2026-11-06T01:03	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
accountDeleteEnqueue	account_delete	deployed 2026-11-06T01:03	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
accountDeleteMine	account_delete	deployed 2026-11-06T01:03	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
adminAlertOnFeedbackCreated	admin_alert_sources_ratings	deployed 2026-09-12T20:16	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
levelSpinStarGrant	level_spin_star_grant	deployed 2026-11-06T01:03	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
premiumThemeVideoWatchReport	premium_themes	deployed 2026-10-25T08:22	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
premiumThemeConditionClaim	premium_themes	deployed 2026-10-25T08:22	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
premiumThemeEntitlementsGet	premium_themes	deployed 2026-10-25T08:22	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
spireFinalizeCron	spire_finalize_cron	deployed 2026-11-06T01:03	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
revenueCatPremiumReconcileMine	revenuecat_reconcile	deployed 2026-10-26T16:31	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
revenueCatShardsWebhook	revenuecat_shards	deployed 2026-11-06T01:03	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
adminRunContentStage	content_stage_worker	deployed 2026-09-04T15:48	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
adminReviewContentStage	admin_content_stages	deployed 2026-09-04T15:46	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
adminPreviewContentStage	admin_content_stages	deployed 2026-09-04T15:46	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
adminGetContentStageCapabilities	admin_content_stages	deployed 2026-09-04T15:46	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
adminListContentStageDependencies	admin_content_stages	deployed 2026-09-04T15:48	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
adminListContentStages	admin_content_stages	deployed 2026-09-04T15:45	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
adminControlContentStage	admin_content_stages	deployed 2026-09-04T15:45	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
adminCreateContentStage	admin_content_stages	deployed 2026-09-04T15:46	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
communityMarkSellerInboxSeen	community_packs	deployed 2026-09-04T15:44	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
flashcardPackGiftRedeem	community_packs	deployed 2026-09-04T15:44	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
communityFetchPackCardsIfAccessible	community_packs	deployed 2026-09-17T19:23	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
communityAuthorRemovePack	community_packs	deployed 2026-09-17T19:23	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
communityAdminModeratePack	community_packs	deployed 2026-10-11T14:41	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
communityModerateSubmission	community_packs	deployed 2026-10-11T14:41	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
communitySubmitPackForReview	community_packs	deployed 2026-10-11T14:41	changed 2026-11-11T16:05	d8a0a685a refactor: удаление курса занятий Learning V2 и сопутствующие правки рабочего дерева
practiceRuneGrant	practice_rune_grant	deployed 2026-10-17T18:03	changed 2026-11-11T14:41	a0b010fc6 feat(spire): U33/U34 — свой счёт и место в Пике сразу после подтверждённого заработка
spireReportSteps	spire_progress	deployed 2026-11-06T01:03	changed 2026-11-11T14:41	a0b010fc6 feat(spire): U33/U34 — свой счёт и место в Пике сразу после подтверждённого заработка
accountMergeOutboxRetryCron	auth_merge	deployed 2026-10-26T16:51	changed 2026-11-11T14:33	7a24f2a6e perf(cost): трассы корня уходят на сервер только рядом с выходом из урока; повтор слияния аккаунтов раз в час
accountMergeOutboxWorker	auth_merge	deployed 2026-10-26T16:51	changed 2026-11-11T14:33	7a24f2a6e perf(cost): трассы корня уходят на сервер только рядом с выходом из урока; повтор слияния аккаунтов раз в час
authMergeStableAccounts	auth_merge	deployed 2026-10-26T16:51	changed 2026-11-11T14:33	7a24f2a6e perf(cost): трассы корня уходят на сервер только рядом с выходом из урока; повтор слияния аккаунтов раз в час
telegramPremiumActivationNotifier	telegram_premium_bot	deployed 2026-10-26T16:41	changed 2026-11-11T14:02	bd4a81a43 fix(telegram-bot): подсказка о пополнении Stars рядом с кнопкой оплаты
adminPushJobsCron	admin_push_jobs	deployed 2026-09-04T15:48	changed 2026-11-11T13:47	aeccfad59 fix(push): F08 — админская рассылка после обрыва досылает только тем, кому ещё не отправляла
adminPushJobCreated	admin_push_jobs	deployed 2026-09-04T15:48	changed 2026-11-11T13:47	aeccfad59 fix(push): F08 — админская рассылка после обрыва досылает только тем, кому ещё не отправляла
spireZoneWarningCron	spire_zone_warning_push	deployed 2026-10-22T07:12	changed 2026-11-11T13:41	51888c5b3 fix(push): F08 — одно событие = одно уведомление при параллельных прогонах
adminAlertOnConfigWritten	admin_alerts	deployed 2026-09-12T17:58	changed 2026-11-04T17:35	fc10a35cc fix(alerts): server-side filter — learning_v2 app errors never reach the Telegram admin alerts
adminAlertOnUgcRefund	admin_alerts	deployed 2026-09-12T21:06	changed 2026-11-04T17:35	fc10a35cc fix(alerts): server-side filter — learning_v2 app errors never reach the Telegram admin alerts
adminAlertOnCancelSurvey	admin_alerts	deployed 2026-09-12T21:06	changed 2026-11-04T17:35	fc10a35cc fix(alerts): server-side filter — learning_v2 app errors never reach the Telegram admin alerts
adminAlertOnContentReport	admin_alerts	deployed 2026-09-12T21:06	changed 2026-11-04T17:35	fc10a35cc fix(alerts): server-side filter — learning_v2 app errors never reach the Telegram admin alerts
adminAlertOnAuthFailureSpike	admin_alerts	deployed 2026-09-12T21:06	changed 2026-11-04T17:35	fc10a35cc fix(alerts): server-side filter — learning_v2 app errors never reach the Telegram admin alerts
adminAlertOnCronHeartbeat	admin_alerts	deployed 2026-09-12T21:06	changed 2026-11-04T17:35	fc10a35cc fix(alerts): server-side filter — learning_v2 app errors never reach the Telegram admin alerts
adminAlertOnUserReport	admin_alerts	deployed 2026-09-12T21:06	changed 2026-11-04T17:35	fc10a35cc fix(alerts): server-side filter — learning_v2 app errors never reach the Telegram admin alerts
adminStoryAnnouncementsList	story_announcements	deployed 2026-10-25T08:22	changed 2026-10-28T20:30	159fb12cd feat(stories): контракт 36 шаблонов объявлений (поле design) и опрос по образцу «Опросов Главной v2»
adminGetDiagnosticsOverview	admin_diagnostics_overview	deployed 2026-10-24T18:50	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
adminArenaContentValidate	admin_arena_content	deployed 2026-09-26T12:13	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
adminArenaContentStatus	admin_arena_content	deployed 2026-10-24T17:01	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
adminGetAnalyticsSnapshot	admin_analytics	deployed 2026-10-25T17:15	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
adminStaffIsolatedSession	admin_staff_isolated_endpoint	deployed 2026-10-26T13:43	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
adminGetProductStatistics	admin_statistics	deployed 2026-10-25T19:23	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
adminProductAnalytics	admin_product_analytics	deployed 2026-10-26T07:29	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
openAiBudgetDashboard	openai_budget_dashboard	deployed 2026-10-24T17:01	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
adminMarkSafetyFlagsHandled	admin_compliance	deployed 2026-09-04T15:48	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
adminListSafetyFlags	admin_compliance	deployed 2026-10-24T08:53	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
adminGetComplianceOverview	admin_compliance	deployed 2026-10-24T08:53	changed 2026-10-26T15:32	a82a3b220 feat: include current app updates and community contest in iOS 147
adminCommunityPackApplyQaFixesToPublished	admin_community_pack_qa	deployed 2026-09-21T14:38	changed 2026-10-25T07:00	3b2d18705 feat(functions): card pack AI check and translation on gpt-4.1. Wrong-language text is its own finding, and a 
adminCommunityPackApplyQaFixes	admin_community_pack_qa	deployed 2026-09-21T14:34	changed 2026-10-25T07:00	3b2d18705 feat(functions): card pack AI check and translation on gpt-4.1. Wrong-language text is its own finding, and a 
adminDeactivateVipSurveyCampaign	admin_app_messages	deployed 2026-09-04T15:45	changed 2026-10-22T07:45	f3e4462fe feat(functions): every server write to user_messages bumps users.inboxRev (question 27, no deploy)
adminLaunchVipSurveyCampaign	admin_app_messages	deployed 2026-10-13T06:46	changed 2026-10-22T07:45	f3e4462fe feat(functions): every server write to user_messages bumps users.inboxRev (question 27, no deploy)
adminCleanupExpiredAppMessages	admin_app_messages	deployed 2026-09-04T15:44	changed 2026-10-22T07:45	f3e4462fe feat(functions): every server write to user_messages bumps users.inboxRev (question 27, no deploy)
adminDeleteAppMessage	admin_app_messages	deployed 2026-09-04T15:44	changed 2026-10-22T07:45	f3e4462fe feat(functions): every server write to user_messages bumps users.inboxRev (question 27, no deploy)
adminUpdateAppMessage	admin_app_messages	deployed 2026-10-13T06:46	changed 2026-10-22T07:45	f3e4462fe feat(functions): every server write to user_messages bumps users.inboxRev (question 27, no deploy)
adminSetAppMessageActive	admin_app_messages	deployed 2026-09-04T15:45	changed 2026-10-22T07:45	f3e4462fe feat(functions): every server write to user_messages bumps users.inboxRev (question 27, no deploy)
adminCreateAppMessage	admin_app_messages	deployed 2026-10-13T06:46	changed 2026-10-22T07:45	f3e4462fe feat(functions): every server write to user_messages bumps users.inboxRev (question 27, no deploy)
adminDraftReportReply	report_replies	deployed 2026-09-04T15:44	changed 2026-10-22T07:45	f3e4462fe feat(functions): every server write to user_messages bumps users.inboxRev (question 27, no deploy)
adminGetAlertDiagnostics	admin_alert_dispatcher	deployed 2026-10-11T09:21	changed 2026-10-21T20:46	bae288570 fix(alerts): деньги и безопасность ИИ не уходят в недельную сводку (Ревизор 21.10, на «да» владельца)
adminSendPreparedGiftCertificate	web_checkout	deployed 2026-09-04T15:46	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
adminReplaceSyntheticGiftCertificate	web_checkout	deployed 2026-09-04T15:46	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
adminUpdateGiftCertificatePersonalization	web_checkout	deployed 2026-09-04T15:48	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
adminUpdateGiftCertificateRecipient	web_checkout	deployed 2026-09-04T15:46	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
adminGetGiftCertificateDownload	web_checkout	deployed 2026-09-04T15:47	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
adminDeleteGiftCertificate	web_checkout	deployed 2026-09-04T15:46	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
adminListGiftCertificates	web_checkout	deployed 2026-09-04T15:47	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
adminCancelGiftCertificateBatchOperation	web_checkout	deployed 2026-09-04T15:46	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
adminGetGiftCertificateBatchOperation	web_checkout	deployed 2026-09-04T15:46	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
adminCreateGiftCertificateBatch	web_checkout	deployed 2026-09-04T15:46	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
adminCancelStripeSubscriptionRenewal	web_checkout	deployed 2026-09-04T15:43	changed 2026-10-21T20:35	d64240633 fix(gift): refund list by query, cancel email once, sandbox payments silent
authRecoveryHint	auth_identity	deployed 2026-09-02T07:00	changed 2026-10-18T11:00	1d768610c fix(auth): authEnsureStableLink без окна вызовов в базе — вход не падает из-за счётчика; остался счётчик в пам
nameReleaseMine	leaderboard	deployed 2026-09-02T07:00	changed 2026-10-18T09:49	c1a539c58 fix(functions): nameReserve per-IP ceiling groups IPv6 by /64
nameReserve	leaderboard	deployed 2026-09-02T06:59	changed 2026-10-18T09:49	c1a539c58 fix(functions): nameReserve per-IP ceiling groups IPv6 by /64
nameGenerateAndReserve	leaderboard	deployed 2026-09-02T07:01	changed 2026-10-18T09:49	c1a539c58 fix(functions): nameReserve per-IP ceiling groups IPv6 by /64
nameCheckAvailability	leaderboard	deployed 2026-09-02T07:01	changed 2026-10-18T09:49	c1a539c58 fix(functions): nameReserve per-IP ceiling groups IPv6 by /64
authCompleteRecoveryHandoff	auth_recovery	deployed 2026-09-02T07:00	changed 2026-10-18T09:45	c055fd6d9 fix(functions): правки Ревизора 3.116/3.117 к окнам вызовов и потолку расходов — правый IP, отказ при таймауте
authIssueRecoveryHandoffToken	auth_recovery	deployed 2026-09-02T07:01	changed 2026-10-18T09:45	c055fd6d9 fix(functions): правки Ревизора 3.116/3.117 к окнам вызовов и потолку расходов — правый IP, отказ при таймауте
authCleanInstallRecoveryDeliveryWorker	auth_recovery	deployed 2026-09-04T15:47	changed 2026-10-18T09:45	c055fd6d9 fix(functions): правки Ревизора 3.116/3.117 к окнам вызовов и потолку расходов — правый IP, отказ при таймауте
authConfirmCleanInstallRecoveryCode	auth_recovery	deployed 2026-09-02T07:00	changed 2026-10-18T09:45	c055fd6d9 fix(functions): правки Ревизора 3.116/3.117 к окнам вызовов и потолку расходов — правый IP, отказ при таймауте
authRequestCleanInstallRecoveryCode	auth_recovery	deployed 2026-09-02T06:59	changed 2026-10-18T09:45	c055fd6d9 fix(functions): правки Ревизора 3.116/3.117 к окнам вызовов и потолку расходов — правый IP, отказ при таймауте
authConfirmRecoveryCode	auth_recovery	deployed 2026-09-02T07:08	changed 2026-10-18T09:45	c055fd6d9 fix(functions): правки Ревизора 3.116/3.117 к окнам вызовов и потолку расходов — правый IP, отказ при таймауте
authRequestRecoveryCode	auth_recovery	deployed 2026-09-02T07:09	changed 2026-10-18T09:45	c055fd6d9 fix(functions): правки Ревизора 3.116/3.117 к окнам вызовов и потолку расходов — правый IP, отказ при таймауте
webLeadNudgeCron	web_leads	deployed 2026-09-22T08:17	changed 2026-10-18T09:30	4dc391249 feat(functions): слой 1 защиты от накрутки по аудиту Ревизора — дневные потолки бесплатного ИИ на uid и IP, ан
webLeadCapture	web_leads	deployed 2026-09-22T08:17	changed 2026-10-18T09:30	4dc391249 feat(functions): слой 1 защиты от накрутки по аудиту Ревизора — дневные потолки бесплатного ИИ на uid и IP, ан
adminCardTtsRequeuePack	card_tts_worker	deployed 2026-10-11T09:42	changed 2026-10-18T09:16	37e8d86cf feat(functions): общий дневной потолок расходов «не больше 20 $ в день в принципе» + аварийный выключатель по 
cardTtsPackWorker	card_tts_worker	deployed 2026-10-11T09:42	changed 2026-10-18T09:16	37e8d86cf feat(functions): общий дневной потолок расходов «не больше 20 $ в день в принципе» + аварийный выключатель по 
globalBroadcastListActive	global_broadcast_public	deployed 2026-10-17T18:16	changed 2026-10-17T18:19	fef378a62 perf(functions): полное ядро для входа, старта, Пика и диалогов — белый список к cpu gcf_gen1
openAiDialogQuotaConfig	openai_dialog_model_config	deployed 2026-09-04T15:46	changed 2026-10-13T18:18	4d4fcc412 Merge origin/feature/referral-roulette: замена уходящих моделей OpenAI (fb1c86ff5, 526be32e8, 08–09.10) поверх
openAiDialogModelConfig	openai_dialog_model_config	deployed 2026-09-04T15:46	changed 2026-10-13T18:18	4d4fcc412 Merge origin/feature/referral-roulette: замена уходящих моделей OpenAI (fb1c86ff5, 526be32e8, 08–09.10) поверх
adminWriteShardSurvey	shard_survey	deployed 2026-09-12T18:02	changed 2026-10-12T15:48	e4f45f8e3 feat(shard-survey): без текста на языке пользователя опрос не предлагается — [SHARD-SURVEY] reason=no_locale; 
submitShardSurvey	shard_survey	deployed 2026-09-12T18:02	changed 2026-10-12T15:48	e4f45f8e3 feat(shard-survey): без текста на языке пользователя опрос не предлагается — [SHARD-SURVEY] reason=no_locale; 
adminPublishYoutubeCatalogConfig	youtube_catalog	deployed 2026-09-04T15:44	changed 2026-10-11T02:20	073612a9e perf(firebase): каталог YouTube не перепубликуется без изменений — пакет K
adminGetYoutubeCatalogWorkspace	youtube_catalog	deployed 2026-09-04T15:44	changed 2026-10-11T02:20	073612a9e perf(firebase): каталог YouTube не перепубликуется без изменений — пакет K
adminWarmInstanceGauge	warm_instance_gauge	deployed 2026-09-02T07:01	changed 2026-10-04T13:33	5db254d3b chore(max): шаги 2–3 чистки MAX — удалены кодовая база functions-max (и её запись в firebase.json), 53 серверн
adminGetFeedbackStats	feedback_admin_stats	deployed 2026-09-12T13:08	changed 2026-10-04T13:19	e049ad416 refactor(max): шаг 1 чистки MAX — разбор диалога без режимов звонка MAX (voice/tutor → text, вызовов с 04.09 н
adminSummarizeFeedback	feedback_summary	deployed 2026-09-02T07:01	changed 2026-10-04T13:19	e049ad416 refactor(max): шаг 1 чистки MAX — разбор диалога без режимов звонка MAX (voice/tutor → text, вызовов с 04.09 н
onAppMessageStateWritten	app_messages	deployed 2026-09-04T15:48	changed 2026-10-04T12:24	17047a3c8 fix(logs): PM-229 сервер — 60 немых обработчиков в functions/src пишут причину [PM-229] (блокировки разбора фр
onAppMessagePollVoteWritten	app_messages	deployed 2026-09-04T15:48	changed 2026-10-04T12:24	17047a3c8 fix(logs): PM-229 сервер — 60 немых обработчиков в functions/src пишут причину [PM-229] (блокировки разбора фр
onAppMessageReactionWritten	app_messages	deployed 2026-09-04T15:47	changed 2026-10-04T12:24	17047a3c8 fix(logs): PM-229 сервер — 60 немых обработчиков в functions/src пишут причину [PM-229] (блокировки разбора фр
friendLookupUser	friend_lookup	deployed 2026-09-02T07:01	changed 2026-10-04T12:24	17047a3c8 fix(logs): PM-229 сервер — 60 немых обработчиков в functions/src пишут причину [PM-229] (блокировки разбора фр
friendEnsureMyCode	friend_codes	deployed 2026-09-04T15:47	changed 2026-10-04T12:24	17047a3c8 fix(logs): PM-229 сервер — 60 немых обработчиков в functions/src пишут причину [PM-229] (блокировки разбора фр
emailUnsubscribe	email_unsubscribe	deployed 2026-09-22T08:02	changed 2026-10-04T12:24	17047a3c8 fix(logs): PM-229 сервер — 60 немых обработчиков в functions/src пишут причину [PM-229] (блокировки разбора фр
adminDraftIdeaDecision	user_ideas	deployed 2026-09-11T20:56	changed 2026-10-01T22:08	76de2317d feat(ai-billing): PM-231 A3 — расход админских ИИ-функций виден по operation
adminDecideUserIdea	user_ideas	deployed 2026-09-11T20:56	changed 2026-10-01T22:08	76de2317d feat(ai-billing): PM-231 A3 — расход админских ИИ-функций виден по operation
adminSetUserIdeaStatus	user_ideas	deployed 2026-09-11T20:56	changed 2026-10-01T22:08	76de2317d feat(ai-billing): PM-231 A3 — расход админских ИИ-функций виден по operation
adminDeleteUserIdea	user_ideas	deployed 2026-09-11T20:56	changed 2026-10-01T22:08	76de2317d feat(ai-billing): PM-231 A3 — расход админских ИИ-функций виден по operation
getPublicUserIdea	user_ideas	deployed 2026-09-11T20:56	changed 2026-10-01T22:08	76de2317d feat(ai-billing): PM-231 A3 — расход админских ИИ-функций виден по operation
listPublicUserIdeas	user_ideas	deployed 2026-09-11T20:56	changed 2026-10-01T22:08	76de2317d feat(ai-billing): PM-231 A3 — расход админских ИИ-функций виден по operation
submitUserIdea	user_ideas	deployed 2026-09-11T21:05	changed 2026-10-01T22:08	76de2317d feat(ai-billing): PM-231 A3 — расход админских ИИ-функций виден по operation
adminOpenDailyDigest	admin_daily_digest	deployed 2026-09-04T15:44	changed 2026-10-01T22:08	76de2317d feat(ai-billing): PM-231 A3 — расход админских ИИ-функций виден по operation
adminGenerateDailyDigest	admin_daily_digest	deployed 2026-09-04T15:44	changed 2026-10-01T22:08	76de2317d feat(ai-billing): PM-231 A3 — расход админских ИИ-функций виден по operation
userNotificationsCleanupCron	user_notifications	deployed 2026-09-04T15:47	changed 2026-10-01T22:07	f5447d10c fix(logs): PM-229 — немые catch в покупках/удалении/поддержке/личности пишут причину, серверный ратчет
notifyOnPackCommentCreated	user_notifications	deployed 2026-09-17T19:21	changed 2026-10-01T22:07	f5447d10c fix(logs): PM-229 — немые catch в покупках/удалении/поддержке/личности пишут причину, серверный ратчет
notifyOnFriendAccepted	user_notifications	deployed 2026-09-04T15:47	changed 2026-10-01T22:07	f5447d10c fix(logs): PM-229 — немые catch в покупках/удалении/поддержке/личности пишут причину, серверный ратчет
notifyOnFriendRequestCreated	user_notifications	deployed 2026-09-04T15:47	changed 2026-10-01T22:07	f5447d10c fix(logs): PM-229 — немые catch в покупках/удалении/поддержке/личности пишут причину, серверный ратчет
adminUserBriefs	admin_user_briefs	deployed 2026-09-04T15:47	changed 2026-10-01T04:22	5520212f6 feat(admin): Q5 — инициалы вместо старых аватаров, ранг монеты в карточке пользователя
adminWarnUser	admin_user_operations	deployed 2026-09-04T15:44	changed 2026-09-30T16:45	9d6aa9dca feat(admin): модератор стирает свой текст визитки «Про» по жалобе
adminUpdateUserProfileField	admin_user_operations	deployed 2026-09-04T15:44	changed 2026-09-30T16:45	9d6aa9dca feat(admin): модератор стирает свой текст визитки «Про» по жалобе
adminResolveUserReport	admin_user_operations	deployed 2026-09-04T15:45	changed 2026-09-30T16:45	9d6aa9dca feat(admin): модератор стирает свой текст визитки «Про» по жалобе
adminResetUserProgress	admin_user_operations	deployed 2026-09-04T15:44	changed 2026-09-30T16:45	9d6aa9dca feat(admin): модератор стирает свой текст визитки «Про» по жалобе
adminRequestUserMerge	admin_user_operations	deployed 2026-09-04T15:45	changed 2026-09-30T16:45	9d6aa9dca feat(admin): модератор стирает свой текст визитки «Про» по жалобе
adminDeleteDuplicateUser	admin_user_operations	deployed 2026-09-04T15:46	changed 2026-09-30T16:45	9d6aa9dca feat(admin): модератор стирает свой текст визитки «Про» по жалобе
adminAlertOnPromoRedemptionCreated	admin_alert_sources_revenue	deployed 2026-09-12T17:58	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminAlertOnGiftCertificateCreated	admin_alert_sources_revenue	deployed 2026-09-12T17:58	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminAlertOnCommunityPackPurchaseWritten	admin_alert_sources_revenue	deployed 2026-09-12T21:06	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminAlertOnTelegramPremiumOrderWritten	admin_alert_sources_revenue	deployed 2026-09-12T21:06	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminAlertOnWebPremiumOrderWritten	admin_alert_sources_revenue	deployed 2026-09-12T21:06	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminAlertOnRevenueCatReceipt	admin_alert_sources_revenue	deployed 2026-09-13T13:51	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminReferralHealth	admin_referrals	deployed 2026-09-04T15:47	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminSetReferralRouletteEmergencyStop	admin_referrals	deployed 2026-09-04T15:47	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminSetReferralRouletteEnabled	admin_referrals	deployed 2026-09-04T15:47	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminGetReferralDashboard	admin_referrals	deployed 2026-09-04T15:46	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminRevokeReferralAttribution	admin_referrals	deployed 2026-09-04T15:47	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminGrantReward	admin_grant	deployed 2026-09-04T15:44	changed 2026-09-30T12:33	efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий (решение владельца 30.09). Исключено: Шпиль, пейв
adminListMistakeExplanationCache	admin_explain_cache	deployed 2026-09-20T06:54	changed 2026-09-20T15:02	6c02e4088 release: prepare 1.6.22 build 128
adminArenaConfigSet	admin_arena_config	deployed 2026-09-04T15:47	changed 2026-09-20T15:02	6c02e4088 release: prepare 1.6.22 build 128
adminArenaConfigGet	admin_arena_config	deployed 2026-09-04T15:47	changed 2026-09-20T15:02	6c02e4088 release: prepare 1.6.22 build 128
adminSetIdeaSubmissionRestriction	user_idea_reports	deployed 2026-09-11T20:56	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminRestoreUserIdea	user_idea_reports	deployed 2026-09-11T20:56	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
unlikeUserIdea	user_idea_likes	deployed 2026-09-11T20:56	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
likeUserIdea	user_idea_likes	deployed 2026-09-11T20:56	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnUserIdeaReport	user_idea_reports	deployed 2026-09-12T21:06	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
submitExplainReport	explain/explain_reports	deployed 2026-09-12T20:16	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnComplianceControlWritten	admin_alert_sources_ops	deployed 2026-09-12T17:58	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnAppMessageWritten	admin_alert_sources_ops	deployed 2026-09-12T17:58	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnPushJobWritten	admin_alert_sources_ops	deployed 2026-09-12T17:58	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnAdminAuditCreated	admin_alert_sources_ops	deployed 2026-09-12T17:58	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnExplanationReportCreated	admin_alert_sources_reports	deployed 2026-09-12T20:16	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnCancelReasonCreated	admin_alert_sources_reports	deployed 2026-09-12T17:59	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnCommunityPackReportCreated	admin_alert_sources_reports	deployed 2026-09-12T17:59	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnCommunitySubmissionCreated	admin_alert_sources_reports	deployed 2026-09-12T21:06	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnSupportEmailCreated	admin_alert_sources_reports	deployed 2026-09-12T17:59	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnWebsiteContactCreated	admin_alert_sources_reports	deployed 2026-09-12T17:59	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnUserIdeaCreated	admin_alert_sources_reports	deployed 2026-09-12T17:58	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnBanWrite	admin_alert_sources_people	deployed 2026-09-12T17:59	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminAlertOnReferralAttributionWrite	admin_alert_sources_people	deployed 2026-09-12T17:58	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminTestAlerts	admin_config_controls	deployed 2026-09-12T17:58	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminPublishAlertsConfig	admin_config_controls	deployed 2026-09-12T17:59	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminPublishNavLayout	admin_config_controls	deployed 2026-09-04T15:47	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
adminGetAdminConfigWorkspace	admin_config_controls	deployed 2026-09-12T17:58	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
soc2ReadinessCollectorCron	soc2_readiness_collector	deployed 2026-09-11T18:25	changed 2026-09-14T15:25	0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу владельца 2026-09-14
```

## Функции в облаке, которых нет в коде (67)

- `authAppleLinkByVerifiedEmail`
- `communityRedeemPackGiftVoucher`
- `adminRollbackCourseRelease`
- `resolveLearningV2CourseUnlockReceipt`
- `getLearningV2AccountBinding`
- `usersWriteRouter`
- `cosmeticAssetCatalogGet`
- `englishTestApi`
- `learningV2ActivityAuxiliarySessionGetV1`
- `adminGetContentFactoryUnitPreview`
- `adminPreviewLearningV2CourseWave`
- `adminSeedV2E1DemoSource`
- `adminGetContentFactoryWorkspace`
- `adminCreateContentGenerationJob`
- `leagueActivateGroupBoost`
- `adminGrantVoiceMinutes`
- `submitLearningV2CourseSessionCompletedV1`
- `questGetActive`
- `submitLearningV2ActivityReleasedCompletionV1`
- `adminPrepareV2OwnerEpisodeDraft`
- `adminReviewCourseGeneration`
- `adminGetContentFactoryRolloutMetrics`
- `learningV2ActivityReleasedSessionGetV1`
- `adminGetV2OwnerGeneratorSetupCatalog`
- `adminGetLearningV2CourseWorkspaceProjection`
- `adminRejectLearningV2CourseWave`
- `friendsLessonInvite`
- `adminListQuests`
- `adminActivateCourseRelease`
- `finalizeLearningV2DelayedCandidate`
- `recalcCoinExchangeRate`
- `resolveLearningV2WalletRewardReceipt`
- `adminConfirmV2OwnerEpisode`
- `adminYoutubeComments`
- `aiDialogBuyExtraReplies`
- `shardsApplyDelta`
- `adminApproveLearningV2CourseWave`
- `adminPublishAuthoredLearningV2Course`
- `communityListSellerInbox`
- `flashcardPackGiftGrantGlobalBroadcast`
- `learningV2LocalizedCourseShardBackgroundWorker`
- `adminCreateV2GenerationPlan`
- `adminSaveV2EpisodeDraft`
- `learningV2CourseReleasedSessionGetV3`
- `learningV2CourseReleasedSessionGetV2`
- `adminQueueV2GenerationPlan`
- `submitLearningV2RequiredSessionCompletion`
- `adminRunContentGenerationUnit`
- `aiDialogSyncPurchase`
- `authorizeLearningV2CourseUnlock`
- `adminRunV2E1Compilation`
- `adminSetSpinWeights`
- `adminImportV2OwnerEpisodeStage`
- `adminSaveV2SeasonDraft`
- `adminListContentFactoryJobs`
- `friendsLessonTogetherMark`
- `flashcardPackGiftSyncState`
- `supportInboxOnNewMail`
- `adminGetContentFactoryJobDetail`
- `grantMistakeCorrectionReward`
- `finalizeLearningV2AccessPurchase`
- `videoWatchRunesClaim`
- `adminGetV2OwnerGeneratorWorkspace`
- `collectiblesClaimDrop`
- `learningV2CourseActiveCatalogGetV1`
- `youtubeOAuthCallback`
- `adminSealCourseRelease`
