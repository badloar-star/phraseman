// зачем: 2026-08-23 — контент-фабрика Learning V2 (9 функций) переехала в
// кодбазу functions-content. Замер: она тянула в память все авторские сессии
// курса и стоила 236 МБ из 380 МБ основного бандла, то есть за неё платили
// все 240 функций при каждом холодном старте. Деплой: functions:content.
import * as admin from "firebase-admin";
import { withCronHeartbeat } from './cron_heartbeat';
import * as functions from "firebase-functions/v2";
import { getLevelFromXP } from "./xp_levels";
// зачем: импорт надгробий Help Board снят вместе с их экспортом
// (владелец, 2026-09-02) — см. комментарий ниже по файлу.

admin.initializeApp();

// зачем: 24.08.2026 админка во всех блоках турниров показывала «сервер временно
// не ответил». Код и экспорты были целы, функции числились в списке — но Cloud
// Run не мог поднять их ревизии: «Quota exceeded for total allowable CPU per
// project per region». Причина в том, что setGlobalOptions не вызывался нигде, и
// из 441 функции только 52 задавали maxInstances сами. Остальным доставался
// дефолт Cloud Run (до 1000 инстансов на функцию), поэтому суммарный потолок CPU
// по региону выбирался целиком и новые ревизии падали на healthcheck.
// Потолок общий и мягкий: функции, у которых есть свой maxInstances/minInstances
// (включая тёплые auth_identity и maxVoiceMint), сохраняют своё значение —
// глобальные опции действуют только там, где своё не задано.
functions.setGlobalOptions({ maxInstances: 10 });

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
const { accountClaimMine } = require("./account_claim");
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
const {
  accountDeleteMine,
  accountDeleteEnqueue,
  accountDeleteCredentialStatus,
} = require("./account_delete");
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
const { collectiblesClaimDrop } = require("./collectibles_retired");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  submitShardSurvey,
  getActiveShardSurvey,
  adminWriteShardSurvey,
  adminDeleteShardSurvey,
} = require("./shard_survey");
// eslint-disable-next-line @typescript-eslint/no-var-requires
// «Задания»: владелец назначает квест из админки, игрок выполняет и забирает
// награду. Очередь разбирается сама при заходе игрока — крона нет.
const {
  questGetActive,
  questReportProgress,
  questClaimReward,
  adminWriteQuest,
  adminActivateQuest,
  adminArchiveQuest,
  adminDeleteQuest,
  adminListQuests,
} = require("./quests");
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
const {
  submitMaxVoiceFeedback,
  adminListMaxVoiceFeedback,
} = require("./max_voice_feedback");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  submitFeedbackEntry,
  adminListFeedbackEntries,
} = require("./feedback_entries");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { adminSummarizeFeedback } = require("./feedback_summary");
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
  adminAlertOnCronHeartbeat,
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
// зачем (этап 4): аккаунт выдаёт сервер, а не телефон — см. account_claim.ts.
exports.accountClaimMine = accountClaimMine;
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
exports.accountDeleteCredentialStatus = accountDeleteCredentialStatus;
exports.accountDeleteWorker = accountDeleteWorker;
exports.accountDeleteRetryCron = accountDeleteRetryCron;
exports.leaderboardUpdateDailyAnalytics = leaderboardUpdateDailyAnalytics;
exports.nameCheckAvailability = nameCheckAvailability;
exports.nameGenerateAndReserve = nameGenerateAndReserve;
exports.nameReserve = nameReserve;
exports.nameReleaseMine = nameReleaseMine;
exports.leagueChestClaim = leagueChestClaim;
// ⛔ Надгробия Help Board и Compass сняты с деплоя (владелец, 2026-09-02).
// зачем: они ставились 2026-07-16, чтобы старые клиенты получали внятный отказ
// вместо ошибки соединения. Задачу свою отработали: за 30 дней у всех десяти
// callable-надгробий РОВНО НОЛЬ вызовов, а 703 вызова
// helpBoardCompassRetryCron — это крон будил сам себя ради пустого тела.
// Клиент 1.6.15 их не зовёт. Каждое надгробие = сервис Cloud Run в каждом
// полном деплое, поэтому дешевле убрать, чем держать.
// Файл help_board_decommission.ts оставлен на диске как история решения.
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
// зачем (аудит 2026-08-29): два триггера на users/{userId} слиты в один —
// см. users_write_router.ts. Старые имена удаляются из прода functions:delete.
exports.usersWriteRouter = require("./users_write_router").usersWriteRouter;
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
// Compatibility tombstone: old installed clients receive a permanent no-drop result.
exports.collectiblesClaimDrop = collectiblesClaimDrop;
exports.progressSubmitEvent = progressSubmitEvent;
exports.progressMigrateSnapshot = progressMigrateSnapshot;
exports.submitLearningV2RequiredSessionCompletion =
  submitLearningV2RequiredSessionCompletion;
