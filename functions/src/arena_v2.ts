import * as admin from 'firebase-admin';
import { createHash, createHmac, randomBytes } from 'crypto';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import {
  type TournamentTask,
  applySpeedMatchAttempt,
  validateTournamentTaskForNewRoom,
} from './tournament_core';
import {
  NEW_TOURNAMENT_POOL_CONTENT_SHA256,
  NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256,
  NEW_TOURNAMENT_POOL_VERSION,
  verifyTournamentPoolTaskProof,
} from './tournament_pool_v2_factory';
import {
  ARENA_V2_ACCEPT_MS,
  ARENA_V2_ANSWER_MS,
  ARENA_V2_COLLECTIONS,
  ARENA_V2_COUNTDOWN_MS,
  ARENA_V2_INVITE_TTL_MS,
  ARENA_V2_MATCH_TTL_MS,
  ARENA_V2_MAX_TASK_DOC_READS,
  ARENA_V2_MODE_ORDER,
  ARENA_V2_QUICK_BOT_FALLBACK_MS,
  ARENA_V2_QUEUE_LEASE_MS,
  ARENA_V2_READING_MS,
  ARENA_V2_REVEAL_MS,
  type ArenaV2AnswerReceipt,
  type ArenaFirestoreSpeedProgress,
  type ArenaV2Mode,
  type ArenaV2Outcome,
  type ArenaV2PrivateEnvelope,
  type ArenaV2QueueMode,
  arenaDailyMultiplier,
  decodeArenaSpeedProgress,
  encodeArenaSpeedProgress,
  arenaDifficultyPlan,
  arenaAcceptanceOpen,
  buildArenaBotBlueprint,
  arenaRankIndexFromRp,
  arenaObservedElapsedMs,
  arenaRanksCompatible,
  arenaRareSpin,
  arenaRpDelta,
  arenaSeasonLevelUnlocked,
  arenaSeasonReward,
  arenaSeasonStars,
  arenaSeasonWindow,
  arenaTaskDurationMs,
  arenaTaskStars,
  resolveArenaOutcome,
  scoreArenaAnswer,
  scoreArenaSpeedProgress,
  selectArenaTasks,
  toArenaPublicTask,
  validateArenaPrivateEnvelope,
} from './arena_v2_core';

const ARENA_V2_SECRET_NAMES = [
  'ARENA_V2_PAIR_HMAC_KEY',
  'ARENA_V2_INVITE_HMAC_KEY',
  'ARENA_V2_SPIN_HMAC_KEY',
];

const ARENA_V2_CALLABLE_OPTIONS = {
  ...HOT_CALLABLE_OPTIONS,
  secrets: ARENA_V2_SECRET_NAMES,
};
import {
  ARENA_EXPANSION_COLLECTIONS,
  ARENA_LAB_TTL_MS,
  ARENA_MASTERY_SIGNATURE_TTL_MS,
  arenaApplyMasteryObservations,
  arenaCanonicalTaskSignature,
  arenaLabTask,
  arenaMasteryObservation,
  arenaRivalSeriesAfterGame,
  arenaRunEligibility,
  arenaSanitizeAnswerSnapshot,
  type ArenaMasteryMode,
  type ArenaMasteryProfileState,
} from './arena_expansion_core';

type Json = Record<string, any>;

type ArenaActor = {
  authUid: string;
  stableUid: string;
  user: Json;
};

type MatchPrivate = ArenaV2PrivateEnvelope & {
  participantStableUids: string[];
  participantAuthUids: string[];
  seatByStableUid: Record<string, 'a' | 'b'>;
  authByStableUid: Record<string, string>;
  answers: Record<string, Record<string, ArenaV2AnswerReceipt>>;
  speedProgress: Record<string, Record<string, ArenaFirestoreSpeedProgress>>;
  speedAttempts: Record<string, Record<string, {
    correct: boolean;
    points: number;
    taskIndex: number;
    pairIndex: number;
    selectedIndex: number;
  }>>;
  totals: Record<string, {
    score: number;
    elapsedMs: number;
    correct: number;
    fullySolved: number;
    rawSeasonStars: number;
    submittedAnswers: number;
  }>;
  botPlan?: Record<string, {
    correct: boolean;
    elapsedMs: number;
    timedOut: boolean;
    matchedPairs: number;
    wrongAttempts: number;
  }>;
  botSeed?: string;
  botSeedCommitment?: string;
  pairLimitId?: string;
  pairLimitCommitted?: boolean;
  rewardsByStableUid?: Record<string, Json>;
  settledAtMs?: number;
  runKind?: 'match' | 'rival';
  seriesId?: string;
  gameIndex?: number;
  expansionFlags?: {
    wallet: boolean;
    lab: boolean;
    mastery: boolean;
    partner: boolean;
  };
};

const db = admin.firestore();
const MAX_SPEED_ATTEMPT_IDS = 40;
const CLEANUP_BATCH_LIMIT = 100;
let configCache: { loadedAtMs: number; data: Json } | null = null;

function nowMs(): number {
  return Date.now();
}

function timestamp(ms: number): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromMillis(ms);
}

function safeId(value: unknown, field: string, max = 160): string {
  const id = String(value ?? '').trim();
  if (!id || id.length > max || !/^[A-Za-z0-9_.:@-]+$/.test(id)) {
    throw new HttpsError('invalid-argument', `${field}_invalid`);
  }
  return id;
}

function int(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new HttpsError('invalid-argument', `${field}_invalid`);
  }
  return Number(value);
}

function comparableVersion(value: unknown): [number, number, number] | null {
  const match = String(value ?? '').trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function versionAtLeast(actualValue: unknown, minimumValue: unknown): boolean {
  const actual = comparableVersion(actualValue);
  const minimum = comparableVersion(minimumValue);
  if (!actual || !minimum) return false;
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] !== minimum[index]) return actual[index] > minimum[index];
  }
  return true;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function randomId(bytes = 18): string {
  return randomBytes(bytes).toString('base64url');
}

function currentSeason(now: number): { seasonId: string; endsAtMs: number } {
  const season = arenaSeasonWindow(now);
  return { seasonId: season.seasonId, endsAtMs: season.endsAtMs };
}

function utcDayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function previousUtcDayKey(now: number): string {
  return utcDayKey(now - 24 * 60 * 60 * 1_000);
}

function pairLimitId(leftUid: string, rightUid: string, dayKey: string): string {
  const key = String(process.env.ARENA_V2_PAIR_HMAC_KEY ?? '').trim();
  if (!key) throw new HttpsError('failed-precondition', 'arena_ranked_pair_key_unavailable');
  const pair = [leftUid, rightUid].sort().join('|');
  return `${createHmac('sha256', key).update(pair).digest('hex')}_${dayKey}`;
}

function memberRef(matchId: string, authUid: string): admin.firestore.DocumentReference {
  return db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId)
    .collection(ARENA_V2_COLLECTIONS.members).doc(authUid);
}

function memberMarker(matchId: string, authUid: string, seatId: 'a' | 'b', now: number): Json {
  return {
    schemaVersion: 'arena-v2-member.v1', matchId, authUid, seatId, createdAtMs: now,
    expireAt: timestamp(now + ARENA_V2_MATCH_TTL_MS),
  };
}

async function actor(request: { auth?: { uid?: string } }): Promise<ArenaActor> {
  const authUid = String(request.auth?.uid ?? '').trim();
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const stableUid = await resolveStableUidForAuth(db, authUid, undefined, {
    requireKnownIdentity: true,
    repairLinks: false,
  });
  const userSnap = await db.collection('users').doc(stableUid).get();
  if (!userSnap.exists) throw new HttpsError('failed-precondition', 'stable_identity_missing');
  const user = userSnap.data() ?? {};
  if (user.hidden === true || user.deleted === true || user.banned === true) {
    throw new HttpsError('permission-denied', 'arena_access_denied');
  }
  const ownerAuthUid = String(user.firebaseAuthUid ?? '').trim();
  if (ownerAuthUid && ownerAuthUid !== authUid) {
    throw new HttpsError('permission-denied', 'stable_identity_mismatch');
  }
  return { authUid, stableUid, user };
}

type ArenaFeature = 'home' | 'quick' | 'ranked' | 'friend' | 'rewards' | 'spin';

async function arenaActor(
  request: { auth?: { uid?: string }; data?: Json },
  feature: ArenaFeature,
  recovery = false,
): Promise<ArenaActor> {
  const now = nowMs();
  if (!configCache || now - configCache.loadedAtMs > 15_000) {
    const snap = await db.collection(ARENA_V2_COLLECTIONS.config).doc('current').get();
    if (!snap.exists) throw new HttpsError('failed-precondition', 'arena_config_missing');
    configCache = { loadedAtMs: now, data: snap.data() ?? {} };
  }
  const config = configCache.data;
  if (config.schemaVersion !== 'arena-v2-config.v1'
    || config.productConfigVersion !== 'arena-v2-product.v1'
    || config.contentPublication?.poolVersion !== NEW_TOURNAMENT_POOL_VERSION
    || config.contentPublication?.manifestSha256 !== NEW_TOURNAMENT_POOL_CONTENT_SHA256) {
    throw new HttpsError('failed-precondition', 'arena_config_incompatible');
  }
  if (!versionAtLeast(request.data?.clientVersion, config.minClientVersion)) {
    throw new HttpsError('failed-precondition', 'arena_client_update_required');
  }
  const flag = feature === 'quick' ? 'quickEnabled' : feature === 'ranked' ? 'rankedEnabled'
    : feature === 'friend' ? 'friendEnabled' : feature === 'rewards' ? 'rewardsEnabled'
      : feature === 'spin' ? 'spinEnabled' : 'enabled';
  if (!recovery && (config.enabled !== true || config[flag] !== true)) {
    throw new HttpsError('failed-precondition', 'arena_disabled');
  }
  return actor(request);
}

function playerSnapshot(stableUid: string, user: Json, profile: Json, isBot = false): Json {
  return {
    uid: stableUid,
    name: String(user.displayName ?? user.name ?? profile.name ?? (isBot ? 'Arena Bot' : 'Player')).slice(0, 48),
    ...(typeof user.avatar === 'string' ? { avatar: user.avatar.slice(0, 256) } : {}),
    ...(typeof user.aura === 'string' ? { aura: user.aura.slice(0, 128) } : {}),
    rank: Math.max(0, Math.min(23, Math.trunc(Number(profile.rank ?? 0)))),
    rating: Math.max(0, Math.trunc(Number(profile.rating ?? 0))),
    score: 0,
    correct: 0,
    ...(isBot ? { isBot: true } : {}),
  };
}

function profileDefaults(stableUid: string, data?: Json): Json {
  const rating = Math.max(0, Math.trunc(Number(data?.rating ?? 0)));
  return {
    uid: stableUid,
    rating,
    rank: arenaRankIndexFromRp(rating),
    wins: Math.max(0, Math.trunc(Number(data?.wins ?? 0))),
    losses: Math.max(0, Math.trunc(Number(data?.losses ?? 0))),
    draws: Math.max(0, Math.trunc(Number(data?.draws ?? 0))),
    matches: Math.max(0, Math.trunc(Number(data?.matches ?? 0))),
    spinPity: Math.max(0, Math.trunc(Number(data?.spinPity ?? 0))),
    activeMatchId: typeof data?.activeMatchId === 'string' ? data.activeMatchId : null,
  };
}

async function loadArenaTaskPool(
  tx: admin.firestore.Transaction,
  divisionIndex: number,
  seed: string,
): Promise<readonly TournamentTask[]> {
  const difficulties = arenaDifficultyPlan(divisionIndex);
  const required = new Map<string, { mode: string; difficulty: number; count: number }>();
  ARENA_V2_MODE_ORDER.forEach((mode, index) => {
    const difficulty = difficulties[index];
    const key = `${mode}:${difficulty}`;
    const cell = required.get(key) ?? { mode, difficulty, count: 0 };
    cell.count += 1;
    required.set(key, cell);
  });
  const prefixes: Record<string, string> = {
    guess_phrase: 'guess', fill_gap: 'gap', find_oddity: 'odd',
    translate_build: 'build', speed_match: 'pairs',
  };
  const tasks: TournamentTask[] = [];
  for (const cell of required.values()) {
    const prefix = `tp2_20260801_v10_${prefixes[cell.mode]}_d${cell.difficulty}_`;
    const cursor = `${prefix}${createHash('sha1').update(`${seed}|${cell.mode}|${cell.difficulty}`).digest('hex')}`;
    const base = db.collection(ARENA_V2_COLLECTIONS.taskSource)
      .where('poolVersion', '==', NEW_TOURNAMENT_POOL_VERSION)
      .where('mode', '==', cell.mode)
      .where('difficulty', '==', cell.difficulty)
      .orderBy(admin.firestore.FieldPath.documentId());
    const after = await tx.get(base.startAt(cursor).limit(cell.count));
    const docs = [...after.docs];
    if (docs.length < cell.count) {
      const wrapped = await tx.get(base.endBefore(cursor).limit(cell.count - docs.length));
      docs.push(...wrapped.docs);
    }
    if (docs.length !== cell.count) throw new HttpsError('unavailable', 'arena_task_pool_insufficient');
    for (const doc of docs) {
      const raw = { ...doc.data(), taskId: String(doc.data().taskId || doc.id) } as TournamentTask;
      const publication = (raw as TournamentTask & { arenaPublication?: {
        poolContentSha256?: string; merkleRootSha256?: string;
      } }).arenaPublication;
      if (!validateTournamentTaskForNewRoom(raw).ok || raw.mode !== cell.mode
        || raw.difficulty !== cell.difficulty
        || publication?.poolContentSha256 !== NEW_TOURNAMENT_POOL_CONTENT_SHA256
        || publication?.merkleRootSha256 !== NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256
        || !verifyTournamentPoolTaskProof(raw, NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256)) {
        throw new HttpsError('failed-precondition', 'arena_task_publication_invalid');
      }
      const { arenaPublication: _publicationProof, ...verifiedTask } = raw as TournamentTask & {
        arenaPublication: unknown;
      };
      tasks.push(verifiedTask as TournamentTask);
    }
  }
  if (tasks.length > ARENA_V2_MAX_TASK_DOC_READS) {
    throw new HttpsError('resource-exhausted', 'arena_task_read_budget_exceeded');
  }
  return tasks;
}

