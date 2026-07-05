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
exports.emailUnsubscribe = exports.adminEmailContactsBackfill = exports.adminEmailBroadcast = exports.adminTranslateMessage = exports.openAiJobsConfig = exports.openAiDialogQuotaConfig = exports.openAiDialogModelConfig = exports.openAiBudgetDashboard = exports.promoCodeBatchUpsert = exports.promoCodeUpsert = exports.promoCodeRedeem = exports.adminGrantReward = exports.adminDraftReportReply = exports.claimReportReward = exports.adminReplyToReport = exports.adminSupportSetStatus = exports.adminSupportSaveSignature = exports.adminSupportSendReply = exports.adminSupportGenerateReply = exports.adminSupportPull = exports.adminGenerateDailyDigest = exports.friendSendGift = exports.premiumExpiryCron = exports.syncFriendActivityMirrorCron = exports.communityMarkSellerInboxSeen = exports.communityListSellerInbox = exports.communityPurchasePack = exports.communityFetchPackCardsIfAccessible = exports.communityAdminModeratePack = exports.communityModerateSubmission = exports.communitySubmitPackForReview = exports.questionTimeout = exports.onArenaRematchAccepted = exports.onArenaSessionAborted = exports.onArenaSessionFinished = exports.onAnswerSubmitted = exports.onSessionCountdown = exports.onSessionPlayerLobby = exports.onSessionGetReady = exports.onArenaRoomMatched = exports.matchmakingCron = exports.onMatchmakingWrite = exports.gmailSupportPullCron = exports.premiumExpiryReminderCron = exports.reEngagePushCron = exports.cleanupExpiredAppMessagesCron = exports.resetWeeklyXpCron = exports.computeLeaderboardStatsCron = exports.constellationCron = exports.onConstellationQueueWrite = void 0;
exports.webLeadNudgeCron = exports.webLeadCapture = exports.webPrices = exports.webOrderStatus = exports.paypalOrderCapture = exports.paypalOrderCreate = exports.stripeWebhook = exports.webCheckoutCreate = exports.adminPushJobsCron = exports.adminPushJobCreated = exports.revenueCatShardsWebhook = exports.siteStatsTrack = exports.submitWebsiteContact = exports.dailyPhraseSetSaved = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v2"));
const arena_scoring_1 = require("./arena_scoring");
const xp_levels_1 = require("./xp_levels");
const arena_rank_progression_1 = require("./arena_rank_progression");
const arena_season_1 = require("./arena_season");
const arena_season_config_1 = require("./arena_season_config");
admin.initializeApp();
// These imports must come AFTER initializeApp() — use require to control order
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runMatchmaking, tryMatchForUser } = require('./matchmaking');
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
const { onPlayerAnswered, startSessionCountdown, onQuestionTimeout } = require('./game_loop');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { processLobbyAfterChoice } = require('./arena_pregame');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueChatAuthorizeRoom, leagueChatSendMessage, leagueChatReportMessage, leagueChatDeleteMessage } = require('./league_chat');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueJoinOrUpdateGroup, leagueUpdateMyMember, leagueSyncMyBoost, leagueActivateGroupBoost } = require('./league_groups');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authEnsureStableLink, authStampAnonOwnership } = require('./auth_identity');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authMergeStableAccounts } = require('./auth_merge');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { accountDeleteMine } = require('./account_delete');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leaderboardUpdateDailyAnalytics, nameCheckAvailability, nameReserve, nameReleaseMine, } = require('./leaderboard');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueChestClaim } = require('./league_chest');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { arenaClubWarContribute } = require('./arena_club_wars');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { arenaHillRecordAttempt, arenaHillGetDailyTop } = require('./arena_hill');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { arenaBotMatchRecord } = require('./arena_bot_match');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { arenaSeasonRolloverCron } = require('./arena_season_cron');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { arenaSeasonGetTop, arenaSeasonClaimReward } = require('./arena_season_rewards');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { arenaHillDailyRewardCron } = require('./arena_hill_daily_reward');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendEnsureMyCode } = require('./friend_codes');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendLookupUser } = require('./friend_lookup');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendLikeActivity, friendUnlikeActivity } = require('./friend_activity_likes');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendSendGift, friendThankGift, friendGetActiveQuest, friendClaimQuestReward, } = require('./friend_gifts');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { arenaRoomCreate, arenaRoomRecordRun, arenaPulsePublish, arenaRoomJoin, arenaRoomLeave, arenaRoomSetReady, arenaRoomKick, arenaRoomClose, arenaRoomChatSend, } = require('./arena_rooms');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { arenaGhostCreateChallenge, arenaGhostRecordPlay } = require('./arena_ghosts');
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
const { speakingClubSend, speakingClubReview } = require('./speaking_club');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { weeklyReviewGenerate } = require('./weekly_review');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { statsInsightsGenerate } = require('./stats_insights');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { explainPhrase } = require('./explain_phrase');
const { explainChoice } = require('./explain_choice');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { explainQuiz } = require('./explain_quiz');
const { compassGenerate } = require('./compass');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { helpBoardCreateTopic, helpBoardAddComment, helpBoardVote, helpBoardReport, helpBoardDeleteMyTopic, helpBoardAdminModerate, helpBoardGenerateCompassForTopic, helpBoardCompassRetryCron, } = require('./help_board');
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
const { profileCardUpgrade } = require('./profile_card_upgrade');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { constellationSubmitAction } = require('./constellations/submit');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { constellationAdmin } = require('./constellations/admin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { tryMatchConstellationUser, constellationQueueCron, fillConstellationAfterDelay } = require('./constellations/queue');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitUserIdea, adminDecideUserIdea, adminDraftIdeaDecision } = require('./user_ideas');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueFinalizeCron } = require('./league_finalize_cron');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { compassChatDailyCron, compassChatRunNow } = require('./compass_chat_cron');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { notifyOnFriendRequestCreated, notifyOnFriendAccepted, userNotificationsCleanupCron, } = require('./user_notifications');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { progressSubmitEvent, progressMigrateSnapshot } = require('./progress_events');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { adminAlertOnUserReport, adminAlertOnCriticalError, adminAlertOnContentReport, adminAlertContentReportDigest, adminAlertOnCancelSurvey, adminAlertOnUgcRefund, adminAlertOnConfigWritten, } = require('./admin_alerts');
exports.leagueChatAuthorizeRoom = leagueChatAuthorizeRoom;
exports.leagueChatSendMessage = leagueChatSendMessage;
exports.leagueChatReportMessage = leagueChatReportMessage;
exports.leagueChatDeleteMessage = leagueChatDeleteMessage;
exports.leagueJoinOrUpdateGroup = leagueJoinOrUpdateGroup;
exports.leagueUpdateMyMember = leagueUpdateMyMember;
exports.leagueSyncMyBoost = leagueSyncMyBoost;
exports.leagueActivateGroupBoost = leagueActivateGroupBoost;
exports.authEnsureStableLink = authEnsureStableLink;
exports.authStampAnonOwnership = authStampAnonOwnership;
exports.authMergeStableAccounts = authMergeStableAccounts;
exports.accountDeleteMine = accountDeleteMine;
exports.leaderboardUpdateDailyAnalytics = leaderboardUpdateDailyAnalytics;
exports.nameCheckAvailability = nameCheckAvailability;
exports.nameReserve = nameReserve;
exports.nameReleaseMine = nameReleaseMine;
exports.leagueChestClaim = leagueChestClaim;
exports.arenaClubWarContribute = arenaClubWarContribute;
exports.arenaHillRecordAttempt = arenaHillRecordAttempt;
exports.arenaHillGetDailyTop = arenaHillGetDailyTop;
exports.arenaBotMatchRecord = arenaBotMatchRecord;
exports.arenaSeasonRolloverCron = arenaSeasonRolloverCron;
exports.arenaSeasonGetTop = arenaSeasonGetTop;
exports.arenaSeasonClaimReward = arenaSeasonClaimReward;
exports.arenaHillDailyRewardCron = arenaHillDailyRewardCron;
exports.friendEnsureMyCode = friendEnsureMyCode;
exports.friendLookupUser = friendLookupUser;
exports.friendLikeActivity = friendLikeActivity;
exports.friendUnlikeActivity = friendUnlikeActivity;
exports.friendSendGift = friendSendGift;
exports.friendThankGift = friendThankGift;
exports.friendGetActiveQuest = friendGetActiveQuest;
exports.friendClaimQuestReward = friendClaimQuestReward;
exports.arenaRoomCreate = arenaRoomCreate;
exports.arenaRoomRecordRun = arenaRoomRecordRun;
exports.arenaPulsePublish = arenaPulsePublish;
exports.arenaRoomJoin = arenaRoomJoin;
exports.arenaRoomLeave = arenaRoomLeave;
exports.arenaRoomSetReady = arenaRoomSetReady;
exports.arenaRoomKick = arenaRoomKick;
exports.arenaRoomClose = arenaRoomClose;
exports.arenaRoomChatSend = arenaRoomChatSend;
exports.arenaGhostCreateChallenge = arenaGhostCreateChallenge;
exports.arenaGhostRecordPlay = arenaGhostRecordPlay;
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
exports.speakingClubSend = speakingClubSend;
exports.speakingClubReview = speakingClubReview;
exports.weeklyReviewGenerate = weeklyReviewGenerate;
exports.statsInsightsGenerate = statsInsightsGenerate;
exports.explainPhrase = explainPhrase;
exports.explainChoice = explainChoice;
exports.explainQuiz = explainQuiz;
exports.compassGenerate = compassGenerate;
exports.helpBoardCreateTopic = helpBoardCreateTopic;
exports.helpBoardAddComment = helpBoardAddComment;
exports.helpBoardVote = helpBoardVote;
exports.helpBoardReport = helpBoardReport;
exports.helpBoardDeleteMyTopic = helpBoardDeleteMyTopic;
exports.helpBoardAdminModerate = helpBoardAdminModerate;
exports.helpBoardGenerateCompassForTopic = helpBoardGenerateCompassForTopic;
exports.helpBoardCompassRetryCron = helpBoardCompassRetryCron;
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
exports.profileCardUpgrade = profileCardUpgrade;
exports.submitUserIdea = submitUserIdea;
exports.adminDecideUserIdea = adminDecideUserIdea;
exports.adminDraftIdeaDecision = adminDraftIdeaDecision;
exports.leagueFinalizeCron = leagueFinalizeCron;
exports.compassChatDailyCron = compassChatDailyCron;
exports.compassChatRunNow = compassChatRunNow;
exports.constellationSubmitAction = constellationSubmitAction;
exports.constellationAdmin = constellationAdmin;
// ─── «Созвездия» (specs/constellations.md): очередь + минутный cron ──────────
// Мгновенный подбор на записи в очередь (B2); cron добирает ботами после
// bot_fill_delay (B3) и служит watchdog'ом фаз (edge «матч завис», ≤60с).
exports.onConstellationQueueWrite = functions.firestore.onDocumentWritten(
// timeoutSeconds 90: после мгновенной попытки функция «досыпает» до
// bot_fill_delay (30с) и добирает матч ботами точно в срок — игрок не ждёт
// минутный cron (он остаётся страховкой).
{ document: 'constellation_queue/{userId}', timeoutSeconds: 90 }, async (event) => {
    const beforeExists = !!event.data?.before.exists;
    const after = event.data?.after;
    const afterData = after?.exists ? after.data() : undefined;
    const beforeData = beforeExists ? event.data?.before.data() : undefined;
    // Живой счётчик «в поиске»: активная запись = существует и ещё без matchId.
    // Обновляем инкрементально на каждое изменение — клиент видит ненулевое
    // число мгновенно, не дожидаясь минутного cron (он лишь сверяет точное).
    const wasSearching = beforeExists && !beforeData?.matchId;
    const isSearching = !!after?.exists && !afterData?.matchId;
    const delta = (isSearching ? 1 : 0) - (wasSearching ? 1 : 0);
    if (delta !== 0) {
        try {
            await admin.firestore().doc('app_meta/constellation_searching').set({
                searchingCount: admin.firestore.FieldValue.increment(delta),
                updatedAt: Date.now(),
            }, { merge: true });
        }
        catch (e) {
            console.warn('constellation searching increment', e);
        }
    }
    if (!after?.exists || afterData?.matchId)
        return;
    // Дальше — только на СОЗДАНИЕ новой записи поиска (не на server-side update).
    if (beforeExists)
        return;
    const userId = event.params.userId;
    try {
        await tryMatchConstellationUser(userId);
    }
    catch (e) {
        console.warn('onConstellationQueueWrite tryMatch', e);
    }
    try {
        await fillConstellationAfterDelay(userId);
    }
    catch (e) {
        console.warn('onConstellationQueueWrite botFill', e);
    }
});
exports.constellationCron = functions.scheduler.onSchedule({ schedule: 'every 1 minutes', timeZone: 'UTC' }, async () => { await constellationQueueCron(); });
const PRIVATE_DUEL_QUESTION_COUNT = 10;
function progressTotalXpCf(progress) {
    const raw = progress?.user_total_xp;
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) || 0 : 0;
    return n > 0 ? n : 0;
}
function mergeArenaCourseExtras(a, b) {
    if (!a)
        return b;
    if (b.points > a.points) {
        return {
            points: b.points,
            frame: b.frame ?? a.frame,
            aura: b.aura ?? a.aura,
            isPremium: a.isPremium || b.isPremium,
            isVip: a.isVip || b.isVip,
            avatarEmoji: b.avatarEmoji ?? a.avatarEmoji,
            profileCardLevel: b.profileCardLevel ?? a.profileCardLevel,
            profileCardTheme: b.profileCardTheme ?? a.profileCardTheme,
            profileCardMotion: b.profileCardMotion ?? a.profileCardMotion,
            profileCardPublicFocus: b.profileCardPublicFocus ?? a.profileCardPublicFocus,
        };
    }
    if (a.points > b.points) {
        return {
            points: a.points,
            frame: a.frame ?? b.frame,
            aura: a.aura ?? b.aura,
            isPremium: a.isPremium || b.isPremium,
            isVip: a.isVip || b.isVip,
            avatarEmoji: a.avatarEmoji ?? b.avatarEmoji,
            profileCardLevel: a.profileCardLevel ?? b.profileCardLevel,
            profileCardTheme: a.profileCardTheme ?? b.profileCardTheme,
            profileCardMotion: a.profileCardMotion ?? b.profileCardMotion,
            profileCardPublicFocus: a.profileCardPublicFocus ?? b.profileCardPublicFocus,
        };
    }
    return {
        points: a.points,
        frame: a.frame ?? b.frame,
        aura: a.aura ?? b.aura,
        isPremium: a.isPremium || b.isPremium,
        isVip: a.isVip || b.isVip,
        avatarEmoji: a.avatarEmoji ?? b.avatarEmoji,
        profileCardLevel: a.profileCardLevel ?? b.profileCardLevel,
        profileCardTheme: a.profileCardTheme ?? b.profileCardTheme,
        profileCardMotion: a.profileCardMotion ?? b.profileCardMotion,
        profileCardPublicFocus: a.profileCardPublicFocus ?? b.profileCardPublicFocus,
    };
}
function parseLeaderboardDocCf(data) {
    if (!data)
        return null;
    const points = typeof data.points === 'number' ? data.points : 0;
    const frame = typeof data.frame === 'string' && data.frame.trim() ? data.frame.trim() : undefined;
    const aura = typeof data.aura === 'string' && data.aura.trim() ? data.aura.trim() : undefined;
    const avatarEmoji = typeof data.avatar === 'string' && data.avatar.trim() ? data.avatar.trim() : undefined;
    return {
        points,
        frame,
        aura,
        isPremium: !!data.isPremium,
        isVip: !!data.isVip,
        avatarEmoji,
        profileCardLevel: Math.max(0, Math.min(1, parseInt(String(data.profileCardLevel ?? '0'), 10) || 0)),
        profileCardTheme: typeof data.profileCardTheme === 'string' && data.profileCardTheme.trim() ? data.profileCardTheme.trim().slice(0, 32) : 'classic',
        profileCardMotion: typeof data.profileCardMotion === 'string' && data.profileCardMotion.trim() ? data.profileCardMotion.trim().slice(0, 32) : 'none',
        profileCardPublicFocus: typeof data.profileCardPublicFocus === 'string' && data.profileCardPublicFocus.trim() ? data.profileCardPublicFocus.trim().slice(0, 32) : 'balanced',
    };
}
/** После матча: копируем очки уроков на arena_profiles для корректного топа у всех клиентов. */
async function enrichArenaCourseDisplay(db, authUid) {
    let mirrorStableId = null;
    try {
        const qSnap = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
        if (!qSnap.empty)
            mirrorStableId = qSnap.docs[0].id;
        else {
            const udir = await db.collection('users').doc(authUid).get();
            if (udir.exists)
                mirrorStableId = authUid;
        }
    }
    catch {
        /* ignore */
    }
    let best = { points: 0, isPremium: false, isVip: false };
    const absorbStableId = async (stableId) => {
        const udoc = await db.collection('users').doc(stableId).get();
        let xp = 0;
        if (udoc.exists) {
            const progress = udoc.data()?.progress;
            xp = progressTotalXpCf(progress);
        }
        const lbSnap = await db.collection('leaderboard').doc(stableId).get();
        const fromLb = lbSnap.exists ? parseLeaderboardDocCf(lbSnap.data()) : null;
        const chunk = mergeArenaCourseExtras({ points: xp, isPremium: false, isVip: false }, fromLb ?? { points: 0, isPremium: false, isVip: false });
        best = mergeArenaCourseExtras(best, chunk);
    };
    const toAbsorb = new Set([authUid]);
    if (mirrorStableId)
        toAbsorb.add(mirrorStableId);
    for (const id of toAbsorb) {
        await absorbStableId(id);
    }
    if (best.points <= 0 && !best.isPremium && !best.isVip && !best.frame && !best.aura && !best.avatarEmoji && !best.profileCardLevel && !mirrorStableId)
        return;
    const hasCourse = best.points > 0 || best.isPremium || best.isVip || !!best.frame || !!best.aura || !!best.avatarEmoji || !!best.profileCardLevel;
    await db.collection('arena_profiles').doc(authUid).set({
        ...(hasCourse
            ? {
                courseTotalXp: best.points,
                courseAvatar: best.avatarEmoji ?? null,
                courseFrame: best.frame ?? null,
                courseAura: best.aura ?? null,
                courseIsPremium: best.isPremium,
                courseIsVip: best.isVip,
                courseProfileCardLevel: best.profileCardLevel ?? 0,
                courseProfileCardTheme: best.profileCardTheme ?? 'classic',
                courseProfileCardMotion: best.profileCardMotion ?? 'none',
                courseProfileCardPublicFocus: best.profileCardPublicFocus ?? 'balanced',
            }
            : {}),
        courseDisplayAt: Date.now(),
        ...(mirrorStableId ? { mirrorStableId } : {}),
    }, { merge: true });
}
// Placeholder display names, которые клиент ставит, если у юзера нет user_name в AsyncStorage
// (см. app/arena_lobby.tsx defaultPlayerName). Если приходит такое имя — НЕ перетираем уже
// сохранённое в arena_profiles, чтобы локализационные default'ы не маскировали нормальный ник.
const PLACEHOLDER_NAMES = new Set([
    'Игрок',
    'Гравець',
    'Jugador',
    'Player',
    'Соперник',
    'Суперник',
    'Opponent',
]);
function pickIncomingDisplayName(raw) {
    const dn = String(raw ?? '').trim();
    if (!dn)
        return null;
    if (PLACEHOLDER_NAMES.has(dn))
        return null;
    // Защита от излишне длинных значений (firestore.rules ограничивает 120, но дублируем).
    return dn.slice(0, 120);
}
function readArenaNumber(raw, fallback = 0) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
}
function readArenaProfileRank(data, preferLegacy = false) {
    return {
        tier: String((preferLegacy ? data['rank.tier'] ?? data.rank?.tier : data.rank?.tier ?? data['rank.tier']) ?? 'bronze'),
        level: String((preferLegacy ? data['rank.level'] ?? data.rank?.level : data.rank?.level ?? data['rank.level']) ?? 'I'),
        stars: Math.max(0, Math.trunc(readArenaNumber(preferLegacy ? data['rank.stars'] ?? data.rank?.stars : data.rank?.stars ?? data['rank.stars'], 0))),
    };
}
function readArenaProfileStats(data) {
    const nested = {
        matchesPlayed: Math.max(0, Math.trunc(readArenaNumber(data.stats?.matchesPlayed, 0))),
        matchesWon: Math.max(0, Math.trunc(readArenaNumber(data.stats?.matchesWon, 0))),
        totalScore: Math.max(0, Math.trunc(readArenaNumber(data.stats?.totalScore, 0))),
        winStreak: Math.max(0, Math.trunc(readArenaNumber(data.stats?.winStreak, 0))),
        bestWinStreak: Math.max(0, Math.trunc(readArenaNumber(data.stats?.bestWinStreak, 0))),
    };
    const legacy = {
        matchesPlayed: Math.max(0, Math.trunc(readArenaNumber(data['stats.matchesPlayed'] ?? data.stats?.matchesPlayed, 0))),
        matchesWon: Math.max(0, Math.trunc(readArenaNumber(data['stats.matchesWon'] ?? data.stats?.matchesWon, 0))),
        totalScore: Math.max(0, Math.trunc(readArenaNumber(data['stats.totalScore'] ?? data.stats?.totalScore, 0))),
        winStreak: Math.max(0, Math.trunc(readArenaNumber(data['stats.winStreak'] ?? data.stats?.winStreak, 0))),
        bestWinStreak: Math.max(0, Math.trunc(readArenaNumber(data['stats.bestWinStreak'] ?? data.stats?.bestWinStreak, 0))),
    };
    const preferLegacy = legacy.matchesPlayed > nested.matchesPlayed;
    return { stats: preferLegacy ? legacy : nested, preferLegacy };
}
async function pickArenaQuestions(count) {
    const db = admin.firestore();
    // Честная случайная выборка из ВСЕГО банка через rand-pivot (как pickQuestions),
    // а не «первые ~count*3 документа по id» — иначе приватные дуэли/реванш крутят
    // один и тот же узкий набор вопросов. Уровень тут НЕ фильтруем (приватный матч
    // с другом — общий банк).
    const pivot = Math.random();
    const [snapA, snapB] = await Promise.all([
        db.collection('arena_questions').where('rand', '>=', pivot).orderBy('rand').limit(count * 4).get(),
        db.collection('arena_questions').where('rand', '<', pivot).orderBy('rand').limit(count * 4).get(),
    ]);
    let ids = [...snapA.docs.map((d) => d.id), ...snapB.docs.map((d) => d.id)];
    // Страховка для документов без поля `rand` (исторически весь A1) — добираем
    // простым запросом без rand-фильтра, иначе они невидимы для rand-запроса.
    if (ids.length < count) {
        const plain = await db.collection('arena_questions').limit(Math.max(count * 4, count)).get();
        ids = Array.from(new Set([...ids, ...plain.docs.map((d) => d.id)]));
    }
    for (let i = ids.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const out = ids.slice(0, count);
    if (out.length < count) {
        console.error(`pickArenaQuestions: need ${count} got ${out.length}`);
        throw new Error(`Insufficient arena_questions (need ${count}, got ${out.length})`);
    }
    return out;
}
// ─── Leaderboard percentile stats cron ──────────────────────────────────────
// Runs daily. Computes p1-p99 thresholds for XP/streak/time/arena
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
// ─── Matchmaking: instant trigger on queue write ──────────────────────────────
exports.onMatchmakingWrite = functions.firestore.onDocumentWritten('matchmaking_queue/{userId}', async (event) => {
    const beforeData = event.data?.before.exists ? event.data.before.data() : null;
    const afterData = event.data?.after.exists ? event.data.after.data() : null;
    const beforeSearching = !!beforeData && !beforeData.sessionId;
    const afterSearching = !!afterData && !afterData.sessionId;
    // tryMatch, потім один publish — клієнт тягне `app_meta/matchmaking_searching` (колекція
    // після матчу скидає «0 у пошуку», бо в доках з'являється sessionId).
    const after = event.data?.after;
    if (after?.exists) {
        const data = after.data();
        if (!data?.sessionId) {
            const userId = event.params.userId;
            try {
                await tryMatchForUser(userId);
            }
            catch {
                // гонка транзакції — нормально
            }
        }
    }
    try {
        const delta = (afterSearching ? 1 : 0) - (beforeSearching ? 1 : 0);
        if (delta !== 0) {
            await admin.firestore().doc('app_meta/matchmaking_searching').set({
                searchingCount: admin.firestore.FieldValue.increment(delta),
                updatedAt: Date.now(),
            }, { merge: true });
        }
    }
    catch (e) {
        console.error('updateMatchmakingSearchingCount', e);
    }
});
// ─── Matchmaking: 1-min cron fallback for players who didn\'t trigger onWrite ──
exports.matchmakingCron = functions.scheduler.onSchedule({ schedule: 'every 5 minutes', timeZone: 'UTC' }, async () => { await runMatchmaking(); });
// ─── Arena room accept flow (server-authoritative session creation) ───────────
exports.onArenaRoomMatched = functions.firestore.onDocumentUpdated('arena_rooms/{roomId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    if (after.status !== 'matched')
        return;
    if (!after.hostId || !after.guestId)
        return;
    if (after.sessionId)
        return;
    if (before?.status === 'matched' && before?.sessionId)
        return;
    const db = admin.firestore();
    const roomId = event.params.roomId;
    const roomRef = event.data.after.ref;
    const sessionRef = db.collection('arena_sessions').doc(roomId);
    const hostPlayerRef = db.collection('session_players').doc(`${roomId}_${after.hostId}`);
    const guestPlayerRef = db.collection('session_players').doc(`${roomId}_${after.guestId}`);
    const questions = await pickArenaQuestions(PRIVATE_DUEL_QUESTION_COUNT);
    const tPrivate = Date.now();
    // Read XP + selected avatar for both players to record the displayed avatar in session_players.
    const [hostUserSnap, guestUserSnap] = await Promise.all([
        db.collection('users').doc(after.hostId).get().catch(() => null),
        db.collection('users').doc(after.guestId).get().catch(() => null),
    ]);
    const hostData = hostUserSnap?.data();
    const guestData = guestUserSnap?.data();
    const hostXp = parseInt(hostData?.progress?.user_total_xp ?? '0') || 0;
    const guestXp = parseInt(guestData?.progress?.user_total_xp ?? '0') || 0;
    const hostLevel = (0, xp_levels_1.getLevelFromXP)(hostXp);
    const guestLevel = (0, xp_levels_1.getLevelFromXP)(guestXp);
    const hostAvatarRaw = typeof hostData?.progress?.user_avatar === 'string' ? hostData.progress.user_avatar.trim() : '';
    const guestAvatarRaw = typeof guestData?.progress?.user_avatar === 'string' ? guestData.progress.user_avatar.trim() : '';
    const hostAuraRaw = typeof hostData?.progress?.user_avatar_aura === 'string' ? hostData.progress.user_avatar_aura.trim() : '';
    const guestAuraRaw = typeof guestData?.progress?.user_avatar_aura === 'string' ? guestData.progress.user_avatar_aura.trim() : '';
    const hostAvatar = hostAvatarRaw && !/^\d+$/.test(hostAvatarRaw) ? hostAvatarRaw : String(hostLevel);
    const guestAvatar = guestAvatarRaw && !/^\d+$/.test(guestAvatarRaw) ? guestAvatarRaw : String(guestLevel);
    await db.runTransaction(async (tx) => {
        const roomSnap = await tx.get(roomRef);
        const sessionSnap = await tx.get(sessionRef);
        if (!roomSnap.exists)
            return;
        const room = roomSnap.data();
        if (room.status !== 'matched' || !room.guestId || !room.hostId)
            return;
        if (room.sessionId || sessionSnap.exists)
            return;
        tx.set(sessionRef, {
            id: roomId,
            type: 'private',
            size: 2,
            state: 'countdown',
            rankTier: 'bronze',
            playerIds: [room.hostId, room.guestId],
            questions,
            currentQuestionIndex: 0,
            questionStartedAt: null,
            questionTimeoutMs: 40000,
            createdAt: tPrivate,
        });
        tx.set(hostPlayerRef, {
            sessionId: roomId,
            playerId: room.hostId,
            displayName: room.hostName ?? 'Игрок',
            avatar: hostAvatar,
            aura: hostAuraRaw || null,
            avatarLevel: hostLevel,
            score: 0,
            answers: [],
            lobbyChoice: 'accept',
        }, { merge: true });
        tx.set(guestPlayerRef, {
            sessionId: roomId,
            playerId: room.guestId,
            displayName: room.guestName ?? 'Игрок',
            avatar: guestAvatar,
            aura: guestAuraRaw || null,
            avatarLevel: guestLevel,
            score: 0,
            answers: [],
            lobbyChoice: 'accept',
        }, { merge: true });
        tx.update(roomRef, { sessionId: roomId });
    });
});
// ─── Pre-match: get_ready → countdown (через 2.5s після згоди) ──────────────
const GET_READY_TO_COUNTDOWN_MS = 2500;
exports.onSessionGetReady = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after || after.state !== 'get_ready')
        return;
    if (before?.state === 'get_ready')
        return;
    const sessionId = event.params.sessionId;
    const ref = event.data.after.ref;
    await new Promise((r) => {
        setTimeout(r, GET_READY_TO_COUNTDOWN_MS);
    });
    const cur = await ref.get();
    const d = cur.data();
    if (d?.state !== 'get_ready')
        return;
    await ref.update({ state: 'countdown' });
});
// ─── Accept / decline на session_players ────────────────────────────────────
exports.onSessionPlayerLobby = functions.firestore.onDocumentUpdated('session_players/{docId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after?.sessionId)
        return;
    if (after.lobbyChoice === before?.lobbyChoice)
        return;
    if (after.lobbyChoice !== 'accept' && after.lobbyChoice !== 'decline')
        return;
    try {
        await processLobbyAfterChoice(after.sessionId);
    }
    catch (e) {
        console.error('processLobbyAfterChoice', e);
    }
});
// ─── Game loop ────────────────────────────────────────────────────────────────
exports.onSessionCountdown = functions.firestore.onDocumentWritten('arena_sessions/{sessionId}', async (event) => {
    const before = event.data?.before.exists ? event.data?.before.data() : null;
    const after = event.data?.after.data();
    if (!after)
        return;
    if (before?.state !== 'countdown' && after.state === 'countdown') {
        await startSessionCountdown(event.params.sessionId);
    }
});
exports.onAnswerSubmitted = functions.firestore.onDocumentUpdated('session_players/{docId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const prevCount = before.answers.length;
    const nextCount = after.answers.length;
    if (nextCount <= prevCount)
        return;
    const lastAnswer = after.answers[nextCount - 1];
    if (!lastAnswer?.questionId)
        return;
    const playerRef = event.data.after.ref;
    const db = admin.firestore();
    const sessionId = after.sessionId;
    await db.runTransaction(async (tx) => {
        const playerSnap = await tx.get(playerRef);
        if (!playerSnap.exists)
            return;
        const playerData = playerSnap.data();
        const answers = [...(playerData.answers || [])];
        if (answers.length === 0)
            return;
        const idx = answers.length - 1;
        const pending = answers[idx];
        if (!pending || pending.questionId !== lastAnswer.questionId)
            return;
        if (pending.serverScored)
            return;
        const previousAnswers = answers.slice(0, idx);
        let previousCorrectStreak = 0;
        for (let i = previousAnswers.length - 1; i >= 0; i -= 1) {
            if (!previousAnswers[i]?.isCorrect)
                break;
            previousCorrectStreak += 1;
        }
        const hasAnyCorrectBefore = previousAnswers.some((a) => a?.isCorrect);
        const questionSnap = await tx.get(db.collection('arena_questions').doc(lastAnswer.questionId));
        const correct = questionSnap.exists ? questionSnap.data()?.correct : undefined;
        if (!correct)
            return;
        const { isCorrect, points, bonus } = (0, arena_scoring_1.calculateArenaPoints)((pending.answer ?? null), correct, typeof pending.timeMs === 'number' ? pending.timeMs : 0, {
            previousCorrectStreak,
            hasAnyCorrectBefore,
        });
        answers[idx] = {
            ...pending,
            isCorrect,
            points,
            bonus,
            serverScored: true,
        };
        tx.update(playerRef, {
            answers,
            score: admin.firestore.FieldValue.increment(points),
        });
    });
    await onPlayerAnswered(sessionId, lastAnswer.questionId);
});
// ─── Arena results finalization (server-authoritative) ───────────────────────
exports.onArenaSessionFinished = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    if (after.state !== 'finished')
        return;
    if (before?.state === 'finished' && after.resultProcessedAt)
        return;
    if (!after.playerIds || after.playerIds.length === 0)
        return;
    const db = admin.firestore();
    const sessionId = event.params.sessionId;
    const sessionRef = event.data.after.ref;
    const DRAW_XP = 30;
    // Исходы для push после commit (won/draw на игрока). Дружеские матчи не пушим
    // как «ранговый результат» — там нет звёзд.
    const outcomes = [];
    // Тюнинг SR из Firestore (fallback = дефолты). Один раз до транзакции.
    const seasonCfg = await (0, arena_season_config_1.resolveArenaSeasonConfig)(db);
    await db.runTransaction(async (tx) => {
        const freshSession = await tx.get(sessionRef);
        const freshData = freshSession.data();
        if (!freshSession.exists || freshData?.resultProcessedAt)
            return;
        const isFriendDuel = freshData?.type === 'private' || freshData?.type === 'rematch';
        const forfeitedUid = typeof freshData?.forfeitedBy === 'string' && freshData.forfeitedBy.trim()
            ? freshData.forfeitedBy.trim()
            : '';
        // Firestore transaction rule: all reads must happen before any writes.
        // Считываем игроков внутри transaction, чтобы не ловить устаревшие score
        // в момент финализации (иначе won/isLast может считаться неверно).
        const playerIds = Array.isArray(after.playerIds) ? after.playerIds.filter(Boolean) : [];
        if (playerIds.length === 0)
            return;
        const playerSnapByUid = new Map();
        for (const uid of playerIds) {
            const playerRef = db.collection('session_players').doc(`${sessionId}_${uid}`);
            playerSnapByUid.set(uid, await tx.get(playerRef));
        }
        const players = [];
        for (const uid of playerIds) {
            const d = playerSnapByUid.get(uid)?.data();
            if (!d?.playerId)
                continue;
            players.push({
                playerId: d.playerId,
                displayName: d.displayName,
                score: Number(d.score ?? 0),
            });
        }
        if (players.length === 0)
            return;
        const sorted = [...players].sort((a, b) => b.score - a.score);
        // ── Детект ничьей ────────────────────────────────────────────────────────
        // Ничья = два или более игроков с максимальным счётом. Они не получают звёзд
        // и не «выигрывают» — чтобы при равных очках никто не ловил незаслуженный -1.
        // Сдача: forfeitedBy — не считаем ничью даже при равных очках у оставшихся.
        const topScore = sorted[0]?.score ?? 0;
        const lastScore = sorted[sorted.length - 1]?.score ?? 0;
        const tiedAtTopCount = sorted.filter((x) => x.score === topScore).length;
        const isDrawAtTop = !forfeitedUid && players.length > 1 && tiedAtTopCount > 1;
        // We need all profile snapshots first, because later we write to users/session/profile docs.
        const profileRefByUid = new Map();
        for (const p of players) {
            if (!p.playerId)
                continue;
            profileRefByUid.set(p.playerId, db.collection('arena_profiles').doc(p.playerId));
        }
        const profileSnapByUid = new Map();
        for (const [uid, ref] of profileRefByUid) {
            profileSnapByUid.set(uid, await tx.get(ref));
        }
        const sessionUpdate = { resultProcessedAt: Date.now() };
        for (const p of players) {
            const uid = p.playerId;
            if (!uid)
                continue;
            const pScore = Number(p.score ?? 0);
            let isDraw = isDrawAtTop && pScore === topScore;
            let won = !isDraw && pScore === topScore;
            let isLast = !isDraw && pScore === lastScore && pScore !== topScore;
            if (forfeitedUid && playerIds.includes(forfeitedUid)) {
                if (uid === forfeitedUid) {
                    isDraw = false;
                    won = false;
                    isLast = true;
                }
                else {
                    const alive = players.filter((x) => x.playerId !== forfeitedUid);
                    const aliveTop = alive.length ? Math.max(...alive.map((x) => x.score)) : 0;
                    const aliveLast = alive.length ? Math.min(...alive.map((x) => x.score)) : 0;
                    const tiedTopAlive = alive.filter((x) => x.score === aliveTop).length;
                    const drawAmongAlive = alive.length > 1 && tiedTopAlive > 1;
                    isDraw = drawAmongAlive && pScore === aliveTop;
                    won = !isDraw && pScore === aliveTop;
                    isLast = !isDraw && pScore === aliveLast && pScore !== aliveTop;
                }
            }
            const xpDelta = isDraw ? DRAW_XP : (won ? 50 : 15);
            outcomes.push({ uid, won, isDraw, xpDelta, isFriendDuel });
            const profileRef = profileRefByUid.get(uid) ?? db.collection('arena_profiles').doc(uid);
            const profileSnap = profileSnapByUid.get(uid);
            if (!profileSnap)
                continue;
            let oldStars = 0;
            let oldTier = 'bronze';
            let oldLevel = 'I';
            let newStars = 0;
            let newTier = 'bronze';
            let newLevel = 'I';
            let rankChanged = false;
            let promoted = false;
            let resultSr;
            let resultAtCeiling = false;
            if (!profileSnap.exists) {
                newStars = (!isFriendDuel && won) ? 1 : 0;
                // При создании профиля кладём pickIncomingDisplayName, иначе fallback на первое
                // непустое имя, чтобы избежать пустых записей. Placeholder-фолбэк ('Игрок') —
                // последняя страховка, его перетрёт следующий матч с нормальным ником.
                const initialDn = pickIncomingDisplayName(p.displayName) ?? (p.displayName?.trim() || 'Игрок');
                tx.set(profileRef, {
                    userId: uid,
                    displayName: initialDn,
                    avatarId: '1',
                    rank: { tier: 'bronze', level: 'I', stars: newStars },
                    xp: xpDelta,
                    stats: {
                        matchesPlayed: isFriendDuel ? 0 : 1,
                        matchesWon: !isFriendDuel && won ? 1 : 0,
                        totalScore: isFriendDuel ? 0 : (p.score ?? 0),
                        winStreak: !isFriendDuel && won ? 1 : 0,
                        bestWinStreak: !isFriendDuel && won ? 1 : 0,
                    },
                    updatedAt: Date.now(),
                }, { merge: true });
            }
            else {
                const data = profileSnap.data();
                const oldStatsRead = readArenaProfileStats(data);
                const oldRank = readArenaProfileRank(data, oldStatsRead.preferLegacy);
                const oldStats = oldStatsRead.stats;
                oldStars = oldRank.stars;
                oldTier = oldRank.tier;
                oldLevel = oldRank.level;
                const curStreak = oldStats.winStreak;
                const bestStreak = oldStats.bestWinStreak;
                if (isFriendDuel) {
                    // Дружеский матч: звёзды и ранг не меняются, серия побед не трогается
                    newStars = oldStars;
                    newTier = oldTier;
                    newLevel = oldLevel;
                    rankChanged = false;
                    promoted = false;
                    const incomingDn = pickIncomingDisplayName(p.displayName);
                    const dnPatch = incomingDn ? { displayName: incomingDn } : {};
                    tx.update(profileRef, {
                        xp: (data.xp ?? 0) + xpDelta,
                        ...dnPatch,
                        updatedAt: Date.now(),
                    });
                }
                else {
                    // SR живёт ТОЛЬКО на потолке (Легенда III). Ниже потолка — обычные звёзды.
                    const wasCeiling = oldTier === 'legend' && oldLevel === 'III';
                    const nowSeasonId = (0, arena_season_1.seasonIdForDate)(new Date());
                    const outcome = isDraw ? 'draw' : won ? 'win' : isLast ? 'loss' : 'neutral';
                    // Ничья — звёзды и ранг не меняются. Иначе: +1 за победу, -1 за последнее место.
                    // На потолке звёзды НЕ трогаем (starDelta=0) — там работает SR.
                    const starDelta = isDraw ? 0 : (won ? 1 : isLast ? -1 : 0);
                    const progressed = (0, arena_rank_progression_1.applyStarDelta)({ tier: oldTier, level: oldLevel, stars: oldStars }, wasCeiling ? 0 : starDelta);
                    newTier = progressed.tier;
                    newLevel = progressed.level;
                    newStars = progressed.stars;
                    rankChanged = newTier !== oldTier || newLevel !== oldLevel;
                    promoted = rankChanged && (0, arena_rank_progression_1.isPromotion)({ tier: oldTier, level: oldLevel }, { tier: newTier, level: newLevel });
                    // SR: лениво сбрасываем при новом сезоне; начисляем только если был на потолке.
                    const staleSeason = data.seasonId !== nowSeasonId;
                    const curSr = staleSeason ? 0 : (data.sr ?? 0);
                    const curPeak = staleSeason ? 0 : (data.peakSR ?? 0);
                    const curPeakRankIdx = staleSeason ? 0 : (data.seasonPeakRankIndex ?? 0);
                    const srResult = wasCeiling
                        ? (0, arena_season_1.applySeasonRatingDelta)(curSr, curPeak, outcome, false, seasonCfg)
                        : { sr: curSr, peakSR: curPeak };
                    const newPeakRankIdx = Math.max(curPeakRankIdx, (0, arena_season_1.rankIndex)(newTier, newLevel));
                    // Ничья сохраняет победную серию (не удлиняет её). Поражение — обнуляет.
                    const newStreak = won ? curStreak + 1 : isDraw ? curStreak : 0;
                    const STREAK_SHARD_COOLDOWN_MS = 24 * 60 * 60 * 1000;
                    const lastStreakShardAt = data.lastStreakShardAt ?? 0;
                    const streakShardReady = Date.now() - lastStreakShardAt > STREAK_SHARD_COOLDOWN_MS;
                    const rankUpStreakShardAwarded = promoted && newStreak >= 3 && streakShardReady;
                    // displayName обновляем, если из сессии пришло осмысленное имя — иначе при первом матче
                    // ставился дефолтный «Игрок» и больше не менялся даже после смены ника пользователем.
                    // Фильтр локализованных placeholder-ов на RU/UK/ES — см. PLACEHOLDER_NAMES выше.
                    const incomingDn = pickIncomingDisplayName(p.displayName);
                    const dnPatch = incomingDn ? { displayName: incomingDn } : {};
                    tx.update(profileRef, {
                        'rank.tier': newTier,
                        'rank.level': newLevel,
                        'rank.stars': newStars,
                        sr: srResult.sr,
                        peakSR: srResult.peakSR,
                        seasonId: nowSeasonId,
                        seasonPeakRankIndex: newPeakRankIdx,
                        xp: (data.xp ?? 0) + xpDelta,
                        'stats.matchesPlayed': oldStats.matchesPlayed + 1,
                        'stats.matchesWon': oldStats.matchesWon + (won ? 1 : 0),
                        'stats.totalScore': oldStats.totalScore + (p.score ?? 0),
                        'stats.winStreak': newStreak,
                        'stats.bestWinStreak': Math.max(bestStreak, newStreak),
                        ...dnPatch,
                        ...(rankUpStreakShardAwarded ? { lastStreakShardAt: Date.now() } : {}),
                        updatedAt: Date.now(),
                    });
                    // Сезонный лидерборд (топ-100): пишем строку только когда игрок на потолке.
                    if (wasCeiling) {
                        resultAtCeiling = true;
                        resultSr = srResult.sr;
                        const seasonLbRef = db
                            .collection('arena_season_leaderboard').doc(nowSeasonId)
                            .collection('entries').doc(uid);
                        tx.set(seasonLbRef, {
                            uid,
                            sr: srResult.sr,
                            peakSR: srResult.peakSR,
                            updatedAt: Date.now(),
                        }, { merge: true });
                    }
                }
            }
            if (!isFriendDuel) {
                const historyRef = profileRef.collection('match_history').doc(sessionId);
                tx.set(historyRef, {
                    createdAt: Date.now(),
                    sessionId,
                    won,
                    isDraw,
                    myScore: p.score ?? 0,
                    oppScore: sorted.find((x) => x.playerId !== uid)?.score ?? 0,
                    oppName: sorted.find((x) => x.playerId !== uid)?.displayName ?? 'Соперник',
                    xpGained: xpDelta,
                    starsChange: newStars - oldStars,
                    rankBefore: { tier: oldTier, level: oldLevel, stars: oldStars },
                    rankAfter: { tier: newTier, level: newLevel, stars: newStars },
                }, { merge: true });
            }
            const resultRef = db.collection('arena_session_results').doc(`${sessionId}_${uid}`);
            tx.set(resultRef, {
                sessionId,
                userId: uid,
                won,
                isDraw,
                xpGained: xpDelta,
                oldStars,
                newStars,
                oldTier,
                oldLevel,
                newTier,
                newLevel,
                rankChanged,
                promoted,
                rankUpStreakShardAwarded: (() => {
                    if (!profileSnap.exists)
                        return false;
                    const data = profileSnap.data();
                    const curStreak = data ? readArenaProfileStats(data).stats.winStreak : 0;
                    const newStreak = won ? curStreak + 1 : 0;
                    const STREAK_SHARD_COOLDOWN_MS = 24 * 60 * 60 * 1000;
                    const lastStreakShardAt = data?.lastStreakShardAt ?? 0;
                    const streakShardReady = Date.now() - lastStreakShardAt > STREAK_SHARD_COOLDOWN_MS;
                    return promoted && newStreak >= 3 && streakShardReady;
                })(),
                ...(resultAtCeiling ? { sr: resultSr, atCeiling: true } : {}),
                updatedAt: Date.now(),
            }, { merge: true });
        }
        tx.update(sessionRef, sessionUpdate);
    });
    const finishIds = Array.isArray(after.playerIds) ? after.playerIds.filter(Boolean) : [];
    try {
        if (finishIds.length > 0) {
            await Promise.all(finishIds.map((uid) => enrichArenaCourseDisplay(db, uid)));
        }
    }
    catch (e) {
        console.warn('enrichArenaCourseDisplay', e);
    }
    // Push о результате матча — игрок в фоне иначе не узнаёт исход PvP и не возвращается.
    // Токен читаем из users/{uid} (его сохраняет клиент при получении push-токена).
    // Дружеские дуэли не пушим как ранговый результат. Best-effort.
    try {
        const rankedOutcomes = outcomes.filter((o) => o.uid && !o.isFriendDuel);
        if (rankedOutcomes.length > 0) {
            const userSnaps = await Promise.all(rankedOutcomes.map((o) => db.collection('users').doc(o.uid).get()));
            const messages = [];
            rankedOutcomes.forEach((o, i) => {
                const token = userSnaps[i]?.data()?.expoPushToken;
                if (typeof token !== 'string' || !token.trim())
                    return;
                const title = o.won ? '🏆 Победа в дуэли!' : o.isDraw ? '🤝 Ничья в дуэли' : '⚔️ Матч завершён';
                const body = o.won
                    ? `Ты выиграл матч и получил +${o.xpDelta} XP!`
                    : o.isDraw
                        ? `Ничья — ты получил +${o.xpDelta} XP.`
                        : `Матч окончен. +${o.xpDelta} XP. Реванш?`;
                messages.push({
                    to: token.trim(),
                    sound: 'default',
                    title,
                    body,
                    data: { type: 'arena_match_result', sessionId, won: o.won, isDraw: o.isDraw },
                });
            });
            if (messages.length > 0) {
                await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(messages),
                });
            }
        }
    }
    catch (e) {
        console.warn('arena_finish_push', e);
    }
});
// ─── Arena: очистка orphan-данных при abort ──────────────────────────────────
// onArenaSessionFinished НЕ срабатывает на state='aborted' (decline / accept_timeout /
// stale_cleanup). Награды при abort не начисляются (откат не нужен), но session_players
// и arena_session_results остаются висеть как «призрачные» документы: игрок видит
// зависшие очки, а коллекции засоряются. Этот триггер удаляет orphan-доки при переходе
// сессии в aborted. Идемпотентен: повторный вызов на уже очищенной сессии — no-op.
exports.onArenaSessionAborted = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    if (after.state !== 'aborted')
        return;
    // Только на переход в aborted, а не на каждое последующее обновление.
    if (before?.state === 'aborted')
        return;
    const db = admin.firestore();
    const sessionId = event.params.sessionId;
    const playerIds = Array.isArray(after.playerIds) ? after.playerIds.filter(Boolean) : [];
    if (playerIds.length === 0)
        return;
    const refs = [];
    for (const uid of playerIds) {
        refs.push(db.collection('session_players').doc(`${sessionId}_${uid}`));
        refs.push(db.collection('arena_session_results').doc(`${sessionId}_${uid}`));
    }
    try {
        const batch = db.batch();
        for (const ref of refs)
            batch.delete(ref);
        await batch.commit();
    }
    catch (e) {
        console.error('onArenaSessionAborted: cleanup failed', sessionId, e);
    }
});
// ─── Rematch: создать новую сессию когда оппонент принял предложение ──────────
exports.onArenaRematchAccepted = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after?.rematchOffer)
        return;
    if (after.rematchOffer.status !== 'accepted')
        return;
    if (after.rematchOffer.newSessionId)
        return;
    if (before?.rematchOffer?.status === 'accepted' && before.rematchOffer?.newSessionId)
        return;
    if (!after.playerIds || after.playerIds.length !== 2)
        return;
    const oldSid = event.params.sessionId;
    const newSid = `rematch_${oldSid}_${Date.now()}`;
    const db = admin.firestore();
    const oldSessionRef = event.data.after.ref;
    let questions;
    try {
        questions = await pickArenaQuestions(PRIVATE_DUEL_QUESTION_COUNT);
    }
    catch (e) {
        console.error('rematch: pickArenaQuestions failed', e);
        await oldSessionRef.update({ 'rematchOffer.status': 'expired' });
        return;
    }
    // Pre-fetch имена игроков из старой sessionPlayers
    const oldPlayersSnap = await db
        .collection('session_players')
        .where('sessionId', '==', oldSid)
        .get();
    const nameByUid = new Map();
    const avatarByUid = new Map();
    const auraByUid = new Map();
    const avatarLevelByUid = new Map();
    for (const doc of oldPlayersSnap.docs) {
        const d = doc.data();
        if (d.playerId) {
            nameByUid.set(d.playerId, d.displayName ?? 'Игрок');
            if (typeof d.avatar === 'string' && d.avatar.trim())
                avatarByUid.set(d.playerId, d.avatar.trim());
            if (typeof d.aura === 'string' && d.aura.trim())
                auraByUid.set(d.playerId, d.aura.trim());
            if (typeof d.avatarLevel === 'number')
                avatarLevelByUid.set(d.playerId, d.avatarLevel);
        }
    }
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(oldSessionRef);
        const f = fresh.data();
        if (!f?.rematchOffer)
            return;
        if (f.rematchOffer.newSessionId)
            return;
        if (f.rematchOffer.status !== 'accepted')
            return;
        const newRef = db.collection('arena_sessions').doc(newSid);
        const tCreated = Date.now();
        tx.set(newRef, {
            id: newSid,
            type: 'rematch',
            size: 2,
            state: 'countdown',
            rankTier: 'bronze',
            playerIds: after.playerIds,
            questions,
            currentQuestionIndex: 0,
            questionStartedAt: null,
            questionTimeoutMs: 40000,
            createdAt: tCreated,
        });
        for (const uid of after.playerIds) {
            tx.set(db.collection('session_players').doc(`${newSid}_${uid}`), {
                sessionId: newSid,
                playerId: uid,
                displayName: nameByUid.get(uid) ?? 'Игрок',
                avatar: avatarByUid.get(uid) ?? String(avatarLevelByUid.get(uid) ?? 1),
                aura: auraByUid.get(uid) ?? null,
                avatarLevel: avatarLevelByUid.get(uid) ?? 1,
                score: 0,
                answers: [],
                lobbyChoice: 'none',
            });
        }
        tx.update(oldSessionRef, { 'rematchOffer.newSessionId': newSid });
    });
    // Запустить countdown как для обычной приватной комнаты
    try {
        await startSessionCountdown(newSid);
    }
    catch (e) {
        console.error('rematch: startSessionCountdown failed', e);
    }
});
exports.questionTimeout = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    const authHeader = req.headers.authorization ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const appCheckToken = req.headers['x-firebase-appcheck'] ?? '';
    if (!idToken || !appCheckToken) {
        res.status(401).send('Unauthorized');
        return;
    }
    try {
        await admin.auth().verifyIdToken(idToken);
        await admin.appCheck().verifyToken(appCheckToken);
    }
    catch {
        res.status(401).send('Unauthorized');
        return;
    }
    const { sessionId, questionIndex } = req.body;
    if (!sessionId || questionIndex === undefined) {
        res.status(400).send('Bad request');
        return;
    }
    await onQuestionTimeout(sessionId, questionIndex);
    res.send('ok');
});
// ── Community (UGC) packs ─────────────────────────────────────────────────────
var community_packs_1 = require("./community_packs");
Object.defineProperty(exports, "communitySubmitPackForReview", { enumerable: true, get: function () { return community_packs_1.communitySubmitPackForReview; } });
Object.defineProperty(exports, "communityModerateSubmission", { enumerable: true, get: function () { return community_packs_1.communityModerateSubmission; } });
Object.defineProperty(exports, "communityAdminModeratePack", { enumerable: true, get: function () { return community_packs_1.communityAdminModeratePack; } });
Object.defineProperty(exports, "communityFetchPackCardsIfAccessible", { enumerable: true, get: function () { return community_packs_1.communityFetchPackCardsIfAccessible; } });
Object.defineProperty(exports, "communityPurchasePack", { enumerable: true, get: function () { return community_packs_1.communityPurchasePack; } });
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
// ── Почта поддержки (Gmail IMAP забор + ИИ-черновики + SMTP-отправка), admin ───
var support_inbox_1 = require("./support_inbox");
Object.defineProperty(exports, "adminSupportPull", { enumerable: true, get: function () { return support_inbox_1.adminSupportPull; } });
Object.defineProperty(exports, "adminSupportGenerateReply", { enumerable: true, get: function () { return support_inbox_1.adminSupportGenerateReply; } });
Object.defineProperty(exports, "adminSupportSendReply", { enumerable: true, get: function () { return support_inbox_1.adminSupportSendReply; } });
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
// ── Промокоды-награды (юзер активирует код → дни премиума; админ создаёт код) ──
var promo_codes_1 = require("./promo_codes");
Object.defineProperty(exports, "promoCodeRedeem", { enumerable: true, get: function () { return promo_codes_1.promoCodeRedeem; } });
Object.defineProperty(exports, "promoCodeUpsert", { enumerable: true, get: function () { return promo_codes_1.promoCodeUpsert; } });
Object.defineProperty(exports, "promoCodeBatchUpsert", { enumerable: true, get: function () { return promo_codes_1.promoCodeBatchUpsert; } });
var openai_budget_dashboard_1 = require("./openai_budget_dashboard");
Object.defineProperty(exports, "openAiBudgetDashboard", { enumerable: true, get: function () { return openai_budget_dashboard_1.openAiBudgetDashboard; } });
var openai_dialog_model_config_1 = require("./openai_dialog_model_config");
Object.defineProperty(exports, "openAiDialogModelConfig", { enumerable: true, get: function () { return openai_dialog_model_config_1.openAiDialogModelConfig; } });
Object.defineProperty(exports, "openAiDialogQuotaConfig", { enumerable: true, get: function () { return openai_dialog_model_config_1.openAiDialogQuotaConfig; } });
var openai_jobs_config_1 = require("./openai_jobs_config");
Object.defineProperty(exports, "openAiJobsConfig", { enumerable: true, get: function () { return openai_jobs_config_1.openAiJobsConfig; } });
var admin_translate_1 = require("./admin_translate");
Object.defineProperty(exports, "adminTranslateMessage", { enumerable: true, get: function () { return admin_translate_1.adminTranslateMessage; } });
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
var revenuecat_shards_1 = require("./revenuecat_shards");
Object.defineProperty(exports, "revenueCatShardsWebhook", { enumerable: true, get: function () { return revenuecat_shards_1.revenueCatShardsWebhook; } });
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
// ── Email-лиды квиза /start/ (письмо с планом + догоняющие) ───────────────────
var web_leads_1 = require("./web_leads");
Object.defineProperty(exports, "webLeadCapture", { enumerable: true, get: function () { return web_leads_1.webLeadCapture; } });
Object.defineProperty(exports, "webLeadNudgeCron", { enumerable: true, get: function () { return web_leads_1.webLeadNudgeCron; } });
//# sourceMappingURL=index.js.map