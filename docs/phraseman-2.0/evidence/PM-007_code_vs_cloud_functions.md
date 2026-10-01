# PM-007 — функции и кроны: объявленные в коде против живых в облаке

Сгенерировано `node scripts/pm007_code_vs_cloud_functions.mjs` (без даты и без сети; детерминированно).

Скрипт ничего не удаляет и не деплоит (PM-007-A2): расхождения только перечисляются, решение — за владельцем, деплой — после релиза 2.0 (D91), порядок отключения кронов — `PM-222_cron_retirement_plan.md`.

## Список 1 — объявлено в коде

Всего: **440** (default 429, max 0, content 9, english-test 2). Кронов (schedule): **23**.

### Кроны

| Кодбаза | Функция | Исходник |
|---|---|---|
| default | `accountDeleteRetryCron` | functions/src/account_delete_worker.ts:86 |
| default | `accountMergeOutboxRetryCron` | functions/src/auth_merge.ts:1322 |
| default | `activationEmailRetryCron` | functions/src/email_delivery_watchdog.ts:459 |
| default | `adminAlertDailyDigestsCron` | functions/src/admin_alert_digests.ts:51 |
| default | `adminAlertRecoveryCron` | functions/src/admin_alert_dispatcher.ts:390 |
| default | `adminPushJobsCron` | functions/src/admin_push_jobs.ts:566 |
| default | `cleanupExpiredAppMessagesCron` | functions/src/index.ts:442 |
| default | `jarvisDailyBusinessHistoryCron` | functions/src/jarvis/jarvis_crons.ts:654 |
| default | `jarvisDailyDepartmentsCron` | functions/src/jarvis/jarvis_crons.ts:212 |
| default | `jarvisProductKnowledgeReviewCron` | functions/src/jarvis/jarvis_crons.ts:726 |
| default | `premiumExpiryCron` | functions/src/premium_expiry_cron.ts:296 |
| default | `premiumExpiryReminderCron` | functions/src/index.ts:484 |
| default | `reEngagePushCron` | functions/src/index.ts:461 |
| default | `resendKeyHealthCron` | functions/src/email_delivery_watchdog.ts:361 |
| default | `soc2ReadinessCollectorCron` | functions/src/soc2_readiness_collector.ts:240 |
| default | `spireFinalizeCron` | functions/src/spire_finalize_cron.ts:89 |
| default | `spirePackWeeklyCron` | functions/src/spire_pack_build.ts:522 |
| default | `spireZoneWarningCron` | functions/src/spire_zone_warning_push.ts:310 |
| default | `supportOpsCron` | functions/src/index.ts:523 |
| default | `userNotificationsCleanupCron` | functions/src/user_notifications.ts:173 |
| default | `webActivationReminderCron` | functions/src/web_activation_reminders.ts:243 |
| default | `webLeadNudgeCron` | functions/src/web_leads.ts:425 |
| default | `youtubeCatalogSyncCron` | functions/src/youtube_catalog.ts:411 |

### Все функции

