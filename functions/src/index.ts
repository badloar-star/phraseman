// зачем: 2026-08-23 — контент-фабрика Learning V2 (9 функций) переехала в
// кодбазу functions-content. Замер: она тянула в память все авторские сессии
// курса и стоила 236 МБ из 380 МБ основного бандла, то есть за неё платили
// все 240 функций при каждом холодном старте. Деплой: functions:content.
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2";
import { getLevelFromXP } from "./xp_levels";
import {
  HELP_BOARD_DECOMMISSIONED_EXPORTS,
  compassChatDailyCronDisabled,
  helpBoardCompassRetryCronDisabled,
  helpBoardGenerateCompassForTopicDisabled,
} from "./help_board_decommission";

admin.initializeApp();

// These imports must come AFTER initializeApp() — use require to control order
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resetWeeklyXp } = require("./reset_weekly_xp");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { computeLeaderboardStats } = require("./compute_leaderboard_stats");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runReEngagePush } = require("./re_engage_push") as {
  runReEngagePush: (now?: number) => Promise<{
    scanned: number;
    candidates: number;
    sent: number;
    failedChunks: number;
    ticketCount: number;
  }>;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runPremiumExpiryReminder } = require("./premium_expiry_reminder") as {
  runPremiumExpiryReminder: (now?: number) => Promise<{
    scanned: number;
    candidates: number;
    sent: number;
    failed: number;
  }>;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  runSupportInboxPullCron,
  runSupportOwnerReplyDetectionCron,
  runSupportOwnerAlertRetryCron,
  runSupportReplyDispatchSweeper,
  runSupportAutoReplyRetryCron,
  runSupportTelegramAutoSendDeadline,
  runSupportTelegramReplyJobRecovery,
  GMAIL_SUPPORT_APP_PASSWORD,
  SUPPORT_OPENAI_API_KEY,
} = require("./support_inbox") as {
  runSupportInboxPullCron: () => Promise<unknown>;
  runSupportOwnerReplyDetectionCron: () => Promise<unknown>;
  runSupportOwnerAlertRetryCron: () => Promise<unknown>;
  runSupportReplyDispatchSweeper: () => Promise<unknown>;
  runSupportAutoReplyRetryCron: () => Promise<unknown>;
  runSupportTelegramAutoSendDeadline: () => Promise<unknown>;
  runSupportTelegramReplyJobRecovery: () => Promise<unknown>;
  GMAIL_SUPPORT_APP_PASSWORD: import("firebase-functions/params").SecretParam;
  SUPPORT_OPENAI_API_KEY: import("firebase-functions/params").SecretParam;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { JARVIS_TELEGRAM_CONFIG } =
  require("./jarvis/telegram_owner_config") as {
    JARVIS_TELEGRAM_CONFIG: import("firebase-functions/params").SecretParam;
  };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  leagueJoinOrUpdateGroup,
  leagueUpdateMyMember,
  leagueSyncMyBoost,
  leagueActivateGroupBoost,
} = require("./league_groups");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  authEnsureStableLink,
  authStampAnonOwnership,
  authRecoveryHint,
} = require("./auth_identity");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  authRequestRecoveryCode,
  authConfirmRecoveryCode,
  authRequestCleanInstallRecoveryCode,
  authConfirmCleanInstallRecoveryCode,
  authCleanInstallRecoveryDeliveryWorker,
  authIssueRecoveryHandoffToken,
  authCompleteRecoveryHandoff,
} = require("./auth_recovery");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  authMergeStableAccounts,
  accountMergeOutboxWorker,
  accountMergeOutboxRetryCron,
} = require("./auth_merge");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { accountDeleteMine, accountDeleteEnqueue } = require("./account_delete");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  accountDeleteWorker,
  accountDeleteRetryCron,
} = require("./account_delete_worker");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  leaderboardUpdateDailyAnalytics,
  nameCheckAvailability,
  nameGenerateAndReserve,
  nameReserve,
  nameReleaseMine,
} = require("./leaderboard");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueChestClaim } = require("./league_chest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendEnsureMyCode } = require("./friend_codes");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendLookupUser } = require("./friend_lookup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  friendLikeActivity,
  friendUnlikeActivity,
} = require("./friend_activity_likes");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  friendSendGift,
  friendThankGift,
  friendConsumeChainShield,
  friendGetActiveQuest,
  friendClaimQuestReward,
} = require("./friend_gifts");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  cleanupExpiredAppMessages,
  onAppMessageReactionWritten,
  onAppMessagePollVoteWritten,
  onAppMessageStateWritten,
} = require("./app_messages");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitVipSurvey, recordVipSurveyReviewClick } = require("./vip_survey");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitClientReport } = require("./client_reports");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  telegramPremiumWebhook,
  telegramPremiumActivationNotifier,
} = require("./telegram_premium_bot");
// Legacy paid pronunciation-scoring callable удалён: 0 клиентских вызовов, OpenAI-эндпоинт
// без App Check был доступен любому. Оценка произношения теперь on-device. (B1 audit)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  referralEnsureMyCode,
  referralApply,
  referralOnUserProgressUpdated,
  referralClaimVipReward,
  referralListMyInvites,
} = require("./referral");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  premiumDialogSend,
  premiumDialogTranslate,
} = require("./premium_dialog");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { premiumDialogReview } = require("./premium_dialog_review");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { premiumDialogStream } = require("./premium_dialog_stream");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { maxVoiceConfigAdmin } = require("./max_voice_config");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { adminWarmInstanceGauge } = require("./warm_instance_gauge");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { weeklyReviewGenerate } = require("./weekly_review");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { statsInsightsGenerate } = require("./stats_insights");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { explainPhrase } = require("./explain_phrase");
const { explainChoice } = require("./explain_choice");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { explainMistake } = require("./mistake_explain");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitExplainReport } = require("./explain/explain_reports");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { vipRevokeMine } = require("./vip_revoke");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { collectiblesClaimDrop } = require("./collectibles");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  submitShardSurvey,
  getActiveShardSurvey,
  adminWriteShardSurvey,
  adminDeleteShardSurvey,
} = require("./shard_survey");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { shardsApplyDelta } = require("./shards_apply_delta");
// eslint-disable-next-line @typescript-eslint/no-var-requires
// зачем: железное правило владельца — дев-начисление ВСЕГДА идёт на сервер и
// работает для ЛЮБОГО аккаунта. В проде путь мёртв: серверный рубильник
// remote_config/app.numbers.dev_shards_grant_enabled по умолчанию выключен.
const { devShardsGrant } = require("./dev_shards_grant");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  getCoinExchangeQuote,
  getCoinExchangeHistory,
  exchangeCoinsForStars,
  adminSetCoinExchangeRate,
  recalcCoinExchangeRate,
  adminGetCoinExchangeCenter,
} = require("./coin_exchange");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  getLearningV2AccountBinding,
  resolveLearningV2WalletRewardReceipt,
} = require("./learning_v2_wallet_reward_callable");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { grantMistakeCorrectionReward } = require("./mistake_practice_wallet_reward");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mistakePracticeSyncEvents } = require("./mistake_practice_event_sync");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  authorizeLearningV2CourseUnlock,
  resolveLearningV2CourseUnlockReceipt,
} = require("./learning_v2_course_unlock");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { profileCardUpgrade } = require("./profile_card_upgrade");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  submitUserIdea,
  adminListUserIdeas,
  adminDecideUserIdea,
  adminDraftIdeaDecision,
} = require("./user_ideas");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueFinalizeCron } = require("./league_finalize_cron");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueResidentsTickCron } = require("./league_residents_cron");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  notifyOnFriendRequestCreated,
  notifyOnFriendAccepted,
  userNotificationsCleanupCron,
} = require("./user_notifications");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  progressSubmitEvent,
  progressMigrateSnapshot,
} = require("./progress_events");
// Learning V2 uploads one immutable completion packet only after the local
// session is over. The active lesson never calls this endpoint.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  createRequiredSessionCompletionProductionCallable,
} = require("./learning_v2/required_session_completion_callable");
const submitLearningV2RequiredSessionCompletion =
  createRequiredSessionCompletionProductionCallable();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  ADMIN_ALERT_BOT_TOKEN,
  adminAlertOnUserReport,
  adminAlertOnCriticalError,
  adminAlertOnAuthFailureSpike,
  adminAlertOnContentReport,
  adminAlertContentReportDigest,
  adminAlertOnCancelSurvey,
  adminAlertOnUgcRefund,
  adminAlertOnConfigWritten,
} = require("./admin_alerts");

