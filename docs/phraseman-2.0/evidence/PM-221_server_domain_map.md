# PM-221 — Карта серверных доменов и владельцев

Сгенерировано `node scripts/pm221_server_domain_map.mjs` (детерминированно: без даты и без обращения к сети).

Всего серверных точек (callable/http/schedule/trigger) из атласа: **567**. Имён с живым экспортом в `functions/src/index.ts`: 481.

## Сводка по доменам

| Домен | Всего | keep | retired-tombstone | needs-owner-decision |
|---|---:|---:|---:|---:|
| auth | 19 | 19 | 0 | 0 |
| purchases/subscriptions | 72 | 72 | 0 | 0 |
| account-delete | 10 | 10 | 0 | 0 |
| support/reports | 46 | 46 | 0 | 0 |
| content/video | 13 | 13 | 0 | 0 |
| notifications | 45 | 44 | 0 | 1 |
| sync/progress | 10 | 10 | 0 | 0 |
| admin | 50 | 50 | 0 | 0 |
| ai/audio | 47 | 24 | 17 | 6 |
| learning-v2 | 86 | 56 | 0 | 30 |
| social/friends | 53 | 48 | 0 | 5 |
| spire/arena | 107 | 14 | 36 | 57 |
| retired-tombstone | 4 | 0 | 4 | 0 |
| other | 5 | 0 | 0 | 5 |
| **Итого** | **567** | **406** | **57** | **104** |

## Правила (A1/A2)

- A1: у каждой строки есть домен и сохраняемая возможность одной фразой.
- A2: домены auth, purchases/subscriptions, account-delete, support/reports всегда `keep` — даже если живого экспорта нет (тогда причина прямо говорит «проверить подключение»).
- retired-tombstone только там, где решение владельца записано в `functions/src/index.ts` / CLAUDE.md (MAX, турниры, надгробия Help Board и коллекций) и экспорта нет.
- Всё, что не удалось классифицировать уверенно, либо не экспортируется без записи о решении, — `needs-owner-decision`.

## Список needs-owner-decision

