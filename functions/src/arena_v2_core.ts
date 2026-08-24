import {
  type SpeedMatchAttemptProgress,
  type TournamentPublicTask,
  type TournamentTask,
  toPublicTournamentTask,
  validateTournamentTask,
  validateTournamentTaskForNewRoom,
  verifyTournamentAnswer,
} from './tournament_core';
import {
  OWNER_APPROVED_TOURNAMENT_MODES,
  type OwnerApprovedTournamentMode,
} from './tournament_mode_contract';
import { ARENA_STAR_POLICY, type ArenaEntryMode } from './arena_stars_v3';

export const ARENA_V2_COLLECTIONS = Object.freeze({
  config: 'arena_v2_config',
  profiles: 'arena_v2_profiles',
  queue: 'arena_v2_queue',
  queueLocks: 'arena_v2_queue_locks',
  matches: 'arena_v2_matches',
  matchPrivate: 'arena_v2_match_private',
  /** Живой прогресс соперника. Единственное, куда пишет сам клиент. */
  matchLive: 'arena_v2_match_live',
  matchLiveSeats: 'seats',
  invites: 'arena_v2_invites',
  taskSource: 'tournamentTasks',
  seasons: 'arena_v2_seasons',
  receipts: 'arena_v2_receipts',
  spinCredits: 'arena_v2_spin_credits',
  spinResults: 'arena_v2_spin_results',
  seasonClaims: 'arena_v2_season_claims',
  pairLimits: 'arena_v2_pair_limits',
  members: 'arena_v2_members',
});

/** Рейтинг, дружеская дуэль, серия, Arena Today — полный матч. */
export const ARENA_V2_TASK_COUNT = 10;
/** Владелец (2026-08-21): быстрый матч — восемь заданий. */
export const ARENA_V2_QUICK_TASK_COUNT = 8;

/** Число заданий по режиму. Строка, а не union, чтобы вызывающие не тянули типы. */
export function arenaTaskCount(mode?: string): number {
  return mode === 'quick' ? ARENA_V2_QUICK_TASK_COUNT : ARENA_V2_TASK_COUNT;
}
export const ARENA_V2_MAX_TASK_DOC_READS = 10;
export const ARENA_V2_SPEED_MATCH_PAIRS = 4;
export const ARENA_V2_PRIVATE_BUDGET_BYTES = 384 * 1_024;
/**
 * Владелец (2026-08-21): первый бот быстрого матча приходит в СЛУЧАЙНЫЙ
 * момент 3–45 секунд со смещением к началу окна. Момент назначает сервер при
 * постановке в очередь и кладёт в очередь как botDueAtMs; клиент только ждёт
 * до него. Живой соперник всегда перебивает бота. Повторный бот после
 * сорванного назначения регулируется отдельным клиентским окном 50–70 секунд.
 */
export const ARENA_V2_QUICK_BOT_MIN_MS = 3_000;
export const ARENA_V2_QUICK_BOT_MAX_MS = 45_000;
/** Смещение к началу диапазона: медиана ≈ 17 с. */
export const ARENA_V2_QUICK_BOT_BIAS = 1.6;

/** `unit` — равномерное [0,1). Возвращает задержку в миллисекундах. */
export function arenaQuickBotDelayMs(unit: number): number {
  const safe = Number.isFinite(unit) ? Math.max(0, Math.min(1, unit)) : 0.5;
  const biased = Math.pow(safe, ARENA_V2_QUICK_BOT_BIAS);
  const span = ARENA_V2_QUICK_BOT_MAX_MS - ARENA_V2_QUICK_BOT_MIN_MS;
  return Math.round(ARENA_V2_QUICK_BOT_MIN_MS + biased * span);
}

