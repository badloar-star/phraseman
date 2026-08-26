// ═══════════════════════════════════════════════════════════════════════════
// functions-admin/index.ts — отдельная кодбаза админки, Джарвиса и владельческих
// инструментов.
//
// зачем (владелец, аудит расходов 2026-08-24): Cloud Functions gen2 при холодном
// старте ЛЮБОГО контейнера грузит index.js своей кодбазы ЦЕЛИКОМ. Измерено: в
// основной кодбазе это 611 файлов и 8.92 МБ JavaScript — и они загружались даже
// когда пользователь дёргал крошечную функцию вроде submitSettingsPollVote.
// Время холодного старта тарифицируется, поэтому лишний вес графа — это прямые
// деньги при каждом старте, а не только задержка.
//
// Из 456 задеплоенных функций 216 (почти половина) — админские: их открывает
// ОДИН человек несколько раз в день, а грузились они у КАЖДОГО пользователя.
// Вынос сюда убирает 219 файлов из графа основной кодбазы: 611 → 392 файла,
// 8.92 → 6.34 МБ. Пользовательские функции стартуют быстрее и дешевле.
//
// ВАЖНО: исходники НЕ дублируются. tsconfig с rootDir ".." компилирует те же
// файлы functions/src/*, что и основная кодбаза, — правка делается в одном
// месте и попадает в обе сборки. Тот же приём уже работает в functions-max
// (голосовой учитель, 2026-08-23).
//
// Деплой: firebase deploy --only functions:admin
// ═══════════════════════════════════════════════════════════════════════════