| Функция | Тип | Домен | Файл | Причина |
|---|---|---|---|---|
| myCron | schedule | notifications | functions/src/cron_heartbeat.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| tutorTextClearMemory | callable | ai/audio | functions/src/tutor_text_memory_controls.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| tutorTextDeleteMemoryItem | callable | ai/audio | functions/src/tutor_text_memory_controls.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| tutorTextGetMemory | callable | ai/audio | functions/src/tutor_text_memory_controls.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| tutorTextTopics | callable | ai/audio | functions/src/tutor_text_topics.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| tutorTextTurn | callable | ai/audio | functions/src/tutor_text_turn.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| tutorTextUpdateMemory | callable | ai/audio | functions/src/tutor_text_memory_controls.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminApproveV2EpisodeRevision | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminApproveV2SeasonRevision | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminArchiveV2EpisodeRevision | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminArchiveV2ModeTemplate | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminArchiveV2SeasonRevision | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminConfirmV2OwnerEpisode | callable | learning-v2 | functions/src/content_factory/v2_owner_episode_confirmation_adapter_v1.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminDeprecateV2ModeTemplate | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminGetV2OwnerGeneratorSetupCatalog | callable | learning-v2 | functions/src/content_factory/v2_owner_generator_setup_catalog_v1.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminImportV2OwnerEpisodeStage | callable | learning-v2 | functions/src/content_factory/v2_owner_episode_stage_repository_v1.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminIssueV2ContentGate | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminIssueV2EpisodeLocalizationReceipt | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminIssueV2EpisodeValidationReceipt | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminIssueV2EpisodeVoiceReceipt | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminPublishAuthoredLearningV2Course | callable | learning-v2 | functions/src/content_factory/learning_v2_publish_authored_course_v1.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminPublishV2ModeTemplate | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminRequestV2EpisodeChanges | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminReviewV2EpisodeRevision | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminSubmitV2EpisodeRevision | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminValidateV2EpisodeRevision | callable | learning-v2 | functions/src/admin_content_studio_callables.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| createRequiredSessionCompletionProductionCallable | callable | learning-v2 | functions/src/learning_v2/required_session_completion_callable.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| getPublishedCourseRelease | callable | learning-v2 | functions/src/language_release.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| learningV2ActivityAuxiliarySessionGetV1 | callable | learning-v2 | functions/src/content_factory/v2_activity_auxiliary_session_callable_v1.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| learningV2ActivityReleasedSessionGetV1 | callable | learning-v2 | functions/src/content_factory/v2_activity_released_session_callable_v1.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| learningV2CourseActiveCatalogGetV1 | callable | learning-v2 | functions/src/content_factory/v2_course_active_catalog_callable_v1.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| learningV2CourseReleasedSessionGetV2 | callable | learning-v2 | functions/src/content_factory/v2_course_released_session_callable_v2.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| learningV2CourseReleasedSessionGetV3 | callable | learning-v2 | functions/src/content_factory/v2_course_released_session_callable_v3.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| resolveLearningV2CourseUnlockReceipt | callable | learning-v2 | functions/src/learning_v2_course_unlock.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| statsInsightsGenerate | callable | learning-v2 | functions/src/stats_insights.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| submitLearningV2ActivityReleasedSessionV2 | callable | learning-v2 | functions/src/learning_v2/activity_released_session_submission_callable_v2.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| weeklyReviewGenerate | callable | learning-v2 | functions/src/weekly_review.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminSetReferralRouletteEmergencyStop | callable | social/friends | functions/src/admin_referrals.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminSetReferralRouletteEnabled | callable | social/friends | functions/src/admin_referrals.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminSetSpinWeights | callable | social/friends | functions/src/admin_referrals.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| referralClaimSpin | callable | social/friends | functions/src/referral_claim_spin.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| referralSpin | callable | social/friends | functions/src/referral_spin.ts | нет живого экспорта в index.ts и нет записи о решении владельца |
| adminArenaConfigGet | callable | spire/arena | functions/src/admin_arena_config.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| adminArenaConfigSet | callable | spire/arena | functions/src/admin_arena_config.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| adminArenaContentStatus | callable | spire/arena | functions/src/admin_arena_content.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| adminArenaContentValidate | callable | spire/arena | functions/src/admin_arena_content.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| adminArenaPublicationActivate | callable | spire/arena | functions/src/admin_arena_publication.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| adminArenaPublicationRollback | callable | spire/arena | functions/src/admin_arena_publication.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| adminArenaPublicationStage | callable | spire/arena | functions/src/admin_arena_publication.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| adminArenaPublicationStatus | callable | spire/arena | functions/src/admin_arena_publication.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaExpansionHome | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaGhostAccept | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaGhostCreate | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaGhostDecline | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaGhostStatus | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaMatchLabGet | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaPartnerAccept | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaPartnerClaimSpotlight | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaPartnerInvite | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaPartnerNudge | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaPartnerPause | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaPartnerPreferences | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaPartnerRemove | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaRivalAccept | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaRivalLeave | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaRivalMute | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaRivalNext | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaRivalPropose | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaStarEquip | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaStarStore | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaTodayStart | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaTodaySubmitAnswer | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaTodaySubmitSpeedAttempt | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaTodaySync | callable | spire/arena | functions/src/arena_expansion.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2CleanupHourly | schedule | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2FindMatch | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2Forfeit | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2FriendsBoard | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2Home | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2InviteAccept | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2InviteCancel | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2InviteCreate | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2InviteDecline | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2InviteReady | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2InviteStatus | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2MatchAccept | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2MatchDecline | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2MatchFinish | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2MatchPlan | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2MatchSettle | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2OnQueueWrite | trigger | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2QueueCancel | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2QuickBotFallback | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2RankedBotFallback | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2ReleaseStaleMatch | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2SeasonClaim | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2SubmitAnswer | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2SubmitSpeedAttempt | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2SyncMatch | callable | spire/arena | functions/src/arena_v2.ts | Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить) |
| arenaV2DevFriendBotCreate | callable | other | functions/src/arena_v2.ts | dev-выдача: нужно решение владельца, оставлять ли в проде |
| cosmeticAssetCatalogGet | callable | other | functions/src/cosmetic_asset_archive.ts | не классифицировано уверенно |
| devRunesGrant | callable | other | functions/src/dev_runes_grant.ts | dev-выдача: нужно решение владельца, оставлять ли в проде |
| devShardsGrant | callable | other | functions/src/dev_shards_grant.ts | dev-выдача: нужно решение владельца, оставлять ли в проде |
| referralDevGrantSpin | callable | other | functions/src/referral_dev_grant.ts | dev-выдача: нужно решение владельца, оставлять ли в проде |

## Полная таблица