exports.leagueJoinOrUpdateGroup = leagueJoinOrUpdateGroup;
exports.leagueUpdateMyMember = leagueUpdateMyMember;
exports.leagueSyncMyBoost = leagueSyncMyBoost;
exports.leagueActivateGroupBoost = leagueActivateGroupBoost;
exports.authEnsureStableLink = authEnsureStableLink;
exports.authStampAnonOwnership = authStampAnonOwnership;
exports.authRecoveryHint = authRecoveryHint;
exports.authRequestRecoveryCode = authRequestRecoveryCode;
exports.authConfirmRecoveryCode = authConfirmRecoveryCode;
exports.authRequestCleanInstallRecoveryCode =
  authRequestCleanInstallRecoveryCode;
exports.authConfirmCleanInstallRecoveryCode =
  authConfirmCleanInstallRecoveryCode;
exports.authCleanInstallRecoveryDeliveryWorker =
  authCleanInstallRecoveryDeliveryWorker;
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
// зачем: Help Board и Compass-чат удалены владельцем (9af87817d), но живут в
// проде — гасим надгробиями, чтобы старые клиенты получали внятный отказ,
// а не ошибку соединения. Подробности — в help_board_decommission.ts.
Object.assign(exports, HELP_BOARD_DECOMMISSIONED_EXPORTS);
exports.helpBoardGenerateCompassForTopic =
  helpBoardGenerateCompassForTopicDisabled;
