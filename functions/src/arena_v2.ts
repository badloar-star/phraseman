import * as admin from 'firebase-admin';
import { createHash, createHmac, randomBytes } from 'crypto';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { appendExternalEconomyEvent } from './external_economy_events';
import {
  type TournamentTask,
  applySpeedMatchAttempt,
  validateTournamentTaskForNewRoom,
} from './tournament_core';
import { arenaPercentileAbove } from './arena_rank_engine';
import { arenaTierRewardsEarned } from './arena_tier_rewards';
import {
  arenaApplyRankOutcome,
  arenaRankStateEmpty,
  arenaSoftReset,
  type ArenaRankState,
} from './arena_rank_engine';
import {
  ARENA_DUEL_COUNTDOWN_MS,
  ARENA_DUEL_READING_MS,
  ARENA_DUEL_REVEAL_MS,
  ARENA_PLAN_SCHEMA_VERSION,
  arenaAssertReportShape,
  arenaDeclaredVsActualDelta,
  arenaDecisiveTaskIndex,
  arenaMatchPlanRules,
  arenaNormalizeReport,
  arenaOpponentFirstAttemptPairs,
  arenaPlanHash,
  arenaPlanTask,
  arenaScoreReport,
  arenaDuelReconcile,
  arenaDuelSettleProbeAtMs,
  arenaSettleDeadlineMs,
  arenaShouldSettle,
  type ArenaMatchPlanWire,
  type ArenaOpponentTickWire,
  type ArenaPlanTask,
} from './arena_duel_v3';
import {
  ARENA_ANSWER_MS,
  ARENA_STARS_RULES_VERSION,
  type ArenaEntryMode,
  type ArenaTaskMode,
  type ArenaTaskOutcome,
} from './arena_stars_v3';
import {
  NEW_TOURNAMENT_POOL_CONTENT_SHA256,
  NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256,
  NEW_TOURNAMENT_POOL_VERSION,
  verifyTournamentPoolTaskProof,
} from './tournament_pool_publication';
import {
  ARENA_V2_ACCEPT_MS,
  ARENA_V2_ANSWER_MS,
  ARENA_V2_COLLECTIONS,
  ARENA_V2_COUNTDOWN_MS,
  ARENA_V2_INVITE_TTL_MS,
  ARENA_V2_MATCH_TTL_MS,
  ARENA_V2_MAX_TASK_DOC_READS,
  arenaModeOrder,
  arenaTaskCount,
  ARENA_V2_QUICK_BOT_FALLBACK_MS,
  ARENA_V2_QUICK_BOT_MAX_MS,
  arenaQuickBotDelayMs,
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
  ARENA_DAILY_REWARD_MATCHES,
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
import { arenaBotAvatar, arenaBotDisplayName } from './arena_bot_identity';
import { arenaConfigProblems } from './arena_config_contract';
import {
  commitStarOperations,
  prepareStarOperations,
  type StarLedgerPrepared,
  type StarOpRequest,
} from './stars_ledger';
import {
  arenaMatchXp,
  arenaWeekKeyForMs,
  arenaXpEligible,
  arenaXpUserPatch,
  ARENA_XP_RULE_VERSION,
  type ArenaXpMode,
} from './arena_xp';

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
  arenaBuildViewerReviewSnapshot,
  arenaCanonicalTaskSignature,
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
    /** Заданий, закрытых ПЕРВЫМ верным ответом. Нужен дневной цели (D-62). */
    firstCount?: number;
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
  /**
   * Дуэль v3: матч считается на устройстве. Здесь лежит только то, что нужно
   * серверу, чтобы закрыть матч — сам ход матча сюда не пишется, иначе счёт
   * записей Firestore вырос бы кратно (владелец: стоимость базы не должна
   * расти).
   */
  duelPlanIssuedAtMs?: number;
  duelStartedAtMs?: number;
  duelFirstReportAtMs?: number;
  duelReports?: Record<string, ArenaDuelStoredReport>;
};

/** Один отчёт о матче. Пересчитан сервером; заявленное клиентом — рядом. */
type ArenaDuelStoredReport = {
  reportId: string;
  seat: 'a' | 'b';
  receivedAtMs: number;
  /** Что игроку показали на экране. Хранится ради расхождений, не ради счёта. */
  shownMatchStars: number;
  /** Что насчитал сервер. Именно это идёт в кошелёк. */
  actualMatchStars: number;
  /** actual − shown. Ноль в норме; ненулевое означает разъехавшиеся правила. */
  starsDelta: number;
  abandoned: boolean;
  clockSuspect: boolean;
  /**
   * Исходы БЕЗ самих ответов: ответ игрока уже лежит в расписке
   * (`answers[uid][i].answerSnapshot`), и второй копии в том же документе быть
   * не должно — приватный документ ограничен и оплачивается за размер.
   * Пересчёт очков ответ не читает, ему хватает статуса и времени.
   */
  outcomes: ArenaTaskOutcome[];
};

/** Снимает ответ с исхода перед записью: в счёте он не участвует. */
function arenaDuelSlimOutcomes(outcomes: readonly ArenaTaskOutcome[]): ArenaTaskOutcome[] {
  return outcomes.map((outcome) => ({ ...outcome, answer: null }));
}

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

/**
 * Требовать РОВНО три части было слишком строго: `1.6` и `1.6.7.1` — обычные
 * значения `CFBundleShortVersionString` и `versionName`, а не поломка. Такая
 * версия не разбиралась, и гейт ниже отвечал «обнови приложение» установленной
 * свежей сборке. Недостающие части дополняем нулями, лишние отбрасываем.
 */
function comparableVersion(value: unknown): [number, number, number] | null {
  const match = String(value ?? '').trim().match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[.\-+].*)?$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

