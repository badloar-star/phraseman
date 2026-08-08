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
exports.questionTimeoutDisabled = exports.arenaHillDailyRewardCronDisabled = exports.arenaSeasonRolloverCronDisabled = exports.matchmakingCronDisabled = exports.onArenaRematchAcceptedDisabled = exports.onArenaSessionAbortedDisabled = exports.onArenaSessionFinishedDisabled = exports.onAnswerSubmittedDisabled = exports.onSessionCountdownDisabled = exports.onSessionPlayerLobbyDisabled = exports.onSessionGetReadyDisabled = exports.onArenaRoomMatchedDisabled = exports.onMatchmakingWriteDisabled = exports.QUIZ_ARENA_DECOMMISSIONED_EXPORTS = exports.quizArenaDisabledCallable = exports.QUIZ_ARENA_DISABLED_MESSAGE = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const https_1 = require("firebase-functions/v2/https");
exports.QUIZ_ARENA_DISABLED_MESSAGE = 'Quiz and Arena are no longer available.';
exports.quizArenaDisabledCallable = functions.https.onCall({ region: 'us-central1', enforceAppCheck: true }, async () => {
    throw new https_1.HttpsError('failed-precondition', exports.QUIZ_ARENA_DISABLED_MESSAGE);
});
/**
 * Compatibility tombstones keep previously deployed callable names deterministic
 * and fail-closed while clients age out. They never read or mutate legacy data.
 */
exports.QUIZ_ARENA_DECOMMISSIONED_EXPORTS = {
    arenaClubWarContribute: exports.quizArenaDisabledCallable,
    arenaHillRecordAttempt: exports.quizArenaDisabledCallable,
    arenaHillGetDailyTop: exports.quizArenaDisabledCallable,
    arenaBotMatchRecord: exports.quizArenaDisabledCallable,
    arenaSeasonGetTop: exports.quizArenaDisabledCallable,
    arenaSeasonClaimReward: exports.quizArenaDisabledCallable,
    arenaRoomCreate: exports.quizArenaDisabledCallable,
    arenaRoomRecordRun: exports.quizArenaDisabledCallable,
    arenaPulsePublish: exports.quizArenaDisabledCallable,
    arenaRoomJoin: exports.quizArenaDisabledCallable,
    arenaRoomLeave: exports.quizArenaDisabledCallable,
    arenaRoomSetReady: exports.quizArenaDisabledCallable,
    arenaRoomKick: exports.quizArenaDisabledCallable,
    arenaRoomClose: exports.quizArenaDisabledCallable,
    arenaGhostCreateChallenge: exports.quizArenaDisabledCallable,
    arenaGhostRecordPlay: exports.quizArenaDisabledCallable,
    explainQuiz: exports.quizArenaDisabledCallable,
    adminListArenaQuestionPool: exports.quizArenaDisabledCallable,
    adminPublishArenaQuestionBatch: exports.quizArenaDisabledCallable,
    adminRemoveArenaPoolQuestion: exports.quizArenaDisabledCallable,
    adminRestoreArenaPoolQuestion: exports.quizArenaDisabledCallable,
    adminUpdateArenaConvergenceConfig: exports.quizArenaDisabledCallable,
    adminGetArenaConvergenceStatus: exports.quizArenaDisabledCallable,
};
const retiredFirestoreNoop = async () => undefined;
// Event tombstones intentionally remain registered so a staged deployment cannot
// execute an older handler against legacy collections during the transition.
exports.onMatchmakingWriteDisabled = functions.firestore.onDocumentWritten('matchmaking_queue/{userId}', retiredFirestoreNoop);
exports.onArenaRoomMatchedDisabled = functions.firestore.onDocumentUpdated('arena_rooms/{roomId}', retiredFirestoreNoop);
exports.onSessionGetReadyDisabled = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', retiredFirestoreNoop);
exports.onSessionPlayerLobbyDisabled = functions.firestore.onDocumentUpdated('session_players/{docId}', retiredFirestoreNoop);
exports.onSessionCountdownDisabled = functions.firestore.onDocumentWritten('arena_sessions/{sessionId}', retiredFirestoreNoop);
exports.onAnswerSubmittedDisabled = functions.firestore.onDocumentUpdated('session_players/{docId}', retiredFirestoreNoop);
exports.onArenaSessionFinishedDisabled = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', retiredFirestoreNoop);
exports.onArenaSessionAbortedDisabled = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', retiredFirestoreNoop);
exports.onArenaRematchAcceptedDisabled = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', retiredFirestoreNoop);
exports.matchmakingCronDisabled = functions.scheduler.onSchedule({ schedule: 'every 5 minutes', timeZone: 'UTC' }, retiredFirestoreNoop);
exports.arenaSeasonRolloverCronDisabled = functions.scheduler.onSchedule({ schedule: '0 1 * * *', timeZone: 'Etc/UTC', region: 'us-central1' }, retiredFirestoreNoop);
exports.arenaHillDailyRewardCronDisabled = functions.scheduler.onSchedule({ schedule: '1 0 * * *', timeZone: 'UTC', region: 'us-central1' }, retiredFirestoreNoop);
exports.questionTimeoutDisabled = functions.https.onRequest({ region: 'us-central1' }, (_request, response) => {
    response.status(410).json({ error: 'feature_decommissioned' });
});
//# sourceMappingURL=quiz_arena_decommission.js.map