function selectedTaskEnvelope(
  matchId: string,
  pool: readonly TournamentTask[],
  now: number,
  divisionIndex: number,
): MatchPrivate {
  const tasks = selectArenaTasks(pool, matchId, divisionIndex);
  if (!tasks) throw new HttpsError('unavailable', 'arena_task_pool_insufficient');
  const envelope: MatchPrivate = {
    matchId,
    tasks,
    participantStableUids: [],
    participantAuthUids: [],
    seatByStableUid: {},
    authByStableUid: {},
    answers: {},
    speedProgress: {},
    speedAttempts: {},
    totals: {},
    createdAtMs: now,
    expireAt: timestamp(now + ARENA_V2_MATCH_TTL_MS),
  };
  const validation = validateArenaPrivateEnvelope(envelope);
  if (!validation.ok) throw new HttpsError('resource-exhausted', validation.reason);
  return envelope;
}

function makeMatch(input: {
  matchId: string;
  mode: ArenaV2Mode;
  left: Json;
  right: Json;
  leftAuthUid: string;
  rightAuthUid?: string;
  privateEnvelope: MatchPrivate;
  now: number;
  bot?: boolean;
  botSeed?: string;
}): { publicDoc: Json; privateDoc: MatchPrivate } {
  const participantStableUids = [String(input.left.uid), String(input.right.uid)];
  const participantAuthUids = [input.leftAuthUid, ...(input.rightAuthUid ? [input.rightAuthUid] : [])];
  const privateDoc = clone(input.privateEnvelope);
  privateDoc.participantStableUids = participantStableUids;
  privateDoc.participantAuthUids = participantAuthUids;
  privateDoc.seatByStableUid = {
    [participantStableUids[0]]: 'a',
    [participantStableUids[1]]: 'b',
  };
  privateDoc.authByStableUid = {
    [String(input.left.uid)]: input.leftAuthUid,
    ...(input.rightAuthUid ? { [String(input.right.uid)]: input.rightAuthUid } : {}),
  };
  privateDoc.answers = Object.fromEntries(participantStableUids.map((uid) => [uid, {}]));
  privateDoc.speedProgress = Object.fromEntries(participantStableUids.map((uid) => [uid, {}]));
  privateDoc.speedAttempts = Object.fromEntries(participantStableUids.map((uid) => [uid, {}]));
  privateDoc.totals = Object.fromEntries(participantStableUids.map((uid) => [uid, {
    score: 0, elapsedMs: 0, correct: 0, fullySolved: 0, rawSeasonStars: 0, submittedAnswers: 0,
  }]));
  privateDoc.expansionFlags = {
    wallet: configCache?.data.enabled === true && configCache?.data.arenaExpansionEnabled === true,
    lab: configCache?.data.enabled === true && configCache?.data.arenaExpansionEnabled === true
      && configCache?.data.arenaMatchLabEnabled === true,
    mastery: configCache?.data.enabled === true && configCache?.data.arenaExpansionEnabled === true
      && configCache?.data.arenaMasteryEnabled === true,
    partner: configCache?.data.enabled === true && configCache?.data.arenaExpansionEnabled === true
      && configCache?.data.arenaPartnerEnabled === true,
  };
  if (input.bot) {
    if (!input.botSeed) throw new HttpsError('internal', 'arena_bot_seed_missing');
    privateDoc.botSeed = input.botSeed;
    privateDoc.botSeedCommitment = createHmac('sha256', input.botSeed).update(input.matchId).digest('hex');
    privateDoc.botPlan = Object.fromEntries(buildArenaBotBlueprint(
      input.botSeed,
      Number(input.left.rank ?? 0),
      privateDoc.tasks,
    ).map((plan, index) => [String(index), plan]));
  }
  const acceptedBy = input.bot ? ['b'] : [];
  const publicPlayers = [input.left, input.right].map((player, index) => ({
    uid: index === 0 ? 'a' : 'b',
    name: player.name,
    ...(player.avatar ? { avatar: player.avatar } : {}),
    ...(player.aura ? { aura: player.aura } : {}),
    rank: player.rank,
    rating: player.rating,
    score: 0,
    correct: 0,
    ...(player.isBot ? { isBot: true } : {}),
  }));
  const privateValidation = validateArenaPrivateEnvelope(privateDoc);
  if (!privateValidation.ok) throw new HttpsError('resource-exhausted', privateValidation.reason);
  return {
    publicDoc: {
      matchId: input.matchId,
      mode: input.mode,
      opponentKind: input.bot ? 'bot' : 'human',
      players: publicPlayers,
      acceptedBy,
      state: 'accepting',
      version: 1,
      currentTaskIndex: -1,
      submittedBy: [],
      scores: { a: 0, b: 0 },
      stateStartedAtMs: input.now,
      stateDeadlineAtMs: input.now + ARENA_V2_ACCEPT_MS,
      terminal: false,
      createdAtMs: input.now,
      expireAt: timestamp(input.now + ARENA_V2_MATCH_TTL_MS),
    },
    privateDoc,
  };
}

function assertParticipant(match: Json, privateDoc: MatchPrivate, who: ArenaActor): void {
  if (!privateDoc.participantStableUids.includes(who.stableUid)
    || privateDoc.authByStableUid?.[who.stableUid] !== who.authUid) {
    throw new HttpsError('permission-denied', 'arena_match_not_participant');
  }
}

function matchResponse(match: Json, viewerSeat: 'a' | 'b', viewerReward?: Json): Json {
  return {
    ok: true,
    matchId: String(match.matchId),
    state: String(match.state),
    version: Math.trunc(Number(match.version ?? 0)),
    viewerSeat,
    match,
    ...(viewerReward ? { viewerReward } : {}),
  };
}

function taskAnswers(privateDoc: MatchPrivate, taskIndex: number): string[] {
  return Object.entries(privateDoc.answers)
    .filter(([, answers]) => Boolean(answers?.[String(taskIndex)]))
    .map(([uid]) => uid);
}

function refreshPublicTotals(match: Json, privateDoc: MatchPrivate, taskIndex: number): void {
  match.submittedBy = taskAnswers(privateDoc, taskIndex).map((uid) => privateDoc.seatByStableUid[uid]);
  match.scores = Object.fromEntries(Object.entries(privateDoc.totals)
    .map(([uid, total]) => [privateDoc.seatByStableUid[uid], total.score]));
  match.players = (Array.isArray(match.players) ? match.players : []).map((player: Json) => ({
    ...player,
    score: Object.entries(privateDoc.seatByStableUid).find(([, seat]) => seat === player.uid)
      ?.[0] ? privateDoc.totals[Object.entries(privateDoc.seatByStableUid).find(([, seat]) => seat === player.uid)![0]].score : 0,
    correct: Object.entries(privateDoc.seatByStableUid).find(([, seat]) => seat === player.uid)
      ?.[0] ? privateDoc.totals[Object.entries(privateDoc.seatByStableUid).find(([, seat]) => seat === player.uid)![0]].correct : 0,
  }));
}

function storeReceipt(privateDoc: MatchPrivate, stableUid: string, receipt: ArenaV2AnswerReceipt): void {
  const key = String(receipt.taskIndex);
  if (privateDoc.answers[stableUid]?.[key]) return;
  privateDoc.answers[stableUid] ??= {};
  privateDoc.answers[stableUid][key] = receipt;
  privateDoc.totals[stableUid] ??= {
    score: 0, elapsedMs: 0, correct: 0, fullySolved: 0, rawSeasonStars: 0, submittedAnswers: 0,
  };
  privateDoc.totals[stableUid].score += receipt.points;
  if (receipt.points > 0) privateDoc.totals[stableUid].elapsedMs += receipt.elapsedMs;
  privateDoc.totals[stableUid].rawSeasonStars += receipt.seasonStars;
  if (!receipt.timedOut) privateDoc.totals[stableUid].submittedAnswers += 1;
  if (receipt.correct) {
    privateDoc.totals[stableUid].correct += 1;
    privateDoc.totals[stableUid].fullySolved += 1;
  }
}

function ensureBotReceipt(
  match: Json,
  privateDoc: MatchPrivate,
  taskIndex: number,
  receivedAtMs: number,
  force = false,
): void {
  if (match.opponentKind !== 'bot') return;
  const botUid = privateDoc.participantStableUids.find((uid) => uid.startsWith('bot_'));
  if (!botUid || privateDoc.answers[botUid]?.[String(taskIndex)]) return;
  const task = privateDoc.tasks[taskIndex];
  const plan = privateDoc.botPlan?.[String(taskIndex)] ?? {
    correct: false, elapsedMs: arenaTaskDurationMs(task.mode as any), timedOut: true, matchedPairs: 0, wrongAttempts: 0,
  };
  if (!force && (plan.timedOut
    || receivedAtMs < Number(match.readingEndsAtMs ?? match.stateStartedAtMs) + plan.elapsedMs)) return;
  const points = task.mode === 'speed_match'
    ? Math.max(0, plan.matchedPairs * 25 - plan.wrongAttempts * 5)
    : plan.correct ? 100 : 0;
  storeReceipt(privateDoc, botUid, {
    submissionId: `server_bot_${taskIndex}`,
    taskIndex,
    correct: plan.correct,
    points,
    elapsedMs: plan.elapsedMs,
    seasonStars: task.mode === 'speed_match'
      ? arenaTaskStars({
        task,
        correct: plan.correct,
        speedProgress: {
          matchedIndexes: Array.from({ length: plan.matchedPairs }, (_, index) => index),
          triedIndexes: [[], [], [], []], wrongAttempts: plan.wrongAttempts,
        },
      }) : arenaTaskStars({ task, correct: plan.correct }),
    receivedAtMs,
    ...(plan.timedOut ? { timedOut: true } : {}),
  });
}

function shortenDeadlineToBotPlan(match: Json, privateDoc: MatchPrivate, taskIndex: number): void {
  if (match.opponentKind !== 'bot') return;
  const plan = privateDoc.botPlan?.[String(taskIndex)];
  if (!plan || plan.timedOut) return;
  const botUid = privateDoc.participantStableUids.find((uid) => uid.startsWith('bot_'));
  if (!botUid || privateDoc.answers[botUid]?.[String(taskIndex)]) return;
  const botDueAtMs = Number(match.readingEndsAtMs ?? match.stateStartedAtMs) + plan.elapsedMs;
  match.stateDeadlineAtMs = Math.min(Number(match.stateDeadlineAtMs), botDueAtMs);
}

function fillTimeoutReceipts(match: Json, privateDoc: MatchPrivate, taskIndex: number, receivedAtMs: number): void {
  ensureBotReceipt(match, privateDoc, taskIndex, receivedAtMs, true);
  const task = privateDoc.tasks[taskIndex];
  for (const uid of privateDoc.participantStableUids) {
    if (privateDoc.answers[uid]?.[String(taskIndex)]) continue;
    const storedProgress = privateDoc.speedProgress[uid]?.[String(taskIndex)];
    const progress = decodeArenaSpeedProgress(storedProgress);
    storeReceipt(privateDoc, uid, {
      submissionId: `server_timeout_${taskIndex}`,
      taskIndex,
      correct: false,
      points: task.mode === 'speed_match' ? scoreArenaSpeedProgress(progress) : 0,
      elapsedMs: ARENA_V2_ANSWER_MS[task.mode as keyof typeof ARENA_V2_ANSWER_MS],
      seasonStars: task.mode === 'speed_match'
        ? arenaTaskStars({ task, correct: false, speedProgress: progress }) : 0,
      ...(task.mode === 'speed_match' ? { answerSnapshot: storedProgress ?? null } : {}),
      receivedAtMs,
      timedOut: true,
    });
  }
}

