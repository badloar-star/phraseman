# План ПОЛНОЙ выкладки сервера (18.10) — для security-review Ревизора; запуск ТОЛЬКО после «да» владельца в чате Ревизора

Governance-ID: TG-6B6F00C0E6A7

Подготовило Ядро по поручению координатора 09:35. Сейчас НИЧЕГО не запущено. Снимок прода: `gcloud functions list`, 18.10 09:04. Исходники: HEAD `28bdf6e12`.

## Outcome
Прод совпадает с HEAD по функциям трёх кодовых баз, `firestore.rules` и индексам. Прежде всего это 7 функций входа и восстановления (в проде версия от 02.09 с `app_check_required`, сводка Ядра 09:20).

## Scope
- В выкладку: все функции кодовой базы `default` из HEAD — 410 имён, из них 10 новых; `content` — 9; `english-test` — 2; `firestore:rules`; `firestore:indexes`; `storage` (правила).
- НЕ в выкладку: удаление 61 функции прода, которых нет в HEAD (список ниже). Это отдельное решение владельца.

## Architecture: как выкладывать
1. **Только из ЧИСТОЙ копии HEAD.** В рабочем дереве WIP других сессий; например, `functions-content/index.ts` изменён и не закоммичен. Копия: `git init` + alternates + `checkout --detach <H>` (как для сборок), `functions/node_modules` — `npm ci` в копии через слот.
   🔴 Подозрение: `authEnsureStableLink` в проде от 17.10, но не пишет `[AUTH-ENSURE-LINK]`, которые в HEAD есть с 14.10. Значит, прошлые выкладки, вероятно, шли из грязного дерева или старой копии.
2. **Порядок.**
   - а) `firebase deploy --only firestore:rules` — правила нужны новым коллекциям лимитов (`auth_recovery_hint_rate_limits`, `auth_recovery_rate_limits`) ДО функций;
   - б) `firebase deploy --only firestore:indexes`. Если CLI предложит удалить индексы, которых нет в файле, — ответ «нет», без `--force`;
   - б′) **TTL — отдельной проверкой после шага б** (c055fd6d9, координатор 18.10). Тот же шаг включает TTL-политики из `fieldOverrides`: `callable_rate_windows.expiresAt` и `spend_daily_shards.expiresAt` (плюс прежние). Без них документы лимитов и шарды расходов копятся вечно. Проверка — только чтение: `gcloud firestore fields ttls list --project=phraseman-ea0b3`, обе строки в состоянии `ACTIVE` или `CREATING`. Нет строки — повторить шаг б. Включение TTL занимает до суток и само ничего не ломает;
   - в) функции — ЯВНЫМИ списками по 40 имён (`--only functions:a,functions:b,…`), 11 пачек. Тогда CLI не трогает функции вне списка и не спрашивает об удалении. Квоты Cloud Build и Run на 400 функций разом не хватит;
   - г) `content` и `english-test` — тоже явными списками.
3. **Сторожа перед выкладкой:** `deploy_lock_guard`, `guard_secret_env_overlap`, сборка, `functions_source_coverage_gate`, `functions_runtime_parity_gate` (predeploy в firebase.json) и тесты пломбы `app_check_sealed.test.ts` + `jarvis_data_contract_guard.test.ts`.

## Первая пачка — вход и восстановление (самое срочное)
```
firebase deploy --only firestore:rules
firebase deploy --only functions:authRecoveryHint,functions:authRequestRecoveryCode,functions:authConfirmRecoveryCode,functions:authRequestCleanInstallRecoveryCode,functions:authConfirmCleanInstallRecoveryCode,functions:authIssueRecoveryHandoffToken,functions:authCompleteRecoveryHandoff,functions:authCleanInstallRecoveryDeliveryWorker,functions:authEnsureStableLink,functions:authStampAnonOwnership,functions:authMergeStableAccounts
```

