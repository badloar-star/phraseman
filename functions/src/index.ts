import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';
import { getLevelFromXP } from './xp_levels';
import {
  QUIZ_ARENA_DECOMMISSIONED_EXPORTS,
  arenaHillDailyRewardCronDisabled,
  arenaSeasonRolloverCronDisabled,
  matchmakingCronDisabled,
  onAnswerSubmittedDisabled,
  onArenaRematchAcceptedDisabled,
  onArenaRoomMatchedDisabled,
  onArenaSessionAbortedDisabled,
  onArenaSessionFinishedDisabled,
  onMatchmakingWriteDisabled,
  onSessionCountdownDisabled,
  onSessionGetReadyDisabled,
  onSessionPlayerLobbyDisabled,
  questionTimeoutDisabled,
} from './quiz_arena_decommission';
import {
  HELP_BOARD_DECOMMISSIONED_EXPORTS,
  compassChatDailyCronDisabled,
  helpBoardCompassRetryCronDisabled,
  helpBoardGenerateCompassForTopicDisabled,
} from './help_board_decommission';

admin.initializeApp();

// These imports must come AFTER initializeApp() — use require to control order
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resetWeeklyXp } = require('./reset_weekly_xp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { computeLeaderboardStats } = require('./compute_leaderboard_stats');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runReEngagePush } = require('./re_engage_push') as {
  runReEngagePush: (now?: number) => Promise<{ scanned: number; candidates: number; sent: number; failedChunks: number; ticketCount: number }>;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runPremiumExpiryReminder } = require('./premium_expiry_reminder') as {
  runPremiumExpiryReminder: (now?: number) => Promise<{ scanned: number; candidates: number; sent: number; failed: number }>;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runSupportInboxPullCron, GMAIL_SUPPORT_APP_PASSWORD } = require('./support_inbox') as {
  runSupportInboxPullCron: () => Promise<unknown>;
  GMAIL_SUPPORT_APP_PASSWORD: import('firebase-functions/params').SecretParam;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueJoinOrUpdateGroup, leagueUpdateMyMember, leagueSyncMyBoost, leagueActivateGroupBoost } = require('./league_groups');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authEnsureStableLink, authStampAnonOwnership, authRecoveryHint } = require('./auth_identity');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  authRequestRecoveryCode,
  authConfirmRecoveryCode,
  authRequestCleanInstallRecoveryCode,
  authConfirmCleanInstallRecoveryCode,
  authCleanInstallRecoveryDeliveryWorker,
  authIssueRecoveryHandoffToken,
  authCompleteRecoveryHandoff,
} = require('./auth_recovery');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  authMergeStableAccounts,
  accountMergeOutboxWorker,
  accountMergeOutboxRetryCron,
} = require('./auth_merge');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { accountDeleteMine, accountDeleteEnqueue } = require('./account_delete');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { accountDeleteWorker, accountDeleteRetryCron } = require('./account_delete_worker');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  leaderboardUpdateDailyAnalytics,
  nameCheckAvailability,
  nameGenerateAndReserve,
  nameReserve,
  nameReleaseMine,
} = require('./leaderboard');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueChestClaim } = require('./league_chest');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendEnsureMyCode } = require('./friend_codes');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendLookupUser } = require('./friend_lookup');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendLikeActivity, friendUnlikeActivity } = require('./friend_activity_likes');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  friendSendGift,
  friendThankGift,
  friendGetActiveQuest,
  friendClaimQuestReward,
} = require('./friend_gifts');
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
const {
  referralEnsureMyCode,
  referralApply,
  referralClaimVipReward,
  referralListMyInvites,
} = require('./referral');
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
const {
  getCoinExchangeQuote,
  getCoinExchangeHistory,
  exchangeCoinsForStars,
  adminSetCoinExchangeRate,
  recalcCoinExchangeRate,
  adminGetCoinExchangeCenter,
} = require('./coin_exchange');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { profileCardUpgrade } = require('./profile_card_upgrade');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitUserIdea, adminListUserIdeas, adminDecideUserIdea, adminDraftIdeaDecision } = require('./user_ideas');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueFinalizeCron } = require('./league_finalize_cron');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  notifyOnFriendRequestCreated,
  notifyOnFriendAccepted,
  userNotificationsCleanupCron,
} = require('./user_notifications');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { progressSubmitEvent, progressMigrateSnapshot } = require('./progress_events');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  adminAlertOnUserReport,
  adminAlertOnCriticalError,
  adminAlertOnAuthFailureSpike,
  adminAlertOnContentReport,
  adminAlertContentReportDigest,
  adminAlertOnCancelSurvey,
  adminAlertOnUgcRefund,
  adminAlertOnConfigWritten,
} = require('./admin_alerts');

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
Object.assign(exports, QUIZ_ARENA_DECOMMISSIONED_EXPORTS);
exports.arenaSeasonRolloverCron = arenaSeasonRolloverCronDisabled;
exports.arenaHillDailyRewardCron = arenaHillDailyRewardCronDisabled;
exports.onMatchmakingWrite = onMatchmakingWriteDisabled;
exports.matchmakingCron = matchmakingCronDisabled;
exports.onArenaRoomMatched = onArenaRoomMatchedDisabled;
exports.onSessionGetReady = onSessionGetReadyDisabled;
exports.onSessionPlayerLobby = onSessionPlayerLobbyDisabled;
exports.onSessionCountdown = onSessionCountdownDisabled;
exports.onAnswerSubmitted = onAnswerSubmittedDisabled;
exports.onArenaSessionFinished = onArenaSessionFinishedDisabled;
exports.onArenaSessionAborted = onArenaSessionAbortedDisabled;
exports.onArenaRematchAccepted = onArenaRematchAcceptedDisabled;
exports.questionTimeout = questionTimeoutDisabled;
// зачем: Help Board и Compass-чат удалены владельцем (9af87817d), но живут в
// проде — гасим надгробиями, чтобы старые клиенты получали внятный отказ,
// а не ошибку соединения. Подробности — в help_board_decommission.ts.
Object.assign(exports, HELP_BOARD_DECOMMISSIONED_EXPORTS);
exports.helpBoardGenerateCompassForTopic = helpBoardGenerateCompassForTopicDisabled;
exports.helpBoardCompassRetryCron = helpBoardCompassRetryCronDisabled;
exports.compassChatDailyCron = compassChatDailyCronDisabled;
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
export const computeLeaderboardStatsCron = functions.scheduler.onSchedule(
  { schedule: '0 3 * * *', timeZone: 'UTC', memory: '1GiB', timeoutSeconds: 540 },
  async () => { await computeLeaderboardStats(); }
);