function activateTask(match: Json, privateDoc: MatchPrivate, taskIndex: number, startsAtMs: number): void {
  const task = privateDoc.tasks[taskIndex];
  const publicTask = toArenaPublicTask(task);
  if (!publicTask) throw new HttpsError('data-loss', 'arena_public_task_invalid');
  match.state = 'task_active';
  match.currentTaskIndex = taskIndex;
  match.currentPublicTask = publicTask;
  delete match.closedField;
  match.submittedBy = [];
  match.stateStartedAtMs = startsAtMs;
  match.readingEndsAtMs = startsAtMs + ARENA_V2_READING_MS;
  match.stateDeadlineAtMs = startsAtMs + arenaTaskDurationMs(task.mode as any);
  match.version = Number(match.version ?? 0) + 1;
}

function beginReveal(match: Json, privateDoc: MatchPrivate, anchorMs: number): void {
  const taskIndex = Number(match.currentTaskIndex);
  refreshPublicTotals(match, privateDoc, taskIndex);
  match.closedField = {
    taskIndex,
    seatAwards: privateDoc.participantStableUids.map((uid) => {
      const receipt = privateDoc.answers[uid]?.[String(taskIndex)];
      return {
        uid: privateDoc.seatByStableUid[uid],
        correct: Boolean(receipt?.correct),
        points: Math.max(0, Number(receipt?.points ?? 0)),
        seasonStars: Math.max(0, Number(receipt?.seasonStars ?? 0)),
      };
    }),
  };
  match.state = 'task_reveal';
  match.stateStartedAtMs = anchorMs;
  match.stateDeadlineAtMs = anchorMs + ARENA_V2_REVEAL_MS;
  match.version = Number(match.version ?? 0) + 1;
}

function advanceMatch(match: Json, privateDoc: MatchPrivate, now: number): { settle: boolean; aborted: boolean } {
  for (let guard = 0; guard < 32; guard += 1) {
    if (match.state === 'settled' || match.state === 'aborted') {
      return { settle: match.state === 'settled', aborted: match.state === 'aborted' };
    }
    if (match.state === 'accepting') {
      if (!arenaAcceptanceOpen(now, Number(match.stateDeadlineAtMs))) {
        match.state = 'aborted';
        match.terminal = true;
        match.abortReason = 'accept_timeout';
        match.version = Number(match.version ?? 0) + 1;
        return { settle: false, aborted: true };
      }
      const humans = privateDoc.participantStableUids.filter((uid) => !uid.startsWith('bot_'));
      if (humans.every((uid) => (match.acceptedBy as string[]).includes(privateDoc.seatByStableUid[uid]))) {
        match.state = 'countdown';
        match.stateStartedAtMs = now;
        match.stateDeadlineAtMs = now + ARENA_V2_COUNTDOWN_MS;
        match.version = Number(match.version ?? 0) + 1;
        continue;
      }
      return { settle: false, aborted: false };
    }
    if (match.state === 'countdown') {
      if (now < Number(match.stateDeadlineAtMs)) return { settle: false, aborted: false };
      activateTask(match, privateDoc, 0, Number(match.stateDeadlineAtMs));
      continue;
    }
    if (match.state === 'task_active') {
      const taskIndex = Number(match.currentTaskIndex);
      ensureBotReceipt(match, privateDoc, taskIndex, now);
      const allAnswered = taskAnswers(privateDoc, taskIndex).length >= privateDoc.participantStableUids.length;
      if (!allAnswered && now < Number(match.stateDeadlineAtMs)) return { settle: false, aborted: false };
      const anchor = allAnswered ? now : Number(match.stateDeadlineAtMs);
      fillTimeoutReceipts(match, privateDoc, taskIndex, anchor);
      beginReveal(match, privateDoc, anchor);
      continue;
    }
    if (match.state === 'task_reveal') {
      if (now < Number(match.stateDeadlineAtMs)) return { settle: false, aborted: false };
      const next = Number(match.currentTaskIndex) + 1;
      if (next >= privateDoc.tasks.length) return { settle: true, aborted: false };
      activateTask(match, privateDoc, next, Number(match.stateDeadlineAtMs));
      continue;
    }
    throw new HttpsError('data-loss', 'arena_match_state_invalid');
  }
  throw new HttpsError('resource-exhausted', 'arena_sync_catchup_limit');
}

async function settleMatch(
  tx: admin.firestore.Transaction,
  matchRef: admin.firestore.DocumentReference,
  privateRef: admin.firestore.DocumentReference,
  match: Json,
  privateDoc: MatchPrivate,
  now: number,
  forcedWinnerStableUid?: string,
  forfeiterStableUid?: string,
): Promise<void> {
  if (match.state === 'settled' && privateDoc.settledAtMs) return;
  const humans = privateDoc.participantStableUids.filter((uid) => !uid.startsWith('bot_'));
  if (match.mode === 'ranked') {
    const divisions = (match.players as Json[]).map((player) => Number(player.rank ?? 0));
    if (match.opponentKind !== 'human' || humans.length !== 2 || divisions.length !== 2
      || Math.abs(divisions[0] - divisions[1]) > 1) {
      throw new HttpsError('data-loss', 'arena_ranked_integrity_failed');
    }
  }
  const season = currentSeason(now);
  const refs = humans.map((uid) => ({
    uid,
    profile: db.collection(ARENA_V2_COLLECTIONS.profiles).doc(uid),
    season: db.collection('users').doc(uid).collection(ARENA_V2_COLLECTIONS.seasons).doc(season.seasonId),
    receipt: db.collection('users').doc(uid).collection(ARENA_V2_COLLECTIONS.receipts).doc(String(match.matchId)),
    credit: db.collection('users').doc(uid).collection(ARENA_V2_COLLECTIONS.spinCredits).doc(String(match.matchId)),
  }));
  const snapshots = await Promise.all(refs.flatMap((entry) => [
    tx.get(entry.profile), tx.get(entry.season), tx.get(entry.receipt),
  ]));
  const dataByUid = new Map<string, { profile: Json; season: Json; receiptExists: boolean }>();
  refs.forEach((entry, index) => {
    dataByUid.set(entry.uid, {
      profile: snapshots[index * 3].data() ?? {},
      season: snapshots[index * 3 + 1].data() ?? {},
      receiptExists: snapshots[index * 3 + 2].exists,
    });
  });

  const expansionRunKind = privateDoc.runKind ?? 'match';
  const expansionEligibility = arenaRunEligibility(expansionRunKind, String(match.mode));
  const rivalSeriesRef = expansionRunKind === 'rival' && privateDoc.seriesId
    ? db.collection(ARENA_EXPANSION_COLLECTIONS.series).doc(privateDoc.seriesId) : null;
  const rivalSeriesSnap = rivalSeriesRef ? await tx.get(rivalSeriesRef) : null;
  if (rivalSeriesRef && (!rivalSeriesSnap?.exists
    || rivalSeriesSnap.data()?.status !== 'active'
    || rivalSeriesSnap.data()?.activeMatchId !== String(match.matchId)
    || match.seriesId !== privateDoc.seriesId
    || Number(match.gameIndex) !== Number(privateDoc.gameIndex)
    || Number(rivalSeriesSnap.data()?.gameIndex) !== Number(privateDoc.gameIndex)
    || !rivalSeriesSnap.data()?.participantStableUids?.every((uid: string) => humans.includes(uid)))) {
    throw new HttpsError('data-loss', 'arena_rival_series_integrity_failed');
  }
  const masteryEvidence = new Map<string, Array<{
    ref: admin.firestore.DocumentReference;
    snap: admin.firestore.DocumentSnapshot;
    task: TournamentTask;
    taskIndex: number;
  }>>();
  if (privateDoc.expansionFlags?.mastery === true && expansionEligibility.mastery && !forcedWinnerStableUid) {
    for (const entry of refs) {
      const evidence = await Promise.all(privateDoc.tasks.map(async (task, taskIndex) => {
        const ref = db.collection('users').doc(entry.uid)
          .collection(ARENA_EXPANSION_COLLECTIONS.masterySignatures)
          .doc(arenaCanonicalTaskSignature(task));
        return { ref, snap: await tx.get(ref), task, taskIndex };
      }));
      masteryEvidence.set(entry.uid, evidence);
    }
  }

  const leftUid = String(privateDoc.participantStableUids[0]);
  const rightUid = String(privateDoc.participantStableUids[1]);
  const emptyTotal = { score: 0, elapsedMs: 0, correct: 0, fullySolved: 0, rawSeasonStars: 0, submittedAnswers: 0 };
  const leftTotal = privateDoc.totals[leftUid] ?? emptyTotal;
  const rightTotal = privateDoc.totals[rightUid] ?? emptyTotal;
  const natural = resolveArenaOutcome(leftTotal, rightTotal);
  const outcomes: Record<string, ArenaV2Outcome> = forcedWinnerStableUid
    ? { [leftUid]: leftUid === forcedWinnerStableUid ? 'win' : 'loss', [rightUid]: rightUid === forcedWinnerStableUid ? 'win' : 'loss' }
    : { [leftUid]: natural.left, [rightUid]: natural.right };
  const dayKey = utcDayKey(now);
  const rewards: Record<string, Json> = {};
  privateDoc.rewardsByStableUid ??= {};
  const privateRewards = privateDoc.rewardsByStableUid;

  refs.forEach((entry) => {
    const existing = dataByUid.get(entry.uid)!;
    const profile = profileDefaults(entry.uid, existing.profile);
    const seasonData = existing.season;
    const publicSeat = privateDoc.seatByStableUid[entry.uid];
    if (existing.receiptExists) {
      rewards[publicSeat] = { duplicate: true };
      return;
    }
    const outcome = outcomes[entry.uid] ?? 'draw';
    const currentRating = profile.rating;
    const opponentUid = entry.uid === leftUid ? rightUid : leftUid;
    const opponentSeat = privateDoc.seatByStableUid[opponentUid];
    const opponentDivision = Number((match.players as Json[])
      .find((player) => player.uid === opponentSeat)?.rank ?? profile.rank);
    const ratingDelta = expansionEligibility.rating && match.mode === 'ranked'
      ? arenaRpDelta(profile.rank, opponentDivision, outcome) : 0;
    const ratingAfter = Math.max(0, currentRating + ratingDelta);
    const eligibleMatchIndex = String(seasonData.dailyDayKey ?? '') === dayKey
      ? Math.max(0, Math.trunc(Number(seasonData.dailyEligibleMatches ?? 0))) : 0;
    const sameDay = String(seasonData.dailyDayKey ?? '') === dayKey;
    const dailyStarsBefore = sameDay ? Math.max(0, Math.trunc(Number(seasonData.dailyStarsCredited ?? 0))) : 0;
    const starsEarned = expansionEligibility.baseStars ? arenaSeasonStars({
      mode: match.mode,
      rawStars: privateDoc.totals[entry.uid]?.rawSeasonStars ?? 0,
      eligibleMatchIndex,
      dailyStarsBefore,
    }) : 0;
    const starsAfter = Math.max(0, Math.trunc(Number(seasonData.stars ?? 0))) + starsEarned;
    const spinKey = String(process.env.ARENA_V2_SPIN_HMAC_KEY ?? '').trim();
    const rollBps = spinKey
      ? createHmac('sha256', spinKey).update(`${match.matchId}|${entry.uid}|${season.seasonId}`).digest().readUInt32BE(0) % 10_000
      : -1;
    const spin = arenaRareSpin({
      mode: match.mode,
      opponentKind: match.opponentKind,
      rewardEligible: expansionEligibility.spin && !forcedWinnerStableUid && eligibleMatchIndex < 6 && rollBps >= 0,
      submittedAnswers: privateDoc.totals[entry.uid]?.submittedAnswers ?? 0,
      dropsToday: sameDay ? Math.max(0, Math.trunc(Number(seasonData.spinDropsToday ?? 0))) : 0,
      rollBps,
      pityBefore: profile.spinPity,
    });
    const additions: Partial<Record<ArenaMasteryMode, ReturnType<typeof arenaMasteryObservation>[]>> = {};
    const evidenceRows = masteryEvidence.get(entry.uid) ?? [];
    evidenceRows.forEach(({ ref, snap, task, taskIndex }) => {
      const seenUntil = Number(snap.data()?.expiresAtMs ?? snap.data()?.expireAt?.toMillis?.() ?? 0);
      if (snap.exists && seenUntil > now) return;
      const mode = task.mode as ArenaMasteryMode;
      additions[mode] = [...(additions[mode] ?? []), arenaMasteryObservation(
        task, privateDoc.answers[entry.uid]?.[String(taskIndex)] ?? {}, now - taskIndex,
      )];
    });
    const masteryApplied = arenaApplyMasteryObservations({
      current: existing.profile.mastery as ArenaMasteryProfileState | undefined,
      additions: privateDoc.expansionFlags?.mastery === true ? additions : {},
      lifetimeThresholdStars: Number(existing.profile.masteryThresholdStarsLifetime ?? 0),
    });
    const masteryWalletAward = privateDoc.expansionFlags?.mastery === true ? masteryApplied.walletAward : 0;
    const walletBefore = Math.max(0, Math.trunc(Number(existing.profile.starWalletBalance ?? 0)));
    const walletAward = privateDoc.expansionFlags?.wallet === true ? starsEarned + masteryWalletAward : 0;
    const nextProfile = {
      ...profile,
      rating: ratingAfter,
      rank: arenaRankIndexFromRp(ratingAfter),
      wins: profile.wins + (expansionEligibility.profileOutcome && outcome === 'win' ? 1 : 0),
      losses: profile.losses + (expansionEligibility.profileOutcome && outcome === 'loss' ? 1 : 0),
      draws: profile.draws + (expansionEligibility.profileOutcome && outcome === 'draw' ? 1 : 0),
      matches: profile.matches + (expansionEligibility.profileOutcome ? 1 : 0),
      spinPity: spin.pityAfter,
      ...(privateDoc.expansionFlags?.wallet === true ? {
        starWalletBalance: walletBefore + walletAward,
        lifetimeWalletStarsEarned: Math.max(0, Number(existing.profile.lifetimeWalletStarsEarned ?? 0)) + walletAward,
      } : {}),
      ...(privateDoc.expansionFlags?.mastery === true ? {
        masteryThresholdStarsLifetime: Math.max(0, Number(existing.profile.masteryThresholdStarsLifetime ?? 0))
          + masteryWalletAward,
        mastery: masteryApplied.mastery,
      } : {}),
      activeMatchId: null,
      ...(match.mode === 'ranked' && entry.uid === forfeiterStableUid ? {
        forfeitTimestampsMs: [
          ...(Array.isArray(existing.profile.forfeitTimestampsMs)
            ? existing.profile.forfeitTimestampsMs.filter((value: unknown) => Number(value) > now - 24 * 60 * 60 * 1_000)
            : []),
          now,
        ].slice(-8),
      } : {}),
      updatedAtMs: now,
    };
    const nextSeason = {
      seasonId: season.seasonId,
      stars: starsAfter,
      level: Math.floor(starsAfter / 50),
      endsAtMs: season.endsAtMs,
      dailyDayKey: dayKey,
      dailyEligibleMatches: eligibleMatchIndex + (expansionEligibility.baseStars ? 1 : 0),
      dailyStarsCredited: dailyStarsBefore + starsEarned,
      dailyMultiplierUsed: arenaDailyMultiplier(eligibleMatchIndex),
      spinDropsToday: (sameDay ? Math.max(0, Math.trunc(Number(seasonData.spinDropsToday ?? 0))) : 0)
        + (spin.awarded ? 1 : 0),
      updatedAtMs: now,
    };
    const reward = {
      starsEarned,
      seasonStarsAfter: starsAfter,
      ratingDelta,
      ratingAfter,
      rankAfter: nextProfile.rank,
      spinAwarded: spin.awarded,
      walletBalanceAfter: walletBefore + walletAward,
      masteryStarsEarned: masteryWalletAward,
      ...(spin.awarded ? { spinReceiptId: String(match.matchId) } : {}),
    };
    privateRewards[entry.uid] = reward;
    rewards[publicSeat] = {
      starsEarned,
      ratingDelta,
      ratingAfter,
      rankAfter: nextProfile.rank,
    };
    if (expansionRunKind === 'rival') {
      tx.set(entry.profile, { activeMatchId: null, updatedAtMs: now }, { merge: true });
    } else {
      tx.set(entry.profile, nextProfile, { merge: true });
      tx.set(entry.season, nextSeason, { merge: true });
    }
    tx.create(entry.receipt, {
      matchId: String(match.matchId), mode: match.mode, outcome, reward, settledAtMs: now,
      expireAt: timestamp(now + 400 * 24 * 60 * 60 * 1_000),
    });
    if (privateDoc.expansionFlags?.lab === true) {
      const labTasks: Json[] = privateDoc.tasks.map((task, taskIndex) => ({ taskIndex,
        ...arenaLabTask(task, privateDoc.answers[entry.uid]?.[String(taskIndex)] ?? {}) }));
      tx.create(db.collection('users').doc(entry.uid).collection(ARENA_EXPANSION_COLLECTIONS.matchLabs)
        .doc(String(match.matchId)), {
        schemaVersion: 'arena-match-lab.v1', matchId: String(match.matchId), runKind: expansionRunKind,
        createdAtMs: now, tasks: labTasks,
        retryTaskIndexes: labTasks.map((row, index) => row.correct === true ? -1 : index)
          .filter((index) => index >= 0).slice(0, 3),
        summary: privateDoc.totals[entry.uid], expireAt: timestamp(now + ARENA_LAB_TTL_MS),
      });
    }
    evidenceRows.forEach(({ ref, snap }) => {
      const seenUntil = Number(snap.data()?.expiresAtMs ?? snap.data()?.expireAt?.toMillis?.() ?? 0);
      if (!snap.exists || seenUntil <= now) tx.set(ref, {
        signature: ref.id, firstSeenAtMs: now, lastSeenAtMs: now,
        expiresAtMs: now + ARENA_MASTERY_SIGNATURE_TTL_MS,
        expireAt: timestamp(now + ARENA_MASTERY_SIGNATURE_TTL_MS),
      });
    });
    if (privateDoc.expansionFlags?.wallet === true && starsEarned > 0) tx.create(db.collection('users').doc(entry.uid)
      .collection(ARENA_EXPANSION_COLLECTIONS.starLedger).doc(`match_${match.matchId}`), {
      kind: 'match_earn', sourceId: String(match.matchId), delta: starsEarned,
      balanceAfter: walletBefore + starsEarned, createdAtMs: now,
      expireAt: timestamp(now + 400 * 24 * 60 * 60 * 1_000),
    });
    if (privateDoc.expansionFlags?.wallet === true && privateDoc.expansionFlags?.mastery === true
      && masteryWalletAward > 0) tx.create(db.collection('users').doc(entry.uid)
      .collection(ARENA_EXPANSION_COLLECTIONS.starLedger).doc(`mastery_${match.matchId}`), {
      kind: 'mastery_thresholds', sourceId: String(match.matchId), delta: masteryWalletAward,
      thresholds: masteryApplied.newlyClaimed, balanceAfter: walletBefore + walletAward, createdAtMs: now,
      expireAt: timestamp(now + 400 * 24 * 60 * 60 * 1_000),
    });
    const submittedAnswers = privateDoc.totals[entry.uid]?.submittedAnswers ?? 0;
    if (privateDoc.expansionFlags?.partner === true && expansionEligibility.partnerActivity
      && !forcedWinnerStableUid && submittedAnswers >= 8) {
      tx.set(db.collection('users').doc(entry.uid).collection(ARENA_EXPANSION_COLLECTIONS.activityDays).doc(dayKey), {
        dayKey, qualifying: true, [String(match.mode)]: true, updatedAtMs: now,
        expireAt: timestamp(now + 45 * 24 * 60 * 60 * 1_000),
      }, { merge: true });
    }
    if (spin.awarded) {
      tx.set(entry.credit, {
        creditId: String(match.matchId), source: 'rare_match_drop', status: 'available', createdAtMs: now,
        expiresAtMs: now + 30 * 24 * 60 * 60 * 1_000,
        expireAt: timestamp(now + 30 * 24 * 60 * 60 * 1_000),
      });
    }
  });
  const winnerStableUid = outcomes[leftUid] === 'win' ? leftUid : outcomes[rightUid] === 'win' ? rightUid : undefined;
  match.state = 'settled';
  match.terminal = true;
  match.stateStartedAtMs = now;
  match.stateDeadlineAtMs = now;
  match.version = Number(match.version ?? 0) + 1;
  match.result = {
    ...(winnerStableUid ? { winnerUid: privateDoc.seatByStableUid[winnerStableUid] } : {}),
    reason: forcedWinnerStableUid ? 'forfeit' : natural.reason,
    rewards,
    players: match.players,
  };
  if (rivalSeriesRef && rivalSeriesSnap?.exists) {
    const series = { ...(rivalSeriesSnap.data() ?? {}) };
    const processedMatchIds = Array.isArray(series.processedMatchIds) ? [...series.processedMatchIds] : [];
    if (!processedMatchIds.includes(String(match.matchId))) {
      const winnerSeat = winnerStableUid ? privateDoc.seatByStableUid[winnerStableUid] : undefined;
      const next = arenaRivalSeriesAfterGame({
        winsA: Number(series.wins?.a ?? 0), winsB: Number(series.wins?.b ?? 0),
        draws: Number(series.draws ?? 0),
        ...(winnerSeat === 'a' || winnerSeat === 'b' ? { winnerSeat } : {}),
      });
      tx.set(rivalSeriesRef, {
        wins: { a: next.winsA, b: next.winsB }, draws: next.draws,
        gamesPlayed: next.gamesPlayed, processedMatchIds: [...processedMatchIds, String(match.matchId)],
        activeMatchId: null, readyBy: {},
        status: next.complete ? 'complete' : 'between_games',
        ...(next.complete ? { completedAtMs: now } : { betweenGamesAtMs: now }),
        updatedAtMs: now,
      }, { merge: true });
      match.result.seriesSummary = {
        winsA: next.winsA, winsB: next.winsB, draws: next.draws,
        gamesPlayed: next.gamesPlayed, complete: next.complete,
      };
    }
  }
  privateDoc.settledAtMs = now;
  closeMatchQueues(tx, match, privateDoc, now, 'settled');
  tx.set(matchRef, match);
  tx.set(privateRef, privateDoc);
}

