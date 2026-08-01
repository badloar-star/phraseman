// Tournament Phase-1 backend. All economy and room mutations are server-authoritative,
// transactional and idempotent. Product contract: docs/tournaments/2026-07-21-tournaments-mode-spec.md.

import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { TOURNAMENT_MODES } from './tournament_pool_plan';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import {
  TOURNAMENT_REDDIT_BOT_PERSONA_SEED,
  TOURNAMENT_REDDIT_BOT_PROFILE_IDS,
  isAcceptedTournamentBotSeedVersion,
  isSafeTournamentBotName,
} from './tournament_reddit_bot_names';
import {
  BOT_PROFILES_COLLECTION,
  TOURNAMENT_BANK_COLLECTION,
  TOURNAMENT_CREATE_AHEAD_MS,
  TOURNAMENT_CURATED_COLLECTION,
  TOURNAMENT_FILL_BOTS_AHEAD_MS,
  TOURNAMENT_FILL_CANCELLATION_CUTOFF_MS,
  TOURNAMENT_LOBBY_OPEN_MS,
  TOURNAMENT_MAX_SHARDS_PER_SLOT,
  TOURNAMENT_MIN_REAL_PLAYERS,
  TOURNAMENT_POOL_BARRIER_DOC,
  TOURNAMENT_POOL_BARRIER_KIND,
  TOURNAMENT_PRIVATE_STATE_COLLECTION,
  TOURNAMENT_RECEIPTS_SUBCOLLECTION,
  TOURNAMENT_ROOMS_COLLECTION,
  TOURNAMENT_BOT_FILL_WINDOW_MS,
  TOURNAMENT_ROOM_GATHER_MS,
  TOURNAMENT_ROOM_SIZE,
  TOURNAMENT_DEV_START_DELAY_MS,
  TOURNAMENT_EARLY_ADVANCE_DELAY_MS,
  TOURNAMENT_ROOM_TTL_MS,
  TOURNAMENT_ROUND_MODE_PLAN,
  TOURNAMENT_SCHEDULE_COLLECTION,
  TOURNAMENT_SCHEDULE_CONFIG_DOC,
  TOURNAMENT_SEASONS_COLLECTION,
  TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION,
  TOURNAMENT_STATE_CANCELLED,
  TOURNAMENT_TASK_LIMITS,
  TOURNAMENT_TASKS_COLLECTION,
  TOURNAMENT_TASK_SECRETS_SUBCOLLECTION,
  applyTournamentJoin,
  applySpeedMatchAttempt,
  applyTournamentSubmission,
  assertTournamentAnswersWithinTaskSchedule,
  bankContributionGems,
  cancellationCreditGems,
  completeTournamentRoundAtDeadline,
  dateKeyInTimezone,
  generateBotProfile,
  normalizeTournamentSchedule,
  normalizeTournamentCuratedSet,
  legacyTournamentRecoveryAction,
  loadCompleteTournamentTasks,
  planBotJoinTimes,
  planTournamentHumanLobbyJoin,
  planTournamentCancellation,
  planTournamentFinalization,
  resolveSeasonEntryName,
  resolveTournamentPlayerProfile,
  roundStateFor,
  scoreAnswer,
  selectRoundTasks,
  selectTournamentBotProfiles,
  slotStartMs,
  stateAfterTournamentDeadline,
  stateDeadlineDurationMs,
  toPublicTournamentTask,
  tournamentFeatureGates,
  tournamentEconomySnapshotForMode,
  tournamentHash32,
  isTournamentTestRoom,
  tournamentRoomAdmissionMode,
  tournamentRoundDurationMs,
  tournamentRoundTimingWindow,
  tournamentRoomId,
  tournamentWeekId,
  validateTournamentFillMutation,
  validateTournamentTask,
  validateTournamentTaskForNewRoom,
  verifyTournamentAnswer,
  type BotProfile,
  type TournamentPlayer,
  type TournamentRoomDoc,
  type TournamentRound,
  type TournamentScheduleConfig,
  type TournamentState,
  type TournamentTask,
  type TournamentDeadlineSubmission,
  type SpeedMatchAttemptProgress,
} from './tournament_core';
import {
  normalizeTournamentEconomy,
  tournamentPayouts,
  tournamentPot,
} from './tournament_economy';

const REGION = 'us-central1';
const ROOM_SCAN_LIMIT = 50;
const MAX_PROCESSOR_PAGES = 10;
const LIFECYCLE_CURSOR_DOC = '_lifecycle_due_cursor_v1';
const FILL_CURSOR_DOC = '_fill_due_cursor_v1';
const BOT_SIMULATION_METADATA_DOC = '__bot_simulation_v1';
const RECENT_BOT_ROSTER_DOC = 'recent_bot_roster_v1';
const SPEED_MATCH_ATTEMPT_PREFIX = '__speed_match_attempt_v1';
const TASK_ANSWER_RECEIPT_PREFIX = '__task_answer_receipt_v1';
const LIFECYCLE_RECOVERY_BACKOFF_MS = 60 * 1000;
const LEGACY_RECOVERY_CURSOR_DOC = '_legacy_recovery_cursor_v1';
const DEFAULT_TASKS_PER_ROUND = 4; // зеркало TASKS_PER_ROUND (tournament_pool_plan.ts)
export const TOURNAMENT_REVIEW_RETENTION_MS = 24 * 60 * 60 * 1000;
export const TOURNAMENT_PRIVATE_EVIDENCE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Test tournaments are compiled into an explicitly approved Functions release.
 * The deployed revision's environment is immutable until the next deployment;
 * Firestore/admin runtime configuration cannot enable this surface.
 */
export function tournamentTestModeReleaseEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.PHRASEMAN_TOURNAMENT_TEST_MODE_RELEASE === '1';
}

export function tournamentStartNowInternalErrorLog(
  error: unknown,
): { message: string; stack: string } {
  const message = error instanceof Error ? error.message : 'unknown_error';
  const stack = error instanceof Error ? String(error.stack ?? '') : '';
  return {
    message: message.slice(0, 500),
    stack: stack.slice(0, 8_000),
  };
}

/**
 * Сколько заданий читать НА КАЖДЫЙ режим при сборке комнаты.
 * зачем 40: раунду нужно 6, но выборка идёт по сиду — запас даёт разные
 * наборы разным комнатам. Больше читать незачем: это деньги за чтения.
 */
const TASKS_PER_MODE_SLICE = 40;
// The reviewed production corpus contains 200 distinct profiles. Loading only
// ROOM_SIZE * 2 made the remaining 168 documents unreachable forever. This
// pool is cached for 60 seconds per warm instance, so room joins do not reread
// all profiles on every client tick.

export function speedMatchAttemptDocId(roundNo: number, taskId: string, stableUid: string): string {
  return `${SPEED_MATCH_ATTEMPT_PREFIX}:${roundNo}:${taskId}:${stableUid}`;
}

export function tournamentTaskAnswerReceiptDocId(
  roundNo: number,
  taskId: string,
  stableUid: string,
): string {
  return `${TASK_ANSWER_RECEIPT_PREFIX}:${roundNo}:${taskId}:${stableUid}`;
}

type TournamentTaskAnswerReceipt = {
  roundNo: number;
  taskId: string;
  playerId: string;
  receivedAtMs: number;
  idempotencyKeyHash: string;
  answer: unknown;
  correct: boolean;
};

type TournamentTaskAnswerReceiptRef = {
  playerId: string;
  taskId: string;
  ref: FirebaseFirestore.DocumentReference;
};

function readTournamentTaskAnswerReceipt(
  data: FirebaseFirestore.DocumentData | undefined,
  expected: { roundNo: number; taskId: string; playerId: string },
): TournamentTaskAnswerReceipt | undefined {
  if (!data) return undefined;
  const receivedAtMs = Number(data.receivedAtMs);
  if (data.kind !== 'tournament_task_answer_v1'
    || data.roundNo !== expected.roundNo || data.taskId !== expected.taskId
    || data.playerId !== expected.playerId || !Number.isFinite(receivedAtMs)
    || receivedAtMs < 0 || typeof data.correct !== 'boolean'
    || typeof data.idempotencyKeyHash !== 'string'
    || !/^[a-f0-9]{64}$/.test(data.idempotencyKeyHash)
    || !Object.prototype.hasOwnProperty.call(data, 'answer')) {
    throw new HttpsError('failed-precondition', 'task_answer_receipt_invalid');
  }
  return {
    roundNo: expected.roundNo,
    taskId: expected.taskId,
    playerId: expected.playerId,
    receivedAtMs,
    idempotencyKeyHash: data.idempotencyKeyHash,
    answer: data.answer,
    correct: data.correct,
  };
}

function tournamentReceiptRefsForRound(
  roomRef: FirebaseFirestore.DocumentReference,
  round: TournamentRound,
  playerIds: readonly string[],
): TournamentTaskAnswerReceiptRef[] {
  return playerIds.flatMap((playerId) => round.taskIds.map((taskId) => ({
    playerId,
    taskId,
    ref: roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
      .doc(tournamentTaskAnswerReceiptDocId(round.roundNo, taskId, playerId)),
  })));
}

function tournamentReceiptIsTimely(
  round: TournamentRound,
  receipt: TournamentTaskAnswerReceipt,
  fallbackDeadlineAtMs?: number,
): boolean {
  try {
    const scheduleEnforced = assertTournamentAnswersWithinTaskSchedule(
      round, [receipt.taskId], receipt.receivedAtMs,
    );
    return scheduleEnforced || fallbackDeadlineAtMs === undefined
      || receipt.receivedAtMs <= fallbackDeadlineAtMs;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'task_not_started' || message === 'task_deadline_elapsed') return false;
    throw error;
  }
}

function canonicalTournamentReceiptRanks(
  round: TournamentRound,
  tasks: readonly TournamentTask[],
  playerIds: readonly string[],
  receipts: readonly TournamentTaskAnswerReceipt[],
  fallbackDeadlineAtMs?: number,
): Record<string, Record<string, number>> {
  const taskMap = new Map(tasks.map((task) => [task.taskId, task]));
  const receiptByPlayerTask = new Map<string, TournamentTaskAnswerReceipt>();
  const candidatesByTask = new Map<string, Array<{ playerId: string; receivedAtMs: number }>>();
  for (const receipt of receipts) {
    if (!playerIds.includes(receipt.playerId)
      || !tournamentReceiptIsTimely(round, receipt, fallbackDeadlineAtMs)) continue;
    const task = taskMap.get(receipt.taskId);
    if (!task) throw new HttpsError('failed-precondition', 'round_tasks_unavailable');
    const verified = verifyTournamentAnswer(task, receipt.answer);
    if (verified !== receipt.correct) {
      throw new HttpsError('failed-precondition', 'task_answer_receipt_invalid');
    }
    receiptByPlayerTask.set(`${receipt.playerId}\u0000${receipt.taskId}`, receipt);
    if (!verified) continue;
    const candidates = candidatesByTask.get(receipt.taskId) ?? [];
    candidates.push({ playerId: receipt.playerId, receivedAtMs: receipt.receivedAtMs });
    candidatesByTask.set(receipt.taskId, candidates);
  }
  // Compatibility: results created by the legacy batch path before per-task
  // receipts existed still consume one place, but never override a real receipt.
  for (const playerId of playerIds) {
    const result = round.results?.[playerId];
    if (!result) continue;
    for (const review of result.review ?? []) {
      if (!review.correct || receiptByPlayerTask.has(`${playerId}\u0000${review.taskId}`)) continue;
      const candidates = candidatesByTask.get(review.taskId) ?? [];
      candidates.push({ playerId, receivedAtMs: result.submittedAtMs });
      candidatesByTask.set(review.taskId, candidates);
    }
  }
  const ranks: Record<string, Record<string, number>> = {};
  for (const [taskId, candidates] of candidatesByTask) {
    candidates.sort((left, right) => left.receivedAtMs - right.receivedAtMs
      || left.playerId.localeCompare(right.playerId));
    candidates.forEach((candidate, index) => {
      (ranks[candidate.playerId] ??= {})[taskId] = index + 1;
    });
  }
  return ranks;
}

function readSpeedMatchProgress(data: FirebaseFirestore.DocumentData | undefined): SpeedMatchAttemptProgress | undefined {
  if (!data || data.kind !== 'speed_match_attempt_v1') return undefined;
  return {
    matchedIndexes: Array.isArray(data.matchedIndexes) ? data.matchedIndexes.map((value: unknown) => readInt(value, -1)) : [],
    triedIndexes: Array.isArray(data.triedIndexes)
      ? data.triedIndexes.map((row: unknown) => Array.isArray(row) ? row.map((value) => readInt(value, -1)) : [])
      : [],
    wrongAttempts: Math.max(0, readInt(data.wrongAttempts, 0)),
  };
}
const PLAYER_COLORS = ['#47C870', '#FFC800', '#FF5B6C', '#16B7D9', '#B78CFF', '#FF9F43'] as const;
/**
 * Когда сбор комнаты заканчивается и турнир обязан стартовать.
 *
 * зачем 2026-07-27 (владелец): «юзер заходит и ждёт 30 секунд… после 30 секунд
 * добирается ботами на протяжении следующих 45 секунд… когда в комнате 16
 * начинается отсчёт. Суммарное время ожидания не более полутора минут».
 * Отсчёт идёт от ВХОДА ПЕРВОГО ЖИВОГО (gatherStartedAtMs), поэтому ожидание
 * одинаково для всех, кто бы когда ни зашёл. Время слота (startsAt) на старт
 * больше не влияет — оно осталось только окном, внутри которого можно зайти.
 */
function lobbyDeadlineAtMs(
  data: FirebaseFirestore.DocumentData | undefined,
  room: { startsAt: number },
  nowMs: number,
): number {
  const gatherStartedAtMs = readInt(data?.gatherStartedAtMs, 0)
    // Комната без отметки входа (никто ещё не зашёл или старый документ):
    // считаем от «сейчас», иначе дедлайн окажется в прошлом и лобби залипнет.
    || Math.max(nowMs, room.startsAt);
  return gatherStartedAtMs + TOURNAMENT_ROOM_GATHER_MS + TOURNAMENT_BOT_FILL_WINDOW_MS;
}

function tournamentPlayersHaveArrived(
  players: readonly TournamentPlayer[],
  nowMs: number,
): boolean {
  return players.every((player) => player.joinAtMs === undefined
    || (Number.isFinite(player.joinAtMs) && player.joinAtMs <= nowMs));
}

const ACTIVE_DEADLINE_STATES: TournamentState[] = [
  'scheduled', 'lobby', 'round1', 'table1', 'round2', 'table2',
  'round3', 'table3', 'round4', 'final', 'results', 'rewards',
];

type Row = Record<string, unknown>;
type AdvanceOutcome = 'advanced' | 'finalize' | 'cancel_players' | 'cancel_resources' | 'cancel_legacy' | 'waiting' | 'stale' | 'skip';

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function tournamentProfileHint(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function readInt(value: unknown, fallback = 0): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function timestampMs(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return readInt(value, 0);
}

function readRoom(snap: FirebaseFirestore.DocumentSnapshot): TournamentRoomDoc {
  const data = snap.data() || {};
  return {
    roomId: snap.id,
    slotId: sanitizeString(data.slotId, 60),
    seed: sanitizeString(data.seed, 200),
    state: sanitizeString(data.state, 20) as TournamentRoomDoc['state'],
    startsAt: readInt(data.startsAt, 0),
    economySnapshot: data.economySnapshot
      ? normalizeTournamentEconomy(data.economySnapshot)
      : undefined,
    potGems: Math.max(0, readGemBalance(data.potGems)),
    lobbyEvents: Array.isArray(data.lobbyEvents)
      ? data.lobbyEvents.slice(0, TOURNAMENT_ROOM_SIZE) as NonNullable<TournamentRoomDoc['lobbyEvents']>
      : [],
    testMode: data.testMode === true ? true : data.testMode === false ? false : undefined,
    ticketsRequired: Math.max(0, readInt(data.ticketsRequired, 0)) || undefined,
    players: Array.isArray(data.players) ? data.players.map((raw: unknown) => {
      const player = raw && typeof raw === 'object' ? raw as TournamentPlayer : {} as TournamentPlayer;
      const { resultPlace: _rawPlace, rewardGems: _rawReward, ...base } = player;
      const resultPlace = readInt(_rawPlace, 0);
      const rewardGems = readInt(_rawReward, -1);
      return {
        ...base,
        ...(resultPlace > 0 ? { resultPlace } : {}),
        ...(rewardGems >= 0 ? { rewardGems } : {}),
      };
    }) : [],
    rounds: Array.isArray(data.rounds) ? data.rounds as TournamentRound[] : [],
    version: readInt(data.version, 0),
    createdAtMs: readInt(data.createdAtMs, 0),
    stateStartedAtMs: readInt(data.stateStartedAtMs, 0) || undefined,
    introEndsAtMs: readInt(data.introEndsAtMs, 0) || undefined,
    stateDeadlineAtMs: readInt(data.stateDeadlineAtMs, 0) || undefined,
    lifecycleRetryAtMs: readInt(data.lifecycleRetryAtMs, 0) || undefined,
    ready: data.ready === true,
    participantAuthUids: Array.isArray(data.participantAuthUids)
      ? data.participantAuthUids.map((uid: unknown) => sanitizeString(uid, 160)).filter(Boolean)
      : [],
    participantAuthUidsComplete: data.participantAuthUidsComplete === true,
    cancelledAtMs: readInt(data.cancelledAtMs, 0) || undefined,
    cancelReason: data.cancelReason ? sanitizeString(data.cancelReason, 80) : undefined,
    cancellationReceiptId: data.cancellationReceiptId ? sanitizeString(data.cancellationReceiptId, 200) : undefined,
    finalizationReceiptId: data.finalizationReceiptId ? sanitizeString(data.finalizationReceiptId, 200) : undefined,
    finalizedAtMs: readInt(data.finalizedAtMs, 0) || undefined,
    reviewRetentionUntilMs: readInt(data.reviewRetentionUntilMs, 0) || undefined,
    privateEvidenceRetentionUntilMs: readInt(data.privateEvidenceRetentionUntilMs, 0) || undefined,
    closedAtMs: readInt(data.closedAtMs, 0) || undefined,
    expireAtMs: timestampMs(data.expireAt) || undefined,
  };
}

export function parseTournamentTaskDocument(taskId: string, data: Row): TournamentTask | null {
  const parsedExplanation = data.explanation && typeof data.explanation === 'object'
    && !Array.isArray(data.explanation)
    ? {
      ruleNote: sanitizeString((data.explanation as Row).ruleNote, 600),
      example: sanitizeString((data.explanation as Row).example, 600),
      ...(Array.isArray((data.explanation as Row).wrongOptionReasons)
        ? {
          wrongOptionReasons: ((data.explanation as Row).wrongOptionReasons as unknown[])
            .map((reason) => sanitizeString(reason, 600)),
        }
        : {}),
    }
    : null;
  const task: TournamentTask = {
    taskId,
    mode: sanitizeString(data.mode, 40),
    isVoice: data.isVoice === true,
    difficulty: readInt(data.difficulty, 0),
    payload: data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload) ? data.payload as Row : {},
    // Firestore rejects explicit undefined values. Legacy task documents may
    // validly have no explanation, so omit the optional field altogether.
    ...(parsedExplanation ? { explanation: parsedExplanation } : {}),
    tags: Array.isArray(data.tags) ? data.tags.map((tag: unknown) => sanitizeString(tag, 40)).filter(Boolean) : [],
    verified: data.verified === true,
  };
  return validateTournamentTask(task).ok ? task : null;
}

function parseTask(snap: FirebaseFirestore.DocumentSnapshot): TournamentTask | null {
  if (!snap.exists) return null;
  return parseTournamentTaskDocument(snap.id, (snap.data() || {}) as Row);
}

async function loadTasksByIds(
  db: FirebaseFirestore.Firestore,
  taskIds: string[],
  roomId?: string,
): Promise<TournamentTask[]> {
  const unique = Array.from(new Set(taskIds.filter(Boolean)));
  const tasks = await loadCompleteTournamentTasks(unique, async (id) => {
    const snap = await (roomId
      ? db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId)
        .collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(id).get()
      : db.collection(TOURNAMENT_TASKS_COLLECTION).doc(id).get());
    return parseTask(snap);
  });
  if (!tasks) throw new HttpsError('failed-precondition', 'round_tasks_unavailable');
  return tasks;
}

async function loadScheduleConfig(db: FirebaseFirestore.Firestore): Promise<TournamentScheduleConfig> {
  const snap = await db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc(TOURNAMENT_SCHEDULE_CONFIG_DOC).get();
  if (!snap.exists) return { slots: [], freeWeeklyEntry: false, ticketGemValue: 0 };
  return normalizeTournamentSchedule(snap.data());
}

export async function resolveStableUid(db: FirebaseFirestore.Firestore, authUid: string): Promise<string> {
  return resolveStableUidForAuth(db, authUid, undefined, { repairLinks: false });
}