// ─── Weekly XP reset cron (XP-02) ────────────────────────────────────────────
// Runs every Monday 00:00 UTC. Zeroes progress.weekly_xp for ALL users without
// touching progress.user_total_xp. Cron expression '0 0 * * 1' = at 00:00 on Monday.
export const resetWeeklyXpCron = functions.scheduler.onSchedule(
  { schedule: '0 0 * * 1', timeZone: 'UTC' },
  async () => { await resetWeeklyXp(); }
);

export const cleanupExpiredAppMessagesCron = functions.scheduler.onSchedule(
  { schedule: '0 4 * * *', timeZone: 'UTC' },
  async () => { await cleanupExpiredAppMessages(); }
);

// ─── Re-engagement push cron ─────────────────────────────────────────────────
// Runs daily at 10:00 UTC. Scans users/, finds players whose streak is about to
// break or who have been away 3-14 days, and sends them a localized push via the
// Expo Push API (delivers through FCM/APNs even to a closed app). Closes the
// retention gap where local-only notifications never reach a lapsed user.
export const reEngagePushCron = functions.scheduler.onSchedule(
  { schedule: '0 10 * * *', timeZone: 'UTC' },
  async () => {
    const summary = await runReEngagePush();
    console.log('reEngagePushCron', JSON.stringify(summary));
    if (summary.failedChunks > 0) {
      console.error(
        `reEngagePushCron: ${summary.failedChunks} chunk(s) failed — ` +
        `sent ${summary.sent}/${summary.candidates} candidates. Check Expo Push API or network.`,
      );
    }
    if (summary.candidates > 0 && summary.sent === 0) {
      console.error(
        `reEngagePushCron: ${summary.candidates} candidates found but 0 pushes sent — all chunks failed.`,
      );
    }
  }
);