function clearActiveProfiles(tx: admin.firestore.Transaction, privateDoc: MatchPrivate, now: number): void {
  for (const uid of privateDoc.participantStableUids.filter((value) => !value.startsWith('bot_'))) {
    tx.set(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(uid), {
      activeMatchId: null, updatedAtMs: now,
    }, { merge: true });
  }
}

function closeMatchQueues(
  tx: admin.firestore.Transaction,
  match: Json,
  privateDoc: MatchPrivate,
  now: number,
  reason: 'aborted' | 'settled',
): void {
  if (match.mode === 'friend') return;
  for (const uid of privateDoc.participantStableUids.filter((value) => !value.startsWith('bot_'))) {
    tx.set(db.collection(ARENA_V2_COLLECTIONS.queue).doc(uid), {
      status: 'cancelled', closeReason: reason, cancelledAtMs: now, leaseExpiresAt: 0,
    }, { merge: true });
  }
}

export const arenaV2Home = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  // Home stays readable under the kill switch so an already-started match can
  // be resumed/settled and the UI can render honest disabled states.
  const who = await arenaActor(request, 'home', true);
  const now = nowMs();
  const season = currentSeason(now);
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const queueRef = db.collection(ARENA_V2_COLLECTIONS.queue).doc(who.stableUid);
  const seasonRef = db.collection('users').doc(who.stableUid).collection(ARENA_V2_COLLECTIONS.seasons).doc(season.seasonId);
  const [profileSnap, queueSnap, seasonSnap, credits] = await Promise.all([
    profileRef.get(), queueRef.get(), seasonRef.get(),
    db.collection('users').doc(who.stableUid).collection(ARENA_V2_COLLECTIONS.spinCredits)
      .where('status', '==', 'available').where('expiresAtMs', '>', now).limit(50).get(),
  ]);
  const profile = profileDefaults(who.stableUid, profileSnap.data());
  const seasonData = seasonSnap.data() ?? {};
  const spinsAvailable = credits.size;
  const activeMatchId = typeof profile.activeMatchId === 'string' ? profile.activeMatchId : '';
  const [activeMatch, activePrivate] = activeMatchId ? await Promise.all([
    db.collection(ARENA_V2_COLLECTIONS.matches).doc(activeMatchId).get(),
    db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(activeMatchId).get(),
  ]) : [null, null];
  const claimedFree = new Set(Array.isArray(seasonData.claimedFree) ? seasonData.claimedFree : []);
  const claimedPlus = new Set(Array.isArray(seasonData.claimedPlus) ? seasonData.claimedPlus : []);
  const levels = Array.from({ length: 72 }, (_, index) => ({
    level: index + 1,
    stars: (index + 1) * 50,
    freeReward: arenaSeasonReward(index + 1, 'free'),
    plusReward: arenaSeasonReward(index + 1, 'plus'),
    freeClaimed: claimedFree.has(index + 1),
    plusClaimed: claimedPlus.has(index + 1),
  }));
  return {
    ok: true,
    availability: {
      enabled: configCache?.data.enabled === true,
      quickEnabled: configCache?.data.enabled === true && configCache?.data.quickEnabled === true,
      rankedEnabled: configCache?.data.enabled === true && configCache?.data.rankedEnabled === true,
      friendEnabled: configCache?.data.enabled === true && configCache?.data.friendEnabled === true,
      rewardsEnabled: configCache?.data.enabled === true && configCache?.data.rewardsEnabled === true,
      spinEnabled: configCache?.data.enabled === true && configCache?.data.spinEnabled === true,
    },
    profile: {
      uid: who.stableUid,
      rating: profile.rating,
      rank: profile.rank,
      seasonStars: Math.max(0, Math.trunc(Number(seasonData.stars ?? 0))),
      seasonLevel: Math.max(0, Math.trunc(Number(seasonData.level ?? 0))),
      seasonEndsAtMs: season.endsAtMs,
      spinsAvailable,
      wins: profile.wins,
      losses: profile.losses,
    },
    season: {
      seasonId: season.seasonId,
      stars: Math.max(0, Math.trunc(Number(seasonData.stars ?? 0))),
      level: Math.max(0, Math.trunc(Number(seasonData.level ?? 0))),
      endsAtMs: season.endsAtMs,
      levels,
    },
    ...(queueSnap.exists ? { activeQueue: queueSnap.data() } : {}),
    ...(activeMatch?.exists ? { activeMatch: activeMatch.data() } : {}),
    ...(activePrivate?.exists ? {
      activeMatchViewerSeat: (activePrivate.data() as MatchPrivate).seatByStableUid?.[who.stableUid],
    } : {}),
  };
});