| Кодбаза | Функция | Тип | Исходник |
|---|---|---|---|
| default | `accountClaimMine` | callable | functions/src/account_claim.ts:245 |
| default | `accountDeleteCredentialStatus` | callable | functions/src/account_delete.ts:2033 |
| default | `accountDeleteEnqueue` | callable | functions/src/account_delete.ts:2011 |
| default | `accountDeleteMine` | callable | functions/src/account_delete.ts:2048 |
| default | `accountDeleteRestoreMine` | callable | functions/src/account_delete_restore.ts:84 |
| default | `accountDeleteRetryCron` | schedule | functions/src/account_delete_worker.ts:86 |
| default | `accountDeleteStatusMine` | callable | functions/src/account_delete_restore.ts:49 |
| default | `accountDeleteWorker` | trigger | functions/src/account_delete_worker.ts:35 |
| default | `accountMergeOutboxRetryCron` | schedule | functions/src/auth_merge.ts:1322 |
| default | `accountMergeOutboxWorker` | trigger | functions/src/auth_merge.ts:1314 |
| default | `accountsV2DeletionStatus` | callable | functions/src/accounts_v2_deletion/status_callable.ts:131 |
| default | `accountsV2SyncApply` | callable | functions/src/accounts_v2_adapter/callable.ts:470 |
| default | `activationEmailRetryCron` | schedule | functions/src/email_delivery_watchdog.ts:459 |
| default | `adminActivateCourseRelease` | callable | functions/src/language_release.ts:51 |
| default | `adminActivateQuest` | callable | functions/src/quests.ts:489 |
| default | `adminActivateTelegramPremiumOrder` | callable | functions/src/telegram_premium_admin.ts:256 |
| default | `adminAlertDailyDigestsCron` | schedule | functions/src/admin_alert_digests.ts:51 |
| default | `adminAlertDispatchOnCreate` | trigger | functions/src/admin_alert_dispatcher.ts:377 |
| default | `adminAlertOnAdminAuditCreated` | trigger | functions/src/admin_alert_sources_ops.ts:94 |
| default | `adminAlertOnAppMessageWritten` | trigger | functions/src/admin_alert_sources_ops.ts:102 |
| default | `adminAlertOnAuthFailureSpike` | trigger | functions/src/admin_alerts.ts:619 |
| default | `adminAlertOnBanWrite` | trigger | functions/src/admin_alert_sources_people.ts:174 |
| default | `adminAlertOnCancelReasonCreated` | trigger | functions/src/admin_alert_sources_reports.ts:84 |
| default | `adminAlertOnCancelSurvey` | trigger | functions/src/admin_alerts.ts:508 |
| default | `adminAlertOnCommunityPackPurchaseWritten` | trigger | functions/src/admin_alert_sources_revenue.ts:184 |
| default | `adminAlertOnCommunityPackReportCreated` | trigger | functions/src/admin_alert_sources_reports.ts:83 |
| default | `adminAlertOnCommunitySubmissionCreated` | trigger | functions/src/admin_alert_sources_reports.ts:82 |
| default | `adminAlertOnComplianceControlWritten` | trigger | functions/src/admin_alert_sources_ops.ts:106 |
| default | `adminAlertOnConfigWritten` | trigger | functions/src/admin_alerts.ts:633 |
| default | `adminAlertOnContentReport` | trigger | functions/src/admin_alerts.ts:463 |
| default | `adminAlertOnCriticalError` | trigger | functions/src/admin_alerts.ts:262 |
| default | `adminAlertOnCronHeartbeat` | trigger | functions/src/admin_alerts.ts:437 |
| default | `adminAlertOnExplanationReportCreated` | trigger | functions/src/admin_alert_sources_reports.ts:85 |
| default | `adminAlertOnFeedbackCreated` | trigger | functions/src/admin_alert_sources_ratings.ts:59 |
| default | `adminAlertOnGiftCertificateCreated` | trigger | functions/src/admin_alert_sources_revenue.ts:191 |
| default | `adminAlertOnJarvisPlanWritten` | trigger | functions/src/admin_alert_sources_ops.ts:110 |
| default | `adminAlertOnPromoRedemptionCreated` | trigger | functions/src/admin_alert_sources_revenue.ts:199 |
| default | `adminAlertOnPushJobWritten` | trigger | functions/src/admin_alert_sources_ops.ts:98 |
| default | `adminAlertOnReferralAttributionWrite` | trigger | functions/src/admin_alert_sources_people.ts:162 |
| default | `adminAlertOnRevenueCatReceipt` | trigger | functions/src/admin_alert_sources_revenue.ts:162 |
| default | `adminAlertOnSupportEmailCreated` | trigger | functions/src/admin_alert_sources_reports.ts:81 |
| default | `adminAlertOnTelegramPremiumOrderWritten` | trigger | functions/src/admin_alert_sources_revenue.ts:183 |
| default | `adminAlertOnUgcRefund` | trigger | functions/src/admin_alerts.ts:516 |
| default | `adminAlertOnUserIdeaCreated` | trigger | functions/src/admin_alert_sources_reports.ts:79 |
| default | `adminAlertOnUserIdeaReport` | trigger | functions/src/user_idea_reports.ts:338 |
| default | `adminAlertOnUserReport` | trigger | functions/src/admin_alerts.ts:163 |
| default | `adminAlertOnWebPremiumOrderWritten` | trigger | functions/src/admin_alert_sources_revenue.ts:182 |
| default | `adminAlertOnWebsiteContactCreated` | trigger | functions/src/admin_alert_sources_reports.ts:80 |
| default | `adminAlertRecoveryCron` | schedule | functions/src/admin_alert_dispatcher.ts:390 |
| default | `adminAlignVideoPhraseTranscript` | callable | functions/src/video_phrase_timing.ts:34 |
| default | `adminApproveLearningV2CourseWave` | callable | functions/src/content_factory/learning_v2_course_shard_background.ts:301 |
| default | `adminArchiveQuest` | callable | functions/src/quests.ts:530 |
| default | `adminArenaConfigGet` | callable | functions/src/admin_arena_config.ts:64 |
| default | `adminArenaConfigSet` | callable | functions/src/admin_arena_config.ts:96 |
| default | `adminArenaContentStatus` | callable | functions/src/admin_arena_content.ts:181 |
| default | `adminArenaContentValidate` | callable | functions/src/admin_arena_content.ts:189 |
| default | `adminArenaPublicationActivate` | callable | functions/src/admin_arena_publication.ts:221 |
| default | `adminArenaPublicationRollback` | callable | functions/src/admin_arena_publication.ts:278 |
| default | `adminArenaPublicationStage` | callable | functions/src/admin_arena_publication.ts:161 |
| default | `adminArenaPublicationStatus` | callable | functions/src/admin_arena_publication.ts:182 |
| default | `adminAuditAccountDeleteCoverage` | callable | functions/src/account_delete_ai_audit.ts:51 |
| default | `adminBackfillVideoPacks` | callable | functions/src/video_phrases.ts:511 |
| default | `adminCancelGiftCertificateBatchOperation` | callable | functions/src/web_checkout.ts:2286 |
| default | `adminCancelStripeSubscriptionRenewal` | callable | functions/src/web_checkout.ts:2845 |
| default | `adminCardTtsRequeuePack` | callable | functions/src/card_tts_worker.ts:491 |
| default | `adminCleanupExpiredAppMessages` | callable | functions/src/admin_app_messages.ts:848 |
| default | `adminCommunityPackApplyQaFixes` | callable | functions/src/admin_community_pack_qa.ts:546 |
| default | `adminCommunityPackApplyQaFixesToPublished` | callable | functions/src/admin_community_pack_qa.ts:630 |
| default | `adminCommunityPackQaReview` | callable | functions/src/admin_community_pack_qa.ts:430 |
| default | `adminCommunityPackTranslateLocales` | callable | functions/src/admin_community_pack_translate.ts:151 |
| default | `adminControlContentStage` | callable | functions/src/admin_content_stages.ts:274 |
| default | `adminCreateAppMessage` | callable | functions/src/admin_app_messages.ts:478 |
| default | `adminCreateAssetJob` | callable | functions/src/admin_asset_studio.ts:244 |
| default | `adminCreateContentGenerationJob` | callable | functions/src/admin_content_factory.ts:92 |
| default | `adminCreateContentStage` | callable | functions/src/admin_content_stages.ts:241 |
| default | `adminCreateContentStageBulkPlan` | callable | functions/src/admin_content_stage_bulk.ts:98 |
| default | `adminCreateGiftCertificateBatch` | callable | functions/src/web_checkout.ts:2180 |
| default | `adminCreatePlan` | callable | functions/src/admin_plans/callables.ts:25 |
| default | `adminCreateV2GenerationPlan` | callable | functions/src/admin_v2_generation.ts:361 |
| default | `adminDeactivateGlobalBroadcast` | callable | functions/src/admin_global_broadcast.ts:600 |
| default | `adminDeactivateGlobalBroadcasts` | callable | functions/src/admin_global_broadcast.ts:863 |
| default | `adminDeactivateVipSurveyCampaign` | callable | functions/src/admin_app_messages.ts:944 |
| default | `adminDecideUserIdea` | callable | functions/src/user_ideas.ts:634 |
| default | `adminDeleteAppMessage` | callable | functions/src/admin_app_messages.ts:798 |
| default | `adminDeleteDuplicateUser` | callable | functions/src/admin_user_operations.ts:365 |
| default | `adminDeleteGiftCertificate` | callable | functions/src/web_checkout.ts:2366 |
| default | `adminDeleteQuest` | callable | functions/src/quests.ts:542 |
| default | `adminDeleteShardSurvey` | callable | functions/src/shard_survey.ts:385 |
| default | `adminDeleteUserIdea` | callable | functions/src/user_ideas.ts:476 |
| default | `adminDraftIdeaDecision` | callable | functions/src/user_ideas.ts:763 |
| default | `adminDraftReportReply` | callable | functions/src/report_replies.ts:613 |
| default | `adminEditContentStageArtifact` | callable | functions/src/admin_content_stage_edits.ts:72 |
| default | `adminEmailBroadcast` | callable | functions/src/admin_email.ts:493 |
| default | `adminEmailContactsBackfill` | callable | functions/src/admin_email.ts:428 |
| default | `adminExportReportDocuments` | callable | functions/src/admin_reports_center.ts:564 |
| default | `adminExportUnresolvedReports` | callable | functions/src/admin_reports_center.ts:593 |
| default | `adminGenerateDailyDigest` | callable | functions/src/admin_daily_digest.ts:1055 |
| default | `adminGenerateDirectorDigestAudio` | callable | functions/src/admin_director_digest_audio.ts:120 |
| default | `adminGetAdminConfigWorkspace` | callable | functions/src/admin_config_controls.ts:156 |
| default | `adminGetAlertDiagnostics` | callable | functions/src/admin_alert_dispatcher.ts:417 |
| default | `adminGetAnalyticsSnapshot` | callable | functions/src/admin_analytics.ts:160 |
| default | `adminGetAnalyticsTrends` | callable | functions/src/admin_analytics_trends.ts:836 |
| default | `adminGetComplianceOverview` | callable | functions/src/admin_compliance.ts:171 |
| default | `adminGetContentFactoryJobDetail` | callable | functions/src/admin_content_factory_read.ts:96 |
| default | `adminGetContentFactoryRolloutMetrics` | callable | functions/src/admin_content_factory_read.ts:197 |
| default | `adminGetContentFactoryUnitPreview` | callable | functions/src/admin_content_factory_read.ts:138 |
| default | `adminGetContentFactoryWorkspace` | callable | functions/src/admin_content_factory_read.ts:168 |
| default | `adminGetContentStageCapabilities` | callable | functions/src/admin_content_stages.ts:326 |
| default | `adminGetDailyBriefing` | callable | functions/src/admin_daily_digest.ts:1017 |
| default | `adminGetDiagnosticsOverview` | callable | functions/src/admin_diagnostics_overview.ts:71 |
| default | `adminGetDirectorDigest` | callable | functions/src/admin_director_digest.ts:478 |
| default | `adminGetFeedbackStats` | callable | functions/src/feedback_admin_stats.ts:84 |
| default | `adminGetGiftCertificateBatchOperation` | callable | functions/src/web_checkout.ts:2268 |
| default | `adminGetGiftCertificateDownload` | callable | functions/src/web_checkout.ts:2414 |
| default | `adminGetHomeHintsCatalog` | callable | functions/src/admin_home_hints.ts:59 |
| default | `adminGetLearningV2CourseWorkspaceProjection` | callable | functions/src/admin_content_stages.ts:295 |
| default | `adminGetOnboardingFunnel` | callable | functions/src/onboarding_funnel.ts:311 |
| default | `adminGetPaywallAbWorkspace` | callable | functions/src/admin_paywall_ab.ts:258 |
| default | `adminGetPaywallVariantStats` | callable | functions/src/admin_paywall_variant_stats.ts:511 |
| default | `adminGetPlan` | callable | functions/src/admin_plans/callables.ts:27 |
| default | `adminGetProductCharter` | callable | functions/src/admin_product_charter.ts:52 |
| default | `adminGetReferralDashboard` | callable | functions/src/admin_referrals.ts:857 |
| default | `adminGetRemoteConfigWorkspace` | callable | functions/src/admin_remote_config.ts:171 |
| default | `adminGetRevenueCatOverviewMetrics` | callable | functions/src/admin_revenuecat_overview.ts:120 |
| default | `adminGetUserProfile` | callable | functions/src/admin_user_profile.ts:473 |
| default | `adminGetV2OwnerGeneratorWorkspace` | callable | functions/src/content_factory/v2_owner_generator_workspace_v1.ts:204 |
| default | `adminGetVideoPhraseWorkspace` | callable | functions/src/video_phrases.ts:384 |
| default | `adminGetVideoStudioWorkspace` | callable | functions/src/video_phrases.ts:297 |
| default | `adminGetYoutubeCatalogWorkspace` | callable | functions/src/youtube_catalog.ts:422 |
| default | `adminGrantAccess` | callable | functions/src/admin_access_controls.ts:158 |
| default | `adminGrantReward` | callable | functions/src/admin_grant.ts:181 |
| default | `adminGrantVoiceMinutes` | callable | functions/src/admin_voice_minutes.ts:92 |
| default | `adminInspectTelegramPromoCode` | callable | functions/src/telegram_premium_admin.ts:235 |
| default | `adminLaunchVipSurveyCampaign` | callable | functions/src/admin_app_messages.ts:902 |
| default | `adminListAppMessages` | callable | functions/src/admin_app_messages.ts:468 |
| default | `adminListAssetJobs` | callable | functions/src/admin_asset_studio.ts:233 |
| default | `adminListAuditLog` | callable | functions/src/admin_audit_log.ts:182 |
| default | `adminListContentFactoryJobs` | callable | functions/src/admin_content_factory.ts:142 |
| default | `adminListContentStageDependencies` | callable | functions/src/admin_content_stages.ts:317 |
| default | `adminListContentStages` | callable | functions/src/admin_content_stages.ts:286 |
| default | `adminListFeedbackEntries` | callable | functions/src/feedback_entries.ts:231 |
| default | `adminListGiftCertificates` | callable | functions/src/web_checkout.ts:2308 |
| default | `adminListGlobalBroadcasts` | callable | functions/src/admin_global_broadcast.ts:493 |
| default | `adminListMistakeExplanationCache` | callable | functions/src/admin_explain_cache.ts:86 |
| default | `adminListOpsLog` | callable | functions/src/admin_ops_log.ts:213 |
| default | `adminListPlans` | callable | functions/src/admin_plans/callables.ts:29 |
| default | `adminListPromoCodes` | callable | functions/src/promo_codes.ts:614 |
| default | `adminListQuests` | callable | functions/src/quests.ts:563 |
| default | `adminListReferrals` | callable | functions/src/admin_referrals.ts:783 |
| default | `adminListReportQueue` | callable | functions/src/admin_reports_center.ts:537 |
| default | `adminListSafetyFlags` | callable | functions/src/admin_compliance.ts:226 |
| default | `adminListShardRefunds` | callable | functions/src/admin_shard_refunds.ts:153 |
| default | `adminListUserIdeas` | callable | functions/src/user_ideas.ts:403 |
| default | `adminMarkSafetyFlagsHandled` | callable | functions/src/admin_compliance.ts:286 |
| default | `adminMigrateLegacyAdminPremium` | callable | functions/src/admin_user_operations.ts:426 |
| default | `adminMonthlyDecisionPack` | callable | functions/src/admin_monthly_decision_pack.ts:110 |
| default | `adminOpenDailyDigest` | callable | functions/src/admin_daily_digest.ts:994 |
| default | `adminParseVideoPhraseDocument` | callable | functions/src/video_phrases.ts:461 |
| default | `adminPrepareV2OwnerEpisodeDraft` | callable | functions/src/content_factory/v2_owner_generator_workspace_v1.ts:245 |
| default | `adminPreviewContentStage` | callable | functions/src/admin_content_stages.ts:331 |
| default | `adminPreviewLearningV2CourseWave` | callable | functions/src/content_factory/learning_v2_course_shard_background.ts:372 |
| default | `adminProductAnalytics` | callable | functions/src/admin_product_analytics.ts:1277 |
| default | `adminPublishAlertsConfig` | callable | functions/src/admin_config_controls.ts:171 |
| default | `adminPublishGlobalBroadcast` | callable | functions/src/admin_global_broadcast.ts:527 |
| default | `adminPublishHomeHints` | callable | functions/src/admin_home_hints.ts:67 |
| default | `adminPublishNavLayout` | callable | functions/src/admin_config_controls.ts:166 |
| default | `adminPublishPaywallAb` | callable | functions/src/admin_paywall_ab.ts:180 |
| default | `adminPublishRemoteConfig` | callable | functions/src/admin_remote_config.ts:104 |
| default | `adminPublishVideoPhrases` | callable | functions/src/video_phrases.ts:414 |
| default | `adminPublishYoutubeCatalogConfig` | callable | functions/src/youtube_catalog.ts:447 |
| default | `adminPushJobCreated` | trigger | functions/src/admin_push_jobs.ts:556 |
| default | `adminPushJobsCron` | schedule | functions/src/admin_push_jobs.ts:566 |
| default | `adminQueueAccountDeletion` | callable | functions/src/admin_account_delete.ts:433 |
| default | `adminQueueV2GenerationPlan` | callable | functions/src/admin_v2_generation.ts:378 |
| default | `adminReferralHealth` | callable | functions/src/admin_referrals.ts:1389 |
| default | `adminRefreshYoutubeCatalog` | callable | functions/src/youtube_catalog.ts:516 |
| default | `adminRejectLearningV2CourseWave` | callable | functions/src/content_factory/learning_v2_course_shard_background.ts:335 |
| default | `adminRelinkProvider` | callable | functions/src/admin_auth_repair.ts:311 |
| default | `adminRepairAuthLink` | callable | functions/src/admin_auth_repair.ts:131 |
| default | `adminRepairPendingReferralPurchase` | callable | functions/src/admin_referral_purchase_repair.ts:313 |
| default | `adminReplaceSyntheticGiftCertificate` | callable | functions/src/web_checkout.ts:2541 |
| default | `adminReplyToReport` | callable | functions/src/report_replies.ts:356 |
| default | `adminRequestUserMerge` | callable | functions/src/admin_user_operations.ts:345 |
| default | `adminResetUserProgress` | callable | functions/src/admin_user_operations.ts:467 |
| default | `adminResolveUserReport` | callable | functions/src/admin_user_operations.ts:294 |
| default | `adminRestoreUserIdea` | callable | functions/src/user_idea_reports.ts:175 |
| default | `adminResumePendingReferralPurchaseRepair` | callable | functions/src/admin_referral_purchase_repair.ts:456 |
| default | `adminReviewContentStage` | callable | functions/src/admin_content_stages.ts:368 |
| default | `adminReviewCourseGeneration` | callable | functions/src/admin_content_release.ts:43 |
| default | `adminRevokeReferralAttribution` | callable | functions/src/admin_referrals.ts:520 |
| default | `adminRollbackCourseRelease` | callable | functions/src/language_release.ts:94 |
| default | `adminRunAssetJob` | callable | functions/src/admin_asset_studio.ts:271 |
| default | `adminRunContentGenerationUnit` | callable | functions/src/content_factory_worker.ts:70 |
| default | `adminRunContentStage` | callable | functions/src/content_stage_worker.ts:234 |
| default | `adminRunV2E1Compilation` | callable | functions/src/content_factory/v2_e1_compilation_worker.ts:362 |
| default | `adminSaveProductCharter` | callable | functions/src/admin_product_charter.ts:84 |
| default | `adminSaveV2EpisodeDraft` | callable | functions/src/admin_content_studio_callables.ts:64 |
| default | `adminSaveV2SeasonDraft` | callable | functions/src/admin_content_studio_callables.ts:276 |
| default | `adminSaveVideoPhraseDraft` | callable | functions/src/video_phrases.ts:392 |
| default | `adminScrubGlobalBroadcastMetadata` | callable | functions/src/admin_global_broadcast.ts:663 |
| default | `adminSealCourseRelease` | callable | functions/src/admin_content_release.ts:102 |
| default | `adminSearchUsers` | callable | functions/src/admin_user_profile.ts:265 |
| default | `adminSeedV2E1DemoSource` | callable | functions/src/content_factory/v2_e1_compilation_worker.ts:349 |
| default | `adminSendPersonalAppMessage` | callable | functions/src/admin_app_messages.ts:414 |
| default | `adminSendPreparedGiftCertificate` | callable | functions/src/web_checkout.ts:2595 |
| default | `adminSetAppMessageActive` | callable | functions/src/admin_app_messages.ts:548 |
| default | `adminSetIdeaSubmissionRestriction` | callable | functions/src/user_idea_reports.ts:259 |
| default | `adminSetReferralRouletteEmergencyStop` | callable | functions/src/admin_referrals.ts:1298 |
| default | `adminSetReferralRouletteEnabled` | callable | functions/src/admin_referrals.ts:1203 |
| default | `adminSetSpinWeights` | callable | functions/src/admin_referrals.ts:1118 |
| default | `adminSetUserBan` | callable | functions/src/admin_access_controls.ts:182 |
| default | `adminSetUserIdeaStatus` | callable | functions/src/user_ideas.ts:515 |
| default | `adminSpinLogs` | callable | functions/src/admin_referrals.ts:1082 |
| default | `adminSpinStats` | callable | functions/src/admin_referrals.ts:1021 |
| default | `adminSpireConfigGet` | callable | functions/src/admin_spire_config.ts:54 |
| default | `adminSpireConfigSet` | callable | functions/src/admin_spire_config.ts:64 |
| default | `adminSpirePackBuild` | callable | functions/src/spire_pack_build.ts:585 |
| default | `adminSpireTaskFlagAdd` | callable | functions/src/admin_spire_task_flag.ts:347 |
| default | `adminSpireTaskFlagList` | callable | functions/src/admin_spire_task_flag.ts:335 |
| default | `adminSpireTaskFlagRemove` | callable | functions/src/admin_spire_task_flag.ts:450 |
| default | `adminSpireTaskIncidentSetState` | callable | functions/src/admin_spire_task_flag.ts:309 |
| default | `adminSpireTaskIncidentStates` | callable | functions/src/admin_spire_task_flag.ts:194 |
| default | `adminSpireTaskReportList` | callable | functions/src/admin_spire_task_flag.ts:180 |
| default | `adminSubscriptionAnalytics` | callable | functions/src/admin_subscription_analytics.ts:123 |
| default | `adminSummarizeFeedback` | callable | functions/src/feedback_summary.ts:221 |
| default | `adminSupportArchiveMessages` | callable | functions/src/support_inbox.ts:6388 |
| default | `adminSupportCancelReply` | callable | functions/src/support_inbox.ts:5164 |
| default | `adminSupportCancelReplyBatch` | callable | functions/src/support_inbox.ts:5816 |
| default | `adminSupportConversation` | callable | functions/src/support_inbox.ts:2114 |
| default | `adminSupportDispatchReply` | callable | functions/src/support_inbox.ts:5151 |
| default | `adminSupportDispatchReplyBatch` | callable | functions/src/support_inbox.ts:5567 |
| default | `adminSupportGenerateReply` | callable | functions/src/support_inbox.ts:2145 |
| default | `adminSupportList` | callable | functions/src/support_inbox.ts:2062 |
| default | `adminSupportPrepareReply` | callable | functions/src/support_inbox.ts:5109 |
| default | `adminSupportPrepareReplyBatch` | callable | functions/src/support_inbox.ts:5322 |
| default | `adminSupportPull` | callable | functions/src/support_inbox.ts:2017 |
| default | `adminSupportResolveReplyDelivery` | callable | functions/src/support_inbox.ts:5921 |
| default | `adminSupportSaveAutomation` | callable | functions/src/support_inbox.ts:6054 |
| default | `adminSupportSaveDraft` | callable | functions/src/support_inbox.ts:6160 |
| default | `adminSupportSaveInstructions` | callable | functions/src/support_inbox.ts:6100 |
| default | `adminSupportSaveSignature` | callable | functions/src/support_inbox.ts:6027 |
| default | `adminSupportSendReply` | callable | functions/src/support_inbox.ts:5159 |
| default | `adminSupportSetStatus` | callable | functions/src/support_inbox.ts:6358 |
| default | `adminTestAlerts` | callable | functions/src/admin_config_controls.ts:176 |
| default | `adminTranslateMessage` | callable | functions/src/admin_translate.ts:88 |
| default | `adminUpdateAppMessage` | callable | functions/src/admin_app_messages.ts:697 |
| default | `adminUpdateGiftCertificatePersonalization` | callable | functions/src/web_checkout.ts:2498 |
| default | `adminUpdateGiftCertificateRecipient` | callable | functions/src/web_checkout.ts:2455 |
| default | `adminUpdateReportStatus` | callable | functions/src/admin_reports_center.ts:653 |
| default | `adminUpdateUserProfileField` | callable | functions/src/admin_user_operations.ts:234 |
| default | `adminUserBriefs` | callable | functions/src/admin_user_briefs.ts:160 |
| default | `adminVerifyGlobalBroadcastPrivacyReadiness` | callable | functions/src/admin_global_broadcast.ts:766 |
| default | `adminWarmInstanceGauge` | callable | functions/src/warm_instance_gauge.ts:205 |
| default | `adminWarnUser` | callable | functions/src/admin_user_operations.ts:269 |
| default | `adminWriteQuest` | callable | functions/src/quests.ts:450 |
| default | `adminWriteShardSurvey` | callable | functions/src/shard_survey.ts:336 |
| default | `aiDialogBuyExtraReplies` | callable | functions/src/ai_dialog_extra_replies.ts:172 |
| default | `authCleanInstallRecoveryDeliveryWorker` | trigger | functions/src/auth_recovery.ts:1301 |
| default | `authCompleteRecoveryHandoff` | callable | functions/src/auth_recovery.ts:1925 |
| default | `authConfirmCleanInstallRecoveryCode` | callable | functions/src/auth_recovery.ts:1476 |
| default | `authConfirmRecoveryCode` | callable | functions/src/auth_recovery.ts:865 |
| default | `authEnsureStableLink` | callable | functions/src/auth_identity.ts:2142 |
| default | `authIssueRecoveryHandoffToken` | callable | functions/src/auth_recovery.ts:1800 |
| default | `authMergeStableAccounts` | callable | functions/src/auth_merge.ts:1546 |
| default | `authRecoveryHint` | callable | functions/src/auth_identity.ts:2226 |
| default | `authRequestCleanInstallRecoveryCode` | callable | functions/src/auth_recovery.ts:1255 |
| default | `authRequestRecoveryCode` | callable | functions/src/auth_recovery.ts:480 |
| default | `authStampAnonOwnership` | callable | functions/src/auth_identity.ts:2297 |
| default | `cardTtsPackWorker` | trigger | functions/src/card_tts_worker.ts:463 |
| default | `claimReportReward` | callable | functions/src/report_replies.ts:525 |
| default | `cleanupExpiredAppMessagesCron` | schedule | functions/src/index.ts:442 |
| default | `collectiblesClaimDrop` | callable | functions/src/collectibles_retired.ts:28 |
| default | `communityAdminModeratePack` | callable | functions/src/community_packs.ts:943 |
| default | `communityAuthorRemovePack` | callable | functions/src/community_packs.ts:873 |
| default | `communityFetchPackCardsIfAccessible` | callable | functions/src/community_packs.ts:1057 |
| default | `communityListSellerInbox` | callable | functions/src/community_packs.ts:1381 |
| default | `communityMarkSellerInboxSeen` | callable | functions/src/community_packs.ts:1416 |
| default | `communityModerateSubmission` | callable | functions/src/community_packs.ts:588 |
| default | `communityRedeemPackGiftVoucher` | callable | functions/src/community_packs.ts:1372 |
| default | `communitySubmitPackForReview` | callable | functions/src/community_packs.ts:361 |
| default | `communitySyncPackRuneSale` | callable | functions/src/community_pack_rune_sale.ts:140 |
| default | `customCardMilestoneNotify` | callable | functions/src/custom_card_milestone.ts:43 |
| default | `dailyPhraseSetSaved` | callable | functions/src/daily_phrases.ts:27 |
| default | `dailyPollVote` | callable | functions/src/daily_poll_vote.ts:36 |
| default | `dialogueV2Catalogue` | callable | functions/src/dialogue_v2_catalogue_callable.ts:62 |
| default | `dialogueV2FreeformPreparedBotVoiceResolve` | callable | functions/src/dialogue_v2_freeform_prepared_bot_voice_callable.ts:178 |
| default | `dialogueV2FreeformSessionStart` | callable | functions/src/dialogue_v2_freeform_session_start_callable.ts:247 |
| default | `dialogueV2FreeformSessionTurn` | callable | functions/src/dialogue_v2_freeform_session_turn_callable.ts:522 |
| default | `dialogueV2MemoryClear` | callable | functions/src/dialogue_v2_memory_management_callable.ts:134 |
| default | `dialogueV2MemoryResume` | callable | functions/src/dialogue_v2_memory_resume_callable.ts:84 |
| default | `dialogueV2MemoryView` | callable | functions/src/dialogue_v2_memory_management_callable.ts:120 |
| default | `dialogueV2SessionComplete` | callable | functions/src/dialogue_v2_session_complete_callable.ts:561 |
| default | `dialogueV2SessionStart` | callable | functions/src/dialogue_v2_session_start_callable.ts:192 |
| default | `dialogueV2TextTurn` | callable | functions/src/dialogue_v2_turn_production_callable.ts:799 |
| default | `emailUnsubscribe` | http | functions/src/email_unsubscribe.ts:211 |
| default | `explainChoice` | callable | functions/src/explain_choice.ts:76 |
| default | `explainMistake` | callable | functions/src/mistake_explain.ts:787 |
| default | `explainPhrase` | callable | functions/src/explain_phrase.ts:109 |
| default | `finalizeLearningV2AccessPurchase` | callable | functions/src/learning_v2_access_production_callable.ts:16 |
| default | `finalizeLearningV2DelayedCandidate` | callable | functions/src/learning_v2_delayed_callable.ts:168 |
| default | `flashcardPackGiftGrantGlobalBroadcast` | callable | functions/src/community_packs.ts:1280 |
| default | `flashcardPackGiftRedeem` | callable | functions/src/community_packs.ts:1369 |
| default | `flashcardPackGiftSyncState` | callable | functions/src/community_packs.ts:1320 |
| default | `friendEnsureMyCode` | callable | functions/src/friend_codes.ts:81 |
| default | `friendLikeActivity` | callable | functions/src/friend_activity_likes.ts:190 |
| default | `friendLookupUser` | callable | functions/src/friend_lookup.ts:172 |
| default | `friendUnlikeActivity` | callable | functions/src/friend_activity_likes.ts:400 |
| default | `friendsGetProfiles` | callable | functions/src/friends_profiles.ts:365 |
| default | `friendsNudge` | callable | functions/src/friends_together.ts:117 |
| default | `friendsTogetherClaimLevel` | callable | functions/src/friends_together.ts:109 |
| default | `getActiveShardSurvey` | callable | functions/src/shard_survey.ts:125 |
| default | `getLearningV2AccountBinding` | callable | functions/src/learning_v2_wallet_reward_callable.ts:143 |
| default | `getPublicUserIdea` | callable | functions/src/user_ideas.ts:363 |
| default | `giftsToCoinsMigrationReport` | callable | functions/src/gifts_to_coins_report.ts:98 |
| default | `globalBroadcastClaim` | callable | functions/src/global_broadcast_claim.ts:102 |
| default | `globalBroadcastListActive` | callable | functions/src/global_broadcast_public.ts:75 |
| default | `grantMistakeCorrectionReward` | callable | functions/src/mistake_practice_wallet_reward.ts:183 |
| default | `introFullAccessClaim` | callable | functions/src/gift_access.ts:67 |
| default | `jarvisDailyBusinessHistoryCron` | schedule | functions/src/jarvis/jarvis_crons.ts:654 |
| default | `jarvisDailyDepartmentsCron` | schedule | functions/src/jarvis/jarvis_crons.ts:212 |
| default | `jarvisDeletePlan` | callable | functions/src/jarvis/jarvis_plans_callables.ts:86 |
| default | `jarvisGetAllDecisions` | callable | functions/src/jarvis/all_departments_callables.ts:87 |
| default | `jarvisGetApprovalAudit` | callable | functions/src/jarvis/all_departments_callables.ts:242 |
| default | `jarvisGetBusinessTier` | callable | functions/src/jarvis/business_tier_callables.ts:63 |
| default | `jarvisGetCohortRetention` | callable | functions/src/jarvis/all_departments_callables.ts:217 |
| default | `jarvisGetGrowthSnapshot` | callable | functions/src/jarvis/growth_callables.ts:62 |
| default | `jarvisGetMoneySnapshot` | callable | functions/src/jarvis/money_callables.ts:63 |
| default | `jarvisGetPlans` | callable | functions/src/jarvis/jarvis_plans_callables.ts:69 |
| default | `jarvisGetQualitySnapshot` | callable | functions/src/jarvis/callables.ts:63 |
| default | `jarvisProductKnowledgeReviewCron` | schedule | functions/src/jarvis/jarvis_crons.ts:726 |
| default | `jarvisRunBusinessTierBackfill` | callable | functions/src/jarvis/business_tier_callables.ts:98 |
| default | `jarvisSetPlanStatus` | callable | functions/src/jarvis/jarvis_plans_callables.ts:77 |
| default | `jarvisTelegramApprovalWebhook` | http | functions/src/jarvis/approval_webhook.ts:174 |
| default | `learningV2LocalizedCourseShardBackgroundWorker` | trigger | functions/src/content_factory/learning_v2_course_shard_background.ts:237 |
| default | `levelSpinStarGrant` | callable | functions/src/level_spin_star_grant.ts:314 |
| default | `likeUserIdea` | callable | functions/src/user_idea_likes.ts:45 |
| default | `listPublicUserIdeas` | callable | functions/src/user_ideas.ts:321 |
| default | `mistakeHubAdvice` | callable | functions/src/mistake_hub_advice.ts:164 |
| default | `mistakePracticeSyncEvents` | callable | functions/src/mistake_practice_event_sync.ts:204 |
| default | `nameCheckAvailability` | callable | functions/src/leaderboard.ts:223 |
| default | `nameGenerateAndReserve` | callable | functions/src/leaderboard.ts:249 |
| default | `nameReleaseMine` | callable | functions/src/leaderboard.ts:477 |
| default | `nameReserve` | callable | functions/src/leaderboard.ts:347 |
| default | `notifyOnFriendAccepted` | trigger | functions/src/user_notifications.ts:100 |
| default | `notifyOnFriendRequestCreated` | trigger | functions/src/user_notifications.ts:75 |
| default | `notifyOnPackCommentCreated` | trigger | functions/src/user_notifications.ts:131 |
| default | `onAppMessagePollVoteWritten` | trigger | functions/src/app_messages.ts:178 |
| default | `onAppMessageReactionWritten` | trigger | functions/src/app_messages.ts:119 |
| default | `onAppMessageStateWritten` | trigger | functions/src/app_messages.ts:153 |
| default | `openAiBudgetDashboard` | callable | functions/src/openai_budget_dashboard.ts:270 |
| default | `openAiDialogModelConfig` | callable | functions/src/openai_dialog_model_config.ts:159 |
| default | `openAiDialogQuotaConfig` | callable | functions/src/openai_dialog_model_config.ts:200 |
| default | `openAiJobsConfig` | callable | functions/src/openai_jobs_config.ts:252 |
| default | `paypalOrderCapture` | http | functions/src/web_checkout.ts:3311 |
| default | `paypalOrderCreate` | http | functions/src/web_checkout.ts:3228 |
| default | `practiceRuneGrant` | callable | functions/src/practice_rune_grant.ts:302 |
| default | `premiumDialogReview` | callable | functions/src/premium_dialog_review.ts:594 |
| default | `premiumDialogSend` | callable | functions/src/premium_dialog.ts:1045 |
| default | `premiumDialogStream` | http | functions/src/premium_dialog_stream.ts:181 |
| default | `premiumDialogTranslate` | callable | functions/src/premium_dialog.ts:1597 |
| default | `premiumExpiryCron` | schedule | functions/src/premium_expiry_cron.ts:296 |
| default | `premiumExpiryReminderCron` | schedule | functions/src/index.ts:484 |
| default | `profileCardBioSetMine` | callable | functions/src/profile_card_bio.ts:28 |
| default | `progressMigrateSnapshot` | callable | functions/src/progress_events.ts:840 |
| default | `progressSubmitEvent` | callable | functions/src/progress_events.ts:656 |
| default | `promoCodeBatchUpsert` | callable | functions/src/promo_codes.ts:464 |
| default | `promoCodeDelete` | callable | functions/src/promo_codes.ts:534 |
| default | `promoCodeRedeem` | callable | functions/src/promo_codes.ts:182 |
| default | `promoCodeUpsert` | callable | functions/src/promo_codes.ts:423 |
| default | `publicProfileProjectMine` | callable | functions/src/public_profile_projection.ts:149 |
| default | `questClaimReward` | callable | functions/src/quests.ts:351 |
| default | `questGetActive` | callable | functions/src/quests.ts:207 |
| default | `questReportProgress` | callable | functions/src/quests.ts:274 |
| default | `reEngagePushCron` | schedule | functions/src/index.ts:461 |
| default | `recordAgeConsentSnapshot` | callable | functions/src/record_age_consent_snapshot.ts:181 |
| default | `recordAiDialogConsent` | callable | functions/src/record_ai_dialog_consent.ts:9 |
| default | `recordAiExplainConsent` | callable | functions/src/record_ai_explain_consent.ts:8 |
| default | `recordAiVoiceConsent` | callable | functions/src/record_ai_voice_consent.ts:4 |
| default | `recordOnboardingFunnelEvent` | callable | functions/src/onboarding_funnel.ts:299 |
| default | `recordVipSurveyReviewClick` | callable | functions/src/vip_survey.ts:245 |
| default | `referralApply` | callable | functions/src/referral.ts:647 |
| default | `referralClaimSpin` | callable | functions/src/referral_claim_spin.ts:69 |
| default | `referralClaimVipReward` | callable | functions/src/referral.ts:999 |
| default | `referralEnsureMyCode` | callable | functions/src/referral.ts:586 |
| default | `referralListMyInvites` | callable | functions/src/referral.ts:854 |
| default | `referralSpin` | callable | functions/src/referral_spin.ts:138 |
| default | `reportUserIdea` | callable | functions/src/user_idea_reports.ts:67 |
| default | `resendKeyHealthCron` | schedule | functions/src/email_delivery_watchdog.ts:361 |
| default | `resolveLearningV2WalletRewardReceipt` | callable | functions/src/learning_v2_wallet_reward_callable.ts:138 |
| default | `revenueCatPremiumReconcileMine` | callable | functions/src/revenuecat_reconcile.ts:389 |
| default | `revenueCatShardsWebhook` | http | functions/src/revenuecat_shards.ts:1295 |
| default | `siteStatsTrack` | http | functions/src/site_stats.ts:109 |
| default | `soc2ReadinessCollectorCron` | schedule | functions/src/soc2_readiness_collector.ts:240 |
| default | `spireFinalizeCron` | schedule | functions/src/spire_finalize_cron.ts:89 |
| default | `spireJoinRoom` | callable | functions/src/spire_groups.ts:194 |
| default | `spirePackWeeklyCron` | schedule | functions/src/spire_pack_build.ts:522 |
| default | `spireReportSteps` | callable | functions/src/spire_progress.ts:118 |
| default | `spireZoneWarningCron` | schedule | functions/src/spire_zone_warning_push.ts:310 |
| default | `stripeWebhook` | http | functions/src/web_checkout.ts:3113 |
| default | `submitClientReport` | callable | functions/src/client_reports.ts:645 |
| default | `submitExplainReport` | callable | functions/src/explain/explain_reports.ts:127 |
| default | `submitFeedbackEntry` | callable | functions/src/feedback_entries.ts:157 |
| default | `submitLearningV2ActivityReleasedCompletionV1` | callable | functions/src/learning_v2/activity_released_session_completion_callable_v1.ts:404 |
| default | `submitLearningV2CourseSessionCompletedV1` | callable | functions/src/learning_v2/course_session_completed_summary_callable_v1.ts:306 |
| default | `submitLearningV2RequiredSessionCompletion` | callable | functions/src/index.ts:292 |
| default | `submitSettingsPollVote` | callable | functions/src/settings_poll_vote.ts:53 |
| default | `submitShardSurvey` | callable | functions/src/shard_survey.ts:209 |
| default | `submitUserIdea` | callable | functions/src/user_ideas.ts:179 |
| default | `submitVipSurvey` | callable | functions/src/vip_survey.ts:134 |
| default | `submitWebsiteContact` | http | functions/src/website_contact.ts:155 |
| default | `supportInboxOnNewMail` | trigger | functions/src/support_inbox.ts:6712 |
| default | `supportOpsCron` | schedule | functions/src/index.ts:523 |
| default | `supportTelegramReplyJobOnCreate` | trigger | functions/src/support_inbox.ts:4946 |
| default | `telegramPremiumActivationNotifier` | trigger | functions/src/telegram_premium_bot.ts:1077 |
| default | `telegramPremiumWebhook` | http | functions/src/telegram_premium_bot.ts:1036 |
| default | `unlikeUserIdea` | callable | functions/src/user_idea_likes.ts:89 |
| default | `updateUserIdea` | callable | functions/src/user_ideas.ts:269 |
| default | `userNotificationsCleanupCron` | schedule | functions/src/user_notifications.ts:173 |
| default | `usersWriteRouter` | trigger | functions/src/users_write_router.ts:16 |
| default | `videoWatchRunesClaim` | callable | functions/src/video_watch_runes.ts:188 |
| default | `vipRevokeMine` | callable | functions/src/vip_revoke.ts:31 |
| default | `voiceMinuteWalletMine` | callable | functions/src/voice_minutes_api.ts:46 |
| default | `webActivationReminderCron` | schedule | functions/src/web_activation_reminders.ts:243 |
| default | `webCheckoutCreate` | http | functions/src/web_checkout.ts:2957 |
| default | `webLeadCapture` | http | functions/src/web_leads.ts:346 |
| default | `webLeadNudgeCron` | schedule | functions/src/web_leads.ts:425 |
| default | `webOrderStatus` | http | functions/src/web_checkout.ts:3437 |
| default | `webPrices` | http | functions/src/web_checkout.ts:3396 |
| default | `youtubeCatalogSyncCron` | schedule | functions/src/youtube_catalog.ts:411 |
| content | `adminConfirmV2OwnerEpisode` | callable | functions/src/content_factory/v2_owner_episode_confirmation_adapter_v1.ts:522 |
| content | `adminGetV2OwnerGeneratorSetupCatalog` | callable | functions/src/content_factory/v2_owner_generator_setup_catalog_v1.ts:524 |
| content | `adminImportV2OwnerEpisodeStage` | callable | functions/src/content_factory/v2_owner_episode_stage_repository_v1.ts:502 |
| content | `adminPublishAuthoredLearningV2Course` | callable | functions/src/content_factory/learning_v2_publish_authored_course_v1.ts:484 |
| content | `learningV2ActivityAuxiliarySessionGetV1` | callable | functions/src/content_factory/v2_activity_auxiliary_session_callable_v1.ts:280 |
| content | `learningV2ActivityReleasedSessionGetV1` | callable | functions/src/content_factory/v2_activity_released_session_callable_v1.ts:486 |
| content | `learningV2CourseActiveCatalogGetV1` | callable | functions/src/content_factory/v2_course_active_catalog_callable_v1.ts:238 |
| content | `learningV2CourseReleasedSessionGetV2` | callable | functions/src/content_factory/v2_course_released_session_callable_v2.ts:377 |
| content | `learningV2CourseReleasedSessionGetV3` | callable | functions/src/content_factory/v2_course_released_session_callable_v3.ts:338 |
| english-test | `adminEnglishTestAnalytics` | callable | functions-english-test/index.js:789 |
| english-test | `englishTestApi` | http | functions-english-test/index.js:525 |