/** Совместимость: минимальная граница, раньше которой сервер бота не отдаёт. */
export const ARENA_V2_QUICK_BOT_FALLBACK_MS = ARENA_V2_QUICK_BOT_MIN_MS;
export const ARENA_V2_ACCEPT_MS = 12_000;
export const ARENA_V2_COUNTDOWN_MS = 3_200;
export const ARENA_V2_REVEAL_MS = 1_200;
export const ARENA_V2_READING_MS = 1_500;
export const ARENA_V2_RECEIVE_GRACE_MS = 1_500;
export const ARENA_V2_QUEUE_LEASE_MS = 45_000;
export const ARENA_V2_MATCH_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
export const ARENA_V2_INVITE_TTL_MS = 10 * 60 * 1_000;
export const ARENA_V2_RENDEZVOUS_MS = 90 * 1_000;
export const ARENA_V2_TIME_TIE_BREAK_MS = 2_000;
export const ARENA_V2_SEASON_LENGTH_DAYS = 63;
export const ARENA_V2_SEASON_EPOCH_MS = Date.UTC(2026, 7, 1);

export type ArenaV2Mode = 'quick' | 'ranked' | 'friend' | 'series';
export type ArenaV2QueueMode = Exclude<ArenaV2Mode, 'friend' | 'series'>;
export type ArenaV2MatchState =
  | 'accepting'
  | 'countdown'
  | 'task_active'
  | 'task_reveal'
  | 'settled'
  | 'aborted';
export type ArenaV2Outcome = 'win' | 'loss' | 'draw';

export type ArenaV2PublicTask = Omit<TournamentPublicTask, 'answerFingerprints'>;

export type ArenaV2ParticipantScore = {
  score: number;
  elapsedMs: number;
  fullySolved: number;
};

export type ArenaV2AnswerReceipt = {
  submissionId: string;
  taskIndex: number;
  correct: boolean;
  points: number;
  elapsedMs: number;
  seasonStars: number;
  receivedAtMs: number;
  timedOut?: boolean;
  answerHash?: string;
  /** Sealed, bounded evidence for owner-only Match Lab. Never copied public. */
  answerSnapshot?: unknown;
};

/** Firestore rejects arrays nested directly inside arrays. Keep tried choices in a map. */
export type ArenaFirestoreSpeedProgress = {
  schemaVersion: 'arena-speed-progress.firestore.v1';
  matchedIndexes: number[];
  triedIndexesByPair: Record<string, number[]>;
  wrongAttempts: number;
};

function boundedIndexArray(value: unknown, maxItems = 12, unique = false): number[] {
  if (!Array.isArray(value)) return [];
  const bounded = value.filter((entry) => Number.isInteger(entry))
    .map(Number).filter((entry) => entry >= -1 && entry < maxItems).slice(0, maxItems);
  return unique ? Array.from(new Set(bounded)) : bounded;
}

export function encodeArenaSpeedProgress(
  progress: SpeedMatchAttemptProgress | undefined,
): ArenaFirestoreSpeedProgress | undefined {
  if (!progress) return undefined;
  const pairCount = Math.min(12,
    Math.max(progress.matchedIndexes?.length ?? 0, progress.triedIndexes?.length ?? 0));
  const triedIndexesByPair = Object.fromEntries(Array.from({ length: pairCount }, (_, pairIndex) => [
    String(pairIndex), boundedIndexArray(progress.triedIndexes?.[pairIndex], 12, true).filter((entry) => entry >= 0),
  ]));
  return {
    schemaVersion: 'arena-speed-progress.firestore.v1',
    matchedIndexes: boundedIndexArray(progress.matchedIndexes, 12),
    triedIndexesByPair,
    wrongAttempts: Math.max(0, Math.min(100, Math.trunc(Number(progress.wrongAttempts ?? 0)))),
  };
}