export const arenaV2FindMatch = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const requestedMode = request.data?.mode;
  const who = await arenaActor(request, requestedMode === 'ranked' ? 'ranked' : 'quick');
  const mode = request.data?.mode === 'quick' || request.data?.mode === 'ranked'
    ? request.data.mode as ArenaV2QueueMode : null;
  if (!mode) throw new HttpsError('invalid-argument', 'mode_invalid');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const now = nowMs();
  const ownProfileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const ownQueueRef = db.collection(ARENA_V2_COLLECTIONS.queue).doc(who.stableUid);
  const lockRef = db.collection(ARENA_V2_COLLECTIONS.queueLocks).doc(mode);
  const matchId = db.collection(ARENA_V2_COLLECTIONS.matches).doc().id;
  const result = await db.runTransaction(async (tx) => {
    const [profileSnap, ownQueueSnap, candidates] = await Promise.all([
      tx.get(ownProfileRef),
      tx.get(ownQueueRef),
      tx.get(db.collection(ARENA_V2_COLLECTIONS.queue)
        .where('mode', '==', mode).where('status', '==', 'waiting')
        .orderBy('joinedAtMs', 'asc').limit(10)),
      tx.get(lockRef),
    ]);
    const existing = ownQueueSnap.data() ?? {};
    if (existing.requestId === requestId && existing.status === 'matched' && existing.matchId) {
      return { status: 'matched' as const, matchId: String(existing.matchId),
        viewerSeat: existing.viewerSeat === 'b' ? 'b' as const : 'a' as const, queue: existing };
    }
    if (existing.status === 'waiting' && existing.requestId !== requestId) {
      throw new HttpsError('already-exists', 'arena_queue_request_active');
    }
    const profile = profileDefaults(who.stableUid, profileSnap.data());
    if (profile.activeMatchId) throw new HttpsError('already-exists', 'arena_active_match_exists');
    if (mode === 'ranked') {
      const forfeits = Array.isArray(profileSnap.data()?.forfeitTimestampsMs)
        ? profileSnap.data()!.forfeitTimestampsMs.filter((value: unknown) => Number(value) > now - 24 * 60 * 60 * 1_000)
        : [];
      const cooldownMs = forfeits.length >= 3 ? 30 * 60_000 : forfeits.length === 2 ? 10 * 60_000
        : forfeits.length === 1 ? 2 * 60_000 : 0;
      if (cooldownMs && now - Number(forfeits[forfeits.length - 1]) < cooldownMs) {
        throw new HttpsError('failed-precondition', 'arena_ranked_cooldown');
      }
    }
    const ownJoinedAt = existing.requestId === requestId && Number(existing.joinedAtMs) > 0
      ? Number(existing.joinedAtMs) : now;
    const eligibleQueueDocs = candidates.docs.filter((doc) => {
      if (doc.id === who.stableUid) return false;
      const data = doc.data();
      const rankedWindow = mode === 'ranked'
        && Math.min(now - ownJoinedAt, now - Number(data.joinedAtMs ?? now)) < 10_000 ? 0 : 1;
      return Number(data.leaseExpiresAt ?? 0) > now
        && Math.abs(profile.rank - Number(data.rank ?? 0)) <= (mode === 'quick' ? 3 : rankedWindow);
    });
    let candidate: admin.firestore.QueryDocumentSnapshot | undefined;
    let candidateProfile: Json | undefined;
    let pairCurrentRef: admin.firestore.DocumentReference | null = null;
    let pairCurrentData: Json = {};
    for (const possible of eligibleQueueDocs) {
      const possibleProfileSnap = await tx.get(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(possible.id));
      const possibleProfile = profileDefaults(possible.id, possibleProfileSnap.data());
      if (possibleProfile.activeMatchId || !arenaRanksCompatible(mode, profile.rank, possibleProfile.rank)) continue;
      let possiblePairRef: admin.firestore.DocumentReference | null = null;
      let possiblePairData: Json = {};
      if (mode === 'ranked') {
        possiblePairRef = db.collection(ARENA_V2_COLLECTIONS.pairLimits)
          .doc(pairLimitId(who.stableUid, possible.id, utcDayKey(now)));
        const previousRef = db.collection(ARENA_V2_COLLECTIONS.pairLimits)
          .doc(pairLimitId(who.stableUid, possible.id, previousUtcDayKey(now)));
        const [currentPair, previousPair] = await Promise.all([
          tx.get(possiblePairRef), tx.get(previousRef),
        ]);
        possiblePairData = currentPair.data() ?? {};
        const lastRatedAtMs = Math.max(Number(possiblePairData.lastRatedAtMs ?? 0),
          Number(previousPair.data()?.lastRatedAtMs ?? 0));
        if (lastRatedAtMs > now - 30 * 60_000 || Number(possiblePairData.ratedMatches ?? 0) >= 2
          || Number(possiblePairData.reservationExpiresAtMs ?? 0) > now) continue;
      }
      candidate = possible;
      candidateProfile = possibleProfile;
      pairCurrentRef = possiblePairRef;
      pairCurrentData = possiblePairData;
      break;
    }
    if (!candidate) {
      const generation = existing.requestId === requestId
        ? Math.max(1, Math.trunc(Number(existing.generation ?? 1)))
        : Math.max(0, Math.trunc(Number(existing.generation ?? 0))) + 1;
      const queue = {
        authUid: who.authUid,
        stableUid: who.stableUid,
        mode,
        status: 'waiting',
        requestId,
        generation,
        rank: profile.rank,
        joinedAtMs: ownJoinedAt,
        leaseExpiresAt: now + ARENA_V2_QUEUE_LEASE_MS,
        player: playerSnapshot(who.stableUid, who.user, profile),
      };
      tx.set(ownProfileRef, { ...profile, updatedAtMs: now }, { merge: true });
      tx.set(ownQueueRef, queue);
      tx.set(lockRef, { mode, touchedAtMs: now }, { merge: true });
      return { status: 'waiting' as const, queue };
    }
    const candidateData = candidate.data();
    const contentDivision = Math.min(profile.rank, candidateProfile!.rank);
    const pool = await loadArenaTaskPool(tx, contentDivision, matchId);
    const privateEnvelope = selectedTaskEnvelope(matchId, pool, now, contentDivision);
    const built = makeMatch({
      matchId, mode,
      left: playerSnapshot(who.stableUid, who.user, profile),
      right: { ...candidateData.player, rank: candidateProfile!.rank, rating: candidateProfile!.rating },
      leftAuthUid: who.authUid,
      rightAuthUid: String(candidateData.authUid),
      privateEnvelope,
      now,
    });
    if (pairCurrentRef) built.privateDoc.pairLimitId = pairCurrentRef.id;
    const finalEnvelopeValidation = validateArenaPrivateEnvelope(built.privateDoc);
    if (!finalEnvelopeValidation.ok) throw new HttpsError('resource-exhausted', finalEnvelopeValidation.reason);
    tx.create(db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId), built.publicDoc);
    tx.create(db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId), built.privateDoc);
    tx.create(memberRef(matchId, who.authUid), memberMarker(matchId, who.authUid, 'a', now));
    tx.create(memberRef(matchId, String(candidateData.authUid)),
      memberMarker(matchId, String(candidateData.authUid), 'b', now));
    tx.set(ownQueueRef, { ...existing, authUid: who.authUid, stableUid: who.stableUid, mode,
      status: 'matched', requestId, matchId, matchedAtMs: now, viewerSeat: 'a', opponentKind: 'human' });
    tx.set(candidate.ref, { status: 'matched', matchId, matchedAtMs: now,
      viewerSeat: 'b', opponentKind: 'human' }, { merge: true });
    tx.set(ownProfileRef, { ...profile, activeMatchId: matchId, updatedAtMs: now }, { merge: true });
    tx.set(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(candidate.id), {
      activeMatchId: matchId, updatedAtMs: now,
    }, { merge: true });
    tx.set(lockRef, { mode, touchedAtMs: now }, { merge: true });
    if (pairCurrentRef) {
      tx.set(pairCurrentRef, {
        pairHashDay: pairCurrentRef.id,
        participantStableUids: [who.stableUid, candidate.id].sort(),
        utcDayKey: utcDayKey(now),
        ratedMatches: Math.max(0, Math.trunc(Number(pairCurrentData.ratedMatches ?? 0))),
        reservationMatchId: matchId,
        reservationExpiresAtMs: now + ARENA_V2_ACCEPT_MS,
        expireAt: timestamp(now + 32 * 24 * 60 * 60 * 1_000),
      }, { merge: true });
    }
    return { status: 'matched' as const, matchId, viewerSeat: 'a' as const,
      queue: { status: 'matched', matchId, viewerSeat: 'a' } };
  });
  return { ok: true, stableUid: who.stableUid, ...result };
});

export const arenaV2QueueCancel = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'home', true);
  const requestedId = request.data?.requestId === undefined ? null : safeId(request.data.requestId, 'request_id');
  const queueRef = db.collection(ARENA_V2_COLLECTIONS.queue).doc(who.stableUid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(queueRef);
    if (!snap.exists) return;
    const data = snap.data() ?? {};
    if (String(data.authUid ?? '') !== who.authUid) throw new HttpsError('permission-denied', 'arena_queue_owner_mismatch');
    if (requestedId && data.requestId !== requestedId) throw new HttpsError('failed-precondition', 'arena_queue_request_mismatch');
    if (data.status === 'matched') throw new HttpsError('failed-precondition', 'arena_queue_already_matched');
    tx.set(queueRef, { status: 'cancelled', cancelledAtMs: nowMs(), leaseExpiresAt: 0 }, { merge: true });
  });
  return { ok: true };
});

export const arenaV2QuickBotFallback = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'quick');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const now = nowMs();
  const queueRef = db.collection(ARENA_V2_COLLECTIONS.queue).doc(who.stableUid);
  const profileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  const matchId = db.collection(ARENA_V2_COLLECTIONS.matches).doc().id;
  const botSeed = randomId(32);
  const output = await db.runTransaction(async (tx) => {
    const [queueSnap, profileSnap, lockSnap, candidates] = await Promise.all([
      tx.get(queueRef), tx.get(profileRef),
      tx.get(db.collection(ARENA_V2_COLLECTIONS.queueLocks).doc('quick')),
      tx.get(db.collection(ARENA_V2_COLLECTIONS.queue)
        .where('mode', '==', 'quick').where('status', '==', 'waiting')
        .orderBy('joinedAtMs', 'asc').limit(10)),
    ]);
    void lockSnap;
    const queue = queueSnap.data() ?? {};
    if (queue.requestId !== requestId || queue.authUid !== who.authUid || queue.mode !== 'quick') {
      throw new HttpsError('failed-precondition', 'arena_quick_queue_missing');
    }
    if (queue.status === 'matched' && queue.matchId) return {
      matchId: String(queue.matchId),
      opponentKind: queue.opponentKind === 'bot' ? 'bot' : 'human',
      viewerSeat: queue.viewerSeat === 'b' ? 'b' as const : 'a' as const,
    };
    if (queue.status !== 'waiting') throw new HttpsError('failed-precondition', 'arena_quick_queue_not_waiting');
    if (now - Number(queue.joinedAtMs ?? now) < ARENA_V2_QUICK_BOT_FALLBACK_MS) {
      throw new HttpsError('failed-precondition', 'arena_quick_bot_too_early');
    }
    const profile = profileDefaults(who.stableUid, profileSnap.data());
    if (profile.activeMatchId) throw new HttpsError('already-exists', 'arena_active_match_exists');
    let candidate: admin.firestore.QueryDocumentSnapshot | null = null;
    let candidateData: Json | null = null;
    let candidateProfile: Json | null = null;
    let candidateProfileRef: admin.firestore.DocumentReference | null = null;
    for (const possible of candidates.docs) {
      const possibleData = possible.data();
      if (possible.id === who.stableUid || Number(possibleData.leaseExpiresAt ?? 0) <= now
        || !arenaRanksCompatible('quick', profile.rank, Number(possibleData.rank ?? 0))) continue;
      const possibleProfileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(possible.id);
      const possibleProfile = profileDefaults(possible.id, (await tx.get(possibleProfileRef)).data());
      if (possibleProfile.activeMatchId
        || !arenaRanksCompatible('quick', profile.rank, possibleProfile.rank)) continue;
      candidate = possible;
      candidateData = possibleData;
      candidateProfile = possibleProfile;
      candidateProfileRef = possibleProfileRef;
      break;
    }
    if (candidate && candidateData && candidateProfile && candidateProfileRef) {
      const pool = await loadArenaTaskPool(tx, Math.min(profile.rank, candidateProfile.rank), matchId);
      const privateEnvelope = selectedTaskEnvelope(matchId, pool, now,
        Math.min(profile.rank, candidateProfile.rank));
      const built = makeMatch({
        matchId, mode: 'quick', left: playerSnapshot(who.stableUid, who.user, profile),
        right: { ...candidateData.player, rank: candidateProfile.rank, rating: candidateProfile.rating },
        leftAuthUid: who.authUid,
        rightAuthUid: String(candidateData.authUid), privateEnvelope, now,
      });
      tx.create(db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId), built.publicDoc);
      tx.create(db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId), built.privateDoc);
      tx.create(memberRef(matchId, who.authUid), memberMarker(matchId, who.authUid, 'a', now));
      tx.create(memberRef(matchId, String(candidateData.authUid)),
        memberMarker(matchId, String(candidateData.authUid), 'b', now));
      tx.set(queueRef, { status: 'matched', matchId, matchedAtMs: now,
        viewerSeat: 'a', opponentKind: 'human' }, { merge: true });
      tx.set(candidate.ref, { status: 'matched', matchId, matchedAtMs: now,
        viewerSeat: 'b', opponentKind: 'human' }, { merge: true });
      tx.set(profileRef, { ...profile, activeMatchId: matchId, updatedAtMs: now }, { merge: true });
      tx.set(candidateProfileRef, { activeMatchId: matchId, updatedAtMs: now }, { merge: true });
      tx.set(db.collection(ARENA_V2_COLLECTIONS.queueLocks).doc('quick'), { touchedAtMs: now }, { merge: true });
      return { matchId, opponentKind: 'human', viewerSeat: 'a' as const };
    }
    const botUid = `bot_${randomId(8)}`;
    const pool = await loadArenaTaskPool(tx, profile.rank, matchId);
    const privateEnvelope = selectedTaskEnvelope(matchId, pool, now, profile.rank);
    const built = makeMatch({
      matchId, mode: 'quick', left: playerSnapshot(who.stableUid, who.user, profile),
      right: playerSnapshot(botUid, { displayName: 'Training opponent' }, { rank: profile.rank, rating: profile.rating }, true),
      leftAuthUid: who.authUid, privateEnvelope, now, bot: true, botSeed,
    });
    tx.create(db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId), built.publicDoc);
    tx.create(db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId), built.privateDoc);
    tx.create(memberRef(matchId, who.authUid), memberMarker(matchId, who.authUid, 'a', now));
    tx.set(queueRef, { status: 'matched', matchId, matchedAtMs: now,
      viewerSeat: 'a', opponentKind: 'bot' }, { merge: true });
    tx.set(profileRef, { ...profile, activeMatchId: matchId, updatedAtMs: now }, { merge: true });
    tx.set(db.collection(ARENA_V2_COLLECTIONS.queueLocks).doc('quick'), { touchedAtMs: now }, { merge: true });
    return { matchId, opponentKind: 'bot', viewerSeat: 'a' as const };
  });
  return { ok: true, status: 'matched' as const, matchId: output.matchId, viewerSeat: output.viewerSeat ?? 'a',
    opponentKind: output.opponentKind };
});