// Runs daily at 09:00 UTC. Scans users/, finds paid subscriptions/VIP whose
// concrete expiry is ~3 days out, and sends a warm localized "your Plus renews
// soon" push. Profilaxis of churn (complements premiumExpiryCron, which only
// deactivates already-expired access). Perpetual access is skipped — nothing to
// renew. 1GiB + 540s: full paginated users/ scan, same shape as premiumExpiryCron.
export const premiumExpiryReminderCron = functions.scheduler.onSchedule(
  { schedule: '0 9 * * *', timeZone: 'UTC', region: 'us-central1', memory: '1GiB', timeoutSeconds: 540 },
  async () => {
    const summary = await runPremiumExpiryReminder();
    console.log('premiumExpiryReminderCron', JSON.stringify(summary));
    if (summary.candidates > 0 && summary.sent === 0) {
      console.error(
        `premiumExpiryReminderCron: ${summary.candidates} candidates found but 0 pushes sent — check Expo Push API.`,
      );
    }
  }
);

// Runs daily at 08:00 UTC. Pulls unread support emails from support.phraseman@gmail.com
// via IMAP into support_inbox (first run backfills ~50). Cheap: one run/day. Needs the
// GMAIL_SUPPORT_APP_PASSWORD secret; if missing, logs and no-ops (never throws).
export const gmailSupportPullCron = functions.scheduler.onSchedule(
  { schedule: '0 8 * * *', timeZone: 'UTC', region: 'us-central1', memory: '512MiB', timeoutSeconds: 300, secrets: [GMAIL_SUPPORT_APP_PASSWORD] },
  async () => {
    await runSupportInboxPullCron();
  }
);

// ── Community (UGC) packs ─────────────────────────────────────────────────────
export {
  communitySubmitPackForReview,
  communityModerateSubmission,
  communityAdminModeratePack,
  communityFetchPackCardsIfAccessible,
  communityPurchasePack,
  adminRefundCommunityPackPurchase,
  communityRedeemPackGiftVoucher,
  flashcardPackGiftRedeem,
  flashcardPackGiftGrantGlobalBroadcast,
  flashcardPackGiftSyncState,
  levelGiftReserve,
  levelGiftActivatePackGift,
  communityListSellerInbox,
  communityMarkSellerInboxSeen,
} from './community_packs';

export { syncFriendActivityMirrorCron } from './friend_activity_mirror';

// ── Деактивация истёкшего премиума/VIP по сроку (бессрочное не трогает) ───────
export { premiumExpiryCron } from './premium_expiry_cron';

// ── Авто-перенос VIP, выданного в осиротевший stable-документ, на canonical ───

export { friendSendGift } from './friend_gifts';

// ── ИИ-дайджест «что случилось за сутки» для владельца (admin-only, по кнопке) ─
export { adminGenerateDailyDigest, adminOpenDailyDigest, adminGetDailyBriefing } from './admin_daily_digest';
export { adminListAssetJobs, adminCreateAssetJob, adminRunAssetJob } from './admin_asset_studio';

// ── Почта поддержки (Gmail IMAP забор + ИИ-черновики + SMTP-отправка), admin ───
export {
  adminSupportPull,
  adminSupportList,
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
  adminSupportSetStatus,
} from './support_inbox';