exports.helpBoardCompassRetryCron = helpBoardCompassRetryCronDisabled;
exports.compassChatDailyCron = compassChatDailyCronDisabled;
exports.friendEnsureMyCode = friendEnsureMyCode;
exports.friendLookupUser = friendLookupUser;
exports.friendLikeActivity = friendLikeActivity;
exports.friendUnlikeActivity = friendUnlikeActivity;
exports.friendSendGift = friendSendGift;
exports.friendThankGift = friendThankGift;
exports.friendConsumeChainShield = friendConsumeChainShield;
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
// зачем: функция создана в 04668600d, но экспорт потерялся при последующем рефакторинге
// index.ts — восстановлено 2026-08-17, второй путь квалификации (отложенная покупка) не деплоился.
exports.referralOnUserProgressUpdated = referralOnUserProgressUpdated;
exports.referralClaimVipReward = referralClaimVipReward;
exports.referralListMyInvites = referralListMyInvites;
exports.premiumDialogSend = premiumDialogSend;
exports.premiumDialogTranslate = premiumDialogTranslate;
exports.premiumDialogReview = premiumDialogReview;
// Стриминговый диалог (SSE): первое слово ответа видно почти сразу.
exports.premiumDialogStream = premiumDialogStream;
exports.maxVoiceConfigAdmin = maxVoiceConfigAdmin;
// зачем: шкала «когда можно отключать тёплый инстанс» в Пульте админки (2026-08-22).
exports.adminWarmInstanceGauge = adminWarmInstanceGauge;
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
exports.submitLearningV2RequiredSessionCompletion =
  submitLearningV2RequiredSessionCompletion;
exports.adminAlertOnUserReport = adminAlertOnUserReport;
exports.adminAlertOnCriticalError = adminAlertOnCriticalError;
exports.adminAlertOnAuthFailureSpike = adminAlertOnAuthFailureSpike;
exports.adminAlertOnContentReport = adminAlertOnContentReport;
exports.adminAlertContentReportDigest = adminAlertContentReportDigest;
exports.adminAlertOnCancelSurvey = adminAlertOnCancelSurvey;
exports.adminAlertOnUgcRefund = adminAlertOnUgcRefund;
exports.adminAlertOnConfigWritten = adminAlertOnConfigWritten;
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
exports.resolveLearningV2WalletRewardReceipt =
  resolveLearningV2WalletRewardReceipt;
exports.getLearningV2AccountBinding = getLearningV2AccountBinding;
exports.grantMistakeCorrectionReward = grantMistakeCorrectionReward;
exports.mistakePracticeSyncEvents = mistakePracticeSyncEvents;
exports.authorizeLearningV2CourseUnlock = authorizeLearningV2CourseUnlock;
exports.resolveLearningV2CourseUnlockReceipt =
  resolveLearningV2CourseUnlockReceipt;
exports.profileCardUpgrade = profileCardUpgrade;
exports.submitUserIdea = submitUserIdea;
exports.adminListUserIdeas = adminListUserIdeas;
exports.adminDecideUserIdea = adminDecideUserIdea;
exports.adminDraftIdeaDecision = adminDraftIdeaDecision;
exports.leagueFinalizeCron = leagueFinalizeCron;
// Жители лиг: раз в 6 часов растёт их опыт/уровень/аватар (владелец 2026-08-04).
exports.leagueResidentsTickCron = leagueResidentsTickCron;

// ─── Leaderboard percentile stats cron ──────────────────────────────────────
// Runs daily. Computes p1-p99 thresholds for XP, streak and recent activity.
// and writes them to leaderboard_stats/global for all clients to read.
// memory: 1GiB + timeout 540s — крон агрегирует перцентили, держа в памяти XP/streak/time
// всех eligible-юзеров (полный скан users + leaderboard постранично). На дефолтных 256MiB
// падал OOM ежедневно (perсentile-статистика переставала обновляться).
export const computeLeaderboardStatsCron = functions.scheduler.onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "UTC",
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async () => {
    await computeLeaderboardStats();
  },
);

// ─── Weekly XP reset cron (XP-02) ────────────────────────────────────────────
// Runs every Monday 00:00 UTC. Zeroes progress.weekly_xp for ALL users without
// touching progress.user_total_xp. Cron expression '0 0 * * 1' = at 00:00 on Monday.
export const resetWeeklyXpCron = functions.scheduler.onSchedule(
  { schedule: "0 0 * * 1", timeZone: "UTC" },
  async () => {
    await resetWeeklyXp();
  },
);

export const cleanupExpiredAppMessagesCron = functions.scheduler.onSchedule(
  { schedule: "0 4 * * *", timeZone: "UTC" },
  async () => {
    await cleanupExpiredAppMessages();
  },
);

// ─── Re-engagement push cron ─────────────────────────────────────────────────
// Runs daily at 10:00 UTC. Scans users/, finds players whose streak is about to
// break or who have been away 3-14 days, and sends them a localized push via the
// Expo Push API (delivers through FCM/APNs even to a closed app). Closes the
// retention gap where local-only notifications never reach a lapsed user.
/**
 * зачем (2026-08-23, P2-1): учитель MAX обещает тему на завтра, а приложение
 * молчало. Крон ходит РАЗ В ЧАС, потому что напоминание уходит в «час прошлого
 * урока» — у каждого ученика он свой. На пустой базе прогон стоит один запрос
 * по индексу: кандидаты берутся из памяти учителя (where nextTopic != ''),
 * а не обходом коллекции users.
 */