export const arenaV2MatchAccept = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'home', true);
  const matchId = safeId(request.data?.matchId, 'match_id');
  const now = nowMs();
  const matchRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId);
  const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId);
  const output = await db.runTransaction(async (tx) => {
    const [matchSnap, privateSnap] = await Promise.all([tx.get(matchRef), tx.get(privateRef)]);
    if (!matchSnap.exists || !privateSnap.exists) throw new HttpsError('not-found', 'arena_match_missing');
    const match = clone(matchSnap.data()!);
    const privateDoc = clone(privateSnap.data()!) as MatchPrivate;
    assertParticipant(match, privateDoc, who);
    const viewerSeat = privateDoc.seatByStableUid[who.stableUid];
    const pairRef = match.mode === 'ranked' && privateDoc.pairLimitId
      ? db.collection(ARENA_V2_COLLECTIONS.pairLimits).doc(privateDoc.pairLimitId) : null;
    const pairSnap = pairRef ? await tx.get(pairRef) : null;
    if (match.state === 'accepting' && !arenaAcceptanceOpen(now, Number(match.stateDeadlineAtMs))) {
      match.state = 'aborted';
      match.terminal = true;
      match.abortReason = 'accept_timeout';
      match.stateStartedAtMs = now;
      match.stateDeadlineAtMs = now;
      match.version = Number(match.version ?? 0) + 1;
      clearActiveProfiles(tx, privateDoc, now);
      closeMatchQueues(tx, match, privateDoc, now, 'aborted');
      if (pairRef && pairSnap?.data()?.reservationMatchId === matchId) {
        tx.set(pairRef, { reservationMatchId: null, reservationExpiresAtMs: 0 }, { merge: true });
      }
      tx.set(matchRef, match);
      tx.set(privateRef, privateDoc);
      return { match, viewerSeat };
    }
    if (match.state === 'accepting' && !(match.acceptedBy as string[]).includes(viewerSeat)) {
      match.acceptedBy = [...(match.acceptedBy as string[]), viewerSeat];
      match.players = (match.players as Json[]).map((player) => player.uid === viewerSeat
        ? { ...player, acceptedAtMs: now } : player);
      match.version = Number(match.version ?? 0) + 1;
    }
    const advanced = advanceMatch(match, privateDoc, now);
    if (pairRef && pairSnap && match.state === 'countdown' && !privateDoc.pairLimitCommitted) {
      const pairData = pairSnap.data() ?? {};
      if (pairData.reservationMatchId !== matchId || Number(pairData.reservationExpiresAtMs ?? 0) < now) {
        throw new HttpsError('aborted', 'arena_ranked_pair_reservation_expired');
      }
      tx.set(pairRef, {
        ratedMatches: Math.max(0, Math.trunc(Number(pairData.ratedMatches ?? 0))) + 1,
        lastRatedAtMs: now,
        reservationMatchId: null,
        reservationExpiresAtMs: 0,
      }, { merge: true });
      privateDoc.pairLimitCommitted = true;
    }
    if (advanced.aborted) {
      clearActiveProfiles(tx, privateDoc, now);
      closeMatchQueues(tx, match, privateDoc, now, 'aborted');
    }
    tx.set(matchRef, match);
    tx.set(privateRef, privateDoc);
    return { match, viewerSeat };
  });
  return matchResponse(output.match, output.viewerSeat);
});

export const arenaV2MatchDecline = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'home', true);
  const matchId = safeId(request.data?.matchId, 'match_id');
  const now = nowMs();
  const matchRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId);
  const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId);
  const output = await db.runTransaction(async (tx) => {
    const [matchSnap, privateSnap] = await Promise.all([tx.get(matchRef), tx.get(privateRef)]);
    if (!matchSnap.exists || !privateSnap.exists) throw new HttpsError('not-found', 'arena_match_missing');
    const match = clone(matchSnap.data()!);
    const privateDoc = clone(privateSnap.data()!) as MatchPrivate;
    assertParticipant(match, privateDoc, who);
    const viewerSeat = privateDoc.seatByStableUid[who.stableUid];
    const pairRef = match.mode === 'ranked' && privateDoc.pairLimitId && !privateDoc.pairLimitCommitted
      ? db.collection(ARENA_V2_COLLECTIONS.pairLimits).doc(privateDoc.pairLimitId) : null;
    const pairSnap = pairRef ? await tx.get(pairRef) : null;
    if (match.state !== 'accepting') throw new HttpsError('failed-precondition', 'arena_match_already_started');
    match.state = 'aborted';
    match.terminal = true;
    match.abortReason = 'participant_declined';
    match.stateStartedAtMs = now;
    match.stateDeadlineAtMs = now;
    match.version = Number(match.version ?? 0) + 1;
    clearActiveProfiles(tx, privateDoc, now);
    closeMatchQueues(tx, match, privateDoc, now, 'aborted');
    if (pairRef && pairSnap?.data()?.reservationMatchId === matchId) {
      tx.set(pairRef, { reservationMatchId: null, reservationExpiresAtMs: 0 }, { merge: true });
    }
    tx.set(matchRef, match);
    tx.set(privateRef, privateDoc);
    return { match, viewerSeat };
  });
  return matchResponse(output.match, output.viewerSeat);
});

export const arenaV2SubmitAnswer = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'home', true);
  const matchId = safeId(request.data?.matchId, 'match_id');
  const submissionId = safeId(request.data?.submissionId, 'submission_id');
  const taskIndex = int(request.data?.taskIndex, 'task_index', 0, 9);
  const answer = request.data?.answer;
  const answerHash = createHash('sha256').update(JSON.stringify(answer ?? null)).digest('hex');
  if (Buffer.byteLength(JSON.stringify(answer ?? null), 'utf8') > 8 * 1_024) {
    throw new HttpsError('invalid-argument', 'answer_too_large');
  }
  const now = nowMs();
  const matchRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId);
  const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId);
  const output = await db.runTransaction(async (tx) => {
    const [matchSnap, privateSnap] = await Promise.all([tx.get(matchRef), tx.get(privateRef)]);
    if (!matchSnap.exists || !privateSnap.exists) throw new HttpsError('not-found', 'arena_match_missing');
    const match = clone(matchSnap.data()!);
    const privateDoc = clone(privateSnap.data()!) as MatchPrivate;
    assertParticipant(match, privateDoc, who);
    const viewerSeat = privateDoc.seatByStableUid[who.stableUid];
    const existing = privateDoc.answers[who.stableUid]?.[String(taskIndex)];
    if (existing) {
      if (existing.submissionId !== submissionId || existing.answerHash !== answerHash) {
        throw new HttpsError('already-exists', 'arena_answer_conflict');
      }
      return { match, viewerSeat, receipt: existing };
    }
    advanceMatch(match, privateDoc, now);
    if (match.state !== 'task_active' || Number(match.currentTaskIndex) !== taskIndex) {
      throw new HttpsError('failed-precondition', 'arena_task_not_active');
    }
    if (now < Number(match.readingEndsAtMs ?? match.stateStartedAtMs)) {
      throw new HttpsError('failed-precondition', 'arena_task_reading');
    }
    if (now > Number(match.stateDeadlineAtMs)) throw new HttpsError('deadline-exceeded', 'arena_task_deadline_elapsed');
    const task = privateDoc.tasks[taskIndex];
    if (task.mode === 'speed_match') throw new HttpsError('invalid-argument', 'arena_speed_attempt_required');
    const verdict = scoreArenaAnswer(task, answer);
    const elapsedMs = arenaObservedElapsedMs(now, Number(match.readingEndsAtMs), task.mode as any);
    const receipt: ArenaV2AnswerReceipt = {
      submissionId, taskIndex, correct: verdict.correct, points: verdict.points, elapsedMs,
      seasonStars: arenaTaskStars({ task, correct: verdict.correct }), receivedAtMs: now, answerHash,
      answerSnapshot: arenaSanitizeAnswerSnapshot(answer),
    };
    storeReceipt(privateDoc, who.stableUid, receipt);
    ensureBotReceipt(match, privateDoc, taskIndex, now);
    shortenDeadlineToBotPlan(match, privateDoc, taskIndex);
    refreshPublicTotals(match, privateDoc, taskIndex);
    if (taskAnswers(privateDoc, taskIndex).length >= privateDoc.participantStableUids.length) {
      beginReveal(match, privateDoc, now);
    } else {
      match.version = Number(match.version ?? 0) + 1;
    }
    tx.set(matchRef, match);
    tx.set(privateRef, privateDoc);
    return { match, viewerSeat, receipt };
  });
  return { ...matchResponse(output.match, output.viewerSeat), correct: output.receipt.correct,
    points: output.receipt.points };
});