// ── Ответы на репорты: персональное уведомление + клейм осколков + ИИ-черновик ─
export { adminReplyToReport, claimReportReward, adminDraftReportReply } from './report_replies';

// ── Admin grant (типизированные награды из админки) ───────────────────────────
export { adminGrantReward, adminSetShardBalance } from './admin_grant';
export { adminGrantAccess, adminSetUserBan } from './admin_access_controls';
export {
  adminDeleteDuplicateUser,
  adminMigrateLegacyAdminPremium,
  adminRequestUserMerge,
  adminResetUserProgress,
  adminResolveUserReport,
  adminUpdateUserProfileField,
  adminWarnUser,
} from './admin_user_operations';
export { adminQueueAccountDeletion } from './admin_account_delete';
export { adminGetComplianceOverview, adminListSafetyFlags, adminMarkSafetyFlagsHandled } from './admin_compliance';
// ── Починка/перепривязка auth-привязок из админки (permission users.auth_repair) ──
export { adminRepairAuthLink, adminRelinkProvider } from './admin_auth_repair';

// ── Промокоды-награды (юзер активирует код → дни премиума; админ создаёт код) ──
export { promoCodeRedeem, promoCodeUpsert, promoCodeBatchUpsert, promoCodeDelete, adminListPromoCodes } from './promo_codes';
export { openAiBudgetDashboard } from './openai_budget_dashboard';
export { adminProductAnalytics } from './admin_product_analytics';
export { adminSubscriptionAnalytics } from './admin_subscription_analytics';
export { adminMonthlyDecisionPack } from './admin_monthly_decision_pack';
export { adminGetAnalyticsSnapshot } from './admin_analytics';
export { adminGetRevenueCatOverviewMetrics } from './admin_revenuecat_overview';
export { adminGetAnalyticsTrends } from './admin_analytics_trends';
export { adminGetDirectorDigest } from './admin_director_digest';
export { adminGenerateDirectorDigestAudio } from './admin_director_digest_audio';
export { adminSearchUsers, adminGetUserProfile } from './admin_user_profile';
export { adminExportReportDocuments, adminExportUnresolvedReports, adminListReportQueue, adminUpdateReportStatus } from './admin_reports_center';
export { adminListAuditLog } from './admin_audit_log';
export { adminListOpsLog } from './admin_ops_log';
export { adminCreatePlan, adminGetPlan, adminListPlans } from './admin_plans';
// зачем здесь пусто (Р4, снос 2026-08-02): старые слои agent_office и
// agent_manager удалены целиком — их заменил functions/src/jarvis.
// Firestore Rules их коллекций СОХРАНЕНЫ намеренно: данные могли остаться,
// и прямой браузерный доступ к ним должен быть закрыт навсегда
// (сторожит jarvis/legacy_agent_rules_guard.test.ts).
// зачем: первый видимый рубеж нового Джарвиса (2026-08-01) — департамент
// «Качество» по требованию владельца через панель admin/v2/legacy.html.
// Старые agent_office/agent_manager выше не тронуты и сносятся отдельным
// шагом позже, когда у нового Джарвиса будет диалог и approvals.
export { jarvisGetQualitySnapshot, jarvisGetMoneySnapshot, jarvisGetGrowthSnapshot, jarvisGetAllDecisions, jarvisGetApprovalAudit } from './jarvis';
// зачем отдельно: owner-facing раздел «Стадия роста бизнеса» — своя пара
// callable (чтение панели + продолжаемый бэкфилл истории под строгим гейтом).
export { jarvisGetBusinessTier, jarvisRunBusinessTierBackfill } from './jarvis';
// зачем два крона: суточный проход департаментов (06:00 UTC) и точка истории
// бизнес-тиров (07:00 UTC, после устаканивания суточных счётчиков).
export { jarvisDailyDepartmentsCron, jarvisDailyBusinessHistoryCron } from './jarvis';

