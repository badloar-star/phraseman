# PM-221 — Карта серверных доменов и владельцев

Сгенерировано `node scripts/pm221_server_domain_map.mjs` (детерминированно: без даты и без обращения к сети).

Всего серверных точек (callable/http/schedule/trigger) из атласа: **503**. Имён с живым экспортом в `functions/src/index.ts`: 430.

## Сводка по доменам

| Домен | Всего | keep | dormant | retired-tombstone | atlas-false-positive | needs-owner-decision |
|---|---:|---:|---:|---:|---:|---:|
| auth | 19 | 19 | 0 | 0 | 0 | 0 |
| purchases/subscriptions | 66 | 66 | 0 | 0 | 0 | 0 |
| account-delete | 11 | 11 | 0 | 0 | 0 | 0 |
| support/reports | 46 | 46 | 0 | 0 | 0 | 0 |
| content/video | 13 | 13 | 0 | 0 | 0 | 0 |
| notifications | 45 | 44 | 0 | 0 | 1 | 0 |
| sync/progress | 11 | 11 | 0 | 0 | 0 | 0 |
| admin | 48 | 48 | 0 | 0 | 0 | 0 |
| ai/audio | 44 | 25 | 0 | 17 | 0 | 2 |
| learning-v2 | 83 | 55 | 28 | 0 | 0 | 0 |
| social/friends | 55 | 55 | 0 | 0 | 0 | 0 |
| spire/arena | 58 | 22 | 0 | 36 | 0 | 0 |
| retired-tombstone | 4 | 0 | 0 | 4 | 0 | 0 |
| **Итого** | **503** | **415** | **28** | **57** | **1** | **2** |

## Владельцы и коллекции доменов

Решения по любому домену принимает владелец продукта; колонка «Сессия» — кто правит код (D40).

| Домен | Сессия | Коллекции Firestore (статический разбор файлов домена) |
|---|---|---|
| auth | Логика/сервер (Accounts V2); вход в админку — CLAUDE.md «не ломать» | `admin_command_operations`, `admin_duplicate_cleanup_jobs`, `admin_log`, `auth_links`, `banned_users`, `content_v2_required_session_sets`, `leaderboard`, `name_index`, `public_profiles`, `revenuecat_premium_lineages`, `user_consents`, `user_reports`, `user_warnings`, `users`, `users_dedup_archive` |
| purchases/subscriptions | Логика/сервер (покупки, монеты); цены и пакеты в сторах — владелец | `account_identity_owner_map`, `admin_alert_dedupe`, `admin_alert_events`, `admin_command_operations`, `admin_config`, `admin_duplicate_cleanup_jobs`, `admin_log`, `app_messages`, `auth_links`, `banned_users`, `community_pack_purchases`, `dialog_access`, `gift_certificate_deliveries`, `leaderboard`, `paywall_funnel`, `promo_codes`, `public_profiles`, `remote_config`, `remote_config_history`, `revenuecat_premium_denials`, `revenuecat_premium_events`, `revenuecat_premium_lineages`, `revenuecat_reconcile_reservations`, `revenuecat_shard_refunds`, `reward_claims`, `shard_rewards`, `telegram_premium_bot`, `telegram_premium_bot_sessions`, `telegram_premium_dead_letter`, `telegram_premium_orders`, `user_messages`, `user_reports`, `user_warnings`, `users`, `users_dedup_archive`, `voice_minute_denials`, `voice_minute_events` |
| account-delete | Логика/сервер | `account_deletion_jobs`, `account_deletion_log`, `account_deletion_restores`, `account_identity_owner_map`, `account_merge_outbox`, `admin_command_operations`, `admin_duplicate_cleanup_jobs`, `admin_log`, `arena_club_events`, `arena_season_leaderboard`, `arena_sessions`, `arena_v2_match_private`, `arena_v2_matches`, `auth_links`, `banned_users`, `email_contacts`, `entries`, `friend_gift_daily_limits`, `friend_gift_history`, `friends`, `leaderboard`, `league_groups`, `public_profiles`, `user_reports`, `user_warnings`, `users`, `users_dedup_archive`, `website_contact_inbox` |
| support/reports | Логика/сервер + админка legacy.html | `admin_alert_dedupe`, `admin_alert_events`, `admin_command_operations`, `admin_config`, `admin_duplicate_cleanup_jobs`, `admin_log`, `auth_links`, `banned_users`, `community_pack_purchases`, `jarvis_approval_tokens`, `leaderboard`, `public_profiles`, `spire_task_report_receipts`, `support_auto_reply_counters`, `support_auto_reply_reservations`, `support_reply_batches`, `support_reply_operations`, `user_reports`, `user_warnings`, `users`, `users_dedup_archive`, `website_contact_inbox` |
| content/video | Логика/сервер + админка legacy.html | `channels`, `users`, `versions`, `videos`, `youtube_catalog_snapshots` |
| notifications | Логика/сервер | `admin_alert_dedupe`, `admin_alert_events`, `admin_command_operations`, `admin_config`, `admin_log`, `admin_push_jobs`, `app_messages`, `community_pack_purchases`, `community_packs`, `email_campaigns`, `flashcard_pack_gift_grants`, `global_broadcast_modals`, `home_hints`, `home_hints_history`, `poll_votes`, `reactions`, `reward_claims`, `user_messages`, `users` |
| sync/progress | Логика/сервер (D66 local-first) | `admin_log`, `events` |
| admin | Логика/сервер + админка legacy.html; Jarvis — jarvis_data_contract_guard | `account_deletion_jobs`, `account_deletion_restores`, `admin_command_operations`, `admin_config`, `admin_duplicate_cleanup_jobs`, `admin_log`, `app_activity`, `app_errors`, `auth_links`, `banned_users`, `client_economy_opening`, `client_economy_operations`, `economy_daily_stats`, `error_reports`, `external_economy_events`, `leaderboard`, `leaderboard_stats`, `lesson_stats`, `max_voice_ops_daily`, `name_index`, `paywall_funnel`, `public_profiles`, `referral_attributions`, `remote_config`, `remote_config_history`, `revenuecat_premium_denials`, `revenuecat_premium_events`, `revenuecat_shard_transactions`, `shard_rewards`, `support_inbox`, `telegram_premium_dead_letter`, `user_reports`, `user_warnings`, `users`, `users_dedup_archive`, `voice_minute_events`, `website_contact_inbox` |
| ai/audio | Логика/сервер; бюджет OpenAI — PM-224 | `admin_log`, `app_errors`, `config`, `max_voice_usage_recon` |
| learning-v2 | Логика/сервер + фабрика курса | `account_deletion_tombstones`, `account_identity_owner_map`, `admin_command_operations`, `admin_log`, `app_messages`, `auth_links`, `community_packs`, `content_factory_artifact_orphans`, `content_factory_bulk_plans`, `content_factory_catalog`, `content_factory_catalog_releases`, `content_factory_config`, `content_factory_correction_events`, `content_factory_flashcard_ledgers`, `content_factory_flashcard_semantic_keys`, `content_factory_job_reviews`, `content_factory_job_units`, `content_factory_jobs`, `content_factory_learning_v2_session_shard_receipts`, `content_factory_lesson_ledgers`, `content_factory_question_ledgers`, `content_factory_release_history`, `content_factory_releases`, `content_factory_source_registry`, `content_factory_stages`, `content_v2_required_session_sets`, `fixed_poll_votes`, `lesson_stats`, `progress_daily_counters`, `progress_events`, `progress_migrations`, `star_operations`, `users`, `v2_activity_released_settlement_decisions`, `v2_required_session_completion_inbox`, `v2_required_session_course_awards`, `v2_required_session_performance_award_decisions`, `v2_required_session_performance_awards` |
| social/friends | Логика/сервер | `account_deletion_auth_markers`, `account_deletion_tombstones`, `activity_like_stats`, `activity_likes_received`, `admin_command_operations`, `admin_log`, `banned_users`, `content_factory_config`, `friend_activity_like_daily_limits`, `friend_activity_likes_sent`, `friend_nudges`, `friend_pairs`, `friends`, `friends_together_nudge_receipts`, `global_broadcast_modals`, `idea_likes_sent`, `leaderboard`, `my_events`, `public_profiles`, `remote_config`, `shard_rewards`, `users` |
| spire/arena | Логика/сервер (Шпиль, D113) | `admin_command_operations`, `admin_log`, `attempts`, `auth_links`, `banned_users`, `error_reports`, `internal`, `inventory`, `leaderboard`, `public_profiles`, `shard_log`, `terminals`, `users` |
| retired-tombstone | Логика/сервер (надгробия старым клиентам) | — (имена через константы) |