export const maxLessonReminderCron = functions.scheduler.onSchedule(
  { schedule: "5 * * * *", timeZone: "UTC" },
  async () => {
    const { runLessonReminderPush } = await import("./max_lesson_reminder_push");
    const summary = await runLessonReminderPush();
    if (summary.candidates > 0 || summary.sent > 0) {
      console.log("maxLessonReminderCron", JSON.stringify(summary));
    }
    if (summary.failedChunks > 0) {
      console.error(
        `maxLessonReminderCron: ${summary.failedChunks} chunk(s) failed — ` +
          `sent ${summary.sent}/${summary.eligible} eligible.`,
      );
    }
  },
);

export const reEngagePushCron = functions.scheduler.onSchedule(
  { schedule: "0 10 * * *", timeZone: "UTC" },
  async () => {
    const summary = await runReEngagePush();
    console.log("reEngagePushCron", JSON.stringify(summary));
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
  },
);

// Runs daily at 09:00 UTC. Scans users/, finds paid subscriptions/VIP whose
// concrete expiry is ~3 days out, and sends a warm localized "your Plus renews
// soon" push. Profilaxis of churn (complements premiumExpiryCron, which only
// deactivates already-expired access). Perpetual access is skipped — nothing to
// renew. 1GiB + 540s: full paginated users/ scan, same shape as premiumExpiryCron.
export const premiumExpiryReminderCron = functions.scheduler.onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "UTC",
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async () => {
    const summary = await runPremiumExpiryReminder();
    console.log("premiumExpiryReminderCron", JSON.stringify(summary));
    if (summary.candidates > 0 && summary.sent === 0) {
      console.error(
        `premiumExpiryReminderCron: ${summary.candidates} candidates found but 0 pushes sent — check Expo Push API.`,
      );
    }
  },
);

// Owner requirement 2026-08-11: one bounded mailbox poll per hour.
// Pulls support emails via IMAP into support_inbox. Needs the
// GMAIL_SUPPORT_APP_PASSWORD secret; if missing, logs and no-ops (never throws).
export const gmailSupportPullCron = functions.scheduler.onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "UTC",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    secrets: [GMAIL_SUPPORT_APP_PASSWORD],
  },
  async () => {
    await runSupportInboxPullCron();
  },
);

// Owner requirement 2026-08-16: "если на сообщение уже ответили, на него не
// надо повторно отвечать". gmailSupportPullCron only reads INBOX — a reply
// the owner sends directly from Gmail (not through the admin panel) was
// invisible to Jarvis, leaving a stale Telegram card with live buttons for
// an already-answered question. This scans Sent on the same hourly cadence
// as the INBOX pull (same bounded-poll budget, no extra load).
export const gmailSupportOwnerReplyDetectionCron = functions.scheduler.onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "UTC",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    secrets: [GMAIL_SUPPORT_APP_PASSWORD],
  },
  async () => {
    await runSupportOwnerReplyDetectionCron();
  },
);

export const supportOwnerAlertRetryCron = functions.scheduler.onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "UTC",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 120,
    secrets: [ADMIN_ALERT_BOT_TOKEN, JARVIS_TELEGRAM_CONFIG],
  },
  async () => {
    await runSupportOwnerAlertRetryCron();
  },
);

export const supportReplyDispatchSweeperCron = functions.scheduler.onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "UTC",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async () => {
    await runSupportReplyDispatchSweeper();
  },
);

export const supportAutoReplyRetryCron = functions.scheduler.onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "UTC",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    secrets: [
      GMAIL_SUPPORT_APP_PASSWORD,
      SUPPORT_OPENAI_API_KEY,
      ADMIN_ALERT_BOT_TOKEN,
      JARVIS_TELEGRAM_CONFIG,
    ],
  },
  async () => {
    await runSupportAutoReplyRetryCron();
  },
);

// This checks only already prepared reviews; it does not poll Gmail. A ten
// minute cadence keeps the promised three-hour window bounded to 3h–3h10m.
export const supportTelegramAutoSendDeadlineCron =
  functions.scheduler.onSchedule(
    {
      schedule: "every 10 minutes",
      timeZone: "UTC",
      region: "us-central1",
      memory: "256MiB",
      timeoutSeconds: 120,
    },
    async () => {
      await runSupportTelegramAutoSendDeadline();
    },
  );

// Recovers only pending or abandoned pre-delivery jobs. The durable SMTP
// operation remains the authority: delivery_unknown is terminal and is never
// blindly retried here.
export const supportTelegramReplyJobRecoveryCron =
  functions.scheduler.onSchedule(
    {
      schedule: "every 10 minutes",
      timeZone: "UTC",
      region: "us-central1",
      memory: "512MiB",
      timeoutSeconds: 300,
      secrets: [
        GMAIL_SUPPORT_APP_PASSWORD,
        SUPPORT_OPENAI_API_KEY,
        ADMIN_ALERT_BOT_TOKEN,
        JARVIS_TELEGRAM_CONFIG,
      ],
    },
    async () => {
      await runSupportTelegramReplyJobRecovery();
    },
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
  levelSpinActivatePackGift,
  communityListSellerInbox,
  communityMarkSellerInboxSeen,
} from "./community_packs";