export function decodeArenaSpeedProgress(value: unknown): SpeedMatchAttemptProgress | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const matchedIndexes = boundedIndexArray(source.matchedIndexes, 12);
  const legacy = Array.isArray(source.triedIndexes) ? source.triedIndexes : null;
  const stored = source.triedIndexesByPair && typeof source.triedIndexesByPair === 'object'
    && !Array.isArray(source.triedIndexesByPair) ? source.triedIndexesByPair as Record<string, unknown> : {};
  const pairCount = Math.min(12, Math.max(matchedIndexes.length, legacy?.length ?? 0,
    ...Object.keys(stored).map((key) => Number.isInteger(Number(key)) ? Number(key) + 1 : 0)));
  return {
    matchedIndexes,
    triedIndexes: Array.from({ length: pairCount }, (_, pairIndex) => boundedIndexArray(
      legacy?.[pairIndex] ?? stored[String(pairIndex)], 12, true,
    ).filter((entry) => entry >= 0)),
    wrongAttempts: Math.max(0, Math.min(100, Math.trunc(Number(source.wrongAttempts ?? 0)))),
  };
}

export type ArenaV2PrivateEnvelope = {
  matchId: string;
  tasks: TournamentTask[];
  answers?: Record<string, Record<string, ArenaV2AnswerReceipt>>;
  speedProgress?: Record<string, Record<string, ArenaFirestoreSpeedProgress>>;
  [key: string]: unknown;
};

function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function deterministicOrder<T extends { taskId: string }>(items: readonly T[], seed: string): T[] {
  return [...items].sort((left, right) => {
    const delta = hash32(`${seed}|${left.taskId}`) - hash32(`${seed}|${right.taskId}`);
    return delta || left.taskId.localeCompare(right.taskId);
  });
}

/**
 * Tournament publication remains the source of reviewed content, but Arena
 * freezes an independent, immutable four-pair snapshot into its private doc.
 */
export function adaptTournamentTaskForArena(task: TournamentTask, seed = task.taskId): TournamentTask | null {
  if (!validateTournamentTaskForNewRoom(task).ok) return null;
  if (task.mode !== 'speed_match') return structuredClone(task);

  const sourceItems = task.payload.items as Record<string, unknown>[];
  const sourceRight = task.payload.rightOptions as string[];
  const selectedIndexes = Array.from({ length: sourceItems.length }, (_, index) => index)
    .sort((left, right) => (hash32(`${seed}|${task.taskId}|pair|${left}`)
      - hash32(`${seed}|${task.taskId}|pair|${right}`)) || left - right)
    .slice(0, ARENA_V2_SPEED_MATCH_PAIRS);
  const selectedItems = selectedIndexes.map((index) => sourceItems[index]);
  if (selectedItems.length !== ARENA_V2_SPEED_MATCH_PAIRS) return null;
  const selectedSourceIndexes = selectedItems.map((item) => Number(item.correctIndex));
  if (new Set(selectedSourceIndexes).size !== ARENA_V2_SPEED_MATCH_PAIRS) return null;
  // Правая колонка обязана быть не просто случайной, а без единого готового
  // ответа напротив своей строки. Ненулевой детерминированный сдвиг даёт
  // derangement для всех четырёх пар и одинаково воспроизводится по seed.
  const rotation = 1 + (hash32(`${seed}|${task.taskId}|right`) % (ARENA_V2_SPEED_MATCH_PAIRS - 1));
  const rightSourceIndexes = selectedSourceIndexes.map((_, index) => (
    selectedSourceIndexes[(index + rotation) % ARENA_V2_SPEED_MATCH_PAIRS]
  ));
  const rightOptions = rightSourceIndexes.map((index) => sourceRight[index]);
  if (rightOptions.some((value) => typeof value !== 'string')) return null;

  const items = selectedItems.map((item) => {
    const correctIndex = rightSourceIndexes.indexOf(Number(item.correctIndex));
    if (correctIndex < 0) return null;
    const sourceReasons = (item.explanation as { wrongOptionReasons?: unknown[] } | undefined)
      ?.wrongOptionReasons;
    const reorderedReasons = rightSourceIndexes.map((sourceIndex) => (
      typeof sourceReasons?.[sourceIndex] === 'string' ? sourceReasons[sourceIndex] : ''
    ));
    return {
      ...structuredClone(item),
      options: rightOptions.slice(),
      correctIndex,
      ...(item.explanation && typeof item.explanation === 'object'
        ? {
            explanation: {
              ...structuredClone(item.explanation),
              wrongOptionReasons: reorderedReasons,
            },
          }
        : {}),
    };
  });
  if (items.some((item) => item === null)) return null;
  const adapted: TournamentTask = {
    ...structuredClone(task),
    payload: {
      ...structuredClone(task.payload),
      rightOptions,
      items,
    },
  };
  return validateTournamentTask(adapted).ok ? adapted : null;
}