| Функция | Тип | Домен | Возможность | Статус | Экспорт index.ts | Файл |
|---|---|---|---|---|---|---|
| accountClaimMine | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/account_claim.ts:245 |
| accountMergeOutboxRetryCron | schedule | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_merge.ts:1322 |
| accountMergeOutboxWorker | trigger | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/auth_merge.ts:1314 |
| adminRelinkProvider | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/admin_auth_repair.ts:311 |
| adminRepairAuthLink | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/admin_auth_repair.ts:131 |
| adminRequestUserMerge | callable | auth | Вход, стабильная личность, восстановление и слияние аккаунтов | keep | да | functions/src/admin_user_operations.ts:338 |
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
| adminGetCoinExchangeCenter | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/coin_exchange.ts:404 |
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
| adminMigrateLegacyAdminPremium | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_user_operations.ts:419 |
| adminPublishPaywallAb | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_paywall_ab.ts:180 |
| adminRefundCommunityPackPurchase | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/community_packs.ts:1109 |
| adminRepairPendingReferralPurchase | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_referral_purchase_repair.ts:313 |
| adminReplaceSyntheticGiftCertificate | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2500 |
| adminResumePendingReferralPurchaseRepair | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_referral_purchase_repair.ts:456 |
| adminSendPreparedGiftCertificate | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2554 |
| adminSetCoinExchangeRate | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/coin_exchange.ts:285 |
| adminSubscriptionAnalytics | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/admin_subscription_analytics.ts:123 |
| adminUpdateGiftCertificatePersonalization | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2457 |
| adminUpdateGiftCertificateRecipient | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:2414 |
| aiDialogBuyExtraReplies | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/ai_dialog_extra_replies.ts:172 |
| aiDialogSyncPurchase | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | нет | functions/src/ai_dialog_sync_purchase.ts:96 |
| arenaStarPurchase | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/arena_expansion.ts:1357 |
| createV2AccessPurchaseCallable | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | нет | functions/src/learning_v2_access_callable.ts:128 |
| exchangeCoinsForStars | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/coin_exchange.ts:164 |
| finalizeLearningV2AccessPurchase | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/learning_v2_access_production_callable.ts:16 |
| getCoinExchangeHistory | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/coin_exchange.ts:139 |
| getCoinExchangeQuote | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/coin_exchange.ts:127 |
| introFullAccessClaim | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/gift_access.ts:67 |
| paypalOrderCapture | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:3268 |
| paypalOrderCreate | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/web_checkout.ts:3185 |
| premiumDialogReview | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/premium_dialog_review.ts:556 |
| premiumDialogSend | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/premium_dialog.ts:985 |
| premiumDialogStream | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/premium_dialog_stream.ts:176 |
| premiumDialogTranslate | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/premium_dialog.ts:1531 |
| premiumExpiryCron | schedule | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/premium_expiry_cron.ts:296 |
| premiumExpiryReminderCron | schedule | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/index.ts:504 |
| promoCodeBatchUpsert | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/promo_codes.ts:464 |
| promoCodeDelete | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/promo_codes.ts:534 |
| promoCodeRedeem | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/promo_codes.ts:182 |
| promoCodeUpsert | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/promo_codes.ts:423 |
| recalcCoinExchangeRate | schedule | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/coin_exchange.ts:341 |
| recordVipSurveyReviewClick | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/vip_survey.ts:245 |
| referralClaimVipReward | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/referral.ts:999 |
| revenueCatPremiumReconcileMine | callable | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/revenuecat_reconcile.ts:389 |
| revenueCatShardsWebhook | http | purchases/subscriptions | Покупки, подписка Plus, промокоды, подарки и возвраты | keep | да | functions/src/revenuecat_shards.ts:1789 |
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
| accountDeleteCredentialStatus | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete.ts:1964 |
| accountDeleteEnqueue | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete.ts:1944 |
| accountDeleteMine | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete.ts:1979 |
| accountDeleteRestoreMine | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete_restore.ts:84 |
| accountDeleteRetryCron | schedule | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete_worker.ts:86 |
| accountDeleteStatusMine | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete_restore.ts:49 |
| adminAuditAccountDeleteCoverage | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/account_delete_ai_audit.ts:51 |
| adminDeleteDuplicateUser | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/admin_user_operations.ts:358 |
| adminQueueAccountDeletion | callable | account-delete | Удаление аккаунта и восстановление в срок отсрочки | keep | да | functions/src/admin_account_delete.ts:433 |
| adminAlertOnCancelSurvey | trigger | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_alerts.ts:508 |
| adminAlertOnContentReport | trigger | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_alerts.ts:463 |
| adminAlertOnFeedbackCreated | trigger | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_alert_sources_ratings.ts:59 |
| adminAlertOnUserIdeaReport | trigger | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/user_idea_reports.ts:338 |
| adminAlertOnUserReport | trigger | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_alerts.ts:163 |
| adminDraftReportReply | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/report_replies.ts:554 |
| adminExportReportDocuments | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_reports_center.ts:557 |
| adminExportUnresolvedReports | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_reports_center.ts:586 |
| adminGetFeedbackStats | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/feedback_admin_stats.ts:84 |
| adminListFeedbackEntries | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/feedback_entries.ts:231 |
| adminListReportQueue | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_reports_center.ts:530 |
| adminListSafetyFlags | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_compliance.ts:226 |
| adminMarkSafetyFlagsHandled | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_compliance.ts:286 |
| adminReplyToReport | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/report_replies.ts:291 |
| adminResolveUserReport | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_user_operations.ts:293 |
| adminSummarizeFeedback | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/feedback_summary.ts:221 |
| adminSummarizeFeedback | schedule | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/index.ts:459 |
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
| adminUpdateReportStatus | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/admin_reports_center.ts:646 |
| claimReportReward | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/report_replies.ts:459 |
| maxVoiceSafetyReport | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | нет | functions/src/max_voice_safety.ts:480 |
| reportUserIdea | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/user_idea_reports.ts:67 |
| submitClientReport | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/client_reports.ts:639 |
| submitExplainReport | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/explain/explain_reports.ts:127 |
| submitFeedbackEntry | callable | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/feedback_entries.ts:157 |
| submitWebsiteContact | http | support/reports | Жалобы и обратная связь пользователей, очередь разбора и ответы | keep | да | functions/src/website_contact.ts:155 |
| supportInboxOnNewMail | trigger | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:6712 |
| supportOpsCron | schedule | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/index.ts:543 |
| supportTelegramReplyJobOnCreate | trigger | support/reports | Почта поддержки: чтение, ответы, автоматизация | keep | да | functions/src/support_inbox.ts:4946 |
| adminAlignVideoPhraseTranscript | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrase_timing.ts:34 |
| adminBackfillVideoPacks | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:483 |
| adminGetVideoPhraseWorkspace | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:372 |
| adminGetVideoStudioWorkspace | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:285 |
| adminGetYoutubeCatalogWorkspace | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/youtube_catalog.ts:422 |
| adminParseVideoPhraseDocument | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:449 |
| adminPublishVideoPhrases | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:402 |
| adminPublishYoutubeCatalogConfig | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/youtube_catalog.ts:447 |
| adminRefreshYoutubeCatalog | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/youtube_catalog.ts:516 |
| adminSaveVideoPhraseDraft | callable | content/video | Видео-фразы, наборы из видео и каталог YouTube | keep | да | functions/src/video_phrases.ts:380 |
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
| adminDeactivateGlobalBroadcast | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_global_broadcast.ts:597 |
| adminDeleteAppMessage | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:798 |
| adminEmailBroadcast | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_email.ts:493 |
| adminEmailContactsBackfill | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_email.ts:428 |
| adminGetAlertDiagnostics | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_alert_dispatcher.ts:417 |
| adminGetHomeHintsCatalog | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_home_hints.ts:59 |
| adminListAppMessages | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:468 |
| adminListGlobalBroadcasts | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_global_broadcast.ts:490 |
| adminPublishGlobalBroadcast | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_global_broadcast.ts:524 |
| adminPublishHomeHints | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_home_hints.ts:67 |
| adminPushJobCreated | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_push_jobs.ts:556 |
| adminPushJobsCron | schedule | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_push_jobs.ts:566 |
| adminScrubGlobalBroadcastMetadata | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_global_broadcast.ts:660 |
| adminSendPersonalAppMessage | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:414 |
| adminSetAppMessageActive | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:548 |
| adminUpdateAppMessage | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_app_messages.ts:697 |
| adminVerifyGlobalBroadcastPrivacyReadiness | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/admin_global_broadcast.ts:763 |
| emailUnsubscribe | http | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/email_unsubscribe.ts:211 |
| globalBroadcastClaim | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/global_broadcast_claim.ts:86 |
| globalBroadcastListActive | callable | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/global_broadcast_public.ts:75 |
| myCron | schedule | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | needs-owner-decision | нет | functions/src/cron_heartbeat.ts:64 |
| notifyOnFriendAccepted | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/user_notifications.ts:100 |
| notifyOnFriendRequestCreated | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/user_notifications.ts:75 |
| notifyOnPackCommentCreated | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/user_notifications.ts:131 |
| onAppMessagePollVoteWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/app_messages.ts:178 |
| onAppMessageReactionWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/app_messages.ts:119 |
| onAppMessageStateWritten | trigger | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/app_messages.ts:153 |
| reEngagePushCron | schedule | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/index.ts:481 |
| userNotificationsCleanupCron | schedule | notifications | Уведомления, push, письма, объявления в приложении и алерты владельцу | keep | да | functions/src/user_notifications.ts:173 |
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
| adminCreateAssetJob | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_asset_studio.ts:233 |
| adminGenerateDailyDigest | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_daily_digest.ts:1055 |
| adminGetAdminConfigWorkspace | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_config_controls.ts:156 |
| adminGetAnalyticsSnapshot | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_analytics.ts:160 |
| adminGetAnalyticsTrends | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_analytics_trends.ts:836 |
| adminGetComplianceOverview | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_compliance.ts:171 |
| adminGetCosmeticAssetArchive | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/cosmetic_asset_archive.ts:265 |
| adminGetDailyBriefing | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_daily_digest.ts:1017 |
| adminGetDiagnosticsOverview | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_diagnostics_overview.ts:71 |
| adminGetDirectorDigest | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_director_digest.ts:478 |
| adminGetProductCharter | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_product_charter.ts:52 |
| adminGetRemoteConfigWorkspace | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_remote_config.ts:171 |
| adminGetUserProfile | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_profile.ts:473 |
| adminGrantReward | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_grant.ts:241 |
| adminListAssetJobs | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_asset_studio.ts:222 |
| adminListAuditLog | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_audit_log.ts:182 |
| adminListOpsLog | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_ops_log.ts:213 |
| adminMonthlyDecisionPack | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_monthly_decision_pack.ts:110 |
| adminOpenDailyDigest | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_daily_digest.ts:994 |
| adminProductAnalytics | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_product_analytics.ts:1277 |
| adminPublishAlertsConfig | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_config_controls.ts:171 |
| adminPublishNavLayout | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_config_controls.ts:166 |
| adminPublishRemoteConfig | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_remote_config.ts:104 |
| adminResetUserProgress | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_operations.ts:460 |
| adminRunAssetJob | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_asset_studio.ts:260 |
| adminSaveProductCharter | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_product_charter.ts:84 |
| adminSearchUsers | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_profile.ts:265 |
| adminSetCosmeticAssetSaleStatus | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/cosmetic_asset_archive.ts:287 |
| adminSetShardBalance | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_grant.ts:332 |
| adminSetUserBan | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_access_controls.ts:182 |
| adminTestAlerts | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_config_controls.ts:176 |
| adminUpdateUserProfileField | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_operations.ts:233 |
| adminUserBriefs | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_briefs.ts:159 |
| adminWarmInstanceGauge | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/warm_instance_gauge.ts:205 |
| adminWarnUser | callable | admin | Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи) | keep | да | functions/src/admin_user_operations.ts:268 |
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
| dialogueV2Catalogue | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_catalogue_callable.ts:62 |
| dialogueV2FreeformPreparedBotVoiceResolve | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_freeform_prepared_bot_voice_callable.ts:178 |
| dialogueV2FreeformSessionStart | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_freeform_session_start_callable.ts:247 |
| dialogueV2FreeformSessionTurn | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_freeform_session_turn_callable.ts:502 |
| dialogueV2MemoryClear | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_memory_management_callable.ts:134 |
| dialogueV2MemoryResume | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_memory_resume_callable.ts:84 |
| dialogueV2MemoryView | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_memory_management_callable.ts:120 |
| dialogueV2SessionComplete | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_session_complete_callable.ts:550 |
| dialogueV2SessionStart | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_session_start_callable.ts:192 |
| dialogueV2TextTurn | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/dialogue_v2_turn_production_callable.ts:777 |
| explainChoice | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/explain_choice.ts:76 |
| explainMistake | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/mistake_explain.ts:738 |
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
| openAiBudgetDashboard | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/openai_budget_dashboard.ts:252 |
| openAiDialogModelConfig | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/openai_dialog_model_config.ts:159 |
| openAiDialogQuotaConfig | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/openai_dialog_model_config.ts:200 |
| openAiJobsConfig | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | keep | да | functions/src/openai_jobs_config.ts:252 |
| submitMaxVoiceFeedback | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/max_voice_feedback.ts:71 |
| tutorTextClearMemory | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | needs-owner-decision | нет | functions/src/tutor_text_memory_controls.ts:50 |
| tutorTextDeleteMemoryItem | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | needs-owner-decision | нет | functions/src/tutor_text_memory_controls.ts:45 |
| tutorTextGetMemory | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | needs-owner-decision | нет | functions/src/tutor_text_memory_controls.ts:35 |
| tutorTextTopics | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | needs-owner-decision | нет | functions/src/tutor_text_topics.ts:124 |
| tutorTextTurn | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | needs-owner-decision | нет | functions/src/tutor_text_turn.ts:257 |
| tutorTextUpdateMemory | callable | ai/audio | ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI | needs-owner-decision | нет | functions/src/tutor_text_memory_controls.ts:40 |
| voiceMinuteDevGrant | callable | ai/audio | Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04 | retired-tombstone | нет | functions/src/voice_minutes_dev_grant.ts:59 |
| adminActivateCourseRelease | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/language_release.ts:51 |
| adminApproveLearningV2CourseWave | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/learning_v2_course_shard_background.ts:301 |
| adminApproveV2EpisodeRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:209 |
| adminApproveV2SeasonRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:312 |
| adminArchiveV2EpisodeRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:239 |
| adminArchiveV2ModeTemplate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:392 |
| adminArchiveV2SeasonRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:322 |
| adminConfirmV2OwnerEpisode | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/content_factory/v2_owner_episode_confirmation_adapter_v1.ts:522 |
| adminControlContentStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:274 |
| adminCreateContentGenerationJob | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory.ts:92 |
| adminCreateContentStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:241 |
| adminCreateContentStageBulkPlan | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stage_bulk.ts:98 |
| adminCreatePlan | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_plans/callables.ts:25 |
| adminCreateV2GenerationPlan | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_v2_generation.ts:361 |
| adminDeleteShardSurvey | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/shard_survey.ts:402 |
| adminDeprecateV2ModeTemplate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:362 |
| adminEditContentStageArtifact | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stage_edits.ts:72 |
| adminGetContentFactoryJobDetail | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory_read.ts:96 |
| adminGetContentFactoryRolloutMetrics | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory_read.ts:197 |
| adminGetContentFactoryUnitPreview | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory_read.ts:138 |
| adminGetContentFactoryWorkspace | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory_read.ts:168 |
| adminGetContentStageCapabilities | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:326 |
| adminGetLearningV2CourseWorkspaceProjection | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:295 |
| adminGetOnboardingFunnel | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/onboarding_funnel.ts:311 |
| adminGetPlan | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_plans/callables.ts:27 |
| adminGetV2OwnerGeneratorSetupCatalog | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/content_factory/v2_owner_generator_setup_catalog_v1.ts:524 |
| adminGetV2OwnerGeneratorWorkspace | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/v2_owner_generator_workspace_v1.ts:204 |
| adminImportV2OwnerEpisodeStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/content_factory/v2_owner_episode_stage_repository_v1.ts:502 |
| adminIssueV2ContentGate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:249 |
| adminIssueV2EpisodeLocalizationReceipt | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:139 |
| adminIssueV2EpisodeValidationReceipt | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:122 |
| adminIssueV2EpisodeVoiceReceipt | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:159 |
| adminListContentFactoryJobs | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_factory.ts:142 |
| adminListContentStageDependencies | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:317 |
| adminListContentStages | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:286 |
| adminListPlans | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_plans/callables.ts:29 |
| adminPrepareV2OwnerEpisodeDraft | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/v2_owner_generator_workspace_v1.ts:245 |
| adminPreviewContentStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:331 |
| adminPreviewLearningV2CourseWave | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/learning_v2_course_shard_background.ts:372 |
| adminPublishAuthoredLearningV2Course | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/content_factory/learning_v2_publish_authored_course_v1.ts:484 |
| adminPublishV2ModeTemplate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:332 |
| adminRejectLearningV2CourseWave | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/learning_v2_course_shard_background.ts:335 |
| adminRequestV2EpisodeChanges | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:229 |
| adminReviewContentStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_stages.ts:368 |
| adminReviewCourseGeneration | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_release.ts:43 |
| adminReviewV2EpisodeRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:176 |
| adminRollbackCourseRelease | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/language_release.ts:94 |
| adminRunContentGenerationUnit | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory_worker.ts:70 |
| adminRunContentStage | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_stage_worker.ts:234 |
| adminRunV2E1Compilation | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/v2_e1_compilation_worker.ts:362 |
| adminSaveV2EpisodeDraft | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_studio_callables.ts:64 |
| adminSaveV2SeasonDraft | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_studio_callables.ts:276 |
| adminSealCourseRelease | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/admin_content_release.ts:102 |
| adminSeedV2E1DemoSource | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/v2_e1_compilation_worker.ts:349 |
| adminSubmitV2EpisodeRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:219 |
| adminValidateV2EpisodeRevision | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/admin_content_studio_callables.ts:94 |
| adminWriteShardSurvey | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/shard_survey.ts:353 |
| createRequiredSessionCompletionProductionCallable | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/learning_v2/required_session_completion_callable.ts:747 |
| dailyPhraseSetSaved | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/daily_phrases.ts:27 |
| finalizeLearningV2DelayedCandidate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/learning_v2_delayed_callable.ts:168 |
| getActiveShardSurvey | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/shard_survey.ts:126 |
| getLearningV2AccountBinding | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/learning_v2_wallet_reward_callable.ts:143 |
| getPublishedCourseRelease | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/language_release.ts:156 |
| grantMistakeCorrectionReward | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/mistake_practice_wallet_reward.ts:183 |
| learningV2ActivityAuxiliarySessionGetV1 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/content_factory/v2_activity_auxiliary_session_callable_v1.ts:280 |
| learningV2ActivityReleasedSessionGetV1 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/content_factory/v2_activity_released_session_callable_v1.ts:486 |
| learningV2CourseActiveCatalogGetV1 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/content_factory/v2_course_active_catalog_callable_v1.ts:238 |
| learningV2CourseReleasedSessionGetV2 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/content_factory/v2_course_released_session_callable_v2.ts:377 |
| learningV2CourseReleasedSessionGetV3 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/content_factory/v2_course_released_session_callable_v3.ts:338 |
| learningV2LocalizedCourseShardBackgroundWorker | trigger | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/content_factory/learning_v2_course_shard_background.ts:237 |
| mistakeHubAdvice | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/mistake_hub_advice.ts:147 |
| mistakePracticeSyncEvents | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/mistake_practice_event_sync.ts:204 |
| practiceRuneGrant | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/practice_rune_grant.ts:302 |
| progressMigrateSnapshot | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/progress_events.ts:840 |
| progressSubmitEvent | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/progress_events.ts:656 |
| recordOnboardingFunnelEvent | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/onboarding_funnel.ts:299 |
| resolveLearningV2CourseUnlockReceipt | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/learning_v2_course_unlock.ts:380 |
| resolveLearningV2WalletRewardReceipt | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/learning_v2_wallet_reward_callable.ts:138 |
| shardsApplyDelta | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/shards_apply_delta.ts:14 |
| statsInsightsGenerate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/stats_insights.ts:496 |
| submitLearningV2ActivityReleasedCompletionV1 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/learning_v2/activity_released_session_completion_callable_v1.ts:404 |
| submitLearningV2ActivityReleasedSessionV2 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/learning_v2/activity_released_session_submission_callable_v2.ts:793 |
| submitLearningV2CourseSessionCompletedV1 | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/learning_v2/course_session_completed_summary_callable_v1.ts:306 |
| submitSettingsPollVote | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/settings_poll_vote.ts:53 |
| submitShardSurvey | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | keep | да | functions/src/shard_survey.ts:210 |
| weeklyReviewGenerate | callable | learning-v2 | Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента | needs-owner-decision | нет | functions/src/weekly_review.ts:847 |
| adminAlertOnReferralAttributionWrite | trigger | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_alert_sources_people.ts:162 |
| adminDecideUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:634 |
| adminDeleteUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:476 |
| adminDraftIdeaDecision | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:763 |
| adminGetReferralDashboard | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:884 |
| adminListReferrals | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:810 |
| adminListUserIdeas | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:403 |
| adminReferralHealth | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:1166 |
| adminRestoreUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_idea_reports.ts:175 |
| adminRevokeReferralAttribution | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:511 |
| adminSetIdeaSubmissionRestriction | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_idea_reports.ts:259 |
| adminSetReferralRouletteEmergencyStop | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | needs-owner-decision | нет | functions/src/admin_referrals.ts:1152 |
| adminSetReferralRouletteEnabled | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | needs-owner-decision | нет | functions/src/admin_referrals.ts:1146 |
| adminSetSpinWeights | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | needs-owner-decision | нет | functions/src/admin_referrals.ts:1133 |
| adminSetUserIdeaStatus | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:515 |
| adminSpinLogs | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:1097 |
| adminSpinStats | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/admin_referrals.ts:1036 |
| communityAdminModeratePack | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:944 |
| communityAuthorRemovePack | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:874 |
| communityFetchPackCardsIfAccessible | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1060 |
| communityListSellerInbox | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1605 |
| communityMarkSellerInboxSeen | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1640 |
| communityModerateSubmission | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:592 |
| communityRedeemPackGiftVoucher | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1596 |
| communitySubmitPackForReview | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:367 |
| communitySyncPackRuneSale | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_pack_rune_sale.ts:140 |
| customCardMilestoneNotify | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/custom_card_milestone.ts:43 |
| flashcardPackGiftGrantGlobalBroadcast | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1504 |
| flashcardPackGiftRedeem | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1593 |
| flashcardPackGiftSyncState | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/community_packs.ts:1544 |
| friendEnsureMyCode | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friend_codes.ts:81 |
| friendLikeActivity | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friend_activity_likes.ts:149 |
| friendLookupUser | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friend_lookup.ts:172 |
| friendsGetProfiles | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friends_profiles.ts:365 |
| friendsNudge | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friends_together.ts:117 |
| friendsTogetherClaimLevel | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friends_together.ts:109 |
| friendUnlikeActivity | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/friend_activity_likes.ts:349 |
| getPublicUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:363 |
| likeUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_idea_likes.ts:45 |
| listPublicUserIdeas | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:321 |
| nameCheckAvailability | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/leaderboard.ts:223 |
| nameGenerateAndReserve | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/leaderboard.ts:249 |
| nameReleaseMine | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/leaderboard.ts:477 |
| nameReserve | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/leaderboard.ts:347 |
| publicProfileProjectMine | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/public_profile_projection.ts:131 |
| referralApply | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/referral.ts:647 |
| referralClaimSpin | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | needs-owner-decision | нет | functions/src/referral_claim_spin.ts:69 |
| referralEnsureMyCode | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/referral.ts:586 |
| referralListMyInvites | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/referral.ts:854 |
| referralSpin | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | needs-owner-decision | нет | functions/src/referral_spin.ts:105 |
| submitUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:179 |
| unlikeUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_idea_likes.ts:89 |
| updateUserIdea | callable | social/friends | Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов | keep | да | functions/src/user_ideas.ts:269 |
| adminArenaConfigGet | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/admin_arena_config.ts:64 |
| adminArenaConfigSet | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/admin_arena_config.ts:96 |
| adminArenaContentStatus | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/admin_arena_content.ts:181 |
| adminArenaContentValidate | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/admin_arena_content.ts:189 |
| adminArenaPublicationActivate | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/admin_arena_publication.ts:221 |
| adminArenaPublicationRollback | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/admin_arena_publication.ts:278 |
| adminArenaPublicationStage | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/admin_arena_publication.ts:161 |
| adminArenaPublicationStatus | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/admin_arena_publication.ts:182 |
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
| arenaExpansionHome | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:915 |
| arenaGhostAccept | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1706 |
| arenaGhostCreate | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1570 |
| arenaGhostDecline | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1833 |
| arenaGhostStatus | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1773 |
| arenaMatchLabGet | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1272 |
| arenaPartnerAccept | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1934 |
| arenaPartnerClaimSpotlight | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:2132 |
| arenaPartnerInvite | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1862 |
| arenaPartnerNudge | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:2063 |
| arenaPartnerPause | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:2015 |
| arenaPartnerPreferences | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:2018 |
| arenaPartnerRemove | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:2016 |
| arenaRivalAccept | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:2544 |
| arenaRivalLeave | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:2647 |
| arenaRivalMute | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:2676 |
| arenaRivalNext | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:2599 |
| arenaRivalPropose | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:2391 |
| arenaStarEquip | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1455 |
| arenaStarStore | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1326 |
| arenaTodayStart | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1069 |
| arenaTodaySubmitAnswer | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1268 |
| arenaTodaySubmitSpeedAttempt | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1269 |
| arenaTodaySync | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_expansion.ts:1270 |
| arenaV2CleanupHourly | schedule | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:4381 |
| arenaV2FindMatch | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:1978 |
| arenaV2Forfeit | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:3588 |
| arenaV2FriendsBoard | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:4144 |
| arenaV2Home | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:1885 |
| arenaV2InviteAccept | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:3855 |
| arenaV2InviteCancel | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:4043 |
| arenaV2InviteCreate | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:3669 |
| arenaV2InviteDecline | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:4015 |
| arenaV2InviteReady | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:3899 |
| arenaV2InviteStatus | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:4069 |
| arenaV2MatchAccept | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:2702 |
| arenaV2MatchDecline | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:2772 |
| arenaV2MatchFinish | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:3228 |
| arenaV2MatchPlan | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:3099 |
| arenaV2MatchSettle | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:3474 |
| arenaV2OnQueueWrite | trigger | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:2396 |
| arenaV2QueueCancel | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:2427 |
| arenaV2QuickBotFallback | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:2443 |
| arenaV2RankedBotFallback | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:2577 |
| arenaV2ReleaseStaleMatch | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:3533 |
| arenaV2SeasonClaim | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | нет | functions/src/arena_v2.ts:4189 |
| arenaV2SubmitAnswer | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:2814 |
| arenaV2SubmitSpeedAttempt | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:2880 |
| arenaV2SyncMatch | callable | spire/arena | Арена: матчи, заходы, витрина звёзд, партнёры | needs-owner-decision | да | functions/src/arena_v2.ts:2966 |
| spireFinalizeCron | schedule | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_finalize_cron.ts:89 |
| spireJoinRoom | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_groups.ts:194 |
| spirePackWeeklyCron | schedule | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_pack_build.ts:522 |
| spireReportSteps | callable | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_progress.ts:118 |
| spireZoneWarningCron | schedule | spire/arena | Шпиль: группы, шаги, недельная финализация, паки | keep | да | functions/src/spire_zone_warning_push.ts:265 |
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
| arenaV2DevFriendBotCreate | callable | other | Разработческая выдача валюты/спина (флаги выключены по умолчанию) | needs-owner-decision | да | functions/src/arena_v2.ts:2650 |
| cosmeticAssetCatalogGet | callable | other | Не удалось определить возможность по имени и файлу | needs-owner-decision | да | functions/src/cosmetic_asset_archive.ts:257 |
| devRunesGrant | callable | other | Разработческая выдача валюты/спина (флаги выключены по умолчанию) | needs-owner-decision | да | functions/src/dev_runes_grant.ts:38 |
| devShardsGrant | callable | other | Разработческая выдача валюты/спина (флаги выключены по умолчанию) | needs-owner-decision | да | functions/src/dev_shards_grant.ts:63 |
| referralDevGrantSpin | callable | other | Разработческая выдача валюты/спина (флаги выключены по умолчанию) | needs-owner-decision | нет | functions/src/referral_dev_grant.ts:62 |

## Честные ограничения

- Ничего не проверено на проде и деплое: `firebase functions:list`, реальные вызовы и логи не запускались.
- Классификация статическая — по имени функции, имени файла и разбору `index.ts` без комментариев; ошибки вероятны на границах доменов (например, `admin*`-функции по покупкам/поддержке разобраны по имени, а не по смыслу кода).
- Атлас сканирует только `functions/src`; кодовая база `functions-max` (MAX, снята с деплоя) и админка `admin/v2` в карту не входят.
- Регулярка атласа даёт ложные срабатывания: `COLLECTIBLES_RETIRED_MESSAGE` и `ACCOUNT_DELETE_RETRY_OPTIONS` — константы, а не функции; `adminSummarizeFeedback` виден и как callable, и как schedule.
- «Экспорт index.ts = да» — это наличие имени в неприкомментированном экспорте, а не факт деплоя.
- Домен `other` и статус needs-owner-decision означают «не знаю», а не «мусор».