// Learning V2 learner-safe active-session descriptor. Auth + App Check are
// enforced in the callable module; no private repository handle is serialized.
export { submitLearningV2ActivityReleasedCompletionV1 } from "./learning_v2/activity_released_session_completion_callable_v1";
export { submitLearningV2CourseSessionCompletedV1 } from "./learning_v2/course_session_completed_summary_callable_v1";

// ── Деактивация истёкшего премиума/VIP по сроку (бессрочное не трогает) ───────
export { premiumExpiryCron } from "./premium_expiry_cron";

// ── Авто-перенос VIP, выданного в осиротевший stable-документ, на canonical ───

export { friendSendGift } from "./friend_gifts";

// ── ИИ-дайджест «что случилось за сутки» для владельца (admin-only, по кнопке) ─
export {
  adminGenerateDailyDigest,
  adminOpenDailyDigest,
  adminGetDailyBriefing,
} from "./admin_daily_digest";
export {
  adminListAssetJobs,
  adminCreateAssetJob,
  adminRunAssetJob,
} from "./admin_asset_studio";

// ── Почта поддержки (Gmail IMAP забор + ИИ-черновики + SMTP-отправка), admin ───
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
  // Триггер спам-триажа/уведомлений Джарвиса — покрыт support_inbox_triage.test.ts
  // (мокает Firestore/OpenAI/Telegram и вызывает реальный хендлер напрямую).
  supportInboxOnNewMail,
  supportTelegramReplyJobOnCreate,
} from "./support_inbox";

// ── Ответы на репорты: персональное уведомление + клейм осколков + ИИ-черновик ─
export {
  adminReplyToReport,
  claimReportReward,
  adminDraftReportReply,
} from "./report_replies";

// ── Admin grant (типизированные награды из админки) ───────────────────────────
export { adminGrantReward, adminSetShardBalance } from "./admin_grant";
export { adminGrantAccess, adminSetUserBan } from "./admin_access_controls";
export {
  adminDeleteDuplicateUser,
  adminMigrateLegacyAdminPremium,
  adminRequestUserMerge,
  adminResetUserProgress,
  adminResolveUserReport,
  adminUpdateUserProfileField,
  adminWarnUser,
} from "./admin_user_operations";
export { adminQueueAccountDeletion } from "./admin_account_delete";
export {
  adminGetComplianceOverview,
  adminListSafetyFlags,
  adminMarkSafetyFlagsHandled,
} from "./admin_compliance";
// ── Починка/перепривязка auth-привязок из админки (permission users.auth_repair) ──
export { adminRepairAuthLink, adminRelinkProvider } from "./admin_auth_repair";

// ── Промокоды-награды (юзер активирует код → дни премиума; админ создаёт код) ──
export {
  promoCodeRedeem,
  promoCodeUpsert,
  promoCodeBatchUpsert,
  promoCodeDelete,
  adminListPromoCodes,
} from "./promo_codes";
export { openAiBudgetDashboard } from "./openai_budget_dashboard";
export { adminProductAnalytics } from "./admin_product_analytics";
export { adminSubscriptionAnalytics } from "./admin_subscription_analytics";
export { adminMonthlyDecisionPack } from "./admin_monthly_decision_pack";
export { adminGetAnalyticsSnapshot } from "./admin_analytics";
export { adminGetRevenueCatOverviewMetrics } from "./admin_revenuecat_overview";
// зачем: 2026-08-23 — боевые функции MAX (12 шт.) переехали в отдельную
// кодбазу functions-max: старт этой кодбасы грузит 240 функций (370 МБ,
// 2.2 с), а MAX-кодбаза — только свои 12 (78 МБ, 0.44 с). Админские
// maxVoiceConfigAdmin и adminGetMaxVoiceOpsDashboard остались здесь, рядом
// с остальной админкой. Правки в functions/src/max_voice_* попадают в обе
// сборки: functions-max компилирует те же исходники (rootDir "..").
export { adminGetMaxVoiceOpsDashboard } from "./max_voice_ops_dashboard";
export { adminListShardRefunds } from "./admin_shard_refunds";
export { adminGetAnalyticsTrends } from "./admin_analytics_trends";
export { adminGetDirectorDigest } from "./admin_director_digest";
export { adminGenerateDirectorDigestAudio } from "./admin_director_digest_audio";
export { adminSearchUsers, adminGetUserProfile } from "./admin_user_profile";
export {
  adminExportReportDocuments,
  adminExportUnresolvedReports,
  adminListReportQueue,
  adminUpdateReportStatus,
} from "./admin_reports_center";
export { adminListAuditLog } from "./admin_audit_log";
export { adminListOpsLog } from "./admin_ops_log";
export { adminCreatePlan, adminGetPlan, adminListPlans } from "./admin_plans";
// зачем здесь пусто (Р4, снос 2026-08-02): старые слои agent_office и
// agent_manager удалены целиком — их заменил functions/src/jarvis.
// Firestore Rules их коллекций СОХРАНЕНЫ намеренно: данные могли остаться,
// и прямой браузерный доступ к ним должен быть закрыт навсегда
// (сторожит jarvis/legacy_agent_rules_guard.test.ts).
// зачем: первый видимый рубеж нового Джарвиса (2026-08-01) — департамент
// «Качество» по требованию владельца через панель admin/v2/legacy.html.
// Старые agent_office/agent_manager выше не тронуты и сносятся отдельным
// шагом позже, когда у нового Джарвиса будет диалог и approvals.
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
} from "./jarvis";
// зачем отдельно: owner-facing раздел «Стадия роста бизнеса» — своя пара
// callable (чтение панели + продолжаемый бэкфилл истории под строгим гейтом).
export { jarvisGetBusinessTier, jarvisRunBusinessTierBackfill } from "./jarvis";
// зачем три крона: суточный проход департаментов (06:00 UTC), точка истории
// бизнес-тиров (07:00 UTC, после устаканивания суточных счётчиков) и
// еженедельная проверка, не пора ли пересматривать устав продукта — она пишет
// в телеграм, только когда чей-то срок подошёл (владелец, 2026-08-16).
export {
  jarvisDailyDepartmentsCron,
  jarvisDailyBusinessHistoryCron,
  jarvisProductKnowledgeReviewCron,
} from "./jarvis";