export async function assertNotBanned(db: FirebaseFirestore.Firestore, stableUid: string): Promise<void> {
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get(),
    db.collection('banned_users').doc(stableUid).get(),
  ]);
  if (bannedSnap.exists || userSnap.data()?.banned === true) {
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

export function assertTransactionalTournamentAccess(
  authUid: string,
  stableUid: string,
  authLinkSnap: FirebaseFirestore.DocumentSnapshot,
  userSnap: FirebaseFirestore.DocumentSnapshot,
  bannedSnap: FirebaseFirestore.DocumentSnapshot,
): void {
  const linkedStableUid = sanitizeString(authLinkSnap.data()?.stable_id, 160);
  const userAuthUid = sanitizeString(userSnap.data()?.firebaseAuthUid, 160);
  // Automatic anonymous accounts own their stable profile through
  // users/{stableUid}.firebaseAuthUid before an auth_links repair necessarily
  // exists. Accept that server-readable ownership proof; never accept a
  // client-supplied stable id by itself. An existing conflicting auth link
  // still wins fail-closed so account switches cannot spend or claim as the
  // previous profile.
  const ownsStableProfile = stableUid === authUid || userAuthUid === authUid;
  if ((linkedStableUid && linkedStableUid !== stableUid) || (!linkedStableUid && !ownsStableProfile)) {
    throw new HttpsError('permission-denied', 'stable_identity_changed');
  }
  if (bannedSnap.exists || userSnap.data()?.banned === true) {
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

export function validBotProfile(id: string, data: FirebaseFirestore.DocumentData): BotProfile | null {
  if (data.isBot !== true || !isAcceptedTournamentBotSeedVersion(data.seedVersion)) return null;
  const name = sanitizeString(data.name, 48);
  const storedAvatar = sanitizeString(data.avatarEmoji, 64);
  const color = sanitizeString(data.color, 16);
  const winRate = Number(data.winRate);
  const profileIndex = TOURNAMENT_REDDIT_BOT_PROFILE_IDS.indexOf(id);
  if (!id || profileIndex < 0 || !name || !isSafeTournamentBotName(name) || !storedAvatar || !color
    || !Number.isFinite(winRate) || winRate < 0.15 || winRate > 0.85) return null;
  // The reviewed profile document remains authoritative for identity and skill,
  // while visuals are normalized from the versioned deterministic generator.
  // This upgrades accepted legacy emoji rows without a blocking Firestore seed.
  const visual = generateBotProfile(profileIndex, TOURNAMENT_REDDIT_BOT_PERSONA_SEED);
  return {
    botId: id,
    name,
    avatarEmoji: visual.avatarEmoji,
    ...(visual.avatarAura ? { avatarAura: visual.avatarAura } : {}),
    color,
    winRate,
    rank: sanitizeString(data.rank, 24) || 'silver',
    titles: Array.isArray(data.titles) ? data.titles.map((title: unknown) => sanitizeString(title, 48)).filter(Boolean) : [],
  };
}

/** Баланс жемчужин игрока — тот же формат, что в shards_apply_delta.ts. */
function readGemBalance(value: unknown): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

type TournamentResourcePool = {
  bots: BotProfile[];
  tasks: TournamentTask[];
  taskPoolGeneration: string;
  taskPoolRevision: number;
};

type TournamentPoolBarrierToken = {
  generation: string;
  revision: number;
};

export function sameTournamentPoolBarrierToken(
  left: TournamentPoolBarrierToken,
  right: TournamentPoolBarrierToken,
): boolean {
  return left.generation === right.generation && left.revision === right.revision;
}

const TOURNAMENT_RESOURCE_POOL_CACHE_TTL_MS = 60_000;

export function createTournamentResourcePoolCacheLoader(options: {
  readReadyToken: () => Promise<TournamentPoolBarrierToken>;
  loadForToken: (token: TournamentPoolBarrierToken) => Promise<TournamentResourcePool>;
  nowMs?: () => number;
  ttlMs?: number;
}): () => Promise<TournamentResourcePool> {
  const nowMs = options.nowMs ?? Date.now;
  const ttlMs = options.ttlMs ?? TOURNAMENT_RESOURCE_POOL_CACHE_TTL_MS;
  let cached: {
    token: TournamentPoolBarrierToken;
    loadedAtMs: number;
    pool: TournamentResourcePool;
  } | undefined;
  let inFlight: {
    token: TournamentPoolBarrierToken;
    promise: Promise<TournamentResourcePool>;
  } | undefined;
  return async () => {
    // The barrier is deliberately read before every hit. A warm cache must never
    // let room creation continue while a migration has closed the pool.
    const token = await options.readReadyToken();
    const checkedAtMs = nowMs();
    if (cached && sameTournamentPoolBarrierToken(cached.token, token)
      && checkedAtMs - cached.loadedAtMs < ttlMs) {
      return cached.pool;
    }
    if (inFlight && sameTournamentPoolBarrierToken(inFlight.token, token)) return inFlight.promise;

    const promise = options.loadForToken(token).then(async (pool) => {
      if (pool.taskPoolGeneration !== token.generation || pool.taskPoolRevision !== token.revision) {
        throw new HttpsError('aborted', 'tournament_pool_generation_changed');
      }
      const afterLoadToken = await options.readReadyToken();
      if (!sameTournamentPoolBarrierToken(afterLoadToken, token)) {
        throw new HttpsError('aborted', 'tournament_pool_generation_changed');
      }
      cached = { token, loadedAtMs: nowMs(), pool };
      return pool;
    }).finally(() => {
      if (inFlight?.promise === promise) inFlight = undefined;
    });
    inFlight = { token, promise };
    return promise;
  };
}

export async function loadTournamentStartNowPrerequisites<TConfig, TResources, TEconomy>(options: {
  loadConfig: () => Promise<TConfig>;
  resolveStableUid: () => Promise<string>;
  assertNotBanned: (stableUid: string) => Promise<void>;
  loadResources: () => Promise<TResources>;
  loadEconomy: () => Promise<TEconomy>;
}): Promise<{
  config: TConfig;
  stableUid: string;
  resources: TResources;
  economy: TEconomy;
}> {
  const configPromise = options.loadConfig();
  const authorizedStableUid = options.resolveStableUid().then(async (stableUid) => {
    await options.assertNotBanned(stableUid);
    return stableUid;
  });
  const resourcesPromise = options.loadResources();
  const economyPromise = options.loadEconomy();
  // Attach rejection handlers immediately, but make access failures authoritative
  // just as they were on the old sequential path.
  const reads = Promise.allSettled([configPromise, resourcesPromise, economyPromise] as const);
  const stableUid = await authorizedStableUid;
  const [config, resources, economy] = await reads;
  if (config.status === 'rejected') throw config.reason;
  if (resources.status === 'rejected') throw resources.reason;
  if (economy.status === 'rejected') throw economy.reason;
  return {
    config: config.value,
    stableUid,
    resources: resources.value,
    economy: economy.value,
  };
}

function tournamentPoolBarrierRef(db: FirebaseFirestore.Firestore): FirebaseFirestore.DocumentReference {
  return db.collection(TOURNAMENT_PRIVATE_STATE_COLLECTION).doc(TOURNAMENT_POOL_BARRIER_DOC);
}

function readyTournamentPoolToken(
  data: FirebaseFirestore.DocumentData | undefined,
): TournamentPoolBarrierToken {
  if (!data || data.kind !== TOURNAMENT_POOL_BARRIER_KIND) {
    throw new HttpsError('failed-precondition', 'tournament_pool_barrier_unavailable');
  }
  if (data.state === 'migrating') {
    throw new HttpsError('failed-precondition', 'tournament_pool_migrating');
  }
  const generation = typeof data.generation === 'string' ? data.generation.trim() : '';
  const revision = Number(data.revision);
  if (data.state !== 'ready' || generation.length === 0 || generation.length > 160
    || !Number.isSafeInteger(revision) || revision < 0) {
    throw new HttpsError('failed-precondition', 'tournament_pool_barrier_invalid');
  }
  return { generation, revision };
}

export async function assertTournamentPoolCommitAllowed(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  expectedToken: TournamentPoolBarrierToken | string,
): Promise<string> {
  const snapshot = await tx.get(tournamentPoolBarrierRef(db));
  const actualToken = readyTournamentPoolToken(snapshot.data());
  if (!expectedToken || typeof expectedToken === 'string'
    || expectedToken.generation.length === 0 || !Number.isSafeInteger(expectedToken.revision)) {
    throw new HttpsError('failed-precondition', 'tournament_pool_token_required');
  }
  if (!sameTournamentPoolBarrierToken(actualToken, expectedToken)) {
    throw new HttpsError('aborted', 'tournament_pool_generation_changed');
  }
  return actualToken.generation;
}

export function createTournamentTaskSecretsInTransaction(
  tx: FirebaseFirestore.Transaction,
  roomRef: FirebaseFirestore.DocumentReference,
  tasks: readonly TournamentTask[],
): void {
  for (const task of tasks) {
    tx.create(roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(task.taskId), task);
  }
}

async function loadResourcePoolFromFirestore(
  db: FirebaseFirestore.Firestore,
  token: TournamentPoolBarrierToken,
): Promise<TournamentResourcePool> {
  // зачем: турниры играют ТОЛЬКО на вопросах, созданных ИИ специально для
  // соревнования (решение владельца 2026-07-26). Задания, нарезанные из фраз
  // обучающих планов, остаются в базе нетронутыми — они просто не участвуют:
  // фраза урока не работает как соревновательный вопрос (дистракторы не
  // конкурируют, ответ угадывается без знания языка).
  // зачем 2026-07-27: РАНЬШЕ здесь был один запрос с limit(200) — и это тихо
  // ломало разнообразие. В пуле 603 задания, из них 342 guess_phrase; первые
  // 200 документов оказывались почти целиком одним режимом, а аудио, диктант
  // и пары НЕ ДОХОДИЛИ до жребия вообще. Турниры выглядели однообразными при
  // полном пуле. Теперь берём срез ПО КАЖДОМУ режиму: лимит держит стоимость,
  // но ни один режим не может вытеснить остальные.
  const [botSnaps, modeSnaps] = await Promise.all([
    db.getAll(
      ...TOURNAMENT_REDDIT_BOT_PROFILE_IDS.map((botId) => (
        db.collection(BOT_PROFILES_COLLECTION).doc(botId)
      )),
    ),
    Promise.all(TOURNAMENT_MODES.map((mode) => db.collection(TOURNAMENT_TASKS_COLLECTION)
      .where('verified', '==', true)
      .where('source', '==', 'ai')
      .where('mode', '==', mode)
      // guard-ok: 40 на режим × 8 режимов = 320 документов вместо выкачивания
      // всей коллекции; на раунд нужно 6, запаса хватает с избытком.
      .limit(TASKS_PER_MODE_SLICE)
      .get())),
  ]);
  const bots = botSnaps
    .filter((doc) => doc.exists)
    .map((doc) => validBotProfile(doc.id, doc.data() || {}))
    .filter((bot): bot is BotProfile => !!bot);
  const tasks = modeSnaps
    .flatMap((snap) => snap.docs.map(parseTask))
    .filter((task): task is TournamentTask => !!task && validateTournamentTaskForNewRoom(task).ok);
  return {
    bots,
    tasks,
    taskPoolGeneration: token.generation,
    taskPoolRevision: token.revision,
  };
}

let resourcePoolCache: {
  db: FirebaseFirestore.Firestore;
  load: () => Promise<TournamentResourcePool>;
} | undefined;

async function loadResourcePool(db: FirebaseFirestore.Firestore): Promise<TournamentResourcePool> {
  // One module entry only. The Firestore identity guard prevents a test/emulator
  // client from ever receiving resources cached for another project instance.
  if (resourcePoolCache?.db !== db) {
    resourcePoolCache = {
      db,
      load: createTournamentResourcePoolCacheLoader({
        readReadyToken: async () => {
          const barrierSnapshot = await tournamentPoolBarrierRef(db).get();
          return readyTournamentPoolToken(barrierSnapshot.data());
        },
        loadForToken: (token) => loadResourcePoolFromFirestore(db, token),
      }),
    };
  }
  return resourcePoolCache.load();
}

/** Кураторский набор комнаты: раунды с ручным списком заданий + дочитанные задания. */
type CuratedRoomSelection = {
  rounds: Map<number, string[]>;
  extraTasks: TournamentTask[];
};

/**
 * зачем: владелец вручную отбирает задания для конкретного турнира в админке.
 * Набор — мягкий приоритет: невалидный/неполный раунд молча откатывается на
 * случайную выборку, чтобы кураторская ошибка не отменяла турнир людям.
 * Стоимость: 1 чтение дока на комнату в окне создания/заполнения + точечный
 * getAll только для заданий, которых нет в общем срезе пула.
 */
async function loadCuratedForRoom(
  db: FirebaseFirestore.Firestore,
  roomId: string,
  pool: TournamentTask[],
): Promise<CuratedRoomSelection | null> {
  const snap = await db.collection(TOURNAMENT_CURATED_COLLECTION).doc(roomId).get();
  if (!snap.exists) return null;
  const curated = normalizeTournamentCuratedSet(snap.data());
  if (!curated || curated.rounds.length === 0) return null;

  const poolIds = new Set(pool.map((task) => task.taskId));
  const missing = Array.from(new Set(
    curated.rounds.flatMap((round) => round.taskIds).filter((taskId) => !poolIds.has(taskId)),
  ));
  const extraTasks: TournamentTask[] = [];
  if (missing.length > 0) {
    const snaps = await db.getAll(
      ...missing.map((taskId) => db.collection(TOURNAMENT_TASKS_COLLECTION).doc(taskId)),
    );
    for (const taskSnap of snaps) {
      // parseTask пропускает только verified-задания с валидным контрактом.
      const task = parseTask(taskSnap);
      // зачем: кураторский набор дочитывает задания по id напрямую, минуя
      // фильтр источника в loadResourcePool — без этой проверки через него
      // в турнир просочились бы задания из планов, которые мы убрали.
      if (task && taskSnap.get('source') === 'ai' && validateTournamentTaskForNewRoom(task).ok) extraTasks.push(task);
    }
  }

  const available = new Set([...poolIds, ...extraTasks.map((task) => task.taskId)]);
  const rounds = new Map<number, string[]>();
  for (const round of curated.rounds) {
    if (round.taskIds.every((taskId) => available.has(taskId))) {
      rounds.set(round.roundNo, [...round.taskIds]);
    } else {
      console.warn('[tournaments] curated round incomplete, falling back to random', {
        roomId, roundNo: round.roundNo,
      });
    }
  }
  return rounds.size > 0 ? { rounds, extraTasks } : null;
}

export function buildTournamentRounds(
  roomId: string,
  pool: TournamentTask[],
  curatedRounds?: Map<number, string[]>,
): TournamentRound[] | null {
  const poolMap = new Map(pool.map((task) => [task.taskId, task]));
  const usedTaskIds = new Set<string>();
  const rounds: TournamentRound[] = [];

  for (let index = 0; index < TOURNAMENT_ROUND_MODE_PLAN.length; index += 1) {
    const roundNo = index + 1;
    const plannedModes = TOURNAMENT_ROUND_MODE_PLAN[index];
    const curatedIds = curatedRounds?.get(roundNo);
    if (curatedIds
      && curatedIds.length === DEFAULT_TASKS_PER_ROUND
      && new Set(curatedIds).size === DEFAULT_TASKS_PER_ROUND
      && curatedIds.every((taskId) => poolMap.has(taskId) && !usedTaskIds.has(taskId))) {
      const selected = curatedIds.map((taskId) => poolMap.get(taskId)!);
      const curatedModes = selected.map((task) => task.mode).sort();
      const expectedModes = [...plannedModes].sort();
      if (curatedModes.every((mode, modeIndex) => mode === expectedModes[modeIndex])) {
        curatedIds.forEach((taskId) => usedTaskIds.add(taskId));
        rounds.push({ roundNo, mode: 'mix', taskIds: [...curatedIds], results: {} });
        continue;
      }
    }

    const selected: TournamentTask[] = [];
    for (const plannedMode of plannedModes) {
      const modePool = pool.filter((task) => task.mode === plannedMode);
      const usesDeterministicExposureDeck = modePool.length > 0
        && modePool.every((task) => task.tags?.includes('pool:tpool_20260801_v6')
          || task.tags?.includes('pool:tpool_20260801_v5'));
      const picked = selectRoundTasks({
        pool: usesDeterministicExposureDeck
          ? modePool
          : modePool.filter((task) => !usedTaskIds.has(task.taskId)),
        roomId,
        roundNo,
        count: DEFAULT_TASKS_PER_ROUND,
        modeKind: 'mix',
        excludedTaskIds: usesDeterministicExposureDeck ? usedTaskIds : undefined,
      })[0];
      if (!picked) return null;
      usedTaskIds.add(picked.taskId);
      selected.push(picked);
    }
    rounds.push({
      roundNo,
      mode: 'mix',
      taskIds: selected.map((task) => task.taskId),
      results: {},
    });
  }
  return rounds;
}

// Compatibility name for existing internal call sites and source-level guards.
function buildRounds(
  roomId: string,
  pool: TournamentTask[],
  curatedRounds?: Map<number, string[]>,
): TournamentRound[] | null {
  return buildTournamentRounds(roomId, pool, curatedRounds);
}

function publicTournamentPlayer(player: TournamentPlayer): TournamentPlayer {
  const {
    isBot: _isBot, botWinRate: _botWinRate,
    resultPlace: rawResultPlace, rewardGems: rawRewardGems,
    ...publicPlayer
  } = player;
  const resultPlace = readInt(rawResultPlace, 0);
  const rewardGems = readInt(rawRewardGems, -1);
  return {
    ...publicPlayer,
    ...(resultPlace > 0 ? { resultPlace } : {}),
    ...(rewardGems >= 0 ? { rewardGems } : {}),
  };
}

function recentBotRosterRef(db: FirebaseFirestore.Firestore): FirebaseFirestore.DocumentReference {
  return db.collection(TOURNAMENT_PRIVATE_STATE_COLLECTION).doc(RECENT_BOT_ROSTER_DOC);
}

function readRecentBotProfileIds(data: FirebaseFirestore.DocumentData | undefined): string[] {
  if (data?.kind !== 'recent_tournament_bot_roster_v1' || !Array.isArray(data.botProfileIds)) return [];
  return Array.from(new Set(data.botProfileIds
    .map((value: unknown) => sanitizeString(value, 160))
    .filter((value: string) => !!value))).slice(0, TOURNAMENT_ROOM_SIZE);
}

type BotReservationPlan = {
  players: TournamentPlayer[];
  metadata: {
    kind: 'bot_simulation_v1';
    expectedBotCount: number;
    bots: Array<{ playerId: string; profileId: string; winRate: number }>;
  };
  selectedProfileIds: string[];
  fillDeadlineAtMs: number;
};

function botArrivalPotEvents(
  players: readonly TournamentPlayer[],
  startingPotGems: number,
  botEntryGems: number,
): NonNullable<TournamentRoomDoc['lobbyEvents']> {
  let potGemsAfter = Math.max(0, Math.trunc(startingPotGems));
  return players.slice().sort((left, right) => (
    (left.joinAtMs ?? 0) - (right.joinAtMs ?? 0) || left.id.localeCompare(right.id)
  )).map((player) => {
    const potDeltaGems = Math.max(0, Math.trunc(botEntryGems));
    potGemsAfter += potDeltaGems;
    return {
      eventId: `bot_arrival_${player.id}`,
      kind: 'bot_arrival' as const,
      playerId: player.id,
      atMs: Math.max(0, Math.trunc(player.joinAtMs ?? 0)),
      potDeltaGems,
      potGemsAfter,
    };
  });
}

function buildBotReservationPlan(input: {
  profiles: readonly BotProfile[];
  roomId: string;
  count: number;
  gatherStartedAtMs: number;
  recentBotIds: readonly string[];
  colorOffset?: number;
}): BotReservationPlan {
  const selected = selectTournamentBotProfiles({
    profiles: input.profiles,
    count: input.count,
    seed: input.roomId,
    recentBotIds: input.recentBotIds,
  });
  const fillEndsAtMs = input.gatherStartedAtMs
    + TOURNAMENT_ROOM_GATHER_MS
    + TOURNAMENT_BOT_FILL_WINDOW_MS;
  const joinTimes = planBotJoinTimes({
    seed: input.roomId,
    botCount: selected.length,
    fromMs: input.gatherStartedAtMs,
    startsAtMs: fillEndsAtMs,
  });
  const players = selected.map((bot, index): TournamentPlayer => ({
    id: `p_${tournamentHash32(`${input.roomId}:${bot.botId}`).toString(36)}`,
    isBot: true,
    name: bot.name,
    avatar: bot.avatarEmoji,
    ...(bot.avatarAura ? { aura: bot.avatarAura } : {}),
    color: bot.color || PLAYER_COLORS[((input.colorOffset || 0) + index) % PLAYER_COLORS.length],
    score: 0,
    streak: 0,
    botWinRate: bot.winRate,
    joinAtMs: joinTimes[index],
  }));
  const lastBotAtMs = joinTimes.length > 0 ? Math.max(...joinTimes) : input.gatherStartedAtMs;
  return {
    players,
    metadata: {
      kind: 'bot_simulation_v1',
      expectedBotCount: players.length,
      bots: players.map((player, index) => ({
        playerId: player.id,
        profileId: selected[index].botId,
        winRate: player.botWinRate!,
      })),
    },
    selectedProfileIds: selected.map((profile) => profile.botId),
    // The final authored arrival is the boundary. There is no extra settling
    // second: once the sixteenth seat is visible, a participant may ask the
    // server to start round one immediately.
    fillDeadlineAtMs: Math.max(input.gatherStartedAtMs, lastBotAtMs),
  };
}

function recentBotRosterData(roomId: string, profileIds: readonly string[], nowMs: number): Row {
  return {
    kind: 'recent_tournament_bot_roster_v1',
    roomId,
    botProfileIds: profileIds.slice(0, TOURNAMENT_ROOM_SIZE),
    updatedAtMs: nowMs,
  };
}

function hydratePrivateBotMetadata(room: TournamentRoomDoc, data: FirebaseFirestore.DocumentData | undefined): TournamentRoomDoc {
  // Legacy rooms may still carry an explicit isBot marker on every player. New
  // rooms deliberately remove it from the public document, so their private
  // metadata is the only authoritative identity map and must be complete.
  if (!data && room.players.every((player) => typeof player.isBot === 'boolean')) return room;
  const entries = Array.isArray(data?.bots) ? data.bots as Array<Record<string, unknown>> : [];
  const expectedBotCount = readInt(data?.expectedBotCount, -1);
  const roomPlayerIds = new Set(room.players.map((player) => player.id));
  const botRates = new Map<string, number>();
  for (const entry of entries) {
    const playerId = sanitizeString(entry.playerId, 160);
    const winRate = Number(entry.winRate);
    if (!playerId || !roomPlayerIds.has(playerId) || botRates.has(playerId)
      || !Number.isFinite(winRate) || winRate < 0.15 || winRate > 0.85) {
      throw new HttpsError('failed-precondition', 'bot_simulation_metadata_invalid');
    }
    botRates.set(playerId, winRate);
  }
  if (data?.kind !== 'bot_simulation_v1' || expectedBotCount < 0
    || expectedBotCount !== entries.length || expectedBotCount > room.players.length) {
    throw new HttpsError('failed-precondition', 'bot_simulation_metadata_invalid');
  }
  return {
    ...room,
    players: room.players.map((player) => {
      if (!player || typeof player !== 'object') return player;
      return botRates.has(player.id)
        ? { ...player, isBot: true, botWinRate: botRates.get(player.id) }
        : { ...player, isBot: false };
    }),
  };
}

function publicTournamentRounds(rounds: TournamentRound[]): TournamentRound[] {
  return rounds.map((round) => ({
    ...round,
    results: Object.fromEntries(Object.entries(round.results || {}).map(([playerId, result]) => [
      playerId,
      result.submissionStatus === 'simulated'
        ? { ...result, submissionStatus: 'submitted' as const }
        : result,
    ])),
  }));
}

function roundsWithActivatedPublicTasks(
  rounds: TournamentRound[],
  roundNo: number,
  tasks: TournamentTask[],
  stateStartedAtMs: number,
  // зачем: roomId — соль отпечатков ответов (см. answerFingerprint). Без него
  // клиент не сможет мгновенно покрасить кнопку «Готово» красным при ошибке.
  roomId?: string,
): TournamentRound[] {
  const publicTasks = tasks.map((task) => toPublicTournamentTask(task, roomId));
  const { taskSchedule } = tournamentRoundTimingWindow(tasks, stateStartedAtMs);
  if (publicTasks.some((task) => task === null)) throw new HttpsError('failed-precondition', 'round_tasks_unavailable');
  return publicTournamentRounds(rounds.map((round) => {
    if (round.roundNo === roundNo) {
      return { ...round, tasks: publicTasks as NonNullable<typeof publicTasks[number]>[], taskSchedule };
    }
    if (round.roundNo < roundNo) return round;
    const { tasks: _futureTasks, taskSchedule: _futureSchedule, ...withoutFutureTasks } = round;
    return withoutFutureTasks;
  }));
}

// ── Room creation: missing/invalid config or resources creates nothing. ─────────

export function planTournamentStartNowJoinedRoom(input: {
  room: TournamentRoomDoc;
  authUid: string;
  stableUid: string;
  user: FirebaseFirestore.DocumentData;
  publicProfile: FirebaseFirestore.DocumentData;
  leaderboardProfile: FirebaseFirestore.DocumentData;
  profileHint?: unknown;
  config: TournamentScheduleConfig;
  currentEconomy: unknown;
  selectedTasks: readonly TournamentTask[];
  botMetadata: BotReservationPlan['metadata'];
  nowMs: number;
  testModeReleaseEnabled: boolean;
}): {
  room: TournamentRoomDoc;
  botMetadata: BotReservationPlan['metadata'];
  joinResult: Row;
} {
  const {
    room, authUid, stableUid, user, publicProfile, leaderboardProfile, config,
    currentEconomy, selectedTasks, nowMs,
  } = input;
  if (!input.testModeReleaseEnabled) {
    throw new HttpsError('failed-precondition', 'tournament_testing_disabled');
  }
  if (tournamentRoomAdmissionMode(room, config) !== 'test') {
    throw new HttpsError('failed-precondition', 'tournament_testing_disabled');
  }
  const economy = tournamentEconomySnapshotForMode(
    currentEconomy,
    true,
  );
  if (economy.entryGems !== 0 || economy.botEntryGems !== 0) {
    throw new HttpsError('failed-precondition', 'tournament_test_economy_invalid');
  }
  const gemsBefore = readGemBalance(user.shards);
  const playerProfile = resolveTournamentPlayerProfile(
    publicProfile,
    leaderboardProfile,
    user,
    tournamentProfileHint(input.profileHint),
  );
  const player: TournamentPlayer = {
    id: stableUid,
    isBot: false,
    ...playerProfile,
    avatar: playerProfile.avatar || '🙂',
    color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
    score: 0,
    streak: 0,
    joinAtMs: nowMs,
    entry: {
      kind: 'ticket',
      ticketsSpent: 0,
      bankContributionGems: 0,
      weekId: tournamentWeekId(room.startsAt),
    },
  };
  let joinPlan: ReturnType<typeof planTournamentHumanLobbyJoin>;
  try {
    joinPlan = planTournamentHumanLobbyJoin(room, player, authUid, nowMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'room_not_joinable';
    throw new HttpsError(message === 'room_full' ? 'resource-exhausted' : 'failed-precondition', message);
  }
  const nextRoom = joinPlan.room;
  const fillsLastSeat = room.state === 'lobby'
    && nextRoom.players.length === TOURNAMENT_ROOM_SIZE
    && joinPlan.startImmediately;
  let activatedRounds: TournamentRound[] | undefined;
  let activationTiming: ReturnType<typeof tournamentRoundTimingWindow> | undefined;
  if (fillsLastSeat) {
    const firstRound = nextRoom.rounds.find((round) => round.roundNo === 1);
    const taskMap = new Map(selectedTasks.map((task) => [task.taskId, task]));
    const firstRoundTasks = firstRound?.taskIds.map((taskId) => taskMap.get(taskId));
    if (!firstRound || !firstRoundTasks || firstRoundTasks.some((task) => !task)) {
      throw new HttpsError('failed-precondition', 'round_tasks_unavailable');
    }
    activationTiming = tournamentRoundTimingWindow(firstRoundTasks as TournamentTask[], nowMs);
    activatedRounds = roundsWithActivatedPublicTasks(
      nextRoom.rounds, 1, firstRoundTasks as TournamentTask[], nowMs, room.roomId,
    );
  }
  const botMetadata = joinPlan.displacedBotPlayerId
    ? {
      ...input.botMetadata,
      expectedBotCount: input.botMetadata.bots.length - 1,
      bots: input.botMetadata.bots.filter(
        (entry) => entry.playerId !== joinPlan.displacedBotPlayerId,
      ),
    }
    : input.botMetadata;
  const priorLobbyEvents = room.lobbyEvents ?? [];
  const priorBotFunding = priorLobbyEvents.reduce(
    (sum, event) => sum + Math.max(0, event.potDeltaGems),
    0,
  );
  const lobbyBasePot = Math.max(0, readGemBalance(room.potGems) - priorBotFunding);
  const retainedLobbyEvents = joinPlan.displacedBotPlayerId
    ? priorLobbyEvents.filter((event) => event.playerId !== joinPlan.displacedBotPlayerId)
    : priorLobbyEvents;
  let eventPot = lobbyBasePot;
  const lobbyEvents = retainedLobbyEvents.map((event) => {
    eventPot += Math.max(0, event.potDeltaGems);
    return { ...event, potGemsAfter: eventPot };
  });
  const potGems = lobbyEvents.at(-1)?.potGemsAfter ?? eventPot;
  return {
    room: {
      ...nextRoom,
      economySnapshot: economy,
      players: nextRoom.players.map(publicTournamentPlayer),
      participantAuthUids: nextRoom.participantAuthUids,
      ...(fillsLastSeat ? {
        state: 'round1',
        stateStartedAtMs: nowMs,
        introEndsAtMs: activationTiming!.introEndsAtMs,
        stateDeadlineAtMs: activationTiming!.stateDeadlineAtMs,
        rounds: activatedRounds!,
      } : {}),
      potGems,
      lobbyEvents,
      ...((fillsLastSeat || nextRoom.stateDeadlineAtMs === undefined)
        ? {}
        : { stateDeadlineAtMs: nextRoom.stateDeadlineAtMs }),
      version: nextRoom.version,
    },
    botMetadata,
    joinResult: {
      ok: true,
      joined: true,
      roomId: room.roomId,
      entryGems: 0,
      gemsLeft: gemsBefore,
      startImmediately: fillsLastSeat,
    },
  };
}

export const tournamentCreateRooms = onSchedule(
  { schedule: '*/5 * * * *', timeZone: 'UTC', region: 'europe-west1', maxInstances: 1 },
  async () => {
    const db = admin.firestore();
    const [config, resources, economySnap] = await Promise.all([
      loadScheduleConfig(db),
      loadResourcePool(db),
      db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('economy').get(),
    ]);
    const economySnapshot = tournamentEconomySnapshotForMode(economySnap.data(), false);
    if (config.slots.length === 0 || resources.bots.length < TOURNAMENT_ROOM_SIZE - TOURNAMENT_MIN_REAL_PLAYERS) {
      console.warn('[tournaments] create skipped: config_or_bots_unavailable');
      return;
    }
    const nowMs = Date.now();
    for (const slot of config.slots) {
      if (!slot.enabled) continue;
      const dateKey = dateKeyInTimezone(nowMs, slot.timezone);
      const startsAt = slotStartMs(dateKey, slot.localTime, slot.timezone);
      if (nowMs < startsAt - TOURNAMENT_CREATE_AHEAD_MS || nowMs >= startsAt) continue;
      const roomId = tournamentRoomId(slot.slotId, slot.timezone, dateKey);
      const curated = await loadCuratedForRoom(db, roomId, resources.tasks);
      const roomPool = curated ? [...resources.tasks, ...curated.extraTasks] : resources.tasks;
      if (!buildRounds(roomId, roomPool, curated?.rounds)) {
        console.warn('[tournaments] create skipped: task_pool_unavailable', { roomId });
        continue;
      }
      const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(roomRef);
        if (existing.exists) return;
        const taskPoolGeneration = await assertTournamentPoolCommitAllowed(
          tx, db, {
            generation: resources.taskPoolGeneration,
            revision: resources.taskPoolRevision,
          },
        );
          const room: TournamentRoomDoc = {
            economySnapshot,
            roomId,
            taskPoolGeneration,
          testMode: false,
          slotId: slot.slotId,
          seed: roomId,
          state: 'scheduled',
          startsAt,
          players: [],
          rounds: [],
          participantAuthUids: [],
          participantAuthUidsComplete: true,
          stateStartedAtMs: nowMs,
          stateDeadlineAtMs: startsAt - TOURNAMENT_LOBBY_OPEN_MS,
          version: 0,
          createdAtMs: nowMs,
          expireAtMs: startsAt + TOURNAMENT_ROOM_TTL_MS,
        };
        tx.create(roomRef, {
          ...room,
          ticketsRequired: slot.ticketsRequired,
          timezone: slot.timezone,
          ready: false,
          featureGates: tournamentFeatureGates(),
          expireAt: admin.firestore.Timestamp.fromMillis(startsAt + TOURNAMENT_ROOM_TTL_MS),
        });
      });
    }
  },
);

// ── Join: room, config, inventory, bank contribution and provenance are atomic. ─

export async function tournamentJoinTransaction(
  db: FirebaseFirestore.Firestore,
  input: {
    authUid: string;
    stableUid: string;
    roomId: string;
    nowMs?: number;
    profileHint?: unknown;
  },
): Promise<Row> {
  const { authUid, stableUid, roomId } = input;
  const requestedNowMs = input.nowMs;

  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  const userRef = db.collection('users').doc(stableUid);
  const configRef = db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc(TOURNAMENT_SCHEDULE_CONFIG_DOC);
  // Настройки экономики (цена входа, доли призов) — правятся из админки.
  const economyRef = db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('economy');
  const authLinkRef = db.collection('auth_links').doc(authUid);
  const bannedRef = db.collection('banned_users').doc(stableUid);
  const botMetadataRef = roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
    .doc(BOT_SIMULATION_METADATA_DOC);
  // зачем 2026-07-27: в users/{uid} ника нет — настоящее имя и аватар живут в
  // leaderboard/{uid} (туда их пишет онбординг и синк XP). Без этого документа
  // турнир подставлял заглушку 'Player', и она уезжала в недельный рейтинг,
  // где её видели все. Читаем в ТОЙ ЖЕ транзакции — лишнего запроса нет.
  const leaderboardRef = db.collection('leaderboard').doc(stableUid);
  const publicProfileRef = db.collection('public_profiles').doc(stableUid);

  return db.runTransaction(async (tx) => {
    const [roomSnap, userSnap, economySnap, configSnap, authLinkSnap, bannedSnap,
      leaderboardSnap, publicProfileSnap, botMetadataSnap]
      = await tx.getAll(
        roomRef, userRef, economyRef, configRef, authLinkRef, bannedRef,
        leaderboardRef, publicProfileRef, botMetadataRef,
    );
    if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
    assertTransactionalTournamentAccess(authUid, stableUid, authLinkSnap, userSnap, bannedSnap);
    const room = hydratePrivateBotMetadata(readRoom(roomSnap), botMetadataSnap.data());
    const nowMs = requestedNowMs ?? Date.now();
    const user = userSnap.data() || {};
    const profile = leaderboardSnap.exists ? leaderboardSnap.data() || {} : {};
    const publicProfile = publicProfileSnap.exists ? publicProfileSnap.data() || {} : {};
    const playerProfile = resolveTournamentPlayerProfile(
      publicProfile,
      profile,
      user,
      tournamentProfileHint(input.profileHint),
    );
    const existingPlayer = room.players.find((player) => !player.isBot && player.id === stableUid);
    if (existingPlayer) {
      const replayRoom = applyTournamentJoin(
        room,
        { ...existingPlayer, ...playerProfile, avatar: playerProfile.avatar || '🙂' },
        authUid,
        nowMs,
      );
      if (replayRoom !== room) {
        tx.set(roomRef, {
          players: replayRoom.players.map(publicTournamentPlayer),
          participantAuthUids: replayRoom.participantAuthUids,
          version: replayRoom.version,
          updatedAt: nowMs,
        }, { merge: true });
      }
      return { ok: true, joined: true, alreadyJoined: true, roomId };
    }
    // зачем 2026-07-27 (владелец: «убирай дев полностью»): поблажки для
    // тестовой комнаты удалены. Вход открыт только в лобби и только до старта — ровно
    // те правила, которые увидит игрок. Комната по кнопке им подчиняется.
    // зачем 2026-07-27 (владелец: «турнир попытка войти дала ошибку»): комната
    // живёт в 'scheduled', пока крон tournamentAdvanceRooms не переведёт её в
    // 'lobby' за 5 минут до старта. Игрок, нажавший «Играть» до этого тика,
    // получал room_not_joinable на исправной комнате — вход зависел от
    // расписания КРОНА, а не от расписания турниров. Пускаем и в 'scheduled':
    // единственное, что действительно закрывает вход — наступивший старт
    // (проверка строкой ниже). Идущий или отменённый турнир по-прежнему
    // недоступен, потому что его состояние уже не scheduled/lobby.
    if (room.state !== 'lobby' && room.state !== 'scheduled') {
      throw new HttpsError('failed-precondition', 'room_not_joinable');
    }
    if (nowMs >= (room.stateDeadlineAtMs ?? room.startsAt)) {
      throw new HttpsError('failed-precondition', 'join_cutoff_elapsed');
    }

    const config = configSnap.exists ? normalizeTournamentSchedule(configSnap.data()) : normalizeTournamentSchedule(null);
    // On-demand test rooms are admitted only by their immutable mode snapshot
    // plus the current server switch. Scheduled and legacy paid rooms keep their
    // original slot-based admission contract.
    const admissionMode = tournamentRoomAdmissionMode(room, config);
    if (!admissionMode) {
      throw new HttpsError(
        'failed-precondition',
        isTournamentTestRoom(room) ? 'tournament_testing_disabled' : 'tournament_config_disabled',
      );
    }
    if (admissionMode === 'test' && !tournamentTestModeReleaseEnabled()) {
      throw new HttpsError('failed-precondition', 'tournament_testing_disabled');
    }

    // Test mode is also enforced here, inside the transaction: a forged room id
    // or stale client cannot turn a paid room free or bypass a disabled switch.
    const roomEconomySnapshot = normalizeTournamentEconomy(room.economySnapshot ?? economySnap.data());
    const economy = tournamentEconomySnapshotForMode(
      roomEconomySnapshot,
      admissionMode === 'test',
    );
    const entryGems = economy.entryGems;
    const weekId = tournamentWeekId(room.startsAt);
    // зачем 2026-07-27 (решение владельца): один турнир на слот на человека.
    // С шардингом комнат слота стало много, и без этого лимита можно было бы
    // за один слот пройти пять турниров подряд и нафармить банк недели —
    // тогда банк перестаёт быть про умение и достаётся тому, кто дольше сидит
    // в приложении. Маркер пишем в профиль в ЭТОЙ же транзакции: отдельная
    // коллекция стоила бы лишних чтений на каждом входе.
    const roomTimezone = sanitizeString(roomSnap.data()?.timezone, 64) || 'Europe/Moscow';
    const slotKey = `${room.slotId}_${dateKeyInTimezone(room.startsAt, roomTimezone)}`;
    // зачем 2026-07-27 (владелец: «дев турнир не создался slot_already_played,
    // такого не должно быть, дев без ограничений»): лимит «один турнир на слот
    // в день» правильный для боевых слотов, но дев-комнаты живут под общим
    // ключом dev-…, поэтому ВТОРОЙ тестовый турнир за день всегда упирался в
    // этот же slotKey и войти было нельзя. Дев-комнату из лимита исключаем —
    // она не влияет ни на банк недели, ни на сезонный рейтинг.
    if (admissionMode === 'scheduled' && sanitizeString(user.tournament_last_slot_key, 200) === slotKey) {
      throw new HttpsError('failed-precondition', 'slot_already_played');
    }

    const gemsBefore = readGemBalance(user.shards);
    if (gemsBefore < entryGems) {
      throw new HttpsError('failed-precondition', 'not_enough_gems');
    }
    const contribution = entryGems;
    const player: TournamentPlayer = {
      id: stableUid,
      isBot: false,
      ...playerProfile,
      avatar: playerProfile.avatar || '🙂',
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
      score: 0,
      streak: 0,
      // зачем 2026-07-27: живой игрок появляется в лобби в момент реального
      // входа. Поле есть у ВСЕХ (и у ботов) — иначе по его наличию клиент
      // отличал бы бота от человека, а isBot из документа комнаты вырезается
      // намеренно (publicTournamentPlayer).
      joinAtMs: nowMs,
      entry: {
        // kind оставлен 'ticket' для совместимости со старыми комнатами:
        // поле читается при отмене турнира. Реально списаны жемчужины.
        kind: 'ticket',
        ticketsSpent: 0,
        bankContributionGems: contribution,
        weekId,
      },
    };
    let joinPlan: ReturnType<typeof planTournamentHumanLobbyJoin>;
    try {
      joinPlan = planTournamentHumanLobbyJoin(room, player, authUid, nowMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'room_not_joinable';
      throw new HttpsError(message === 'room_full' ? 'resource-exhausted' : 'failed-precondition', message);
    }
    const nextRoom = joinPlan.room;
    const fillsLastSeat = room.state === 'lobby'
      && nextRoom.players.length === TOURNAMENT_ROOM_SIZE
      && joinPlan.startImmediately;
    let activatedRounds: TournamentRound[] | undefined;
    let activationTiming: ReturnType<typeof tournamentRoundTimingWindow> | undefined;
    if (fillsLastSeat) {
      const firstRound = nextRoom.rounds.find((round) => round.roundNo === 1);
      if (roomSnap.data()?.ready !== true || !firstRound || firstRound.taskIds.length === 0) {
        throw new HttpsError('failed-precondition', 'round_tasks_unavailable');
      }
      const taskSnaps = await tx.getAll(...firstRound.taskIds.map((taskId) => (
        roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(taskId)
      )));
      const firstRoundTasks = taskSnaps.map(parseTask);
      if (firstRoundTasks.some((task) => task === null)) {
        throw new HttpsError('failed-precondition', 'round_tasks_unavailable');
      }
      activationTiming = tournamentRoundTimingWindow(firstRoundTasks as TournamentTask[], nowMs);
      activatedRounds = roundsWithActivatedPublicTasks(
        nextRoom.rounds, 1, firstRoundTasks as TournamentTask[], nowMs, roomId,
      );
    }
    if (joinPlan.displacedBotPlayerId) {
      const metadata = botMetadataSnap.data();
      const bots = Array.isArray(metadata?.bots)
        ? (metadata.bots as Array<Record<string, unknown>>)
          .filter((entry) => sanitizeString(entry.playerId, 160) !== joinPlan.displacedBotPlayerId)
        : [];
      tx.set(botMetadataRef, {
        kind: 'bot_simulation_v1',
        expectedBotCount: bots.length,
        bots,
        updatedAtMs: nowMs,
      });
    }
    // зачем: списываем жемчужины из профиля (то же поле shards, что и везде
    // в игре), а весь взнос кладём в банк турнира — комната сама посчитает,
    // сколько уйдёт призёрам и сколько в недельный банк.
    if (admissionMode === 'scheduled') {
      tx.set(userRef, {
        shards: admin.firestore.FieldValue.increment(-entryGems),
        tournament_last_slot_key: slotKey,
        tournament_last_slot_room_id: room.roomId,
        updatedAt: nowMs,
      }, { merge: true });
    }
    const priorLobbyEvents = room.lobbyEvents ?? [];
    const priorBotFunding = priorLobbyEvents.reduce((sum, event) => sum + Math.max(0, event.potDeltaGems), 0);
    const lobbyBasePot = Math.max(0, readGemBalance(roomSnap.data()?.potGems) - priorBotFunding);
    const retainedLobbyEvents = joinPlan.displacedBotPlayerId
      ? priorLobbyEvents.filter((event) => event.playerId !== joinPlan.displacedBotPlayerId)
      : priorLobbyEvents;
    let eventPot = lobbyBasePot + (admissionMode === 'scheduled' ? entryGems : 0);
    const lobbyEvents = retainedLobbyEvents.map((event) => {
      eventPot += Math.max(0, event.potDeltaGems);
      return { ...event, potGemsAfter: eventPot };
    });
    const potGems = lobbyEvents.at(-1)?.potGemsAfter ?? eventPot;
    tx.set(roomRef, {
      players: nextRoom.players.map(publicTournamentPlayer),
      participantAuthUids: nextRoom.participantAuthUids,
      ...(fillsLastSeat ? {
        state: 'round1',
        stateStartedAtMs: nowMs,
        introEndsAtMs: activationTiming!.introEndsAtMs,
        stateDeadlineAtMs: activationTiming!.stateDeadlineAtMs,
        rounds: activatedRounds,
      } : {}),
      ...(admissionMode === 'scheduled' || priorLobbyEvents.length > 0 ? { potGems, lobbyEvents } : {}),
      ...((fillsLastSeat || nextRoom.stateDeadlineAtMs === undefined)
        ? {}
        : { stateDeadlineAtMs: nextRoom.stateDeadlineAtMs }),
      // зачем 2026-07-27 (владелец: «юзер заходит и ждёт 30 секунд, за которые
      // могут подключиться реальные игроки, после 30 секунд добирается ботами»):
      // отметка входа ПЕРВОГО живого — от неё считаются обе фазы сбора. Ставим
      // только один раз: второй зашедший не должен продлевать ожидание первому
      // (владелец: окно жёсткое, живые его не продлевают).
      ...(readInt(roomSnap.data()?.gatherStartedAtMs, 0) > 0
        ? {}
        : { gatherStartedAtMs: nowMs }),
      version: nextRoom.version,
      updatedAt: nowMs,
    }, { merge: true });
    // Клиенту отдаём новый баланс: экран сразу покажет списание без
    // отдельного запроса (Optimistic UI догоняет ответом сервера).
    return {
      ok: true,
      joined: true,
      roomId,
      entryGems,
      gemsLeft: gemsBefore - entryGems,
      startImmediately: fillsLastSeat,
    };
  });
}

export async function tournamentLeaveTransaction(
  db: FirebaseFirestore.Firestore,
  input: { authUid: string; stableUid: string; roomId: string; nowMs?: number },
): Promise<Row> {
  const { authUid, stableUid, roomId } = input;
  const nowMs = input.nowMs ?? Date.now();
  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  const userRef = db.collection('users').doc(stableUid);
  const receiptRef = userRef.collection(TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`leave_${roomId}`);
  const authLinkRef = db.collection('auth_links').doc(authUid);
  const bannedRef = db.collection('banned_users').doc(stableUid);
  const botMetadataRef = roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
    .doc(BOT_SIMULATION_METADATA_DOC);

  return db.runTransaction(async (tx) => {
    const [roomSnap, userSnap, receiptSnap, authLinkSnap, bannedSnap, botMetadataSnap]
      = await tx.getAll(roomRef, userRef, receiptRef, authLinkRef, bannedRef, botMetadataRef);
    if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
    assertTransactionalTournamentAccess(authUid, stableUid, authLinkSnap, userSnap, bannedSnap);

    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() || {};
      const refundedGems = readInt(receipt.refundedGems, -1);
      const potGems = readInt(receipt.potGems, -1);
      if (receipt.kind !== 'tournament_lobby_leave_v1' || receipt.roomId !== roomId
        || receipt.playerId !== stableUid || refundedGems < 0 || potGems < 0) {
        throw new HttpsError('failed-precondition', 'tournament_leave_receipt_invalid');
      }
      return { ok: true, alreadyLeft: true, roomId, refundedGems, potGems };
    }

    const room = hydratePrivateBotMetadata(readRoom(roomSnap), botMetadataSnap.data());
    const cutoffAtMs = room.stateDeadlineAtMs ?? room.startsAt;
    if ((room.state !== 'scheduled' && room.state !== 'lobby')
      || cutoffAtMs <= 0 || nowMs >= cutoffAtMs) {
      throw new HttpsError('failed-precondition', 'room_not_leaveable');
    }
    const player = room.players.find((candidate) => !candidate.isBot && candidate.id === stableUid);
    if (!player) throw new HttpsError('failed-precondition', 'not_in_room');

    // The immutable room snapshot caps the refund; the per-player provenance
    // proves what this exact join actually contributed. Test rooms are always
    // zero-value even if a malformed legacy player record claims otherwise.
    const testMode = isTournamentTestRoom(room);
    const frozenEconomy = tournamentEconomySnapshotForMode(room.economySnapshot, testMode);
    const recordedContribution = Math.max(0, readInt(player.entry?.bankContributionGems, 0));
    const refundedGems = frozenEconomy.entryGems === 0
      ? 0
      : Math.min(recordedContribution, frozenEconomy.entryGems);
    const potGems = Math.max(0, readGemBalance(roomSnap.data()?.potGems) - refundedGems);
    const players = room.players.filter((candidate) => candidate.id !== stableUid);
    const hasRealPlayers = players.some((candidate) => !candidate.isBot);
    const participantAuthUids = (room.participantAuthUids || [])
      .filter((candidate) => candidate !== authUid);

    tx.set(roomRef, {
      players: players.map(publicTournamentPlayer),
      participantAuthUids,
      potGems,
      version: room.version + 1,
      updatedAt: nowMs,
      ...(!hasRealPlayers
        ? { gatherStartedAtMs: admin.firestore.FieldValue.delete() }
        : {}),
    }, { merge: true });

    const user = userSnap.data() || {};
    const clearsSlotMarker = sanitizeString(user.tournament_last_slot_room_id, 160) === roomId;
    tx.set(userRef, {
      ...(refundedGems > 0
        ? { shards: admin.firestore.FieldValue.increment(refundedGems) }
        : {}),
      ...(clearsSlotMarker
        ? {
          tournament_last_slot_key: admin.firestore.FieldValue.delete(),
          tournament_last_slot_room_id: admin.firestore.FieldValue.delete(),
        }
        : {}),
      updatedAt: nowMs,
    }, { merge: true });
    tx.create(receiptRef, {
      kind: 'tournament_lobby_leave_v1',
      roomId,
      playerId: stableUid,
      refundedGems,
      potGems,
      createdAtMs: nowMs,
    });
    return { ok: true, alreadyLeft: false, roomId, refundedGems, potGems };
  });
}

export async function tournamentForfeitTransaction(
  db: FirebaseFirestore.Firestore,
  input: { authUid: string; stableUid: string; roomId: string; confirmed: boolean; nowMs?: number },
): Promise<Row> {
  if (input.confirmed !== true) {
    throw new HttpsError('failed-precondition', 'forfeit_confirmation_required');
  }
  const { authUid, stableUid, roomId } = input;
  const nowMs = input.nowMs ?? Date.now();
  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  const userRef = db.collection('users').doc(stableUid);
  const receiptRef = userRef.collection(TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`forfeit_${roomId}`);
  const authLinkRef = db.collection('auth_links').doc(authUid);
  const bannedRef = db.collection('banned_users').doc(stableUid);
  const botMetadataRef = roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
    .doc(BOT_SIMULATION_METADATA_DOC);

  return db.runTransaction(async (tx) => {
    const [roomSnap, userSnap, receiptSnap, authLinkSnap, bannedSnap, botMetadataSnap]
      = await tx.getAll(roomRef, userRef, receiptRef, authLinkRef, bannedRef, botMetadataRef);
    if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
    assertTransactionalTournamentAccess(authUid, stableUid, authLinkSnap, userSnap, bannedSnap);
    const potGems = Math.max(0, readGemBalance(roomSnap.data()?.potGems));
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() || {};
      if (receipt.kind !== 'tournament_active_forfeit_v1' || receipt.roomId !== roomId
        || receipt.playerId !== stableUid || readInt(receipt.refundedGems, -1) !== 0
        || readInt(receipt.potGems, -1) !== potGems) {
        throw new HttpsError('failed-precondition', 'tournament_forfeit_receipt_invalid');
      }
      return { ok: true, alreadyForfeited: true, roomId, refundedGems: 0, potGems };
    }

    const room = hydratePrivateBotMetadata(readRoom(roomSnap), botMetadataSnap.data());
    if (!/^(round[1-4]|table[1-3])$/.test(room.state)) {
      throw new HttpsError('failed-precondition', 'room_not_forfeitable');
    }
    const playerIndex = room.players.findIndex((candidate) => !candidate.isBot && candidate.id === stableUid);
    if (playerIndex < 0) throw new HttpsError('permission-denied', 'not_in_room');
    if (room.players[playerIndex].forfeitedAtMs !== undefined) {
      throw new HttpsError('failed-precondition', 'tournament_forfeit_receipt_missing');
    }

    const players = room.players.map((player, index) => index === playerIndex ? {
      ...player,
      forfeitedAtMs: nowMs,
      forfeitState: room.state as TournamentPlayer['forfeitState'],
      streak: 0,
    } : player);
    const rounds = room.rounds.map((round) => {
      if (round.results?.[stableUid]) return round;
      return {
        ...round,
        results: {
          ...(round.results || {}),
          [stableUid]: {
            playerId: stableUid,
            correct: 0,
            total: round.taskIds.length,
            roundScore: 0,
            submittedAtMs: nowMs,
            submissionStatus: 'timed_out' as const,
            timedOut: true,
            streakBefore: room.players[playerIndex].streak,
            missStreakBefore: room.players[playerIndex].missStreak ?? 0,
            roundStartedAtMs: room.stateStartedAtMs ?? nowMs,
            review: round.taskIds.map((taskId) => ({ taskId, correct: false, timedOut: true })),
          },
        },
      };
    });
    const activeRound = /^round[1-4]$/.test(room.state)
      ? rounds.find((round) => `round${round.roundNo}` === room.state)
      : undefined;
    const allRealResolved = activeRound !== undefined && players
      .filter((player) => !player.isBot)
      .every((player) => activeRound.results[player.id] !== undefined);
    const stateDeadlineAtMs = allRealResolved
      ? Math.min(room.stateDeadlineAtMs ?? Number.MAX_SAFE_INTEGER, nowMs + TOURNAMENT_EARLY_ADVANCE_DELAY_MS)
      : room.stateDeadlineAtMs;

    tx.set(roomRef, {
      players: players.map(publicTournamentPlayer),
      rounds: publicTournamentRounds(rounds),
      ...(stateDeadlineAtMs === undefined ? {} : { stateDeadlineAtMs }),
      version: room.version + 1,
      updatedAt: nowMs,
    }, { merge: true });
    tx.create(receiptRef, {
      kind: 'tournament_active_forfeit_v1',
      roomId,
      playerId: stableUid,
      state: room.state,
      refundedGems: 0,
      potGems,
      createdAtMs: nowMs,
    });
    return { ok: true, alreadyForfeited: false, roomId, refundedGems: 0, potGems };
  });
}

/**
 * Разбор id комнаты обратно на слот/таймзону/дату/номер шарда.
 *
 * зачем: клиент присылает id базовой комнаты слота (shard 0) — формулу он
 * считает сам, без лишнего чтения. Чтобы посадить игрока в свободную комнату,
 * серверу нужно из этого id получить составные части и перебрать шарды.
 * Разбор идёт с КОНЦА: slotId сам может содержать '_'.
 */
function parseTournamentRoomId(
  roomId: string,
): { slotId: string; timezone: string; dateKey: string; shard: number } | null {
  const shardMatch = /^(.*)_r(\d{1,3})$/.exec(roomId);
  const base = shardMatch ? shardMatch[1] : roomId;
  const shard = shardMatch ? Number(shardMatch[2]) : 0;
  // Хвост базового id — '<timezone>_<YYYY-MM-DD>', таймзона записана с '_'
  // вместо небуквенных символов (Europe_Moscow).
  const parts = base.split('_');
  const dateKey = parts.pop();
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  // Таймзона — минимум один сегмент; всё, что левее, это slotId.
  if (parts.length < 2) return null;
  const timezone = parts.slice(-2).join('/');
  const slotId = parts.slice(0, -2).join('_');
  if (!slotId) return null;
  return { slotId, timezone, dateKey, shard };
}

/**
 * Создаёт дополнительную комнату слота (шард N>0) под уже идущий набор.
 *
 * зачем: комнаты-шарды не создаются пачкой заранее — это были бы пустые
 * документы на каждом слоте каждый день. Шард появляется ровно в тот момент,
 * когда в предыдущую комнату не влез живой игрок.
 *
 * Возвращает false, если создавать нельзя (нет базовой комнаты слота, слот
 * уже стартовал, шард 0). Тогда вызывающий отдаёт игроку исходную ошибку.
 */
async function createTournamentShardRoom(
  db: FirebaseFirestore.Firestore,
  input: { slotId: string; timezone: string; dateKey: string; shard: number },
): Promise<boolean> {
  const { slotId, timezone, dateKey, shard } = input;
  const nowMs = Date.now();
  let startsAt = 0;
  let baseTicketsRequired = 1;

  if (shard <= 0) {
    // зачем 2026-07-27 (владелец: «турнир попытка войти дала ошибку»): комнату
    // шарда 0 создаёт ТОЛЬКО крон tournamentCreateRooms раз в 5 минут. Игрок,
    // нажавший «Играть» до его тика, упирался в room_not_found — вход был
    // ЗАВИСИМ от расписания крона, а не от расписания турниров. Раньше эта
    // ветка просто отвечала false («шард 0 не создаём»), и ошибка доходила до
    // экрана. Теперь вход создаёт комнату слота сам, по тем же данным, что и
    // крон: расписание — источник правды, крон лишь делает это заранее.
    const config = await loadScheduleConfig(db);
    const slot = config.slots.find((candidate) => candidate.slotId === slotId && candidate.enabled);
    if (!slot) return false;
    startsAt = slotStartMs(dateKey, slot.localTime, slot.timezone);
    baseTicketsRequired = slot.ticketsRequired;
  } else {
    // Базовая комната слота — источник правды по времени старта и цене входа.
    const baseRef = db.collection(TOURNAMENT_ROOMS_COLLECTION)
      .doc(tournamentRoomId(slotId, timezone, dateKey, 0));
    const baseSnap = await baseRef.get();
    if (!baseSnap.exists) return false;
    const base = baseSnap.data() || {};
    startsAt = readInt(base.startsAt, 0);
    baseTicketsRequired = readInt(base.ticketsRequired, 1) || 1;
  }
  // Вход закрывается в момент старта — опоздавшему новый шард не поможет.
  if (startsAt <= 0 || nowMs >= startsAt) return false;

  const roomId = tournamentRoomId(slotId, timezone, dateKey, shard);
  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  const [resources, economySnap] = await Promise.all([
    loadResourcePool(db),
    db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('economy').get(),
  ]);
  const economySnapshot = tournamentEconomySnapshotForMode(economySnap.data(), false);
  // Кураторский набор владельца принадлежит конкретной комнате: в шардах его
  // нет — они играют на общем пуле заданий.
  const rounds = buildRounds(roomId, resources.tasks);
  if (!rounds) {
    console.warn('[tournaments] shard create skipped: task_pool_unavailable', { roomId });
    return false;
  }

  /**
   * зачем 2026-07-27 (владелец: «турнир попытка войти дала ошибку»): комната
   * рождалась ПУСТОЙ — state 'scheduled', rounds [], ready false. Наполняли её
   * кроны (tournamentFillBots + tournamentAdvanceRooms), каждый со своим тиком.
   * Игрок, нажавший «Играть» между созданием и тиком крона, получал
   * room_not_joinable: вход требует state === 'lobby'. Раз комнату создаёт сам
   * вход — она обязана быть сразу играбельной, иначе игрок платит за то, что
   * кроны не успели.
   *
   * Стоимость: та же одна атомарная транзакция (комната + секреты заданий), что и у
   * мгновенного турнира. Лишних документов заранее не появляется — комната
   * создаётся ТОЛЬКО когда в неё реально входят.
   */
  const taskMap = new Map(resources.tasks.map((task) => [task.taskId, task]));
  const selectedTasks = Array.from(new Set(rounds.flatMap((round) => round.taskIds)))
    .map((taskId) => taskMap.get(taskId))
    .filter((task): task is TournamentTask => !!task);

  const recentRef = recentBotRosterRef(db);
  const created = await db.runTransaction(async (tx): Promise<BotReservationPlan | null> => {
    const [existing, recentSnap] = await tx.getAll(roomRef, recentRef);
    if (existing.exists) return null;
    const taskPoolGeneration = await assertTournamentPoolCommitAllowed(
      tx, db, {
        generation: resources.taskPoolGeneration,
        revision: resources.taskPoolRevision,
      },
    );
    const botPlan = buildBotReservationPlan({
      profiles: resources.bots,
      roomId,
      count: TOURNAMENT_ROOM_SIZE - 1,
      gatherStartedAtMs: nowMs,
      recentBotIds: readRecentBotProfileIds(recentSnap.data()),
    });
    if (botPlan.players.length !== TOURNAMENT_ROOM_SIZE - 1) {
      throw new HttpsError('failed-precondition', 'not_enough_bots');
    }
    tx.create(roomRef, {
      economySnapshot,
      roomId,
      taskPoolGeneration,
      testMode: false,
      slotId,
      seed: roomId,
      // Комната сразу в лобби: вход открыт, старт по расписанию слота.
      state: 'lobby',
      startsAt,
      players: botPlan.players.map(publicTournamentPlayer),
      rounds,
      participantAuthUids: [],
      participantAuthUidsComplete: true,
      stateStartedAtMs: nowMs,
      stateDeadlineAtMs: botPlan.fillDeadlineAtMs,
      version: 0,
      createdAtMs: nowMs,
      expireAtMs: startsAt + TOURNAMENT_ROOM_TTL_MS,
      ticketsRequired: baseTicketsRequired,
      timezone,
      ready: true,
      readyAtMs: nowMs,
      gatherStartedAtMs: nowMs,
      shard,
      featureGates: tournamentFeatureGates(),
      expireAt: admin.firestore.Timestamp.fromMillis(startsAt + TOURNAMENT_ROOM_TTL_MS),
    });
    createTournamentTaskSecretsInTransaction(tx, roomRef, selectedTasks);
    tx.create(roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC),
      botPlan.metadata);
    tx.set(recentRef, recentBotRosterData(roomId, botPlan.selectedProfileIds, nowMs));
    return botPlan;
  });
  // Комната уже была (успел крон или соседний вызов) — она играбельна, входим.
  if (!created) return true;
  return true;
}