## Список 2 — живые в облаке

Всего в облаке: **516**.

| Функция |
|---|
| `accountClaimMine` |
| `accountDeleteCredentialStatus` |
| `accountDeleteEnqueue` |
| `accountDeleteMine` |
| `accountDeleteRestoreMine` |
| `accountDeleteRetryCron` |
| `accountDeleteStatusMine` |
| `accountDeleteWorker` |
| `accountMergeOutboxRetryCron` |
| `accountMergeOutboxWorker` |
| `activationEmailRetryCron` |
| `adminActivateCourseRelease` |
| `adminActivateQuest` |
| `adminActivateTelegramPremiumOrder` |
| `adminAlertDailyDigestsCron` |
| `adminAlertDispatchOnCreate` |
| `adminAlertOnAdminAuditCreated` |
| `adminAlertOnAppMessageWritten` |
| `adminAlertOnAuthFailureSpike` |
| `adminAlertOnBanWrite` |
| `adminAlertOnCancelReasonCreated` |
| `adminAlertOnCancelSurvey` |
| `adminAlertOnCommunityPackPurchaseWritten` |
| `adminAlertOnCommunityPackReportCreated` |
| `adminAlertOnCommunitySubmissionCreated` |
| `adminAlertOnComplianceControlWritten` |
| `adminAlertOnConfigWritten` |
| `adminAlertOnContentReport` |
| `adminAlertOnCriticalError` |
| `adminAlertOnCronHeartbeat` |
| `adminAlertOnExplanationReportCreated` |
| `adminAlertOnFeedbackCreated` |
| `adminAlertOnGiftCertificateCreated` |
| `adminAlertOnJarvisPlanWritten` |
| `adminAlertOnPromoRedemptionCreated` |
| `adminAlertOnPushJobWritten` |
| `adminAlertOnReferralAttributionWrite` |
| `adminAlertOnRevenueCatReceipt` |
| `adminAlertOnSupportEmailCreated` |
| `adminAlertOnTelegramPremiumOrderWritten` |
| `adminAlertOnUgcRefund` |
| `adminAlertOnUserIdeaCreated` |
| `adminAlertOnUserIdeaReport` |
| `adminAlertOnUserReport` |
| `adminAlertOnWebPremiumOrderWritten` |
| `adminAlertOnWebsiteContactCreated` |
| `adminAlertRecoveryCron` |
| `adminApproveLearningV2CourseWave` |
| `adminArchiveQuest` |
| `adminArenaConfigGet` |
| `adminArenaConfigSet` |
| `adminArenaContentStatus` |
| `adminArenaContentValidate` |
| `adminAuditAccountDeleteCoverage` |
| `adminCancelGiftCertificateBatchOperation` |
| `adminCancelStripeSubscriptionRenewal` |
| `adminCleanupExpiredAppMessages` |
| `adminCommunityPackApplyQaFixes` |
| `adminCommunityPackApplyQaFixesToPublished` |
| `adminCommunityPackQaReview` |
| `adminCommunityPackTranslateLocales` |
| `adminConfirmV2OwnerEpisode` |
| `adminControlContentStage` |
| `adminCreateAppMessage` |
| `adminCreateAssetJob` |
| `adminCreateContentGenerationJob` |
| `adminCreateContentStage` |
| `adminCreateContentStageBulkPlan` |
| `adminCreateGiftCertificateBatch` |
| `adminCreatePlan` |
| `adminCreateV2GenerationPlan` |
| `adminDeactivateGlobalBroadcast` |
| `adminDeactivateGlobalBroadcasts` |
| `adminDeactivateVipSurveyCampaign` |
| `adminDecideUserIdea` |
| `adminDeleteAppMessage` |
| `adminDeleteDuplicateUser` |
| `adminDeleteGiftCertificate` |
| `adminDeleteQuest` |
| `adminDeleteShardSurvey` |
| `adminDeleteUserIdea` |
| `adminDraftIdeaDecision` |
| `adminDraftReportReply` |
| `adminEditContentStageArtifact` |
| `adminEmailBroadcast` |
| `adminEmailContactsBackfill` |
| `adminEnglishTestAnalytics` |
| `adminExportReportDocuments` |
| `adminExportUnresolvedReports` |
| `adminGenerateDailyDigest` |
| `adminGenerateDirectorDigestAudio` |
| `adminGetAdminConfigWorkspace` |
| `adminGetAlertDiagnostics` |
| `adminGetAnalyticsSnapshot` |
| `adminGetAnalyticsTrends` |
| `adminGetCoinExchangeCenter` |
| `adminGetComplianceOverview` |
| `adminGetContentFactoryJobDetail` |
| `adminGetContentFactoryRolloutMetrics` |
| `adminGetContentFactoryUnitPreview` |
| `adminGetContentFactoryWorkspace` |
| `adminGetContentStageCapabilities` |
| `adminGetCosmeticAssetArchive` |
| `adminGetDailyBriefing` |
| `adminGetDiagnosticsOverview` |
| `adminGetDirectorDigest` |
| `adminGetFeedbackStats` |
| `adminGetGiftCertificateBatchOperation` |
| `adminGetGiftCertificateDownload` |
| `adminGetHomeHintsCatalog` |
| `adminGetLearningV2CourseWorkspaceProjection` |
| `adminGetMaxVoiceOpsDashboard` |
| `adminGetOnboardingFunnel` |
| `adminGetPaywallAbWorkspace` |
| `adminGetPaywallVariantStats` |
| `adminGetPlan` |
| `adminGetProductCharter` |
| `adminGetReferralDashboard` |
| `adminGetRemoteConfigWorkspace` |
| `adminGetRevenueCatOverviewMetrics` |
| `adminGetUserProfile` |
| `adminGetV2OwnerGeneratorSetupCatalog` |
| `adminGetV2OwnerGeneratorWorkspace` |
| `adminGetVideoPhraseWorkspace` |
| `adminGetVideoStudioWorkspace` |
| `adminGetYoutubeCatalogWorkspace` |
| `adminGrantAccess` |
| `adminGrantReward` |
| `adminGrantVoiceMinutes` |
| `adminImportV2OwnerEpisodeStage` |
| `adminInspectTelegramPromoCode` |
| `adminLaunchVipSurveyCampaign` |
| `adminListAppMessages` |
| `adminListAssetJobs` |
| `adminListAuditLog` |
| `adminListContentFactoryJobs` |
| `adminListContentStageDependencies` |
| `adminListContentStages` |
| `adminListFeedbackEntries` |
| `adminListGiftCertificates` |
| `adminListGlobalBroadcasts` |
| `adminListMaxVoiceFeedback` |
| `adminListMistakeExplanationCache` |
| `adminListOpsLog` |
| `adminListPlans` |
| `adminListPromoCodes` |
| `adminListQuests` |
| `adminListReferrals` |
| `adminListReportQueue` |
| `adminListSafetyFlags` |
| `adminListShardRefunds` |
| `adminListUserIdeas` |
| `adminMarkSafetyFlagsHandled` |
| `adminMigrateLegacyAdminPremium` |
| `adminMonthlyDecisionPack` |
| `adminMoveLeagueUser` |
| `adminOpenDailyDigest` |
| `adminParseVideoPhraseDocument` |
| `adminPrepareV2OwnerEpisodeDraft` |
| `adminPreviewContentStage` |
| `adminPreviewLearningV2CourseWave` |
| `adminProductAnalytics` |
| `adminPublishAlertsConfig` |
| `adminPublishAuthoredLearningV2Course` |
| `adminPublishGlobalBroadcast` |
| `adminPublishHomeHints` |
| `adminPublishNavLayout` |
| `adminPublishPaywallAb` |
| `adminPublishRemoteConfig` |
| `adminPublishVideoPhrases` |
| `adminPublishYoutubeCatalogConfig` |
| `adminPushJobCreated` |
| `adminPushJobsCron` |
| `adminQueueAccountDeletion` |
| `adminQueueV2GenerationPlan` |
| `adminReferralHealth` |
| `adminRefreshYoutubeCatalog` |
| `adminRefundCommunityPackPurchase` |
| `adminRejectLearningV2CourseWave` |
| `adminRelinkProvider` |
| `adminRepairAuthLink` |
| `adminRepairPendingReferralPurchase` |
| `adminReplaceSyntheticGiftCertificate` |
| `adminReplyToReport` |
| `adminRequestUserMerge` |
| `adminResetLeaguePoints` |
| `adminResetUserProgress` |
| `adminResolveUserReport` |
| `adminRestoreUserIdea` |
| `adminResumePendingReferralPurchaseRepair` |
| `adminReviewContentStage` |
| `adminReviewCourseGeneration` |
| `adminRevokeReferralAttribution` |
| `adminRollbackCourseRelease` |
| `adminRunAssetJob` |
| `adminRunContentGenerationUnit` |
| `adminRunContentStage` |
| `adminRunV2E1Compilation` |
| `adminSaveProductCharter` |
| `adminSaveV2EpisodeDraft` |
| `adminSaveV2SeasonDraft` |
| `adminSaveVideoPhraseDraft` |
| `adminScrubGlobalBroadcastMetadata` |
| `adminSealCourseRelease` |
| `adminSearchUsers` |
| `adminSeedV2E1DemoSource` |
| `adminSendPersonalAppMessage` |
| `adminSendPreparedGiftCertificate` |
| `adminSetAppMessageActive` |
| `adminSetCoinExchangeRate` |
| `adminSetCosmeticAssetSaleStatus` |
| `adminSetIdeaSubmissionRestriction` |
| `adminSetReferralRouletteEmergencyStop` |
| `adminSetReferralRouletteEnabled` |
| `adminSetShardBalance` |
| `adminSetSpinWeights` |
| `adminSetUserBan` |
| `adminSetUserIdeaStatus` |
| `adminSpinLogs` |
| `adminSpinStats` |
| `adminSpirePackBuild` |
| `adminSpireTaskFlagAdd` |
| `adminSpireTaskFlagList` |
| `adminSpireTaskFlagRemove` |
| `adminSubscriptionAnalytics` |
| `adminSummarizeFeedback` |
| `adminSupportArchiveMessages` |
| `adminSupportCancelReply` |
| `adminSupportCancelReplyBatch` |
| `adminSupportConversation` |
| `adminSupportDispatchReply` |
| `adminSupportDispatchReplyBatch` |
| `adminSupportGenerateReply` |
| `adminSupportList` |
| `adminSupportPrepareReply` |
| `adminSupportPrepareReplyBatch` |
| `adminSupportPull` |
| `adminSupportResolveReplyDelivery` |
| `adminSupportSaveAutomation` |
| `adminSupportSaveDraft` |
| `adminSupportSaveInstructions` |
| `adminSupportSaveSignature` |
| `adminSupportSendReply` |
| `adminSupportSetStatus` |
| `adminTestAlerts` |
| `adminTranslateMessage` |
| `adminUpdateAppMessage` |
| `adminUpdateGiftCertificatePersonalization` |
| `adminUpdateGiftCertificateRecipient` |
| `adminUpdateReportStatus` |
| `adminUpdateUserProfileField` |
| `adminUserBriefs` |
| `adminVerifyGlobalBroadcastPrivacyReadiness` |
| `adminWarmInstanceGauge` |
| `adminWarnUser` |
| `adminWriteQuest` |
| `adminWriteShardSurvey` |
| `aiDialogBuyExtraReplies` |
| `aiDialogSyncPurchase` |
| `arenaExpansionHome` |
| `arenaGhostAccept` |
| `arenaGhostCreate` |
| `arenaGhostDecline` |
| `arenaGhostStatus` |
| `arenaMatchLabGet` |
| `arenaPartnerAccept` |
| `arenaPartnerClaimSpotlight` |
| `arenaPartnerInvite` |
| `arenaPartnerNudge` |
| `arenaPartnerPause` |
| `arenaPartnerPreferences` |
| `arenaPartnerRemove` |
| `arenaRivalAccept` |
| `arenaRivalLeave` |
| `arenaRivalMute` |
| `arenaRivalNext` |
| `arenaRivalPropose` |
| `arenaStarEquip` |
| `arenaStarPurchase` |
| `arenaStarStore` |
| `arenaTodayStart` |
| `arenaTodaySubmitAnswer` |
| `arenaTodaySubmitSpeedAttempt` |
| `arenaTodaySync` |
| `arenaV2CleanupHourly` |
| `arenaV2DevFriendBotCreate` |
| `arenaV2FindMatch` |
| `arenaV2Forfeit` |
| `arenaV2FriendsBoard` |
| `arenaV2Home` |
| `arenaV2InviteAccept` |
| `arenaV2InviteCancel` |
| `arenaV2InviteCreate` |
| `arenaV2InviteDecline` |
| `arenaV2InviteReady` |
| `arenaV2InviteStatus` |
| `arenaV2MatchAccept` |
| `arenaV2MatchDecline` |
| `arenaV2MatchFinish` |
| `arenaV2MatchPlan` |
| `arenaV2MatchSettle` |
| `arenaV2OnQueueWrite` |
| `arenaV2QueueCancel` |
| `arenaV2QuickBotFallback` |
| `arenaV2RankedBotFallback` |
| `arenaV2ReleaseStaleMatch` |
| `arenaV2SeasonClaim` |
| `arenaV2SubmitAnswer` |
| `arenaV2SubmitSpeedAttempt` |
| `arenaV2SyncMatch` |
| `authCleanInstallRecoveryDeliveryWorker` |
| `authCompleteRecoveryHandoff` |
| `authConfirmCleanInstallRecoveryCode` |
| `authConfirmRecoveryCode` |
| `authEnsureStableLink` |
| `authIssueRecoveryHandoffToken` |
| `authMergeStableAccounts` |
| `authRecoveryHint` |
| `authRequestCleanInstallRecoveryCode` |
| `authRequestRecoveryCode` |
| `authStampAnonOwnership` |
| `authorizeLearningV2CourseUnlock` |
| `claimReportReward` |
| `cleanupExpiredAppMessagesCron` |
| `collectiblesClaimDrop` |
| `communityAdminModeratePack` |
| `communityAuthorRemovePack` |
| `communityFetchPackCardsIfAccessible` |
| `communityListSellerInbox` |
| `communityMarkSellerInboxSeen` |
| `communityModerateSubmission` |
| `communityPurchasePack` |
| `communityRedeemPackGiftVoucher` |
| `communitySubmitPackForReview` |
| `communitySyncPackRuneSale` |
| `computeLeaderboardStatsCron` |
| `cosmeticAssetCatalogGet` |
| `dailyPhraseSetSaved` |
| `devRunesGrant` |
| `devShardsGrant` |
| `emailUnsubscribe` |
| `englishTestApi` |
| `exchangeCoinsForStars` |
| `explainChoice` |
| `explainMistake` |
| `explainPhrase` |
| `finalizeLearningV2AccessPurchase` |
| `finalizeLearningV2DelayedCandidate` |
| `flashcardPackGiftGrantGlobalBroadcast` |
| `flashcardPackGiftRedeem` |
| `flashcardPackGiftSyncState` |
| `friendClaimQuestReward` |
| `friendConsumeChainShield` |
| `friendEnsureMyCode` |
| `friendGetActiveQuest` |
| `friendLikeActivity` |
| `friendLookupUser` |
| `friendSendGift` |
| `friendThankGift` |
| `friendUnlikeActivity` |
| `friendsClaimWeeklyChest` |
| `friendsGetProfiles` |
| `friendsNudge` |
| `friendsTogetherClaimLevel` |
| `getActiveShardSurvey` |
| `getCoinExchangeHistory` |
| `getCoinExchangeQuote` |
| `getLearningV2AccountBinding` |
| `getPublicUserIdea` |
| `globalBroadcastClaim` |
| `globalBroadcastListActive` |
| `grantMistakeCorrectionReward` |
| `introFullAccessClaim` |
| `jarvisDailyBusinessHistoryCron` |
| `jarvisDailyDepartmentsCron` |
| `jarvisDeletePlan` |
| `jarvisGetAllDecisions` |
| `jarvisGetApprovalAudit` |
| `jarvisGetBusinessTier` |
| `jarvisGetCohortRetention` |
| `jarvisGetGrowthSnapshot` |
| `jarvisGetMoneySnapshot` |
| `jarvisGetPlans` |
| `jarvisGetQualitySnapshot` |
| `jarvisProductKnowledgeReviewCron` |
| `jarvisRunBusinessTierBackfill` |
| `jarvisSetPlanStatus` |
| `jarvisTelegramApprovalWebhook` |
| `leaderboardUpdateDailyAnalytics` |
| `leagueActivateGroupBoost` |
| `leagueChestClaim` |
| `leagueFinalizeCron` |
| `leagueJoinOrUpdateGroup` |
| `leagueResidentsTickCron` |
| `leagueSyncMyBoost` |
| `leagueUpdateMyMember` |
| `learningV2ActivityAuxiliarySessionGetV1` |
| `learningV2ActivityReleasedSessionGetV1` |
| `learningV2CourseActiveCatalogGetV1` |
| `learningV2CourseReleasedSessionGetV2` |
| `learningV2CourseReleasedSessionGetV3` |
| `learningV2LocalizedCourseShardBackgroundWorker` |
| `levelGiftActivatePackGift` |
| `levelGiftReserve` |
| `levelRewardSpinAcknowledge` |
| `levelRewardSpinClaim` |
| `levelRewardSpinDelivery` |
| `levelRewardSpinEnrollV1` |
| `levelRewardSpinStatus` |
| `levelSpinActivatePackGift` |
| `levelSpinStarGrant` |
| `likeUserIdea` |
| `listPublicUserIdeas` |
| `maxVoiceConfigAdmin` |
| `mistakeHubAdvice` |
| `mistakePracticeSyncEvents` |
| `nameCheckAvailability` |
| `nameGenerateAndReserve` |
| `nameReleaseMine` |
| `nameReserve` |
| `notifyOnFriendAccepted` |
| `notifyOnFriendRequestCreated` |
| `notifyOnPackCommentCreated` |
| `onAppMessagePollVoteWritten` |
| `onAppMessageReactionWritten` |
| `onAppMessageStateWritten` |
| `openAiBudgetDashboard` |
| `openAiDialogModelConfig` |
| `openAiDialogQuotaConfig` |
| `openAiJobsConfig` |
| `paypalOrderCapture` |
| `paypalOrderCreate` |
| `practiceRuneGrant` |
| `premiumDialogReview` |
| `premiumDialogSend` |
| `premiumDialogStream` |
| `premiumDialogTranslate` |
| `premiumExpiryCron` |
| `premiumExpiryReminderCron` |
| `profileCardUpgrade` |
| `progressMigrateSnapshot` |
| `progressSubmitEvent` |
| `promoCodeBatchUpsert` |
| `promoCodeDelete` |
| `promoCodeRedeem` |
| `promoCodeUpsert` |
| `publicProfileProjectMine` |
| `questClaimReward` |
| `questGetActive` |
| `questReportProgress` |
| `reEngagePushCron` |
| `recalcCoinExchangeRate` |
| `recordAgeConsentSnapshot` |
| `recordAiDialogConsent` |
| `recordAiExplainConsent` |
| `recordAiVoiceConsent` |
| `recordOnboardingFunnelEvent` |
| `recordVipSurveyReviewClick` |
| `referralApply` |
| `referralClaimSpin` |
| `referralClaimVipReward` |
| `referralDevGrantSpin` |
| `referralEnsureMyCode` |
| `referralListMyInvites` |
| `referralSpin` |
| `reportUserIdea` |
| `resendKeyHealthCron` |
| `resetWeeklyXpCron` |
| `resolveLearningV2CourseUnlockReceipt` |
| `resolveLearningV2WalletRewardReceipt` |
| `revenueCatPremiumReconcileMine` |
| `revenueCatShardsWebhook` |
| `seasonBuyPass` |
| `seasonClaimReward` |
| `seasonRedeemConsumable` |
| `seasonSendFriendShield` |
| `shardsApplyDelta` |
| `siteStatsTrack` |
| `soc2ReadinessCollectorCron` |
| `spirePackWeeklyCron` |
| `statsInsightsGenerate` |
| `stripeWebhook` |
| `submitClientReport` |
| `submitExplainReport` |
| `submitFeedbackEntry` |
| `submitLearningV2ActivityReleasedCompletionV1` |
| `submitLearningV2CourseSessionCompletedV1` |
| `submitLearningV2RequiredSessionCompletion` |
| `submitMaxVoiceFeedback` |
| `submitSettingsPollVote` |
| `submitShardSurvey` |
| `submitUserIdea` |
| `submitVipSurvey` |
| `submitWebsiteContact` |
| `supportInboxOnNewMail` |
| `supportOpsCron` |
| `supportTelegramReplyJobOnCreate` |
| `telegramPremiumActivationNotifier` |
| `telegramPremiumWebhook` |
| `tutorTextTopics` |
| `tutorTextTurn` |
| `unlikeUserIdea` |
| `updateUserIdea` |
| `userNotificationsCleanupCron` |
| `usersWriteRouter` |
| `videoWatchRunesClaim` |
| `vipRevokeMine` |
| `voiceMinuteWalletMine` |
| `webCheckoutCreate` |
| `webLeadCapture` |
| `webLeadNudgeCron` |
| `webOrderStatus` |
| `webPrices` |
| `weeklyReviewGenerate` |
| `welcomeGiftClaim` |
| `youtubeCatalogSyncCron` |