export const arenaV2SubmitSpeedAttempt = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'home', true);
  const matchId = safeId(request.data?.matchId, 'match_id');
  const submissionId = safeId(request.data?.submissionId, 'submission_id');
  const taskIndex = int(request.data?.taskIndex, 'task_index', 0, 9);
  const pairIndex = int(request.data?.pairIndex, 'pair_index', 0, 3);
  const selectedIndex = int(request.data?.selectedIndex, 'selected_index', 0, 3);
  const now = nowMs();
  const matchRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId);
  const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId);
  const output = await db.runTransaction(async (tx) => {
    const [matchSnap, privateSnap] = await Promise.all([tx.get(matchRef), tx.get(privateRef)]);
    if (!matchSnap.exists || !privateSnap.exists) throw new HttpsError('not-found', 'arena_match_missing');
    const match = clone(matchSnap.data()!);
    const privateDoc = clone(privateSnap.data()!) as MatchPrivate;
    assertParticipant(match, privateDoc, who);
    const viewerSeat = privateDoc.seatByStableUid[who.stableUid];
    const replay = privateDoc.speedAttempts[who.stableUid]?.[submissionId];
    if (replay) {
      if (replay.taskIndex !== taskIndex || replay.pairIndex !== pairIndex || replay.selectedIndex !== selectedIndex) {
        throw new HttpsError('already-exists', 'arena_answer_conflict');
      }
      return { match, viewerSeat, verdict: { correct: replay.correct, points: replay.points } };
    }
    const equivalent = Object.values(privateDoc.speedAttempts[who.stableUid] ?? {}).find((attempt) => (
      attempt.taskIndex === taskIndex && attempt.pairIndex === pairIndex && attempt.selectedIndex === selectedIndex
    ));
    if (equivalent) {
      return { match, viewerSeat, verdict: { correct: equivalent.correct, points: equivalent.points } };
    }
    advanceMatch(match, privateDoc, now);
    if (match.state !== 'task_active' || Number(match.currentTaskIndex) !== taskIndex) {
      throw new HttpsError('failed-precondition', 'arena_task_not_active');
    }
    if (now < Number(match.readingEndsAtMs ?? match.stateStartedAtMs)) {
      throw new HttpsError('failed-precondition', 'arena_task_reading');
    }
    if (now > Number(match.stateDeadlineAtMs)) throw new HttpsError('deadline-exceeded', 'arena_task_deadline_elapsed');
    const task = privateDoc.tasks[taskIndex];
    if (task.mode !== 'speed_match') throw new HttpsError('invalid-argument', 'arena_speed_task_required');
    const attempts = privateDoc.speedAttempts[who.stableUid] ?? {};
    if (Object.keys(attempts).length >= MAX_SPEED_ATTEMPT_IDS) {
      throw new HttpsError('resource-exhausted', 'arena_speed_attempt_limit');
    }
    const previous = decodeArenaSpeedProgress(privateDoc.speedProgress[who.stableUid]?.[String(taskIndex)]);
    let applied;
    try {
      applied = applySpeedMatchAttempt(task, previous, pairIndex, selectedIndex);
    } catch {
      throw new HttpsError('invalid-argument', 'arena_speed_attempt_invalid');
    }
    privateDoc.speedProgress[who.stableUid] ??= {};
    privateDoc.speedProgress[who.stableUid][String(taskIndex)] = encodeArenaSpeedProgress(applied.progress)!;
    const points = scoreArenaSpeedProgress(applied.progress);
    const verdict = { correct: applied.correct, points };
    privateDoc.speedAttempts[who.stableUid] ??= {};
    privateDoc.speedAttempts[who.stableUid][submissionId] = {
      ...verdict, taskIndex, pairIndex, selectedIndex,
    };
    if (applied.completed) {
      const elapsedMs = arenaObservedElapsedMs(now, Number(match.readingEndsAtMs), 'speed_match');
      storeReceipt(privateDoc, who.stableUid, {
        submissionId: `complete_${submissionId}`, taskIndex, correct: true, points, elapsedMs,
        seasonStars: arenaTaskStars({ task, correct: true, speedProgress: applied.progress }), receivedAtMs: now,
        answerSnapshot: encodeArenaSpeedProgress(applied.progress),
      });
      ensureBotReceipt(match, privateDoc, taskIndex, now);
      shortenDeadlineToBotPlan(match, privateDoc, taskIndex);
      refreshPublicTotals(match, privateDoc, taskIndex);
      if (taskAnswers(privateDoc, taskIndex).length >= privateDoc.participantStableUids.length) {
        beginReveal(match, privateDoc, now);
      }
    }
    match.version = Number(match.version ?? 0) + 1;
    tx.set(matchRef, match);
    tx.set(privateRef, privateDoc);
    return { match, viewerSeat, verdict };
  });
  return { ...matchResponse(output.match, output.viewerSeat), ...output.verdict };
});

export const arenaV2SyncMatch = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'home', true);
  const matchId = safeId(request.data?.matchId, 'match_id');
  if (request.data?.expectedVersion !== undefined) int(request.data.expectedVersion, 'expected_version', 0, 1_000_000);
  const now = nowMs();
  const matchRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId);
  const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId);
  const output = await db.runTransaction(async (tx) => {
    const [matchSnap, privateSnap] = await Promise.all([tx.get(matchRef), tx.get(privateRef)]);
    if (!matchSnap.exists || !privateSnap.exists) throw new HttpsError('not-found', 'arena_match_missing');
    const match = clone(matchSnap.data()!);
    const privateDoc = clone(privateSnap.data()!) as MatchPrivate;
    assertParticipant(match, privateDoc, who);
    const viewerSeat = privateDoc.seatByStableUid[who.stableUid];
    const pairRef = match.mode === 'ranked' && privateDoc.pairLimitId && !privateDoc.pairLimitCommitted
      ? db.collection(ARENA_V2_COLLECTIONS.pairLimits).doc(privateDoc.pairLimitId) : null;
    const pairSnap = pairRef ? await tx.get(pairRef) : null;
    const advanced = advanceMatch(match, privateDoc, now);
    if (advanced.settle && match.state !== 'settled') {
      await settleMatch(tx, matchRef, privateRef, match, privateDoc, now);
    } else {
      if (advanced.aborted) {
        clearActiveProfiles(tx, privateDoc, now);
        closeMatchQueues(tx, match, privateDoc, now, 'aborted');
        if (pairRef && pairSnap?.data()?.reservationMatchId === matchId) {
          tx.set(pairRef, { reservationMatchId: null, reservationExpiresAtMs: 0 }, { merge: true });
        }
      }
      tx.set(matchRef, match);
      tx.set(privateRef, privateDoc);
    }
    return { match, viewerSeat, viewerReward: privateDoc.rewardsByStableUid?.[who.stableUid] };
  });
  return matchResponse(output.match, output.viewerSeat, output.viewerReward);
});

export const arenaV2Forfeit = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'home', true);
  const matchId = safeId(request.data?.matchId, 'match_id');
  const now = nowMs();
  const matchRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId);
  const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId);
  const output = await db.runTransaction(async (tx) => {
    const [matchSnap, privateSnap] = await Promise.all([tx.get(matchRef), tx.get(privateRef)]);
    if (!matchSnap.exists || !privateSnap.exists) throw new HttpsError('not-found', 'arena_match_missing');
    const match = clone(matchSnap.data()!);
    const privateDoc = clone(privateSnap.data()!) as MatchPrivate;
    assertParticipant(match, privateDoc, who);
    const viewerSeat = privateDoc.seatByStableUid[who.stableUid];
    const pairRef = match.mode === 'ranked' && privateDoc.pairLimitId && !privateDoc.pairLimitCommitted
      ? db.collection(ARENA_V2_COLLECTIONS.pairLimits).doc(privateDoc.pairLimitId) : null;
    const pairSnap = pairRef ? await tx.get(pairRef) : null;
    if (match.state === 'settled' || match.state === 'aborted') {
      return { match, viewerSeat, viewerReward: privateDoc.rewardsByStableUid?.[who.stableUid] };
    }
    if (match.state === 'accepting') {
      match.state = 'aborted';
      match.terminal = true;
      match.abortReason = 'prestart_forfeit';
      match.version = Number(match.version ?? 0) + 1;
      clearActiveProfiles(tx, privateDoc, now);
      closeMatchQueues(tx, match, privateDoc, now, 'aborted');
      if (pairRef && pairSnap?.data()?.reservationMatchId === matchId) {
        tx.set(pairRef, { reservationMatchId: null, reservationExpiresAtMs: 0 }, { merge: true });
      }
      tx.set(matchRef, match);
      tx.set(privateRef, privateDoc);
      return { match, viewerSeat, viewerReward: undefined };
    }
    const winner = privateDoc.participantStableUids.find((uid) => uid !== who.stableUid)!;
    await settleMatch(tx, matchRef, privateRef, match, privateDoc, now, winner, who.stableUid);
    return { match, viewerSeat, viewerReward: privateDoc.rewardsByStableUid?.[who.stableUid] };
  });
  return matchResponse(output.match, output.viewerSeat, output.viewerReward);
});

function inviteTokenFor(fromStableUid: string, toStableUid: string, requestId: string): string {
  const key = String(process.env.ARENA_V2_INVITE_HMAC_KEY ?? '').trim();
  if (!key) throw new HttpsError('failed-precondition', 'arena_invite_key_unavailable');
  return createHmac('sha256', key).update(`${fromStableUid}|${toStableUid}|${requestId}`).digest('base64url');
}

function inviteHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const arenaV2InviteCreate = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'friend');
  const friendStableUid = safeId(request.data?.friendStableUid, 'friend_stable_uid');
  const requestId = safeId(request.data?.requestId, 'request_id');
  if (friendStableUid === who.stableUid) throw new HttpsError('invalid-argument', 'arena_invite_self');
  const token = inviteTokenFor(who.stableUid, friendStableUid, requestId);
  const hash = inviteHash(token);
  const now = nowMs();
  const inviteRef = db.collection(ARENA_V2_COLLECTIONS.invites).doc(hash);
  const ownProfileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid);
  await db.runTransaction(async (tx) => {
    const [existing, outgoingFriend, incomingFriend, friendUser, profileSnap, activeInvites] = await Promise.all([
      tx.get(inviteRef),
      tx.get(db.collection('users').doc(who.stableUid).collection('friends').doc(friendStableUid)),
      tx.get(db.collection('users').doc(friendStableUid).collection('friends').doc(who.stableUid)),
      tx.get(db.collection('users').doc(friendStableUid)),
      tx.get(ownProfileRef),
      tx.get(db.collection(ARENA_V2_COLLECTIONS.invites)
        .where('fromStableUid', '==', who.stableUid).where('status', '==', 'pending').limit(6)),
    ]);
    if (existing.exists) return;
    if (!outgoingFriend.exists || !incomingFriend.exists || !friendUser.exists) {
      throw new HttpsError('failed-precondition', 'arena_friendship_required');
    }
    if (activeInvites.size >= 5) throw new HttpsError('resource-exhausted', 'arena_active_invite_limit');
    const friendData = friendUser.data() ?? {};
    if (friendData.hidden === true || friendData.deleted === true || friendData.banned === true) {
      throw new HttpsError('failed-precondition', 'arena_invite_target_unavailable');
    }
    const friendAuthUid = String(friendData.firebaseAuthUid ?? '').trim();
    if (!friendAuthUid) throw new HttpsError('failed-precondition', 'arena_invite_target_unavailable');
    const profile = profileDefaults(who.stableUid, profileSnap.data());
    if (profile.activeMatchId) throw new HttpsError('already-exists', 'arena_active_match_exists');
    const dayKey = utcDayKey(now);
    const createdToday = profileSnap.data()?.inviteDayKey === dayKey
      ? Math.max(0, Math.trunc(Number(profileSnap.data()?.inviteCreatedToday ?? 0))) : 0;
    if (createdToday >= 20) throw new HttpsError('resource-exhausted', 'arena_daily_invite_limit');
    tx.create(inviteRef, {
      schemaVersion: 'arena-v2-invite.v1', inviteHash: hash,
      fromStableUid: who.stableUid, toStableUid: friendStableUid,
      fromAuthUid: who.authUid, toAuthUid: friendAuthUid,
      requestId, status: 'pending', createdAtMs: now, expiresAtMs: now + ARENA_V2_INVITE_TTL_MS,
      expireAt: timestamp(now + ARENA_V2_INVITE_TTL_MS),
    });
    tx.set(ownProfileRef, { ...profile, inviteDayKey: dayKey,
      inviteCreatedToday: createdToday + 1, updatedAtMs: now }, { merge: true });
  });
  return { ok: true, stableUid: who.stableUid, inviteId: token,
    status: 'pending' as const, expiresAtMs: now + ARENA_V2_INVITE_TTL_MS };
});