/**
 * Достраивает комнату, созданную кроном пустой, до играбельной.
 *
 * зачем 2026-07-27 (владелец: «турнир попытка войти дала ошибку»):
 * tournamentCreateRooms кладёт комнату как каркас — state 'scheduled',
 * rounds [], players [], ready false. Заданиями и ботами её наполняли ДРУГИЕ
 * кроны, каждый со своим тиком. Вход теперь не ждёт кронов (иначе игрок видел
 * ошибку на исправном расписании), поэтому наполнить комнату обязан он сам —
 * иначе игрок заплатит жемчужины и попадёт в турнир без вопросов.
 *
 * Стоимость: одно чтение комнаты на вход. Наполнение (чтение пула + запись)
 * происходит ТОЛЬКО если комната действительно пуста — то есть один раз на
 * комнату, а не на каждого входящего.
 */
async function ensureRoomPlayable(db: FirebaseFirestore.Firestore, roomId: string): Promise<void> {
  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  const snap = await roomRef.get();
  if (!snap.exists) return; // Нет комнаты — её создаст ветка шардов ниже.
  const data = snap.data() || {};
  const state = sanitizeString(data.state, 32);
  // Наполняем только каркас: идущий/готовый турнир не трогаем.
  if (state !== 'scheduled') return;
  if (data.ready === true && Array.isArray(data.rounds) && data.rounds.length === 4) return;

  const startsAt = readInt(data.startsAt, 0);
  const nowMs = Date.now();
  if (startsAt <= 0 || nowMs >= startsAt) return; // Вход всё равно закрыт по времени.

  const resources = await loadResourcePool(db);
  const curated = await loadCuratedForRoom(db, roomId, resources.tasks);
  const roomPool = curated ? [...resources.tasks, ...curated.extraTasks] : resources.tasks;
  const rounds = buildRounds(roomId, roomPool, curated?.rounds);
  if (!rounds) throw new HttpsError('failed-precondition', 'no_published_ai_tasks');
  if (resources.bots.length < TOURNAMENT_ROOM_SIZE - 1) {
    throw new HttpsError('failed-precondition', 'not_enough_bots');
  }

  const taskMap = new Map(roomPool.map((task) => [task.taskId, task]));
  const selectedTasks = Array.from(new Set(rounds.flatMap((round) => round.taskIds)))
    .map((taskId) => taskMap.get(taskId))
    .filter((task): task is TournamentTask => !!task);

  // Гонка двух одновременных входов безопасна: наполняем только пока комната
  // всё ещё пустой каркас — второй вызов увидит готовую и выйдет.
  const recentRef = recentBotRosterRef(db);
  const filled = await db.runTransaction(async (tx): Promise<BotReservationPlan | null> => {
    const [fresh, recentSnap] = await tx.getAll(roomRef, recentRef);
    if (!fresh.exists) return null;
    const current = fresh.data() || {};
    if (sanitizeString(current.state, 32) !== 'scheduled') return null;
    if (current.ready === true) return null;
    const currentPlayers = Array.isArray(current.players) ? current.players : [];
    const botPlan = buildBotReservationPlan({
      profiles: resources.bots,
      roomId,
      count: Math.max(0, TOURNAMENT_ROOM_SIZE - currentPlayers.length),
      gatherStartedAtMs: nowMs,
      recentBotIds: readRecentBotProfileIds(recentSnap.data()),
      colorOffset: currentPlayers.length,
    });
    if (botPlan.players.length !== Math.max(0, TOURNAMENT_ROOM_SIZE - currentPlayers.length)) {
      throw new HttpsError('failed-precondition', 'not_enough_bots');
    }
    const taskPoolGeneration = await assertTournamentPoolCommitAllowed(
      tx, db, {
        generation: resources.taskPoolGeneration,
        revision: resources.taskPoolRevision,
      },
    );
    tx.set(roomRef, {
      state: 'lobby',
      rounds,
      taskPoolGeneration,
      // Живые игроки, уже сидящие в каркасе, сохраняются — дописываем ботов.
      players: [
        ...currentPlayers,
        ...botPlan.players.map(publicTournamentPlayer),
      ],
      ready: true,
      readyAtMs: nowMs,
      gatherStartedAtMs: nowMs,
      stateStartedAtMs: nowMs,
      stateDeadlineAtMs: botPlan.fillDeadlineAtMs,
      updatedAt: nowMs,
    }, { merge: true });
    createTournamentTaskSecretsInTransaction(tx, roomRef, selectedTasks);
    tx.create(roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC),
      botPlan.metadata);
    tx.set(recentRef, recentBotRosterData(roomId, botPlan.selectedProfileIds, nowMs));
    return botPlan;
  });
  if (!filled) return;
}