exports.adminAlertOnUserReport = adminAlertOnUserReport;
exports.adminAlertOnCronHeartbeat = adminAlertOnCronHeartbeat;
exports.adminAlertOnCriticalError = adminAlertOnCriticalError;
exports.adminAlertOnAuthFailureSpike = adminAlertOnAuthFailureSpike;
exports.adminAlertOnContentReport = adminAlertOnContentReport;
exports.adminAlertContentReportDigest = adminAlertContentReportDigest;
exports.adminAlertOnCancelSurvey = adminAlertOnCancelSurvey;
exports.adminAlertOnUgcRefund = adminAlertOnUgcRefund;
exports.adminAlertOnConfigWritten = adminAlertOnConfigWritten;
exports.submitShardSurvey = submitShardSurvey;
exports.questGetActive = questGetActive;
exports.questReportProgress = questReportProgress;
exports.questClaimReward = questClaimReward;
exports.adminWriteQuest = adminWriteQuest;
exports.adminActivateQuest = adminActivateQuest;
exports.adminArchiveQuest = adminArchiveQuest;
exports.adminDeleteQuest = adminDeleteQuest;
exports.adminListQuests = adminListQuests;
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
exports.submitMaxVoiceFeedback = submitMaxVoiceFeedback;
exports.adminListMaxVoiceFeedback = adminListMaxVoiceFeedback;
exports.submitFeedbackEntry = submitFeedbackEntry;
exports.adminListFeedbackEntries = adminListFeedbackEntries;
exports.adminSummarizeFeedback = adminSummarizeFeedback;
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
  withCronHeartbeat('computeLeaderboardStatsCron', async () => {
    await computeLeaderboardStats();
  }));

// ─── Weekly XP reset cron (XP-02) ────────────────────────────────────────────
// Runs every Monday 00:00 UTC. Zeroes progress.weekly_xp for ALL users without
// touching progress.user_total_xp. Cron expression '0 0 * * 1' = at 00:00 on Monday.
export const resetWeeklyXpCron = functions.scheduler.onSchedule(
  { schedule: "0 0 * * 1", timeZone: "UTC" },
  withCronHeartbeat('resetWeeklyXpCron', async () => {
    await resetWeeklyXp();
  }));

export const cleanupExpiredAppMessagesCron = functions.scheduler.onSchedule(
  { schedule: "0 4 * * *", timeZone: "UTC" },
  withCronHeartbeat('cleanupExpiredAppMessagesCron', async () => {
    await cleanupExpiredAppMessages();
  }));

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
  withCronHeartbeat('maxLessonReminderCron', async () => {
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
  }));

export const reEngagePushCron = functions.scheduler.onSchedule(
  { schedule: "0 10 * * *", timeZone: "UTC" },
  withCronHeartbeat('reEngagePushCron', async () => {
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
  }));

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
  withCronHeartbeat('premiumExpiryReminderCron', async () => {
    const summary = await runPremiumExpiryReminder();
    console.log("premiumExpiryReminderCron", JSON.stringify(summary));
    if (summary.candidates > 0 && summary.sent === 0) {
      console.error(
        `premiumExpiryReminderCron: ${summary.candidates} candidates found but 0 pushes sent — check Expo Push API.`,
      );
    }
  }));