export {
  adminGrantAccess,
  adminSetUserBan,
} from '../functions/src/admin_access_controls';
export { adminQueueAccountDeletion } from '../functions/src/admin_account_delete';
export {
  adminAlertOnUserReport,
  adminAlertOnCriticalError,
  adminAlertOnAuthFailureSpike,
  adminAlertOnContentReport,
  adminAlertContentReportDigest,
  adminAlertOnCancelSurvey,
  adminAlertOnUgcRefund,
  adminAlertOnConfigWritten,
} from '../functions/src/admin_alerts';
export { adminGetAnalyticsSnapshot } from '../functions/src/admin_analytics';
export { adminGetAnalyticsTrends } from '../functions/src/admin_analytics_trends';
export {
  adminListAppMessages,
  adminCreateAppMessage,
  adminSetAppMessageActive,
  adminUpdateAppMessage,
  adminDeleteAppMessage,
  adminCleanupExpiredAppMessages,
  adminSendPersonalAppMessage,
  adminLaunchVipSurveyCampaign,
  adminDeactivateVipSurveyCampaign,
} from '../functions/src/admin_app_messages';
export {
  adminArenaConfigGet,
  adminArenaConfigSet,
} from '../functions/src/admin_arena_config';
export {
  adminListAssetJobs,
  adminCreateAssetJob,
  adminRunAssetJob,
} from '../functions/src/admin_asset_studio';
export { adminListAuditLog } from '../functions/src/admin_audit_log';
export {
  adminRepairAuthLink,
  adminRelinkProvider,
} from '../functions/src/admin_auth_repair';
export {
  adminGetComplianceOverview,
  adminListSafetyFlags,
  adminMarkSafetyFlagsHandled,
} from '../functions/src/admin_compliance';
export {
  adminGetAdminConfigWorkspace,
  adminPublishNavLayout,
  adminPublishAlertsConfig,
  adminTestAlerts,
} from '../functions/src/admin_config_controls';
export {
  adminCreateContentGenerationJob,
  adminListContentFactoryJobs,
} from '../functions/src/admin_content_factory';
export {
  adminGetContentFactoryJobDetail,
  adminGetContentFactoryUnitPreview,
  adminGetContentFactoryWorkspace,
  adminGetContentFactoryRolloutMetrics,
} from '../functions/src/admin_content_factory_read';
export {
  adminReviewCourseGeneration,
  adminSealCourseRelease,
} from '../functions/src/admin_content_release';
export { adminCreateContentStageBulkPlan } from '../functions/src/admin_content_stage_bulk';
export { adminEditContentStageArtifact } from '../functions/src/admin_content_stage_edits';
export {
  adminCreateContentStage,
  adminControlContentStage,
  adminListContentStages,
  adminGetLearningV2CourseWorkspaceProjection,
  adminListContentStageDependencies,
  adminGetContentStageCapabilities,
  adminPreviewContentStage,
  adminReviewContentStage,
} from '../functions/src/admin_content_stages';
export {
  adminSaveV2EpisodeDraft,
  adminSaveV2SeasonDraft,
} from '../functions/src/admin_content_studio_callables';
export {
  adminGenerateDailyDigest,
  adminOpenDailyDigest,
  adminGetDailyBriefing,
} from '../functions/src/admin_daily_digest';
export { adminGetDirectorDigest } from '../functions/src/admin_director_digest';
export { adminGenerateDirectorDigestAudio } from '../functions/src/admin_director_digest_audio';
export {
  adminEmailBroadcast,
  adminEmailContactsBackfill,
} from '../functions/src/admin_email';
export {
  adminListGlobalBroadcasts,
  adminPublishGlobalBroadcast,
  adminDeactivateGlobalBroadcast,
  adminScrubGlobalBroadcastMetadata,
  adminVerifyGlobalBroadcastPrivacyReadiness,
  adminDeactivateGlobalBroadcasts,
} from '../functions/src/admin_global_broadcast';
export {
  adminGrantReward,
  adminSetShardBalance,
} from '../functions/src/admin_grant';
export {
  adminResetLeaguePoints,
  adminMoveLeagueUser,
} from '../functions/src/admin_league_controls';
export { adminMonthlyDecisionPack } from '../functions/src/admin_monthly_decision_pack';
export { adminListOpsLog } from '../functions/src/admin_ops_log';
export {
  adminGetPaywallAbWorkspace,
  adminPublishPaywallAb,
} from '../functions/src/admin_paywall_ab';
export { adminGetPaywallVariantStats } from '../functions/src/admin_paywall_variant_stats';
export {
  adminCreatePlan,
  adminGetPlan,
  adminListPlans,
} from '../functions/src/admin_plans';
export { adminProductAnalytics } from '../functions/src/admin_product_analytics';
export {
  adminGetProductCharter,
  adminSaveProductCharter,
} from '../functions/src/admin_product_charter';
export {
  adminPushJobCreated,
  adminPushJobsCron,
} from '../functions/src/admin_push_jobs';
export {
  adminRepairPendingReferralPurchase,
  adminResumePendingReferralPurchaseRepair,
} from '../functions/src/admin_referral_purchase_repair';
export {
  adminRevokeReferralAttribution,
  adminListReferrals,
  adminGetReferralDashboard,
  adminSpinStats,
  adminSpinLogs,
  adminSetSpinWeights,
  adminSetReferralRouletteEnabled,
  adminSetReferralRouletteEmergencyStop,
  adminReferralHealth,
} from '../functions/src/admin_referrals';
export {
  adminGetRemoteConfigWorkspace,
  adminPublishRemoteConfig,
} from '../functions/src/admin_remote_config';
export {
  adminExportReportDocuments,
  adminExportUnresolvedReports,
  adminListReportQueue,
  adminUpdateReportStatus,
} from '../functions/src/admin_reports_center';
export { adminGetRevenueCatOverviewMetrics } from '../functions/src/admin_revenuecat_overview';
export { adminListShardRefunds } from '../functions/src/admin_shard_refunds';
export { adminSubscriptionAnalytics } from '../functions/src/admin_subscription_analytics';
export {
  adminGenerateTournamentAi,
  adminRegenerateTournamentTask,
  adminBulkTournamentFolder,
} from '../functions/src/admin_tournament_full';
export {
  adminGenerateTournamentTasksAi,
  adminListTournamentTasks,
  adminMutateTournamentTasks,
  adminEditTournamentTask,
  adminFillTournamentPool,
  adminGetTournamentModeMix,
  adminSetTournamentModeMix,
  adminGenerateTournamentAudioTasksAi,
  adminTournamentPoolStats,
  adminGetTournamentSchedule,
  adminSetTournamentSchedule,
  adminSetTournamentCurated,
  adminGetTournamentCurated,
} from '../functions/src/admin_tournament_tasks';
export { adminTranslateMessage } from '../functions/src/admin_translate';
export { adminUserBriefs } from '../functions/src/admin_user_briefs';
export {
  adminDeleteDuplicateUser,
  adminMigrateLegacyAdminPremium,
  adminRequestUserMerge,
  adminResetUserProgress,
  adminResolveUserReport,
  adminUpdateUserProfileField,
  adminWarnUser,
} from '../functions/src/admin_user_operations';
export {
  adminSearchUsers,
  adminGetUserProfile,
} from '../functions/src/admin_user_profile';
export {
  adminCreateV2GenerationPlan,
  adminQueueV2GenerationPlan,
} from '../functions/src/admin_v2_generation';
export {
  adminSetCoinExchangeRate,
  adminGetCoinExchangeCenter,
} from '../functions/src/coin_exchange';
export { adminRefundCommunityPackPurchase } from '../functions/src/community_packs';
export { adminRunContentGenerationUnit } from '../functions/src/content_factory_worker';
export {
  adminPreviewLearningV2CourseWave,
  adminApproveLearningV2CourseWave,
  adminRejectLearningV2CourseWave,
} from '../functions/src/content_factory/learning_v2_course_shard_background';
export {
  adminSeedV2E1DemoSource,
  adminRunV2E1Compilation,
} from '../functions/src/content_factory/v2_e1_compilation_worker';
export {
  adminGetV2OwnerGeneratorWorkspace,
  adminPrepareV2OwnerEpisodeDraft,
} from '../functions/src/content_factory/v2_owner_generator_workspace_v1';
export { adminRunContentStage } from '../functions/src/content_stage_worker';
export {
  adminGetCosmeticAssetArchive,
  adminSetCosmeticAssetSaleStatus,
} from '../functions/src/cosmetic_asset_archive';
export {
  jarvisGetQualitySnapshot,
  jarvisGetMoneySnapshot,
  jarvisGetGrowthSnapshot,
  jarvisGetAllDecisions,
  jarvisGetApprovalAudit,
  jarvisGetCohortRetention,
  jarvisGetPlans,
  jarvisSetPlanStatus,
  jarvisDeletePlan,
  jarvisGetBusinessTier,
  jarvisRunBusinessTierBackfill,
  jarvisDailyDepartmentsCron,
  jarvisDailyBusinessHistoryCron,
  jarvisProductKnowledgeReviewCron,
  jarvisTelegramApprovalWebhook,
} from '../functions/src/jarvis';
export {
  adminActivateCourseRelease,
  adminRollbackCourseRelease,
} from '../functions/src/language_release';
export { adminListMaxVoiceFeedback } from '../functions/src/max_voice_feedback';
export { adminGetMaxVoiceOpsDashboard } from '../functions/src/max_voice_ops_dashboard';
export { adminGetOnboardingFunnel } from '../functions/src/onboarding_funnel';
export { adminListPromoCodes } from '../functions/src/promo_codes';
export {
  adminReplyToReport,
  adminDraftReportReply,
} from '../functions/src/report_replies';
export {
  adminWriteShardSurvey,
  adminDeleteShardSurvey,
} from '../functions/src/shard_survey';
export {
  adminSupportPull,
  adminSupportList,
  adminSupportConversation,
  adminSupportGenerateReply,
  adminSupportPrepareReply,
  adminSupportDispatchReply,
  adminSupportSendReply,
  adminSupportCancelReply,
  adminSupportPrepareReplyBatch,
  adminSupportDispatchReplyBatch,
  adminSupportCancelReplyBatch,
  adminSupportResolveReplyDelivery,
  adminSupportSaveSignature,
  adminSupportSaveAutomation,
  adminSupportSaveInstructions,
  adminSupportSaveDraft,
  adminSupportSetStatus,
  adminSupportArchiveMessages,
} from '../functions/src/support_inbox';
export {
  adminActivateTelegramPremiumOrder,
  adminInspectTelegramPromoCode,
} from '../functions/src/telegram_premium_admin';
export { adminSeedBotProfiles } from '../functions/src/tournament_bots';
export {
  adminPayoutTournamentWeeklyBank,
  adminSetTournamentEconomy,
  adminGetTournamentEconomy,
} from '../functions/src/tournament_weekly_payout';
export {
  adminListUserIdeas,
  adminDecideUserIdea,
  adminDraftIdeaDecision,
} from '../functions/src/user_ideas';
export { adminWarmInstanceGauge } from '../functions/src/warm_instance_gauge';
export {
  adminCreateGiftCertificateBatch,
  adminGetGiftCertificateBatchOperation,
  adminCancelGiftCertificateBatchOperation,
  adminListGiftCertificates,
  adminDeleteGiftCertificate,
  adminGetGiftCertificateDownload,
  adminUpdateGiftCertificateRecipient,
  adminUpdateGiftCertificatePersonalization,
  adminReplaceSyntheticGiftCertificate,
  adminSendPreparedGiftCertificate,
} from '../functions/src/web_checkout';
export {
  adminGetYoutubeCatalogWorkspace,
  adminPublishYoutubeCatalogConfig,
  adminRefreshYoutubeCatalog,
} from '../functions/src/youtube_catalog';