export const tournamentJoin = onCall({ ...HOT_CALLABLE_OPTIONS, enforceAppCheck: false }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);
  const roomId = sanitizeString(request.data?.roomId, 160);
  if (!roomId) throw new HttpsError('invalid-argument', 'room_required');
  const joinIdentity = { authUid, stableUid, profileHint: request.data?.profile };

  // зачем 2026-07-27 (шардинг): комната вмещает 16 игроков. Раньше 17-й
  // получал room_full и не мог играть вовсе — при большой аудитории на слот
  // играли бы 16 человек, а остальные только смотрели. Теперь при полной
  // комнате садим игрока в следующую комнату того же слота, создавая её на
  // лету. Комнаты создаются ПО МЕРЕ НАДОБНОСТИ, а не пачкой заранее: пустые
  // документы стоили бы денег на каждом слоте каждый день.
  // зачем 2026-07-27: вход падал у владельца, а в логах не было НИ ОДНОГО кода
  // причины — только предупреждения App Check. Причину приходилось угадывать по
  // исходникам. Логируем отказ ровно один раз, с кодом: это одна строка лога на
  // неудачный вход (успешные молчат), зато поломка видна сразу.
  const logJoinFailure = (error: unknown, where: string): void => {
    const code = error instanceof Error ? error.message : String(error);
    console.warn(`[tournaments] join failed: ${code} (${where}, room=${roomId})`);
  };

  // зачем 2026-07-27: крон tournamentCreateRooms создаёт комнату ПУСТОЙ (rounds
  // [], ready false) — заданиями и ботами её наполняет уже другой крон. Вход
  // теперь пускает и в 'scheduled', поэтому пустая комната пустила бы игрока в
  // турнир без вопросов, СПИСАВ жемчужины. Достраиваем её до играбельной прямо
  // здесь: одна проверка на вход, наполнение — только если реально пусто.
  await ensureRoomPlayable(db, roomId).catch((error) => {
    logJoinFailure(error, 'prepare');
    throw error;
  });

  const parsed = parseTournamentRoomId(roomId);
  if (!parsed) {
    return tournamentJoinTransaction(db, { ...joinIdentity, roomId })
      .catch((error) => { logJoinFailure(error, 'direct'); throw error; });
  }

  let lastError: unknown = null;
  for (let shard = parsed.shard; shard < TOURNAMENT_MAX_SHARDS_PER_SLOT; shard += 1) {
    const shardRoomId = tournamentRoomId(parsed.slotId, parsed.timezone, parsed.dateKey, shard);
    try {
      return await tournamentJoinTransaction(db, { ...joinIdentity, roomId: shardRoomId });
    } catch (error) {
      const code = error instanceof HttpsError ? error.code : '';
      const message = error instanceof Error ? error.message : '';
      // Комната занята — пробуем следующую. Комнаты ещё нет — создаём её и
      // повторяем вход в неё же. Любая другая ошибка (нет жемчужин, бан,
      // отменённый турнир) обязана дойти до игрока как есть.
      const isFull = code === 'resource-exhausted' || message.includes('room_full');
      const isMissing = code === 'not-found' || message.includes('room_not_found');
      if (!isFull && !isMissing) { logJoinFailure(error, `shard${shard}`); throw error; }
      lastError = error;
      if (isMissing) {
        const created = await createTournamentShardRoom(db, {
          slotId: parsed.slotId,
          timezone: parsed.timezone,
          dateKey: parsed.dateKey,
          shard,
        });
        // Шард 0 отсутствует — значит слот не наступил/выключен, а не переполнен.
        if (!created) {
          console.warn(`[tournaments] join failed: room_create_refused (shard${shard}, room=${roomId})`);
          throw error;
        }
        return await tournamentJoinTransaction(db, { ...joinIdentity, roomId: shardRoomId })
          .catch((joinError) => { logJoinFailure(joinError, `shard${shard}_created`); throw joinError; });
      }
    }
  }
  throw lastError instanceof HttpsError
    ? lastError
    : new HttpsError('resource-exhausted', 'all_shards_full');
});

export const tournamentLeave = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const roomId = sanitizeString(request.data?.roomId, 160);
  if (!roomId) throw new HttpsError('invalid-argument', 'room_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);
  return tournamentLeaveTransaction(db, { authUid, stableUid, roomId });
});

export const tournamentForfeit = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const roomId = sanitizeString(request.data?.roomId, 160);
  if (!roomId) throw new HttpsError('invalid-argument', 'room_required');
  if (request.data?.confirmForfeit !== true) {
    throw new HttpsError('failed-precondition', 'forfeit_confirmation_required');
  }
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);
  return tournamentForfeitTransaction(db, {
    authUid, stableUid, roomId, confirmed: true,
  });
});

// ── Cancellation: transaction marker + per-player receipts make refunds exact-once. ─

function hasRunnableRoomResources(room: TournamentRoomDoc): boolean {
  return room.ready === true
    && room.rounds.length === 4
    && room.rounds.every((round) => round.taskIds.length > 0);
}

function cancellationTaskSecretRefs(
  roomRef: FirebaseFirestore.DocumentReference,
  room: TournamentRoomDoc,
  discoveredRefs: FirebaseFirestore.DocumentReference[] = [],
): FirebaseFirestore.DocumentReference[] {
  const taskIds = Array.from(new Set([
    ...room.rounds.flatMap((round) => round.taskIds).filter(Boolean),
    ...discoveredRefs.map((ref) => ref.id),
  ]));
  const authoredTaskIds = taskIds.filter((taskId) => taskId !== BOT_SIMULATION_METADATA_DOC);
  if (authoredTaskIds.length > TOURNAMENT_TASK_LIMITS.maxTaskSecrets) {
    throw new HttpsError('failed-precondition', 'task_secret_cleanup_bounds_exceeded');
  }
  return taskIds.map((taskId) => roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(taskId));
}

async function cancelRoomInTransaction(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  roomRef: FirebaseFirestore.DocumentReference,
  room: TournamentRoomDoc,
  reason: string,
  nowMs: number,
  discoveredSecretRefs: FirebaseFirestore.DocumentReference[] = [],
): Promise<boolean> {
  const taskSecretRefs = cancellationTaskSecretRefs(roomRef, room, discoveredSecretRefs);
  if (room.state === TOURNAMENT_STATE_CANCELLED || room.cancellationReceiptId) {
    for (const taskSecretRef of taskSecretRefs) tx.delete(taskSecretRef);
    return true;
  }
  if (room.players.filter((player) => !player.isBot).length >= TOURNAMENT_MIN_REAL_PLAYERS
    && reason === 'not_enough_players') return false;
  if (reason === 'resources_unavailable' && room.state === 'lobby' && hasRunnableRoomResources(room)) return false;
  let plan;
  try {
    const allowActive = reason === 'legacy_gameplay_unverifiable' || reason === 'resources_unavailable';
    plan = planTournamentCancellation(room, reason, nowMs, {
      allowActive,
      fallbackTickets: room.ticketsRequired ?? 1,
    });
  } catch {
    return false;
  }
  const refs = plan.refunds.flatMap((refund) => {
    const userRef = db.collection('users').doc(refund.playerId);
    return [
      userRef,
      userRef.collection('inventory').doc('tickets'),
      userRef.collection(TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`cancel_${room.roomId}`),
    ];
  });
  const snapshots = refs.length > 0 ? await tx.getAll(...refs) : [];
  const byPath = new Map(snapshots.map((snapshot) => [snapshot.ref.path, snapshot]));

  for (const refund of plan.refunds) {
    const userRef = db.collection('users').doc(refund.playerId);
    const ticketsRef = userRef.collection('inventory').doc('tickets');
    const receiptRef = userRef.collection(TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`cancel_${room.roomId}`);
    if (byPath.get(receiptRef.path)?.exists) continue;
    if (refund.tickets > 0) {
      tx.set(ticketsRef, { count: admin.firestore.FieldValue.increment(refund.tickets), updatedAt: nowMs }, { merge: true });
    }
    const userData = byPath.get(userRef.path)?.data() || {};
    const creditGems = cancellationCreditGems(refund);
    const userPatch: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {};
    if (creditGems > 0) {
      userPatch.shards = admin.firestore.FieldValue.increment(creditGems);
      userPatch.shards_updated_at_ms = nowMs;
      userPatch.shards_updated_op = 'earn';
      userPatch.shards_updated_reason = 'tournament_cancel_refund';
      userPatch.updatedAt = nowMs;
    }
    if (refund.restoreFreeWeek && userData.tournament_free_week === refund.restoreFreeWeek) {
      userPatch.tournament_free_week = admin.firestore.FieldValue.delete();
      userPatch.updatedAt = nowMs;
    }
    if (Object.keys(userPatch).length > 0) {
      tx.set(userRef, userPatch, { merge: true });
    }
    if (creditGems > 0) {
      tx.set(userRef.collection('shard_log').doc(`tournament_cancel_${room.roomId}`), {
        ts: new Date(nowMs).toISOString(),
        type: 'earn',
        amount: creditGems,
        reason: 'tournament_cancel_refund',
        roomId: room.roomId,
      });
    }
    tx.create(receiptRef, {
      kind: 'tournament_cancel',
      uid: refund.playerId,
      roomId: room.roomId,
      ticketsRefunded: refund.tickets,
      freeWeekRestored: refund.restoreFreeWeek,
      bankContributionRefunded: refund.bankContributionGems,
      compensationGems: refund.compensationGems,
      creditedGems: creditGems,
      createdAtMs: nowMs,
    });
  }
  for (const taskSecretRef of taskSecretRefs) tx.delete(taskSecretRef);
  tx.set(roomRef, {
    state: plan.room.state,
    players: plan.room.players.map(publicTournamentPlayer),
    cancelReason: plan.room.cancelReason,
    cancelledAtMs: plan.room.cancelledAtMs,
    cancellationReceiptId: plan.room.cancellationReceiptId,
    stateStartedAtMs: plan.room.stateStartedAtMs,
    stateDeadlineAtMs: admin.firestore.FieldValue.delete(),
    lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
    version: plan.room.version,
    expireAt: admin.firestore.Timestamp.fromMillis(nowMs + TOURNAMENT_ROOM_TTL_MS),
    updatedAt: nowMs,
  }, { merge: true });
  return true;
}