## Остальные пачки (default, по 40)
- Пачка 1 (40 шт.): `functions:CONTENT_FACTORY_OPENAI_API_KEY,functions:CONTENT_STAGE_OPENAI_API_KEY,functions:LEARNING_V2_COURSE_SHARD_OPENAI_API_KEY,functions:accountClaimMine,functions:accountDeleteCredentialStatus,functions:accountDeleteEnqueue,functions:accountDeleteMine,functions:accountDeleteRestoreMine,functions:accountDeleteRetryCron,functions:accountDeleteStatusMine,functions:accountDeleteWorker,functions:accountMergeOutboxRetryCron,functions:accountMergeOutboxWorker,functions:accountsV2DeletionStatus,functions:accountsV2MigrateMine,functions:accountsV2PullMine,functions:accountsV2SyncApply,functions:activationEmailRetryCron,functions:adminActivateCourseRelease,functions:adminActivateTelegramPremiumOrder,functions:adminAlertDailyDigestsCron,functions:adminAlertDispatchOnCreate,functions:adminAlertOnAdminAuditCreated,functions:adminAlertOnAppMessageWritten,functions:adminAlertOnAuthFailureSpike,functions:adminAlertOnBanWrite,functions:adminAlertOnCancelReasonCreated,functions:adminAlertOnCancelSurvey,functions:adminAlertOnCommunityPackPurchaseWritten,functions:adminAlertOnCommunityPackReportCreated,functions:adminAlertOnCommunitySubmissionCreated,functions:adminAlertOnComplianceControlWritten,functions:adminAlertOnConfigWritten,functions:adminAlertOnContentReport,functions:adminAlertOnCriticalError,functions:adminAlertOnCronHeartbeat,functions:adminAlertOnExplanationReportCreated,functions:adminAlertOnFeedbackCreated,functions:adminAlertOnGiftCertificateCreated,functions:adminAlertOnPromoRedemptionCreated`
- Пачка 2 (40 шт.): `functions:adminAlertOnPushJobWritten,functions:adminAlertOnReferralAttributionWrite,functions:adminAlertOnRevenueCatReceipt,functions:adminAlertOnSupportEmailCreated,functions:adminAlertOnTelegramPremiumOrderWritten,functions:adminAlertOnUgcRefund,functions:adminAlertOnUserIdeaCreated,functions:adminAlertOnUserIdeaReport,functions:adminAlertOnUserReport,functions:adminAlertOnWebPremiumOrderWritten,functions:adminAlertOnWebsiteContactCreated,functions:adminAlertRecoveryCron,functions:adminAlignVideoPhraseTranscript,functions:adminApproveLearningV2CourseWave,functions:adminArenaConfigGet,functions:adminArenaConfigSet,functions:adminArenaContentStatus,functions:adminArenaContentValidate,functions:adminArenaPublicationActivate,functions:adminArenaPublicationRollback,functions:adminArenaPublicationStage,functions:adminArenaPublicationStatus,functions:adminAuditAccountDeleteCoverage,functions:adminBackfillVideoPacks,functions:adminCancelGiftCertificateBatchOperation,functions:adminCancelStripeSubscriptionRenewal,functions:adminCardTtsRequeuePack,functions:adminCleanupExpiredAppMessages,functions:adminCommunityPackApplyQaFixes,functions:adminCommunityPackApplyQaFixesToPublished,functions:adminCommunityPackQaReview,functions:adminCommunityPackTranslateLocales,functions:adminControlContentStage,functions:adminCreateAppMessage,functions:adminCreateAssetJob,functions:adminCreateContentGenerationJob,functions:adminCreateContentStage,functions:adminCreateContentStageBulkPlan,functions:adminCreateGiftCertificateBatch,functions:adminCreatePlan`
- Пачка 3 (40 шт.): `functions:adminCreateV2GenerationPlan,functions:adminDeactivateGlobalBroadcast,functions:adminDeactivateGlobalBroadcasts,functions:adminDeactivateVipSurveyCampaign,functions:adminDecideUserIdea,functions:adminDeleteAppMessage,functions:adminDeleteDuplicateUser,functions:adminDeleteGiftCertificate,functions:adminDeleteShardSurvey,functions:adminDeleteUserIdea,functions:adminDraftIdeaDecision,functions:adminDraftReportReply,functions:adminEditContentStageArtifact,functions:adminEmailBroadcast,functions:adminEmailContactsBackfill,functions:adminExportReportDocuments,functions:adminExportUnresolvedReports,functions:adminGenerateDailyDigest,functions:adminGenerateDirectorDigestAudio,functions:adminGetAdminConfigWorkspace,functions:adminGetAlertDiagnostics,functions:adminGetAnalyticsSnapshot,functions:adminGetAnalyticsTrends,functions:adminGetComplianceOverview,functions:adminGetContentFactoryJobDetail,functions:adminGetContentFactoryRolloutMetrics,functions:adminGetContentFactoryUnitPreview,functions:adminGetContentFactoryWorkspace,functions:adminGetContentStageCapabilities,functions:adminGetDailyBriefing,functions:adminGetDiagnosticsOverview,functions:adminGetDirectorDigest,functions:adminGetFeedbackStats,functions:adminGetGiftCertificateBatchOperation,functions:adminGetGiftCertificateDownload,functions:adminGetHomeHintsCatalog,functions:adminGetLearningV2CourseWorkspaceProjection,functions:adminGetOnboardingFunnel,functions:adminGetPaywallAbWorkspace,functions:adminGetPaywallVariantStats`
- Пачка 4 (40 шт.): `functions:adminGetPlan,functions:adminGetProductCharter,functions:adminGetReferralDashboard,functions:adminGetRemoteConfigWorkspace,functions:adminGetRevenueCatOverviewMetrics,functions:adminGetUserProfile,functions:adminGetV2OwnerGeneratorWorkspace,functions:adminGetVideoPhraseWorkspace,functions:adminGetVideoStudioWorkspace,functions:adminGetYoutubeCatalogWorkspace,functions:adminGrantAccess,functions:adminGrantReward,functions:adminInspectTelegramPromoCode,functions:adminLaunchVipSurveyCampaign,functions:adminListAppMessages,functions:adminListAssetJobs,functions:adminListAuditLog,functions:adminListContentFactoryJobs,functions:adminListContentStageDependencies,functions:adminListContentStages,functions:adminListFeedbackEntries,functions:adminListGiftCertificates,functions:adminListGlobalBroadcasts,functions:adminListMistakeExplanationCache,functions:adminListOpsLog,functions:adminListPlans,functions:adminListPromoCodes,functions:adminListReferrals,functions:adminListReportQueue,functions:adminListSafetyFlags,functions:adminListShardRefunds,functions:adminListUserIdeas,functions:adminMarkSafetyFlagsHandled,functions:adminMigrateLegacyAdminPremium,functions:adminMonthlyDecisionPack,functions:adminOpenDailyDigest,functions:adminParseVideoPhraseDocument,functions:adminPrepareV2OwnerEpisodeDraft,functions:adminPreviewContentStage,functions:adminPreviewLearningV2CourseWave`
- Пачка 5 (40 шт.): `functions:adminProductAnalytics,functions:adminPublishAlertsConfig,functions:adminPublishGlobalBroadcast,functions:adminPublishHomeHints,functions:adminPublishNavLayout,functions:adminPublishPaywallAb,functions:adminPublishRemoteConfig,functions:adminPublishVideoPhrases,functions:adminPublishYoutubeCatalogConfig,functions:adminPushJobCreated,functions:adminPushJobsCron,functions:adminQueueAccountDeletion,functions:adminQueueV2GenerationPlan,functions:adminReferralHealth,functions:adminRefreshYoutubeCatalog,functions:adminRejectLearningV2CourseWave,functions:adminRelinkProvider,functions:adminRepairAuthLink,functions:adminRepairPendingReferralPurchase,functions:adminReplaceSyntheticGiftCertificate,functions:adminReplyToReport,functions:adminRequestUserMerge,functions:adminResetUserProgress,functions:adminResolveUserReport,functions:adminRestoreUserIdea,functions:adminResumePendingReferralPurchaseRepair,functions:adminReviewContentStage,functions:adminReviewCourseGeneration,functions:adminRevokeReferralAttribution,functions:adminRollbackCourseRelease,functions:adminRunAssetJob,functions:adminRunContentGenerationUnit,functions:adminRunContentStage,functions:adminRunV2E1Compilation,functions:adminSaveProductCharter,functions:adminSaveV2EpisodeDraft,functions:adminSaveV2SeasonDraft,functions:adminSaveVideoPhraseDraft,functions:adminScrubGlobalBroadcastMetadata,functions:adminSealCourseRelease`
- Пачка 6 (40 шт.): `functions:adminSearchUsers,functions:adminSeedV2E1DemoSource,functions:adminSendPersonalAppMessage,functions:adminSendPreparedGiftCertificate,functions:adminSetAppMessageActive,functions:adminSetIdeaSubmissionRestriction,functions:adminSetReferralRouletteEmergencyStop,functions:adminSetReferralRouletteEnabled,functions:adminSetSpinWeights,functions:adminSetUserBan,functions:adminSetUserIdeaStatus,functions:adminSpinLogs,functions:adminSpinStats,functions:adminSpireConfigGet,functions:adminSpireConfigSet,functions:adminSpirePackBuild,functions:adminSpireTaskFlagAdd,functions:adminSpireTaskFlagList,functions:adminSpireTaskFlagRemove,functions:adminSpireTaskIncidentSetState,functions:adminSpireTaskIncidentStates,functions:adminSpireTaskReportList,functions:adminSubscriptionAnalytics,functions:adminSuggestVideoPackTitle,functions:adminSummarizeFeedback,functions:adminSupportArchiveMessages,functions:adminSupportCancelReply,functions:adminSupportCancelReplyBatch,functions:adminSupportConversation,functions:adminSupportDispatchReply,functions:adminSupportDispatchReplyBatch,functions:adminSupportGenerateReply,functions:adminSupportList,functions:adminSupportPrepareReply,functions:adminSupportPrepareReplyBatch,functions:adminSupportPull,functions:adminSupportResolveReplyDelivery,functions:adminSupportSaveAutomation,functions:adminSupportSaveDraft,functions:adminSupportSaveInstructions`
- Пачка 7 (40 шт.): `functions:adminSupportSaveSignature,functions:adminSupportSendReply,functions:adminSupportSetStatus,functions:adminTestAlerts,functions:adminTranslateMessage,functions:adminUpdateAppMessage,functions:adminUpdateGiftCertificatePersonalization,functions:adminUpdateGiftCertificateRecipient,functions:adminUpdateReportStatus,functions:adminUpdateUserProfileField,functions:adminUserBriefs,functions:adminVerifyGlobalBroadcastPrivacyReadiness,functions:adminWarmInstanceGauge,functions:adminWarnUser,functions:adminWriteShardSurvey,functions:authCleanInstallRecoveryDeliveryWorker,functions:authCompleteRecoveryHandoff,functions:authConfirmCleanInstallRecoveryCode,functions:authConfirmRecoveryCode,functions:authEnsureStableLink,functions:authIssueRecoveryHandoffToken,functions:authMergeStableAccounts,functions:authRecoveryHint,functions:authRequestCleanInstallRecoveryCode,functions:authRequestRecoveryCode,functions:authStampAnonOwnership,functions:cardTtsPackWorker,functions:claimReportReward,functions:cleanupExpiredAppMessagesCron,functions:coinReconcileV1,functions:communityAdminModeratePack,functions:communityAuthorRemoveCard,functions:communityAuthorRemovePack,functions:communityFetchPackCardsIfAccessible,functions:communityListSellerInbox,functions:communityMarkSellerInboxSeen,functions:communityModerateSubmission,functions:communitySubmitPackForReview,functions:communitySyncPackRuneSale,functions:customCardMilestoneNotify`
- Пачка 8 (40 шт.): `functions:dailyPhraseSetSaved,functions:dailyPollVote,functions:dialogueV2Catalogue,functions:dialogueV2FreeformPreparedBotVoiceResolve,functions:dialogueV2FreeformSessionStart,functions:dialogueV2FreeformSessionTurn,functions:dialogueV2MemoryClear,functions:dialogueV2MemoryResume,functions:dialogueV2MemoryView,functions:dialogueV2SessionComplete,functions:dialogueV2SessionStart,functions:dialogueV2TextTurn,functions:emailUnsubscribe,functions:explainChoice,functions:explainMistake,functions:explainPhrase,functions:finalizeLearningV2AccessPurchase,functions:finalizeLearningV2DelayedCandidate,functions:friendBlockUser,functions:friendEnsureMyCode,functions:friendLikeActivity,functions:friendLookupUser,functions:friendUnblockUser,functions:friendUnlikeActivity,functions:friendsGetProfiles,functions:friendsNudge,functions:getActiveShardSurvey,functions:getLearningV2AccountBinding,functions:getPublicUserIdea,functions:giftsToCoinsMigrationReport,functions:globalBroadcastClaim,functions:globalBroadcastListActive,functions:grantMistakeCorrectionReward,functions:introFullAccessClaim,functions:learningV2LocalizedCourseShardBackgroundWorker,functions:legacyBonusConvertMine,functions:levelSpinStarGrant,functions:likeUserIdea,functions:listPublicUserIdeas,functions:mistakeHubAdvice`
- Пачка 9 (40 шт.): `functions:mistakePracticeSyncEvents,functions:nameCheckAvailability,functions:nameGenerateAndReserve,functions:nameReleaseMine,functions:nameReserve,functions:notifyOnFriendAccepted,functions:notifyOnFriendRequestCreated,functions:notifyOnPackCommentCreated,functions:onAppMessagePollVoteWritten,functions:onAppMessageReactionWritten,functions:onAppMessageStateWritten,functions:onboardingLevelRecord,functions:openAiBudgetDashboard,functions:openAiDialogModelConfig,functions:openAiDialogQuotaConfig,functions:openAiJobsConfig,functions:paypalOrderCapture,functions:paypalOrderCreate,functions:practiceRuneGrant,functions:premiumDialogReview,functions:premiumDialogSend,functions:premiumDialogStream,functions:premiumDialogTranslate,functions:premiumExpiryCron,functions:premiumExpiryReminderCron,functions:profileCardBioSetMine,functions:progressMigrateSnapshot,functions:progressReseedMissing,functions:progressSubmitEvent,functions:promoCodeBatchUpsert,functions:promoCodeDelete,functions:promoCodeRedeem,functions:promoCodeUpsert,functions:publicProfileProjectMine,functions:reEngagePushCron,functions:recordAgeConsentSnapshot,functions:recordAiDialogConsent,functions:recordAiExplainConsent,functions:recordAiVoiceConsent,functions:recordOnboardingFunnelEvent`
- Пачка 10 (40 шт.): `functions:recordVipSurveyReviewClick,functions:referralApply,functions:referralClaimSpin,functions:referralClaimVipReward,functions:referralEnsureMyCode,functions:referralListMyInvites,functions:referralSpin,functions:refreshVideoSaveCounts,functions:reportUserIdea,functions:resendKeyHealthCron,functions:resolveLearningV2WalletRewardReceipt,functions:revenueCatPremiumReconcileMine,functions:revenueCatShardsWebhook,functions:siteStatsTrack,functions:soc2ReadinessCollectorCron,functions:spireFinalizeCron,functions:spireJoinRoom,functions:spirePackWeeklyCron,functions:spireReportSteps,functions:spireZoneWarningCron,functions:stripeWebhook,functions:submitClientReport,functions:submitExplainReport,functions:submitFeedbackEntry,functions:submitLearningV2ActivityReleasedCompletionV1,functions:submitLearningV2CourseSessionCompletedV1,functions:submitLearningV2RequiredSessionCompletion,functions:submitSettingsPollVote,functions:submitShardSurvey,functions:submitUserIdea,functions:submitVipSurvey,functions:submitWebsiteContact,functions:supportInboxOnNewMail,functions:supportOpsCron,functions:supportTelegramReplyJobOnCreate,functions:telegramPremiumActivationNotifier,functions:telegramPremiumWebhook,functions:unlikeUserIdea,functions:updateUserIdea,functions:userNotificationsCleanupCron`
- Пачка 11 (10 шт.): `functions:usersWriteRouter,functions:vipRevokeMine,functions:voiceMinuteWalletMine,functions:webActivationReminderCron,functions:webCheckoutCreate,functions:webLeadCapture,functions:webLeadNudgeCron,functions:webOrderStatus,functions:webPrices,functions:youtubeCatalogSyncCron`
- content: `functions:learningV2ActivityAuxiliarySessionGetV1,functions:learningV2ActivityReleasedSessionGetV1,functions:learningV2CourseReleasedSessionGetV2,functions:learningV2CourseReleasedSessionGetV3,functions:learningV2CourseActiveCatalogGetV1,functions:adminPublishAuthoredLearningV2Course,functions:adminImportV2OwnerEpisodeStage,functions:adminConfirmV2OwnerEpisode,functions:adminGetV2OwnerGeneratorSetupCatalog`
- english-test: `functions:englishTestApi,functions:adminEnglishTestAnalytics`