## Правила (A1/A2)

- A1: у каждой строки есть домен и сохраняемая возможность одной фразой.
- A2: домены auth, purchases/subscriptions, account-delete, support/reports всегда `keep` — даже если живого экспорта нет (тогда причина прямо говорит «проверить подключение»).
- retired-tombstone только там, где решение владельца записано в `03_DECISIONS.md` / `functions/src/index.ts` / CLAUDE.md (MAX, турниры, Арена D74/D78, tutorText и dev-выдачи D81, косметика D102) и экспорта нет.
- dormant — возможность сохранена решением (D96 Learning V2), но экспорта нет: функция не деплоится. atlas-false-positive — не функция (строка из комментария).
- Всё, что не удалось классифицировать уверенно, либо не экспортируется без записи о решении, — `needs-owner-decision`.

## Список needs-owner-decision

| Функция | Тип | Домен | Файл | Причина |
|---|---|---|---|---|
| statsInsightsGenerate | callable | ai/audio | functions/src/stats_insights.ts | экспорта нет, вызова из клиента нет, решения в 03_DECISIONS нет: удалить код или подключить в 2.0 |
| weeklyReviewGenerate | callable | ai/audio | functions/src/weekly_review.ts | экспорта нет, вызова из клиента нет, решения в 03_DECISIONS нет: удалить код или подключить в 2.0 |

## В облаке, но нет в коде (сверка PM-007): 112

Статусы: keep 2, retired-tombstone 96, needs-owner-decision 14. Полная выкладка `default` удалит ВСЕ эти функции — keep здесь значит «код надо вернуть в ветку до выкладки».

| Функция | Домен | Статус | Основание |
|---|---|---|---|
| activationEmailRetryCron | purchases/subscriptions | keep | сторож почты активации (инцидент 21.09). Код только в ветке claude/sad-cannon-876ae9 (3d3f7a824, bcfbd5836) — ПЕРЕНЕСТИ до полной выкладки, иначе удалится молча (PM-222 §6) |
| adminGetCoinExchangeCenter | purchases/subscriptions | retired-tombstone | D70/D78/D84: жемчуг и биржа удалены; клиентский вызов shardsApplyDelta — только досылка старой очереди, not-found снимается как постоянный отказ (PM-222 §6.1) |
| adminGetCosmeticAssetArchive | other | retired-tombstone | D102/D108: косметика удалена |
| adminGetMaxVoiceOpsDashboard | ai/audio | retired-tombstone | MAX законсервирован (CLAUDE.md 2026-09-04) |
| adminListMaxVoiceFeedback | ai/audio | retired-tombstone | MAX законсервирован (CLAUDE.md 2026-09-04) |
| adminMoveLeagueUser | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| adminRefundCommunityPackPurchase | purchases/subscriptions | retired-tombstone | D110: удалить |
| adminResetLeaguePoints | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| adminSetCoinExchangeRate | purchases/subscriptions | retired-tombstone | D70/D78/D84: жемчуг и биржа удалены; клиентский вызов shardsApplyDelta — только досылка старой очереди, not-found снимается как постоянный отказ (PM-222 §6.1) |
| adminSetCosmeticAssetSaleStatus | other | retired-tombstone | D102/D108: косметика удалена |
| adminSetShardBalance | purchases/subscriptions | retired-tombstone | D70/D78/D84: жемчуг и биржа удалены; клиентский вызов shardsApplyDelta — только досылка старой очереди, not-found снимается как постоянный отказ (PM-222 §6.1) |
| aiDialogSyncPurchase | purchases/subscriptions | retired-tombstone | D124: покупки диалогов за руны не учитываются; клиентский вызов мёртв (PM-222 §6.1) |
| arenaExpansionHome | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaGhostAccept | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaGhostCreate | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaGhostDecline | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaGhostStatus | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaMatchLabGet | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaPartnerAccept | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaPartnerClaimSpotlight | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaPartnerInvite | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaPartnerNudge | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaPartnerPause | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaPartnerPreferences | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaPartnerRemove | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaRivalAccept | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaRivalLeave | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaRivalMute | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaRivalNext | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaRivalPropose | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaStarEquip | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaStarPurchase | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaStarStore | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaTodayStart | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaTodaySubmitAnswer | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaTodaySubmitSpeedAttempt | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaTodaySync | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2CleanupHourly | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2DevFriendBotCreate | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2FindMatch | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2Forfeit | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2FriendsBoard | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2Home | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2InviteAccept | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2InviteCancel | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2InviteCreate | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2InviteDecline | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2InviteReady | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2InviteStatus | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2MatchAccept | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2MatchDecline | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2MatchFinish | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2MatchPlan | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2MatchSettle | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2OnQueueWrite | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2QueueCancel | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2QuickBotFallback | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2RankedBotFallback | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2ReleaseStaleMatch | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2SeasonClaim | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2SubmitAnswer | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2SubmitSpeedAttempt | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| arenaV2SyncMatch | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| authorizeLearningV2CourseUnlock | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| communityPurchasePack | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| computeLeaderboardStatsCron | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| cosmeticAssetCatalogGet | other | retired-tombstone | D102/D108: косметика удалена |
| devRunesGrant | ai/audio | retired-tombstone | D81: репетитор Макса и dev-выдачи удалить |
| devShardsGrant | ai/audio | retired-tombstone | D81: репетитор Макса и dev-выдачи удалить |
| exchangeCoinsForStars | purchases/subscriptions | retired-tombstone | D70/D78/D84: жемчуг и биржа удалены; клиентский вызов shardsApplyDelta — только досылка старой очереди, not-found снимается как постоянный отказ (PM-222 §6.1) |
| friendClaimQuestReward | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| friendConsumeChainShield | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| friendGetActiveQuest | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| friendSendGift | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |
| friendThankGift | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |
| friendsClaimWeeklyChest | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| getCoinExchangeHistory | purchases/subscriptions | retired-tombstone | D70/D78/D84: жемчуг и биржа удалены; клиентский вызов shardsApplyDelta — только досылка старой очереди, not-found снимается как постоянный отказ (PM-222 §6.1) |
| getCoinExchangeQuote | purchases/subscriptions | retired-tombstone | D70/D78/D84: жемчуг и биржа удалены; клиентский вызов shardsApplyDelta — только досылка старой очереди, not-found снимается как постоянный отказ (PM-222 §6.1) |
| leaderboardUpdateDailyAnalytics | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| leagueActivateGroupBoost | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| leagueChestClaim | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| leagueFinalizeCron | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| leagueJoinOrUpdateGroup | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| leagueResidentsTickCron | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| leagueSyncMyBoost | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| leagueUpdateMyMember | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| levelGiftActivatePackGift | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |
| levelGiftReserve | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |
| levelRewardSpinAcknowledge | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |
| levelRewardSpinClaim | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |
| levelRewardSpinDelivery | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |
| levelRewardSpinEnrollV1 | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |
| levelRewardSpinStatus | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |
| levelSpinActivatePackGift | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |
| maxVoiceConfigAdmin | ai/audio | retired-tombstone | MAX законсервирован (CLAUDE.md 2026-09-04) |
| profileCardUpgrade | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| recalcCoinExchangeRate | purchases/subscriptions | retired-tombstone | D70/D78/D84: жемчуг и биржа удалены; клиентский вызов shardsApplyDelta — только досылка старой очереди, not-found снимается как постоянный отказ (PM-222 §6.1) |
| referralDevGrantSpin | ai/audio | retired-tombstone | D81: репетитор Макса и dev-выдачи удалить |
| resendKeyHealthCron | purchases/subscriptions | keep | сторож почты активации (инцидент 21.09). Код только в ветке claude/sad-cannon-876ae9 (3d3f7a824, bcfbd5836) — ПЕРЕНЕСТИ до полной выкладки, иначе удалится молча (PM-222 §6) |
| resetWeeklyXpCron | spire/arena | retired-tombstone | Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222) |
| resolveLearningV2CourseUnlockReceipt | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| seasonBuyPass | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| seasonClaimReward | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| seasonRedeemConsumable | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| seasonSendFriendShield | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| shardsApplyDelta | purchases/subscriptions | retired-tombstone | D70/D78/D84: жемчуг и биржа удалены; клиентский вызов shardsApplyDelta — только досылка старой очереди, not-found снимается как постоянный отказ (PM-222 §6.1) |
| statsInsightsGenerate | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| submitMaxVoiceFeedback | ai/audio | retired-tombstone | MAX законсервирован (CLAUDE.md 2026-09-04) |
| tutorTextTopics | ai/audio | retired-tombstone | D81: репетитор Макса и dev-выдачи удалить |
| tutorTextTurn | ai/audio | retired-tombstone | D81: репетитор Макса и dev-выдачи удалить |
| weeklyReviewGenerate | other | needs-owner-decision | в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит |
| welcomeGiftClaim | social/friends | retired-tombstone | подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты) |