// Кнопки подтверждения в Telegram. Функция выключена (404), пока не задан
// секрет JARVIS_TELEGRAM_CONFIG; вебхук ставится вручную по runbook.
export { jarvisTelegramApprovalWebhook } from "./jarvis";

// Устав Phraseman: описание продукта, на которое опирается Джарвис. Правится в
// админке, каждая версия сохраняется в неизменяемую историю (владелец,
// 2026-08-16). Источник — база; файл knowledge/product.md остаётся запасным.
export { adminGetProductCharter, adminSaveProductCharter } from "./admin_product_charter";
export {
  adminGetRemoteConfigWorkspace,
  adminPublishRemoteConfig,
} from "./admin_remote_config";
export {
  youtubeCatalogSyncCron,
  adminGetYoutubeCatalogWorkspace,
  adminPublishYoutubeCatalogConfig,
  adminRefreshYoutubeCatalog,
} from "./youtube_catalog";
export {
  adminGetPaywallAbWorkspace,
  adminPublishPaywallAb,
} from "./admin_paywall_ab";
export { adminGetPaywallVariantStats } from "./admin_paywall_variant_stats";
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
} from "./admin_app_messages";
export {
  adminGetAdminConfigWorkspace,
  adminPublishNavLayout,
  adminPublishAlertsConfig,
  adminTestAlerts,
} from "./admin_config_controls";
export {
  adminResetLeaguePoints,
  adminMoveLeagueUser,
} from "./admin_league_controls";
export {
  adminListGlobalBroadcasts,
  adminPublishGlobalBroadcast,
  adminDeactivateGlobalBroadcast,
  adminScrubGlobalBroadcastMetadata,
  adminVerifyGlobalBroadcastPrivacyReadiness,
  adminDeactivateGlobalBroadcasts,
} from "./admin_global_broadcast";
export {
  adminCreateContentGenerationJob,
  adminListContentFactoryJobs,
} from "./admin_content_factory";
export {
  adminCreateContentStage,
  adminControlContentStage,
  adminListContentStages,
  adminGetLearningV2CourseWorkspaceProjection,
  adminListContentStageDependencies,
  adminGetContentStageCapabilities,
  adminPreviewContentStage,
  adminReviewContentStage,
} from "./admin_content_stages";
export { adminCreateContentStageBulkPlan } from "./admin_content_stage_bulk";
export { adminEditContentStageArtifact } from "./admin_content_stage_edits";
export {
  adminRunContentStage,
  CONTENT_STAGE_OPENAI_API_KEY,
} from "./content_stage_worker";
export {
  learningV2LocalizedCourseShardBackgroundWorker,
  adminPreviewLearningV2CourseWave,
  adminApproveLearningV2CourseWave,
  adminRejectLearningV2CourseWave,
  LEARNING_V2_COURSE_SHARD_OPENAI_API_KEY,
} from "./content_factory/learning_v2_course_shard_background";
// зачем: без экспорта функции просто нет на сервере. Именно её отсутствие
// давало head_missing и «Сессия недоступна / NOT FOUND» — публиковать курс
// было нечем.
export {
  adminGetContentFactoryJobDetail,
  adminGetContentFactoryUnitPreview,
  adminGetContentFactoryWorkspace,
  adminGetContentFactoryRolloutMetrics,
} from "./admin_content_factory_read";
export {
  adminRunContentGenerationUnit,
  CONTENT_FACTORY_OPENAI_API_KEY,
} from "./content_factory_worker";
export {
  adminSaveV2EpisodeDraft,
  adminSaveV2SeasonDraft,
} from "./admin_content_studio_callables";
export {
  adminReviewCourseGeneration,
  adminSealCourseRelease,
} from "./admin_content_release";
export {
  adminActivateCourseRelease,
  adminRollbackCourseRelease,
} from "./language_release";
export {
  openAiDialogModelConfig,
  openAiDialogQuotaConfig,
} from "./openai_dialog_model_config";
export { openAiJobsConfig } from "./openai_jobs_config";
export { adminTranslateMessage } from "./admin_translate";
export { submitSettingsPollVote } from "./settings_poll_vote";
export { adminEmailBroadcast, adminEmailContactsBackfill } from "./admin_email";
export { emailUnsubscribe } from "./email_unsubscribe";

export { dailyPhraseSetSaved } from "./daily_phrases";

export { submitWebsiteContact } from "./website_contact";

