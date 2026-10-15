// зачем: 2026-08-23 — контент-фабрика Learning V2 (9 функций) переехала в
// кодбазу functions-content. Замер: она тянула в память все авторские сессии
// курса и стоила 236 МБ из 380 МБ основного бандла, то есть за неё платили
// все 240 функций при каждом холодном старте. Деплой: functions:content.
// зачем (Account V2, 8D): ПЕРВЫМ — до любых модулей: в эмуляторе функций прокси firebase-admin
// теряет статики admin.firestore (FieldValue/Timestamp); в проде ничего не делает.
import "./emulator_admin_namespace_fix";
import * as admin from "firebase-admin";
import { withCronHeartbeat } from './cron_heartbeat';
export { soc2ReadinessCollectorCron } from './soc2_readiness_collector';
import * as functions from "firebase-functions/v2";
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
// (включая тёплый auth_identity), сохраняют своё значение —
// глобальные опции действуют только там, где своё не задано.
functions.setGlobalOptions({ maxInstances: 10 });

// These imports must come AFTER initializeApp() — use require to control order
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
  nameCheckAvailability,
  nameGenerateAndReserve,
  nameReserve,
  nameReleaseMine,
} = require("./leaderboard");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendEnsureMyCode } = require("./friend_codes");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendLookupUser } = require("./friend_lookup");
const { friendBlockUser, friendUnblockUser } = require("./friend_block");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  friendLikeActivity,
  friendUnlikeActivity,
} = require("./friend_activity_likes");
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
// Server-authorized structured memory read for released Dialogue V2 scenarios.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dialogueV2MemoryResume } = require("./dialogue_v2_memory_resume_callable");
// Plus-only owner view/clear boundary for one released Dialogue V2 language.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  dialogueV2MemoryView,
  dialogueV2MemoryClear,
} = require("./dialogue_v2_memory_management_callable");
// Learner-safe, manifest-pinned Dialogue V2 catalogue for one study target.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dialogueV2Catalogue } = require("./dialogue_v2_catalogue_callable");
// Server-authorized Dialogue V2 text turn. The callable accepts only opaque
// session/turn ids, immutable selection and learner message; all personas,
// retained turns and policy stay server-owned.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dialogueV2TextTurn } = require("./dialogue_v2_turn_production_callable");
const { dialogueV2SessionStart } = require("./dialogue_v2_session_start_callable");
const { dialogueV2FreeformSessionStart } = require("./dialogue_v2_freeform_session_start_callable");
const { dialogueV2FreeformSessionTurn } = require("./dialogue_v2_freeform_session_turn_callable");
const { dialogueV2FreeformPreparedBotVoiceResolve } = require("./dialogue_v2_freeform_prepared_bot_voice_callable");
// Server-owned terminal claim, debrief and structured-memory commit for V2.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dialogueV2SessionComplete } = require("./dialogue_v2_session_complete_callable");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { premiumDialogStream } = require("./premium_dialog_stream");
// Dialogue V2 text tutoring uses ordinary dialogue modules; the sealed voice feature is not bundled.
// eslint-disable-next-line @typescript-eslint/no-var-requires
// Темы на выбор при входе в урок: чистая выборка из каталога целей, БЕЗ
// обращения к модели — человек видит выбор сразу, не дожидаясь генерации.
// eslint-disable-next-line @typescript-eslint/no-var-requires
// Dialogue privacy controls remain in the default codebase; no voice-memory endpoints are exported.
// eslint-disable-next-line @typescript-eslint/no-var-requires
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { adminWarmInstanceGauge } = require("./warm_instance_gauge");
// eslint-disable-next-line @typescript-eslint/no-var-requires
// eslint-disable-next-line @typescript-eslint/no-var-requires
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { explainPhrase } = require("./explain_phrase");
const { explainChoice } = require("./explain_choice");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { explainMistake } = require("./mistake_explain");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mistakeHubAdvice } = require("./mistake_hub_advice");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitExplainReport } = require("./explain/explain_reports");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { vipRevokeMine } = require("./vip_revoke");
// зачем: D140 (владелец 2026-10-01) — коллекции удалены целиком, вместе с
// надгробием collectiblesClaimDrop (деплой удалит функцию, Firebase спросит).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  submitShardSurvey,
  getActiveShardSurvey,
  adminWriteShardSurvey,
  adminDeleteShardSurvey,
} = require("./shard_survey");
// зачем: D140 (владелец 2026-10-01) — «Задания» (квесты) удалены целиком: 8 функций
// (questGetActive, questReportProgress, questClaimReward, adminWriteQuest,
// adminActivateQuest, adminArchiveQuest, adminDeleteQuest, adminListQuests).
// Уже выданные дни Plus не трогаются. Деплой удалит функции (Firebase спросит).
// зачем: D70/D78 — shardsApplyDelta (отключённая заглушка записи жемчуга) удалена.
// зачем: D78 (владелец, 2026-09-30) — dev-выдачи devShardsGrant/devRunesGrant/
// referralDevGrantSpin удалены из кода целиком (реализация, экспорт, клиент).
// зачем: D70/D78 — биржа «жемчуг → звёзды» (getCoinExchangeQuote/History,
// exchangeCoinsForStars, adminSetCoinExchangeRate, recalcCoinExchangeRate,
// adminGetCoinExchangeCenter) удалена целиком: тратила жемчуг, которого больше нет.
// Функции на сервере снимает деплой владельца.
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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  submitUserIdea,
  updateUserIdea,
  listPublicUserIdeas,
  getPublicUserIdea,
  adminListUserIdeas,
  adminDeleteUserIdea,
  adminSetUserIdeaStatus,
  adminDecideUserIdea,
  adminDraftIdeaDecision,
} = require("./user_ideas");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { likeUserIdea, unlikeUserIdea } = require("./user_idea_likes");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  reportUserIdea,
  adminRestoreUserIdea,
  adminSetIdeaSubmissionRestriction,
  adminAlertOnUserIdeaReport,
} = require("./user_idea_reports");
// eslint-disable-next-line @typescript-eslint/no-var-requires
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  submitFeedbackEntry,
  adminListFeedbackEntries,
} = require("./feedback_entries");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { adminSummarizeFeedback } = require("./feedback_summary");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { adminGetFeedbackStats } = require("./feedback_admin_stats");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  notifyOnFriendRequestCreated,
  notifyOnFriendAccepted,
  notifyOnPackCommentCreated,
  userNotificationsCleanupCron,
} = require("./user_notifications");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  progressSubmitEvent,
  progressMigrateSnapshot,
} = require("./progress_events");
// зачем (Account V2, Пакет 8I): дозаливка progress, затёртого дефектом 8G, — пишет только
// отсутствующие в облаке ключи, раз в сутки на аккаунт. Выкладка — координатор.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  progressReseedMissing,
} = require("./progress_reseed_missing");
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
  adminAlertOnCancelSurvey,
  adminAlertOnUgcRefund,
  adminAlertOnConfigWritten,
} = require("./admin_alerts");

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
exports.nameCheckAvailability = nameCheckAvailability;
exports.nameGenerateAndReserve = nameGenerateAndReserve;
exports.nameReserve = nameReserve;
exports.nameReleaseMine = nameReleaseMine;
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
exports.friendBlockUser = friendBlockUser;
exports.friendUnblockUser = friendUnblockUser;
exports.friendLikeActivity = friendLikeActivity;
exports.friendUnlikeActivity = friendUnlikeActivity;
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
exports.dialogueV2MemoryResume = dialogueV2MemoryResume;
exports.dialogueV2MemoryView = dialogueV2MemoryView;
exports.dialogueV2MemoryClear = dialogueV2MemoryClear;
exports.dialogueV2Catalogue = dialogueV2Catalogue;
exports.dialogueV2TextTurn = dialogueV2TextTurn;
exports.dialogueV2SessionStart = dialogueV2SessionStart;
exports.dialogueV2FreeformSessionStart = dialogueV2FreeformSessionStart;
exports.dialogueV2FreeformSessionTurn = dialogueV2FreeformSessionTurn;
exports.dialogueV2FreeformPreparedBotVoiceResolve = dialogueV2FreeformPreparedBotVoiceResolve;
exports.dialogueV2SessionComplete = dialogueV2SessionComplete;
// Стриминговый диалог (SSE): первое слово ответа видно почти сразу.
exports.premiumDialogStream = premiumDialogStream;
// зачем: шкала «когда можно отключать тёплый инстанс» в Пульте админки (2026-08-22).
exports.adminWarmInstanceGauge = adminWarmInstanceGauge;
exports.explainPhrase = explainPhrase;
exports.explainChoice = explainChoice;
exports.notifyOnFriendRequestCreated = notifyOnFriendRequestCreated;
exports.notifyOnFriendAccepted = notifyOnFriendAccepted;
exports.notifyOnPackCommentCreated = notifyOnPackCommentCreated;
exports.userNotificationsCleanupCron = userNotificationsCleanupCron;
exports.explainMistake = explainMistake;
// зачем (владелец 2026-09-14): подсказка хаба «Работа над ошибками», одна генерация в сутки.
exports.mistakeHubAdvice = mistakeHubAdvice;
exports.submitExplainReport = submitExplainReport;
exports.vipRevokeMine = vipRevokeMine;
exports.progressSubmitEvent = progressSubmitEvent;
exports.progressMigrateSnapshot = progressMigrateSnapshot;
exports.progressReseedMissing = progressReseedMissing;
exports.submitLearningV2RequiredSessionCompletion =
  submitLearningV2RequiredSessionCompletion;