## Расхождения (НЕ удалены автоматически)

### В облаке, но нет в коде: 110

- `adminGetCoinExchangeCenter`
- `adminGetCosmeticAssetArchive`
- `adminGetMaxVoiceOpsDashboard`
- `adminListMaxVoiceFeedback`
- `adminMoveLeagueUser`
- `adminRefundCommunityPackPurchase`
- `adminResetLeaguePoints`
- `adminSetCoinExchangeRate`
- `adminSetCosmeticAssetSaleStatus`
- `adminSetShardBalance`
- `aiDialogSyncPurchase`
- `arenaExpansionHome`
- `arenaGhostAccept`
- `arenaGhostCreate`
- `arenaGhostDecline`
- `arenaGhostStatus`
- `arenaMatchLabGet`
- `arenaPartnerAccept`
- `arenaPartnerClaimSpotlight`
- `arenaPartnerInvite`
- `arenaPartnerNudge`
- `arenaPartnerPause`
- `arenaPartnerPreferences`
- `arenaPartnerRemove`
- `arenaRivalAccept`
- `arenaRivalLeave`
- `arenaRivalMute`
- `arenaRivalNext`
- `arenaRivalPropose`
- `arenaStarEquip`
- `arenaStarPurchase`
- `arenaStarStore`
- `arenaTodayStart`
- `arenaTodaySubmitAnswer`
- `arenaTodaySubmitSpeedAttempt`
- `arenaTodaySync`
- `arenaV2CleanupHourly`
- `arenaV2DevFriendBotCreate`
- `arenaV2FindMatch`
- `arenaV2Forfeit`
- `arenaV2FriendsBoard`
- `arenaV2Home`
- `arenaV2InviteAccept`
- `arenaV2InviteCancel`
- `arenaV2InviteCreate`
- `arenaV2InviteDecline`
- `arenaV2InviteReady`
- `arenaV2InviteStatus`
- `arenaV2MatchAccept`
- `arenaV2MatchDecline`
- `arenaV2MatchFinish`
- `arenaV2MatchPlan`
- `arenaV2MatchSettle`
- `arenaV2OnQueueWrite`
- `arenaV2QueueCancel`
- `arenaV2QuickBotFallback`
- `arenaV2RankedBotFallback`
- `arenaV2ReleaseStaleMatch`
- `arenaV2SeasonClaim`
- `arenaV2SubmitAnswer`
- `arenaV2SubmitSpeedAttempt`
- `arenaV2SyncMatch`
- `authorizeLearningV2CourseUnlock`
- `communityPurchasePack`
- `computeLeaderboardStatsCron`
- `cosmeticAssetCatalogGet`
- `devRunesGrant`
- `devShardsGrant`
- `exchangeCoinsForStars`
- `friendClaimQuestReward`
- `friendConsumeChainShield`
- `friendGetActiveQuest`
- `friendSendGift`
- `friendThankGift`
- `friendsClaimWeeklyChest`
- `getCoinExchangeHistory`
- `getCoinExchangeQuote`
- `leaderboardUpdateDailyAnalytics`
- `leagueActivateGroupBoost`
- `leagueChestClaim`
- `leagueFinalizeCron`
- `leagueJoinOrUpdateGroup`
- `leagueResidentsTickCron`
- `leagueSyncMyBoost`
- `leagueUpdateMyMember`
- `levelGiftActivatePackGift`
- `levelGiftReserve`
- `levelRewardSpinAcknowledge`
- `levelRewardSpinClaim`
- `levelRewardSpinDelivery`
- `levelRewardSpinEnrollV1`
- `levelRewardSpinStatus`
- `levelSpinActivatePackGift`
- `maxVoiceConfigAdmin`
- `profileCardUpgrade`
- `recalcCoinExchangeRate`
- `referralDevGrantSpin`
- `resetWeeklyXpCron`
- `resolveLearningV2CourseUnlockReceipt`
- `seasonBuyPass`
- `seasonClaimReward`
- `seasonRedeemConsumable`
- `seasonSendFriendShield`
- `shardsApplyDelta`
- `statsInsightsGenerate`
- `submitMaxVoiceFeedback`
- `tutorTextTopics`
- `tutorTextTurn`
- `weeklyReviewGenerate`
- `welcomeGiftClaim`