function versionAtLeast(actualValue: unknown, minimumValue: unknown): boolean {
  const minimum = comparableVersion(minimumValue);
  // Нечитаемый минимум закрывал Арену всем сразу. Он задаётся администратором,
  // и цена его опечатки не должна ложиться на игроков.
  if (!minimum) return true;
  // зачем: '0.0.0' в конфиге означает «подходит любая сборка» — именно это и
  // выставляет админка по умолчанию. Раньше версию всё равно разбирали, и
  // клиент, приславший 'unknown' (на Android nativeAppVersion бывает пустым),
  // получал «обнови приложение» при минимуме, который никого не отсекает.
  // Владелец видел это как «Арена не включена на сервере»: экран рисует ту же
  // карточку на любой отказ вызова.
  if (minimum[0] === 0 && minimum[1] === 0 && minimum[2] === 0) return true;
  const actual = comparableVersion(actualValue);
  if (!actual) return false;
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

/**
 * Дивизион, по которому выбирается сложность заданий. Раньше брался минимум из
 * двух рангов: при окне быстрого матча ±3 сильный игрок всегда получал задания
 * легче своего уровня. Среднее честно к обоим.
 */
function arenaContentDivision(leftRank: number, rightRank: number): number {
  const left = Math.max(0, Math.min(23, Math.trunc(Number(leftRank) || 0)));
  const right = Math.max(0, Math.min(23, Math.trunc(Number(rightRank) || 0)));
  return Math.round((left + right) / 2);
}

/** Равномерное [0,1) из криптослучайности — для момента входа бота. */
function randomUnit(): number {
  return randomBytes(4).readUInt32BE(0) / 0x1_0000_0000;
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
  /**
   * Проверку конфига делает `arenaConfigProblems` — тот же модуль, которым
   * админка строит документ и показывает его состояние.
   *
   * Здесь раньше стоял свой, отдельно написанный список условий, и он был
   * КОРОЧЕ: не смотрел ни корень Меркла, ни формат минимальной версии
   * клиента, ни то, что флаги вообще булевы. Опечатка в `minClientVersion`
   * (скажем, `1.0.0-beta`) проходила этот гейт и убивала Арену на следующей
   * строке — каждому игроку прилетало «обнови приложение», хотя обновлять
   * было нечего. Диагностировать такое по одному коду ошибки невозможно.
   *
   * Поэтому проверка одна на всех, и она называет, что именно не так: список
   * проблем уезжает в текст ошибки и виден в логах и в админке.
   */
  const configProblems = arenaConfigProblems(config);
  if (configProblems.length) {
    throw new HttpsError('failed-precondition', `arena_config_incompatible:${configProblems.join(',')}`);
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

/**
 * Публичная проекция игрока. Владелец (2026-08-12): соперник-бот не раскрывается,
 * поэтому здесь НЕТ признака isBot и нет служебных имён. Бот приходит сюда с уже
 * сгенерированным правдоподобным именем — см. arena_bot_identity.
 */
function playerSnapshot(stableUid: string, user: Json, profile: Json): Json {
  return {
    uid: stableUid,
    name: String(user.displayName ?? user.name ?? profile.name ?? 'Player').slice(0, 48),
    ...(typeof user.avatar === 'string' ? { avatar: user.avatar.slice(0, 256) } : {}),
    ...(typeof user.aura === 'string' ? { aura: user.aura.slice(0, 128) } : {}),
    rank: Math.max(0, Math.min(23, Math.trunc(Number(profile.rank ?? 0)))),
    rating: Math.max(0, Math.trunc(Number(profile.rating ?? 0))),
    score: 0,
    correct: 0,
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
    // Состояние ранга. Хранится рядом с очками: щит и серия без очков
    // бессмысленны, а очки без них ведут себя не так, как обещано игроку.
    seasonBestTierIndex: Math.max(0, Math.trunc(Number(data?.seasonBestTierIndex ?? 0))),
    lifetimeBestTierIndex: Math.max(0, Math.trunc(Number(data?.lifetimeBestTierIndex ?? 0))),
    /** Сезон, к которому относится текущий рейтинг. Смена — повод для сброса. */
    rankSeasonId: typeof data?.rankSeasonId === 'string' ? data.rankSeasonId : null,
  };
}

async function loadArenaTaskPool(
  tx: admin.firestore.Transaction,
  divisionIndex: number,
  seed: string,
  matchMode?: string,
): Promise<readonly TournamentTask[]> {
  const difficulties = arenaDifficultyPlan(divisionIndex, matchMode);
  const required = new Map<string, { mode: string; difficulty: number; count: number }>();
  arenaModeOrder(matchMode).forEach((mode, index) => {
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
  matchMode?: string,
): MatchPrivate {
  const tasks = selectArenaTasks(pool, matchId, divisionIndex, matchMode);
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
  const validation = validateArenaPrivateEnvelope(envelope, matchMode);
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
  // Бот не открывает приложение и не вызывает MatchAccept. Его место уже
  // подтверждено самим сервером в момент создания матча, поэтому оно должно
  // быть принято сразу. Для любого расположения игрока берём реальный seat
  // бота из envelope, а не предполагаем литерал `b`.
  const botStableUid = input.bot
    ? participantStableUids.find((uid) => uid.startsWith('bot_'))
    : undefined;
  const botSeat = botStableUid ? privateDoc.seatByStableUid[botStableUid] : undefined;
  const acceptedBy = botSeat ? [botSeat] : [];
  const publicPlayers = [input.left, input.right].map((player, index) => ({
    uid: index === 0 ? 'a' : 'b',
    name: player.name,
    ...(player.avatar ? { avatar: player.avatar } : {}),
    ...(player.aura ? { aura: player.aura } : {}),
    rank: player.rank,
    rating: player.rating,
    score: 0,
    correct: 0,
  }));
  const privateValidation = validateArenaPrivateEnvelope(privateDoc, input.mode);
  if (!privateValidation.ok) throw new HttpsError('resource-exhausted', privateValidation.reason);
  return {
    publicDoc: {
      matchId: input.matchId,
      mode: input.mode,
      // Клиент всегда видит 'human'. Настоящий тип соперника хранится только в
      // приватном документе: он нужен экономике и аналитике, но не пользователю.
      opponentKind: 'human',
      /** Длина матча: быстрый — 5 заданий, остальные — 10. */
      taskCount: arenaTaskCount(input.mode),
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

/** v3-матч помечается один раз при выдаче плана. Один флаг — одна развилка. */
function arenaIsDuelV3(match: Json): boolean {
  return Math.trunc(Number(match.duelVersion ?? 0)) === 3;
}

/**
 * Решение по v3-матчу вместо пошагового `advanceMatch`.
 *
 * `advanceMatch` шагает по заданиям и закрывает их просрочкой. Для v3 это
 * разрушительно: матч идёт на устройстве и в базу не пишет, поэтому любой шаг
 * забил бы документ нулевыми расписками ДО прихода настоящего отчёта —
 * `storeReceipt` их не перезаписывает, и игрок получил бы ноль за выигранный
 * матч. Поэтому здесь только три исхода: ждать, закрыть, отменить.
 */
function advanceDuelMatch(match: Json, privateDoc: MatchPrivate, now: number): { settle: boolean; aborted: boolean } {
  if (match.state === 'settled') return { settle: true, aborted: false };
  if (match.state === 'aborted') return { settle: false, aborted: true };
  if (match.state === 'accepting') {
    if (arenaAcceptanceOpen(now, Number(match.stateDeadlineAtMs))) return { settle: false, aborted: false };
    match.state = 'aborted';
    match.terminal = true;
    match.abortReason = 'accept_timeout';
    match.version = Number(match.version ?? 0) + 1;
    return { settle: false, aborted: true };
  }
  const reports = privateDoc.duelReports ?? {};
  const reportsIn = Object.keys(reports).length;
  const action = arenaDuelReconcile({
    nowMs: now,
    startedAtMs: Math.trunc(Number(privateDoc.duelStartedAtMs ?? match.stateStartedAtMs ?? now)),
    tasks: privateDoc.tasks as { mode: ArenaTaskMode }[],
    reportsIn,
    participants: privateDoc.participantStableUids.length,
    firstReportAtMs: privateDoc.duelFirstReportAtMs ?? null,
    // Живой соперник, который ещё не сдал отчёт, считается присутствующим:
    // дешёвого признака присутствия у нас нет, а ошибиться лучше в пользу
    // ожидания — его закроет дедлайн.
    opponentPresent: reportsIn < privateDoc.participantStableUids.length && !privateDoc.botPlan,
  });
  if (action === 'settle') {
    match.state = 'task_reveal';
    match.currentTaskIndex = Math.max(0, privateDoc.tasks.length - 1);
    match.stateStartedAtMs = now;
    match.stateDeadlineAtMs = now;
    match.version = Number(match.version ?? 0) + 1;
    return { settle: true, aborted: false };
  }
  if (action === 'abort') {
    match.state = 'aborted';
    match.terminal = true;
    match.abortReason = 'duel_no_reports';
    match.stateStartedAtMs = now;
    match.stateDeadlineAtMs = now;
    match.version = Number(match.version ?? 0) + 1;
    return { settle: false, aborted: true };
  }
  return { settle: false, aborted: false };
}

/** Единственная развилка между двумя машинами матча на весь бэкенд. */
function advanceAnyMatch(match: Json, privateDoc: MatchPrivate, now: number): { settle: boolean; aborted: boolean } {
  return arenaIsDuelV3(match)
    ? advanceDuelMatch(match, privateDoc, now)
    : advanceMatch(match, privateDoc, now);
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
    // humans.length === 2 строже, чем публичный opponentKind: он теперь всегда 'human'.
    if (humans.length !== 2 || divisions.length !== 2
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

  /**
   * Пред-проход. Единый журнал звёзд обязан прочитать свои расписки ДО первой
   * записи в транзакции — Firestore требует, чтобы все чтения шли до всех
   * записей. Поэтому всё, что нужно журналу, считается здесь, а сам цикл ниже
   * только пишет.
   *
   * Опыт (D-69) начисляется в этой же транзакции и в этой же записи документа
   * игрока, что и звёзды: расчёт закрывает обоих игроков разом, а соперник к
   * этому моменту мог уже свернуть приложение.
   */
  const weekKeyNow = arenaWeekKeyForMs(now);
  const settleByUid = new Map<string, {
    outcome: ArenaV2Outcome;
    eligibleMatchIndex: number;
    dailyRewardMatchesBefore: number;
    sameDay: boolean;
    dailyStarsBefore: number;
    starsEarned: number;
    xpEarned: number;
    dailyXpBefore: number;
    prepared: StarLedgerPrepared | null;
    userPatch: Record<string, unknown>;
    totalXpAfter: number;
    rankChange: ReturnType<typeof arenaApplyRankOutcome>;
    tierRewards: readonly { tierIndex: number; tierKey: string; itemId: string }[];
  }>();

  const userSnapByUid = new Map<string, admin.firestore.DocumentSnapshot>();
  for (const entry of refs) {
    const existing = dataByUid.get(entry.uid)!;
    if (existing.receiptExists) continue;
    userSnapByUid.set(entry.uid, await tx.get(db.collection('users').doc(entry.uid)));
  }

  for (const entry of refs) {
    const existing = dataByUid.get(entry.uid)!;
    if (existing.receiptExists) continue;
    const seasonData = existing.season;
    const outcome = outcomes[entry.uid] ?? 'draw';
    const sameDay = String(seasonData.dailyDayKey ?? '') === dayKey;
    const eligibleMatchIndex = sameDay
      ? Math.max(0, Math.trunc(Number(seasonData.dailyEligibleMatches ?? 0))) : 0;
    const dailyStarsBefore = sameDay
      ? Math.max(0, Math.trunc(Number(seasonData.dailyStarsCredited ?? 0))) : 0;
    /**
     * Счётчик матчей, дающих право на редкую награду, отдельный от счётчика
     * начисления звёзд. Раньше это было одно поле, но после D-07 быстрый матч
     * звёзд не начисляет — а окно редкой награды в шесть матчей за сутки он
     * терять не должен. Старое поле читается как запасное, чтобы у тех, кто
     * уже играл сегодня, окно не открылось заново.
     */
    const dailyRewardMatchesBefore = sameDay
      ? Math.max(0, Math.trunc(Number(seasonData.dailyRewardMatches
        ?? seasonData.dailyEligibleMatches ?? 0))) : 0;
    const starsEarned = expansionEligibility.baseStars ? arenaSeasonStars({
      mode: match.mode,
      rawStars: privateDoc.totals[entry.uid]?.rawSeasonStars ?? 0,
      eligibleMatchIndex,
      dailyStarsBefore,
    }) : 0;

    // Дневной потолок опыта живёт полем в уже читаемом и уже записываемом
    // сезонном документе — ноль дополнительных чтений и записей.
    const dailyXpBefore = sameDay ? Math.max(0, Math.trunc(Number(seasonData.dailyXpCredited ?? 0))) : 0;
    const correctAnswers = Math.max(0, Math.trunc(Number(privateDoc.totals[entry.uid]?.correct ?? 0)));
    // Серии соперничеств сезонный документ не пишут, поэтому и опыт там не
    // начисляется: потолок было бы негде хранить.
    const xpEarned = expansionRunKind !== 'rival' && arenaXpEligible(entry.uid)
      ? arenaMatchXp({
        mode: String(match.mode) as ArenaXpMode,
        correctAnswers,
        taskCount: privateDoc.tasks.length,
        outcome,
        dailyXpCredited: dailyXpBefore,
      })
      : 0;

    /**
     * Ранг считается ЗДЕСЬ, в первой фазе, а не при записи профиля.
     *
     * Причина простая: награда за взятый тир — это операция со звёздами, а все
     * операции обязаны попасть в один пакет `prepareStarOperations`. Узнать про
     * тир после того, как пакет собран, уже поздно.
     */
    const profileNow = profileDefaults(entry.uid, existing.profile);
    const opponentUidNow = entry.uid === leftUid ? rightUid : leftUid;
    const opponentSeatNow = privateDoc.seatByStableUid[opponentUidNow];
    const opponentDivisionNow = Number((match.players as Json[])
      .find((player) => player.uid === opponentSeatNow)?.rank ?? profileNow.rank);
    const ratingDeltaNow = expansionEligibility.rating && match.mode === 'ranked'
      ? arenaRpDelta(profileNow.rank, opponentDivisionNow, outcome) : 0;
    const storedRankState: ArenaRankState = {
      rp: profileNow.rating,
      seasonBestTierIndex: Math.max(0, Math.trunc(Number(profileNow.seasonBestTierIndex ?? 0))),
      // Пожизненный лучший тир: по нему выдаются награды, поэтому он не
      // обнуляется ни сбросом сезона, ни откатом.
      lifetimeBestTierIndex: Math.max(0, Math.trunc(Number(profileNow.lifetimeBestTierIndex ?? 0))),
    };
    /**
     * Мягкий сброс на смене сезона (D-27) — здесь и только здесь.
     *
     * Отдельной задачи по расписанию не заводится намеренно: она означала бы
     * проход по ВСЕМ профилям раз в сезон, то есть счёт за чтения,
     * пропорциональный числу игроков, включая тех, кто в Арену не заходит.
     * Здесь сброс случается ровно один раз на игрока и ровно тогда, когда он
     * вернулся играть, — без единого лишнего чтения.
     */
    const rankStateBefore = String(profileNow.rankSeasonId ?? '') !== season.seasonId
      ? arenaSoftReset(storedRankState)
      : storedRankState;
    const rankChange = match.mode === 'ranked'
      ? arenaApplyRankOutcome({ state: rankStateBefore, outcome, rpDelta: ratingDeltaNow })
      // Нерейтинговый матч ранга не касается вовсе: ни очков, ни щита, ни серии.
      : { next: rankStateBefore, rpDelta: 0, event: 'none' as const, tierBefore: 0, tierAfter: 0 };

    const userSnap = userSnapByUid.get(entry.uid);
    const xpPatch = userSnap && xpEarned > 0
      ? arenaXpUserPatch({ userData: userSnap.data(), xpDelta: xpEarned, now: new Date(now) })
      : null;

    const starOps: StarOpRequest[] = [];
    if (starsEarned > 0) {
      starOps.push({
        opId: `arena_match:${String(match.matchId)}`,
        delta: starsEarned,
        reason: 'arena_match',
        sourceKind: 'arena_match',
        sourceId: String(match.matchId),
        ruleVersion: ARENA_XP_RULE_VERSION,
        earnedAtMs: now,
        // Расписка обязана объяснять своё число: без этого «почему 7, а не 14»
        // превращается в обращение в поддержку, на которое нечем ответить.
        meta: {
          mode: String(match.mode),
          rawStars: privateDoc.totals[entry.uid]?.rawSeasonStars ?? 0,
          multiplier: arenaDailyMultiplier(eligibleMatchIndex),
          eligibleMatchIndex,
          dailyStarsBefore,
          correct: correctAnswers,
          taskCount: privateDoc.tasks.length,
        },
      });
    }

    /**
     * Награда за взятый тир (D-63): КОСМЕТИКА, один раз за всю жизнь.
     *
     * Звёзды сюда не подмешиваются намеренно — владелец сказал прямо: «общую
     * экономику звёзд не трогаем». Звезда это валюта всего приложения (D-05),
     * и выдача за ранг меняла бы экономику целиком ради одного раздела.
     *
     * Ключ владения не содержит сезона: награда пожизненная, и ключ с сезоном
     * выдал бы её заново в следующем сезоне.
     */
    const tierRewards = match.mode === 'ranked'
      ? arenaTierRewardsEarned({
        lifetimeBestBefore: rankStateBefore.lifetimeBestTierIndex,
        lifetimeBestAfter: rankChange.next.lifetimeBestTierIndex,
      })
      : [];

    const prepared = userSnap && starOps.length
      ? await prepareStarOperations(tx, db, entry.uid, userSnap, starOps, {
        nowMs: now,
        activeSeasonId: season.seasonId,
        weekKeyNow,
        weekKeyForMs: arenaWeekKeyForMs,
        authUid: privateDoc.authByStableUid?.[entry.uid] ?? '',
        xpDelta: xpEarned,
        xpTotalAfter: xpPatch?.totalXpAfter ?? 0,
      })
      : null;

    settleByUid.set(entry.uid, {
      tierRewards,
      rankChange,
      outcome,
      eligibleMatchIndex,
      dailyRewardMatchesBefore,
      sameDay,
      dailyStarsBefore,
      starsEarned,
      xpEarned,
      dailyXpBefore,
      prepared,
      userPatch: xpPatch?.patch ?? {},
      totalXpAfter: xpPatch?.totalXpAfter ?? 0,
    });
  }

  refs.forEach((entry) => {
    const existing = dataByUid.get(entry.uid)!;
    const profile = profileDefaults(entry.uid, existing.profile);
    const seasonData = existing.season;
    const publicSeat = privateDoc.seatByStableUid[entry.uid];
    if (existing.receiptExists) {
      rewards[publicSeat] = { duplicate: true };
      return;
    }
    const settle = settleByUid.get(entry.uid)!;
    const outcome = settle.outcome;
    /**
     * Ранг посчитан в первой фазе — там, где собираются операции со звёздами:
     * награда за взятый тир обязана попасть в тот же пакет, что и награда за
     * матч, иначе она пошла бы отдельной записью документа игрока.
     *
     * Сами очки проводятся движком рангов, а не складываются напрямую: прямое
     * сложение не знает ни про щит от падения из тира, ни про промо-серию, и
     * игрок, только что взявший тир, терял бы его первым поражением. Движок
     * байт-в-байт совпадает с клиентским, расхождение поймает тест паритета
     * `arena_rank_parity`.
     */
    const rankChange = settle.rankChange;
    const ratingDelta = rankChange.rpDelta;
    const ratingAfter = rankChange.next.rp;
    const { eligibleMatchIndex, dailyRewardMatchesBefore, sameDay, dailyStarsBefore, starsEarned } = settle;
    const starsAfter = Math.max(0, Math.trunc(Number(seasonData.stars ?? 0))) + starsEarned;
    const spinKey = String(process.env.ARENA_V2_SPIN_HMAC_KEY ?? '').trim();
    const rollBps = spinKey
      ? createHmac('sha256', spinKey).update(`${match.matchId}|${entry.uid}|${season.seasonId}`).digest().readUInt32BE(0) % 10_000
      : -1;
    const spin = arenaRareSpin({
      mode: match.mode,
      opponentKind: privateDoc.participantStableUids.some((uid) => uid.startsWith('bot_')) ? 'bot' : 'human',
      rewardEligible: expansionEligibility.spin && !forcedWinnerStableUid
        && dailyRewardMatchesBefore < ARENA_DAILY_REWARD_MATCHES && rollBps >= 0,
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
      seasonBestTierIndex: rankChange.next.seasonBestTierIndex,
      lifetimeBestTierIndex: rankChange.next.lifetimeBestTierIndex,
      rankSeasonId: season.seasonId,
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
      dailyRewardMatches: dailyRewardMatchesBefore + (expansionEligibility.spin ? 1 : 0),
      dailyStarsCredited: dailyStarsBefore + starsEarned,
      // Потолок опыта за сутки хранится здесь же: документ и так читается и
      // пишется, значит счётчик обходится в ноль дополнительных операций.
      dailyXpCredited: settle.dailyXpBefore + settle.xpEarned,
      dailyMultiplierUsed: arenaDailyMultiplier(eligibleMatchIndex),
      // Счётчики дневных целей живут здесь же: документ и так читается и
      // пишется на каждом закрытии матча, значит цели обходятся в ноль
      // дополнительных операций. Отдельное хранилище под них пришлось бы
      // оплачивать ежедневно и навсегда.
      dailyMatches: (sameDay ? Math.max(0, Math.trunc(Number(seasonData.dailyMatches ?? 0))) : 0) + 1,
      dailyWins: (sameDay ? Math.max(0, Math.trunc(Number(seasonData.dailyWins ?? 0))) : 0)
        + (outcome === 'win' ? 1 : 0),
      dailyFirstAnswers: (sameDay ? Math.max(0, Math.trunc(Number(seasonData.dailyFirstAnswers ?? 0))) : 0)
        + Math.max(0, Math.trunc(Number(privateDoc.totals[entry.uid]?.firstCount ?? 0))),
      spinDropsToday: (sameDay ? Math.max(0, Math.trunc(Number(seasonData.spinDropsToday ?? 0))) : 0)
        + (spin.awarded ? 1 : 0),
      updatedAtMs: now,
    };
    const reward = {
      starsEarned,
      xpEarned: settle.xpEarned,
      totalXpAfter: settle.totalXpAfter,
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
      xpEarned: settle.xpEarned,
      totalXpAfter: settle.totalXpAfter,
      // Что случилось с рангом — экран результата рисует по этому полю:
      // повышение, откат, спасение щитом, начало и исход промо-серии.
      rankEvent: rankChange.event,
      rankTierBefore: rankChange.tierBefore,
      rankTierAfter: rankChange.tierAfter,
      ...(settle.tierRewards.length ? { tierRewards: settle.tierRewards } : {}),
    };
    if (expansionRunKind === 'rival') {
      tx.set(entry.profile, { activeMatchId: null, updatedAtMs: now }, { merge: true });
    } else {
      tx.set(entry.profile, nextProfile, { merge: true });
      tx.set(entry.season, nextSeason, { merge: true });
    }
    /**
     * Выдача косметики за тир.
     *
     * `tx.set` с merge, а не `create`: право владения могло уже существовать —
     * игрок мог купить тот же предмет в магазине. Падать на этом нельзя, матч
     * тут ни при чём; а `merge` оставит покупку покупкой и просто отметит, что
     * предмет ещё и заслужен.
     *
     * Звёзды не тратятся и не начисляются: награда за ранг — косметика (D-63),
     * общая экономика звёзд не трогается.
     */
    for (const tierReward of settle.tierRewards) {
      tx.set(
        db.collection('users').doc(entry.uid)
          .collection(ARENA_EXPANSION_COLLECTIONS.entitlements).doc(tierReward.itemId),
        {
          itemId: tierReward.itemId,
          source: 'arena_tier',
          tierIndex: tierReward.tierIndex,
          earnedAtMs: now,
        },
        { merge: true },
      );
    }
    tx.create(entry.receipt, {
      matchId: String(match.matchId), mode: match.mode, outcome, reward, settledAtMs: now,
      expireAt: timestamp(now + 400 * 24 * 60 * 60 * 1_000),
    });
    // Единый журнал звёзд и опыт уезжают ОДНОЙ записью документа игрока.
    if (settle.prepared) {
      commitStarOperations(tx, settle.prepared, settle.userPatch);
    } else if (Object.keys(settle.userPatch).length) {
      // Звёзд не было, а опыт есть — например быстрый матч.
      tx.set(db.collection('users').doc(entry.uid), settle.userPatch, { merge: true });
    }
    /**
     * Разбор матча пишется ВСЕГДА, а не под флагом расширения.
     *
     * Владелец потребовал разбор обязательным: «в конце матча разбор вопросов и
     * заданий». Запертый за флагом, он просто отсутствовал бы у большинства
     * игроков, а без него непонятно, что было правильно и почему звёзд столько.
     *
     * Лишней записи это не создаёт: документ тот же самый, что писала
     * «Лаборатория», просто перестал зависеть от её флага. Сам ЭКРАН
     * «Лаборатории» остаётся под флагом — под ним живут повторы заданий, а не
     * разбор.
     */
    {
      const viewerLab = arenaBuildViewerReviewSnapshot({
        matchId: String(match.matchId),
        runKind: expansionRunKind,
        createdAtMs: now,
        tasks: privateDoc.tasks,
        evidenceByTask: privateDoc.answers[entry.uid] ?? {},
        summary: privateDoc.totals[entry.uid] ?? {},
      });
      tx.set(db.collection('users').doc(entry.uid).collection(ARENA_EXPANSION_COLLECTIONS.matchLabs)
        .doc(String(match.matchId)), {
        ...viewerLab,
        expireAt: timestamp(now + ARENA_LAB_TTL_MS),
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
    const authUid = privateDoc.authByStableUid?.[uid] ?? '';
    tx.set(db.collection(ARENA_V2_COLLECTIONS.queue).doc(uid), {
      status: 'cancelled', closeReason: reason, cancelledAtMs: now, leaseExpiresAt: 0,
      /**
       * `authUid` пишется ещё раз нарочно, хотя запись идёт слиянием в
       * существующий документ.
       *
       * По этому полю правила Firestore решают, можно ли игроку читать свою
       * строку очереди. Слияние с `merge: true` СОЗДАЁТ документ, если его
       * нет, — и созданный без `authUid` документ становится нечитаемым для
       * своего же владельца. Чинить это некому: строки очереди нигде не
       * удаляются, поэтому подписка игрока молча ослепла бы навсегда, во всех
       * режимах сразу.
       *
       * Сейчас документ всегда есть — но цена страховки одно поле, а цена
       * ошибки такова, что заметить её можно только по жалобе.
       */
      ...(authUid ? { authUid } : {}),
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
      // Дневные цели: те же счётчики, что уже лежат в сезонном документе.
      dailyDayKey: typeof seasonData.dailyDayKey === 'string' ? seasonData.dailyDayKey : '',
      dailyMatches: Math.max(0, Math.trunc(Number(seasonData.dailyMatches ?? 0))),
      dailyWins: Math.max(0, Math.trunc(Number(seasonData.dailyWins ?? 0))),
      dailyFirstAnswers: Math.max(0, Math.trunc(Number(seasonData.dailyFirstAnswers ?? 0))),
      dailyStars: Math.max(0, Math.trunc(Number(seasonData.dailyStarsCredited ?? 0))),
      todayKey: utcDayKey(now),
      seasonEndsAtMs: season.endsAtMs,
      spinsAvailable,
      wins: profile.wins,
      losses: profile.losses,
      // Состояние ранга целиком: без щита и серии экран рангов показал бы
      // очки и умолчал о том, что игрок стоит в промо-серии, — а это как раз
      // то, что ему нужно знать перед следующим матчем.
      seasonBestTierIndex: Math.max(0, Math.trunc(Number(profile.seasonBestTierIndex ?? 0))),
      lifetimeBestTierIndex: Math.max(0, Math.trunc(Number(profile.lifetimeBestTierIndex ?? 0))),
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
  const matchId = db.collection(ARENA_V2_COLLECTIONS.matches).doc().id;
  const result = await db.runTransaction(async (tx) => {
    const [profileSnap, ownQueueSnap, candidates] = await Promise.all([
      tx.get(ownProfileRef),
      tx.get(ownQueueRef),
      tx.get(db.collection(ARENA_V2_COLLECTIONS.queue)
        .where('mode', '==', mode).where('status', '==', 'waiting')
        .orderBy('joinedAtMs', 'asc').limit(10)),
    ]);
    const existing = ownQueueSnap.data() ?? {};
    /**
     * Сколько ЖИВЫХ игроков сейчас ищет в этом режиме.
     *
     * Владелец: «для рейтинга показывать реальное количество реальных
     * пользователей в поиске». Считается из очереди, КОТОРУЮ МЫ И ТАК УЖЕ
     * ПРОЧИТАЛИ, — ни одного лишнего запроса. Отдельный вызов ради счётчика
     * означал бы опрос по кругу, а он запрещён.
     *
     * Число честное: в очереди рейтинга ботов не бывает вовсе, а свой
     * собственный билет из счёта вычитается — иначе одинокий игрок всё время
     * видел бы «ищет 1» и думал, что соперник вот-вот найдётся.
     */
    const searchingNow = candidates.docs
      .filter((doc) => doc.id !== who.stableUid && !doc.id.startsWith('bot_'))
      .length;
    if (existing.requestId === requestId && existing.status === 'matched' && existing.matchId) {
      return { status: 'matched' as const, matchId: String(existing.matchId),
        viewerSeat: existing.viewerSeat === 'b' ? 'b' as const : 'a' as const,
        queue: existing, searchingNow };
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
        // Владелец (2026-08-12): момент входа бота назначает СЕРВЕР, а не клиент,
        // иначе задержку легко подделать и она перестаёт быть случайной.
        // Только для быстрого матча: в рейтинге ботов нет.
        ...(mode === 'quick'
          ? { botDueAtMs: ownJoinedAt + arenaQuickBotDelayMs(randomUnit()) }
          : {}),
      };
      tx.set(ownProfileRef, { ...profile, updatedAtMs: now }, { merge: true });
      tx.set(ownQueueRef, queue);
      return { status: 'waiting' as const, queue, searchingNow };
    }
    const candidateData = candidate.data();
    const contentDivision = arenaContentDivision(profile.rank, candidateProfile!.rank);
    const pool = await loadArenaTaskPool(tx, contentDivision, matchId, mode);
    const privateEnvelope = selectedTaskEnvelope(matchId, pool, now, contentDivision, mode);
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
    const finalEnvelopeValidation = validateArenaPrivateEnvelope(built.privateDoc, mode);
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
      queue: { status: 'matched', matchId, viewerSeat: 'a' }, searchingNow };
  });
  return { ok: true, stableUid: who.stableUid, ...result };
});

/**
 * Свести ждущий билет с другим ждущим. Возвращает id матча или null.
 *
 * Отличие от одноимённой логики в `arenaV2FindMatch`: там всё считается от
 * актора вызова (`who`) — есть auth, профиль, права. Здесь актора нет вовсе,
 * работаем от двух билетов очереди. Поэтому проверки берутся из самих билетов,
 * а конфиг Арены сверяется отдельно: триггер обязан молчать, когда раздел
 * выключен, иначе матчи продолжат создаваться после выключения флага.
 */
async function pairWaitingQueueTicket(
  stableUid: string,
  mode: ArenaV2QueueMode,
  now: number,
): Promise<string | null> {
  const configSnap = await db.collection(ARENA_V2_COLLECTIONS.config).doc('current').get();
  const config = configSnap.data() ?? {};
  if (arenaConfigProblems(config).length) return null;
  const modeFlag = mode === 'ranked' ? 'rankedEnabled' : 'quickEnabled';
  if (config.enabled !== true || config[modeFlag] !== true) return null;

  const ownQueueRef = db.collection(ARENA_V2_COLLECTIONS.queue).doc(stableUid);
  const ownProfileRef = db.collection(ARENA_V2_COLLECTIONS.profiles).doc(stableUid);
  const matchId = db.collection(ARENA_V2_COLLECTIONS.matches).doc().id;

  return db.runTransaction(async (tx) => {
    const [ownQueueSnap, ownProfileSnap, candidates] = await Promise.all([
      tx.get(ownQueueRef),
      tx.get(ownProfileRef),
      tx.get(db.collection(ARENA_V2_COLLECTIONS.queue)
        .where('mode', '==', mode).where('status', '==', 'waiting')
        .orderBy('joinedAtMs', 'asc').limit(10)),
    ]);
    const own = ownQueueSnap.data() ?? {};
    // Билет мог измениться, пока триггер летел: отменён, уже сведён, протух.
    if (own.status !== 'waiting' || Number(own.leaseExpiresAt ?? 0) <= now) return null;
    const profile = profileDefaults(stableUid, ownProfileSnap.data());
    if (profile.activeMatchId) return null;

    const ownJoinedAt = Number(own.joinedAtMs ?? now);
    const eligible = candidates.docs.filter((doc) => {
      if (doc.id === stableUid || doc.id.startsWith('bot_')) return false;
      const data = doc.data();
      const rankedWindow = mode === 'ranked'
        && Math.min(now - ownJoinedAt, now - Number(data.joinedAtMs ?? now)) < 10_000 ? 0 : 1;
      return Number(data.leaseExpiresAt ?? 0) > now
        && Math.abs(profile.rank - Number(data.rank ?? 0)) <= (mode === 'quick' ? 3 : rankedWindow);
    });

    let candidate: admin.firestore.QueryDocumentSnapshot | undefined;
    let candidateProfile: Json | undefined;
    let pairRef: admin.firestore.DocumentReference | null = null;
    let pairData: Json = {};
    for (const possible of eligible) {
      const possibleProfile = profileDefaults(
        possible.id,
        (await tx.get(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(possible.id))).data(),
      );
      if (possibleProfile.activeMatchId
        || !arenaRanksCompatible(mode, profile.rank, possibleProfile.rank)) continue;
      if (mode === 'ranked') {
        // Тот же лимит повторных встреч, что и в callable: без него двое
        // активных игроков всю ночь играли бы только друг с другом.
        const currentRef = db.collection(ARENA_V2_COLLECTIONS.pairLimits)
          .doc(pairLimitId(stableUid, possible.id, utcDayKey(now)));
        const previousRef = db.collection(ARENA_V2_COLLECTIONS.pairLimits)
          .doc(pairLimitId(stableUid, possible.id, previousUtcDayKey(now)));
        const [currentPair, previousPair] = await Promise.all([
          tx.get(currentRef), tx.get(previousRef),
        ]);
        const data = currentPair.data() ?? {};
        const lastRatedAtMs = Math.max(Number(data.lastRatedAtMs ?? 0),
          Number(previousPair.data()?.lastRatedAtMs ?? 0));
        if (lastRatedAtMs > now - 30 * 60_000 || Number(data.ratedMatches ?? 0) >= 2
          || Number(data.reservationExpiresAtMs ?? 0) > now) continue;
        pairRef = currentRef;
        pairData = data;
      }
      candidate = possible;
      candidateProfile = possibleProfile;
      break;
    }
    if (!candidate || !candidateProfile) return null;

    const candidateData = candidate.data();
    const contentDivision = arenaContentDivision(profile.rank, candidateProfile.rank);
    const pool = await loadArenaTaskPool(tx, contentDivision, matchId, mode);
    const built = makeMatch({
      matchId, mode,
      left: { ...own.player, rank: profile.rank, rating: profile.rating },
      right: { ...candidateData.player, rank: candidateProfile.rank, rating: candidateProfile.rating },
      leftAuthUid: String(own.authUid),
      rightAuthUid: String(candidateData.authUid),
      privateEnvelope: selectedTaskEnvelope(matchId, pool, now, contentDivision, mode),
      now,
    });
    if (pairRef) built.privateDoc.pairLimitId = pairRef.id;
    if (!validateArenaPrivateEnvelope(built.privateDoc, mode).ok) return null;

    tx.create(db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId), built.publicDoc);
    tx.create(db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId), built.privateDoc);
    tx.create(memberRef(matchId, String(own.authUid)),
      memberMarker(matchId, String(own.authUid), 'a', now));
    tx.create(memberRef(matchId, String(candidateData.authUid)),
      memberMarker(matchId, String(candidateData.authUid), 'b', now));
    tx.set(ownQueueRef, { status: 'matched', matchId, matchedAtMs: now,
      viewerSeat: 'a', opponentKind: 'human' }, { merge: true });
    tx.set(candidate.ref, { status: 'matched', matchId, matchedAtMs: now,
      viewerSeat: 'b', opponentKind: 'human' }, { merge: true });
    tx.set(ownProfileRef, { activeMatchId: matchId, updatedAtMs: now }, { merge: true });
    tx.set(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(candidate.id),
      { activeMatchId: matchId, updatedAtMs: now }, { merge: true });
    if (pairRef) {
      tx.set(pairRef, {
        pairHashDay: pairRef.id,
        participantStableUids: [stableUid, candidate.id].sort(),
        utcDayKey: utcDayKey(now),
        ratedMatches: Math.max(0, Math.trunc(Number(pairData.ratedMatches ?? 0))),
        reservationMatchId: matchId,
        reservationExpiresAtMs: now + ARENA_V2_ACCEPT_MS,
        expireAt: timestamp(now + 32 * 24 * 60 * 60 * 1_000),
      }, { merge: true });
    }
    return matchId;
  });
}

/**
 * Сведение со стороны сервера, в момент появления билета в очереди.
 *
 * зачем: в старой Арене (`matchmaking.ts`, до 12.08) сервер сводил игроков сам
 * — триггером `onMatchmakingWrite` на запись в очередь. При переписывании в
 * arena_v2 эта часть выпала, и сведение осталось только внутри callable: пара
 * возникает, ТОЛЬКО когда чей-то телефон переспросит. Телефон переспрашивает
 * раз в 15 секунд и лишь на видимом экране, поэтому двое ждущих могли стоять
 * в очереди и не видеть друг друга. Владелец: «мгновенное подключение».
 *
 * Это НЕ крон (владелец запретил расписания): функция не тикает по времени, а
 * срабатывает ровно на событие «игрок встал в очередь».
 *
 * Дешевле нынешнего опроса: один запуск на вход в очередь против вызова раз в
 * 15 секунд с каждого ищущего телефона.
 *
 * Клиент узнаёт о паре мгновенно — он и так подписан на свой билет
 * (`useArenaQueue`), отдельного оповещения не нужно.
 */
export const arenaV2OnQueueWrite = onDocumentWritten({
  document: `${ARENA_V2_COLLECTIONS.queue}/{stableUid}`,
  region: 'us-central1',
  memory: '256MiB',
  // Сведение — гонка по своей природе: две записи об одной паре обязаны
  // сериализоваться, иначе оба игрока получат по своему матчу.
  maxInstances: 3,
  secrets: ARENA_V2_SECRET_NAMES,
}, async (event) => {
  const after = event.data?.after?.data();
  // Интересует только билет, который ЖДЁТ соперника. Отмены, найденные пары и
  // удаления обрабатывать нечего — иначе триггер будит сам себя по кругу.
  if (!after || after.status !== 'waiting') return;
  const mode = after.mode === 'ranked' ? 'ranked' : after.mode === 'quick' ? 'quick' : null;
  if (!mode) return;
  const stableUid = String(event.params.stableUid ?? '');
  if (!stableUid || stableUid.startsWith('bot_')) return;

  const now = nowMs();
  if (Number(after.leaseExpiresAt ?? 0) <= now) return;

  try {
    await pairWaitingQueueTicket(stableUid, mode, now);
  } catch (e) {
    // Молча: сведение повторится на следующем билете или на сверке клиента.
    // Ронять триггер нельзя — Firebase будет ретраить его по кругу.
    console.info(JSON.stringify({ event: 'arena_v2_pair_trigger_skipped',
      reason: String((e as { message?: unknown })?.message ?? e).slice(0, 120) }));
  }
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
    const [queueSnap, profileSnap, candidates] = await Promise.all([
      tx.get(queueRef), tx.get(profileRef),
      tx.get(db.collection(ARENA_V2_COLLECTIONS.queue)
        .where('mode', '==', 'quick').where('status', '==', 'waiting')
        .orderBy('joinedAtMs', 'asc').limit(10)),
    ]);
    const queue = queueSnap.data() ?? {};
    if (queue.requestId !== requestId || queue.authUid !== who.authUid || queue.mode !== 'quick') {
      throw new HttpsError('failed-precondition', 'arena_quick_queue_missing');
    }
    if (queue.status === 'matched' && queue.matchId) return {
      matchId: String(queue.matchId),
      opponentKind: 'human' as const,
      viewerSeat: queue.viewerSeat === 'b' ? 'b' as const : 'a' as const,
    };
    if (queue.status !== 'waiting') throw new HttpsError('failed-precondition', 'arena_quick_queue_not_waiting');
    const joinedAtMs = Number(queue.joinedAtMs ?? now);
    const botDueAtMs = Number.isFinite(Number(queue.botDueAtMs))
      ? Number(queue.botDueAtMs)
      : joinedAtMs + ARENA_V2_QUICK_BOT_MAX_MS;
    if (now < Math.max(botDueAtMs, joinedAtMs + ARENA_V2_QUICK_BOT_FALLBACK_MS)) {
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
      const contentDivision = arenaContentDivision(profile.rank, candidateProfile.rank);
      const pool = await loadArenaTaskPool(tx, contentDivision, matchId, 'quick');
      const privateEnvelope = selectedTaskEnvelope(matchId, pool, now, contentDivision, 'quick');
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
      return { matchId, opponentKind: 'human', viewerSeat: 'a' as const };
    }
    const botUid = `bot_${randomId(8)}`;
    const pool = await loadArenaTaskPool(tx, profile.rank, matchId, 'quick');
    const privateEnvelope = selectedTaskEnvelope(matchId, pool, now, profile.rank, 'quick');
    const built = makeMatch({
      matchId, mode: 'quick', left: playerSnapshot(who.stableUid, who.user, profile),
      right: playerSnapshot(
        botUid,
        {
          displayName: arenaBotDisplayName(botSeed, typeof who.user.lang === 'string' ? who.user.lang : undefined),
          // Без аватара бот выдавал себя с первого кадра: у живого игрока
          // картинка есть, у бота была заглушка.
          avatar: arenaBotAvatar(botSeed, who.user.avatar),
        },
        { rank: profile.rank, rating: profile.rating },
      ),
      leftAuthUid: who.authUid, privateEnvelope, now, bot: true, botSeed,
    });
    tx.create(db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId), built.publicDoc);
    tx.create(db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId), built.privateDoc);
    tx.create(memberRef(matchId, who.authUid), memberMarker(matchId, who.authUid, 'a', now));
    tx.set(queueRef, { status: 'matched', matchId, matchedAtMs: now,
      viewerSeat: 'a', opponentKind: 'human' }, { merge: true });
    tx.set(profileRef, { ...profile, activeMatchId: matchId, updatedAtMs: now }, { merge: true });
    return { matchId, opponentKind: 'human' as const, viewerSeat: 'a' as const };
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
    // Повторный accept закрытого матча обязан быть чистым чтением. Иначе
    // старый экран после возврата мог очистить activeMatchId и очередь уже
    // НОВОГО матча того же игрока.
    if (match.terminal === true || match.state === 'settled' || match.state === 'aborted') {
      return { match, viewerSeat };
    }
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
    const advanced = advanceAnyMatch(match, privateDoc, now);
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
    const dodgeProfileSnap = match.mode === 'ranked'
      ? await tx.get(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid)) : null;
    if (match.state !== 'accepting') throw new HttpsError('failed-precondition', 'arena_match_already_started');
    if (match.mode === 'ranked') recordRankedQueueDodge(tx, who.stableUid, dodgeProfileSnap?.data(), now);
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
    // Матч v3 считается на устройстве и сдаётся одним отчётом. Пошаговый ответ
    // по нему означает старую сборку клиента на новом матче: принять его —
    // значит записать расписку, которую отчёт потом уже не перезапишет.
    if (arenaIsDuelV3(match)) throw new HttpsError('failed-precondition', 'arena_duel_v3_report_required');
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
    // Матч v3 считается на устройстве и сдаётся одним отчётом. Пошаговый ответ
    // по нему означает старую сборку клиента на новом матче: принять его —
    // значит записать расписку, которую отчёт потом уже не перезапишет.
    if (arenaIsDuelV3(match)) throw new HttpsError('failed-precondition', 'arena_duel_v3_report_required');
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
    // Sync закрытого матча идемпотентен и не трогает профиль/очередь: они уже
    // могут принадлежать следующему матчу.
    if (match.terminal === true || match.state === 'settled' || match.state === 'aborted') {
      return { match, viewerSeat, viewerReward: privateDoc.rewardsByStableUid?.[who.stableUid] };
    }
    const pairRef = match.mode === 'ranked' && privateDoc.pairLimitId && !privateDoc.pairLimitCommitted
      ? db.collection(ARENA_V2_COLLECTIONS.pairLimits).doc(privateDoc.pairLimitId) : null;
    const pairSnap = pairRef ? await tx.get(pairRef) : null;
    const advanced = advanceAnyMatch(match, privateDoc, now);
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

/* ══════════════════════ Дуэль v3: план и отчёт ════════════════════════════ */

/**
 * Почему матч больше не идёт по заданию за раз.
 *
 * В v2 каждый ответ был вызовом сервера: игрок нажимал вариант и ждал ответа
 * сети, прежде чем увидеть «верно». На плохой связи это полсекунды и больше на
 * КАЖДОЕ задание, и владелец назвал это недопустимым прямо: «чтобы не было
 * вообще задержек, даже 1 секунда недопустима».
 *
 * v3 разворачивает это: при старте клиент получает весь набор заданий вместе с
 * отпечатками правильных ответов, ведёт матч сам и присылает ОДИН отчёт.
 * Сервер пересчитывает отчёт по запечатанным заданиям — не ради защиты от
 * читеров (владелец: «нам похуй на античит»), а чтобы начисленное совпало с
 * показанным даже когда правила поменялись, а сборка у игрока старая.
 *
 * Побочный и важный эффект: записей в Firestore на матч становится две вместо
 * двух десятков.
 */

const ARENA_DUEL_REPORT_MAX_BYTES = 24 * 1_024;

function arenaDuelEntryMode(mode: unknown): ArenaEntryMode {
  const value = String(mode ?? '');
  return value === 'ranked' || value === 'quick' || value === 'friend'
    || value === 'series' || value === 'today' || value === 'ghost'
    ? value : 'quick';
}

/**
 * Ходы соперника-бота, выданные вперёд одним куском.
 *
 * Так индикатор «соперник ответил» срабатывает мгновенно и без единого чтения
 * базы во время матча. У живого соперника массив пуст, и его прогресс идёт
 * через Realtime Database — по пустому массиву тип соперника не читается,
 * потому что у живого он тоже может опоздать.
 */
function arenaDuelOpponentTicks(privateDoc: MatchPrivate): ArenaOpponentTickWire[] {
  if (!privateDoc.botPlan) return [];
  return privateDoc.tasks.map((task, taskIndex) => {
    const plan = privateDoc.botPlan?.[String(taskIndex)];
    const mode = task.mode as ArenaTaskMode;
    const window = ARENA_ANSWER_MS[mode] ?? ARENA_V2_ANSWER_MS;
    if (!plan) return { taskIndex, raceElapsedMs: window, correct: false };
    const correct = mode === 'speed_match'
      ? Math.trunc(Number(plan.matchedPairs ?? 0)) > 0
      : plan.correct === true && plan.timedOut !== true;
    const elapsed = plan.timedOut ? window : Math.max(0, Math.min(window, Math.trunc(Number(plan.elapsedMs ?? window))));
    const firstAttemptPairs = arenaOpponentFirstAttemptPairs(mode, plan.matchedPairs);
    return {
      taskIndex,
      raceElapsedMs: elapsed,
      correct,
      ...(firstAttemptPairs === undefined ? {} : { firstAttemptPairs }),
    };
  });
}

function arenaDuelPlanTasks(matchId: string, privateDoc: MatchPrivate): ArenaPlanTask[] {
  const planned: ArenaPlanTask[] = [];
  for (let index = 0; index < privateDoc.tasks.length; index += 1) {
    const task = arenaPlanTask(matchId, privateDoc.tasks[index], index);
    // Одно негодное задание рушит весь матч, а не портит его тихо: половина
    // плана хуже, чем честная невозможность начать.
    if (!task) throw new HttpsError('data-loss', 'arena_duel_plan_task_invalid');
    planned.push(task);
  }
  return planned;
}

/**
 * Выдаёт план матча и помечает матч как v3.
 *
 * Пометка обязана лечь ДО того, как игрок начнёт играть. Без неё пошаговая
 * машина v2 — её дёргает и `arenaV2SyncMatch`, и почасовая уборка — прошагала
 * бы по заданиям и закрыла их просрочкой, пока матч идёт на устройстве.
 * Настоящий отчёт пришёл бы на готовые нулевые расписки, а `storeReceipt` их
 * не перезаписывает: игрок получил бы ноль за выигранный матч.
 *
 * Это единственная запись за весь ход матча, и она одна на матч: повтор
 * вызова ничего не пишет.
 */
export const arenaV2MatchPlan = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'home', true);
  const matchId = safeId(request.data?.matchId, 'match_id');
  const now = nowMs();
  const matchRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId);
  const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId);

  const marked = await db.runTransaction(async (tx) => {
    const [matchSnap, privateSnap] = await Promise.all([tx.get(matchRef), tx.get(privateRef)]);
    if (!matchSnap.exists || !privateSnap.exists) throw new HttpsError('not-found', 'arena_match_missing');
    const match = clone(matchSnap.data()!);
    const privateDoc = clone(privateSnap.data()!) as MatchPrivate;
    assertParticipant(match, privateDoc, who);
    if (match.terminal === true) throw new HttpsError('failed-precondition', 'arena_match_finished');
    if (match.state === 'accepting') throw new HttpsError('failed-precondition', 'arena_match_not_accepted');
    if (arenaIsDuelV3(match) && privateDoc.duelPlanIssuedAtMs) return { match, privateDoc };

    // Начало матча — конец отсчёта, а не «сейчас». Иначе тот, кто дольше грузил
    // план, получил бы фору по дедлайну закрытия.
    const startedAtMs = Math.trunc(Number(
      privateDoc.duelStartedAtMs ?? match.stateDeadlineAtMs ?? (now + ARENA_DUEL_COUNTDOWN_MS),
    ));
    match.duelVersion = 3;
    match.stateDeadlineAtMs = arenaSettleDeadlineMs(startedAtMs, privateDoc.tasks as { mode: ArenaTaskMode }[]);
    match.version = Number(match.version ?? 0) + 1;
    privateDoc.duelPlanIssuedAtMs = now;
    privateDoc.duelStartedAtMs = startedAtMs;
    tx.set(matchRef, match);
    tx.set(privateRef, privateDoc);
    return { match, privateDoc };
  });
  const match = marked.match;
  const privateDoc = marked.privateDoc;

  const viewerSeat = privateDoc.seatByStableUid[who.stableUid];
  const opponentSeat: 'a' | 'b' = viewerSeat === 'a' ? 'b' : 'a';
  const opponentPlayer = (match.players as Json[]).find((player) => player.uid === opponentSeat) ?? {};
  const tasks = arenaDuelPlanTasks(matchId, privateDoc);
  const entryMode = arenaDuelEntryMode(match.mode);
  const startedAtMs = Math.trunc(Number(privateDoc.duelStartedAtMs ?? now));

  const plan: ArenaMatchPlanWire = {
    schemaVersion: ARENA_PLAN_SCHEMA_VERSION,
    rulesVersion: ARENA_STARS_RULES_VERSION,
    matchId,
    mode: entryMode,
    viewerSeat,
    taskCount: tasks.length,
    countdownMs: ARENA_DUEL_COUNTDOWN_MS,
    readingMs: ARENA_DUEL_READING_MS,
    revealMs: ARENA_DUEL_REVEAL_MS,
    rules: arenaMatchPlanRules(entryMode, tasks.length),
    tasks,
    opponent: {
      seat: opponentSeat,
      name: String(opponentPlayer.name ?? ''),
      ...(opponentPlayer.avatar ? { avatar: String(opponentPlayer.avatar) } : {}),
      ...(opponentPlayer.aura ? { aura: String(opponentPlayer.aura) } : {}),
      rank: Math.trunc(Number(opponentPlayer.rank ?? 0)),
    },
    opponentTicks: arenaDuelOpponentTicks(privateDoc),
    liveChannelPath: `arenaLive/${matchId}`,
    planHash: arenaPlanHash(matchId, privateDoc.tasks),
    issuedAtMs: now,
  };
  return { ok: true, startedAtMs, deadlineAtMs: arenaSettleDeadlineMs(startedAtMs, privateDoc.tasks as { mode: ArenaTaskMode }[]), plan };
});

/**
 * Превращает пересчитанные исходы в те же расписки, что писал пошаговый v2.
 *
 * Ровно один путь закрытия матча на весь бэкенд: `settleMatch` читает
 * `answers`/`totals` и ничего не знает про дуэль v3. Заводить второй путь
 * означало бы держать две правды про награды.
 */
function arenaDuelStoreOutcomes(
  privateDoc: MatchPrivate,
  stableUid: string,
  reportId: string,
  outcomes: readonly ArenaTaskOutcome[],
  starsPerTask: readonly number[],
  receivedAtMs: number,
  /**
   * Сколько заданий закрыто ПЕРВЫМ верным ответом. Владелец (D-62) просил
   * дневную цель «ответь первым N раз», а вывести это из расписок нельзя:
   * третья звезда за скорость и звезда за серию дают одно и то же число.
   * Счётчик кладётся в те же `totals`, что уже пишутся, — ноль новых записей.
   */
  firstCount = 0,
): void {
  privateDoc.totals[stableUid] ??= {
    score: 0, elapsedMs: 0, correct: 0, fullySolved: 0, rawSeasonStars: 0, submittedAnswers: 0,
  };
  privateDoc.totals[stableUid].firstCount =
    Math.max(0, Math.trunc(Number(privateDoc.totals[stableUid].firstCount ?? 0))) + Math.max(0, firstCount);
  outcomes.forEach((outcome, index) => {
    const stars = Math.max(0, Math.trunc(Number(starsPerTask[index] ?? 0)));
    const solved = outcome.mode === 'speed_match'
      ? outcome.firstAttemptPairs > 0
      : outcome.status === 'correct';
    storeReceipt(privateDoc, stableUid, {
      submissionId: `${reportId}:${index}`,
      taskIndex: index,
      correct: solved,
      // Звёзды и есть счёт матча (владелец 2026-08-12): отдельных очков нет.
      points: stars,
      elapsedMs: Math.max(0, Math.trunc(Number(outcome.raceElapsedMs))),
      seasonStars: stars,
      receivedAtMs,
      ...(outcome.status === 'timeout' ? { timedOut: true } : {}),
      answerSnapshot: arenaSanitizeAnswerSnapshot(outcome.answer ?? null),
    });
  });
}

/**
 * Принимает отчёт о матче. Повтор с тем же `reportId` безвреден: расписки уже
 * лежат, `storeReceipt` их не перезаписывает, и ответ приходит тот же.
 */
export const arenaV2MatchFinish = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'home', true);
  const matchId = safeId(request.data?.matchId, 'match_id');
  const reportId = safeId(request.data?.reportId, 'report_id');
  const rawReport = request.data?.report;
  if (Buffer.byteLength(JSON.stringify(rawReport ?? null), 'utf8') > ARENA_DUEL_REPORT_MAX_BYTES) {
    throw new HttpsError('invalid-argument', 'arena_report_too_large');
  }
  const now = nowMs();
  const matchRef = db.collection(ARENA_V2_COLLECTIONS.matches).doc(matchId);
  const privateRef = db.collection(ARENA_V2_COLLECTIONS.matchPrivate).doc(matchId);
  const viewerLabRef = db.collection('users').doc(who.stableUid)
    .collection(ARENA_EXPANSION_COLLECTIONS.matchLabs).doc(matchId);

  const output = await db.runTransaction(async (tx) => {
    const [matchSnap, privateSnap, viewerLabSnap] = await Promise.all([
      tx.get(matchRef), tx.get(privateRef), tx.get(viewerLabRef),
    ]);
    if (!matchSnap.exists || !privateSnap.exists) throw new HttpsError('not-found', 'arena_match_missing');
    const match = clone(matchSnap.data()!);
    const privateDoc = clone(privateSnap.data()!) as MatchPrivate;
    assertParticipant(match, privateDoc, who);
    const viewerSeat = privateDoc.seatByStableUid[who.stableUid];

    const stored = privateDoc.duelReports?.[who.stableUid];
    if (stored) {
      if (stored.reportId !== reportId) throw new HttpsError('already-exists', 'arena_report_conflict');
      const viewerLab = arenaBuildViewerReviewSnapshot({
        matchId,
        runKind: privateDoc.runKind ?? 'match',
        createdAtMs: stored.receivedAtMs,
        tasks: privateDoc.tasks,
        evidenceByTask: privateDoc.answers[who.stableUid] ?? {},
        summary: privateDoc.totals[who.stableUid] ?? {},
      });
      if (!viewerLabSnap.exists) tx.create(viewerLabRef, {
        ...viewerLab,
        expireAt: timestamp(stored.receivedAtMs + ARENA_LAB_TTL_MS),
      });
      return {
        match, viewerSeat, report: stored, viewerReward: privateDoc.rewardsByStableUid?.[who.stableUid],
        viewerReview: viewerLab.tasks,
      };
    }
    if (match.state === 'accepting') throw new HttpsError('failed-precondition', 'arena_match_not_accepted');
    if (match.state === 'aborted') throw new HttpsError('failed-precondition', 'arena_match_aborted');

    const report = arenaAssertReportShape(rawReport, privateDoc.tasks.length);
    if (report.matchId !== matchId) throw new HttpsError('invalid-argument', 'arena_report_match_mismatch');
    if (report.seat !== viewerSeat) throw new HttpsError('permission-denied', 'arena_report_seat_mismatch');
    if (report.planHash !== arenaPlanHash(matchId, privateDoc.tasks)) {
      // План разъехался: у игрока на руках не тот набор заданий, что запечатан.
      // Считать по нему нельзя — начисление было бы не за то, что он решал.
      throw new HttpsError('failed-precondition', 'arena_report_plan_mismatch');
    }

    const outcomes = arenaNormalizeReport(matchId, privateDoc.tasks, report.tasks ?? []);
    const opponentStableUid = privateDoc.participantStableUids.find((uid) => uid !== who.stableUid);
    const opponentReport = opponentStableUid ? privateDoc.duelReports?.[opponentStableUid] : undefined;
    const opponentOutcomes: (ArenaTaskOutcome | null)[] = opponentReport
      ? privateDoc.tasks.map((_, index) => opponentReport.outcomes[index] ?? null)
      : privateDoc.tasks.map(() => null);
    const score = arenaScoreReport(privateDoc.tasks, outcomes, opponentOutcomes);

    const entry: ArenaDuelStoredReport = {
      reportId,
      seat: viewerSeat,
      receivedAtMs: now,
      shownMatchStars: Math.max(0, Math.trunc(Number(report.shownMatchStars ?? 0))),
      actualMatchStars: score.matchStars,
      starsDelta: arenaDeclaredVsActualDelta(report.shownMatchStars, score.matchStars),
      abandoned: report.abandoned === true,
      clockSuspect: report.clockSuspect === true,
      outcomes: arenaDuelSlimOutcomes(outcomes),
    };
    privateDoc.duelReports = { ...(privateDoc.duelReports ?? {}), [who.stableUid]: entry };
    privateDoc.duelFirstReportAtMs ??= now;
    arenaDuelStoreOutcomes(privateDoc, who.stableUid, reportId, outcomes,
      score.perTask.map((row) => row.stars), now, score.firstCount);
    refreshPublicTotals(match, privateDoc, privateDoc.tasks.length - 1);
    const viewerLab = arenaBuildViewerReviewSnapshot({
      matchId,
      runKind: privateDoc.runKind ?? 'match',
      createdAtMs: now,
      tasks: privateDoc.tasks,
      evidenceByTask: privateDoc.answers[who.stableUid] ?? {},
      summary: privateDoc.totals[who.stableUid] ?? {},
    });

    // Соперник-бот отчёт не присылает: его ходы уже выданы планом, поэтому он
    // сдаётся здесь же, из того же источника, что видел игрок.
    if (opponentStableUid && privateDoc.botPlan && !privateDoc.duelReports[opponentStableUid]) {
      const ticks = arenaDuelOpponentTicks(privateDoc);
      const botOutcomes: ArenaTaskOutcome[] = privateDoc.tasks.map((task, index) => {
        const mode = task.mode as ArenaTaskMode;
        const tick = ticks[index];
        const pairs = mode === 'speed_match'
          ? Math.max(0, Math.min(4, Math.trunc(Number(privateDoc.botPlan?.[String(index)]?.matchedPairs ?? 0))))
          : 0;
        return {
          taskIndex: index,
          mode,
          status: (tick?.correct ? 'correct' : 'timeout'),
          raceElapsedMs: Math.max(0, Math.trunc(Number(tick?.raceElapsedMs ?? ARENA_ANSWER_MS[mode]))),
          firstAttemptPairs: pairs,
          resolvedPairs: pairs,
          answer: null,
        };
      });
      const botScore = arenaScoreReport(privateDoc.tasks, botOutcomes, outcomes);
      privateDoc.duelReports[opponentStableUid] = {
        reportId: `bot:${matchId}`,
        seat: viewerSeat === 'a' ? 'b' : 'a',
        receivedAtMs: now,
        shownMatchStars: botScore.matchStars,
        actualMatchStars: botScore.matchStars,
        starsDelta: 0,
        abandoned: false,
        clockSuspect: false,
        outcomes: botOutcomes,
      };
      arenaDuelStoreOutcomes(privateDoc, opponentStableUid, `bot:${matchId}`, botOutcomes,
        botScore.perTask.map((row) => row.stars), now, botScore.firstCount);
      refreshPublicTotals(match, privateDoc, privateDoc.tasks.length - 1);
    }

    const startedAtMs = Math.trunc(Number(privateDoc.duelStartedAtMs ?? match.stateStartedAtMs ?? now));
    const settleNow = arenaShouldSettle({
      nowMs: now,
      startedAtMs,
      tasks: privateDoc.tasks as { mode: ArenaTaskMode }[],
      reportsIn: Object.keys(privateDoc.duelReports).length,
      participants: privateDoc.participantStableUids.length,
      firstReportAtMs: privateDoc.duelFirstReportAtMs ?? now,
      // Присутствие живого соперника здесь неизвестно: единственное дешёвое
      // основание — его собственный отчёт. Всё остальное закрывает дедлайн.
      opponentPresent: !opponentReport && !privateDoc.botPlan,
    });

    match.version = Number(match.version ?? 0) + 1;
    if (settleNow) {
      match.state = 'task_reveal';
      match.currentTaskIndex = privateDoc.tasks.length - 1;
      match.stateStartedAtMs = now;
      match.stateDeadlineAtMs = now;
      await settleMatch(tx, matchRef, privateRef, match, privateDoc, now);
    } else {
      match.stateDeadlineAtMs = arenaSettleDeadlineMs(startedAtMs, privateDoc.tasks as { mode: ArenaTaskMode }[]);
      if (!viewerLabSnap.exists) tx.create(viewerLabRef, {
        ...viewerLab,
        expireAt: timestamp(now + ARENA_LAB_TTL_MS),
      });
      tx.set(matchRef, match);
      tx.set(privateRef, privateDoc);
    }
    return {
      match, viewerSeat, report: entry, viewerReward: privateDoc.rewardsByStableUid?.[who.stableUid],
      viewerReview: viewerLab.tasks,
    };
  });

  const settled = output.match.state === 'settled';
  return {
    ...matchResponse(output.match, output.viewerSeat, output.viewerReward),
    matchStars: output.report.actualMatchStars,
    starsDelta: output.report.starsDelta,
    viewerReview: output.viewerReview,
    settled,
    // Когда спросить о закрытии, если соперник ещё не сдал. Один вызов, не опрос.
    ...(settled ? {} : { settleProbeAtMs: arenaDuelSettleProbeAtMs(output.report.receivedAtMs) }),
  };
});

/**
 * Закрывает матч, если для этого пришло время.
 *
 * Кто это зовёт: игрок, сдавший отчёт первым, — РОВНО ОДИН РАЗ, когда истекло
 * окно ожидания соперника (`settleProbeAtMs` из ответа `arenaV2MatchFinish`).
 * Опрос по кругу здесь запрещён намеренно: он и есть тот самый «хартбит
 * каждую секунду», от которого растёт счёт за базу. Если и этот вызов не
 * дойдёт, матч закроет почасовая уборка — просто позже.
 *
 * Вызов идемпотентен: у закрытого матча он ничего не делает и возвращает то
 * же самое.
 */
export const arenaV2MatchSettle = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
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
    if (match.terminal === true) {
      return { match, viewerSeat, viewerReward: privateDoc.rewardsByStableUid?.[who.stableUid] };
    }
    const pairRef = match.mode === 'ranked' && privateDoc.pairLimitId && !privateDoc.pairLimitCommitted
      ? db.collection(ARENA_V2_COLLECTIONS.pairLimits).doc(privateDoc.pairLimitId) : null;
    const pairSnap = pairRef ? await tx.get(pairRef) : null;
    const advanced = advanceAnyMatch(match, privateDoc, now);
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
  return {
    ...matchResponse(output.match, output.viewerSeat, output.viewerReward),
    settled: output.match.state === 'settled',
  };
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
    const dodgeProfileSnap = match.mode === 'ranked' && match.state === 'accepting'
      ? await tx.get(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(who.stableUid)) : null;
    if (match.state === 'settled' || match.state === 'aborted') {
      return { match, viewerSeat, viewerReward: privateDoc.rewardsByStableUid?.[who.stableUid] };
    }
    if (match.state === 'accepting') {
      if (match.mode === 'ranked') recordRankedQueueDodge(tx, who.stableUid, dodgeProfileSnap?.data(), now);
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

/**
 * Баг аудита №3: слив ДО старта матча не наказывался. Кулдаун писался только
 * внутри settleMatch, а отказ на фазе принятия завершал матч раньше, чем до неё
 * доходило. Значит в рейтинге можно было бесконечно отклонять неудобных
 * соперников без последствий. Теперь отказ и выход до старта в рейтинге
 * считаются сливом наравне с выходом из начавшегося матча.
 */
function recordRankedQueueDodge(
  tx: admin.firestore.Transaction,
  stableUid: string,
  profileData: Json | undefined,
  now: number,
): void {
  const previous = Array.isArray(profileData?.forfeitTimestampsMs)
    ? profileData!.forfeitTimestampsMs.filter((value: unknown) => Number(value) > now - 24 * 60 * 60 * 1_000)
    : [];
  tx.set(db.collection(ARENA_V2_COLLECTIONS.profiles).doc(stableUid), {
    forfeitTimestampsMs: [...previous, now].slice(-8),
    updatedAtMs: now,
  }, { merge: true });
}

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
    const contentDivision = arenaContentDivision(hostProfile.rank, guestProfile.rank);
    const pool = await loadArenaTaskPool(tx, contentDivision, matchId, 'friend');
    const privateEnvelope = selectedTaskEnvelope(matchId, pool, now, contentDivision, 'friend');
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

/**
 * Таблица друзей и собственный процентиль (D-28).
 *
 * Глобального топа нет намеренно: в списке из миллиона строк место игрока ему
 * ничего не говорит. Друзья говорят — их он знает.
 *
 * Стоимость ограничена сверху жёстко: не больше `ARENA_FRIENDS_BOARD_LIMIT`
 * профилей за вызов, и вызов делается при открытии экрана, а не по кругу.
 * Процентиль считается по той же выборке — отдельного прохода по всей базе,
 * который стоил бы столько же, сколько игроков в игре, здесь нет.
 */
const ARENA_FRIENDS_BOARD_LIMIT = 50;

export const arenaV2FriendsBoard = onCall(ARENA_V2_CALLABLE_OPTIONS, async (request) => {
  const who = await arenaActor(request, 'home', true);
  const friendsSnap = await db.collection('users').doc(who.stableUid).collection('friends')
    .limit(ARENA_FRIENDS_BOARD_LIMIT).get();
  const friendUids = friendsSnap.docs.map((doc) => doc.id).filter((uid) => uid && uid !== who.stableUid);

  const profileRefs = [who.stableUid, ...friendUids]
    .map((uid) => db.collection(ARENA_V2_COLLECTIONS.profiles).doc(uid));
  // Один пакетный запрос вместо цикла: столько же документов, но одно
  // обращение вместо пятидесяти.
  const profileSnaps = profileRefs.length ? await db.getAll(...profileRefs) : [];

  const rows = profileSnaps.map((snap, index) => {
    const uid = index === 0 ? who.stableUid : friendUids[index - 1];
    const profile = profileDefaults(uid, snap.data());
    return {
      stableUid: uid,
      you: index === 0,
      rating: Math.max(0, Math.trunc(Number(profile.rating ?? 0))),
      rank: Math.max(0, Math.trunc(Number(profile.rank ?? 0))),
      seasonBestTierIndex: Math.max(0, Math.trunc(Number(profile.seasonBestTierIndex ?? 0))),
      wins: Math.max(0, Math.trunc(Number(profile.wins ?? 0))),
      losses: Math.max(0, Math.trunc(Number(profile.losses ?? 0))),
      // Имя сюда не кладём: у друга оно уже есть на клиенте, а лишняя копия
      // персональных данных в ответе — это то, что потом придётся вычищать.
    };
  }).sort((left, right) => right.rating - left.rating || left.stableUid.localeCompare(right.stableUid));

  const ownRating = rows.find((row) => row.you)?.rating ?? 0;
  const ladder = rows.map((row) => row.rating).sort((left, right) => left - right);
  return {
    ok: true,
    rows,
    ownRating,
    // Показывается, только когда сравнивать есть с кем: «ты выше 0 %» при
    // отсутствии друзей — не информация, а упрёк.
    percentileAbove: rows.length > 1 ? arenaPercentileAbove(ownRating, ladder) : null,
    friendsCount: friendUids.length,
    truncated: friendsSnap.size >= ARENA_FRIENDS_BOARD_LIMIT,
  };
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
  const userRef = db.collection('users').doc(who.stableUid);
  const output = await db.runTransaction(async (tx) => {
    const [seasonSnap, claimSnap] = await Promise.all([
      tx.get(seasonRef), tx.get(claimRef),
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
      appendExternalEconomyEvent(tx, userRef, {
        source: 'arena_v2_season', eventId: claimRef.id, ownerStableId: who.stableUid,
        delta: reward.amount, reason: 'arena_v2_season_reward', kind: 'competition_arena_season_reward',
        subjectId: claimRef.id, payload: { seasonId, level, side }, createdAtMs: now,
      });
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
  const userRef = db.collection('users').doc(who.stableUid);
  const existing = await resultRef.get();
  if (existing.exists) return { ok: true, ...existing.data() };
  const now = nowMs();
  const availableQuery = db.collection('users').doc(who.stableUid).collection(ARENA_V2_COLLECTIONS.spinCredits)
    .where('status', '==', 'available')
    .where('expiresAtMs', '>', now)
    .orderBy('expiresAtMs', 'asc')
    .limit(1);
  const output = await db.runTransaction(async (tx) => {
    const [resultSnap, availableSnap] = await Promise.all([
      tx.get(resultRef), tx.get(availableQuery),
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
    appendExternalEconomyEvent(tx, userRef, {
      source: 'arena_v2_spin', eventId: requestId, ownerStableId: who.stableUid,
      delta: amount, reason: 'arena_v2_spin_reward', kind: 'competition_arena_spin_reward',
      subjectId: creditRef.id, payload: { creditId: creditRef.id }, createdAtMs: now,
    });
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
    const advanced = advanceAnyMatch(match, privateDoc, now);
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
    // Канал живого прогресса пишет клиент, поэтому серверного срока жизни у
    // него нет — только метка времени, которую правила требуют обязательно.
    // Без этой уборки документы остались бы навсегда.
    db.collectionGroup(ARENA_V2_COLLECTIONS.matchLiveSeats)
      .where('updatedAtMs', '<=', now - ARENA_V2_MATCH_TTL_MS)
      .limit(CLEANUP_BATCH_LIMIT),
  ];
  let deleted = 0;
  for (const query of queries) deleted += await deleteSnapshot(await query.get());
  console.info(JSON.stringify({ event: 'arena_v2_cleanup', reconciled, deleted }));
});