// Кнопки подтверждения в Telegram. Функция выключена (404), пока не задан
// секрет JARVIS_TELEGRAM_CONFIG; вебхук ставится вручную по runbook.
export { jarvisTelegramApprovalWebhook } from './jarvis';
export { adminGetRemoteConfigWorkspace, adminPublishRemoteConfig } from './admin_remote_config';
export { adminGetPaywallAbWorkspace, adminPublishPaywallAb } from './admin_paywall_ab';
export { adminGetPaywallVariantStats } from './admin_paywall_variant_stats';
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
} from './admin_app_messages';
export { adminGetAdminConfigWorkspace, adminPublishNavLayout, adminPublishAlertsConfig, adminTestAlerts } from './admin_config_controls';
export { adminResetLeaguePoints, adminMoveLeagueUser } from './admin_league_controls';
export {
  adminListGlobalBroadcasts,
  adminPublishGlobalBroadcast,
  adminDeactivateGlobalBroadcasts,
} from './admin_global_broadcast';
export { adminCreateContentGenerationJob, adminListContentFactoryJobs } from './admin_content_factory';
export { adminCreateContentStage, adminControlContentStage, adminListContentStages, adminListContentStageDependencies, adminGetContentStageCapabilities, adminPreviewContentStage, adminReviewContentStage } from './admin_content_stages';
export { adminCreateContentStageBulkPlan } from './admin_content_stage_bulk';
export { adminEditContentStageArtifact } from './admin_content_stage_edits';
export { adminRunContentStage, CONTENT_STAGE_OPENAI_API_KEY } from './content_stage_worker';
export { adminGetContentFactoryJobDetail, adminGetContentFactoryUnitPreview, adminGetContentFactoryWorkspace, adminGetContentFactoryRolloutMetrics } from './admin_content_factory_read';
export { adminRunContentGenerationUnit, CONTENT_FACTORY_OPENAI_API_KEY } from './content_factory_worker';
export { adminSaveV2EpisodeDraft, adminSaveV2SeasonDraft } from './admin_content_studio_callables';
export { adminReviewCourseGeneration, adminSealCourseRelease } from './admin_content_release';
export { adminActivateCourseRelease, adminRollbackCourseRelease } from './language_release';
export { openAiDialogModelConfig, openAiDialogQuotaConfig } from './openai_dialog_model_config';
export { openAiJobsConfig } from './openai_jobs_config';
export { adminTranslateMessage } from './admin_translate';
export { submitSettingsPollVote } from './settings_poll_vote';
export { adminEmailBroadcast, adminEmailContactsBackfill } from './admin_email';
export { emailUnsubscribe } from './email_unsubscribe';

export { dailyPhraseSetSaved } from './daily_phrases';

export { submitWebsiteContact } from './website_contact';

export { siteStatsTrack } from './site_stats';

export { recordOnboardingFunnelEvent, adminGetOnboardingFunnel } from './onboarding_funnel';
export { recordAgeConsentSnapshot } from './record_age_consent_snapshot';

export { revenueCatShardsWebhook } from './revenuecat_shards';
export { revenueCatPremiumReconcileMine } from './revenuecat_reconcile';

export { adminPushJobCreated, adminPushJobsCron } from './admin_push_jobs';

// ── Веб-оплата Premium с сайта (квиз-воронка /start/): Stripe + PayPal ────────
export {
  webCheckoutCreate,
  stripeWebhook,
  paypalOrderCreate,
  paypalOrderCapture,
  webOrderStatus,
  webPrices,
  adminCreateGiftCertificateBatch,
  adminListGiftCertificates,
  adminDeleteGiftCertificate,
  adminGetGiftCertificateDownload,
  adminUpdateGiftCertificateRecipient,
  adminUpdateGiftCertificatePersonalization,
  adminReplaceSyntheticGiftCertificate,
  adminSendPreparedGiftCertificate,
} from './web_checkout';

// ── Email-лиды квиза /start/ (письмо с планом + догоняющие) ───────────────────
export { webLeadCapture, webLeadNudgeCron } from './web_leads';