### В коде, но нет в облаке: 34

- `accountsV2DeletionStatus` (default, callable)
- `accountsV2SyncApply` (default, callable)
- `adminAlignVideoPhraseTranscript` (default, callable)
- `adminArenaPublicationActivate` (default, callable)
- `adminArenaPublicationRollback` (default, callable)
- `adminArenaPublicationStage` (default, callable)
- `adminArenaPublicationStatus` (default, callable)
- `adminBackfillVideoPacks` (default, callable)
- `adminCardTtsRequeuePack` (default, callable)
- `adminSpireConfigGet` (default, callable)
- `adminSpireConfigSet` (default, callable)
- `adminSpireTaskIncidentSetState` (default, callable)
- `adminSpireTaskIncidentStates` (default, callable)
- `adminSpireTaskReportList` (default, callable)
- `cardTtsPackWorker` (default, trigger)
- `customCardMilestoneNotify` (default, callable)
- `dailyPollVote` (default, callable)
- `dialogueV2Catalogue` (default, callable)
- `dialogueV2FreeformPreparedBotVoiceResolve` (default, callable)
- `dialogueV2FreeformSessionStart` (default, callable)
- `dialogueV2FreeformSessionTurn` (default, callable)
- `dialogueV2MemoryClear` (default, callable)
- `dialogueV2MemoryResume` (default, callable)
- `dialogueV2MemoryView` (default, callable)
- `dialogueV2SessionComplete` (default, callable)
- `dialogueV2SessionStart` (default, callable)
- `dialogueV2TextTurn` (default, callable)
- `giftsToCoinsMigrationReport` (default, callable)
- `profileCardBioSetMine` (default, callable)
- `spireFinalizeCron` (default, schedule)
- `spireJoinRoom` (default, callable)
- `spireReportSteps` (default, callable)
- `spireZoneWarningCron` (default, schedule)
- `webActivationReminderCron` (default, schedule)