exports.adminAlertOnUserReport = adminAlertOnUserReport;
exports.adminAlertOnUserIdeaReport = adminAlertOnUserIdeaReport;
exports.adminAlertOnCronHeartbeat = adminAlertOnCronHeartbeat;
exports.adminAlertOnCriticalError = adminAlertOnCriticalError;
exports.adminAlertOnAuthFailureSpike = adminAlertOnAuthFailureSpike;
exports.adminAlertOnContentReport = adminAlertOnContentReport;
exports.adminAlertOnCancelSurvey = adminAlertOnCancelSurvey;
exports.adminAlertOnUgcRefund = adminAlertOnUgcRefund;
exports.adminAlertOnConfigWritten = adminAlertOnConfigWritten;
exports.submitShardSurvey = submitShardSurvey;
exports.getActiveShardSurvey = getActiveShardSurvey;
exports.adminWriteShardSurvey = adminWriteShardSurvey;
exports.adminDeleteShardSurvey = adminDeleteShardSurvey;
exports.resolveLearningV2WalletRewardReceipt =
  resolveLearningV2WalletRewardReceipt;
exports.getLearningV2AccountBinding = getLearningV2AccountBinding;
exports.grantMistakeCorrectionReward = grantMistakeCorrectionReward;
exports.mistakePracticeSyncEvents = mistakePracticeSyncEvents;
exports.submitUserIdea = submitUserIdea;
exports.updateUserIdea = updateUserIdea;
exports.listPublicUserIdeas = listPublicUserIdeas;
exports.getPublicUserIdea = getPublicUserIdea;
exports.adminDeleteUserIdea = adminDeleteUserIdea;
exports.adminSetUserIdeaStatus = adminSetUserIdeaStatus;
exports.likeUserIdea = likeUserIdea;
exports.unlikeUserIdea = unlikeUserIdea;
exports.reportUserIdea = reportUserIdea;
exports.adminRestoreUserIdea = adminRestoreUserIdea;
exports.adminSetIdeaSubmissionRestriction = adminSetIdeaSubmissionRestriction;
exports.adminListUserIdeas = adminListUserIdeas;
exports.adminDecideUserIdea = adminDecideUserIdea;
exports.adminDraftIdeaDecision = adminDraftIdeaDecision;
exports.submitFeedbackEntry = submitFeedbackEntry;
exports.adminListFeedbackEntries = adminListFeedbackEntries;
exports.adminSummarizeFeedback = adminSummarizeFeedback;
exports.adminGetFeedbackStats = adminGetFeedbackStats;

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

