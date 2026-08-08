import * as functions from 'firebase-functions/v2';
import { HttpsError } from 'firebase-functions/v2/https';

export const QUIZ_ARENA_DISABLED_MESSAGE = 'Quiz and Arena are no longer available.';

export const quizArenaDisabledCallable = functions.https.onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async () => {
    throw new HttpsError('failed-precondition', QUIZ_ARENA_DISABLED_MESSAGE);
  },
);

/**
 * Compatibility tombstones keep previously deployed callable names deterministic
 * and fail-closed while clients age out. They never read or mutate legacy data.
 */
export const QUIZ_ARENA_DECOMMISSIONED_EXPORTS = {
  arenaClubWarContribute: quizArenaDisabledCallable,
  arenaHillRecordAttempt: quizArenaDisabledCallable,
  arenaHillGetDailyTop: quizArenaDisabledCallable,
  arenaBotMatchRecord: quizArenaDisabledCallable,
  arenaSeasonGetTop: quizArenaDisabledCallable,
  arenaSeasonClaimReward: quizArenaDisabledCallable,
  arenaRoomCreate: quizArenaDisabledCallable,
  arenaRoomRecordRun: quizArenaDisabledCallable,
  arenaPulsePublish: quizArenaDisabledCallable,
  arenaRoomJoin: quizArenaDisabledCallable,
  arenaRoomLeave: quizArenaDisabledCallable,
  arenaRoomSetReady: quizArenaDisabledCallable,
  arenaRoomKick: quizArenaDisabledCallable,
  arenaRoomClose: quizArenaDisabledCallable,
  arenaGhostCreateChallenge: quizArenaDisabledCallable,
  arenaGhostRecordPlay: quizArenaDisabledCallable,
  explainQuiz: quizArenaDisabledCallable,
  adminListArenaQuestionPool: quizArenaDisabledCallable,
  adminPublishArenaQuestionBatch: quizArenaDisabledCallable,
  adminRemoveArenaPoolQuestion: quizArenaDisabledCallable,
  adminRestoreArenaPoolQuestion: quizArenaDisabledCallable,
  adminUpdateArenaConvergenceConfig: quizArenaDisabledCallable,
  adminGetArenaConvergenceStatus: quizArenaDisabledCallable,
} as const;

const retiredFirestoreNoop = async (): Promise<void> => undefined;

// Event tombstones intentionally remain registered so a staged deployment cannot
// execute an older handler against legacy collections during the transition.
export const onMatchmakingWriteDisabled = functions.firestore.onDocumentWritten(
  'matchmaking_queue/{userId}',
  retiredFirestoreNoop,
);
export const onArenaRoomMatchedDisabled = functions.firestore.onDocumentUpdated(
  'arena_rooms/{roomId}',
  retiredFirestoreNoop,
);
export const onSessionGetReadyDisabled = functions.firestore.onDocumentUpdated(
  'arena_sessions/{sessionId}',
  retiredFirestoreNoop,
);
export const onSessionPlayerLobbyDisabled = functions.firestore.onDocumentUpdated(
  'session_players/{docId}',
  retiredFirestoreNoop,
);
export const onSessionCountdownDisabled = functions.firestore.onDocumentWritten(
  'arena_sessions/{sessionId}',
  retiredFirestoreNoop,
);
export const onAnswerSubmittedDisabled = functions.firestore.onDocumentUpdated(
  'session_players/{docId}',
  retiredFirestoreNoop,
);
export const onArenaSessionFinishedDisabled = functions.firestore.onDocumentUpdated(
  'arena_sessions/{sessionId}',
  retiredFirestoreNoop,
);
export const onArenaSessionAbortedDisabled = functions.firestore.onDocumentUpdated(
  'arena_sessions/{sessionId}',
  retiredFirestoreNoop,
);
export const onArenaRematchAcceptedDisabled = functions.firestore.onDocumentUpdated(
  'arena_sessions/{sessionId}',
  retiredFirestoreNoop,
);

export const matchmakingCronDisabled = functions.scheduler.onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'UTC' },
  retiredFirestoreNoop,
);
export const arenaSeasonRolloverCronDisabled = functions.scheduler.onSchedule(
  { schedule: '0 1 * * *', timeZone: 'Etc/UTC', region: 'us-central1' },
  retiredFirestoreNoop,
);
export const arenaHillDailyRewardCronDisabled = functions.scheduler.onSchedule(
  { schedule: '1 0 * * *', timeZone: 'UTC', region: 'us-central1' },
  retiredFirestoreNoop,
);

export const questionTimeoutDisabled = functions.https.onRequest(
  { region: 'us-central1' },
  (_request, response) => {
    response.status(410).json({ error: 'feature_decommissioned' });
  },
);