/** Exactly two distinct reviewed tasks from each of the five approved modes. */
export const ARENA_V2_MODE_ORDER = Object.freeze([
  'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
  'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
] as const);

export const ARENA_V2_DIFFICULTY_BY_DIVISION_BAND = Object.freeze({
  '0-5': [1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
  '6-11': [1, 1, 1, 2, 2, 1, 2, 2, 2, 2],
  '12-17': [2, 2, 2, 2, 2, 2, 2, 2, 3, 3],
  '18-23': [2, 2, 2, 3, 3, 3, 3, 2, 3, 3],
} as const);

/**
 * Быстрый матч берёт первые восемь слотов полного порядка: все пять типов
 * успевают встретиться, а три основных типа повторяются.
 */
export function arenaModeOrder(mode?: string): readonly OwnerApprovedTournamentMode[] {
  return ARENA_V2_MODE_ORDER.slice(0, arenaTaskCount(mode)) as readonly OwnerApprovedTournamentMode[];
}

export function arenaDifficultyPlan(divisionIndex: number, mode?: string): readonly number[] {
  const band = divisionIndex <= 5 ? ARENA_V2_DIFFICULTY_BY_DIVISION_BAND['0-5']
    : divisionIndex <= 11 ? ARENA_V2_DIFFICULTY_BY_DIVISION_BAND['6-11']
    : divisionIndex <= 17 ? ARENA_V2_DIFFICULTY_BY_DIVISION_BAND['12-17']
    : ARENA_V2_DIFFICULTY_BY_DIVISION_BAND['18-23'];
  return band.slice(0, arenaTaskCount(mode));
}

export function selectArenaTasks(
  source: readonly TournamentTask[],
  seed: string,
  divisionIndex = 0,
  matchMode?: string,
): TournamentTask[] | null {
  const grouped = new Map<string, TournamentTask[]>();
  const seen = new Set<string>();
  for (const raw of source) {
    if (seen.has(raw.taskId)) continue;
    if (!validateTournamentTaskForNewRoom(raw).ok
      || !(OWNER_APPROVED_TOURNAMENT_MODES as readonly string[]).includes(raw.mode)) continue;
    seen.add(raw.taskId);
    const key = `${raw.mode}:${raw.difficulty}`;
    grouped.set(key, [...(grouped.get(key) ?? []), raw]);
  }
  const difficulties = arenaDifficultyPlan(Math.max(0, Math.min(23, Math.trunc(divisionIndex))));
  const result: TournamentTask[] = [];
  const order = arenaModeOrder(matchMode);
  for (let index = 0; index < order.length; index += 1) {
    const mode = order[index];
    const difficulty = difficulties[index];
    const candidates = deterministicOrder(grouped.get(`${mode}:${difficulty}`) ?? [], `${seed}|${index}`);
    const selected = candidates.find((task) => !result.some((entry) => entry.taskId === task.taskId));
    if (!selected) return null;
    const adapted = adaptTournamentTaskForArena(selected, `${seed}|slot|${index}`);
    if (!adapted) return null;
    result.push(adapted);
  }
  return result.length === arenaTaskCount(matchMode) ? result : null;
}

/** No answer fingerprints and no explanation ever cross the public boundary. */
export function toArenaPublicTask(task: TournamentTask): ArenaV2PublicTask | null {
  const publicTask = toPublicTournamentTask(task);
  if (!publicTask) return null;
  const { answerFingerprints: _discarded, ...safe } = publicTask;
  return safe;
}

export function validateArenaPrivateEnvelope(
  envelope: ArenaV2PrivateEnvelope,
  matchMode?: string,
): { ok: true; serializedBytes: number } | { ok: false; reason: string; serializedBytes: number } {
  const serializedBytes = Buffer.byteLength(JSON.stringify(envelope), 'utf8');
  const expectedTasks = arenaTaskCount(matchMode);
  if (envelope.tasks.length !== expectedTasks) {
    return { ok: false, reason: 'task_count_invalid', serializedBytes };
  }
  const counts = new Map<string, number>();
  for (const task of envelope.tasks) {
    if (!validateTournamentTask(task).ok) {
      return { ok: false, reason: 'task_invalid', serializedBytes };
    }
    counts.set(task.mode, (counts.get(task.mode) ?? 0) + 1);
  }
  // зачем: владелец сделал быстрый матч из восьми заданий, а 8 не делится на
  // пять типов нацело — прежняя проверка `expectedTasks / модов` давала 1.6 и
  // ОТКЛОНЯЛА любой быстрый конверт (mode_quota_invalid), из-за чего матч с
  // ботом не создавался. Квоту берём из того же порядка слотов, по которому
  // задания и подбираются, — один источник правды для любой длины матча.
  const expectedCounts = new Map<string, number>();
  for (const mode of arenaModeOrder(matchMode)) {
    expectedCounts.set(mode, (expectedCounts.get(mode) ?? 0) + 1);
  }
  if (OWNER_APPROVED_TOURNAMENT_MODES.some(
    (mode) => (counts.get(mode) ?? 0) !== (expectedCounts.get(mode) ?? 0),
  )) {
    return { ok: false, reason: 'mode_quota_invalid', serializedBytes };
  }
  if (serializedBytes >= ARENA_V2_PRIVATE_BUDGET_BYTES) {
    return { ok: false, reason: 'private_size_budget_exceeded', serializedBytes };
  }
  return { ok: true, serializedBytes };
}

export function arenaRankWindow(mode: ArenaV2QueueMode): number {
  return mode === 'ranked' ? 1 : 3;
}

export function arenaRanksCompatible(
  mode: ArenaV2QueueMode,
  leftRankIndex: number,
  rightRankIndex: number,
): boolean {
  return Math.abs(Math.trunc(leftRankIndex) - Math.trunc(rightRankIndex)) <= arenaRankWindow(mode);
}

/** Полное окно ответа; чтение и countdown в него не входят. */
export const ARENA_V2_ANSWER_MS = Object.freeze({
  guess_phrase: 8_000,
  fill_gap: 8_000,
  find_oddity: 10_000,
  translate_build: 25_000,
  speed_match: 30_000,
} as const);

export function arenaTaskDurationMs(mode: OwnerApprovedTournamentMode): number {
  return ARENA_V2_READING_MS + ARENA_V2_ANSWER_MS[mode] + ARENA_V2_RECEIVE_GRACE_MS;
}

export function arenaAcceptanceOpen(nowMs: number, deadlineAtMs: number): boolean {
  return Number.isFinite(nowMs) && Number.isFinite(deadlineAtMs) && nowMs < deadlineAtMs;
}

export function arenaObservedElapsedMs(
  receivedAtMs: number,
  readingEndsAtMs: number,
  mode: OwnerApprovedTournamentMode,
): number {
  return Math.max(0, Math.min(receivedAtMs - readingEndsAtMs, ARENA_V2_ANSWER_MS[mode]));
}

export type ArenaV2BotTaskPlan = {
  correct: boolean;
  elapsedMs: number;
  timedOut: boolean;
  matchedPairs: number;
  wrongAttempts: number;
};

function seededUnit(seed: string): number {
  return (hash32(seed) + 0.5) / 0x1_0000_0000;
}

/** Immutable bot behavior generated before play; it never reads player progress. */
export function buildArenaBotBlueprint(
  seed: string,
  divisionIndex: number,
  tasks: readonly Pick<TournamentTask, 'mode'>[],
): ArenaV2BotTaskPlan[] {
  const division = Math.max(0, Math.min(23, Math.trunc(divisionIndex)));
  const baseAccuracy = Math.max(0.55, Math.min(0.88, 0.58 + division * 0.012));
  const medianResponseMs = 7_500 - division * 150;
  const modifiers: Record<string, number> = {
    guess_phrase: 0.02,
    fill_gap: 0,
    find_oddity: -0.03,
    translate_build: -0.05,
    speed_match: -0.02,
  };
  return tasks.map((task, taskIndex) => {
    const mode = task.mode as OwnerApprovedTournamentMode;
    const timeout = seededUnit(`${seed}|${taskIndex}|timeout`) < 0.03;
    const u1 = Math.max(Number.EPSILON, seededUnit(`${seed}|${taskIndex}|normal-a`));
    const u2 = seededUnit(`${seed}|${taskIndex}|normal-b`);
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const answerDeadlineMs = ARENA_V2_ANSWER_MS[mode];
    const elapsedMs = timeout ? answerDeadlineMs : Math.round(Math.max(1_500,
      Math.min(answerDeadlineMs - 700, medianResponseMs * Math.exp(0.35 * normal))));
    const accuracy = Math.max(0, Math.min(1, baseAccuracy + (modifiers[mode] ?? 0)));
    if (mode === 'speed_match') {
      let matchedPairs = 0;
      for (let pair = 0; pair < ARENA_V2_SPEED_MATCH_PAIRS; pair += 1) {
        if (!timeout && seededUnit(`${seed}|${taskIndex}|pair|${pair}`) < accuracy) matchedPairs += 1;
      }
      const wrongAttempts = timeout ? 0 : ARENA_V2_SPEED_MATCH_PAIRS - matchedPairs;
      return { correct: matchedPairs === ARENA_V2_SPEED_MATCH_PAIRS, elapsedMs, timedOut: timeout, matchedPairs, wrongAttempts };
    }
    const correct = !timeout && seededUnit(`${seed}|${taskIndex}|correct`) < accuracy;
    return { correct, elapsedMs, timedOut: timeout, matchedPairs: 0, wrongAttempts: correct ? 0 : 1 };
  });
}

export function scoreArenaAnswer(task: TournamentTask, answer: unknown): { correct: boolean; points: number } {
  const correct = verifyTournamentAnswer(task, answer);
  return { correct, points: correct ? 100 : 0 };
}

export function scoreArenaSpeedProgress(progress: SpeedMatchAttemptProgress | undefined): number {
  const matched = new Set(progress?.matchedIndexes
    ?.filter((index) => Number.isInteger(index) && index >= 0 && index < ARENA_V2_SPEED_MATCH_PAIRS) ?? []).size;
  const wrongAttempts = Math.max(0, Math.trunc(progress?.wrongAttempts ?? 0));
  return Math.max(0, Math.min(100, matched * 25 - wrongAttempts * 5));
}

export function resolveArenaOutcome(
  left: ArenaV2ParticipantScore,
  right: ArenaV2ParticipantScore,
): { left: ArenaV2Outcome; right: ArenaV2Outcome; reason: 'score' | 'time' | 'draw' } {
  if (left.score !== right.score) {
    return left.score > right.score
      ? { left: 'win', right: 'loss', reason: 'score' }
      : { left: 'loss', right: 'win', reason: 'score' };
  }
  if (left.fullySolved !== right.fullySolved) {
    return left.fullySolved > right.fullySolved
      ? { left: 'win', right: 'loss', reason: 'score' }
      : { left: 'loss', right: 'win', reason: 'score' };
  }
  const difference = Math.abs(Math.max(0, left.elapsedMs) - Math.max(0, right.elapsedMs));
  if (difference < ARENA_V2_TIME_TIE_BREAK_MS) return { left: 'draw', right: 'draw', reason: 'draw' };
  return left.elapsedMs < right.elapsedMs
    ? { left: 'win', right: 'loss', reason: 'time' }
    : { left: 'loss', right: 'win', reason: 'time' };
}

// зачем: владелец (2026-08-23) отменил очки ранга (RP) и таблицу дельт по
// разнице дивизионов. Звёздная лестница: победа +1, поражение −1, ничья 0 —
// одинаково для любого соперника, ранг = звёзды ÷ 3.
export function arenaRankIndexFromStars(stars: number): number {
  return Math.max(0, Math.min(23, Math.floor(Math.max(0, stars) / 3)));
}

export function arenaStarDeltaForOutcome(outcome: ArenaV2Outcome): number {
  return outcome === 'win' ? 1 : outcome === 'loss' ? -1 : 0;
}

export function arenaSeasonWindow(nowMs: number): { seasonId: string; startsAtMs: number; endsAtMs: number } {
  const durationMs = ARENA_V2_SEASON_LENGTH_DAYS * 24 * 60 * 60 * 1_000;
  const cycle = Math.max(0, Math.floor((Math.max(ARENA_V2_SEASON_EPOCH_MS, nowMs)
    - ARENA_V2_SEASON_EPOCH_MS) / durationMs));
  const startsAtMs = ARENA_V2_SEASON_EPOCH_MS + cycle * durationMs;
  const endsAtMs = startsAtMs + durationMs;
  return { seasonId: `arena-${new Date(startsAtMs).toISOString().slice(0, 10)}`, startsAtMs, endsAtMs };
}

export const ARENA_V2_DAILY_MULTIPLIERS = Object.freeze([
  1, 1, 1, 1, 0.5, 0.5,
] as const);

export function arenaDailyMultiplier(eligibleMatchIndex: number): number {
  return ARENA_V2_DAILY_MULTIPLIERS[Math.max(0, Math.trunc(eligibleMatchIndex))] ?? 0;
}

export function arenaSeasonStars(input: {
  mode: ArenaV2Mode;
  rawStars: number;
  eligibleMatchIndex: number;
  dailyStarsBefore: number;
}): number {
  /**
   * Начисляется ли за режим звёзды в кошелёк, решает ОДИН список — политика
   * режима в движке звёзд. Владелец (D-07): «быстрый матч звёзды не начисляет,
   * только опыт». Второй список режимов здесь и был причиной расхождения:
   * клиент получал в плане `starPolicy: 'none'` и обещал игроку ноль, а сервер
   * по своему списку записывал звёзды в сезон и кошелёк.
   */
  if (ARENA_STAR_POLICY[input.mode as ArenaEntryMode] !== 'banked') return 0;
  const multiplied = Math.floor(Math.max(0, input.rawStars) * arenaDailyMultiplier(input.eligibleMatchIndex));
  return Math.max(0, Math.min(multiplied, 160 - Math.max(0, input.dailyStarsBefore)));
}

export function arenaTaskStars(input: {
  task: Pick<TournamentTask, 'mode' | 'difficulty'>;
  correct: boolean;
  speedProgress?: SpeedMatchAttemptProgress;
}): number {
  if (input.task.mode === 'speed_match') {
    const matched = new Set(input.speedProgress?.matchedIndexes
      ?.filter((value) => Number.isInteger(value) && value >= 0 && value < ARENA_V2_SPEED_MATCH_PAIRS) ?? []).size;
    const wrong = Math.max(0, Math.trunc(input.speedProgress?.wrongAttempts ?? 0));
    const fullBoardBonus = matched === ARENA_V2_SPEED_MATCH_PAIRS ? Math.max(0, input.task.difficulty - 1) : 0;
    return Math.max(0, Math.min(6, matched + fullBoardBonus - wrong));
  }
  return input.correct ? ({ 1: 3, 2: 4, 3: 5 }[input.task.difficulty] ?? 0) : 0;
}

/**
 * Сколько матчей за сутки дают право на редкую награду. Считаются быстрые и
 * рейтинговые; звёзды при этом начисляет только рейтинговый (D-07), поэтому
 * счётчик отдельный от счётчика начисления.
 */
export const ARENA_DAILY_REWARD_MATCHES = 6;
export const ARENA_V2_SPIN_PITY_MATCHES = 80;
export const ARENA_V2_SPIN_MINIMUM_ANSWERS = 8;
export const ARENA_V2_SPIN_ODDS_BPS = Object.freeze({
  // Владелец (2026-08-12): шанс против бота выровнен с человеческим — иначе
  // внимательный игрок вычислял бы бота по статистике дропов.
  quick_bot: 50,
  quick_human: 50,
  // Ranked без победы (поражение, ничья, матч с ботом) сохраняет прежний шанс:
  // гарантия 2026-08-23 добавлена ТОЛЬКО поверх победы над человеком.
  ranked_human: 100,
} as const);

/**
 * зачем (владелец, 23.08): спин за победу в рейтинге над реальным игроком
 * обязан выпадать КАЖДЫЙ раз, а не по шансу — раньше `ranked_human` тоже шёл
 * через `rollBps` (1%) с догоняющим pity на 80-м матче. Быстрые матчи (quick,
 * против бота или человека) остаются вероятностными без изменений — правка
 * касается только рейтинга. Обе защиты от фарма (минимум 8 ответов из 10,
 * не больше одного спина в сутки с матча) остаются как были — решение
 * владельца сохранить их при переходе на гарантию.
 */
export function arenaRareSpin(input: {
  mode: ArenaV2Mode;
  opponentKind: 'human' | 'bot';
  outcome: 'win' | 'loss' | 'draw';
  rewardEligible: boolean;
  submittedAnswers: number;
  dropsToday: number;
  rollBps: number;
  pityBefore: number;
}): { awarded: boolean; pityAfter: number } {
  const pityBefore = Math.max(0, Math.trunc(input.pityBefore));
  const isRankedHumanWin = input.mode === 'ranked' && input.opponentKind === 'human' && input.outcome === 'win';
  // Прежняя шкала шансов сохранена для ВСЕХ остальных случаев: ranked без
  // победы (поражение, ничья, матч против бота) и любые быстрые матчи. Правка
  // владельца добавляет гарантию за победу, а не отбирает шанс у остальных.
  const kind = input.mode === 'ranked' ? 'ranked_human'
    : input.mode === 'quick' && input.opponentKind === 'bot' ? 'quick_bot'
      : input.mode === 'quick' ? 'quick_human' : null;
  const eligible = Boolean(kind) && input.rewardEligible
    && input.submittedAnswers >= ARENA_V2_SPIN_MINIMUM_ANSWERS
    && input.dropsToday < 1;
  if (!eligible || !kind) return { awarded: false, pityAfter: pityBefore };
  // Победа над реальным человеком в рейтинге — гарантия, без ролла и pity.
  if (isRankedHumanWin) return { awarded: true, pityAfter: 0 };
  const awarded = pityBefore >= ARENA_V2_SPIN_PITY_MATCHES - 1
    || (Number.isInteger(input.rollBps)
      && input.rollBps >= 0
      && input.rollBps < ARENA_V2_SPIN_ODDS_BPS[kind]);
  return { awarded, pityAfter: awarded ? 0 : pityBefore + 1 };
}

export const ARENA_V2_SEASON_LEVEL_STARS = 50;

export function arenaSeasonLevelUnlocked(totalStars: number, level: number): boolean {
  return Number.isInteger(level) && level >= 1
    && Math.max(0, Math.trunc(totalStars)) >= level * ARENA_V2_SEASON_LEVEL_STARS;
}

export function arenaSeasonReward(level: number, side: 'free' | 'plus'):
{ kind: 'shards'; amount: number } | { kind: 'spin_credit'; amount: 1 } {
  if (level % 10 === 0) return { kind: 'spin_credit', amount: 1 };
  return { kind: 'shards', amount: side === 'plus' ? 15 : 5 };
}