// ── Поддержка: ОДИН диспетчер вместо семи кронов ────────────────────────────
//
// зачем (владелец, 2026-09-02, аудит расходов): здесь стояли семь отдельных
// onSchedule — четыре с тактом 10 минут и три часовых. Это 21 600 запусков в
// месяц, каждый со своим холодным стартом, ради 2–4 реальных событий в НЕДЕЛЮ
// (замер по логам WARNING+ за 7 дней). Плюс каждое расписание — отдельное
// задание Cloud Scheduler ($0.10/мес сверх трёх бесплатных).
//
// Теперь один тик каждые 10 минут раздаёт работу сам:
//   • каждый тик (обещание владельца «3 часа ± 10 минут» на автоотправку в
//     Telegram и быстрый подхват зависших задач доставки) — deadline и recovery;
//   • раз в 30 минут — ретраи алертов владельцу и подметание очереди ответов:
//     это ретраи, им не нужен десятиминутный такт;
//   • раз в час, на тике :00 — разбор почты (IMAP), детект ответов владельца и
//     ретрай автоответов. Ровно та частота, что была.
//
// Пульс каждой задачи пишется под ПРЕЖНИМ именем: панель здоровья кронов в
// админке и adminAlertOnCronHeartbeat продолжают работать без правок.
//
// Правило: одна упавшая задача НЕ должна отменить остальные. Поэтому каждая
// обёрнута отдельно, а причина падения логируется (немой catch запрещён).
export const supportOpsCron = functions.scheduler.onSchedule(
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
    const startedAtMs = Date.now();
    const minuteOfHour = new Date(startedAtMs).getUTCMinutes();
    // Такты считаем от минуты часа, а не от счётчика в базе: диспетчер остаётся
    // без состояния, а пропущенный тик не сдвигает расписание навсегда.
    const everyThirtyMin = minuteOfHour % 30 < 10;
    const hourly = minuteOfHour < 10;

    // зачем: runXxx объявлены как Promise<unknown>, а withCronHeartbeat ждёт
    // Promise<void | HeartbeatExtra> и событие первым аргументом. Гасим оба
    // расхождения здесь, чтобы не трогать сигнатуры support_inbox.
    // зачем: runXxx объявлены как Promise<unknown>, а withCronHeartbeat ждёт
    // Promise<void | HeartbeatExtra>. Гасим расхождение здесь, чтобы не менять
    // сигнатуры support_inbox — их разделяют другие вызывающие.
    const voidly = (run: () => Promise<unknown>) => async (): Promise<void> => {
      await run();
    };
    const tasks: Array<{ name: string; due: boolean; run: () => Promise<void> }> = [
      { name: 'supportTelegramAutoSendDeadlineCron', due: true, run: voidly(runSupportTelegramAutoSendDeadline) },
      { name: 'supportTelegramReplyJobRecoveryCron', due: true, run: voidly(runSupportTelegramReplyJobRecovery) },
      { name: 'supportOwnerAlertRetryCron', due: everyThirtyMin, run: voidly(runSupportOwnerAlertRetryCron) },
      { name: 'supportReplyDispatchSweeperCron', due: everyThirtyMin, run: voidly(runSupportReplyDispatchSweeper) },
      { name: 'gmailSupportPullCron', due: hourly, run: voidly(runSupportInboxPullCron) },
      { name: 'gmailSupportOwnerReplyDetectionCron', due: hourly, run: voidly(runSupportOwnerReplyDetectionCron) },
      { name: 'supportAutoReplyRetryCron', due: hourly, run: voidly(runSupportAutoReplyRetryCron) },
    ];

    const ran: string[] = [];
    const failed: string[] = [];
    for (const task of tasks) {
      if (!task.due) continue;
      try {
        // undefined как событие: сами задачи его не читают — им важен только
        // пульс под прежним именем (панель здоровья + adminAlertOnCronHeartbeat).
        await withCronHeartbeat<undefined>(task.name, task.run)(undefined);
        ran.push(task.name);
      } catch (error) {
        failed.push(task.name);
        console.error('support_ops_cron_task_failed', JSON.stringify({
          task: task.name,
          minuteOfHour,
          reason: error instanceof Error ? error.message : String(error),
        }));
      }
    }
    console.log('support_ops_cron_tick', JSON.stringify({
      minuteOfHour,
      everyThirtyMin,
      hourly,
      ran,
      failed,
      durationMs: Date.now() - startedAtMs,
    }));
  });

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
export { adminGrantVoiceMinutes } from "./admin_voice_minutes";
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
export { voiceMinuteWalletMine } from "./voice_minutes_api";
export { voiceMinuteDevGrant } from "./voice_minutes_dev_grant";

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
// Экспорт снят => Firebase удаляет расписания.
//
// ⛔ ФУЛЛ-УДАЛЕНИЕ ТУРНИРОВ ИЗ ПРОДА (владелец, 2026-09-02, аудит расходов).
// зачем: 23.08 сняли кроны, но 29 callable остались задеплоены. Каждая — это
// отдельный сервис Cloud Run: он попадает в КАЖДЫЙ полный деплой (а полный
// деплой 507 функций стоит $2–6) и держит свой образ в Artifact Registry.
// Проверено перед снятием: приложение 1.6.15 не зовёт их ни разу;
// tournamentClaimReward — 0 вызовов за 60 дней (терять нечего);
// tournamentWeeklyBankInfo стучал только клиент 1.6.7 и УЖЕ получал 401.
// Модули ./tournaments и ./tournament_* НЕ удалены с диска намеренно: Арена
// импортирует tournament_core и tournament_pool_publication (arena_v2.ts:16,59).
// Возврат = отдельное задание владельца, не попутная правка.

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
  arenaV2RankedBotFallback,
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
  arenaV2ReleaseStaleMatch,
  arenaV2InviteCreate,
  arenaV2InviteAccept,
  arenaV2InviteDecline,
  arenaV2InviteCancel,
  arenaV2InviteReady,
  arenaV2InviteStatus,
  arenaV2DevFriendBotCreate,
  arenaV2FriendsBoard,
  arenaV2SeasonClaim,
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
// ⛔ Раздел «Турниры» в админке снят с деплоя вместе с остальными турнирными
// функциями (владелец, 2026-09-02). Вкладки турниров в admin/v2/legacy.html
// перестанут отвечать — это ожидаемо, режим выключен с 2026-08-10.
// Модули ./admin_tournament_tasks и ./admin_tournament_full остаются на диске.