export { siteStatsTrack } from "./site_stats";

export {
  recordOnboardingFunnelEvent,
  adminGetOnboardingFunnel,
} from "./onboarding_funnel";
export { recordAgeConsentSnapshot } from "./record_age_consent_snapshot";
export { recordAiExplainConsent } from "./record_ai_explain_consent";
export { recordAiDialogConsent } from "./record_ai_dialog_consent";
export { recordAiVoiceConsent } from "./record_ai_voice_consent";

export { revenueCatShardsWebhook } from "./revenuecat_shards";
export { revenueCatPremiumReconcileMine } from "./revenuecat_reconcile";

export { adminPushJobCreated, adminPushJobsCron } from "./admin_push_jobs";
export { adminUserBriefs } from "./admin_user_briefs";

// ── Веб-оплата Premium с сайта (квиз-воронка /start/): Stripe + PayPal ────────
export {
  webCheckoutCreate,
  stripeWebhook,
  paypalOrderCreate,
  paypalOrderCapture,
  webOrderStatus,
  webPrices,
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
} from "./web_checkout";

// ── Email-лиды квиза /start/ (письмо с планом + догоняющие) ───────────────────
export { webLeadCapture, webLeadNudgeCron } from "./web_leads";

// ── Турниры (Фаза 1 MVP, спека docs/tournaments/2026-07-21-tournaments-mode-spec.md) ──
// ⛔ ТУРНИРЫ ВЫКЛЮЧЕНЫ ФУЛЛ (владелец, 2026-08-23). НЕ ВКЛЮЧАТЬ ОБРАТНО.
// зачем: логика уже была заглушена гейтом TOURNAMENTS_RELEASED=false (2026-08-10),
// но три крона оставались ЗАДЕПЛОЕНЫ и тикали вхолостую — два каждую минуту
// (tournamentFillBots, tournamentAdvanceRooms) и один раз в 5 минут
// (tournamentCreateRooms). Они просыпались только чтобы упереться в `if
// (!TOURNAMENTS_RELEASED) return;` — ~95 000 холостых запусков в месяц за деньги.
// Экспорт снят => Firebase удаляет расписания. Callable-функции турниров
// оставлены на месте: они и так фейлятся гейтом, а tournamentClaimReward нужен,
// чтобы никто не потерял уже начисленную награду.
// Возврат = отдельное задание владельца, не попутная правка.
export {
  tournamentJoin,
  tournamentLeave,
  tournamentForfeit,
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
} from "./tournaments";
export { adminSeedBotProfiles } from "./tournament_bots";

// Управление конфигом Арены из админки. Без документа arena_v2_config/current
// бэкенд Арены отказывает во всём — это и есть корневая причина «не работает».
export { adminArenaConfigGet, adminArenaConfigSet } from "./admin_arena_config";
// Arena V2 is a separate server-authoritative duel runtime. It reuses only
// reviewed Tournament task publications; Tournament release gates, rooms and
// economy remain untouched.
export {
  arenaV2Home,
  arenaV2FindMatch,
  // Сведение со стороны сервера в момент входа в очередь. Не крон: реагирует
  // на событие. Без него пара возникала только когда чей-то телефон
  // переспросит — раз в 15 секунд и лишь на видимом экране.
  arenaV2OnQueueWrite,
  arenaV2QueueCancel,
  arenaV2QuickBotFallback,
  arenaV2MatchAccept,
  arenaV2MatchDecline,
  // Дуэль v3: план выдаётся одним вызовом, отчёт принимается одним вызовом.
  // Пошаговые arenaV2SubmitAnswer/SubmitSpeedAttempt остаются ради матчей,
  // начатых старой сборкой; новые матчи через них не идут.
  arenaV2MatchPlan,
  arenaV2MatchFinish,
  arenaV2MatchSettle,
  arenaV2SubmitAnswer,
  arenaV2SubmitSpeedAttempt,
  arenaV2SyncMatch,
  arenaV2Forfeit,
  arenaV2InviteCreate,
  arenaV2InviteAccept,
  arenaV2InviteDecline,
  arenaV2InviteCancel,
  arenaV2InviteReady,
  arenaV2InviteStatus,
  arenaV2DevFriendBotCreate,
  arenaV2FriendsBoard,
  arenaV2SeasonClaim,
  arenaV2SpinStatus,
  arenaV2SpinClaim,
  arenaV2CleanupHourly,
} from "./arena_v2";
// Arena Expansion layers Today, review/mastery, asynchronous social play and
// a spendable cosmetic wallet on top of the V2 authority boundary. Every
// surface remains independently fail-closed in arena_v2_config/current.
export {
  arenaExpansionHome,
  arenaTodayStart,
  arenaTodaySubmitAnswer,
  arenaTodaySubmitSpeedAttempt,
  arenaTodaySync,
  arenaMatchLabGet,
  arenaGhostCreate,
  arenaGhostAccept,
  arenaGhostStatus,
  arenaGhostDecline,
  arenaRivalPropose,
  arenaRivalAccept,
  arenaRivalNext,
  arenaRivalLeave,
  arenaRivalMute,
  arenaPartnerInvite,
  arenaPartnerAccept,
  arenaPartnerPause,
  arenaPartnerPreferences,
  arenaPartnerNudge,
  arenaPartnerRemove,
  arenaPartnerClaimSpotlight,
  arenaStarStore,
  arenaStarPurchase,
  arenaStarEquip,
} from "./arena_expansion";
// Раздел «Турниры» в админке: ИИ-генерация, ревью-очередь, публикация в пул,
// статистика готовности раундов и расписание слотов.
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
} from "./admin_tournament_tasks";