export async function tournamentCancelTransaction(
  db: FirebaseFirestore.Firestore,
  roomTarget: FirebaseFirestore.DocumentReference | string,
  reason: string,
  requestedNowMs?: number,
  expected?: { state: string; version: number },
): Promise<boolean> {
  const roomRef = typeof roomTarget === 'string'
    ? db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomTarget)
    : roomTarget;
  const secretSnap = await roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
    .limit(TOURNAMENT_TASK_LIMITS.maxTaskSecrets + 2).get();
  const authoredSecretCount = secretSnap.docs
    .filter((doc) => doc.id !== BOT_SIMULATION_METADATA_DOC).length;
  if (authoredSecretCount > TOURNAMENT_TASK_LIMITS.maxTaskSecrets) {
    throw new HttpsError('failed-precondition', 'task_secret_cleanup_bounds_exceeded');
  }
  // FILL_CANCEL_TRANSACTION_GUARD: join/fill/cancel all conflict on the same room document.
  return db.runTransaction(async (tx) => {
    const [roomSnap, botMetadataSnap] = await tx.getAll(
      roomRef, roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC),
    );
    if (!roomSnap.exists) return false;
    const publicRoom = readRoom(roomSnap);
    // Cancellation is idempotent after private secrets have been deleted.
    // Do not require already-consumed bot metadata for a terminal no-op.
    if (publicRoom.state === TOURNAMENT_STATE_CANCELLED) return true;
    const room = hydratePrivateBotMetadata(publicRoom, botMetadataSnap.data());
    if (expected && (room.state !== expected.state || room.version !== expected.version)) return false;
    return cancelRoomInTransaction(db, tx, roomRef, room, reason, requestedNowMs ?? Date.now(),
      secretSnap.docs.map((doc) => doc.ref));
  });
}

// ── Fill: resources are validated before the transaction; room mutation remains atomic. ─

type TournamentFillOutcome = 'filled' | 'cancelled_players' | 'cancelled_resources' | 'skip';

type TournamentFillDependencies = {
  nowMs?: () => number;
  beforeWrites?: () => void;
};

export async function tournamentFillRoomTransaction(
  db: FirebaseFirestore.Firestore,
  roomRef: FirebaseFirestore.DocumentReference,
  resources: TournamentResourcePool & { curatedRounds?: Map<number, string[]> },
  dependencies: TournamentFillDependencies = {},
): Promise<TournamentFillOutcome> {
  const clock = dependencies.nowMs ?? Date.now;
  // FILL_CANCEL_TRANSACTION_GUARD
  return db.runTransaction(async (tx) => {
    const recentRef = recentBotRosterRef(db);
    const [snap, recentSnap] = await tx.getAll(roomRef, recentRef);
    if (!snap.exists) return 'skip';
    const room = readRoom(snap);
    if (room.state !== 'scheduled' && room.state !== 'lobby') return 'skip';
    if (snap.data()?.ready === true) return 'filled';
    if (room.state === 'scheduled' && !room.stateDeadlineAtMs) return 'skip';
    const nowMs = clock();

    const realCount = room.players.filter((player) => !player.isBot).length;

    // зачем 2026-07-27 (владелец: «НИКАКОГО турнир отменяют, это невозможно,
    // боты ВСЕГДА добивают»): раньше комната без живых отменялась за 30 секунд
    // до старта (not_enough_players) — игрок мог получить отмену вместо игры.
    // Отмены по нехватке людей больше нет.
    //
    // зачем без исключения для дев-комнаты (владелец: «поведение дев с ботами
    // должно быть такое как обычная игра в плане добора ботами, иначе как я
    // проверю»): дев идёт по ТОМУ ЖЕ пути — 30 секунд ожидания, затем добор.
    // Отличие дев-комнаты только одно: она создаётся сразу и не ждёт слота.
    //
    // Добор запускает первый зашедший живой: отсчёт идёт от его входа, а не от
    // времени слота — поэтому ожидание одинаково, когда бы игрок ни зашёл.
    if (realCount < 1) return 'skip';

    // Момент, от которого считаются обе фазы (30с ожидания + 45с добора).
    // gatherStartedAtMs проставляет вход первого живого; у старых комнат поля
    // нет — откатываемся на «сейчас», чтобы они не залипли навсегда.
    const gatherStartedAtMs = readInt(snap.data()?.gatherStartedAtMs, 0) || nowMs;
    // Окно ожидания ещё идёт — не добираем раньше срока, пусть заходят живые.
    if (nowMs < gatherStartedAtMs + TOURNAMENT_ROOM_GATHER_MS) return 'skip';
    const rounds = buildRounds(room.roomId, resources.tasks, resources.curatedRounds);
    const needed = TOURNAMENT_ROOM_SIZE - room.players.length;
    const picked = selectTournamentBotProfiles({
      profiles: resources.bots,
      count: Math.max(0, needed),
      seed: room.roomId,
      recentBotIds: readRecentBotProfileIds(recentSnap.data()),
    });
    const taskMap = new Map(resources.tasks.map((task) => [task.taskId, task]));
    const selectedTasks = rounds
      ? Array.from(new Set(rounds.flatMap((round) => round.taskIds))).map((taskId) => taskMap.get(taskId))
      : [];
    // зачем 2026-07-27 (владелец): боты больше не появляются пачкой. Времена
    // входа считаются детерминированно из seed комнаты — запись по-прежнему
    // одна (Firestore-экономия), но клиент показывает бота только когда его
    // joinAtMs наступил, поэтому лобби наполняется постепенно.
    const botJoinTimes = planBotJoinTimes({
      seed: room.roomId,
      botCount: picked.length,
      fromMs: gatherStartedAtMs,
      startsAtMs: gatherStartedAtMs + TOURNAMENT_ROOM_GATHER_MS + TOURNAMENT_BOT_FILL_WINDOW_MS,
    });
    // зачем 2026-07-27 (владелец: «когда в комнате 16 начинается отсчёт»):
    // после добора комната ПОЛНАЯ, ждать больше нечего — дедлайн равен моменту
    // посадки последнего бота. Раньше здесь стояло время
    // слота: комната набиралась за полторы минуты, все 16 были на месте, а
    // таймер стоял на нулях — это и есть «все на месте, ничего не начинается».
    const lastBotAtMs = botJoinTimes.length > 0 ? Math.max(...botJoinTimes) : nowMs;
    const fillDeadlineAtMs = Math.max(nowMs, lastBotAtMs);

    const botPlayers: TournamentPlayer[] = picked.map((bot, index) => ({
      id: `p_${tournamentHash32(`${room.roomId}:${bot.botId}`).toString(36)}`,
      isBot: true,
      name: bot.name,
      avatar: bot.avatarEmoji,
      ...(bot.avatarAura ? { aura: bot.avatarAura } : {}),
      color: bot.color || PLAYER_COLORS[(room.players.length + index) % PLAYER_COLORS.length],
      score: 0,
      streak: 0,
      botWinRate: bot.winRate,
      joinAtMs: botJoinTimes[index] ?? nowMs,
    }));
    const frozenEconomy = tournamentEconomySnapshotForMode(
      room.economySnapshot,
      isTournamentTestRoom(room),
    );
    // Legacy rooms without an immutable snapshot are never allowed to mint a
    // newly inferred bot contribution from today's mutable defaults.
    const botEntryGems = room.economySnapshot ? frozenEconomy.botEntryGems : 0;
    const startingPotGems = Math.max(0, readGemBalance(snap.data()?.potGems));
    const lobbyEvents = botArrivalPotEvents(botPlayers, startingPotGems, botEntryGems);
    const fundedPotGems = lobbyEvents.at(-1)?.potGemsAfter ?? startingPotGems;
    const privateBotMetadata = {
      kind: 'bot_simulation_v1',
      expectedBotCount: botPlayers.length,
      bots: botPlayers.map((player, index) => ({
        playerId: player.id,
        profileId: picked[index].botId,
        winRate: player.botWinRate,
      })),
    };
    const completeTasks = selectedTasks.filter((task): task is TournamentTask => !!task);
    const filledPlayers = [...room.players, ...botPlayers];
    const activationRound = rounds?.find((round) => round.roundNo === 1);
    const activationTasks = activationRound
      ? activationRound.taskIds.map((taskId) => taskMap.get(taskId)).filter((task): task is TournamentTask => !!task)
      : [];
    // Future bot rows are reservations, not present players. Start here only
    // when a delayed fill observes that every authored joinAtMs has elapsed;
    // otherwise the lobby deadline remains the deterministic transition point.
    const startsRoundImmediately = room.state === 'lobby'
      && filledPlayers.length === TOURNAMENT_ROOM_SIZE
      && tournamentPlayersHaveArrived(filledPlayers, nowMs)
      && activationRound !== undefined
      && activationTasks.length === activationRound.taskIds.length;
    const activationTiming = startsRoundImmediately
      ? tournamentRoundTimingWindow(activationTasks, nowMs)
      : undefined;
    const persistedRounds = startsRoundImmediately
      ? roundsWithActivatedPublicTasks(rounds!, 1, activationTasks, nowMs, room.roomId)
      : rounds;
    const fillValidation = rounds && picked.length === Math.max(0, needed)
      && completeTasks.length === selectedTasks.length
      ? validateTournamentFillMutation({
        room,
        rounds: persistedRounds!,
        selectedTasks: completeTasks,
        botPlayers,
        privateBotMetadata,
        metadata: {
          ready: true,
          readyAtMs: nowMs,
          potGems: fundedPotGems,
          lobbyEvents,
          stateDeadlineAtMs: activationTiming?.stateDeadlineAtMs ?? fillDeadlineAtMs,
          version: room.version + 1,
          updatedAt: nowMs,
        },
      })
      : { ok: false as const, reason: 'fill_tasks_invalid' as const, serializedBytes: 0 };
    if (!fillValidation.ok) {
      dependencies.beforeWrites?.();
      const cancelled = await cancelRoomInTransaction(db, tx, roomRef, room, 'resources_unavailable', nowMs);
      return cancelled ? 'cancelled_resources' : 'skip';
    }
    const taskPoolGeneration = await assertTournamentPoolCommitAllowed(
      tx, db, {
        generation: resources.taskPoolGeneration,
        revision: resources.taskPoolRevision,
      },
    );
    dependencies.beforeWrites?.();
    tx.set(roomRef, {
      players: filledPlayers.map(publicTournamentPlayer),
      rounds: persistedRounds,
      taskPoolGeneration,
      ...(startsRoundImmediately ? {
        state: 'round1',
        stateStartedAtMs: nowMs,
        introEndsAtMs: activationTiming!.introEndsAtMs,
      } : {}),
      ready: true,
      readyAtMs: nowMs,
      potGems: fundedPotGems,
      lobbyEvents,
      stateDeadlineAtMs: activationTiming?.stateDeadlineAtMs ?? fillDeadlineAtMs,
      lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
      version: room.version + 1,
      updatedAt: nowMs,
    }, { merge: true });
    for (const task of completeTasks) {
      const secretRef = roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(task.taskId);
      tx.create(secretRef, task);
    }
    tx.create(roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC),
      privateBotMetadata);
    tx.set(recentRef, recentBotRosterData(room.roomId, picked.map((profile) => profile.botId), nowMs));
    return 'filled';
  });
}

type TournamentFillProcessorOptions = {
  db: FirebaseFirestore.Firestore;
  nowMs?: number;
  limit?: number;
  resources?: TournamentResourcePool;
  fillRoom?: typeof tournamentFillRoomTransaction;
};

export async function processTournamentFillRooms(
  options: TournamentFillProcessorOptions,
): Promise<{ scanned: number; filled: number; failed: number }> {
  const { db } = options;
  const nowMs = options.nowMs ?? Date.now();
  const limit = Math.max(1, Math.min(ROOM_SCAN_LIMIT, Math.trunc(options.limit ?? ROOM_SCAN_LIMIT)));
  const resources = options.resources ?? await loadResourcePool(db);
  const fillRoom = options.fillRoom ?? tournamentFillRoomTransaction;
  let scanned = 0;
  let filled = 0;
  let failed = 0;
  const cursorRef = db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc(FILL_CURSOR_DOC);
  const persistedCursor = await cursorRef.get();
  const persistedStartsAt = readInt(persistedCursor.data()?.startsAt, 0);
  const persistedRoomId = sanitizeString(persistedCursor.data()?.roomId, 200);
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let exhausted = false;
  for (let page = 0; page < MAX_PROCESSOR_PAGES; page += 1) {
    let query = db.collection(TOURNAMENT_ROOMS_COLLECTION)
      .where('state', 'in', ['scheduled', 'lobby'])
      .where('startsAt', '<=', nowMs + TOURNAMENT_FILL_BOTS_AHEAD_MS)
      .orderBy('startsAt', 'asc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'asc')
      .limit(limit);
    if (cursor) query = query.startAfter(cursor);
    else if (persistedStartsAt > 0 && persistedRoomId) {
      query = query.startAfter(persistedStartsAt, persistedRoomId);
    }
    const rooms = await query.get();
    scanned += rooms.size;
    for (const doc of rooms.docs) {
      try {
        // Кураторский набор комнаты (если владелец собрал его в админке) имеет
        // приоритет над случайной выборкой. 1 чтение на комнату в окне фила.
        const curated = await loadCuratedForRoom(db, doc.id, resources.tasks);
        const roomResources = curated
          ? { ...resources, tasks: [...resources.tasks, ...curated.extraTasks], curatedRounds: curated.rounds }
          : resources;
        if (await fillRoom(db, doc.ref, roomResources) === 'filled') filled += 1;
      } catch (error) {
        failed += 1;
        console.error('[tournaments] room fill failed', { roomId: doc.id, error });
      }
    }
    if (rooms.size < limit) {
      exhausted = true;
      break;
    }
    cursor = rooms.docs[rooms.docs.length - 1];
  }
  if (exhausted) {
    if (persistedCursor.exists) await cursorRef.delete();
  } else if (cursor) {
    await cursorRef.set({
      startsAt: readInt(cursor.data().startsAt, 0),
      roomId: cursor.id,
      updatedAt: nowMs,
    });
  }
  return { scanned, filled, failed };
}

export const tournamentFillBots = onSchedule(
  { schedule: '* * * * *', timeZone: 'UTC', region: 'europe-west1', maxInstances: 1 },
  async () => {
    const db = admin.firestore();
    await processTournamentFillRooms({ db, nowMs: Date.now() });
  },
);

// ── Submit: the transaction recomputes from its fresh room snapshot. ───────────

function parseTournamentSubmissionIdempotencyKey(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^[A-Za-z0-9:_-]{8,160}$/.test(value)) {
    throw new HttpsError('invalid-argument', 'submission_idempotency_key_invalid');
  }
  return value;
}

function tournamentSubmissionIdempotencyKeyHash(key: string | undefined): string | undefined {
  return key ? createHash('sha256').update(key).digest('hex') : undefined;
}

export async function tournamentSpeedMatchAttemptTransaction(
  db: FirebaseFirestore.Firestore,
  input: {
    authUid: string; stableUid: string; roomId: string; roundNo: number;
    taskId: string; pairIndex: number; selectedIndex: number; receivedAtMs?: number;
  },
): Promise<Row> {
  const receivedAtMs = input.receivedAtMs ?? Date.now();
  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(input.roomId);
  const taskRef = roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(input.taskId);
  const progressRef = roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
    .doc(speedMatchAttemptDocId(input.roundNo, input.taskId, input.stableUid));
  const authLinkRef = db.collection('auth_links').doc(input.authUid);
  const userRef = db.collection('users').doc(input.stableUid);
  const bannedRef = db.collection('banned_users').doc(input.stableUid);

  return db.runTransaction(async (tx) => {
    const [roomSnap, taskSnap, progressSnap, authLinkSnap, userSnap, bannedSnap] = await tx.getAll(
      roomRef, taskRef, progressRef, authLinkRef, userRef, bannedRef,
    );
    if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
    assertTransactionalTournamentAccess(
      input.authUid, input.stableUid, authLinkSnap, userSnap, bannedSnap,
    );
    const room = readRoom(roomSnap);
    const activeState = roundStateFor(input.roundNo);
    const round = room.rounds.find((candidate) => candidate.roundNo === input.roundNo);
    const timedOutResult = round?.results?.[input.stableUid];
    const replacingTimedOut = timedOutResult?.submissionStatus === 'timed_out' || timedOutResult?.timedOut === true;
    const withinFollowingState = !!activeState && replacingTimedOut
      && room.state === stateAfterTournamentDeadline(activeState);
    if (!activeState || (room.state !== activeState && !withinFollowingState)
      || !round?.taskIds.includes(input.taskId)) {
      throw new HttpsError('failed-precondition', 'round_not_active');
    }
    try {
      const scheduleEnforced = assertTournamentAnswersWithinTaskSchedule(round, [input.taskId], receivedAtMs);
      if (!scheduleEnforced && room.stateDeadlineAtMs && receivedAtMs > room.stateDeadlineAtMs) {
        throw new Error('round_deadline_elapsed');
      }
    } catch (error) {
      throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'task_deadline_elapsed');
    }
    if (!room.players.some((player) => !player.isBot && player.id === input.stableUid)) {
      throw new HttpsError('permission-denied', 'not_in_room');
    }
    const task = parseTask(taskSnap);
    if (!task || task.mode !== 'speed_match') {
      throw new HttpsError('failed-precondition', 'speed_match_task_unavailable');
    }
    let outcome;
    try {
      outcome = applySpeedMatchAttempt(
        task, readSpeedMatchProgress(progressSnap.data()), input.pairIndex, input.selectedIndex,
      );
    } catch {
      throw new HttpsError('invalid-argument', 'speed_match_attempt_invalid');
    }
    tx.set(progressRef, {
      kind: 'speed_match_attempt_v1', taskId: input.taskId, playerId: input.stableUid,
      roundNo: input.roundNo, ...outcome.progress, updatedAtMs: receivedAtMs,
    });
    return {
      ok: true, correct: outcome.correct, completed: outcome.completed,
      wrongAttempts: outcome.progress.wrongAttempts,
    };
  });
}

export async function tournamentSubmitTaskAnswerTransaction(
  db: FirebaseFirestore.Firestore,
  input: {
    authUid?: string;
    stableUid: string;
    roomId: string;
    roundNo: number;
    taskId: string;
    answer: unknown;
    idempotencyKey: string;
    receivedAtMs?: number;
  },
): Promise<Row> {
  const receivedAtMs = input.receivedAtMs ?? Date.now();
  const idempotencyKey = parseTournamentSubmissionIdempotencyKey(input.idempotencyKey);
  if (!idempotencyKey) throw new HttpsError('invalid-argument', 'submission_idempotency_key_required');
  const idempotencyKeyHash = tournamentSubmissionIdempotencyKeyHash(idempotencyKey)!;
  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(input.roomId);

  return db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
    const room = readRoom(roomSnap);
    const round = room.rounds.find((candidate) => candidate.roundNo === input.roundNo);
    if (!round || !round.taskIds.includes(input.taskId)) {
      throw new HttpsError('failed-precondition', 'round_not_active');
    }
    const realPlayerIds = room.players.filter((player) => !player.isBot).map((player) => player.id);
    const secretRefs = round.taskIds.map((taskId) => roomRef
      .collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(taskId));
    const attemptRefs = round.taskIds.map((taskId) => roomRef
      .collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
      .doc(speedMatchAttemptDocId(input.roundNo, taskId, input.stableUid)));
    const receiptDescriptors = tournamentReceiptRefsForRound(roomRef, round, realPlayerIds);
    const accessRefs = input.authUid ? [
      db.collection('auth_links').doc(input.authUid),
      db.collection('users').doc(input.stableUid),
      db.collection('banned_users').doc(input.stableUid),
    ] : [];
    const snapshots = await tx.getAll(
      ...secretRefs, ...attemptRefs, ...receiptDescriptors.map((entry) => entry.ref), ...accessRefs,
    );
    const attemptOffset = secretRefs.length;
    const receiptOffset = attemptOffset + attemptRefs.length;
    const accessOffset = receiptOffset + receiptDescriptors.length;
    if (input.authUid) {
      assertTransactionalTournamentAccess(
        input.authUid, input.stableUid,
        snapshots[accessOffset], snapshots[accessOffset + 1], snapshots[accessOffset + 2],
      );
    }
    const tasks = snapshots.slice(0, secretRefs.length).map(parseTask);
    if (tasks.some((task) => !task)) throw new HttpsError('failed-precondition', 'round_tasks_unavailable');
    const parsedReceipts = receiptDescriptors.flatMap((descriptor, index) => {
      const receipt = readTournamentTaskAnswerReceipt(snapshots[receiptOffset + index].data(), {
        roundNo: input.roundNo, taskId: descriptor.taskId, playerId: descriptor.playerId,
      });
      return receipt ? [receipt] : [];
    });
    const existing = parsedReceipts.find((receipt) => (
      receipt.playerId === input.stableUid && receipt.taskId === input.taskId
    ));
    if (existing && existing.idempotencyKeyHash !== idempotencyKeyHash) {
      throw new HttpsError('already-exists', 'task_answer_idempotency_key_mismatch');
    }
    const activeState = roundStateFor(input.roundNo);
    const existingResult = round.results?.[input.stableUid];
    const replacingTimedOut = existingResult?.submissionStatus === 'timed_out'
      || existingResult?.timedOut === true;
    const withinFollowingState = !!activeState && (replacingTimedOut || !!existing)
      && room.state === stateAfterTournamentDeadline(activeState);
    if (!activeState || (room.state !== activeState && !withinFollowingState)) {
      throw new HttpsError('failed-precondition', 'round_not_active');
    }
    if (!existing) {
      try {
        const scheduleEnforced = assertTournamentAnswersWithinTaskSchedule(
          round, [input.taskId], receivedAtMs,
        );
        if (!scheduleEnforced && room.stateDeadlineAtMs && receivedAtMs > room.stateDeadlineAtMs) {
          throw new Error('round_deadline_elapsed');
        }
      } catch (error) {
        throw new HttpsError(
          'failed-precondition', error instanceof Error ? error.message : 'task_deadline_elapsed',
        );
      }
    }
    if (!room.players.some((player) => !player.isBot && player.id === input.stableUid)) {
      throw new HttpsError('permission-denied', 'not_in_room');
    }
    const taskIndex = round.taskIds.indexOf(input.taskId);
    const task = tasks[taskIndex] as TournamentTask;
    const progress = readSpeedMatchProgress(snapshots[attemptOffset + taskIndex].data());
    const answer = existing?.answer ?? (task.mode === 'speed_match'
      ? { selectedIndexes: progress?.matchedIndexes ?? [] }
      : input.answer);
    const correct = existing?.correct ?? verifyTournamentAnswer(task, answer);
    const currentReceipt: TournamentTaskAnswerReceipt = existing ?? {
      roundNo: input.roundNo,
      taskId: input.taskId,
      playerId: input.stableUid,
      receivedAtMs,
      idempotencyKeyHash,
      answer,
      correct,
    };
    const allReceipts = existing ? parsedReceipts : [...parsedReceipts, currentReceipt];
    const timelyPlayerReceipts = allReceipts.filter((receipt) => (
      receipt.playerId === input.stableUid
      && tournamentReceiptIsTimely(round, receipt, room.stateDeadlineAtMs)
    ));
    const receiptByTask = new Map(timelyPlayerReceipts.map((receipt) => [receipt.taskId, receipt]));
    const hasCompleteReceiptSet = round.taskIds.every((taskId) => receiptByTask.has(taskId));

    if (!existing) {
      tx.create(receiptDescriptors.find((entry) => (
        entry.playerId === input.stableUid && entry.taskId === input.taskId
      ))!.ref, {
        kind: 'tournament_task_answer_v1',
        roundNo: input.roundNo,
        taskId: input.taskId,
        playerId: input.stableUid,
        receivedAtMs,
        idempotencyKeyHash,
        answer,
        correct,
      });
    }
    if (hasCompleteReceiptSet) {
      const speedMatchProgress: Record<string, SpeedMatchAttemptProgress> = {};
      round.taskIds.forEach((taskId, index) => {
        const taskProgress = readSpeedMatchProgress(snapshots[attemptOffset + index].data());
        if (taskProgress) speedMatchProgress[taskId] = taskProgress;
      });
      const taskReceivedAtMs = Object.fromEntries(
        round.taskIds.map((taskId) => [taskId, receiptByTask.get(taskId)!.receivedAtMs]),
      );
      const finalizedAtMs = Math.max(...Object.values(taskReceivedAtMs));
      const answerRanksByPlayer = canonicalTournamentReceiptRanks(
        round, tasks as TournamentTask[], realPlayerIds, allReceipts, room.stateDeadlineAtMs,
      );
      let applied;
      try {
        applied = applyTournamentSubmission(room, {
          playerId: input.stableUid,
          roundNo: input.roundNo,
          answers: round.taskIds.map((taskId) => ({
            taskId, answer: receiptByTask.get(taskId)!.answer,
          })),
          tasks: tasks as TournamentTask[],
          receivedAtMs: finalizedAtMs,
          taskReceivedAtMs,
          maxMsPerTask: Math.max(1, Math.ceil(
            tournamentRoundDurationMs(tasks as TournamentTask[]) / Math.max(1, tasks.length),
          )),
          speedMatchProgress,
          answerRanksByPlayer,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'submission_rejected';
        throw new HttpsError(message === 'not_in_room' ? 'permission-denied' : 'failed-precondition', message);
      }
      if (!applied.replay) {
        const earlyAdvanceDeadlineAtMs = applied.allRealSubmitted && room.state === activeState
          ? Math.min(
            room.stateDeadlineAtMs ?? Number.MAX_SAFE_INTEGER,
            finalizedAtMs + TOURNAMENT_EARLY_ADVANCE_DELAY_MS,
          )
          : undefined;
        tx.set(roomRef, {
          players: applied.room.players.map(publicTournamentPlayer),
          rounds: publicTournamentRounds(applied.room.rounds),
          ...(earlyAdvanceDeadlineAtMs !== undefined
            ? { stateDeadlineAtMs: earlyAdvanceDeadlineAtMs }
            : {}),
          version: applied.room.version,
          updatedAt: receivedAtMs,
        }, { merge: true });
      }
    }
    const answerRanksByPlayer = canonicalTournamentReceiptRanks(
      round, tasks as TournamentTask[], realPlayerIds, allReceipts, room.stateDeadlineAtMs,
    );
    const answerRank = answerRanksByPlayer[input.stableUid]?.[input.taskId];
    const penaltyStars = task.mode === 'speed_match' ? progress?.wrongAttempts ?? 0 : 0;
    const timing = round.taskSchedule?.find((entry) => entry.taskId === input.taskId);
    const earnedStars = scoreAnswer({
      correct: currentReceipt.correct,
      elapsedMs: Math.max(0, currentReceipt.receivedAtMs - (timing?.readingEndsAtMs ?? timing?.startsAtMs ?? currentReceipt.receivedAtMs)),
      maxMs: Math.max(1, (timing?.answerDeadlineAtMs ?? timing?.deadlineAtMs ?? currentReceipt.receivedAtMs)
        - (timing?.readingEndsAtMs ?? timing?.startsAtMs ?? currentReceipt.receivedAtMs)),
      streakBefore: 0,
      isVoice: task.isVoice === true,
      answerRank,
      penaltyStars,
    });
    const selectedIndex = answer && typeof answer === 'object'
      ? readInt((answer as Row).selectedIndex, -1)
      : -1;
    const selectedTrapReason = !currentReceipt.correct && selectedIndex >= 0
      ? sanitizeString(task.explanation?.wrongOptionReasons?.[selectedIndex], 600)
      : '';
    const explanation = task.explanation ? {
      ruleNote: sanitizeString(task.explanation.ruleNote, 600),
      example: sanitizeString(task.explanation.example, 600),
    } : null;
    const correctIndex = Number.isInteger((task.payload as Row).correctIndex)
      ? Number((task.payload as Row).correctIndex)
      : undefined;
    return {
      ok: true,
      replay: !!existing,
      taskId: input.taskId,
      acceptedAtMs: currentReceipt.receivedAtMs,
      correct: currentReceipt.correct,
      earnedStars,
      zeroScoreReason: earnedStars > 0
        ? null
        : (currentReceipt.correct && penaltyStars > 0 ? 'speed_match_penalty' : 'incorrect_answer'),
      explanation,
      ...(selectedTrapReason ? { selectedTrapReason } : {}),
      ...(correctIndex === undefined ? {} : { correctIndex }),
    };
  });
}