// зачем 10:00 И 22:00 UTC (координатор 13.10, «Америка — крупный рынок»): при одном прогоне в 10:00 тихие часы 22:00–09:00
// местного навсегда закрывали UTC−2 и западнее и UTC+12+. Днём (09–22 местного) в 10:00 UTC — пояса UTC−1…+11, в 22:00 UTC —
// UTC−13…−1 и UTC+11…+14: вместе покрыт каждый пояс. Повтор в пересечении не уходит — cooldown 2 дня (re_engage_push.ts).
export const reEngagePushCron = functions.scheduler.onSchedule(
  { schedule: "0 10,22 * * *", timeZone: "UTC" },
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
  communityAuthorRemovePack,
  communityFetchPackCardsIfAccessible,
  // зачем: D140 (владелец 2026-10-01) — 4 callable подарочных наборов
  // (communityRedeemPackGiftVoucher, flashcardPackGiftRedeem,
  // flashcardPackGiftGrantGlobalBroadcast, flashcardPackGiftSyncState) удалены.
  communityListSellerInbox,
  communityMarkSellerInboxSeen,
} from "./community_packs";
// зачем (04.10, сессия 3 «Карточки»): удаление одной карточки из своего опубликованного набора.
export { communityAuthorRemoveCard } from "./community_pack_card_remove";