// Генерация ЦЕЛОГО турнира одним вызовом: 4 раунда × 6 заданий, каждому
// режиму свой тип вопроса (ситуация / пропуск / поиск ошибки / сборка).
export {
  adminGenerateTournamentAi,
  // Папки вопросов: перегенерация одного и массовые действия по папке.
  adminRegenerateTournamentTask,
  adminBulkTournamentFolder,
} from "./admin_tournament_full";

// Недельный банк турниров: копится с каждого турнира, раздаётся тройке лучших
// по сумме очков в ночь воскресенья (крон) либо вручную из админки.
// ⛔ tournamentWeeklyBankCron снят с деплоя вместе с остальными турнирными
// кронами (владелец, 2026-08-23). Ручная выплата из админки остаётся доступной.
export {
  adminPayoutTournamentWeeklyBank,
  adminSetTournamentEconomy,
  adminGetTournamentEconomy,
  tournamentWeeklyBankInfo,
} from "./tournament_weekly_payout";

// Learning V2 delayed evidence: server-classified, idempotent receipt finalization.
export { finalizeLearningV2DelayedCandidate } from "./learning_v2_delayed_callable";
export { finalizeLearningV2AccessPurchase } from "./learning_v2_access_production_callable";

// Server-backed cosmetic inventory: client availability manifest plus guarded
// admin controls for removing an item from sale or returning it without a release.
export {
  cosmeticAssetCatalogGet,
  adminGetCosmeticAssetArchive,
  adminSetCosmeticAssetSaleStatus,
} from "./cosmetic_asset_archive";

// ── Рулетка Plus (спин-кредиты → дни VIP) и claim qualified-приглашений в прокруты ──
export { referralSpin } from "./referral_spin";
export { referralClaimSpin } from "./referral_claim_spin";
// DEV-кнопка «+1 прокрут» (гейт remote_config, лимит 10/сутки) — только для тестовых сборок.
export { referralDevGrantSpin } from "./referral_dev_grant";

// ── Fan-out ленты активности друзей (users/{uid}/my_events → users/{friendUid}/feed) ──

// ── Пачковая выдача публичных профилей друзей (убирает 4-RTT цепочку с клиента) ──
export { friendsGetProfiles } from "./friends_profiles";

// ── «Вместе» (docs/plans/2026-08-16-friends-together-implementation.ru.md) ──
// Веха уровня дружбы, сундук недели, «Позвать» — вкладка Друзья, за флагом
// friends_together_enabled на клиенте.
export {
  friendsTogetherClaimLevel,
  friendsClaimWeeklyChest,
  friendsNudge,
} from "./friends_together";
export { publicProfileProjectMine } from "./public_profile_projection";
export { adminActivateTelegramPremiumOrder, adminInspectTelegramPromoCode } from "./telegram_premium_admin";

// Authenticated, server-authoritative one-time onboarding access grant.
export { introFullAccessClaim } from "./gift_access";
export { globalBroadcastClaim } from "./global_broadcast_claim";
export { globalBroadcastListActive } from "./global_broadcast_public";
export {
  levelRewardSpinStatus,
  levelRewardSpinClaim,
  levelRewardSpinAcknowledge,
  levelRewardSpinDelivery,
} from "./level_reward_spins";
export { levelRewardSpinEnrollV1 } from "./level_spin_enrollment";
export { levelSpinStarGrant } from "./level_spin_star_grant";

// ── Season Pass: клеймы, расходники, щит другу, покупка платной дорожки ──
export {
  seasonClaimReward,
  seasonRedeemConsumable,
  seasonSendFriendShield,
  seasonBuyPass,
} from "./season_pass";

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
} from "./admin_referrals";
export {
  adminRepairPendingReferralPurchase,
  adminResumePendingReferralPurchaseRepair,
} from "./admin_referral_purchase_repair";

// Learning V2: генерация юнитов (E1 vertical slice) — очередь плана + воркер
export {
  adminCreateV2GenerationPlan,
  adminQueueV2GenerationPlan,
} from "./admin_v2_generation";
export {
  adminGetV2OwnerGeneratorWorkspace,
  adminPrepareV2OwnerEpisodeDraft,
} from "./content_factory/v2_owner_generator_workspace_v1";
export {
  adminSeedV2E1DemoSource,
  adminRunV2E1Compilation,
} from "./content_factory/v2_e1_compilation_worker";
// зачем (владелец, 2026-08-23): кнопка публикации курса в админке
// (admin/v2/legacy.html) звала adminPublishAuthoredLearningV2Course, но
// функция нигде не экспортировалась — эндпоинта не существовало, и
// одобренный материал физически не мог доехать до людей без пересборки
// приложения. Это и есть доставка без OTA: опубликовал — приложение видит.
export { adminPublishAuthoredLearningV2Course } from "./content_factory/learning_v2_publish_authored_course_v1";