export async function tournamentSubmitTransaction(
  db: FirebaseFirestore.Firestore,
  input: {
    authUid?: string; stableUid: string; roomId: string; roundNo: number; rawAnswers: Row[];
    idempotencyKey?: string; receivedAtMs?: number;
  },
): Promise<Row> {
  const { stableUid, roomId, roundNo, rawAnswers } = input;
  const receivedAtMs = input.receivedAtMs ?? Date.now();
  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  const initial = await roomRef.get();
  if (!initial.exists) throw new HttpsError('not-found', 'room_not_found');
  const initialRoom = readRoom(initial);
  const initialRound = initialRoom.rounds.find((round) => round.roundNo === roundNo);
  if (!initialRound) throw new HttpsError('not-found', 'round_not_found');
  // Compatibility marker for the former loadTasksByIds(db, initialRound.taskIds, roomId) contract:
  // the same immutable refs are now read authoritatively by tx.getAll below.
  const submittedAnswers = rawAnswers.slice(0, initialRound.taskIds.length).map((answer) => ({
    taskId: sanitizeString(answer.taskId, 160),
    answer: answer.answer,
  })).filter((answer) => !!answer.taskId);
  const idempotencyKey = parseTournamentSubmissionIdempotencyKey(input.idempotencyKey);
  const idempotencyKeyHash = tournamentSubmissionIdempotencyKeyHash(idempotencyKey);

  // SUBMIT_TRANSACTION_GUARD: concurrent submitters conflict/retry on roomRef.
  return db.runTransaction(async (tx) => {
    const secretRefs = initialRound.taskIds.map((taskId) => roomRef
      .collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(taskId));
    const attemptRefs = initialRound.taskIds.map((taskId) => roomRef
      .collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
      .doc(speedMatchAttemptDocId(roundNo, taskId, stableUid)));
    const initialRealPlayerIds = initialRoom.players.filter((player) => !player.isBot).map((player) => player.id);
    const receiptDescriptors = tournamentReceiptRefsForRound(
      roomRef, initialRound, initialRealPlayerIds,
    );
    const accessRefs = input.authUid ? [
      db.collection('auth_links').doc(input.authUid),
      db.collection('users').doc(stableUid),
      db.collection('banned_users').doc(stableUid),
    ] : [];
    const snapshots = await tx.getAll(
      roomRef, ...secretRefs, ...attemptRefs, ...receiptDescriptors.map((entry) => entry.ref), ...accessRefs,
    );
    const roomSnap = snapshots[0];
    if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
    if (input.authUid) {
      const accessOffset = 1 + secretRefs.length + attemptRefs.length + receiptDescriptors.length;
      assertTransactionalTournamentAccess(input.authUid, stableUid,
        snapshots[accessOffset], snapshots[accessOffset + 1], snapshots[accessOffset + 2]);
    }
    const room = readRoom(roomSnap);
    const round = room.rounds.find((candidate) => candidate.roundNo === roundNo);
    const receiptOffset = 1 + secretRefs.length + attemptRefs.length;
    const allReceipts = receiptDescriptors.flatMap((descriptor, index) => {
      const receipt = readTournamentTaskAnswerReceipt(snapshots[receiptOffset + index].data(), {
        roundNo, taskId: descriptor.taskId, playerId: descriptor.playerId,
      });
      return receipt ? [receipt] : [];
    });
    const receipts = initialRound.taskIds.map((taskId) => allReceipts.find((receipt) => (
      receipt.playerId === stableUid && receipt.taskId === taskId
    )));
    const submittedAnswerMap = new Map(submittedAnswers.map((entry) => [entry.taskId, entry.answer]));
    const answers = initialRound.taskIds.flatMap((taskId, index) => {
      const receipt = receipts[index];
      if (receipt) return [{ taskId, answer: receipt.answer }];
      return submittedAnswerMap.has(taskId)
        ? [{ taskId, answer: submittedAnswerMap.get(taskId) }]
        : [];
    });
    const taskReceivedAtMs = Object.fromEntries(receipts.flatMap((receipt) => receipt
      ? [[receipt.taskId, receipt.receivedAtMs]]
      : []));
    const existing = round?.results?.[stableUid];
    const existingTimedOut = existing?.submissionStatus === 'timed_out' || existing?.timedOut === true;
    if (existing && !existingTimedOut) {
      try {
        const finalTaskId = (round as TournamentRound).taskIds[(round as TournamentRound).taskIds.length - 1];
        assertTournamentAnswersWithinTaskSchedule(
          round as TournamentRound, [finalTaskId], receivedAtMs,
        );
      } catch (error) {
        throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'task_deadline_elapsed');
      }
      if (idempotencyKeyHash && existing.submissionIdempotencyKeyHash
        && idempotencyKeyHash !== existing.submissionIdempotencyKeyHash) {
        throw new HttpsError('already-exists', 'submission_idempotency_key_mismatch');
      }
      return { ok: true, replay: true, roundScore: existing.roundScore, correct: existing.correct };
    }
    if (!round || !sameTaskIdSnapshot(round.taskIds, initialRound.taskIds)) {
      throw new HttpsError('aborted', 'round_changed_retry');
    }
    const realPlayerIds = room.players.filter((player) => !player.isBot).map((player) => player.id);
    if (!sameTaskIdSnapshot(realPlayerIds, initialRealPlayerIds)) {
      throw new HttpsError('aborted', 'room_players_changed_retry');
    }
    const tasks = snapshots.slice(1, 1 + secretRefs.length).map(parseTask);
    if (tasks.some((task) => !task)) throw new HttpsError('failed-precondition', 'round_tasks_unavailable');
    const speedMatchProgress: Record<string, SpeedMatchAttemptProgress> = {};
    snapshots.slice(1 + secretRefs.length, 1 + secretRefs.length + attemptRefs.length)
      .forEach((snapshot, index) => {
        const progress = readSpeedMatchProgress(snapshot.data());
        if (progress) speedMatchProgress[initialRound.taskIds[index]] = progress;
      });
    const syntheticReceipts = answers.flatMap((entry) => {
      if (receipts.some((receipt) => receipt?.taskId === entry.taskId)) return [];
      const task = (tasks as TournamentTask[]).find((candidate) => candidate.taskId === entry.taskId);
      if (!task) return [];
      return [{
        roundNo,
        taskId: entry.taskId,
        playerId: stableUid,
        receivedAtMs,
        idempotencyKeyHash: idempotencyKeyHash ?? createHash('sha256')
          .update(`legacy:${roomId}:${roundNo}:${stableUid}:${entry.taskId}:${receivedAtMs}`)
          .digest('hex'),
        answer: entry.answer,
        correct: verifyTournamentAnswer(task, entry.answer),
      } satisfies TournamentTaskAnswerReceipt];
    });
    const answerRanksByPlayer = canonicalTournamentReceiptRanks(
      round, tasks as TournamentTask[], realPlayerIds, [...allReceipts, ...syntheticReceipts],
      room.stateDeadlineAtMs,
    );
    let applied;
    try {
      const roundDurationMs = tournamentRoundDurationMs(tasks as TournamentTask[]);
      applied = applyTournamentSubmission(room, {
        playerId: stableUid,
        roundNo,
        answers,
        tasks: tasks as TournamentTask[],
        receivedAtMs,
        taskReceivedAtMs,
        idempotencyKeyHash,
        maxMsPerTask: Math.max(1, Math.ceil(roundDurationMs / Math.max(1, tasks.length))),
        speedMatchProgress,
        answerRanksByPlayer,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'submission_rejected';
      throw new HttpsError(message === 'not_in_room' ? 'permission-denied' : 'failed-precondition', message);
    }
    const earlyAdvanceDeadlineAtMs = applied.allRealSubmitted
      ? Math.min(
        room.stateDeadlineAtMs ?? Number.MAX_SAFE_INTEGER,
        receivedAtMs + TOURNAMENT_EARLY_ADVANCE_DELAY_MS,
      )
      : undefined;
    tx.set(roomRef, {
      players: applied.room.players.map(publicTournamentPlayer),
      rounds: publicTournamentRounds(applied.room.rounds),
      ...(earlyAdvanceDeadlineAtMs !== undefined ? { stateDeadlineAtMs: earlyAdvanceDeadlineAtMs } : {}),
      version: applied.room.version,
      updatedAt: receivedAtMs,
    }, { merge: true });
    return {
      ok: true,
      replay: false,
      roundScore: applied.result.roundScore,
      correct: applied.result.correct,
      total: applied.result.total,
      state: applied.room.state,
    };
  });
}

export const tournamentSubmitSpeedMatchAttempt = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUid(db, request.auth.uid);
  await assertNotBanned(db, stableUid);
  const roomId = sanitizeString(request.data?.roomId, 160);
  const taskId = sanitizeString(request.data?.taskId, 160);
  const roundNo = readInt(request.data?.roundNo, 0);
  const pairIndex = readInt(request.data?.pairIndex, -1);
  const selectedIndex = readInt(request.data?.selectedIndex, -1);
  if (!roomId || !taskId || roundNo < 1 || roundNo > 4 || pairIndex < 0 || selectedIndex < 0) {
    throw new HttpsError('invalid-argument', 'speed_match_attempt_invalid');
  }
  return tournamentSpeedMatchAttemptTransaction(db, {
    authUid: request.auth.uid, stableUid, roomId, roundNo, taskId, pairIndex, selectedIndex,
  });
});

export const tournamentSubmitTaskAnswer = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const roomId = sanitizeString(request.data?.roomId, 160);
  const taskId = sanitizeString(request.data?.taskId, 160);
  const roundNo = readInt(request.data?.roundNo, 0);
  const idempotencyKey = parseTournamentSubmissionIdempotencyKey(request.data?.idempotencyKey);
  if (!roomId || !taskId || roundNo < 1 || roundNo > 4
    || !idempotencyKey || !Object.prototype.hasOwnProperty.call(request.data || {}, 'answer')) {
    throw new HttpsError('invalid-argument', 'task_answer_required');
  }
  const db = admin.firestore();
  const stableUid = await resolveStableUid(db, request.auth.uid);
  await assertNotBanned(db, stableUid);
  return tournamentSubmitTaskAnswerTransaction(db, {
    authUid: request.auth.uid,
    stableUid,
    roomId,
    roundNo,
    taskId,
    answer: request.data.answer,
    idempotencyKey,
  });
});

export const tournamentSubmitAnswers = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUid(db, request.auth.uid);
  await assertNotBanned(db, stableUid);
  const roomId = sanitizeString(request.data?.roomId, 160);
  const roundNo = readInt(request.data?.roundNo, 0);
  if (!roomId || roundNo < 1 || roundNo > 4) throw new HttpsError('invalid-argument', 'room_and_round_required');
  const rawAnswers = Array.isArray(request.data?.answers) ? request.data.answers as Row[] : [];
  const idempotencyKey = parseTournamentSubmissionIdempotencyKey(request.data?.idempotencyKey);
  return tournamentSubmitTransaction(db, {
    authUid: request.auth.uid, stableUid, roomId, roundNo, rawAnswers, idempotencyKey,
  });
});

// ── Finalization: one transaction owns room marker, season, streak and entitlements. ─

export async function tournamentFinalizeTransaction(
  db: FirebaseFirestore.Firestore,
  roomId: string,
  requestedNowMs?: number,
): Promise<{ ok: boolean; alreadyFinalized?: boolean }> {
  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  // FINALIZE_TRANSACTION_GUARD
  return db.runTransaction(async (tx) => {
    const [roomSnap, botMetadataSnap] = await tx.getAll(
      roomRef, roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC),
    );
    if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
    const room = hydratePrivateBotMetadata(readRoom(roomSnap), botMetadataSnap.data());
    if (room.state === TOURNAMENT_STATE_CANCELLED) throw new HttpsError('failed-precondition', 'room_cancelled');
    let plan;
    try {
      plan = planTournamentFinalization(room, requestedNowMs ?? Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'room_not_ready_to_finalize';
      throw new HttpsError('failed-precondition', message);
    }
    if (plan.alreadyFinalized) return { ok: true, alreadyFinalized: true };

    const weekId = tournamentWeekId(room.startsAt);
    const refs = plan.playerEffects.flatMap((effect) => {
      const userRef = db.collection('users').doc(effect.playerId);
      return [
        userRef,
        db.collection(TOURNAMENT_SEASONS_COLLECTION).doc(weekId)
          .collection(TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION).doc(effect.playerId),
        userRef.collection(TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`reward_${roomId}`),
      ];
    });
    const snapshots = refs.length > 0 ? await tx.getAll(...refs) : [];
    const byPath = new Map(snapshots.map((snapshot) => [snapshot.ref.path, snapshot]));
    const nowMs = requestedNowMs ?? Date.now();

    for (const effect of plan.playerEffects) {
      const userRef = db.collection('users').doc(effect.playerId);
      const seasonRef = db.collection(TOURNAMENT_SEASONS_COLLECTION).doc(weekId)
        .collection(TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION).doc(effect.playerId);
      const rewardRef = userRef.collection(TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`reward_${roomId}`);
      if (byPath.get(rewardRef.path)?.exists) throw new HttpsError('failed-precondition', 'finalization_receipt_conflict');
      const user = byPath.get(userRef.path)?.data() || {};
      const season = byPath.get(seasonRef.path)?.data() || {};
      const hotStreak = effect.won ? Math.max(0, readInt(user.tournament_hot_streak, 0)) + 1 : 0;
      const hotTier = hotStreak >= 10 ? 10 : hotStreak >= 5 ? 5 : hotStreak >= 3 ? 3 : 0;
      // зачем 2026-07-27: имя в рейтинге показывается ВСЕМ игрокам, поэтому
      // заглушка 'Player' здесь недопустима. Порядок: ник из комнаты → уже
      // записанное имя недели → только в крайнем случае заглушка. Аватар
      // сохраняем рядом, иначе таблица рисует подстановку по хэшу uid.
      const roomPlayer = room.players.find((player) => player.id === effect.playerId);
      const seasonName = resolveSeasonEntryName(roomPlayer?.name, season.name);
      const seasonAvatar = sanitizeString(roomPlayer?.avatar, 16) || sanitizeString(season.avatar, 16);
      // зачем 2026-07-27 (владелец): «по игрокам в таблице можно нажимать и
      // открывать их карточку». Карточке нужны аватар, рамка, уровень и серия —
      // кладём их РЯДОМ с очками, чтобы тап открывал карточку мгновенно, без
      // дочитывания чужого профиля (это было бы N чтений на прокрутку списка).
      // Всё берётся из уже прочитанных документов: лишних чтений ноль.
      const profileAvatar = sanitizeString(user.user_avatar, 16);
      const profileFrame = sanitizeString(user.user_avatar_frame, 24);
      const profileXp = Math.max(0, readInt((user.progress as Record<string, unknown> | undefined)?.total_xp, 0));
      const rewardGems = Math.max(0, Math.trunc(effect.reward.gems));
      const rewardTickets = Math.max(0, Math.trunc(effect.reward.tickets));
      const rewardTitleId = sanitizeString(effect.reward.titleId, 60);
      tx.set(seasonRef, {
        uid: effect.playerId,
        name: seasonName,
        ...(seasonAvatar ? { avatar: seasonAvatar } : {}),
        // Профиль для карточки. Пустые поля не пишем — не засоряем документ.
        ...(profileAvatar ? { profileAvatar } : {}),
        ...(profileFrame ? { frame: profileFrame } : {}),
        ...(profileXp > 0 ? { totalXp: profileXp } : {}),
        hotStreak,
        points: Math.max(0, readInt(season.points, 0)) + effect.seasonPoints,
        tournamentsPlayed: Math.max(0, readInt(season.tournamentsPlayed, 0)) + 1,
        bestPlace: season.bestPlace ? Math.min(readInt(season.bestPlace, effect.place), effect.place) : effect.place,
        updatedAt: nowMs,
      }, { merge: true });
      tx.set(userRef, {
        tournament_hot_streak: hotStreak,
        tournament_hot_streak_tier: hotTier,
        tournament_best_place: user.tournament_best_place
          ? Math.min(readInt(user.tournament_best_place, effect.place), effect.place)
          : effect.place,
        updatedAt: nowMs,
      }, { merge: true });
      if (rewardGems > 0) {
        tx.set(userRef, {
          shards: admin.firestore.FieldValue.increment(rewardGems),
          shards_updated_at_ms: nowMs,
          shards_updated_op: 'earn',
          shards_updated_reason: 'tournament_prize',
        }, { merge: true });
        tx.set(userRef.collection('shard_log').doc(`tournament_prize_${roomId}`), {
          ts: new Date(nowMs).toISOString(),
          type: 'earn',
          amount: rewardGems,
          reason: 'tournament_prize',
          roomId,
          place: effect.place,
        });
      }
      if (rewardTickets > 0) {
        tx.set(userRef.collection('inventory').doc('tickets'), {
          count: admin.firestore.FieldValue.increment(rewardTickets),
          updatedAt: nowMs,
        }, { merge: true });
      }
      if (rewardTitleId) {
        tx.set(userRef, {
          tournament_title: rewardTitleId,
          tournament_titles_won: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
      }
      tx.create(rewardRef, {
        kind: 'tournament_reward',
        uid: effect.playerId,
        roomId,
        place: effect.place,
        seasonPoints: effect.seasonPoints,
        reward: effect.reward,
        claimed: true,
        claimedAtMs: nowMs,
        createdAtMs: nowMs,
      });
    }
    const winner = plan.playerEffects.find((effect) => effect.place === 1)?.playerId ?? null;

    // зачем: доля турнира (20% банка + неразыгранные места) копится в
    // недельном банке — его раздаст крон в ночь воскресенья. Пишем один раз
    // вместе с финализацией: повторный вызов не пройдёт из-за
    // finalizationReceiptId, значит банк не удвоится.
    const weeklyGems = Math.max(0, Math.trunc(plan.weeklyBankGems ?? 0));
    if (weeklyGems > 0) {
      tx.set(db.collection(TOURNAMENT_BANK_COLLECTION).doc(weekId), {
        weekId,
        total: admin.firestore.FieldValue.increment(weeklyGems),
        contributions: admin.firestore.FieldValue.increment(1),
        updatedAt: nowMs,
      }, { merge: true });
    }

    tx.set(roomRef, {
      state: plan.room.state,
      players: plan.room.players.map(publicTournamentPlayer),
      potGems: plan.room.potGems ?? 0,
      finalizationReceiptId: plan.room.finalizationReceiptId,
      stateStartedAtMs: plan.room.stateStartedAtMs,
      stateDeadlineAtMs: plan.room.stateDeadlineAtMs,
      lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
      version: plan.room.version,
      winnerUid: winner,
      finalizedAtMs: plan.room.finalizedAtMs,
      reviewRetentionUntilMs: plan.room.reviewRetentionUntilMs,
      privateEvidenceRetentionUntilMs: plan.room.privateEvidenceRetentionUntilMs,
      featureGates: tournamentFeatureGates(),
      expireAt: admin.firestore.Timestamp.fromMillis(
        plan.room.privateEvidenceRetentionUntilMs ?? nowMs + TOURNAMENT_ROOM_TTL_MS,
      ),
      updatedAt: nowMs,
    }, { merge: true });
    return { ok: true };
  });
}

export const tournamentFinalize = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (request.auth?.token?.admin !== true) throw new HttpsError('permission-denied', 'Admin only');
  const roomId = sanitizeString(request.data?.roomId, 160);
  if (!roomId) throw new HttpsError('invalid-argument', 'room_required');
  return tournamentFinalizeTransaction(admin.firestore(), roomId);
});

// ── Deadline advancement: missing humans cannot block; every display state persists. ─

type TournamentAdvanceDependencies = {
  loadTasksByIds?: typeof loadTasksByIds;
  nowMs?: () => number;
  requesterAuthUid?: string;
  requesterStableUid?: string;
  expectedState?: string;
  expectedDeadlineAtMs?: number;
};

function sameTaskIdSnapshot(left: string[] | undefined, right: string[] | undefined): boolean {
  const leftIds = left ?? [];
  const rightIds = right ?? [];
  return leftIds.length === rightIds.length && leftIds.every((taskId, index) => taskId === rightIds[index]);
}

function activationRoundForState(room: TournamentRoomDoc): TournamentRound | undefined {
  const roundNo = room.state === 'lobby' ? 1
    : room.state === 'table1' ? 2
      : room.state === 'table2' ? 3
        : room.state === 'table3' ? 4 : 0;
  return roundNo ? room.rounds.find((round) => round.roundNo === roundNo) : undefined;
}