// D128 (2026-09-30): озвучка одобренных наборов карточек через OpenAI TTS.
// Деплой — только после релиза клиента 2.0 (D91), прицельно:
//   firebase deploy --only "functions:cardTtsPackWorker,functions:adminCardTtsRequeuePack"
// ⛔ Решение советника п.60(8), 12.10: НЕ выкладывать, пока в политике конфиденциальности нет §6/§13 об озвучке карточек
// через OpenAI TTS (сейчас §13 обещает, что озвучка только на устройстве). Черновик текста — docs/phraseman-2.0/PRIVACY_R1_GAP.md, П9.
// Полный `firebase deploy --only functions` выложил бы этот триггер — до правки политики только прицельные деплои без него.
export { cardTtsPackWorker, adminCardTtsRequeuePack } from "./card_tts_worker";


// Learning V2 learner-safe active-session descriptor. Auth + App Check are
// enforced in the callable module; no private repository handle is serialized.
export { submitLearningV2ActivityReleasedCompletionV1 } from "./learning_v2/activity_released_session_completion_callable_v1";
export { submitLearningV2CourseSessionCompletedV1 } from "./learning_v2/course_session_completed_summary_callable_v1";

// ── Деактивация истёкшего премиума/VIP по сроку (бессрочное не трогает) ───────
export { premiumExpiryCron } from "./premium_expiry_cron";

// ── Авто-перенос VIP, выданного в осиротевший stable-документ, на canonical ───


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
// зачем: D70/D86 — корректировка баланса жемчуга удалена; выдача наград — монетами.
export { adminGrantReward } from "./admin_grant";
// зачем: D136 (владелец 2026-10-01) — adminGrantVoiceMinutes удалена: денежный
// код MAX убран; деплой удалит функцию (Firebase спросит подтверждение).
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
  adminGetHomeHintsCatalog,
  adminPublishHomeHints,
} from "./admin_home_hints";
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
  adminGetVideoStudioWorkspace,
  adminGetVideoPhraseWorkspace,
  adminSaveVideoPhraseDraft,
  adminPublishVideoPhrases,
  adminParseVideoPhraseDocument,
  adminBackfillVideoPacks,
} from "./video_phrases";
export { adminAlignVideoPhraseTranscript } from "./video_phrase_timing";
// PM-112/113: ленивый пересчёт счётчика уникальных сохранений ролика (count()).
export { refreshVideoSaveCounts } from "./video_save_counts";
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
// зачем (владелец 2026-09-21): админка звала adminCommunityPackQaReview с
// 18.08.2026, а функции не существовало — кнопку AI-проверки прятала заплатка.
export { adminCommunityPackQaReview, adminCommunityPackApplyQaFixes, adminCommunityPackApplyQaFixesToPublished } from './admin_community_pack_qa';
// зачем (владелец 2026-09-21): набор пишется на одном родном языке — человек с
// украинским интерфейсом видел русский текст. Перевод на все языки интерфейса.
export { adminCommunityPackTranslateLocales } from './admin_community_pack_translate';
export { submitSettingsPollVote } from "./settings_poll_vote";
// «Опрос дня» на вкладке «Друзья» (2026-09-30): голос + счётчик в одной транзакции.
export { dailyPollVote } from "./daily_poll_vote";
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
// ⛔ СНЯТА С ДЕПЛОЯ (владелец 2026-09-04: «выключай»). Дев-выдача начисляла
// ПЛАТНЫЕ минуты бесплатно ЛЮБОМУ вошедшему пользователю (до 600 мин на
// аккаунт), пока был включён временный DEV-grant голосовых минут.
// Флаг снят в базу (false), функция удалена с прода — две линии защиты.
// Раздел MAX законсервирован, тестировать покупку минут больше нечем и незачем:
// см. CLAUDE.md → «РАЗДЕЛ MAX ЗАКОНСЕРВИРОВАН».
// Не возвращать без прямой команды владельца — возврат экспорта заново создаёт
// функцию на проде при следующем деплое.

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
  adminCancelStripeSubscriptionRenewal,
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