// ⛔ Недельный банк турниров снят с деплоя целиком (владелец, 2026-09-02):
// крон убран 2026-08-23, теперь уходят и ручная выплата, и чтение банка.
// tournamentWeeklyBankInfo давал 4 569 вызовов/мес от клиента 1.6.7, и все они
// уже отвечали 401 — то есть функция не работала и до удаления.

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
// Стартовый подарок новичку: +300 рун одной выдачей на аккаунт (welcome-модалка).
export { welcomeGiftClaim } from "./welcome_gift";
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
// зачем (владелец, 2026-08-27): руны за семь учебных активностей — урок,
// словарь, неправильные глаголы, блиц, тренировка, отработка ошибок, голос.
export { practiceRuneGrant } from "./practice_rune_grant";

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
// зачем: панель «Диагностика» в админке (аудит 2026-08-29) — пульс кронов,
// стадии удалений, critical-поток клиентов и обезличенная экономика одним
// вызовом; cron_heartbeats/deletion_diagnostics закрыты правилами наглухо,
// браузеру их отдаёт только Admin SDK этой callable.
export { adminGetDiagnosticsOverview } from "./admin_diagnostics_overview";
// зачем (владелец, 2026-08-31): отложенное удаление 14 дней — статус для
// модалки «Восстановить аккаунт?» и сама отмена удаления.
export { accountDeleteStatusMine, accountDeleteRestoreMine } from "./account_delete_restore";
// ИИ-аудитор покрытия удаления: смотрит карту базы, ничего не удаляет.
export { adminAuditAccountDeleteCoverage } from "./account_delete_ai_audit";
// зачем (владелец, 2026-08-23): кнопка публикации курса в админке
// (admin/v2/legacy.html) зовёт adminPublishAuthoredLearningV2Course — это
// доставка контента без OTA: опубликовал, и приложение видит новый материал.
//
// ЭКСПОРТА ЗДЕСЬ НЕТ НАМЕРЕННО. Функция живёт в кодовой базе `content`
// (functions-content/index.ts) — её вынесли туда коммитом 478b03750, чтобы
// основной бандл похудел с 380 до 140 МБ. Позже эту же функцию по незнанию
// добавили и сюда, из-за чего Firebase отказывался деплоить ВСЁ разом:
// «More than one codebase claims following functions». Имя эндпоинта не
// изменилось, поэтому кнопка в админке работает как прежде.
// Возвращать экспорт сюда нельзя — снова сломается деплой всех функций.