## Новые в HEAD (нет в проде) — 10
- accountsV2DeletionStatus
- accountsV2MigrateMine
- accountsV2PullMine
- accountsV2SyncApply
- adminArenaPublicationActivate
- adminArenaPublicationRollback
- adminArenaPublicationStage
- adminArenaPublicationStatus
- adminSuggestVideoPackTitle
- webActivationReminderCron

## В проде, нет в HEAD — 61 (на удаление; НЕ в этой выкладке)
🔴 Многие из них зовут СТАРЫЕ сборки из стора (1.5.x): Арена, Лиги, квесты, подарки, магазин, MAX. Если удалить их до того, как 2.0 выйдет и старые версии отомрут, у людей со старой версией сломаются разделы. Рекомендация: удалять только после релиза 2.0 и минимального порога версий, по слову владельца, по именам.
- adminActivateQuest
- adminArchiveQuest
- adminDeleteQuest
- adminGetCoinExchangeCenter
- adminGetCosmeticAssetArchive
- adminGetMaxVoiceOpsDashboard
- adminGrantVoiceMinutes
- adminListMaxVoiceFeedback
- adminListQuests
- adminRefundCommunityPackPurchase
- adminSetCoinExchangeRate
- adminSetCosmeticAssetSaleStatus
- adminSetShardBalance
- adminWriteQuest
- aiDialogBuyExtraReplies
- aiDialogSyncPurchase
- arenaExpansionHome
- arenaStarStore
- arenaV2CleanupHourly
- arenaV2DevFriendBotCreate
- arenaV2Home
- arenaV2InviteStatus
- authorizeLearningV2CourseUnlock
- collectiblesClaimDrop
- communityPurchasePack
- communityRedeemPackGiftVoucher
- computeLeaderboardStatsCron
- cosmeticAssetCatalogGet
- devRunesGrant
- devShardsGrant
- exchangeCoinsForStars
- flashcardPackGiftGrantGlobalBroadcast
- flashcardPackGiftRedeem
- flashcardPackGiftSyncState
- friendGetActiveQuest
- friendSendGift
- friendThankGift
- leaderboardUpdateDailyAnalytics
- leagueActivateGroupBoost
- leagueFinalizeCron
- leagueJoinOrUpdateGroup
- leagueResidentsTickCron
- leagueUpdateMyMember
- levelGiftReserve
- levelRewardSpinEnrollV1
- levelRewardSpinStatus
- levelSpinActivatePackGift
- maxVoiceConfigAdmin
- questClaimReward
- questGetActive
- recalcCoinExchangeRate
- referralDevGrantSpin
- resetWeeklyXpCron
- resolveLearningV2CourseUnlockReceipt
- seasonRedeemConsumable
- shardsApplyDelta
- statsInsightsGenerate
- submitMaxVoiceFeedback
- videoWatchRunesClaim
- weeklyReviewGenerate
- welcomeGiftClaim