export const arenaV2InviteAccept = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'friend');
  const token = safeId(request.data?.inviteId, 'invite_id');
  const hash = inviteHash(token);
  const now = nowMs();
  const inviteRef = db.collection(ARENA_V2_COLLECTIONS.invites).doc(hash);
  const matchId = db.collection(ARENA_V2_COLLECTIONS.matches).doc().id;
  const output = await db.runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists) throw new HttpsError('not-found', 'arena_invite_invalid');
    const invite = inviteSnap.data() ?? {};
    if (invite.toStableUid !== who.stableUid || invite.toAuthUid !== who.authUid) {
      throw new HttpsError('permission-denied', 'arena_invite_invalid');
    }
    if (invite.status === 'accepted' && invite.matchId) {
      return { matchId: String(invite.matchId), viewerSeat: 'b' as const };
    }
    if (invite.status !== 'pending' || Number(invite.expiresAtMs ?? 0) <= now
    ) {
      throw new HttpsError('failed-precondition', 'arena_invite_invalid');
    }
    const fromStableUid = String(invite.fromStableUid);
    const fromAuthUid = String(invite.fromAuthUid);
    const hostQueueRef = db.collection(ARENA_V2_COLLECTIONS.queue).doc(fromStableUid);
    const guestQueueRef = db.collection(ARENA_V2_COLLECTIONS.queue).doc(who.stableUid);
    const [outgoingFriend, incomingFriend, hostUser, hostProfileSnap, guestProfileSnap,
      hostQueueSnap, guestQueueSnap] = await Promise.all([
      tx.get(db.collection('users').doc(who.stableUid).collection('friends').doc(fromStableUid)),
      tx.get(db.collection('users').doc(fromStableUid).collection('friends').doc(who.stableUid)),
      tx.get(db.collection('users').doc(fromStableUid)),
      tx.get(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(fromStableUid)),
      tx.get(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid)),
      tx.get(hostQueueRef),
      tx.get(guestQueueRef),
    ]);
    if (!outgoingFriend.exists || !incomingFriend.exists || !hostUser.exists) {
      throw new HttpsError('failed-precondition', 'arena_friendship_required');
    }
    const hostData = hostUser.data() ?? {};
    if (hostData.hidden === true || hostData.deleted === true || hostData.banned === true
      || String(hostData.firebaseAuthUid ?? '').trim() !== fromAuthUid) {
      throw new HttpsError('failed-precondition', 'arena_invite_host_unavailable');
    }
    if ([hostQueueSnap, guestQueueSnap].some((snap) => snap.data()?.status === 'matched')) {
      throw new HttpsError('already-exists', 'arena_queue_already_matched');
    }
    const hostProfile = profileDefaults(fromStableUid, hostProfileSnap.data());
    const guestProfile = profileDefaults(who.stableUid, guestProfileSnap.data());
    if (hostProfile.activeMatchId || guestProfile.activeMatchId) {
      throw new HttpsError('already-exists', 'arena_active_match_exists');
    }
    const pool = await loadArenaTaskPool(tx, Math.min(hostProfile.rank, guestProfile.rank), matchId);
    const privateEnvelope = selectedTaskEnvelope(matchId, pool, now,
      Math.min(hostProfile.rank, guestProfile.rank));
    const built = makeMatch({
      matchId, mode: 'friend',
      left: playerSnapshot(fromStableUid, hostData, hostProfile),
      right: playerSnapshot(who.stableUid, who.user, guestProfile),
      leftAuthUid: fromAuthUid, rightAuthUid: who.authUid, privateEnvelope, now,
    });
    tx.create(db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId), built.publicDoc);
    tx.create(db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId), built.privateDoc);
    tx.create(memberRef(matchId, fromAuthUid), memberMarker(matchId, fromAuthUid, 'a', now));
    tx.create(memberRef(matchId, who.authUid), memberMarker(matchId, who.authUid, 'b', now));
    tx.set(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(fromStableUid), {
      ...hostProfile, activeMatchId: matchId, updatedAtMs: now,
    }, { merge: true });
    tx.set(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid), {
      ...guestProfile, activeMatchId: matchId, updatedAtMs: now,
    }, { merge: true });
    if (hostQueueSnap.data()?.status === 'waiting') {
      tx.set(hostQueueRef, { status: 'cancelled', closeReason: 'friend_match',
        cancelledAtMs: now, leaseExpiresAt: 0 }, { merge: true });
    }
    if (guestQueueSnap.data()?.status === 'waiting') {
      tx.set(guestQueueRef, { status: 'cancelled', closeReason: 'friend_match',
        cancelledAtMs: now, leaseExpiresAt: 0 }, { merge: true });
    }
    tx.set(inviteRef, { status: 'accepted', acceptedAtMs: now, matchId }, { merge: true });
    return { matchId, viewerSeat: 'b' as const };
  });
  return { ok: true, status: 'accepted' as const, ...output };
});

export const arenaV2InviteDecline = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'friend');
  const token = safeId(request.data?.inviteId, 'invite_id');
  const inviteRef = db.collection(ARENA_V2_COLLECTIONS.invites).doc(inviteHash(token));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(inviteRef);
    if (!snap.exists) return;
    const data = snap.data() ?? {};
    if (data.toStableUid !== who.stableUid || data.toAuthUid !== who.authUid) {
      throw new HttpsError('permission-denied', 'arena_invite_invalid');
    }
    if (data.status === 'pending') tx.set(inviteRef, { status: 'declined', declinedAtMs: nowMs() }, { merge: true });
  });
  return { ok: true };
});

export const arenaV2SeasonClaim = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'rewards');
  const now = nowMs();
  const activeSeason = currentSeason(now);
  const seasonId = request.data?.seasonId === undefined
    ? activeSeason.seasonId : safeId(request.data.seasonId, 'season_id', 32);
  if (seasonId !== activeSeason.seasonId) throw new HttpsError('failed-precondition', 'arena_season_not_active');
  const level = int(request.data?.level, 'level', 1, 72);
  const side = request.data?.side === 'free' || request.data?.side === 'plus'
    ? request.data.side as 'free' | 'plus' : null;
  if (!side) throw new HttpsError('invalid-argument', 'side_invalid');
  const seasonRef = db.collection('users').doc(who.stableUid).collection(ARENA_V2_COLLECTIONS.seasons).doc(seasonId);
  const claimRef = db.collection('users').doc(who.stableUid).collection(ARENA_V2_COLLECTIONS.seasonClaims)
    .doc(`${seasonId}_${level}_${side}`);
  const output = await db.runTransaction(async (tx) => {
    const [seasonSnap, claimSnap, userSnap] = await Promise.all([
      tx.get(seasonRef), tx.get(claimRef), tx.get(db.collection('users').doc(who.stableUid)),
    ]);
    if (claimSnap.exists) return claimSnap.data()!;
    const seasonData = seasonSnap.data() ?? {};
    if (!arenaSeasonLevelUnlocked(Number(seasonData.stars ?? 0), level)) {
      throw new HttpsError('failed-precondition', 'arena_season_level_locked');
    }
    if (side === 'plus' && !(await resolvePremiumAccess(db, who.stableUid, now, who.authUid, tx))) {
      throw new HttpsError('permission-denied', 'premium_required');
    }
    const reward = arenaSeasonReward(level, side);
    const claim = { seasonId, level, side, reward, claimedAtMs: now };
    const field = side === 'plus' ? 'claimedPlus' : 'claimedFree';
    const claimed = Array.from(new Set([
      ...(Array.isArray(seasonData[field]) ? seasonData[field] : []), level,
    ])).sort((left, right) => Number(left) - Number(right));
    tx.set(seasonRef, { [field]: claimed, updatedAtMs: now }, { merge: true });
    tx.create(claimRef, claim);
    if (reward.kind === 'shards') {
      tx.set(db.collection('users').doc(who.stableUid), {
        shards: Math.max(0, Math.trunc(Number(userSnap.data()?.shards ?? 0))) + reward.amount,
      }, { merge: true });
    } else {
      tx.create(db.collection('users').doc(who.stableUid).collection(ARENA_V2_COLLECTIONS.spinCredits)
        .doc(`season_${seasonId}_${level}_${side}`), {
        creditId: `season_${seasonId}_${level}_${side}`, source: 'arena_season', status: 'available', createdAtMs: now,
        expiresAtMs: now + 365 * 24 * 60 * 60 * 1_000,
        expireAt: timestamp(now + 365 * 24 * 60 * 60 * 1_000),
      });
    }
    return claim;
  });
  return { ok: true, ...output };
});

export const arenaV2SpinStatus = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'spin');
  const now = nowMs();
  const credits = await db.collection('users').doc(who.stableUid).collection(ARENA_V2_COLLECTIONS.spinCredits)
    .where('status', '==', 'available').where('expiresAtMs', '>', now).limit(50).get();
  return { ok: true, spinsAvailable: credits.size };
});

export const arenaV2SpinClaim = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'spin');
  const requestId = safeId(request.data?.requestId, 'request_id');
  const key = String(process.env.ARENA_V2_SPIN_HMAC_KEY ?? '').trim();
  if (!key) throw new HttpsError('failed-precondition', 'arena_spin_key_unavailable');
  const resultRef = db.collection('users').doc(who.stableUid).collection(ARENA_V2_COLLECTIONS.spinResults).doc(requestId);
  const existing = await resultRef.get();
  if (existing.exists) return { ok: true, ...existing.data() };
  const now = nowMs();
  const availableQuery = db.collection('users').doc(who.stableUid).collection(ARENA_V2_COLLECTIONS.spinCredits)
    .where('status', '==', 'available')
    .where('expiresAtMs', '>', now)
    .orderBy('expiresAtMs', 'asc')
    .limit(1);
  const output = await db.runTransaction(async (tx) => {
    const [resultSnap, availableSnap, userSnap] = await Promise.all([
      tx.get(resultRef), tx.get(availableQuery), tx.get(db.collection('users').doc(who.stableUid)),
    ]);
    if (resultSnap.exists) return resultSnap.data()!;
    if (availableSnap.empty) throw new HttpsError('failed-precondition', 'arena_spin_unavailable');
    const credit = availableSnap.docs[0];
    const creditRef = credit.ref;
    const creditExpiry = Number(credit.data()?.expiresAtMs
      ?? credit.data()?.expireAt?.toMillis?.() ?? 0);
    if (creditExpiry <= now) throw new HttpsError('failed-precondition', 'arena_spin_credit_expired');
    const roll = createHmac('sha256', key)
      .update(`${who.stableUid}|${creditRef.id}|${requestId}`).digest().readUInt32BE(0) % 100;
    const amount = roll < 70 ? 5 : roll < 95 ? 10 : 20;
    const reward = { kind: 'shards', amount };
    const result = { receiptId: requestId, creditId: creditRef.id, reward, claimedAtMs: now };
    tx.set(creditRef, { status: 'consumed', consumedAtMs: now, resultId: requestId }, { merge: true });
    tx.create(resultRef, result);
    tx.set(db.collection('users').doc(who.stableUid), {
      shards: Math.max(0, Math.trunc(Number(userSnap.data()?.shards ?? 0))) + amount,
    }, { merge: true });
    return result;
  });
  return { ok: true, ...output };
});

async function reconcileOrphanMatch(matchId: string, now: number): Promise<void> {
  const matchRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId);
  const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId);
  await db.runTransaction(async (tx) => {
    const [matchSnap, privateSnap] = await Promise.all([tx.get(matchRef), tx.get(privateRef)]);
    if (!matchSnap.exists || !privateSnap.exists || matchSnap.data()?.terminal === true) return;
    const match = clone(matchSnap.data()!);
    const privateDoc = clone(privateSnap.data()!) as MatchPrivate;
    const pairRef = match.mode === 'ranked' && privateDoc.pairLimitId && !privateDoc.pairLimitCommitted
      ? db.collection(ARENA_V2_COLLECTIONS.pairLimits).doc(privateDoc.pairLimitId) : null;
    const pairSnap = pairRef ? await tx.get(pairRef) : null;
    const advanced = advanceMatch(match, privateDoc, now);
    if (advanced.settle && match.state !== 'settled') {
      await settleMatch(tx, matchRef, privateRef, match, privateDoc, now);
      return;
    }
    if (advanced.aborted) {
      clearActiveProfiles(tx, privateDoc, now);
      closeMatchQueues(tx, match, privateDoc, now, 'aborted');
      if (pairRef && pairSnap?.data()?.reservationMatchId === matchId) {
        tx.set(pairRef, { reservationMatchId: null, reservationExpiresAtMs: 0 }, { merge: true });
      }
    }
    tx.set(matchRef, match);
    tx.set(privateRef, privateDoc);
  });
}

async function deleteSnapshot(snapshot: admin.firestore.QuerySnapshot): Promise<number> {
  if (snapshot.empty) return 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

export const arenaV2CleanupHourly = onSchedule({
  region: 'us-central1', schedule: 'every 60 minutes', timeoutSeconds: 120,
  memory: '256MiB', maxInstances: 1, secrets: ARENA_V2_SECRET_NAMES,
}, async () => {
  const now = nowMs();
  const nowTimestamp = timestamp(now);
  const orphans = await db.collection(ARENA_V2_COLLECTIONS.matches)
    .where('terminal', '==', false)
    .where('stateDeadlineAtMs', '<=', now - 60_000)
    .limit(25)
    .get();
  let reconciled = 0;
  for (const orphan of orphans.docs) {
    try {
      await reconcileOrphanMatch(orphan.id, now);
      reconciled += 1;
    } catch (error) {
      console.error(JSON.stringify({ event: 'arena_v2_orphan_reconcile_failed', matchId: orphan.id,
        error: error instanceof Error ? error.message : String(error) }));
    }
  }
  const queries = [
    db.collection(ARENA_V2_COLLECTIONS.queue).where('leaseExpiresAt', '<=', now - 2 * 60_000).limit(CLEANUP_BATCH_LIMIT),
    db.collection(ARENA_V2_COLLECTIONS.matches).where('expireAt', '<=', nowTimestamp).limit(CLEANUP_BATCH_LIMIT),
    db.collection(ARENA_V2_COLLECTIONS.matchPrivate).where('expireAt', '<=', nowTimestamp).limit(CLEANUP_BATCH_LIMIT),
    db.collection(ARENA_V2_COLLECTIONS.invites).where('expireAt', '<=', nowTimestamp).limit(CLEANUP_BATCH_LIMIT),
    db.collection(ARENA_V2_COLLECTIONS.pairLimits).where('expireAt', '<=', nowTimestamp).limit(CLEANUP_BATCH_LIMIT),
    db.collectionGroup(ARENA_V2_COLLECTIONS.members).where('expireAt', '<=', nowTimestamp).limit(CLEANUP_BATCH_LIMIT),
  ];
  let deleted = 0;
  for (const query of queries) deleted += await deleteSnapshot(await query.get());
  console.info(JSON.stringify({ event: 'arena_v2_cleanup', reconciled, deleted }));
});