// ── Напоминания тем, кто оплатил на сайте, но не активировал код ──────────────
// зачем: 21.09.2026 трое оплативших (4–100 EUR) остались без доступа — письмо
// с кодом провалилось, повторов не было, самый старый ждал почти месяц.
export { webActivationReminderCron } from "./web_activation_reminders";

// ── Сторож почты: мёртвый ключ Resend и недоставленные коды активации ─────────
// зачем: 28.08–21.09.2026 письма с кодами падали молча, трое оплативших сидели
// без доступа три недели. Оба крона уже живут в облаке (выложены из ветки
// claude/sad-cannon-876ae9); перенесены 01.10.2026, чтобы полная выкладка их не удалила.
export { resendKeyHealthCron, activationEmailRetryCron } from "./email_delivery_watchdog";

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
// Модули ./tournaments и ./tournament_* НЕ удалены с диска намеренно: пул
// заданий Шпиля импортирует tournament_core и tournament_pool_publication
// (зачем: D78 — серверная Арена удалена, потребителем пула остался Шпиль).
// Возврат = отдельное задание владельца, не попутная правка.

// Управление конфигом Арены из админки. Без документа arena_v2_config/current
// бэкенд Арены отказывает во всём — это и есть корневая причина «не работает».
export { adminArenaConfigGet, adminArenaConfigSet } from "./admin_arena_config";
// Управление конфигом Шпиля из админки (PM-283, TOWER_CONTRACT.md §7): таймер,
// монеты, боты меняются без релиза через config/spire_v1.
export { adminSpireConfigGet, adminSpireConfigSet } from "./admin_spire_config";
// Шпиль: быстрое снятие задания es/de/fr из админки (PM-287-A2, T41) — пулы
// публикуются без проверки носителем, значит ошибки первыми увидят игроки;
// снятое задание попадает в config/spire_task_flags_{lang}, сборщик
// недельного пакета (PM-272) обязан исключать эти id.
export {
  adminSpireTaskFlagList,
  adminSpireTaskFlagAdd,
  adminSpireTaskFlagRemove,
  adminSpireTaskReportList,
  adminSpireTaskIncidentStates,
  adminSpireTaskIncidentSetState,
} from "./admin_spire_task_flag";
// Шпиль: приём пачки отчётов о ступенях (PM-275, TOWER_CONTRACT.md §5) —
// одна запись progress.spire_week_v1 на пачку, проверка правдоподобия по config/spire_v1.
export { spireReportSteps } from "./spire_progress";
// Шпиль: комнаты по 30 на язык и день входа (PM-277, T15/T24); боты — формула
// spire_residents.ts без чтений/записей и без крона (D56).
export { spireJoinRoom } from "./spire_groups";
// Legacy league migration controls are retired and are no longer exported.
// Шпиль: недельный итог (PM-276, TOWER.md §4.7) — место по ступеням, переход
// между шпилями, сумма монет за место/повышение (выплата — PM-280). Свой крон,

export { spireFinalizeCron } from "./spire_finalize_cron";
// Шпиль: пакет недели (PM-272, TOWER_CONTRACT.md §4) — файл в Storage
// spire_packs/{lang}/{tier}/{weekId}.json, packHash в customMetadata (его читает
// spireReportSteps). Крон раз в неделю + ручной пересбор из админки.
export { spirePackWeeklyCron, adminSpirePackBuild } from "./spire_pack_build";
// Шпиль: пуш воскресенья «ты у края зоны» (PM-281, T30/§4.7). Понедельничный
// пуш «итог + новый шпиль» уже уходит ИЗНУТРИ spireFinalizeCron (см. выше) —
// отдельного экспорта не требует.
export { spireZoneWarningCron } from "./spire_zone_warning_push";
// Read-only DRAFT workspace for target-isolated Arena content. The callable
// surface deliberately has no stage/publish mutation until a reviewed durable
// transport exists for the large static packages.
export { adminArenaContentStatus, adminArenaContentValidate } from "./admin_arena_content";
export {
  adminArenaPublicationStage,
  adminArenaPublicationStatus,
  adminArenaPublicationActivate,
  adminArenaPublicationRollback,
} from "./admin_arena_publication";
// ⛔ D78 (владелец, 2026-09-30): СЕРВЕРНАЯ АРЕНА УДАЛЕНА ИЗ КОДА.
// зачем: D74/D78 — в 2.0 Арену заменяет Шпиль; владелец: «удаляем, не отключаем».
// Реализация (arena_v2.ts, arena_expansion.ts), надгробия D74 (arena_retired.ts),
// кроны и триггеры Арены удалены целиком — следующий деплой снимет их с прода.
// Остались ТОЛЬКО админские функции пула выше (adminArenaConfig*/Content*/
// Publication*): они ведут arena_v2_config/current.targetPublications и
// публикации заданий, которые читает сборщик пакетов Шпиля (spire_pack_build.ts).
// Ратчет: tests/d74_arena_server_retired.probe.ts.
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