## Security and privacy
Выкладка меняет поведение входа и восстановления: App Check снят, вместо него лимиты на uid/IP и потолки неверных кодов (R111). Нужен security-review Ревизора по 40ad95e86, 916ae8081, 07818d3da, 1fa264c86, ed290e9ea и по правилам. Ключи и секреты не читаются, сохраняются в Secret Manager. App Check НЕ включается (пломба).

## Technical debt
Accept temporarily: 61 функция-сирота остаётся в проде до решения владельца после релиза 2.0. Стоимость — только холодные инстансы и кроны. Кроны-сироты (`computeLeaderboardStatsCron`, `leagueFinalizeCron`, `leagueResidentsTickCron`, `resetWeeklyXpCron`, `arenaV2CleanupHourly`) тратят деньги каждый день. Их можно поставить на паузу в Cloud Scheduler отдельным решением.

## Verification
- После каждой пачки: `gcloud functions list` — updateTime у всех имён пачки свежий.
- Вход: `[AUTH-ENSURE-LINK]` появляется в логах.
- Восстановление: `[AUTH-RECOVERY]` вместо `app_check_required`.
- Перепись `check_learning_v2_storage_audio_inventory.mjs` — без изменений.

## Rollback
Функции: повторная выкладка из предыдущего коммита теми же списками (отдельного отката у Cloud Functions нет). Правила: выложить предыдущую версию `firestore.rules` из git.