export async function advanceRoomAtDeadline(
  db: FirebaseFirestore.Firestore,
  roomRef: FirebaseFirestore.DocumentReference,
  dependencies: TournamentAdvanceDependencies = {},
): Promise<AdvanceOutcome> {
  const readTasks = dependencies.loadTasksByIds ?? loadTasksByIds;
  const clock = dependencies.nowMs ?? Date.now;
  const botMetadataRef = roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC);
  const [initial, initialBotMetadata] = await Promise.all([roomRef.get(), botMetadataRef.get()]);
  if (!initial.exists) return 'skip';
  const initialRoom = hydratePrivateBotMetadata(readRoom(initial), initialBotMetadata.data());
  const initialAuthUid = dependencies.requesterAuthUid;
  if (dependencies.requesterStableUid
    && !(initialAuthUid && initialRoom.participantAuthUids?.includes(initialAuthUid))
    && !initialRoom.players.some((player) => !player.isBot && player.id === dependencies.requesterStableUid)) {
    throw new HttpsError('permission-denied', 'not_in_room');
  }
  if (dependencies.expectedState !== undefined && (
    initialRoom.state !== dependencies.expectedState
    || initialRoom.stateDeadlineAtMs !== dependencies.expectedDeadlineAtMs
  )) {
    return 'stale';
  }
  const activeRound = /^round[1-4]$/.test(initialRoom.state)
    ? initialRoom.rounds.find((round) => `round${round.roundNo}` === initialRoom.state)
    : undefined;
  const activeRealPlayerIds = activeRound
    ? initialRoom.players.filter((player) => !player.isBot).map((player) => player.id)
    : [];
  const deadlineReceiptDescriptors = activeRound
    ? tournamentReceiptRefsForRound(roomRef, activeRound, activeRealPlayerIds)
    : [];
  const deadlineAttemptDescriptors = activeRound
    ? activeRealPlayerIds.flatMap((playerId) => activeRound.taskIds.map((taskId) => ({
      playerId,
      taskId,
      ref: roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
        .doc(speedMatchAttemptDocId(activeRound.roundNo, taskId, playerId)),
    })))
    : [];
  let tasks: TournamentTask[] | null = [];
  if (activeRound) {
    try {
      tasks = await readTasks(db, activeRound.taskIds, initialRoom.roomId);
    } catch (error) {
      if (error instanceof HttpsError
        && error.code === 'failed-precondition'
        && error.message === 'round_tasks_unavailable') {
        tasks = null;
      } else {
        throw error;
      }
    }
  }
  const activationRound = activationRoundForState(initialRoom);
  let activationTasks: TournamentTask[] | null = [];
  if (activationRound) {
    try {
      activationTasks = await readTasks(db, activationRound.taskIds, initialRoom.roomId);
    } catch (error) {
      if (error instanceof HttpsError && error.code === 'failed-precondition'
        && error.message === 'round_tasks_unavailable') activationTasks = null;
      else throw error;
    }
  }
  const retainedSecretRefs = initialRoom.state === 'rewards'
    ? await roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).listDocuments()
    : [];

  return db.runTransaction(async (tx) => {
    const accessRefs = dependencies.requesterAuthUid && dependencies.requesterStableUid ? [
      db.collection('auth_links').doc(dependencies.requesterAuthUid),
      db.collection('users').doc(dependencies.requesterStableUid),
      db.collection('banned_users').doc(dependencies.requesterStableUid),
    ] : [];
    const snapshots = await tx.getAll(
      roomRef,
      botMetadataRef,
      ...deadlineReceiptDescriptors.map((entry) => entry.ref),
      ...deadlineAttemptDescriptors.map((entry) => entry.ref),
      ...accessRefs,
    );
    const receiptOffset = 2;
    const attemptOffset = receiptOffset + deadlineReceiptDescriptors.length;
    const accessOffset = attemptOffset + deadlineAttemptDescriptors.length;
    const snap = snapshots[0];
    if (!snap.exists) return 'skip';
    if (dependencies.requesterAuthUid && dependencies.requesterStableUid) {
      assertTransactionalTournamentAccess(dependencies.requesterAuthUid, dependencies.requesterStableUid,
        snapshots[accessOffset], snapshots[accessOffset + 1], snapshots[accessOffset + 2]);
    }
    const room = hydratePrivateBotMetadata(readRoom(snap), snapshots[1].data());
    const nowMs = clock();
    const authUid = dependencies.requesterAuthUid;
    if (dependencies.requesterStableUid
      && !(authUid && room.participantAuthUids?.includes(authUid))
      && !room.players.some((player) => !player.isBot && player.id === dependencies.requesterStableUid)) {
      throw new HttpsError('permission-denied', 'not_in_room');
    }
    if (dependencies.expectedState !== undefined && (
      room.state !== dependencies.expectedState
      || room.stateDeadlineAtMs !== dependencies.expectedDeadlineAtMs
    )) {
      return 'stale';
    }
    const currentActiveRound = /^round[1-4]$/.test(room.state)
      ? room.rounds.find((round) => `round${round.roundNo}` === room.state)
      : undefined;
    const currentActivationRound = activationRoundForState(room);
    if (room.state !== initialRoom.state
      || room.stateDeadlineAtMs !== initialRoom.stateDeadlineAtMs
      || currentActiveRound?.roundNo !== activeRound?.roundNo
      || !sameTaskIdSnapshot(currentActiveRound?.taskIds, activeRound?.taskIds)
      || currentActivationRound?.roundNo !== activationRound?.roundNo
      || !sameTaskIdSnapshot(currentActivationRound?.taskIds, activationRound?.taskIds)) {
      return 'stale';
    }
    if (!ACTIVE_DEADLINE_STATES.includes(room.state as TournamentState)) return 'skip';
    const legacyAction = legacyTournamentRecoveryAction(room, nowMs, tasks !== null);
    if (legacyAction === 'cancel') return 'cancel_legacy';
    if (legacyAction === 'wait') return 'waiting';
    const transitionAtMs = room.stateDeadlineAtMs ?? nowMs;
    if (room.state === 'scheduled') {
      tx.set(roomRef, {
        state: 'lobby',
        stateStartedAtMs: nowMs,
        // зачем 2026-07-27 (владелец: точные правила подбора): дедлайн лобби —
        // это КОНЕЦ сбора (30с ожидания + 45с добора от входа первого живого),
        // а не время слота. Раньше здесь стоял room.startsAt: комната
        // набиралась за полторы минуты, все 16 были на месте, таймер показывал
        // 00:00 — и ничего не происходило, потому что дедлайном оставалось
        // время слота. Именно это владелец видел как «все на месте, время по
        // нулям, но ничего не начинается». Ниже (state === 'lobby') комната
        // стартует ещё раньше, как только мест не осталось.
        stateDeadlineAtMs: lobbyDeadlineAtMs(snap.data(), room, nowMs),
        lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
        version: room.version + 1,
        updatedAt: nowMs,
      }, { merge: true });
      return 'advanced';
    }
    if (room.state === 'lobby') {
      // зачем 2026-07-27 (владелец: «НИКАКОГО турнир отменяют, это невозможно,
      // боты ВСЕГДА добивают»): здесь комната отменялась по нехватке живых
      // (cancel_players). Отмена убрана — если живых мало, комнату добьют
      // боты, а не выкинут игрока с экрана.
      if (snap.data()?.ready !== true || room.rounds.length !== 4 || room.rounds.some((round) => round.taskIds.length === 0)) {
        return 'cancel_resources';
      }
      if (!activationTasks || !activationRound) return 'cancel_resources';
      // A future bot reservation must never count as an occupied seat. Modern
      // fill writes the deadline after the final reservation; this guard keeps
      // malformed/legacy deadlines fail-closed instead of starting early.
      if (!tournamentPlayersHaveArrived(room.players, nowMs)) return 'waiting';
      const roundTiming = tournamentRoundTimingWindow(activationTasks, nowMs);
      tx.set(roomRef, {
        state: 'round1',
        stateStartedAtMs: nowMs,
        introEndsAtMs: roundTiming.introEndsAtMs,
        stateDeadlineAtMs: roundTiming.stateDeadlineAtMs,
        rounds: roundsWithActivatedPublicTasks(
          room.rounds, activationRound.roundNo, activationTasks, nowMs, room.roomId,
        ),
        lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
        version: room.version + 1,
        updatedAt: nowMs,
      }, { merge: true });
      return 'advanced';
    }
    if (/^round[1-4]$/.test(room.state)) {
      if (!tasks) return 'cancel_resources';
      const realPlayerIds = room.players.filter((player) => !player.isBot).map((player) => player.id);
      if (!currentActiveRound || !activeRound
        || !sameTaskIdSnapshot(realPlayerIds, activeRealPlayerIds)) return 'stale';
      const deadlineRound = currentActiveRound;
      let receiptSubmissions: Record<string, TournamentDeadlineSubmission>;
      try {
        const allReceipts = deadlineReceiptDescriptors.flatMap((descriptor, index) => {
          const receipt = readTournamentTaskAnswerReceipt(snapshots[receiptOffset + index].data(), {
            roundNo: deadlineRound.roundNo,
            taskId: descriptor.taskId,
            playerId: descriptor.playerId,
          });
          return receipt ? [receipt] : [];
        });
        const answerRanksByPlayer = canonicalTournamentReceiptRanks(
          deadlineRound, tasks, realPlayerIds, allReceipts, transitionAtMs,
        );
        receiptSubmissions = Object.fromEntries(realPlayerIds.flatMap((playerId) => {
          const timelyReceipts = allReceipts.filter((receipt) => (
            receipt.playerId === playerId
            && tournamentReceiptIsTimely(deadlineRound, receipt, transitionAtMs)
          ));
          if (timelyReceipts.length === 0) return [];
          const speedMatchProgress: Record<string, SpeedMatchAttemptProgress> = {};
          deadlineAttemptDescriptors.forEach((descriptor, index) => {
            if (descriptor.playerId !== playerId) return;
            const progress = readSpeedMatchProgress(snapshots[attemptOffset + index].data());
            if (progress) speedMatchProgress[descriptor.taskId] = progress;
          });
          return [[playerId, {
            answers: timelyReceipts.map((receipt) => ({
              taskId: receipt.taskId,
              answer: receipt.answer,
            })),
            taskReceivedAtMs: Object.fromEntries(timelyReceipts.map((receipt) => [
              receipt.taskId, receipt.receivedAtMs,
            ])),
            answerRanksByPlayer,
            speedMatchProgress,
          } satisfies TournamentDeadlineSubmission]];
        }));
      } catch {
        return 'cancel_resources';
      }
      let completed;
      try {
        completed = completeTournamentRoundAtDeadline(
          room, tasks, transitionAtMs, receiptSubmissions,
        );
      } catch {
        return 'cancel_resources';
      }
      const completedStateDuration = stateDeadlineDurationMs(completed.room.state as TournamentState, 0);
      const completedStateDeadlineAtMs = completedStateDuration === null
        ? completed.room.stateDeadlineAtMs
        : nowMs + completedStateDuration;
      tx.set(roomRef, {
        players: completed.room.players.map(publicTournamentPlayer),
        rounds: publicTournamentRounds(completed.room.rounds),
        state: completed.room.state,
        // Scoring closes at the immutable expired deadline, but the state that
        // follows is new UI. Give that table/final state its full 5–6 second
        // server window from the actual transition so catch-up cannot create it
        // already expired and jump through it in the same pass.
        stateStartedAtMs: nowMs,
        introEndsAtMs: admin.firestore.FieldValue.delete(),
        stateDeadlineAtMs: completedStateDeadlineAtMs,
        lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
        version: completed.room.version,
        updatedAt: nowMs,
      }, { merge: true });
      return 'advanced';
    }
    if (room.state === 'results') return 'finalize';
    if (room.state === 'rewards') {
      // New rooms persist both anchors atomically with reward receipts. The
      // rewards-state start is the fixed finalization anchor for legacy rooms.
      const finalizedAtMs = room.finalizedAtMs ?? room.stateStartedAtMs ?? nowMs;
      const reviewRetentionUntilMs = room.reviewRetentionUntilMs
        ?? finalizedAtMs + TOURNAMENT_REVIEW_RETENTION_MS;
      const privateEvidenceRetentionUntilMs = room.privateEvidenceRetentionUntilMs
        ?? finalizedAtMs + TOURNAMENT_PRIVATE_EVIDENCE_RETENTION_MS;
      const evidenceExpireAt = admin.firestore.Timestamp.fromMillis(
        privateEvidenceRetentionUntilMs,
      );
      for (const secretRef of retainedSecretRefs) {
        tx.set(secretRef, { expireAt: evidenceExpireAt }, { merge: true });
      }
      tx.set(roomRef, {
        state: 'closed',
        closedAtMs: nowMs,
        finalizedAtMs,
        reviewRetentionUntilMs,
        privateEvidenceRetentionUntilMs,
        stateStartedAtMs: nowMs,
        stateDeadlineAtMs: admin.firestore.FieldValue.delete(),
        lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
        version: room.version + 1,
        expireAt: admin.firestore.Timestamp.fromMillis(privateEvidenceRetentionUntilMs),
        updatedAt: nowMs,
      }, { merge: true });
      return 'advanced';
    }
    const nextState = stateAfterTournamentDeadline(room.state as TournamentState);
    if (!nextState) return 'skip';
    const nextRound = /^round[1-4]$/.test(nextState)
      ? room.rounds.find((round) => `round${round.roundNo}` === nextState)
      : undefined;
    if (nextRound && (!activationTasks || activationRound?.roundNo !== nextRound.roundNo)) return 'cancel_resources';
    const roundTiming = nextRound
      ? tournamentRoundTimingWindow(activationTasks as TournamentTask[], nowMs)
      : undefined;
    const duration = stateDeadlineDurationMs(nextState, 0);
    tx.set(roomRef, {
      state: nextState,
      stateStartedAtMs: nowMs,
      introEndsAtMs: roundTiming?.introEndsAtMs ?? admin.firestore.FieldValue.delete(),
      stateDeadlineAtMs: roundTiming?.stateDeadlineAtMs
        ?? (duration === null ? admin.firestore.FieldValue.delete() : nowMs + duration),
      ...(nextRound ? {
        rounds: roundsWithActivatedPublicTasks(
          room.rounds, nextRound.roundNo, activationTasks as TournamentTask[], nowMs, room.roomId,
        ),
      } : {}),
      lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
      version: room.version + 1,
      updatedAt: nowMs,
    }, { merge: true });
    return 'advanced';
  });
}

type SettleAdvanceDependencies = { nowMs?: () => number; beforeCancelTransaction?: () => Promise<void> };

export async function settleAdvanceOutcome(
  db: FirebaseFirestore.Firestore,
  roomRef: FirebaseFirestore.DocumentReference,
  outcome: AdvanceOutcome,
  dependencies: SettleAdvanceDependencies = {},
): Promise<AdvanceOutcome | 'cancelled'> {
  const requestedNowMs = dependencies.nowMs?.();
  if (outcome === 'cancel_players') {
    const cancelled = await tournamentCancelTransaction(db, roomRef, 'not_enough_players', requestedNowMs);
    if (!cancelled) {
      const resources = await loadResourcePool(db);
      const fillOutcome = await tournamentFillRoomTransaction(db, roomRef, resources, { nowMs: dependencies.nowMs });
      if (fillOutcome === 'filled') {
        return settleAdvanceOutcome(db, roomRef, await advanceRoomAtDeadline(db, roomRef, {
          nowMs: dependencies.nowMs,
        }), dependencies);
      }
      if (fillOutcome === 'cancelled_players' || fillOutcome === 'cancelled_resources') return 'cancelled';
    }
    return cancelled ? 'cancelled' : outcome;
  }
  if (outcome === 'cancel_resources') {
    // Compatibility marker: tournamentCancelTransaction(db, roomRef, 'resources_unavailable')
    // now additionally carries the freshly observed state/version token.
    const rechecked = await advanceRoomAtDeadline(db, roomRef, { nowMs: dependencies.nowMs });
    if (rechecked !== 'cancel_resources') return settleAdvanceOutcome(db, roomRef, rechecked, dependencies);
    const expectedSnap = await roomRef.get();
    if (!expectedSnap.exists) return 'skip';
    const expectedRoom = readRoom(expectedSnap);
    await dependencies.beforeCancelTransaction?.();
    const cancelled = await tournamentCancelTransaction(db, roomRef, 'resources_unavailable', undefined, {
      state: expectedRoom.state,
      version: expectedRoom.version,
    });
    if (cancelled) return 'cancelled';
    return 'stale';
  }
  if (outcome === 'cancel_legacy') {
    const cancelled = await tournamentCancelTransaction(db, roomRef, 'legacy_gameplay_unverifiable', requestedNowMs);
    return cancelled ? 'cancelled' : outcome;
  }
  if (outcome === 'finalize') {
    await tournamentFinalizeTransaction(db, roomRef.id, requestedNowMs);
    return 'advanced';
  }
  return outcome;
}

/** Golden Plan [7]: one recovery pass advances through every already-expired state. */
export async function catchUpRoomAtDeadline(
  db: FirebaseFirestore.Firestore,
  roomRef: FirebaseFirestore.DocumentReference,
  dependencies: SettleAdvanceDependencies = {},
): Promise<AdvanceOutcome | 'cancelled'> {
  const nowMs = dependencies.nowMs?.() ?? Date.now();
  let progressed = false;
  for (let transition = 0; transition < ACTIVE_DEADLINE_STATES.length + 2; transition += 1) {
    const outcome = await advanceRoomAtDeadline(db, roomRef, { nowMs: () => nowMs });
    const settled = await settleAdvanceOutcome(db, roomRef, outcome, { ...dependencies, nowMs: () => nowMs });
    if (settled === 'cancelled') return settled;
    if (settled !== 'advanced') return progressed ? 'advanced' : settled;
    progressed = true;
    const current = await roomRef.get();
    if (!current.exists) return 'advanced';
    const data = current.data() || {};
    const state = sanitizeString(data.state, 20) as TournamentState;
    const deadlineAtMs = readInt(data.stateDeadlineAtMs, 0);
    if (!ACTIVE_DEADLINE_STATES.includes(state) || deadlineAtMs <= 0 || deadlineAtMs > nowMs) {
      return 'advanced';
    }
  }
  return progressed ? 'advanced' : 'skip';
}

export async function processDueTournamentRooms(options: {
  db: FirebaseFirestore.Firestore;
  nowMs?: number;
  limit?: number;
}): Promise<{ scanned: number; advanced: number; failed: number }> {
  const { db } = options;
  const nowMs = options.nowMs ?? Date.now();
  const limit = Math.max(1, Math.min(ROOM_SCAN_LIMIT, Math.trunc(options.limit ?? ROOM_SCAN_LIMIT)));
  let scanned = 0;
  let advanced = 0;
  let failed = 0;
  const cursorRef = db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc(LIFECYCLE_CURSOR_DOC);
  const persistedCursor = await cursorRef.get();
  const persistedDeadlineAtMs = readInt(persistedCursor.data()?.stateDeadlineAtMs, 0);
  const persistedRoomId = sanitizeString(persistedCursor.data()?.roomId, 200);
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let exhausted = false;
  for (let page = 0; page < MAX_PROCESSOR_PAGES; page += 1) {
    let query = db.collection(TOURNAMENT_ROOMS_COLLECTION)
      .where('state', 'in', ACTIVE_DEADLINE_STATES)
      .where('stateDeadlineAtMs', '<=', nowMs)
      .orderBy('stateDeadlineAtMs', 'asc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'asc')
      .limit(limit);
    if (cursor) query = query.startAfter(cursor);
    else if (persistedDeadlineAtMs > 0 && persistedRoomId) {
      query = query.startAfter(persistedDeadlineAtMs, persistedRoomId);
    }
    const snap = await query.get();
    scanned += snap.size;
    for (const doc of snap.docs) {
    if (readInt(doc.data().lifecycleRetryAtMs, 0) > nowMs) continue;
    try {
      const settled = await catchUpRoomAtDeadline(db, doc.ref, { nowMs: () => nowMs });
      if (settled === 'advanced' || settled === 'cancelled') advanced += 1;
    } catch (error) {
      failed += 1;
      console.error('[tournaments] lifecycle recovery failed', { roomId: doc.id, error });
      const failedDeadlineAtMs = readInt(doc.data().stateDeadlineAtMs, 0);
      if (failedDeadlineAtMs <= 0) continue;
      try {
        await db.runTransaction(async (tx) => {
          const currentSnap = await tx.get(doc.ref);
          if (!currentSnap.exists) return;
          const current = currentSnap.data() || {};
          const currentDeadlineAtMs = readInt(current.stateDeadlineAtMs, 0);
          if (currentDeadlineAtMs !== failedDeadlineAtMs || currentDeadlineAtMs > nowMs) return;
          tx.set(doc.ref, {
            lifecycleRetryAtMs: nowMs + LIFECYCLE_RECOVERY_BACKOFF_MS,
          }, { merge: true });
        });
      } catch (backoffError) {
        console.error('[tournaments] lifecycle recovery backoff failed', { roomId: doc.id, error: backoffError });
      }
    }
    }
    if (snap.size < limit) {
      exhausted = true;
      break;
    }
    cursor = snap.docs[snap.docs.length - 1];
  }
  if (exhausted) {
    if (persistedCursor.exists) await cursorRef.delete();
  } else if (cursor) {
    await cursorRef.set({
      stateDeadlineAtMs: readInt(cursor.data().stateDeadlineAtMs, 0),
      roomId: cursor.id,
      updatedAt: nowMs,
    });
  }
  return { scanned, advanced, failed };
}

/**
 * Deletes only private evidence whose seven-day review window has elapsed.
 * The collection-group query also finds orphaned subcollections if Firestore
 * TTL has already removed their parent room document.
 */
export async function cleanupExpiredTournamentReviewEvidence(
  db: FirebaseFirestore.Firestore,
  options: { nowMs?: number; limit?: number } = {},
): Promise<{ scanned: number; deleted: number }> {
  const nowMs = options.nowMs ?? Date.now();
  const limit = Math.max(1, Math.min(400, Math.trunc(options.limit ?? 400)));
  const expired = await db.collectionGroup(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
    .where('expireAt', '<=', admin.firestore.Timestamp.fromMillis(nowMs))
    .orderBy('expireAt', 'asc')
    .limit(limit)
    .get();
  if (expired.empty) return { scanned: 0, deleted: 0 };
  const batch = db.batch();
  for (const secret of expired.docs) batch.delete(secret.ref);
  await batch.commit();
  return { scanned: expired.size, deleted: expired.size };
}

export const tournamentAdvanceRooms = onSchedule(
  { schedule: '* * * * *', timeZone: 'UTC', region: 'europe-west1', maxInstances: 1 },
  async () => {
    const db = admin.firestore();
    const nowMs = Date.now();
    await processDueTournamentRooms({ db, nowMs });
    const legacyDocs = await scanLegacyTournamentRooms(db, { nowMs });
    for (const doc of legacyDocs) {
      try {
        const outcome = await advanceRoomAtDeadline(db, doc.ref, { nowMs: () => nowMs });
        await settleAdvanceOutcome(db, doc.ref, outcome);
      } catch (error) {
        console.error('[tournaments] legacy lifecycle recovery failed', { roomId: doc.id, error });
      }
    }
    await cleanupExpiredTournamentReviewEvidence(db, { nowMs });
  },
);

export async function scanLegacyTournamentRooms(
  db: FirebaseFirestore.Firestore,
  options: { nowMs?: number; pageSize?: number } = {},
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const nowMs = options.nowMs ?? Date.now();
  const pageSize = Math.max(1, Math.min(500, Math.trunc(options.pageSize ?? ROOM_SCAN_LIMIT * 4)));
  const legacyRecoveryCursorRef = db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc(LEGACY_RECOVERY_CURSOR_DOC);
  const cursorSnap = await legacyRecoveryCursorRef.get();
  const cursorStartsAt = readInt(cursorSnap.data()?.startsAt, 0);
  const cursorRoomId = sanitizeString(cursorSnap.data()?.roomId, 200);
  let query = db.collection(TOURNAMENT_ROOMS_COLLECTION)
    .where('state', 'in', ACTIVE_DEADLINE_STATES)
    .where('startsAt', '<=', nowMs)
    .orderBy('startsAt', 'asc')
    .orderBy(admin.firestore.FieldPath.documentId(), 'asc')
    .limit(pageSize);
  if (cursorStartsAt > 0 && cursorRoomId) {
    query = query.startAfter(cursorStartsAt, cursorRoomId);
  }
  const snap = await query.get();
  if (snap.empty) {
    if (cursorSnap.exists) await legacyRecoveryCursorRef.delete();
    return [];
  }
  const last = snap.docs[snap.docs.length - 1];
  await legacyRecoveryCursorRef.set({
    startsAt: readInt(last.data().startsAt, 0),
    roomId: last.id,
    updatedAt: nowMs,
  });
  return snap.docs.filter((doc) => !doc.data().stateDeadlineAtMs);
}

/**
 * Cloud Scheduler is the recovery fallback (one-minute granularity). A room
 * participant may request the same server-checked transition at the exact
 * 10–12 second UI deadline; this callable cannot advance early.
 */
export const tournamentAdvanceRound = onCall(
  // This callable is a deadline nudge, not an authority grant. Firebase Auth,
  // room membership, the exact state/deadline pair, and server time are all
  // rechecked transactionally below. App Check cannot be a hard dependency
  // here: an otherwise valid Android participant would be stranded until the
  // minute scheduler whenever attestation is unavailable or rejected.
  { ...HOT_CALLABLE_OPTIONS, enforceAppCheck: false, minInstances: 1 },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const roomId = sanitizeString(request.data?.roomId, 160);
    const expectedState = sanitizeString(request.data?.expectedState, 20);
    const expectedDeadlineAtMs = readInt(request.data?.expectedDeadlineAtMs, -1);
    if (!roomId
      || !/^(lobby|round[1-4]|table[1-3]|final|results)$/.test(expectedState)
      || expectedDeadlineAtMs <= 0) {
      throw new HttpsError('invalid-argument', 'room_state_deadline_required');
    }
    const db = admin.firestore();
    const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
    const stableUid = await resolveStableUid(db, request.auth.uid);
    await assertNotBanned(db, stableUid);
    const serverNowMs = Date.now();
    const outcome = await settleAdvanceOutcome(db, roomRef, await advanceRoomAtDeadline(db, roomRef, {
      nowMs: () => serverNowMs,
      requesterAuthUid: request.auth.uid,
      requesterStableUid: request.auth.token?.admin === true ? undefined : stableUid,
      expectedState,
      expectedDeadlineAtMs,
    }));
    if (outcome === 'waiting') throw new HttpsError('failed-precondition', 'deadline_not_elapsed');
    const current = await roomRef.get();
    return { ok: true, state: sanitizeString(current.data()?.state, 20), outcome };
  },
);

// ── Claim: entitlement is a server-only receipt; transaction applies it once. ──

export async function tournamentClaimTransaction(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  roomId: string,
  requestedNowMs?: number,
  authUid?: string,
): Promise<Row> {
  const userRef = db.collection('users').doc(stableUid);
  const receiptRef = userRef.collection(TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`reward_${roomId}`);
  const ticketsRef = userRef.collection('inventory').doc('tickets');

  return db.runTransaction(async (tx) => {
    const accessRefs = authUid ? [
      db.collection('auth_links').doc(authUid), userRef, db.collection('banned_users').doc(stableUid),
    ] : [];
    const snapshots = await tx.getAll(receiptRef, db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId), ...accessRefs);
    const [receiptSnap, roomSnap] = snapshots;
    if (authUid) assertTransactionalTournamentAccess(authUid, stableUid, snapshots[2], snapshots[3], snapshots[4]);
    if (!receiptSnap.exists) throw new HttpsError('not-found', 'reward_not_found');
    const receipt = receiptSnap.data() || {};
    if (receipt.kind !== 'tournament_reward' || receipt.uid !== stableUid || receipt.roomId !== roomId) {
      throw new HttpsError('permission-denied', 'reward_receipt_invalid');
    }
    if (!roomSnap.exists || !['rewards', 'closed'].includes(sanitizeString(roomSnap.data()?.state, 20))) {
      throw new HttpsError('failed-precondition', 'room_not_finalized');
    }
    const reward = receipt.reward && typeof receipt.reward === 'object' ? receipt.reward as Row : {};
    const gems = Math.max(0, readInt(reward.gems, 0));
    const tickets = Math.max(0, readInt(reward.tickets, 0));
    const titleId = sanitizeString(reward.titleId, 60);
    if (receipt.claimed === true) {
      return { ok: true, alreadyClaimed: true, place: readInt(receipt.place, 0), gems, tickets, titleId: titleId || null };
    }
    const nowMs = requestedNowMs ?? Date.now();
    if (gems > 0) {
      tx.set(userRef, {
        shards: admin.firestore.FieldValue.increment(gems),
        shards_updated_at_ms: nowMs,
        shards_updated_op: 'earn',
        shards_updated_reason: 'tournament_prize',
      }, { merge: true });
      tx.set(userRef.collection('shard_log').doc(`tournament_prize_${roomId}`), {
        ts: new Date(nowMs).toISOString(),
        type: 'earn',
        amount: gems,
        reason: 'tournament_prize',
        roomId,
        place: readInt(receipt.place, 0),
      });
    }
    if (tickets > 0) tx.set(ticketsRef, { count: admin.firestore.FieldValue.increment(tickets), updatedAt: nowMs }, { merge: true });
    if (titleId) {
      tx.set(userRef, {
        tournament_title: titleId,
        tournament_titles_won: admin.firestore.FieldValue.increment(1),
      }, { merge: true });
    }
    tx.set(receiptRef, { claimed: true, claimedAtMs: nowMs }, { merge: true });
    return {
      ok: true,
      alreadyClaimed: false,
      place: readInt(receipt.place, 0),
      gems,
      tickets,
      titleId: titleId || null,
      pending: reward.pending || {},
      claimedAtMs: nowMs,
    };
  });
}

