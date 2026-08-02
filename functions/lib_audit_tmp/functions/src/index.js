"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteDuplicateUser = exports.adminSetUserBan = exports.adminGrantAccess = exports.adminSetShardBalance = exports.adminGrantReward = exports.adminDraftReportReply = exports.claimReportReward = exports.adminReplyToReport = exports.adminSupportSetStatus = exports.adminSupportSaveSignature = exports.adminSupportResolveReplyDelivery = exports.adminSupportCancelReplyBatch = exports.adminSupportDispatchReplyBatch = exports.adminSupportPrepareReplyBatch = exports.adminSupportCancelReply = exports.adminSupportSendReply = exports.adminSupportDispatchReply = exports.adminSupportPrepareReply = exports.adminSupportGenerateReply = exports.adminSupportList = exports.adminSupportPull = exports.adminRunAssetJob = exports.adminCreateAssetJob = exports.adminListAssetJobs = exports.adminGetDailyBriefing = exports.adminOpenDailyDigest = exports.adminGenerateDailyDigest = exports.friendSendGift = exports.premiumExpiryCron = exports.syncFriendActivityMirrorCron = exports.communityMarkSellerInboxSeen = exports.communityListSellerInbox = exports.levelGiftActivatePackGift = exports.levelGiftReserve = exports.flashcardPackGiftSyncState = exports.flashcardPackGiftGrantGlobalBroadcast = exports.flashcardPackGiftRedeem = exports.communityRedeemPackGiftVoucher = exports.adminRefundCommunityPackPurchase = exports.communityPurchasePack = exports.communityFetchPackCardsIfAccessible = exports.communityAdminModeratePack = exports.communityModerateSubmission = exports.communitySubmitPackForReview = exports.gmailSupportPullCron = exports.premiumExpiryReminderCron = exports.reEngagePushCron = exports.cleanupExpiredAppMessagesCron = exports.resetWeeklyXpCron = exports.computeLeaderboardStatsCron = void 0;
exports.agentManagerInitializeRoster = exports.agentManagerCreateTask = exports.agentManagerCreateInboxTask = exports.agentOfficeTelegramWebhook = exports.agentOfficeSetKillSwitch = exports.agentOfficeListTasks = exports.agentOfficeListRecommendations = exports.agentOfficeListCases = exports.agentOfficeListAuditEvents = exports.agentOfficeGetControl = exports.agentOfficeGetCase = exports.agentOfficeGetAggregateHealth = exports.agentOfficeDecideRecommendation = exports.adminListPlans = exports.adminGetPlan = exports.adminCreatePlan = exports.adminListOpsLog = exports.adminListAuditLog = exports.adminUpdateReportStatus = exports.adminListReportQueue = exports.adminExportUnresolvedReports = exports.adminExportReportDocuments = exports.adminGetUserProfile = exports.adminSearchUsers = exports.adminGenerateDirectorDigestAudio = exports.adminGetDirectorDigest = exports.adminGetAnalyticsTrends = exports.adminGetRevenueCatOverviewMetrics = exports.adminGetAnalyticsSnapshot = exports.adminMonthlyDecisionPack = exports.adminSubscriptionAnalytics = exports.adminProductAnalytics = exports.openAiBudgetDashboard = exports.adminListPromoCodes = exports.promoCodeDelete = exports.promoCodeBatchUpsert = exports.promoCodeUpsert = exports.promoCodeRedeem = exports.adminRelinkProvider = exports.adminRepairAuthLink = exports.adminMarkSafetyFlagsHandled = exports.adminListSafetyFlags = exports.adminGetComplianceOverview = exports.adminQueueAccountDeletion = exports.adminWarnUser = exports.adminUpdateUserProfileField = exports.adminResolveUserReport = exports.adminResetUserProgress = exports.adminRequestUserMerge = exports.adminMigrateLegacyAdminPremium = void 0;
exports.adminRunContentStage = exports.adminEditContentStageArtifact = exports.adminCreateContentStageBulkPlan = exports.adminReviewContentStage = exports.adminPreviewContentStage = exports.adminGetContentStageCapabilities = exports.adminListContentStageDependencies = exports.adminListContentStages = exports.adminControlContentStage = exports.adminCreateContentStage = exports.adminListContentFactoryJobs = exports.adminCreateContentGenerationJob = exports.adminDeactivateGlobalBroadcasts = exports.adminPublishGlobalBroadcast = exports.adminListGlobalBroadcasts = exports.adminMoveLeagueUser = exports.adminResetLeaguePoints = exports.adminTestAlerts = exports.adminPublishAlertsConfig = exports.adminPublishNavLayout = exports.adminGetAdminConfigWorkspace = exports.adminDeactivateVipSurveyCampaign = exports.adminLaunchVipSurveyCampaign = exports.adminSendPersonalAppMessage = exports.adminCleanupExpiredAppMessages = exports.adminDeleteAppMessage = exports.adminUpdateAppMessage = exports.adminSetAppMessageActive = exports.adminCreateAppMessage = exports.adminListAppMessages = exports.adminGetPaywallVariantStats = exports.adminPublishPaywallAb = exports.adminGetPaywallAbWorkspace = exports.adminPublishRemoteConfig = exports.adminGetRemoteConfigWorkspace = exports.jarvisGetQualitySnapshot = exports.agentManagerTransitionTask = exports.agentManagerTelegramPublishApproval = exports.agentManagerRunReportTriageWorker = exports.agentManagerRunBoundedExecutionWorker = exports.agentManagerRunAnalyticsWorker = exports.agentManagerLocalRunnerSubmit = exports.agentManagerLocalRunnerRevokeCapability = exports.agentManagerLocalRunnerExchangePairing = exports.agentManagerLocalRunnerCreatePairing = exports.agentManagerLocalRunnerClaim = exports.agentManagerListTasks = exports.agentManagerListRunbooks = exports.agentManagerListAgents = exports.agentManagerIssueExecutionJob = void 0;
exports.tournamentLeave = exports.tournamentJoin = exports.tournamentCreateRooms = exports.webLeadNudgeCron = exports.webLeadCapture = exports.adminSendPreparedGiftCertificate = exports.adminReplaceSyntheticGiftCertificate = exports.adminUpdateGiftCertificatePersonalization = exports.adminUpdateGiftCertificateRecipient = exports.adminGetGiftCertificateDownload = exports.adminDeleteGiftCertificate = exports.adminListGiftCertificates = exports.adminCreateGiftCertificateBatch = exports.webPrices = exports.webOrderStatus = exports.paypalOrderCapture = exports.paypalOrderCreate = exports.stripeWebhook = exports.webCheckoutCreate = exports.adminPushJobsCron = exports.adminPushJobCreated = exports.revenueCatPremiumReconcileMine = exports.revenueCatShardsWebhook = exports.recordAgeConsentSnapshot = exports.adminGetOnboardingFunnel = exports.recordOnboardingFunnelEvent = exports.siteStatsTrack = exports.submitWebsiteContact = exports.dailyPhraseSetSaved = exports.emailUnsubscribe = exports.adminEmailContactsBackfill = exports.adminEmailBroadcast = exports.submitSettingsPollVote = exports.adminTranslateMessage = exports.openAiJobsConfig = exports.openAiDialogQuotaConfig = exports.openAiDialogModelConfig = exports.adminRollbackCourseRelease = exports.adminActivateCourseRelease = exports.adminSealCourseRelease = exports.adminReviewCourseGeneration = exports.adminSaveV2SeasonDraft = exports.adminSaveV2EpisodeDraft = exports.CONTENT_FACTORY_OPENAI_API_KEY = exports.adminRunContentGenerationUnit = exports.adminGetContentFactoryRolloutMetrics = exports.adminGetContentFactoryWorkspace = exports.adminGetContentFactoryUnitPreview = exports.adminGetContentFactoryJobDetail = exports.CONTENT_STAGE_OPENAI_API_KEY = void 0;
exports.adminGetReferralDashboard = exports.adminListReferrals = exports.adminRevokeReferralAttribution = exports.introFullAccessClaim = exports.friendsGetProfiles = exports.feedPruneCron = exports.feedFanoutOnMyEvent = exports.referralDevGrantSpin = exports.referralClaimSpin = exports.referralSpin = exports.finalizeLearningV2AccessPurchase = exports.finalizeLearningV2DelayedCandidate = exports.adminRestoreArenaPoolQuestion = exports.adminRemoveArenaPoolQuestion = exports.adminPublishArenaQuestionBatch = exports.adminListArenaQuestionPool = exports.tournamentWeeklyBankInfo = exports.adminGetTournamentEconomy = exports.adminSetTournamentEconomy = exports.adminPayoutTournamentWeeklyBank = exports.tournamentWeeklyBankCron = exports.adminBulkTournamentFolder = exports.adminRegenerateTournamentTask = exports.adminGenerateTournamentAi = exports.adminGetTournamentCurated = exports.adminSetTournamentCurated = exports.adminSetTournamentSchedule = exports.adminGetTournamentSchedule = exports.adminTournamentPoolStats = exports.adminGenerateTournamentAudioTasksAi = exports.adminSetTournamentModeMix = exports.adminGetTournamentModeMix = exports.adminFillTournamentPool = exports.adminEditTournamentTask = exports.adminMutateTournamentTasks = exports.adminListTournamentTasks = exports.adminGenerateTournamentTasksAi = exports.adminGenerateTournamentTasks = exports.adminSeedBotProfiles = exports.tournamentStartNow = exports.tournamentClaimReward = exports.tournamentFinalize = exports.tournamentSubmitAnswers = exports.tournamentSubmitTaskAnswer = exports.tournamentSubmitSpeedMatchAttempt = exports.tournamentRoundReview = exports.tournamentAdvanceRound = exports.tournamentAdvanceRooms = exports.tournamentFillBots = exports.tournamentForfeit = void 0;
exports.adminRunV2E1Compilation = exports.adminSeedV2E1DemoSource = exports.adminQueueV2GenerationPlan = exports.adminCreateV2GenerationPlan = exports.adminReferralHealth = exports.adminSetReferralRouletteEmergencyStop = exports.adminSetReferralRouletteEnabled = exports.adminSetSpinWeights = exports.adminSpinLogs = exports.adminSpinStats = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v2"));
const quiz_arena_decommission_1 = require("./quiz_arena_decommission");
const help_board_decommission_1 = require("./help_board_decommission");
admin.initializeApp();
// These imports must come AFTER initializeApp() — use require to control order
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resetWeeklyXp } = require('./reset_weekly_xp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { computeLeaderboardStats } = require('./compute_leaderboard_stats');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runReEngagePush } = require('./re_engage_push');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runPremiumExpiryReminder } = require('./premium_expiry_reminder');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runSupportInboxPullCron, GMAIL_SUPPORT_APP_PASSWORD } = require('./support_inbox');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueJoinOrUpdateGroup, leagueUpdateMyMember, leagueSyncMyBoost, leagueActivateGroupBoost } = require('./league_groups');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authEnsureStableLink, authStampAnonOwnership, authRecoveryHint } = require('./auth_identity');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authRequestRecoveryCode, authConfirmRecoveryCode, authRequestCleanInstallRecoveryCode, authConfirmCleanInstallRecoveryCode, authCleanInstallRecoveryDeliveryWorker, authIssueRecoveryHandoffToken, authCompleteRecoveryHandoff, } = require('./auth_recovery');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authMergeStableAccounts, accountMergeOutboxWorker, accountMergeOutboxRetryCron, } = require('./auth_merge');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { accountDeleteMine, accountDeleteEnqueue } = require('./account_delete');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { accountDeleteWorker, accountDeleteRetryCron } = require('./account_delete_worker');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leaderboardUpdateDailyAnalytics, nameCheckAvailability, nameGenerateAndReserve, nameReserve, nameReleaseMine, } = require('./leaderboard');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueChestClaim } = require('./league_chest');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendEnsureMyCode } = require('./friend_codes');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendLookupUser } = require('./friend_lookup');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendLikeActivity, friendUnlikeActivity } = require('./friend_activity_likes');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendSendGift, friendThankGift, friendGetActiveQuest, friendClaimQuestReward, } = require('./friend_gifts');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cleanupExpiredAppMessages, onAppMessageReactionWritten, onAppMessagePollVoteWritten, onAppMessageStateWritten } = require('./app_messages');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitVipSurvey, recordVipSurveyReviewClick } = require('./vip_survey');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitClientReport } = require('./client_reports');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { telegramPremiumWebhook, telegramPremiumActivationNotifier } = require('./telegram_premium_bot');
// Legacy paid pronunciation-scoring callable удалён: 0 клиентских вызовов, OpenAI-эндпоинт
// без App Check был доступен любому. Оценка произношения теперь on-device. (B1 audit)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { referralEnsureMyCode, referralApply, referralClaimVipReward, referralListMyInvites, } = require('./referral');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { premiumDialogSend, premiumDialogTranslate } = require('./premium_dialog');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { premiumDialogReview } = require('./premium_dialog_review');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { weeklyReviewGenerate } = require('./weekly_review');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { statsInsightsGenerate } = require('./stats_insights');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { explainPhrase } = require('./explain_phrase');
const { explainChoice } = require('./explain_choice');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { explainMistake } = require('./mistake_explain');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitExplainReport } = require('./explain/explain_reports');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { vipRevokeMine } = require('./vip_revoke');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { collectiblesClaimDrop } = require('./collectibles');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dailyTasksAllShardsClaim } = require('./daily_tasks_shards');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitShardSurvey, getActiveShardSurvey, adminWriteShardSurvey, adminDeleteShardSurvey } = require('./shard_survey');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { shardsApplyDelta } = require('./shards_apply_delta');
// eslint-disable-next-line @typescript-eslint/no-var-requires
// зачем: железное правило владельца — дев-начисление ВСЕГДА идёт на сервер и
// работает для ЛЮБОГО аккаунта. В проде путь мёртв: серверный рубильник
// remote_config/app.numbers.dev_shards_grant_enabled по умолчанию выключен.
const { devShardsGrant } = require('./dev_shards_grant');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getCoinExchangeQuote, getCoinExchangeHistory, exchangeCoinsForStars, adminSetCoinExchangeRate, recalcCoinExchangeRate, adminGetCoinExchangeCenter, } = require('./coin_exchange');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { profileCardUpgrade } = require('./profile_card_upgrade');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitUserIdea, adminListUserIdeas, adminDecideUserIdea, adminDraftIdeaDecision } = require('./user_ideas');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueFinalizeCron } = require('./league_finalize_cron');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { notifyOnFriendRequestCreated, notifyOnFriendAccepted, userNotificationsCleanupCron, } = require('./user_notifications');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { progressSubmitEvent, progressMigrateSnapshot } = require('./progress_events');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { adminAlertOnUserReport, adminAlertOnCriticalError, adminAlertOnAuthFailureSpike, adminAlertOnContentReport, adminAlertContentReportDigest, adminAlertOnCancelSurvey, adminAlertOnUgcRefund, adminAlertOnConfigWritten, } = require('./admin_alerts');
exports.leagueJoinOrUpdateGroup = leagueJoinOrUpdateGroup;
exports.leagueUpdateMyMember = leagueUpdateMyMember;
exports.leagueSyncMyBoost = leagueSyncMyBoost;
exports.leagueActivateGroupBoost = leagueActivateGroupBoost;
exports.authEnsureStableLink = authEnsureStableLink;
exports.authStampAnonOwnership = authStampAnonOwnership;
exports.authRecoveryHint = authRecoveryHint;
exports.authRequestRecoveryCode = authRequestRecoveryCode;
exports.authConfirmRecoveryCode = authConfirmRecoveryCode;
exports.authRequestCleanInstallRecoveryCode = authRequestCleanInstallRecoveryCode;
exports.authConfirmCleanInstallRecoveryCode = authConfirmCleanInstallRecoveryCode;
exports.authCleanInstallRecoveryDeliveryWorker = authCleanInstallRecoveryDeliveryWorker;
exports.authIssueRecoveryHandoffToken = authIssueRecoveryHandoffToken;
exports.authCompleteRecoveryHandoff = authCompleteRecoveryHandoff;
exports.authMergeStableAccounts = authMergeStableAccounts;
exports.accountMergeOutboxWorker = accountMergeOutboxWorker;
exports.accountMergeOutboxRetryCron = accountMergeOutboxRetryCron;
exports.accountDeleteMine = accountDeleteMine;
exports.accountDeleteEnqueue = accountDeleteEnqueue;
exports.accountDeleteWorker = accountDeleteWorker;
exports.accountDeleteRetryCron = accountDeleteRetryCron;
exports.leaderboardUpdateDailyAnalytics = leaderboardUpdateDailyAnalytics;
exports.nameCheckAvailability = nameCheckAvailability;
exports.nameGenerateAndReserve = nameGenerateAndReserve;
exports.nameReserve = nameReserve;
exports.nameReleaseMine = nameReleaseMine;
exports.leagueChestClaim = leagueChestClaim;
Object.assign(exports, quiz_arena_decommission_1.QUIZ_ARENA_DECOMMISSIONED_EXPORTS);
exports.arenaSeasonRolloverCron = quiz_arena_decommission_1.arenaSeasonRolloverCronDisabled;
exports.arenaHillDailyRewardCron = quiz_arena_decommission_1.arenaHillDailyRewardCronDisabled;
exports.onMatchmakingWrite = quiz_arena_decommission_1.onMatchmakingWriteDisabled;
exports.matchmakingCron = quiz_arena_decommission_1.matchmakingCronDisabled;
exports.onArenaRoomMatched = quiz_arena_decommission_1.onArenaRoomMatchedDisabled;
exports.onSessionGetReady = quiz_arena_decommission_1.onSessionGetReadyDisabled;
exports.onSessionPlayerLobby = quiz_arena_decommission_1.onSessionPlayerLobbyDisabled;
exports.onSessionCountdown = quiz_arena_decommission_1.onSessionCountdownDisabled;
exports.onAnswerSubmitted = quiz_arena_decommission_1.onAnswerSubmittedDisabled;
exports.onArenaSessionFinished = quiz_arena_decommission_1.onArenaSessionFinishedDisabled;
exports.onArenaSessionAborted = quiz_arena_decommission_1.onArenaSessionAbortedDisabled;
exports.onArenaRematchAccepted = quiz_arena_decommission_1.onArenaRematchAcceptedDisabled;
exports.questionTimeout = quiz_arena_decommission_1.questionTimeoutDisabled;
// зачем: Help Board и Compass-чат удалены владельцем (9af87817d), но живут в
// проде — гасим надгробиями, чтобы старые клиенты получали внятный отказ,
// а не ошибку соединения. Подробности — в help_board_decommission.ts.
Object.assign(exports, help_board_decommission_1.HELP_BOARD_DECOMMISSIONED_EXPORTS);
exports.helpBoardGenerateCompassForTopic = help_board_decommission_1.helpBoardGenerateCompassForTopicDisabled;
exports.helpBoardCompassRetryCron = help_board_decommission_1.helpBoardCompassRetryCronDisabled;
exports.compassChatDailyCron = help_board_decommission_1.compassChatDailyCronDisabled;
exports.friendEnsureMyCode = friendEnsureMyCode;
exports.friendLookupUser = friendLookupUser;
exports.friendLikeActivity = friendLikeActivity;
exports.friendUnlikeActivity = friendUnlikeActivity;
exports.friendSendGift = friendSendGift;
exports.friendThankGift = friendThankGift;
exports.friendGetActiveQuest = friendGetActiveQuest;
exports.friendClaimQuestReward = friendClaimQuestReward;
exports.onAppMessageReactionWritten = onAppMessageReactionWritten;
exports.onAppMessagePollVoteWritten = onAppMessagePollVoteWritten;
exports.onAppMessageStateWritten = onAppMessageStateWritten;
exports.submitVipSurvey = submitVipSurvey;
exports.recordVipSurveyReviewClick = recordVipSurveyReviewClick;
exports.submitClientReport = submitClientReport;
exports.telegramPremiumWebhook = telegramPremiumWebhook;
exports.telegramPremiumActivationNotifier = telegramPremiumActivationNotifier;
exports.referralEnsureMyCode = referralEnsureMyCode;
exports.referralApply = referralApply;
exports.referralClaimVipReward = referralClaimVipReward;
exports.referralListMyInvites = referralListMyInvites;
exports.premiumDialogSend = premiumDialogSend;
exports.premiumDialogTranslate = premiumDialogTranslate;
exports.premiumDialogReview = premiumDialogReview;
exports.weeklyReviewGenerate = weeklyReviewGenerate;
exports.statsInsightsGenerate = statsInsightsGenerate;
exports.explainPhrase = explainPhrase;
exports.explainChoice = explainChoice;
exports.notifyOnFriendRequestCreated = notifyOnFriendRequestCreated;
exports.notifyOnFriendAccepted = notifyOnFriendAccepted;
exports.userNotificationsCleanupCron = userNotificationsCleanupCron;
exports.explainMistake = explainMistake;
exports.submitExplainReport = submitExplainReport;
exports.vipRevokeMine = vipRevokeMine;
// Сокровищница (collectibles): фича в проде. CF в deploy:safe whitelist,
// клиент защищён kill-switch'ом collectibles_enabled (Remote Config, default true).
exports.collectiblesClaimDrop = collectiblesClaimDrop;
exports.progressSubmitEvent = progressSubmitEvent;
exports.progressMigrateSnapshot = progressMigrateSnapshot;
exports.adminAlertOnUserReport = adminAlertOnUserReport;
exports.adminAlertOnCriticalError = adminAlertOnCriticalError;
exports.adminAlertOnAuthFailureSpike = adminAlertOnAuthFailureSpike;
exports.adminAlertOnContentReport = adminAlertOnContentReport;
exports.adminAlertContentReportDigest = adminAlertContentReportDigest;
exports.adminAlertOnCancelSurvey = adminAlertOnCancelSurvey;
exports.adminAlertOnUgcRefund = adminAlertOnUgcRefund;
exports.adminAlertOnConfigWritten = adminAlertOnConfigWritten;
exports.dailyTasksAllShardsClaim = dailyTasksAllShardsClaim;
exports.submitShardSurvey = submitShardSurvey;
exports.getActiveShardSurvey = getActiveShardSurvey;
exports.adminWriteShardSurvey = adminWriteShardSurvey;
exports.adminDeleteShardSurvey = adminDeleteShardSurvey;
exports.shardsApplyDelta = shardsApplyDelta;
exports.devShardsGrant = devShardsGrant;
exports.getCoinExchangeQuote = getCoinExchangeQuote;
exports.getCoinExchangeHistory = getCoinExchangeHistory;
exports.exchangeCoinsForStars = exchangeCoinsForStars;
exports.adminSetCoinExchangeRate = adminSetCoinExchangeRate;
exports.recalcCoinExchangeRate = recalcCoinExchangeRate;
exports.adminGetCoinExchangeCenter = adminGetCoinExchangeCenter;
exports.profileCardUpgrade = profileCardUpgrade;
exports.submitUserIdea = submitUserIdea;
exports.adminListUserIdeas = adminListUserIdeas;
exports.adminDecideUserIdea = adminDecideUserIdea;
exports.adminDraftIdeaDecision = adminDraftIdeaDecision;
exports.leagueFinalizeCron = leagueFinalizeCron;
// ─── Leaderboard percentile stats cron ──────────────────────────────────────
// Runs daily. Computes p1-p99 thresholds for XP, streak and recent activity.
// and writes them to leaderboard_stats/global for all clients to read.
// memory: 1GiB + timeout 540s — крон агрегирует перцентили, держа в памяти XP/streak/time
// всех eligible-юзеров (полный скан users + leaderboard постранично). На дефолтных 256MiB
// падал OOM ежедневно (perсentile-статистика переставала обновляться).
exports.computeLeaderboardStatsCron = functions.scheduler.onSchedule({ schedule: '0 3 * * *', timeZone: 'UTC', memory: '1GiB', timeoutSeconds: 540 }, async () => { await computeLeaderboardStats(); });
// ─── Weekly XP reset cron (XP-02) ────────────────────────────────────────────
// Runs every Monday 00:00 UTC. Zeroes progress.weekly_xp for ALL users without
// touching progress.user_total_xp. Cron expression '0 0 * * 1' = at 00:00 on Monday.
exports.resetWeeklyXpCron = functions.scheduler.onSchedule({ schedule: '0 0 * * 1', timeZone: 'UTC' }, async () => { await resetWeeklyXp(); });
exports.cleanupExpiredAppMessagesCron = functions.scheduler.onSchedule({ schedule: '0 4 * * *', timeZone: 'UTC' }, async () => { await cleanupExpiredAppMessages(); });
// ─── Re-engagement push cron ─────────────────────────────────────────────────
// Runs daily at 10:00 UTC. Scans users/, finds players whose streak is about to
// break or who have been away 3-14 days, and sends them a localized push via the
// Expo Push API (delivers through FCM/APNs even to a closed app). Closes the
// retention gap where local-only notifications never reach a lapsed user.
exports.reEngagePushCron = functions.scheduler.onSchedule({ schedule: '0 10 * * *', timeZone: 'UTC' }, async () => {
    const summary = await runReEngagePush();
    console.log('reEngagePushCron', JSON.stringify(summary));
    if (summary.failedChunks > 0) {
        console.error(`reEngagePushCron: ${summary.failedChunks} chunk(s) failed — ` +
            `sent ${summary.sent}/${summary.candidates} candidates. Check Expo Push API or network.`);
    }
    if (summary.candidates > 0 && summary.sent === 0) {
        console.error(`reEngagePushCron: ${summary.candidates} candidates found but 0 pushes sent — all chunks failed.`);
    }
});
// Runs daily at 09:00 UTC. Scans users/, finds paid subscriptions/VIP whose
// concrete expiry is ~3 days out, and sends a warm localized "your Plus renews
// soon" push. Profilaxis of churn (complements premiumExpiryCron, which only
// deactivates already-expired access). Perpetual access is skipped — nothing to
// renew. 1GiB + 540s: full paginated users/ scan, same shape as premiumExpiryCron.
exports.premiumExpiryReminderCron = functions.scheduler.onSchedule({ schedule: '0 9 * * *', timeZone: 'UTC', region: 'us-central1', memory: '1GiB', timeoutSeconds: 540 }, async () => {
    const summary = await runPremiumExpiryReminder();
    console.log('premiumExpiryReminderCron', JSON.stringify(summary));
    if (summary.candidates > 0 && summary.sent === 0) {
        console.error(`premiumExpiryReminderCron: ${summary.candidates} candidates found but 0 pushes sent — check Expo Push API.`);
    }
});
// Runs daily at 08:00 UTC. Pulls unread support emails from support.phraseman@gmail.com
// via IMAP into support_inbox (first run backfills ~50). Cheap: one run/day. Needs the
// GMAIL_SUPPORT_APP_PASSWORD secret; if missing, logs and no-ops (never throws).
exports.gmailSupportPullCron = functions.scheduler.onSchedule({ schedule: '0 8 * * *', timeZone: 'UTC', region: 'us-central1', memory: '512MiB', timeoutSeconds: 300, secrets: [GMAIL_SUPPORT_APP_PASSWORD] }, async () => {
    await runSupportInboxPullCron();
});
// ── Community (UGC) packs ─────────────────────────────────────────────────────
var community_packs_1 = require("./community_packs");
Object.defineProperty(exports, "communitySubmitPackForReview", { enumerable: true, get: function () { return community_packs_1.communitySubmitPackForReview; } });
Object.defineProperty(exports, "communityModerateSubmission", { enumerable: true, get: function () { return community_packs_1.communityModerateSubmission; } });
Object.defineProperty(exports, "communityAdminModeratePack", { enumerable: true, get: function () { return community_packs_1.communityAdminModeratePack; } });
Object.defineProperty(exports, "communityFetchPackCardsIfAccessible", { enumerable: true, get: function () { return community_packs_1.communityFetchPackCardsIfAccessible; } });
Object.defineProperty(exports, "communityPurchasePack", { enumerable: true, get: function () { return community_packs_1.communityPurchasePack; } });
Object.defineProperty(exports, "adminRefundCommunityPackPurchase", { enumerable: true, get: function () { return community_packs_1.adminRefundCommunityPackPurchase; } });
Object.defineProperty(exports, "communityRedeemPackGiftVoucher", { enumerable: true, get: function () { return community_packs_1.communityRedeemPackGiftVoucher; } });
Object.defineProperty(exports, "flashcardPackGiftRedeem", { enumerable: true, get: function () { return community_packs_1.flashcardPackGiftRedeem; } });
Object.defineProperty(exports, "flashcardPackGiftGrantGlobalBroadcast", { enumerable: true, get: function () { return community_packs_1.flashcardPackGiftGrantGlobalBroadcast; } });
Object.defineProperty(exports, "flashcardPackGiftSyncState", { enumerable: true, get: function () { return community_packs_1.flashcardPackGiftSyncState; } });
Object.defineProperty(exports, "levelGiftReserve", { enumerable: true, get: function () { return community_packs_1.levelGiftReserve; } });
Object.defineProperty(exports, "levelGiftActivatePackGift", { enumerable: true, get: function () { return community_packs_1.levelGiftActivatePackGift; } });
Object.defineProperty(exports, "communityListSellerInbox", { enumerable: true, get: function () { return community_packs_1.communityListSellerInbox; } });
Object.defineProperty(exports, "communityMarkSellerInboxSeen", { enumerable: true, get: function () { return community_packs_1.communityMarkSellerInboxSeen; } });
var friend_activity_mirror_1 = require("./friend_activity_mirror");
Object.defineProperty(exports, "syncFriendActivityMirrorCron", { enumerable: true, get: function () { return friend_activity_mirror_1.syncFriendActivityMirrorCron; } });
// ── Деактивация истёкшего премиума/VIP по сроку (бессрочное не трогает) ───────
var premium_expiry_cron_1 = require("./premium_expiry_cron");
Object.defineProperty(exports, "premiumExpiryCron", { enumerable: true, get: function () { return premium_expiry_cron_1.premiumExpiryCron; } });
// ── Авто-перенос VIP, выданного в осиротевший stable-документ, на canonical ───
var friend_gifts_1 = require("./friend_gifts");
Object.defineProperty(exports, "friendSendGift", { enumerable: true, get: function () { return friend_gifts_1.friendSendGift; } });
// ── ИИ-дайджест «что случилось за сутки» для владельца (admin-only, по кнопке) ─
var admin_daily_digest_1 = require("./admin_daily_digest");
Object.defineProperty(exports, "adminGenerateDailyDigest", { enumerable: true, get: function () { return admin_daily_digest_1.adminGenerateDailyDigest; } });
Object.defineProperty(exports, "adminOpenDailyDigest", { enumerable: true, get: function () { return admin_daily_digest_1.adminOpenDailyDigest; } });
Object.defineProperty(exports, "adminGetDailyBriefing", { enumerable: true, get: function () { return admin_daily_digest_1.adminGetDailyBriefing; } });
var admin_asset_studio_1 = require("./admin_asset_studio");
Object.defineProperty(exports, "adminListAssetJobs", { enumerable: true, get: function () { return admin_asset_studio_1.adminListAssetJobs; } });
Object.defineProperty(exports, "adminCreateAssetJob", { enumerable: true, get: function () { return admin_asset_studio_1.adminCreateAssetJob; } });
Object.defineProperty(exports, "adminRunAssetJob", { enumerable: true, get: function () { return admin_asset_studio_1.adminRunAssetJob; } });
// ── Почта поддержки (Gmail IMAP забор + ИИ-черновики + SMTP-отправка), admin ───
var support_inbox_1 = require("./support_inbox");
Object.defineProperty(exports, "adminSupportPull", { enumerable: true, get: function () { return support_inbox_1.adminSupportPull; } });
Object.defineProperty(exports, "adminSupportList", { enumerable: true, get: function () { return support_inbox_1.adminSupportList; } });
Object.defineProperty(exports, "adminSupportGenerateReply", { enumerable: true, get: function () { return support_inbox_1.adminSupportGenerateReply; } });
Object.defineProperty(exports, "adminSupportPrepareReply", { enumerable: true, get: function () { return support_inbox_1.adminSupportPrepareReply; } });
Object.defineProperty(exports, "adminSupportDispatchReply", { enumerable: true, get: function () { return support_inbox_1.adminSupportDispatchReply; } });
Object.defineProperty(exports, "adminSupportSendReply", { enumerable: true, get: function () { return support_inbox_1.adminSupportSendReply; } });
Object.defineProperty(exports, "adminSupportCancelReply", { enumerable: true, get: function () { return support_inbox_1.adminSupportCancelReply; } });
Object.defineProperty(exports, "adminSupportPrepareReplyBatch", { enumerable: true, get: function () { return support_inbox_1.adminSupportPrepareReplyBatch; } });
Object.defineProperty(exports, "adminSupportDispatchReplyBatch", { enumerable: true, get: function () { return support_inbox_1.adminSupportDispatchReplyBatch; } });
Object.defineProperty(exports, "adminSupportCancelReplyBatch", { enumerable: true, get: function () { return support_inbox_1.adminSupportCancelReplyBatch; } });
Object.defineProperty(exports, "adminSupportResolveReplyDelivery", { enumerable: true, get: function () { return support_inbox_1.adminSupportResolveReplyDelivery; } });
Object.defineProperty(exports, "adminSupportSaveSignature", { enumerable: true, get: function () { return support_inbox_1.adminSupportSaveSignature; } });
Object.defineProperty(exports, "adminSupportSetStatus", { enumerable: true, get: function () { return support_inbox_1.adminSupportSetStatus; } });
// ── Ответы на репорты: персональное уведомление + клейм осколков + ИИ-черновик ─
var report_replies_1 = require("./report_replies");
Object.defineProperty(exports, "adminReplyToReport", { enumerable: true, get: function () { return report_replies_1.adminReplyToReport; } });
Object.defineProperty(exports, "claimReportReward", { enumerable: true, get: function () { return report_replies_1.claimReportReward; } });
Object.defineProperty(exports, "adminDraftReportReply", { enumerable: true, get: function () { return report_replies_1.adminDraftReportReply; } });
// ── Admin grant (типизированные награды из админки) ───────────────────────────
var admin_grant_1 = require("./admin_grant");
Object.defineProperty(exports, "adminGrantReward", { enumerable: true, get: function () { return admin_grant_1.adminGrantReward; } });
Object.defineProperty(exports, "adminSetShardBalance", { enumerable: true, get: function () { return admin_grant_1.adminSetShardBalance; } });
var admin_access_controls_1 = require("./admin_access_controls");
Object.defineProperty(exports, "adminGrantAccess", { enumerable: true, get: function () { return admin_access_controls_1.adminGrantAccess; } });
Object.defineProperty(exports, "adminSetUserBan", { enumerable: true, get: function () { return admin_access_controls_1.adminSetUserBan; } });
var admin_user_operations_1 = require("./admin_user_operations");
Object.defineProperty(exports, "adminDeleteDuplicateUser", { enumerable: true, get: function () { return admin_user_operations_1.adminDeleteDuplicateUser; } });
Object.defineProperty(exports, "adminMigrateLegacyAdminPremium", { enumerable: true, get: function () { return admin_user_operations_1.adminMigrateLegacyAdminPremium; } });
Object.defineProperty(exports, "adminRequestUserMerge", { enumerable: true, get: function () { return admin_user_operations_1.adminRequestUserMerge; } });
Object.defineProperty(exports, "adminResetUserProgress", { enumerable: true, get: function () { return admin_user_operations_1.adminResetUserProgress; } });
Object.defineProperty(exports, "adminResolveUserReport", { enumerable: true, get: function () { return admin_user_operations_1.adminResolveUserReport; } });
Object.defineProperty(exports, "adminUpdateUserProfileField", { enumerable: true, get: function () { return admin_user_operations_1.adminUpdateUserProfileField; } });
Object.defineProperty(exports, "adminWarnUser", { enumerable: true, get: function () { return admin_user_operations_1.adminWarnUser; } });
var admin_account_delete_1 = require("./admin_account_delete");
Object.defineProperty(exports, "adminQueueAccountDeletion", { enumerable: true, get: function () { return admin_account_delete_1.adminQueueAccountDeletion; } });
var admin_compliance_1 = require("./admin_compliance");
Object.defineProperty(exports, "adminGetComplianceOverview", { enumerable: true, get: function () { return admin_compliance_1.adminGetComplianceOverview; } });
Object.defineProperty(exports, "adminListSafetyFlags", { enumerable: true, get: function () { return admin_compliance_1.adminListSafetyFlags; } });
Object.defineProperty(exports, "adminMarkSafetyFlagsHandled", { enumerable: true, get: function () { return admin_compliance_1.adminMarkSafetyFlagsHandled; } });
// ── Починка/перепривязка auth-привязок из админки (permission users.auth_repair) ──
var admin_auth_repair_1 = require("./admin_auth_repair");
Object.defineProperty(exports, "adminRepairAuthLink", { enumerable: true, get: function () { return admin_auth_repair_1.adminRepairAuthLink; } });
Object.defineProperty(exports, "adminRelinkProvider", { enumerable: true, get: function () { return admin_auth_repair_1.adminRelinkProvider; } });
// ── Промокоды-награды (юзер активирует код → дни премиума; админ создаёт код) ──
var promo_codes_1 = require("./promo_codes");
Object.defineProperty(exports, "promoCodeRedeem", { enumerable: true, get: function () { return promo_codes_1.promoCodeRedeem; } });
Object.defineProperty(exports, "promoCodeUpsert", { enumerable: true, get: function () { return promo_codes_1.promoCodeUpsert; } });
Object.defineProperty(exports, "promoCodeBatchUpsert", { enumerable: true, get: function () { return promo_codes_1.promoCodeBatchUpsert; } });
Object.defineProperty(exports, "promoCodeDelete", { enumerable: true, get: function () { return promo_codes_1.promoCodeDelete; } });
Object.defineProperty(exports, "adminListPromoCodes", { enumerable: true, get: function () { return promo_codes_1.adminListPromoCodes; } });
var openai_budget_dashboard_1 = require("./openai_budget_dashboard");
Object.defineProperty(exports, "openAiBudgetDashboard", { enumerable: true, get: function () { return openai_budget_dashboard_1.openAiBudgetDashboard; } });
var admin_product_analytics_1 = require("./admin_product_analytics");
Object.defineProperty(exports, "adminProductAnalytics", { enumerable: true, get: function () { return admin_product_analytics_1.adminProductAnalytics; } });
var admin_subscription_analytics_1 = require("./admin_subscription_analytics");
Object.defineProperty(exports, "adminSubscriptionAnalytics", { enumerable: true, get: function () { return admin_subscription_analytics_1.adminSubscriptionAnalytics; } });
var admin_monthly_decision_pack_1 = require("./admin_monthly_decision_pack");
Object.defineProperty(exports, "adminMonthlyDecisionPack", { enumerable: true, get: function () { return admin_monthly_decision_pack_1.adminMonthlyDecisionPack; } });
var admin_analytics_1 = require("./admin_analytics");
Object.defineProperty(exports, "adminGetAnalyticsSnapshot", { enumerable: true, get: function () { return admin_analytics_1.adminGetAnalyticsSnapshot; } });
var admin_revenuecat_overview_1 = require("./admin_revenuecat_overview");
Object.defineProperty(exports, "adminGetRevenueCatOverviewMetrics", { enumerable: true, get: function () { return admin_revenuecat_overview_1.adminGetRevenueCatOverviewMetrics; } });
var admin_analytics_trends_1 = require("./admin_analytics_trends");
Object.defineProperty(exports, "adminGetAnalyticsTrends", { enumerable: true, get: function () { return admin_analytics_trends_1.adminGetAnalyticsTrends; } });
var admin_director_digest_1 = require("./admin_director_digest");
Object.defineProperty(exports, "adminGetDirectorDigest", { enumerable: true, get: function () { return admin_director_digest_1.adminGetDirectorDigest; } });
var admin_director_digest_audio_1 = require("./admin_director_digest_audio");
Object.defineProperty(exports, "adminGenerateDirectorDigestAudio", { enumerable: true, get: function () { return admin_director_digest_audio_1.adminGenerateDirectorDigestAudio; } });
var admin_user_profile_1 = require("./admin_user_profile");
Object.defineProperty(exports, "adminSearchUsers", { enumerable: true, get: function () { return admin_user_profile_1.adminSearchUsers; } });
Object.defineProperty(exports, "adminGetUserProfile", { enumerable: true, get: function () { return admin_user_profile_1.adminGetUserProfile; } });
var admin_reports_center_1 = require("./admin_reports_center");
Object.defineProperty(exports, "adminExportReportDocuments", { enumerable: true, get: function () { return admin_reports_center_1.adminExportReportDocuments; } });
Object.defineProperty(exports, "adminExportUnresolvedReports", { enumerable: true, get: function () { return admin_reports_center_1.adminExportUnresolvedReports; } });
Object.defineProperty(exports, "adminListReportQueue", { enumerable: true, get: function () { return admin_reports_center_1.adminListReportQueue; } });
Object.defineProperty(exports, "adminUpdateReportStatus", { enumerable: true, get: function () { return admin_reports_center_1.adminUpdateReportStatus; } });
var admin_audit_log_1 = require("./admin_audit_log");
Object.defineProperty(exports, "adminListAuditLog", { enumerable: true, get: function () { return admin_audit_log_1.adminListAuditLog; } });
var admin_ops_log_1 = require("./admin_ops_log");
Object.defineProperty(exports, "adminListOpsLog", { enumerable: true, get: function () { return admin_ops_log_1.adminListOpsLog; } });
var admin_plans_1 = require("./admin_plans");
Object.defineProperty(exports, "adminCreatePlan", { enumerable: true, get: function () { return admin_plans_1.adminCreatePlan; } });
Object.defineProperty(exports, "adminGetPlan", { enumerable: true, get: function () { return admin_plans_1.adminGetPlan; } });
Object.defineProperty(exports, "adminListPlans", { enumerable: true, get: function () { return admin_plans_1.adminListPlans; } });
var agent_office_1 = require("./agent_office");
Object.defineProperty(exports, "agentOfficeDecideRecommendation", { enumerable: true, get: function () { return agent_office_1.agentOfficeDecideRecommendation; } });
Object.defineProperty(exports, "agentOfficeGetAggregateHealth", { enumerable: true, get: function () { return agent_office_1.agentOfficeGetAggregateHealth; } });
Object.defineProperty(exports, "agentOfficeGetCase", { enumerable: true, get: function () { return agent_office_1.agentOfficeGetCase; } });
Object.defineProperty(exports, "agentOfficeGetControl", { enumerable: true, get: function () { return agent_office_1.agentOfficeGetControl; } });
Object.defineProperty(exports, "agentOfficeListAuditEvents", { enumerable: true, get: function () { return agent_office_1.agentOfficeListAuditEvents; } });
Object.defineProperty(exports, "agentOfficeListCases", { enumerable: true, get: function () { return agent_office_1.agentOfficeListCases; } });
Object.defineProperty(exports, "agentOfficeListRecommendations", { enumerable: true, get: function () { return agent_office_1.agentOfficeListRecommendations; } });
Object.defineProperty(exports, "agentOfficeListTasks", { enumerable: true, get: function () { return agent_office_1.agentOfficeListTasks; } });
Object.defineProperty(exports, "agentOfficeSetKillSwitch", { enumerable: true, get: function () { return agent_office_1.agentOfficeSetKillSwitch; } });
Object.defineProperty(exports, "agentOfficeTelegramWebhook", { enumerable: true, get: function () { return agent_office_1.agentOfficeTelegramWebhook; } });
var agent_manager_1 = require("./agent_manager");
Object.defineProperty(exports, "agentManagerCreateInboxTask", { enumerable: true, get: function () { return agent_manager_1.agentManagerCreateInboxTask; } });
Object.defineProperty(exports, "agentManagerCreateTask", { enumerable: true, get: function () { return agent_manager_1.agentManagerCreateTask; } });
Object.defineProperty(exports, "agentManagerInitializeRoster", { enumerable: true, get: function () { return agent_manager_1.agentManagerInitializeRoster; } });
Object.defineProperty(exports, "agentManagerIssueExecutionJob", { enumerable: true, get: function () { return agent_manager_1.agentManagerIssueExecutionJob; } });
Object.defineProperty(exports, "agentManagerListAgents", { enumerable: true, get: function () { return agent_manager_1.agentManagerListAgents; } });
Object.defineProperty(exports, "agentManagerListRunbooks", { enumerable: true, get: function () { return agent_manager_1.agentManagerListRunbooks; } });
Object.defineProperty(exports, "agentManagerListTasks", { enumerable: true, get: function () { return agent_manager_1.agentManagerListTasks; } });
Object.defineProperty(exports, "agentManagerLocalRunnerClaim", { enumerable: true, get: function () { return agent_manager_1.agentManagerLocalRunnerClaim; } });
Object.defineProperty(exports, "agentManagerLocalRunnerCreatePairing", { enumerable: true, get: function () { return agent_manager_1.agentManagerLocalRunnerCreatePairing; } });
Object.defineProperty(exports, "agentManagerLocalRunnerExchangePairing", { enumerable: true, get: function () { return agent_manager_1.agentManagerLocalRunnerExchangePairing; } });
Object.defineProperty(exports, "agentManagerLocalRunnerRevokeCapability", { enumerable: true, get: function () { return agent_manager_1.agentManagerLocalRunnerRevokeCapability; } });
Object.defineProperty(exports, "agentManagerLocalRunnerSubmit", { enumerable: true, get: function () { return agent_manager_1.agentManagerLocalRunnerSubmit; } });
Object.defineProperty(exports, "agentManagerRunAnalyticsWorker", { enumerable: true, get: function () { return agent_manager_1.agentManagerRunAnalyticsWorker; } });
Object.defineProperty(exports, "agentManagerRunBoundedExecutionWorker", { enumerable: true, get: function () { return agent_manager_1.agentManagerRunBoundedExecutionWorker; } });
Object.defineProperty(exports, "agentManagerRunReportTriageWorker", { enumerable: true, get: function () { return agent_manager_1.agentManagerRunReportTriageWorker; } });
Object.defineProperty(exports, "agentManagerTelegramPublishApproval", { enumerable: true, get: function () { return agent_manager_1.agentManagerTelegramPublishApproval; } });
Object.defineProperty(exports, "agentManagerTransitionTask", { enumerable: true, get: function () { return agent_manager_1.agentManagerTransitionTask; } });
// зачем: первый видимый рубеж нового Джарвиса (2026-08-01) — департамент
// «Качество» по требованию владельца через панель admin/v2/legacy.html.
// Старые agent_office/agent_manager выше не тронуты и сносятся отдельным
// шагом позже, когда у нового Джарвиса будет диалог и approvals.
var jarvis_1 = require("./jarvis");
Object.defineProperty(exports, "jarvisGetQualitySnapshot", { enumerable: true, get: function () { return jarvis_1.jarvisGetQualitySnapshot; } });
var admin_remote_config_1 = require("./admin_remote_config");
Object.defineProperty(exports, "adminGetRemoteConfigWorkspace", { enumerable: true, get: function () { return admin_remote_config_1.adminGetRemoteConfigWorkspace; } });
Object.defineProperty(exports, "adminPublishRemoteConfig", { enumerable: true, get: function () { return admin_remote_config_1.adminPublishRemoteConfig; } });
var admin_paywall_ab_1 = require("./admin_paywall_ab");
Object.defineProperty(exports, "adminGetPaywallAbWorkspace", { enumerable: true, get: function () { return admin_paywall_ab_1.adminGetPaywallAbWorkspace; } });
Object.defineProperty(exports, "adminPublishPaywallAb", { enumerable: true, get: function () { return admin_paywall_ab_1.adminPublishPaywallAb; } });
var admin_paywall_variant_stats_1 = require("./admin_paywall_variant_stats");
Object.defineProperty(exports, "adminGetPaywallVariantStats", { enumerable: true, get: function () { return admin_paywall_variant_stats_1.adminGetPaywallVariantStats; } });
var admin_app_messages_1 = require("./admin_app_messages");
Object.defineProperty(exports, "adminListAppMessages", { enumerable: true, get: function () { return admin_app_messages_1.adminListAppMessages; } });
Object.defineProperty(exports, "adminCreateAppMessage", { enumerable: true, get: function () { return admin_app_messages_1.adminCreateAppMessage; } });
Object.defineProperty(exports, "adminSetAppMessageActive", { enumerable: true, get: function () { return admin_app_messages_1.adminSetAppMessageActive; } });
Object.defineProperty(exports, "adminUpdateAppMessage", { enumerable: true, get: function () { return admin_app_messages_1.adminUpdateAppMessage; } });
Object.defineProperty(exports, "adminDeleteAppMessage", { enumerable: true, get: function () { return admin_app_messages_1.adminDeleteAppMessage; } });
Object.defineProperty(exports, "adminCleanupExpiredAppMessages", { enumerable: true, get: function () { return admin_app_messages_1.adminCleanupExpiredAppMessages; } });
Object.defineProperty(exports, "adminSendPersonalAppMessage", { enumerable: true, get: function () { return admin_app_messages_1.adminSendPersonalAppMessage; } });
Object.defineProperty(exports, "adminLaunchVipSurveyCampaign", { enumerable: true, get: function () { return admin_app_messages_1.adminLaunchVipSurveyCampaign; } });
Object.defineProperty(exports, "adminDeactivateVipSurveyCampaign", { enumerable: true, get: function () { return admin_app_messages_1.adminDeactivateVipSurveyCampaign; } });
var admin_config_controls_1 = require("./admin_config_controls");
Object.defineProperty(exports, "adminGetAdminConfigWorkspace", { enumerable: true, get: function () { return admin_config_controls_1.adminGetAdminConfigWorkspace; } });
Object.defineProperty(exports, "adminPublishNavLayout", { enumerable: true, get: function () { return admin_config_controls_1.adminPublishNavLayout; } });
Object.defineProperty(exports, "adminPublishAlertsConfig", { enumerable: true, get: function () { return admin_config_controls_1.adminPublishAlertsConfig; } });
Object.defineProperty(exports, "adminTestAlerts", { enumerable: true, get: function () { return admin_config_controls_1.adminTestAlerts; } });
var admin_league_controls_1 = require("./admin_league_controls");
Object.defineProperty(exports, "adminResetLeaguePoints", { enumerable: true, get: function () { return admin_league_controls_1.adminResetLeaguePoints; } });
Object.defineProperty(exports, "adminMoveLeagueUser", { enumerable: true, get: function () { return admin_league_controls_1.adminMoveLeagueUser; } });
var admin_global_broadcast_1 = require("./admin_global_broadcast");
Object.defineProperty(exports, "adminListGlobalBroadcasts", { enumerable: true, get: function () { return admin_global_broadcast_1.adminListGlobalBroadcasts; } });
Object.defineProperty(exports, "adminPublishGlobalBroadcast", { enumerable: true, get: function () { return admin_global_broadcast_1.adminPublishGlobalBroadcast; } });
Object.defineProperty(exports, "adminDeactivateGlobalBroadcasts", { enumerable: true, get: function () { return admin_global_broadcast_1.adminDeactivateGlobalBroadcasts; } });
var admin_content_factory_1 = require("./admin_content_factory");
Object.defineProperty(exports, "adminCreateContentGenerationJob", { enumerable: true, get: function () { return admin_content_factory_1.adminCreateContentGenerationJob; } });
Object.defineProperty(exports, "adminListContentFactoryJobs", { enumerable: true, get: function () { return admin_content_factory_1.adminListContentFactoryJobs; } });
var admin_content_stages_1 = require("./admin_content_stages");
Object.defineProperty(exports, "adminCreateContentStage", { enumerable: true, get: function () { return admin_content_stages_1.adminCreateContentStage; } });
Object.defineProperty(exports, "adminControlContentStage", { enumerable: true, get: function () { return admin_content_stages_1.adminControlContentStage; } });
Object.defineProperty(exports, "adminListContentStages", { enumerable: true, get: function () { return admin_content_stages_1.adminListContentStages; } });
Object.defineProperty(exports, "adminListContentStageDependencies", { enumerable: true, get: function () { return admin_content_stages_1.adminListContentStageDependencies; } });
Object.defineProperty(exports, "adminGetContentStageCapabilities", { enumerable: true, get: function () { return admin_content_stages_1.adminGetContentStageCapabilities; } });
Object.defineProperty(exports, "adminPreviewContentStage", { enumerable: true, get: function () { return admin_content_stages_1.adminPreviewContentStage; } });
Object.defineProperty(exports, "adminReviewContentStage", { enumerable: true, get: function () { return admin_content_stages_1.adminReviewContentStage; } });
var admin_content_stage_bulk_1 = require("./admin_content_stage_bulk");
Object.defineProperty(exports, "adminCreateContentStageBulkPlan", { enumerable: true, get: function () { return admin_content_stage_bulk_1.adminCreateContentStageBulkPlan; } });
var admin_content_stage_edits_1 = require("./admin_content_stage_edits");
Object.defineProperty(exports, "adminEditContentStageArtifact", { enumerable: true, get: function () { return admin_content_stage_edits_1.adminEditContentStageArtifact; } });
var content_stage_worker_1 = require("./content_stage_worker");
Object.defineProperty(exports, "adminRunContentStage", { enumerable: true, get: function () { return content_stage_worker_1.adminRunContentStage; } });
Object.defineProperty(exports, "CONTENT_STAGE_OPENAI_API_KEY", { enumerable: true, get: function () { return content_stage_worker_1.CONTENT_STAGE_OPENAI_API_KEY; } });
var admin_content_factory_read_1 = require("./admin_content_factory_read");
Object.defineProperty(exports, "adminGetContentFactoryJobDetail", { enumerable: true, get: function () { return admin_content_factory_read_1.adminGetContentFactoryJobDetail; } });
Object.defineProperty(exports, "adminGetContentFactoryUnitPreview", { enumerable: true, get: function () { return admin_content_factory_read_1.adminGetContentFactoryUnitPreview; } });
Object.defineProperty(exports, "adminGetContentFactoryWorkspace", { enumerable: true, get: function () { return admin_content_factory_read_1.adminGetContentFactoryWorkspace; } });
Object.defineProperty(exports, "adminGetContentFactoryRolloutMetrics", { enumerable: true, get: function () { return admin_content_factory_read_1.adminGetContentFactoryRolloutMetrics; } });
var content_factory_worker_1 = require("./content_factory_worker");
Object.defineProperty(exports, "adminRunContentGenerationUnit", { enumerable: true, get: function () { return content_factory_worker_1.adminRunContentGenerationUnit; } });
Object.defineProperty(exports, "CONTENT_FACTORY_OPENAI_API_KEY", { enumerable: true, get: function () { return content_factory_worker_1.CONTENT_FACTORY_OPENAI_API_KEY; } });
var admin_content_studio_callables_1 = require("./admin_content_studio_callables");
Object.defineProperty(exports, "adminSaveV2EpisodeDraft", { enumerable: true, get: function () { return admin_content_studio_callables_1.adminSaveV2EpisodeDraft; } });
Object.defineProperty(exports, "adminSaveV2SeasonDraft", { enumerable: true, get: function () { return admin_content_studio_callables_1.adminSaveV2SeasonDraft; } });
var admin_content_release_1 = require("./admin_content_release");
Object.defineProperty(exports, "adminReviewCourseGeneration", { enumerable: true, get: function () { return admin_content_release_1.adminReviewCourseGeneration; } });
Object.defineProperty(exports, "adminSealCourseRelease", { enumerable: true, get: function () { return admin_content_release_1.adminSealCourseRelease; } });
var language_release_1 = require("./language_release");
Object.defineProperty(exports, "adminActivateCourseRelease", { enumerable: true, get: function () { return language_release_1.adminActivateCourseRelease; } });
Object.defineProperty(exports, "adminRollbackCourseRelease", { enumerable: true, get: function () { return language_release_1.adminRollbackCourseRelease; } });
var openai_dialog_model_config_1 = require("./openai_dialog_model_config");
Object.defineProperty(exports, "openAiDialogModelConfig", { enumerable: true, get: function () { return openai_dialog_model_config_1.openAiDialogModelConfig; } });
Object.defineProperty(exports, "openAiDialogQuotaConfig", { enumerable: true, get: function () { return openai_dialog_model_config_1.openAiDialogQuotaConfig; } });
var openai_jobs_config_1 = require("./openai_jobs_config");
Object.defineProperty(exports, "openAiJobsConfig", { enumerable: true, get: function () { return openai_jobs_config_1.openAiJobsConfig; } });
var admin_translate_1 = require("./admin_translate");
Object.defineProperty(exports, "adminTranslateMessage", { enumerable: true, get: function () { return admin_translate_1.adminTranslateMessage; } });
var settings_poll_vote_1 = require("./settings_poll_vote");
Object.defineProperty(exports, "submitSettingsPollVote", { enumerable: true, get: function () { return settings_poll_vote_1.submitSettingsPollVote; } });
var admin_email_1 = require("./admin_email");
Object.defineProperty(exports, "adminEmailBroadcast", { enumerable: true, get: function () { return admin_email_1.adminEmailBroadcast; } });
Object.defineProperty(exports, "adminEmailContactsBackfill", { enumerable: true, get: function () { return admin_email_1.adminEmailContactsBackfill; } });
var email_unsubscribe_1 = require("./email_unsubscribe");
Object.defineProperty(exports, "emailUnsubscribe", { enumerable: true, get: function () { return email_unsubscribe_1.emailUnsubscribe; } });
var daily_phrases_1 = require("./daily_phrases");
Object.defineProperty(exports, "dailyPhraseSetSaved", { enumerable: true, get: function () { return daily_phrases_1.dailyPhraseSetSaved; } });
var website_contact_1 = require("./website_contact");
Object.defineProperty(exports, "submitWebsiteContact", { enumerable: true, get: function () { return website_contact_1.submitWebsiteContact; } });
var site_stats_1 = require("./site_stats");
Object.defineProperty(exports, "siteStatsTrack", { enumerable: true, get: function () { return site_stats_1.siteStatsTrack; } });
var onboarding_funnel_1 = require("./onboarding_funnel");
Object.defineProperty(exports, "recordOnboardingFunnelEvent", { enumerable: true, get: function () { return onboarding_funnel_1.recordOnboardingFunnelEvent; } });
Object.defineProperty(exports, "adminGetOnboardingFunnel", { enumerable: true, get: function () { return onboarding_funnel_1.adminGetOnboardingFunnel; } });
var record_age_consent_snapshot_1 = require("./record_age_consent_snapshot");
Object.defineProperty(exports, "recordAgeConsentSnapshot", { enumerable: true, get: function () { return record_age_consent_snapshot_1.recordAgeConsentSnapshot; } });
var revenuecat_shards_1 = require("./revenuecat_shards");
Object.defineProperty(exports, "revenueCatShardsWebhook", { enumerable: true, get: function () { return revenuecat_shards_1.revenueCatShardsWebhook; } });
var revenuecat_reconcile_1 = require("./revenuecat_reconcile");
Object.defineProperty(exports, "revenueCatPremiumReconcileMine", { enumerable: true, get: function () { return revenuecat_reconcile_1.revenueCatPremiumReconcileMine; } });
var admin_push_jobs_1 = require("./admin_push_jobs");
Object.defineProperty(exports, "adminPushJobCreated", { enumerable: true, get: function () { return admin_push_jobs_1.adminPushJobCreated; } });
Object.defineProperty(exports, "adminPushJobsCron", { enumerable: true, get: function () { return admin_push_jobs_1.adminPushJobsCron; } });
// ── Веб-оплата Premium с сайта (квиз-воронка /start/): Stripe + PayPal ────────
var web_checkout_1 = require("./web_checkout");
Object.defineProperty(exports, "webCheckoutCreate", { enumerable: true, get: function () { return web_checkout_1.webCheckoutCreate; } });
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return web_checkout_1.stripeWebhook; } });
Object.defineProperty(exports, "paypalOrderCreate", { enumerable: true, get: function () { return web_checkout_1.paypalOrderCreate; } });
Object.defineProperty(exports, "paypalOrderCapture", { enumerable: true, get: function () { return web_checkout_1.paypalOrderCapture; } });
Object.defineProperty(exports, "webOrderStatus", { enumerable: true, get: function () { return web_checkout_1.webOrderStatus; } });
Object.defineProperty(exports, "webPrices", { enumerable: true, get: function () { return web_checkout_1.webPrices; } });
Object.defineProperty(exports, "adminCreateGiftCertificateBatch", { enumerable: true, get: function () { return web_checkout_1.adminCreateGiftCertificateBatch; } });
Object.defineProperty(exports, "adminListGiftCertificates", { enumerable: true, get: function () { return web_checkout_1.adminListGiftCertificates; } });
Object.defineProperty(exports, "adminDeleteGiftCertificate", { enumerable: true, get: function () { return web_checkout_1.adminDeleteGiftCertificate; } });
Object.defineProperty(exports, "adminGetGiftCertificateDownload", { enumerable: true, get: function () { return web_checkout_1.adminGetGiftCertificateDownload; } });
Object.defineProperty(exports, "adminUpdateGiftCertificateRecipient", { enumerable: true, get: function () { return web_checkout_1.adminUpdateGiftCertificateRecipient; } });
Object.defineProperty(exports, "adminUpdateGiftCertificatePersonalization", { enumerable: true, get: function () { return web_checkout_1.adminUpdateGiftCertificatePersonalization; } });
Object.defineProperty(exports, "adminReplaceSyntheticGiftCertificate", { enumerable: true, get: function () { return web_checkout_1.adminReplaceSyntheticGiftCertificate; } });
Object.defineProperty(exports, "adminSendPreparedGiftCertificate", { enumerable: true, get: function () { return web_checkout_1.adminSendPreparedGiftCertificate; } });
// ── Email-лиды квиза /start/ (письмо с планом + догоняющие) ───────────────────
var web_leads_1 = require("./web_leads");
Object.defineProperty(exports, "webLeadCapture", { enumerable: true, get: function () { return web_leads_1.webLeadCapture; } });
Object.defineProperty(exports, "webLeadNudgeCron", { enumerable: true, get: function () { return web_leads_1.webLeadNudgeCron; } });
// ── Турниры (Фаза 1 MVP, спека docs/tournaments/2026-07-21-tournaments-mode-spec.md) ──
var tournaments_1 = require("./tournaments");
Object.defineProperty(exports, "tournamentCreateRooms", { enumerable: true, get: function () { return tournaments_1.tournamentCreateRooms; } });
Object.defineProperty(exports, "tournamentJoin", { enumerable: true, get: function () { return tournaments_1.tournamentJoin; } });
Object.defineProperty(exports, "tournamentLeave", { enumerable: true, get: function () { return tournaments_1.tournamentLeave; } });
Object.defineProperty(exports, "tournamentForfeit", { enumerable: true, get: function () { return tournaments_1.tournamentForfeit; } });
Object.defineProperty(exports, "tournamentFillBots", { enumerable: true, get: function () { return tournaments_1.tournamentFillBots; } });
Object.defineProperty(exports, "tournamentAdvanceRooms", { enumerable: true, get: function () { return tournaments_1.tournamentAdvanceRooms; } });
Object.defineProperty(exports, "tournamentAdvanceRound", { enumerable: true, get: function () { return tournaments_1.tournamentAdvanceRound; } });
Object.defineProperty(exports, "tournamentRoundReview", { enumerable: true, get: function () { return tournaments_1.tournamentRoundReview; } });
Object.defineProperty(exports, "tournamentSubmitSpeedMatchAttempt", { enumerable: true, get: function () { return tournaments_1.tournamentSubmitSpeedMatchAttempt; } });
Object.defineProperty(exports, "tournamentSubmitTaskAnswer", { enumerable: true, get: function () { return tournaments_1.tournamentSubmitTaskAnswer; } });
Object.defineProperty(exports, "tournamentSubmitAnswers", { enumerable: true, get: function () { return tournaments_1.tournamentSubmitAnswers; } });
Object.defineProperty(exports, "tournamentFinalize", { enumerable: true, get: function () { return tournaments_1.tournamentFinalize; } });
Object.defineProperty(exports, "tournamentClaimReward", { enumerable: true, get: function () { return tournaments_1.tournamentClaimReward; } });
// зачем 2026-07-27 (владелец): дев-турнир убран, дев-логика не используется.
// Мгновенный вход теперь даёт ОБЫЧНЫЙ турнир по требованию.
Object.defineProperty(exports, "tournamentStartNow", { enumerable: true, get: function () { return tournaments_1.tournamentStartNow; } });
var tournament_bots_1 = require("./tournament_bots");
Object.defineProperty(exports, "adminSeedBotProfiles", { enumerable: true, get: function () { return tournament_bots_1.adminSeedBotProfiles; } });
// Раздел «Турниры» в админке: генерация заданий из контента планов, ревью-очередь,
// публикация в пул, статистика готовности раундов, расписание слотов.
var admin_tournament_tasks_1 = require("./admin_tournament_tasks");
Object.defineProperty(exports, "adminGenerateTournamentTasks", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminGenerateTournamentTasks; } });
Object.defineProperty(exports, "adminGenerateTournamentTasksAi", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminGenerateTournamentTasksAi; } });
Object.defineProperty(exports, "adminListTournamentTasks", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminListTournamentTasks; } });
Object.defineProperty(exports, "adminMutateTournamentTasks", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminMutateTournamentTasks; } });
Object.defineProperty(exports, "adminEditTournamentTask", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminEditTournamentTask; } });
Object.defineProperty(exports, "adminFillTournamentPool", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminFillTournamentPool; } });
Object.defineProperty(exports, "adminGetTournamentModeMix", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminGetTournamentModeMix; } });
Object.defineProperty(exports, "adminSetTournamentModeMix", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminSetTournamentModeMix; } });
Object.defineProperty(exports, "adminGenerateTournamentAudioTasksAi", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminGenerateTournamentAudioTasksAi; } });
Object.defineProperty(exports, "adminTournamentPoolStats", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminTournamentPoolStats; } });
Object.defineProperty(exports, "adminGetTournamentSchedule", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminGetTournamentSchedule; } });
Object.defineProperty(exports, "adminSetTournamentSchedule", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminSetTournamentSchedule; } });
Object.defineProperty(exports, "adminSetTournamentCurated", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminSetTournamentCurated; } });
Object.defineProperty(exports, "adminGetTournamentCurated", { enumerable: true, get: function () { return admin_tournament_tasks_1.adminGetTournamentCurated; } });
// Генерация ЦЕЛОГО турнира одним вызовом: 4 раунда × 6 заданий, каждому
// режиму свой тип вопроса (ситуация / пропуск / поиск ошибки / сборка).
var admin_tournament_full_1 = require("./admin_tournament_full");
Object.defineProperty(exports, "adminGenerateTournamentAi", { enumerable: true, get: function () { return admin_tournament_full_1.adminGenerateTournamentAi; } });
// Папки вопросов: перегенерация одного и массовые действия по папке.
Object.defineProperty(exports, "adminRegenerateTournamentTask", { enumerable: true, get: function () { return admin_tournament_full_1.adminRegenerateTournamentTask; } });
Object.defineProperty(exports, "adminBulkTournamentFolder", { enumerable: true, get: function () { return admin_tournament_full_1.adminBulkTournamentFolder; } });
// Недельный банк турниров: копится с каждого турнира, раздаётся тройке лучших
// по сумме очков в ночь воскресенья (крон) либо вручную из админки.
var tournament_weekly_payout_1 = require("./tournament_weekly_payout");
Object.defineProperty(exports, "tournamentWeeklyBankCron", { enumerable: true, get: function () { return tournament_weekly_payout_1.tournamentWeeklyBankCron; } });
Object.defineProperty(exports, "adminPayoutTournamentWeeklyBank", { enumerable: true, get: function () { return tournament_weekly_payout_1.adminPayoutTournamentWeeklyBank; } });
Object.defineProperty(exports, "adminSetTournamentEconomy", { enumerable: true, get: function () { return tournament_weekly_payout_1.adminSetTournamentEconomy; } });
Object.defineProperty(exports, "adminGetTournamentEconomy", { enumerable: true, get: function () { return tournament_weekly_payout_1.adminGetTournamentEconomy; } });
Object.defineProperty(exports, "tournamentWeeklyBankInfo", { enumerable: true, get: function () { return tournament_weekly_payout_1.tournamentWeeklyBankInfo; } });
// ── Arena question pool (генератор/пул вопросов, админ-инструментарий; сама игра Арена выведена из эксплуатации) ──
var admin_arena_question_pool_1 = require("./admin_arena_question_pool");
Object.defineProperty(exports, "adminListArenaQuestionPool", { enumerable: true, get: function () { return admin_arena_question_pool_1.adminListArenaQuestionPool; } });
Object.defineProperty(exports, "adminPublishArenaQuestionBatch", { enumerable: true, get: function () { return admin_arena_question_pool_1.adminPublishArenaQuestionBatch; } });
Object.defineProperty(exports, "adminRemoveArenaPoolQuestion", { enumerable: true, get: function () { return admin_arena_question_pool_1.adminRemoveArenaPoolQuestion; } });
Object.defineProperty(exports, "adminRestoreArenaPoolQuestion", { enumerable: true, get: function () { return admin_arena_question_pool_1.adminRestoreArenaPoolQuestion; } });
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { explainQuiz } = require('./explain_quiz');
exports.explainQuiz = explainQuiz;
// Learning V2 delayed evidence: server-classified, idempotent receipt finalization.
var learning_v2_delayed_callable_1 = require("./learning_v2_delayed_callable");
Object.defineProperty(exports, "finalizeLearningV2DelayedCandidate", { enumerable: true, get: function () { return learning_v2_delayed_callable_1.finalizeLearningV2DelayedCandidate; } });
var learning_v2_access_production_callable_1 = require("./learning_v2_access_production_callable");
Object.defineProperty(exports, "finalizeLearningV2AccessPurchase", { enumerable: true, get: function () { return learning_v2_access_production_callable_1.finalizeLearningV2AccessPurchase; } });
// ── Рулетка Plus (спин-кредиты → дни VIP) и claim qualified-приглашений в прокруты ──
var referral_spin_1 = require("./referral_spin");
Object.defineProperty(exports, "referralSpin", { enumerable: true, get: function () { return referral_spin_1.referralSpin; } });
var referral_claim_spin_1 = require("./referral_claim_spin");
Object.defineProperty(exports, "referralClaimSpin", { enumerable: true, get: function () { return referral_claim_spin_1.referralClaimSpin; } });
// DEV-кнопка «+1 прокрут» (гейт remote_config, лимит 10/сутки) — только для тестовых сборок.
var referral_dev_grant_1 = require("./referral_dev_grant");
Object.defineProperty(exports, "referralDevGrantSpin", { enumerable: true, get: function () { return referral_dev_grant_1.referralDevGrantSpin; } });
// ── Fan-out ленты активности друзей (users/{uid}/my_events → users/{friendUid}/feed) ──
var feed_fanout_1 = require("./feed_fanout");
Object.defineProperty(exports, "feedFanoutOnMyEvent", { enumerable: true, get: function () { return feed_fanout_1.feedFanoutOnMyEvent; } });
Object.defineProperty(exports, "feedPruneCron", { enumerable: true, get: function () { return feed_fanout_1.feedPruneCron; } });
// ── Пачковая выдача публичных профилей друзей (убирает 4-RTT цепочку с клиента) ──
var friends_profiles_1 = require("./friends_profiles");
Object.defineProperty(exports, "friendsGetProfiles", { enumerable: true, get: function () { return friends_profiles_1.friendsGetProfiles; } });
// Authenticated, server-authoritative one-time onboarding access grant.
var gift_access_1 = require("./gift_access");
Object.defineProperty(exports, "introFullAccessClaim", { enumerable: true, get: function () { return gift_access_1.introFullAccessClaim; } });
// ── Админ-callables раздела «Рефералы» (гейт custom claim admin) ──
var admin_referrals_1 = require("./admin_referrals");
Object.defineProperty(exports, "adminRevokeReferralAttribution", { enumerable: true, get: function () { return admin_referrals_1.adminRevokeReferralAttribution; } });
Object.defineProperty(exports, "adminListReferrals", { enumerable: true, get: function () { return admin_referrals_1.adminListReferrals; } });
Object.defineProperty(exports, "adminGetReferralDashboard", { enumerable: true, get: function () { return admin_referrals_1.adminGetReferralDashboard; } });
Object.defineProperty(exports, "adminSpinStats", { enumerable: true, get: function () { return admin_referrals_1.adminSpinStats; } });
Object.defineProperty(exports, "adminSpinLogs", { enumerable: true, get: function () { return admin_referrals_1.adminSpinLogs; } });
Object.defineProperty(exports, "adminSetSpinWeights", { enumerable: true, get: function () { return admin_referrals_1.adminSetSpinWeights; } });
Object.defineProperty(exports, "adminSetReferralRouletteEnabled", { enumerable: true, get: function () { return admin_referrals_1.adminSetReferralRouletteEnabled; } });
Object.defineProperty(exports, "adminSetReferralRouletteEmergencyStop", { enumerable: true, get: function () { return admin_referrals_1.adminSetReferralRouletteEmergencyStop; } });
Object.defineProperty(exports, "adminReferralHealth", { enumerable: true, get: function () { return admin_referrals_1.adminReferralHealth; } });
// Learning V2: генерация юнитов (E1 vertical slice) — очередь плана + воркер
var admin_v2_generation_1 = require("./admin_v2_generation");
Object.defineProperty(exports, "adminCreateV2GenerationPlan", { enumerable: true, get: function () { return admin_v2_generation_1.adminCreateV2GenerationPlan; } });
Object.defineProperty(exports, "adminQueueV2GenerationPlan", { enumerable: true, get: function () { return admin_v2_generation_1.adminQueueV2GenerationPlan; } });
var v2_e1_compilation_worker_1 = require("./content_factory/v2_e1_compilation_worker");
Object.defineProperty(exports, "adminSeedV2E1DemoSource", { enumerable: true, get: function () { return v2_e1_compilation_worker_1.adminSeedV2E1DemoSource; } });
Object.defineProperty(exports, "adminRunV2E1Compilation", { enumerable: true, get: function () { return v2_e1_compilation_worker_1.adminRunV2E1Compilation; } });
//# sourceMappingURL=index.js.map