// зачем: D108 — архив косметики (cosmeticAssetCatalogGet, adminGetCosmeticAssetArchive,
// adminSetCosmeticAssetSaleStatus) удалён вместе с аурами и кастомными аватарами.

// ── Рулетка Plus (спин-кредиты → дни Plus; Pro — монеты, D100) и claim qualified-приглашений ──
// зачем: D80/D99 (владелец, 2026-09-30) — рулетку ВЕРНУТЬ после PM-202. Dev-выдача
// спина (referralDevGrantSpin) НЕ возвращается — D78/D81.
export { referralSpin } from "./referral_spin";
export { referralClaimSpin } from "./referral_claim_spin";

// ── Fan-out ленты активности друзей (users/{uid}/my_events → users/{friendUid}/feed) ──

// ── Пачковая выдача публичных профилей друзей (убирает 4-RTT цепочку с клиента) ──
export { friendsGetProfiles } from "./friends_profiles";

// ── «Вместе» (docs/plans/2026-08-16-friends-together-implementation.ru.md) ──
// «Позвать» — вкладка Друзья, за флагом
// friends_together_enabled на клиенте.
export { friendsNudge } from "./friends_together";
export { publicProfileProjectMine } from "./public_profile_projection";
// Визитка «Про» (2026-09-30): свой текст до 80 символов — только через сервер.
export { profileCardBioSetMine } from "./profile_card_bio";
export { adminActivateTelegramPremiumOrder, adminInspectTelegramPromoCode } from "./telegram_premium_admin";

// Authenticated, server-authoritative one-time onboarding access grant.
export { introFullAccessClaim } from "./gift_access";
// зачем (D78/PM-080, Q109): videoWatchRunesClaim (руны за просмотр видео) удалена вместе
// с кодом. В облаке функция доживает до min_app_version >= 2.0 (её зовёт 1.6.24) —
// см. DEPLOY_NOW.md, Шаг 2. Полная выкладка предложит её удалить — до релиза отвечать «нет».
// зачем: D139 (владелец 2026-10-01) — докупка «+10 реплик за 300 монет»
// (aiDialogBuyExtraReplies) удалена; месячная квота D111 остаётся. Деплой удалит
// функцию (Firebase спросит подтверждение).
// Синхронизация покупок диалогов за руны (5 000 / 10 000). Сервер НЕ решает,
// а догоняет: телефон авторитетен, здесь только журнал траты и сохранение
// владения, чтобы переустановка приложения не потеряла купленное.
// зачем (владелец 2026-09-21): руны с покупки набора получает АВТОР набора,
// а не приложение. См. community_pack_rune_sale.ts.
export { communitySyncPackRuneSale } from "./community_pack_rune_sale";
export { globalBroadcastClaim } from "./global_broadcast_claim";
export { globalBroadcastListActive } from "./global_broadcast_public";
// зачем (владелец, 2026-08-27): руны за семь учебных активностей — урок,
// словарь, неправильные глаголы, блиц, тренировка, отработка ошибок, голос.
export { practiceRuneGrant } from "./practice_rune_grant";
// зачем: серверный кошелёк монет, спины удалены (владелец 01.10, Q13). Имя
// прежнее — клиент шлёт сюда награды за жалобы, «Дневной путь» и компенсацию
// подарков. Белый список и лимиты — coin_wallet_policy.ts. Деплой — ПЕРВЫМ
// после релиза (docs/phraseman-2.0/PROGRESS.md).
export { levelSpinStarGrant } from "./level_spin_star_grant";
// зачем: Q-COIN (b), координатор 01.10 — разовая серверная сверка монет по
// серверным фактам до 2.0 (results спинов без расписки), только вверх, с потолком.
// Деплой — вместе с levelSpinStarGrant в день релиза (DEPLOY_NOW.md).
export { coinReconcileV1 } from "./coin_reconcile_v1";
// D195 (владелец 15.10): старые бонусы → монеты один раз на человека; выкладка 17.10 пунктом SERVER_DEPLOY, выключатель legacy_bonus_enabled
export { legacyBonusConvertMine } from "./legacy_bonus_convert";
// зачем (D51/D53, Q12 2026-10-01): строка-итог миграции «Подарки → монеты»
// для контроля в админке. Деплой — прицельно и только после релиза 2.0 (D91).
export { giftsToCoinsMigrationReport } from "./gifts_to_coins_report";