// ── Турниры (Фаза 1 MVP, спека docs/tournaments/2026-07-21-tournaments-mode-spec.md) ──
export {
  tournamentCreateRooms,
  tournamentJoin,
  tournamentLeave,
  tournamentForfeit,
  tournamentFillBots,
  tournamentAdvanceRooms,
  tournamentAdvanceRound,
  tournamentRoundReview,
  tournamentSubmitSpeedMatchAttempt,
  tournamentSubmitTaskAnswer,
  tournamentSubmitAnswers,
  tournamentFinalize,
  tournamentClaimReward,
  // зачем 2026-07-27 (владелец): дев-турнир убран, дев-логика не используется.
  // Мгновенный вход теперь даёт ОБЫЧНЫЙ турнир по требованию.
  tournamentStartNow,
} from './tournaments';
export { adminSeedBotProfiles } from './tournament_bots';
// Раздел «Турниры» в админке: генерация заданий из контента планов, ревью-очередь,
// публикация в пул, статистика готовности раундов, расписание слотов.
export {
  adminGenerateTournamentTasks,
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
} from './admin_tournament_tasks';

// Генерация ЦЕЛОГО турнира одним вызовом: 4 раунда × 6 заданий, каждому
// режиму свой тип вопроса (ситуация / пропуск / поиск ошибки / сборка).
export {
  adminGenerateTournamentAi,
  // Папки вопросов: перегенерация одного и массовые действия по папке.
  adminRegenerateTournamentTask,
  adminBulkTournamentFolder,
} from './admin_tournament_full';

// Недельный банк турниров: копится с каждого турнира, раздаётся тройке лучших
// по сумме очков в ночь воскресенья (крон) либо вручную из админки.
export {
  tournamentWeeklyBankCron,
  adminPayoutTournamentWeeklyBank,
  adminSetTournamentEconomy,
  adminGetTournamentEconomy,
  tournamentWeeklyBankInfo,
} from './tournament_weekly_payout';

// ── Arena question pool (генератор/пул вопросов, админ-инструментарий; сама игра Арена выведена из эксплуатации) ──
export { adminListArenaQuestionPool, adminPublishArenaQuestionBatch, adminRemoveArenaPoolQuestion, adminRestoreArenaPoolQuestion } from './admin_arena_question_pool';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { explainQuiz } = require('./explain_quiz');
exports.explainQuiz = explainQuiz;
// Learning V2 delayed evidence: server-classified, idempotent receipt finalization.
export { finalizeLearningV2DelayedCandidate } from './learning_v2_delayed_callable';
export { finalizeLearningV2AccessPurchase } from './learning_v2_access_production_callable';

// ── Рулетка Plus (спин-кредиты → дни VIP) и claim qualified-приглашений в прокруты ──
export { referralSpin } from './referral_spin';
export { referralClaimSpin } from './referral_claim_spin';
// DEV-кнопка «+1 прокрут» (гейт remote_config, лимит 10/сутки) — только для тестовых сборок.
export { referralDevGrantSpin } from './referral_dev_grant';

// ── Fan-out ленты активности друзей (users/{uid}/my_events → users/{friendUid}/feed) ──
export { feedFanoutOnMyEvent, feedPruneCron } from './feed_fanout';

// ── Пачковая выдача публичных профилей друзей (убирает 4-RTT цепочку с клиента) ──
export { friendsGetProfiles } from './friends_profiles';

// Authenticated, server-authoritative one-time onboarding access grant.
export { introFullAccessClaim } from './gift_access';

// ── Админ-callables раздела «Рефералы» (гейт custom claim admin) ──
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
} from './admin_referrals';

// Learning V2: генерация юнитов (E1 vertical slice) — очередь плана + воркер
export { adminCreateV2GenerationPlan, adminQueueV2GenerationPlan } from './admin_v2_generation';
export { adminSeedV2E1DemoSource, adminRunV2E1Compilation } from './content_factory/v2_e1_compilation_worker';