## Полная таблица

| Функция | Тип | Домен | Возможность | Статус | Экспорт index.ts | Файл |
|---|---|---|---|---|---|---|
| accountClaimMine | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/account_claim.ts:245 |
| accountMergeOutboxRetryCron | schedule | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_merge.ts:1322 |
| accountMergeOutboxWorker | trigger | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_merge.ts:1314 |
| adminRelinkProvider | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/admin_auth_repair.ts:311 |
| adminRepairAuthLink | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/admin_auth_repair.ts:131 |
| adminRequestUserMerge | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/admin_user_operations.ts:345 |
| authCleanInstallRecoveryDeliveryWorker | trigger | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_recovery.ts:1301 |
| authCompleteRecoveryHandoff | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_recovery.ts:1925 |
| authConfirmCleanInstallRecoveryCode | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_recovery.ts:1476 |
| authConfirmRecoveryCode | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_recovery.ts:865 |
| authEnsureStableLink | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_identity.ts:2142 |
| authIssueRecoveryHandoffToken | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_recovery.ts:1800 |
| authMergeStableAccounts | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_merge.ts:1546 |
| authorizeLearningV2CourseUnlock | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | нет | functions/src/learning_v2_course_unlock.ts:375 |
| authRecoveryHint | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_identity.ts:2226 |
| authRequestCleanInstallRecoveryCode | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_recovery.ts:1255 |
| authRequestRecoveryCode | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_recovery.ts:480 |
| authStampAnonOwnership | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_identity.ts:2297 |
| recordAgeConsentSnapshot | callable | auth | Фиксация возрастного согласия (приватность и вход) | keep | да | functions/src/record_age_consent_snapshot.ts:181 |
| adminActivateTelegramPremiumOrder | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/telegram_premium_admin.ts:256 |
| adminAlertOnGiftCertificateCreated | trigger | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_alert_sources_revenue.ts:191 |
| adminAlertOnRevenueCatReceipt | trigger | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_alert_sources_revenue.ts:162 |
| adminAlertOnTelegramPremiumOrderWritten | trigger | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_alert_sources_revenue.ts:183 |
| adminAlertOnUgcRefund | trigger | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_alerts.ts:516 |
| adminCancelGiftCertificateBatchOperation | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2245 |
| adminCancelStripeSubscriptionRenewal | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2804 |
| adminCreateGiftCertificateBatch | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2139 |
| adminDeactivateVipSurveyCampaign | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_app_messages.ts:944 |
| adminDeleteGiftCertificate | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2325 |
| adminGetGiftCertificateBatchOperation | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2227 |
| adminGetGiftCertificateDownload | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2373 |
| adminGetPaywallAbWorkspace | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_paywall_ab.ts:258 |
| adminGetPaywallVariantStats | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_paywall_variant_stats.ts:511 |
| adminGetRevenueCatOverviewMetrics | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_revenuecat_overview.ts:120 |
| adminGrantAccess | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_access_controls.ts:158 |
| adminGrantVoiceMinutes | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_voice_minutes.ts:92 |
| adminInspectTelegramPromoCode | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/telegram_premium_admin.ts:235 |
| adminLaunchVipSurveyCampaign | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_app_messages.ts:902 |
| adminListGiftCertificates | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2267 |
| adminListPromoCodes | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/promo_codes.ts:614 |
| adminListShardRefunds | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_shard_refunds.ts:153 |
| adminMigrateLegacyAdminPremium | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_user_operations.ts:426 |
| adminPublishPaywallAb | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_paywall_ab.ts:180 |
| adminRepairPendingReferralPurchase | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_referral_purchase_repair.ts:313 |
| adminReplaceSyntheticGiftCertificate | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2500 |
| adminResumePendingReferralPurchaseRepair | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_referral_purchase_repair.ts:456 |
| adminSendPreparedGiftCertificate | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2554 |
| adminSubscriptionAnalytics | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_subscription_analytics.ts:123 |
| adminUpdateGiftCertificatePersonalization | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2457 |
| adminUpdateGiftCertificateRecipient | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2414 |
| aiDialogBuyExtraReplies | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/ai_dialog_extra_replies.ts:172 |
| aiDialogSyncPurchase | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | нет | functions/src/ai_dialog_sync_purchase.ts:96 |
| createV2AccessPurchaseCallable | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | нет | functions/src/learning_v2_access_callable.ts:128 |
| finalizeLearningV2AccessPurchase | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/learning_v2_access_production_callable.ts:16 |
| giftsToCoinsMigrationReport | callable | purchases/subscriptions | Кошелёк монет: начисление и отчёт миграции подарков в монеты (D03, Q12/Q13) | keep | да | functions/src/gifts_to_coins_report.ts:98 |
| introFullAccessClaim | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/gift_access.ts:67 |
| levelSpinStarGrant | callable | purchases/subscriptions | Кошелёк монет: начисление и отчёт миграции подарков в монеты (D03, Q12/Q13) | keep | да | functions/src/level_spin_star_grant.ts:314 |
| paypalOrderCapture | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:3268 |
| paypalOrderCreate | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:3185 |
| premiumDialogReview | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/premium_dialog_review.ts:594 |
| premiumDialogSend | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/premium_dialog.ts:1045 |
| premiumDialogStream | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/premium_dialog_stream.ts:181 |
| premiumDialogTranslate | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/premium_dialog.ts:1597 |
| premiumExpiryCron | schedule | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/premium_expiry_cron.ts:296 |
| premiumExpiryReminderCron | schedule | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/index.ts:484 |
| promoCodeBatchUpsert | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/promo_codes.ts:464 |
| promoCodeDelete | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/promo_codes.ts:534 |
| promoCodeRedeem | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/promo_codes.ts:182 |
| promoCodeUpsert | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/promo_codes.ts:423 |
| recordVipSurveyReviewClick | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/vip_survey.ts:245 |
| referralClaimVipReward | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/referral.ts:999 |
| revenueCatPremiumReconcileMine | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/revenuecat_reconcile.ts:389 |
| revenueCatShardsWebhook | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/revenuecat_shards.ts:1295 |
| stripeWebhook | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:3072 |
| submitVipSurvey | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/vip_survey.ts:134 |
| telegramPremiumActivationNotifier | trigger | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/telegram_premium_bot.ts:1077 |
| telegramPremiumWebhook | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/telegram_premium_bot.ts:1036 |
| vipRevokeMine | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/vip_revoke.ts:31 |
| voiceMinuteWalletMine | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/voice_minutes_api.ts:46 |
| webActivationReminderCron | schedule | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_activation_reminders.ts:236 |
| webCheckoutCreate | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2916 |
| webLeadCapture | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_leads.ts:346 |
| webLeadNudgeCron | schedule | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_leads.ts:425 |
| webOrderStatus | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:3394 |
| webPrices | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:3353 |
| ACCOUNT_DELETE_RETRY_OPTIONS | trigger | account-delete | Опции повтора воркера удаления аккаунта (константа, не функция — ложное срабатывание атласа) | keep | нет | functions/src/account_delete_worker.ts:27 |
| accountDeleteCredentialStatus | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete.ts:2033 |
| accountDeleteEnqueue | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete.ts:2011 |
| accountDeleteMine | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete.ts:2048 |
| accountDeleteRestoreMine | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete_restore.ts:84 |
| accountDeleteRetryCron | schedule | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete_worker.ts:86 |
| accountDeleteStatusMine | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete_restore.ts:49 |
| accountsV2DeletionStatus | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/accounts_v2_deletion/status_callable.ts:131 |
| adminAuditAccountDeleteCoverage | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete_ai_audit.ts:51 |
| adminDeleteDuplicateUser | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/admin_user_operations.ts:365 |
| adminQueueAccountDeletion | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/admin_account_delete.ts:433 |
| adminAlertOnCancelSurvey | trigger | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_alerts.ts:508 |
| adminAlertOnContentReport | trigger | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_alerts.ts:463 |
| adminAlertOnFeedbackCreated | trigger | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_alert_sources_ratings.ts:59 |
| adminAlertOnUserIdeaReport | trigger | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/user_idea_reports.ts:338 |
| adminAlertOnUserReport | trigger | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_alerts.ts:163 |
| adminDraftReportReply | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/report_replies.ts:613 |
| adminExportReportDocuments | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_reports_center.ts:564 |
| adminExportUnresolvedReports | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_reports_center.ts:593 |
| adminGetFeedbackStats | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/feedback_admin_stats.ts:84 |
| adminListFeedbackEntries | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/feedback_entries.ts:231 |
| adminListReportQueue | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_reports_center.ts:537 |
| adminListSafetyFlags | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_compliance.ts:226 |
| adminMarkSafetyFlagsHandled | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_compliance.ts:286 |
| adminReplyToReport | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/report_replies.ts:356 |
| adminResolveUserReport | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_user_operations.ts:294 |
| adminSummarizeFeedback | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/feedback_summary.ts:221 |
| adminSummarizeFeedback | schedule | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/index.ts:439 |
| adminSupportArchiveMessages | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:6388 |
| adminSupportCancelReply | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:5164 |
| adminSupportCancelReplyBatch | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:5816 |
| adminSupportConversation | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:2114 |
| adminSupportDispatchReply | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:5151 |
| adminSupportDispatchReplyBatch | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:5567 |
| adminSupportGenerateReply | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:2145 |
| adminSupportList | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:2062 |
| adminSupportPrepareReply | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:5109 |
| adminSupportPrepareReplyBatch | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:5322 |
| adminSupportPull | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:2017 |
| adminSupportResolveReplyDelivery | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:5921 |
| adminSupportSaveAutomation | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:6054 |
| adminSupportSaveDraft | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:6160 |
| adminSupportSaveInstructions | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:6100 |
| adminSupportSaveSignature | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:6027 |
| adminSupportSendReply | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:5159 |
| adminSupportSetStatus | callable | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:6358 |
| adminUpdateReportStatus | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_reports_center.ts:653 |
| claimReportReward | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/report_replies.ts:525 |
| maxVoiceSafetyReport | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | нет | functions/src/max_voice_safety.ts:480 |
| reportUserIdea | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/user_idea_reports.ts:67 |
| submitClientReport | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/client_reports.ts:645 |
| submitExplainReport | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/explain/explain_reports.ts:127 |
| submitFeedbackEntry | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/feedback_entries.ts:157 |
| submitWebsiteContact | http | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/website_contact.ts:155 |
| supportInboxOnNewMail | trigger | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:6712 |
| supportOpsCron | schedule | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/index.ts:523 |
| supportTelegramReplyJobOnCreate | trigger | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:4946 |
| adminAlignVideoPhraseTranscript | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrase_timing.ts:34 |
| adminBackfillVideoPacks | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:511 |
| adminGetVideoPhraseWorkspace | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:384 |
| adminGetVideoStudioWorkspace | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:297 |
| adminGetYoutubeCatalogWorkspace | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/youtube_catalog.ts:422 |
| adminParseVideoPhraseDocument | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:461 |
| adminPublishVideoPhrases | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:414 |
| adminPublishYoutubeCatalogConfig | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/youtube_catalog.ts:447 |
| adminRefreshYoutubeCatalog | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/youtube_catalog.ts:516 |
| adminSaveVideoPhraseDraft | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:392 |
| siteStatsTrack | http | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/site_stats.ts:109 |
| videoWatchRunesClaim | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_watch_runes.ts:188 |
| youtubeCatalogSyncCron | schedule | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/youtube_catalog.ts:411 |
| adminAlertDailyDigestsCron | schedule | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_digests.ts:51 |
| adminAlertDispatchOnCreate | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_dispatcher.ts:377 |
| adminAlertOnAdminAuditCreated | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_sources_ops.ts:94 |
| adminAlertOnAppMessageWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_sources_ops.ts:102 |
| adminAlertOnAuthFailureSpike | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alerts.ts:619 |
| adminAlertOnBanWrite | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_sources_people.ts:174 |
| adminAlertOnComplianceControlWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_sources_ops.ts:106 |
| adminAlertOnConfigWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alerts.ts:633 |
| adminAlertOnCriticalError | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alerts.ts:262 |
| adminAlertOnCronHeartbeat | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alerts.ts:437 |
| adminAlertOnJarvisPlanWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_sources_ops.ts:110 |
| adminAlertOnPromoRedemptionCreated | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_sources_revenue.ts:199 |
| adminAlertOnPushJobWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_sources_ops.ts:98 |
| adminAlertRecoveryCron | schedule | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_dispatcher.ts:390 |
| adminCleanupExpiredAppMessages | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:848 |
| adminCreateAppMessage | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:478 |
| adminDeactivateGlobalBroadcast | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_global_broadcast.ts:600 |
| adminDeleteAppMessage | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:798 |
| adminEmailBroadcast | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_email.ts:493 |
| adminEmailContactsBackfill | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_email.ts:428 |
| adminGetAlertDiagnostics | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_dispatcher.ts:417 |
| adminGetHomeHintsCatalog | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_home_hints.ts:59 |
| adminListAppMessages | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:468 |
| adminListGlobalBroadcasts | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_global_broadcast.ts:493 |
| adminPublishGlobalBroadcast | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_global_broadcast.ts:527 |
| adminPublishHomeHints | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_home_hints.ts:67 |
| adminPushJobCreated | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_push_jobs.ts:556 |
| adminPushJobsCron | schedule | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_push_jobs.ts:566 |
| adminScrubGlobalBroadcastMetadata | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_global_broadcast.ts:663 |
| adminSendPersonalAppMessage | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:414 |
| adminSetAppMessageActive | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:548 |
| adminUpdateAppMessage | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:697 |
| adminVerifyGlobalBroadcastPrivacyReadiness | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_global_broadcast.ts:766 |
| emailUnsubscribe | http | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/email_unsubscribe.ts:211 |
| globalBroadcastClaim | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/global_broadcast_claim.ts:102 |
| globalBroadcastListActive | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/global_broadcast_public.ts:75 |
| myCron | schedule | notifications | Пример обёртки withCronHeartbeat в doc-комментарии cron_heartbeat.ts — не функция | atlas-false-positive | нет | functions/src/cron_heartbeat.ts:64 |
| notifyOnFriendAccepted | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/user_notifications.ts:100 |
| notifyOnFriendRequestCreated | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/user_notifications.ts:75 |
| notifyOnPackCommentCreated | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/user_notifications.ts:131 |
| onAppMessagePollVoteWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/app_messages.ts:178 |
| onAppMessageReactionWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/app_messages.ts:119 |
| onAppMessageStateWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/app_messages.ts:153 |
| reEngagePushCron | schedule | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/index.ts:461 |
| userNotificationsCleanupCron | schedule | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/user_notifications.ts:173 |
| accountsV2SyncApply | callable | sync/progress | Accounts V2: синхронизация прогресса устройства с аккаунтом (D66: сервер = синхронизация) | keep | да | functions/src/accounts_v2_adapter/callable.ts:470 |
| adminActivateQuest | callable | sync/progress | Связка записи профиля пользователя, квесты и регламентные сверки | keep | да | functions/src/quests.ts:489 |
| adminArchiveQuest | callable | sync/progress | Связка записи профиля пользователя, квесты и регламентные сверки | keep | да | functions/src/quests.ts:530 |
| adminDeleteQuest | callable | sync/progress | Связка записи профиля пользователя, квесты и регламентные сверки | keep | да | functions/src/quests.ts:542 |
| adminListQuests | callable | sync/progress | Связка записи профиля пользователя, квесты и регламентные сверки | keep | да | functions/src/quests.ts:563 |
| adminWriteQuest | callable | sync/progress | Связка записи профиля пользователя, квесты и регламентные сверки | keep | да | functions/src/quests.ts:450 |
| questClaimReward | callable | sync/progress | Связка записи профиля пользователя, квесты и регламентные сверки | keep | да | functions/src/quests.ts:351 |
| questGetActive | callable | sync/progress | Связка записи профиля пользователя, квесты и регламентные сверки | keep | да | functions/src/quests.ts:207 |
| questReportProgress | callable | sync/progress | Связка записи профиля пользователя, квесты и регламентные сверки | keep | да | functions/src/quests.ts:274 |
| soc2ReadinessCollectorCron | schedule | sync/progress | Связка записи профиля пользователя, квесты и регламентные сверки | keep | да | functions/src/soc2_readiness_collector.ts:240 |
| usersWriteRouter | trigger | sync/progress | Связка записи профиля пользователя, квесты и регламентные сверки | keep | да | functions/src/users_write_router.ts:16 |
| adminCardTtsRequeuePack | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/card_tts_worker.ts:491 |
| adminCreateAssetJob | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_asset_studio.ts:244 |
| adminGenerateDailyDigest | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_daily_digest.ts:1055 |
| adminGetAdminConfigWorkspace | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_config_controls.ts:156 |
| adminGetAnalyticsSnapshot | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_analytics.ts:160 |
| adminGetAnalyticsTrends | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_analytics_trends.ts:836 |
| adminGetComplianceOverview | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_compliance.ts:171 |
| adminGetDailyBriefing | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_daily_digest.ts:1017 |
| adminGetDiagnosticsOverview | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_diagnostics_overview.ts:71 |
| adminGetDirectorDigest | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_director_digest.ts:478 |
| adminGetProductCharter | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_product_charter.ts:52 |
| adminGetRemoteConfigWorkspace | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_remote_config.ts:171 |
| adminGetUserProfile | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_profile.ts:473 |
| adminGrantReward | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_grant.ts:181 |
| adminListAssetJobs | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_asset_studio.ts:233 |
| adminListAuditLog | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_audit_log.ts:182 |
| adminListOpsLog | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_ops_log.ts:213 |
| adminMonthlyDecisionPack | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_monthly_decision_pack.ts:110 |
| adminOpenDailyDigest | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_daily_digest.ts:994 |
| adminProductAnalytics | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_product_analytics.ts:1277 |
| adminPublishAlertsConfig | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_config_controls.ts:171 |
| adminPublishNavLayout | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_config_controls.ts:166 |
| adminPublishRemoteConfig | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_remote_config.ts:104 |
| adminResetUserProgress | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_operations.ts:467 |
| adminRunAssetJob | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_asset_studio.ts:271 |
| adminSaveProductCharter | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_product_charter.ts:84 |
| adminSearchUsers | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_profile.ts:265 |
| adminSetUserBan | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_access_controls.ts:182 |
| adminTestAlerts | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_config_controls.ts:176 |
| adminUpdateUserProfileField | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_operations.ts:234 |
| adminUserBriefs | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_briefs.ts:160 |
| adminWarmInstanceGauge | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/warm_instance_gauge.ts:205 |
| adminWarnUser | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_operations.ts:269 |
| jarvisDailyBusinessHistoryCron | schedule | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/jarvis_crons.ts:654 |
| jarvisDailyDepartmentsCron | schedule | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/jarvis_crons.ts:212 |
| jarvisDeletePlan | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/jarvis_plans_callables.ts:86 |
| jarvisGetAllDecisions | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/all_departments_callables.ts:87 |
| jarvisGetApprovalAudit | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/all_departments_callables.ts:242 |
| jarvisGetBusinessTier | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/business_tier_callables.ts:63 |
| jarvisGetCohortRetention | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/all_departments_callables.ts:217 |
| jarvisGetGrowthSnapshot | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/growth_callables.ts:62 |
| jarvisGetMoneySnapshot | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/money_callables.ts:63 |
| jarvisGetPlans | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/jarvis_plans_callables.ts:69 |
| jarvisGetQualitySnapshot | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/callables.ts:63 |
| jarvisProductKnowledgeReviewCron | schedule | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/jarvis_crons.ts:726 |
| jarvisRunBusinessTierBackfill | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/business_tier_callables.ts:98 |
| jarvisSetPlanStatus | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/jarvis_plans_callables.ts:77 |
| jarvisTelegramApprovalWebhook | http | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/jarvis/approval_webhook.ts:174 |
| adminCommunityPackApplyQaFixes | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/admin_community_pack_qa.ts:546 |
| adminCommunityPackApplyQaFixesToPublished | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/admin_community_pack_qa.ts:630 |
| adminCommunityPackQaReview | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/admin_community_pack_qa.ts:430 |
| adminCommunityPackTranslateLocales | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/admin_community_pack_translate.ts:151 |
| adminGenerateDirectorDigestAudio | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/admin_director_digest_audio.ts:120 |
| adminGetMaxVoiceOpsDashboard | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_ops_dashboard.ts:268 |
| adminListMaxVoiceFeedback | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_feedback.ts:152 |
| adminListMistakeExplanationCache | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/admin_explain_cache.ts:86 |
| adminTranslateMessage | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/admin_translate.ts:88 |
| cardTtsPackWorker | trigger | ai/audio | Озвучка карточек OpenAI TTS при одобрении набора (D128) | keep | да | functions/src/card_tts_worker.ts:463 |
| dialogueV2Catalogue | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_catalogue_callable.ts:62 |
| dialogueV2FreeformPreparedBotVoiceResolve | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_freeform_prepared_bot_voice_callable.ts:178 |
| dialogueV2FreeformSessionStart | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_freeform_session_start_callable.ts:247 |
| dialogueV2FreeformSessionTurn | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_freeform_session_turn_callable.ts:522 |
| dialogueV2MemoryClear | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_memory_management_callable.ts:134 |
| dialogueV2MemoryResume | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_memory_resume_callable.ts:84 |
| dialogueV2MemoryView | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_memory_management_callable.ts:120 |
| dialogueV2SessionComplete | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_session_complete_callable.ts:561 |
| dialogueV2SessionStart | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_session_start_callable.ts:192 |
| dialogueV2TextTurn | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_turn_production_callable.ts:799 |
| explainChoice | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/explain_choice.ts:76 |
| explainMistake | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/mistake_explain.ts:787 |
| explainPhrase | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/explain_phrase.ts:109 |
| maxVoiceClearMemory | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_memory_controls.ts:344 |
| maxVoiceConfigAdmin | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_config.ts:412 |
| maxVoiceDeleteMemoryItem | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_memory_controls.ts:340 |
| maxVoiceFinalize | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_finalize.ts:797 |
| maxVoiceGetMemory | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_memory_controls.ts:332 |
| maxVoiceHeartbeat | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_session_end.ts:282 |
| maxVoiceMint | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_mint.ts:976 |
| maxVoicePreflight | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_mint.ts:696 |
| maxVoiceProviderHealth | schedule | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_watchdog.ts:275 |
| maxVoiceSessionEnd | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_session_end.ts:333 |
| maxVoiceUpdateMemory | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_memory_controls.ts:336 |
| maxVoiceUsageRecon | schedule | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_usage_recon.ts:333 |
| maxVoiceWatchdog | schedule | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_watchdog.ts:239 |
| openAiBudgetDashboard | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/openai_budget_dashboard.ts:270 |
| openAiDialogModelConfig | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/openai_dialog_model_config.ts:159 |
| openAiDialogQuotaConfig | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/openai_dialog_model_config.ts:200 |
| openAiJobsConfig | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/openai_jobs_config.ts:252 |
| statsInsightsGenerate | callable | ai/audio | ИИ-заметки к статистике и ИИ-разбор ошибок для Plus (OpenAI) | needs-owner-decision | нет | functions/src/stats_insights.ts:496 |
| submitMaxVoiceFeedback | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_feedback.ts:71 |
| voiceMinuteDevGrant | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/voice_minutes_dev_grant.ts:59 |
| weeklyReviewGenerate | callable | ai/audio | ИИ-заметки к статистике и ИИ-разбор ошибок для Plus (OpenAI) | needs-owner-decision | нет | functions/src/weekly_review.ts:847 |
| adminActivateCourseRelease | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/language_release.ts:51 |
| adminApproveLearningV2CourseWave | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/learning_v2_course_shard_background.ts:301 |
| adminApproveV2EpisodeRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:209 |
| adminApproveV2SeasonRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:312 |
| adminArchiveV2EpisodeRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:239 |
| adminArchiveV2ModeTemplate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:392 |
| adminArchiveV2SeasonRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:322 |
| adminConfirmV2OwnerEpisode | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/content_factory/v2_owner_episode_confirmation_adapter_v1.ts:522 |
| adminControlContentStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:274 |
| adminCreateContentGenerationJob | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory.ts:92 |
| adminCreateContentStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:241 |
| adminCreateContentStageBulkPlan | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stage_bulk.ts:98 |
| adminCreatePlan | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_plans/callables.ts:25 |
| adminCreateV2GenerationPlan | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_v2_generation.ts:361 |
| adminDeleteShardSurvey | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/shard_survey.ts:385 |
| adminDeprecateV2ModeTemplate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:362 |
| adminEditContentStageArtifact | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stage_edits.ts:72 |
| adminGetContentFactoryJobDetail | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory_read.ts:96 |
| adminGetContentFactoryRolloutMetrics | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory_read.ts:197 |
| adminGetContentFactoryUnitPreview | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory_read.ts:138 |
| adminGetContentFactoryWorkspace | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory_read.ts:168 |
| adminGetContentStageCapabilities | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:326 |
| adminGetLearningV2CourseWorkspaceProjection | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:295 |
| adminGetOnboardingFunnel | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/onboarding_funnel.ts:311 |
| adminGetPlan | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_plans/callables.ts:27 |
| adminGetV2OwnerGeneratorSetupCatalog | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/content_factory/v2_owner_generator_setup_catalog_v1.ts:524 |
| adminGetV2OwnerGeneratorWorkspace | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/v2_owner_generator_workspace_v1.ts:204 |
| adminImportV2OwnerEpisodeStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/content_factory/v2_owner_episode_stage_repository_v1.ts:502 |
| adminIssueV2ContentGate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:249 |
| adminIssueV2EpisodeLocalizationReceipt | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:139 |
| adminIssueV2EpisodeValidationReceipt | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:122 |
| adminIssueV2EpisodeVoiceReceipt | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:159 |
| adminListContentFactoryJobs | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory.ts:142 |
| adminListContentStageDependencies | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:317 |
| adminListContentStages | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:286 |
| adminListPlans | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_plans/callables.ts:29 |
| adminPrepareV2OwnerEpisodeDraft | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/v2_owner_generator_workspace_v1.ts:245 |
| adminPreviewContentStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:331 |
| adminPreviewLearningV2CourseWave | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/learning_v2_course_shard_background.ts:372 |
| adminPublishAuthoredLearningV2Course | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/content_factory/learning_v2_publish_authored_course_v1.ts:484 |
| adminPublishV2ModeTemplate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:332 |
| adminRejectLearningV2CourseWave | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/learning_v2_course_shard_background.ts:335 |
| adminRequestV2EpisodeChanges | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:229 |
| adminReviewContentStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:368 |
| adminReviewCourseGeneration | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_release.ts:43 |
| adminReviewV2EpisodeRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:176 |
| adminRollbackCourseRelease | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/language_release.ts:94 |
| adminRunContentGenerationUnit | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory_worker.ts:70 |
| adminRunContentStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_stage_worker.ts:234 |
| adminRunV2E1Compilation | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/v2_e1_compilation_worker.ts:362 |
| adminSaveV2EpisodeDraft | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_studio_callables.ts:64 |
| adminSaveV2SeasonDraft | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_studio_callables.ts:276 |
| adminSealCourseRelease | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_release.ts:102 |
| adminSeedV2E1DemoSource | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/v2_e1_compilation_worker.ts:349 |
| adminSubmitV2EpisodeRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:219 |
| adminValidateV2EpisodeRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/admin_content_studio_callables.ts:94 |
| adminWriteShardSurvey | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/shard_survey.ts:336 |
| createRequiredSessionCompletionProductionCallable | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/learning_v2/required_session_completion_callable.ts:747 |
| dailyPhraseSetSaved | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/daily_phrases.ts:27 |
| finalizeLearningV2DelayedCandidate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/learning_v2_delayed_callable.ts:168 |
| getActiveShardSurvey | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/shard_survey.ts:125 |
| getLearningV2AccountBinding | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/learning_v2_wallet_reward_callable.ts:143 |
| getPublishedCourseRelease | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/language_release.ts:156 |
| grantMistakeCorrectionReward | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/mistake_practice_wallet_reward.ts:183 |
| learningV2ActivityAuxiliarySessionGetV1 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/content_factory/v2_activity_auxiliary_session_callable_v1.ts:280 |
| learningV2ActivityReleasedSessionGetV1 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/content_factory/v2_activity_released_session_callable_v1.ts:486 |
| learningV2CourseActiveCatalogGetV1 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/content_factory/v2_course_active_catalog_callable_v1.ts:238 |
| learningV2CourseReleasedSessionGetV2 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/content_factory/v2_course_released_session_callable_v2.ts:377 |
| learningV2CourseReleasedSessionGetV3 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/content_factory/v2_course_released_session_callable_v3.ts:338 |
| learningV2LocalizedCourseShardBackgroundWorker | trigger | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/learning_v2_course_shard_background.ts:237 |
| mistakeHubAdvice | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/mistake_hub_advice.ts:164 |
| mistakePracticeSyncEvents | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/mistake_practice_event_sync.ts:204 |
| practiceRuneGrant | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/practice_rune_grant.ts:302 |
| progressMigrateSnapshot | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/progress_events.ts:840 |
| progressSubmitEvent | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/progress_events.ts:656 |
| recordOnboardingFunnelEvent | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/onboarding_funnel.ts:299 |
| resolveLearningV2CourseUnlockReceipt | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/learning_v2_course_unlock.ts:380 |
| resolveLearningV2WalletRewardReceipt | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/learning_v2_wallet_reward_callable.ts:138 |
| submitLearningV2ActivityReleasedCompletionV1 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/learning_v2/activity_released_session_completion_callable_v1.ts:404 |
| submitLearningV2ActivityReleasedSessionV2 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | dormant | нет | functions/src/learning_v2/activity_released_session_submission_callable_v2.ts:793 |
| submitLearningV2CourseSessionCompletedV1 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/learning_v2/course_session_completed_summary_callable_v1.ts:306 |
| submitSettingsPollVote | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/settings_poll_vote.ts:53 |
| submitShardSurvey | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/shard_survey.ts:209 |
| adminAlertOnReferralAttributionWrite | trigger | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_alert_sources_people.ts:162 |
| adminDecideUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:634 |
| adminDeleteUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:476 |
| adminDraftIdeaDecision | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:763 |
| adminGetReferralDashboard | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:857 |
| adminListReferrals | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:783 |
| adminListUserIdeas | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:403 |
| adminReferralHealth | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:1389 |
| adminRestoreUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_idea_reports.ts:175 |
| adminRevokeReferralAttribution | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:520 |
| adminSetIdeaSubmissionRestriction | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_idea_reports.ts:259 |
| adminSetReferralRouletteEmergencyStop | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:1298 |
| adminSetReferralRouletteEnabled | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:1203 |
| adminSetSpinWeights | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:1118 |
| adminSetUserIdeaStatus | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:515 |
| adminSpinLogs | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:1082 |
| adminSpinStats | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:1021 |
| communityAdminModeratePack | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:943 |
| communityAuthorRemovePack | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:873 |
| communityFetchPackCardsIfAccessible | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1057 |
| communityListSellerInbox | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1381 |
| communityMarkSellerInboxSeen | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1416 |
| communityModerateSubmission | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:588 |
| communityRedeemPackGiftVoucher | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1372 |
| communitySubmitPackForReview | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:361 |
| communitySyncPackRuneSale | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_pack_rune_sale.ts:140 |
| customCardMilestoneNotify | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/custom_card_milestone.ts:43 |
| dailyPollVote | callable | social/friends | Опрос дня на Главной (решение владельца 30.09) | keep | да | functions/src/daily_poll_vote.ts:36 |
| flashcardPackGiftGrantGlobalBroadcast | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1280 |
| flashcardPackGiftRedeem | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1369 |
| flashcardPackGiftSyncState | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1320 |
| friendEnsureMyCode | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friend_codes.ts:81 |
| friendLikeActivity | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friend_activity_likes.ts:190 |
| friendLookupUser | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friend_lookup.ts:172 |
| friendsGetProfiles | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friends_profiles.ts:365 |
| friendsNudge | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friends_together.ts:117 |
| friendsTogetherClaimLevel | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friends_together.ts:109 |
| friendUnlikeActivity | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friend_activity_likes.ts:400 |
| getPublicUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:363 |
| likeUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_idea_likes.ts:45 |
| listPublicUserIdeas | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:321 |
| nameCheckAvailability | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/leaderboard.ts:223 |
| nameGenerateAndReserve | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/leaderboard.ts:249 |
| nameReleaseMine | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/leaderboard.ts:477 |
| nameReserve | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/leaderboard.ts:347 |
| profileCardBioSetMine | callable | social/friends | Визитка профиля: текст «о себе» (D73/D114) | keep | да | functions/src/profile_card_bio.ts:28 |
| publicProfileProjectMine | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/public_profile_projection.ts:149 |
| referralApply | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/referral.ts:647 |
| referralClaimSpin | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/referral_claim_spin.ts:69 |
| referralEnsureMyCode | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/referral.ts:586 |
| referralListMyInvites | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/referral.ts:854 |
| referralSpin | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/referral_spin.ts:138 |
| submitUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:179 |
| unlikeUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_idea_likes.ts:89 |
| updateUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:269 |
| adminArenaConfigGet | callable | spire/arena | Пул заданий Шпиля и его админ-публикация (CLAUDE.md: рабочая зависимость Шпиля, D74/D78) | keep | да | functions/src/admin_arena_config.ts:64 |
| adminArenaConfigSet | callable | spire/arena | Пул заданий Шпиля и его админ-публикация (CLAUDE.md: рабочая зависимость Шпиля, D74/D78) | keep | да | functions/src/admin_arena_config.ts:96 |
| adminArenaContentStatus | callable | spire/arena | Пул заданий Шпиля и его админ-публикация (CLAUDE.md: рабочая зависимость Шпиля, D74/D78) | keep | да | functions/src/admin_arena_content.ts:181 |
| adminArenaContentValidate | callable | spire/arena | Пул заданий Шпиля и его админ-публикация (CLAUDE.md: рабочая зависимость Шпиля, D74/D78) | keep | да | functions/src/admin_arena_content.ts:189 |
| adminArenaPublicationActivate | callable | spire/arena | Пул заданий Шпиля и его админ-публикация (CLAUDE.md: рабочая зависимость Шпиля, D74/D78) | keep | да | functions/src/admin_arena_publication.ts:221 |
| adminArenaPublicationRollback | callable | spire/arena | Пул заданий Шпиля и его админ-публикация (CLAUDE.md: рабочая зависимость Шпиля, D74/D78) | keep | да | functions/src/admin_arena_publication.ts:278 |
| adminArenaPublicationStage | callable | spire/arena | Пул заданий Шпиля и его админ-публикация (CLAUDE.md: рабочая зависимость Шпиля, D74/D78) | keep | да | functions/src/admin_arena_publication.ts:161 |
| adminArenaPublicationStatus | callable | spire/arena | Пул заданий Шпиля и его админ-публикация (CLAUDE.md: рабочая зависимость Шпиля, D74/D78) | keep | да | functions/src/admin_arena_publication.ts:182 |
| adminBulkTournamentFolder | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_full.ts:468 |
| adminEditTournamentTask | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:808 |
| adminFillTournamentPool | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:2718 |
| adminGenerateTournamentAi | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_full.ts:255 |
| adminGenerateTournamentAudioTasksAi | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:1462 |
| adminGenerateTournamentTasksAi | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:730 |
| adminGetTournamentCurated | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:950 |
| adminGetTournamentEconomy | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournament_weekly_payout.ts:245 |
| adminGetTournamentModeMix | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:2741 |
| adminGetTournamentSchedule | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:1243 |
| adminListTournamentTasks | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:978 |
| adminMutateTournamentTasks | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:1009 |
| adminPayoutTournamentWeeklyBank | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournament_weekly_payout.ts:197 |
| adminRegenerateTournamentTask | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_full.ts:375 |
| adminSeedBotProfiles | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournament_bots.ts:20 |
| adminSetTournamentCurated | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:902 |
| adminSetTournamentEconomy | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournament_weekly_payout.ts:219 |
| adminSetTournamentModeMix | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:2774 |
| adminSetTournamentSchedule | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:1199 |
| adminSpireConfigGet | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/admin_spire_config.ts:54 |
| adminSpireConfigSet | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/admin_spire_config.ts:64 |
| adminSpirePackBuild | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_pack_build.ts:585 |
| adminSpireTaskFlagAdd | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/admin_spire_task_flag.ts:347 |
| adminSpireTaskFlagList | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/admin_spire_task_flag.ts:335 |
| adminSpireTaskFlagRemove | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/admin_spire_task_flag.ts:450 |
| adminSpireTaskIncidentSetState | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/admin_spire_task_flag.ts:309 |
| adminSpireTaskIncidentStates | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/admin_spire_task_flag.ts:194 |
| adminSpireTaskReportList | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/admin_spire_task_flag.ts:180 |
| adminTournamentPoolStats | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/admin_tournament_tasks.ts:1092 |
| spireFinalizeCron | schedule | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_finalize_cron.ts:89 |
| spireJoinRoom | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_groups.ts:194 |
| spirePackWeeklyCron | schedule | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_pack_build.ts:522 |
| spireReportSteps | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_progress.ts:118 |
| spireZoneWarningCron | schedule | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_zone_warning_push.ts:310 |
| tournamentAdvanceRooms | schedule | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:4332 |
| tournamentAdvanceRound | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:4400 |
| tournamentClaimReward | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:4516 |
| tournamentCreateRooms | schedule | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:1509 |
| tournamentFillBots | schedule | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:2917 |
| tournamentFinalize | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:3808 |
| tournamentForfeit | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:2484 |
| tournamentJoin | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:2365 |
| tournamentLeave | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:2472 |
| tournamentRoundReview | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:4762 |
| tournamentStartNow | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:4564 |
| tournamentSubmitAnswers | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:3625 |
| tournamentSubmitSpeedMatchAttempt | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:3571 |
| tournamentSubmitTaskAnswer | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournaments.ts:3594 |
| tournamentWeeklyBankCron | schedule | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournament_weekly_payout.ts:184 |
| tournamentWeeklyBankInfo | callable | spire/arena | Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены | retired-tombstone | нет | functions/src/tournament_weekly_payout.ts:268 |
| COLLECTIBLES_RETIRED_MESSAGE | callable | retired-tombstone | Вежливый отказ старым клиентам за снятые коллекционные дропы | retired-tombstone | нет | functions/src/collectibles_retired.ts:26 |
| compassChatDailyCronDisabled | schedule | retired-tombstone | Вежливый отказ старым клиентам за снятые Help Board / Compass / дропы | retired-tombstone | нет | functions/src/help_board_decommission.ts:82 |
| helpBoardCompassRetryCronDisabled | schedule | retired-tombstone | Вежливый отказ старым клиентам за снятые Help Board / Compass / дропы | retired-tombstone | нет | functions/src/help_board_decommission.ts:72 |
| helpBoardGenerateCompassForTopicDisabled | trigger | retired-tombstone | Вежливый отказ старым клиентам за снятые Help Board / Compass / дропы | retired-tombstone | нет | functions/src/help_board_decommission.ts:63 |

## Честные ограничения

- Ничего не проверено на проде и деплое: `firebase functions:list`, реальные вызовы и логи не запускались.
- Классификация статическая — по имени функции, имени файла и разбору `index.ts` без комментариев; ошибки вероятны на границах доменов (например, `admin*`-функции по покупкам/поддержке разобраны по имени, а не по смыслу кода).
- Атлас сканирует только `functions/src`; кодовая база `functions-max` (MAX, снята с деплоя) и админка `admin/v2` в карту не входят.
- Регулярка атласа даёт ложные срабатывания: `COLLECTIBLES_RETIRED_MESSAGE` и `ACCOUNT_DELETE_RETRY_OPTIONS` — константы, а не функции; `adminSummarizeFeedback` виден и как callable, и как schedule.
- «Экспорт index.ts = да» — это наличие имени в неприкомментированном экспорте, а не факт деплоя.
- Домен `other` и статус needs-owner-decision означают «не знаю», а не «мусор».