// ── Админ-callables раздела «Рефералы» (гейт custom claim admin) ──
export {
  adminRevokeReferralAttribution,
  adminListReferrals,
  adminGetReferralDashboard,
  adminSpinStats,
  adminSpinLogs,
  // зачем: D80/D99 — веса и soft/emergency-управление рулеткой снова в админке.
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
export { adminListMistakeExplanationCache } from "./admin_explain_cache";
// зачем (владелец, 2026-08-31): отложенное удаление 14 дней — статус для
// модалки «Восстановить аккаунт?» и сама отмена удаления.
export { accountDeleteStatusMine, accountDeleteRestoreMine } from "./account_delete_restore";
// ИИ-аудитор покрытия удаления: смотрит карту базы, ничего не удаляет.
export { adminAuditAccountDeleteCoverage } from "./account_delete_ai_audit";
// зачем (Account V2, Пакет 6A): синхронизация аккаунта V2 и статус удаления по
// ключу. Экспортированы, но ВЫКЛЮЧЕНЫ серверным флагом config/accounts_v2
// (syncEnabled / deletionPurgeEnabled, по умолчанию false): деплой ничего не
// меняет для людей. Включает только владелец — после Пакета 6B и проверки.
export { accountsV2SyncApply } from "./accounts_v2_adapter/callable";
export { accountsV2DeletionStatus } from "./accounts_v2_deletion/status_callable";
// зачем (Account V2, Пакет 6G, OD21): перенос старых данных при первом входе
// каждого и гидрация своей учётки на новой установке. За тем же флагом
// config/accounts_v2.syncEnabled (выкл → accounts_v2_disabled, ноль чтений данных).
export { accountsV2MigrateMine } from "./accounts_v2_adapter/migrate_mine";
export { accountsV2PullMine } from "./accounts_v2_adapter/pull_mine";
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

// ── Telegram owner alerts: durable privacy-safe outbox and selected sources ──
export {
  adminAlertDispatchOnCreate,
  adminAlertRecoveryCron,
  adminGetAlertDiagnostics,
} from "./admin_alert_dispatcher";
export { customCardMilestoneNotify } from "./custom_card_milestone";
export {
  adminAlertOnReferralAttributionWrite,
  adminAlertOnBanWrite,
} from "./admin_alert_sources_people";
export { adminAlertOnFeedbackCreated } from "./admin_alert_sources_ratings";
export {
  adminAlertOnRevenueCatReceipt,
  adminAlertOnWebPremiumOrderWritten,
  adminAlertOnTelegramPremiumOrderWritten,
  adminAlertOnCommunityPackPurchaseWritten,
  adminAlertOnGiftCertificateCreated,
  adminAlertOnPromoRedemptionCreated,
} from "./admin_alert_sources_revenue";
export {
  adminAlertOnUserIdeaCreated,
  adminAlertOnWebsiteContactCreated,
  adminAlertOnSupportEmailCreated,
  adminAlertOnCommunitySubmissionCreated,
  adminAlertOnCommunityPackReportCreated,
  adminAlertOnCancelReasonCreated,
  adminAlertOnExplanationReportCreated,
} from "./admin_alert_sources_reports";
export {
  adminAlertOnAdminAuditCreated,
  adminAlertOnPushJobWritten,
  adminAlertOnAppMessageWritten,
  adminAlertOnComplianceControlWritten,
  adminAlertOnJarvisPlanWritten,
} from "./admin_alert_sources_ops";
export {
  adminAlertDailyDigestsCron,
} from "./admin_alert_digests";