export const tournamentClaimReward = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUid(db, request.auth.uid);
  await assertNotBanned(db, stableUid);
  const roomId = sanitizeString(request.data?.roomId, 160);
  if (!roomId) throw new HttpsError('invalid-argument', 'room_required');
  return tournamentClaimTransaction(db, stableUid, roomId, undefined, request.auth.uid);
});

// ── Турнир по требованию: обычная комната, создаваемая мгновенно ────────────

/**
 * Старт комнаты после создания. Не ноль: экран лобби должен успеть
 * отрисовать состав, иначе игрок видит мигание «пусто → 16 игроков».
 */
/**
 * Мгновенный турнир: играть можно в любое время, сколько угодно раз.
 *
 * зачем 2026-07-27 (владелец): «сделай, чтобы без расписания было доступно
 * начать игру в турнире в любое время» + «убери ограничение на количество игр
 * в слот». Штатные комнаты создаёт крон tournamentCreateRooms только внутри
 * окна слота — вне окна комнаты просто НЕТ, и любая кнопка упиралась бы в
 * room_not_found. Поэтому комнату собираем здесь и сразу целиком.
 *
 * ВАЖНО (прямое требование владельца): это ОБЫЧНЫЙ турнир, а не дев-режим —
 * служебный флаг здесь не ставится и дев-логика не используется. Комната идентична
 * штатной: те же задания из пула, те же боты, тот же ход раундов и наград.
 * Разница только в том, что она рождается по нажатию, а не по расписанию.
 *
 * Ограничение «один турнир на слот» её не касается по построению: у комнаты
 * собственный slotId с меткой времени, поэтому slotKey каждый раз новый и
 * маркер tournament_last_slot_key никогда не совпадает. Отдельного обхода
 * лимита в транзакции входа не потребовалось.
 *
 * Стоимость: одна запись батчем на турнир, никаких пустых документов заранее.
 */
// зачем 2026-07-27: HOT_CALLABLE_OPTIONS даёт timeout 15с и здесь стоял
// maxInstances: 1 — под мгновенный турнир это мало. Функция делает несколько
// чтений пула, батч из комнаты + до 16 секретов заданий и ТРАНЗАКЦИЮ входа;
// на холодном старте 15с реально не хватает, и игрок получает «Не удалось
// войти» на исправном сервере. maxInstances: 1 к тому же ставил второго
// игрока в очередь за первым — второй ждал и отваливался по таймауту.
// 60с + 10 инстансов: расход тот же (платим за использование, не за лимит),
// но вход перестаёт падать на ровном месте.
// Current contract (2026-07-28): this callable is a signed-in-user test surface.
// It is independent of the production schedule and snapshots a zero-value
// economy so repeated tests cannot affect paid play or rankings.
export const tournamentStartNow = onCall(
  {
    ...HOT_CALLABLE_OPTIONS,
    region: 'europe-west1',
    enforceAppCheck: false,
    timeoutSeconds: 60,
    minInstances: 1,
    maxInstances: 10,
  },
  async (request) => {
    try {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const authUid = request.auth.uid;
    if (!tournamentTestModeReleaseEnabled()) {
      throw new HttpsError('failed-precondition', 'tournament_testing_disabled');
    }
    const db = admin.firestore();
    const nowMs = Date.now();
    const { config, stableUid, resources, economy: economySnap } =
      await loadTournamentStartNowPrerequisites({
        loadConfig: () => loadScheduleConfig(db),
        resolveStableUid: () => resolveStableUid(db, authUid),
        assertNotBanned: (uid) => assertNotBanned(db, uid),
        loadResources: () => loadResourcePool(db),
        loadEconomy: () => db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('economy').get(),
      });
    const economySnapshot = tournamentEconomySnapshotForMode(economySnap.data(), true);
    const slot = config.slots.find((candidate) => candidate.enabled) ?? config.slots[0] ?? {
      slotId: 'instant-test',
      localTime: '00:00',
      timezone: 'UTC',
      ticketsRequired: 0,
      enabled: true,
    };
    if (resources.bots.length < TOURNAMENT_ROOM_SIZE - 1) {
      throw new HttpsError('failed-precondition', 'not_enough_bots');
    }

    // Комната собирается за одну операцию: боты, раунды и секреты заданий пишутся
    // сразу, комната ready. Старт через 12 секунд — ровно чтобы экран лобби успел
    // показать состав и не мигнул.
    const startsAt = nowMs + TOURNAMENT_ROOM_GATHER_MS + TOURNAMENT_BOT_FILL_WINDOW_MS;
    const dateKey = dateKeyInTimezone(nowMs, slot.timezone);
    // Своя метка времени в slotId: комната не конфликтует с комнатой расписания
    // и не занимает игроку его штатный слот.
    const roomId = tournamentRoomId(`now-${slot.slotId}-${nowMs}`, slot.timezone, dateKey);

    // Пул проверяем ДО создания: без опубликованных ИИ-вопросов комната
    // отменилась бы после входа — лучше честная ошибка до списания жемчужин.
    const rounds = buildRounds(roomId, resources.tasks);
    if (!rounds) {
      throw new HttpsError('failed-precondition', 'no_published_ai_tasks');
    }

    // Боты: комнату заполняем целиком, одно место оставляем живому игроку.
    const taskMap = new Map(resources.tasks.map((task) => [task.taskId, task]));
    const selectedTasks = Array.from(new Set(rounds.flatMap((round) => round.taskIds)))
      .map((taskId) => taskMap.get(taskId))
      .filter((task): task is TournamentTask => !!task);

    const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
    const room: TournamentRoomDoc = {
      economySnapshot,
      roomId,
      testMode: true,
      // зачем: собственный slotId с меткой времени — именно он снимает лимит
      // «один турнир на слот в день». slotKey в транзакции входа собирается как
      // `${slotId}_${дата}`, поэтому у каждого турнира по требованию он свой и
      // маркер профиля никогда не совпадает: играть можно сколько угодно раз.
      slotId: `now-${slot.slotId}-${nowMs}`,
      seed: roomId,
      state: 'lobby',
      startsAt,
      players: [],
      rounds,
      participantAuthUids: [],
      participantAuthUidsComplete: true,
      stateStartedAtMs: nowMs,
      stateDeadlineAtMs: startsAt,
      version: 0,
      createdAtMs: nowMs,
      expireAtMs: startsAt + TOURNAMENT_ROOM_TTL_MS,
    };

    // Батч вместо серии запросов: комната + секреты заданий + метаданные ботов
    // уезжают одним round-trip — это и есть «за секунду».
    const recentRef = recentBotRosterRef(db);
    const userRef = db.collection('users').doc(stableUid);
    const configRef = db.collection(TOURNAMENT_SCHEDULE_COLLECTION)
      .doc(TOURNAMENT_SCHEDULE_CONFIG_DOC);
    const economyRef = db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('economy');
    const authLinkRef = db.collection('auth_links').doc(authUid);
    const bannedRef = db.collection('banned_users').doc(stableUid);
    const leaderboardRef = db.collection('leaderboard').doc(stableUid);
    const publicProfileRef = db.collection('public_profiles').doc(stableUid);
    const joined = await db.runTransaction(async (tx) => {
      const [recentSnap, userSnap, currentEconomySnap, currentConfigSnap,
        authLinkSnap, bannedSnap, leaderboardSnap, publicProfileSnap] = await tx.getAll(
        recentRef, userRef, economyRef, configRef, authLinkRef, bannedRef,
        leaderboardRef, publicProfileRef,
      );
      assertTransactionalTournamentAccess(
        authUid, stableUid, authLinkSnap, userSnap, bannedSnap,
      );
      const taskPoolGeneration = await assertTournamentPoolCommitAllowed(
        tx, db, {
          generation: resources.taskPoolGeneration,
          revision: resources.taskPoolRevision,
        },
      );
      const botPlan = buildBotReservationPlan({
        profiles: resources.bots,
        roomId,
        count: TOURNAMENT_ROOM_SIZE - 1,
        gatherStartedAtMs: nowMs,
        recentBotIds: readRecentBotProfileIds(recentSnap.data()),
      });
      if (botPlan.players.length !== TOURNAMENT_ROOM_SIZE - 1) {
        throw new HttpsError('failed-precondition', 'not_enough_bots');
      }
      const lobbyEvents = botArrivalPotEvents(botPlan.players, 0, economySnapshot.botEntryGems);
      const joinedPlan = planTournamentStartNowJoinedRoom({
        room: {
          ...room,
          taskPoolGeneration,
          players: botPlan.players,
          potGems: lobbyEvents.at(-1)?.potGemsAfter ?? 0,
          lobbyEvents,
          stateDeadlineAtMs: botPlan.fillDeadlineAtMs,
          ticketsRequired: 0,
          ready: true,
        },
        authUid,
        stableUid,
        user: userSnap.data() || {},
        publicProfile: publicProfileSnap.exists ? publicProfileSnap.data() || {} : {},
        leaderboardProfile: leaderboardSnap.exists ? leaderboardSnap.data() || {} : {},
        profileHint: request.data?.profile,
        config: currentConfigSnap.exists
          ? normalizeTournamentSchedule(currentConfigSnap.data())
          : normalizeTournamentSchedule(null),
        currentEconomy: currentEconomySnap.data(),
        selectedTasks,
        botMetadata: botPlan.metadata,
        nowMs,
        testModeReleaseEnabled: tournamentTestModeReleaseEnabled(),
      });
      tx.create(roomRef, {
      ...joinedPlan.room,
      timezone: slot.timezone,
      readyAtMs: nowMs,
      // зачем: комната создана «под игрока», который сейчас в неё войдёт. Крон
      // добора ботами отсчитывает окно сбора от этого момента — состав уже полон,
      // поэтому добирать нечего, но поле держим заполненным для единообразия.
      gatherStartedAtMs: nowMs,
      featureGates: tournamentFeatureGates(),
      expireAt: admin.firestore.Timestamp.fromMillis(startsAt + TOURNAMENT_ROOM_TTL_MS),
    });
      for (const task of selectedTasks) {
        tx.create(roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(task.taskId), task);
      }
      tx.create(
        roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC),
        joinedPlan.botMetadata,
      );
      tx.set(recentRef, recentBotRosterData(roomId, botPlan.selectedProfileIds, nowMs));
      return joinedPlan.joinResult;
    });

    return { ok: true, roomId, startsAt, ...joined };
    } catch (error) {
      if (!(error instanceof HttpsError)) {
        console.error(
          '[tournaments] tournamentStartNow internal failure',
          tournamentStartNowInternalErrorLog(error),
        );
      }
      throw error;
    }
  },
);


// ── Разбор ответов после турнира ────────────────────────────────────────────

/**
 * Что игрок ответил, что было верно и почему.
 *
 * зачем (владелец 2026-07-27): «после турнира можно смотреть свои ответы,
 * ошибки и правильные варианты, чтобы проанализировать» — как было в арене.
 *
 * БЕЗОПАСНОСТЬ: правильные ответы живут в taskSecrets, закрытых от клиента.
 * Отдаём их ТОЛЬКО когда турнир окончен (results/rewards/closed) и ТОЛЬКО
 * свои: во время игры это был бы чит, а чужие ответы не нужны никому.
 */
export const tournamentRoundReview = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'auth_required');
  const roomId = sanitizeString((request.data as { roomId?: unknown })?.roomId, 140);
  if (!roomId) throw new HttpsError('invalid-argument', 'room_required');

  const db = admin.firestore();
  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  // ЧТЕНИЕ БЕЗ ТРАНЗАКЦИИ ОСОЗНАННО: разбор ничего не меняет — ни очков, ни
  // состояния комнаты. Транзакция нужна мутациям (submit/fill/finalize), а
  // здесь она была бы лишней блокировкой на горячем документе.
  const reviewRoomSnap = await roomRef.get();
  if (!reviewRoomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
  const room = readRoom(reviewRoomSnap);

  // Разбор доступен только после игры: во время раунда это подсказка.
  if (!['final', 'results', 'rewards', 'closed'].includes(room.state)) {
    throw new HttpsError('failed-precondition', 'tournament_not_finished');
  }
  if (room.state === 'rewards' || room.state === 'closed') {
    const legacyFinalizedAtMs = room.finalizedAtMs ?? room.stateStartedAtMs;
    const reviewRetentionUntilMs = room.reviewRetentionUntilMs
      ?? (legacyFinalizedAtMs ? legacyFinalizedAtMs + TOURNAMENT_REVIEW_RETENTION_MS : 0);
    if (reviewRetentionUntilMs <= 0 || Date.now() >= reviewRetentionUntilMs) {
      throw new HttpsError('failed-precondition', 'tournament_review_expired');
    }
  }

  // Игрок ищется по стабильному uid — тому же, что при отправке ответов
  // (анонимный аккаунт мог быть связан с почтой, id при этом не меняется).
  const playerId = await resolveStableUid(db, uid);
  const player = room.players.find((entry) => !entry.isBot && entry.id === playerId);
  if (!player) throw new HttpsError('permission-denied', 'not_a_participant');

  // Собираем свои ответы по всем раундам.
  const reviewed: Array<Record<string, unknown>> = [];
  const neededTaskIds: string[] = [];
  for (const round of room.rounds) {
    const result = (round.results || {})[playerId] as
      {
        review?: Array<{ taskId: string; correct: boolean; given?: unknown; timedOut?: boolean }>;
        submissionStatus?: string;
        timedOut?: boolean;
      } | undefined;
    const persistedReview = result?.review ?? [];
    // Rooms finalized before full timeout review rows were persisted can still
    // be reviewed while their frozen evidence is retained. Only an explicitly
    // fully timed-out result is eligible; submitted/partial results never have
    // missing choices inferred here.
    const roundReview = persistedReview.length > 0
      ? persistedReview
      : result?.submissionStatus === 'timed_out' || result?.timedOut === true
        ? round.taskIds.map((taskId) => ({ taskId, correct: false, timedOut: true }))
        : [];
    for (const entry of roundReview) {
      neededTaskIds.push(entry.taskId);
      reviewed.push({ roundNo: round.roundNo, ...entry });
    }
  }
  if (reviewed.length === 0) return { ok: true, items: [] };

  // Задания с ответами — из секретов комнаты (не из общего пула: задание могло
  // быть отредактировано после турнира, а разбор обязан показать сыгранное).
  const uniqueIds = Array.from(new Set(neededTaskIds));
  const secretSnaps = await db.getAll(
    ...uniqueIds.map((taskId) => roomRef.collection(TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(taskId)),
  );
  const secrets = new Map<string, FirebaseFirestore.DocumentData>();
  for (const snap of secretSnaps) {
    if (snap.exists) secrets.set(snap.id, snap.data() || {});
  }
  if (secrets.size !== uniqueIds.length) {
    throw new HttpsError('failed-precondition', 'tournament_review_evidence_unavailable');
  }

  const items = reviewed.map((entry) => {
    const task = secrets.get(String(entry.taskId));
    const payload = (task?.payload || {}) as Record<string, unknown>;
    // Preserve the frozen explanation exactly as authored. A missing
    // wrongOptionReasons field marks a pre-rollout room; never invent review
    // text for historical rooms.
    const reviewExplanation = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return null;
      const wrongOptionReasons = Array.isArray((raw as Row).wrongOptionReasons)
        ? ((raw as Row).wrongOptionReasons as unknown[]).map((reason: unknown) => sanitizeString(reason, 600))
        : undefined;
      return {
        ruleNote: sanitizeString((raw as Row).ruleNote, 600),
        example: sanitizeString((raw as Row).example, 600),
        ...(wrongOptionReasons ? { wrongOptionReasons } : {}),
      };
    };
    const aggregateItems = task?.mode === 'time_attack'
      && Array.isArray(payload.items)
      ? payload.items.map((rawItem, index) => {
        const part = rawItem && typeof rawItem === 'object' ? rawItem as Row : {};
        const options = Array.isArray(part.options)
          ? part.options.map((option) => sanitizeString(option, 300)).filter(Boolean)
          : [];
        const correctIndex = Number.isInteger(part.correctIndex)
          && Number(part.correctIndex) >= 0
          && Number(part.correctIndex) < options.length
          ? Number(part.correctIndex)
          : null;
        const selectedIndexes = entry.given && typeof entry.given === 'object'
          ? (entry.given as Row).selectedIndexes
          : null;
        const selectedIndex = Array.isArray(selectedIndexes)
          && Number.isInteger(selectedIndexes[index])
          && Number(selectedIndexes[index]) >= 0
          && Number(selectedIndexes[index]) < options.length
          ? Number(selectedIndexes[index])
          : null;
        const partExplanation = reviewExplanation(part.explanation);
        return {
          prompt: sanitizeString(part.prompt, 600),
          options,
          correctIndex,
          selectedIndex,
          correct: correctIndex !== null && selectedIndex === correctIndex,
          explanation: partExplanation,
        };
      })
      : null;
    // A speed-match field is one six-pair mapping, not six independent
    // multiple-choice questions. Return only the played mapping and the
    // player's choices; never spread the secret task/payload into the review.
    const speedMatchPairs = task?.mode === 'speed_match' && Array.isArray(payload.items)
      ? payload.items.map((rawItem, index) => {
        const part = rawItem && typeof rawItem === 'object' ? rawItem as Row : {};
        const options = Array.isArray(part.options)
          ? part.options.map((option) => sanitizeString(option, 300))
          : [];
        const correctIndex = Number.isInteger(part.correctIndex)
          && Number(part.correctIndex) >= 0
          && Number(part.correctIndex) < options.length
          ? Number(part.correctIndex)
          : null;
        const selectedIndexes = entry.given && typeof entry.given === 'object'
          ? (entry.given as Row).selectedIndexes
          : null;
        const selectedIndex = Array.isArray(selectedIndexes)
          && Number.isInteger(selectedIndexes[index])
          && Number(selectedIndexes[index]) >= 0
          && Number(selectedIndexes[index]) < options.length
          ? Number(selectedIndexes[index])
          : null;
        const partExplanation = reviewExplanation(part.explanation);
        return {
          english: sanitizeString(part.prompt, 600),
          selectedRussian: selectedIndex === null ? null : options[selectedIndex] || null,
          correctRussian: correctIndex === null ? '' : options[correctIndex] || '',
          correct: correctIndex !== null && selectedIndex === correctIndex,
          selectedTrapReason: selectedIndex === null || selectedIndex === correctIndex
            ? null
            : partExplanation?.wrongOptionReasons?.[selectedIndex] || null,
          explanation: partExplanation,
        };
      })
      : null;
    return {
      roundNo: entry.roundNo,
      taskId: entry.taskId,
      mode: String(task?.mode ?? ''),
      correct: entry.correct === true,
      given: entry.given ?? null,
      ...(entry.timedOut === true ? { timedOut: true } : {}),
      // Всё нужное для показа карточки: сам вопрос и верный ответ.
      phrase: String(payload.phrase ?? ''),
      options: Array.isArray(payload.options) ? payload.options : [],
      correctIndex: typeof payload.correctIndex === 'number' ? payload.correctIndex : null,
      correctTokens: Array.isArray(payload.correctTokens) ? payload.correctTokens : [],
      audioUri: String(payload.audioUri ?? ''),
      explanation: reviewExplanation(task?.explanation),
      ...(aggregateItems ? {
        aggregatePrompt: sanitizeString(payload.prompt, 600),
        aggregateItems,
      } : {}),
      ...(speedMatchPairs ? { speedMatchPairs } : {}),
    };
  });

  return { ok: true, items };
});
