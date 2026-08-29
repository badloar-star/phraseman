export const ARENA_TASK_MODES = [
  'guess_phrase',
  'fill_gap',
  'find_oddity',
  'translate_build',
  'speed_match',
] as const;

export type ArenaTaskMode = (typeof ARENA_TASK_MODES)[number];
export type ArenaQueueMode = 'quick' | 'ranked';
export type ArenaEntryMode = ArenaQueueMode | 'friend' | 'today' | 'ghost' | 'series';
export type ArenaTicketStatus = 'waiting' | 'matched' | 'cancelled';
export type ArenaMatchStatus =
  | 'accepting'
  | 'countdown'
  | 'task_active'
  | 'task_reveal'
  | 'settled'
  | 'aborted';

export type ArenaPlayer = Readonly<{
  uid: string;
  name: string;
  avatar?: string;
  aura?: string;
  rank: number;
  rating?: number;
  score: number;
  correct: number;
  acceptedAtMs?: number;
}>;

export type ArenaPublicTask = Readonly<{
  taskId: string;
  mode: ArenaTaskMode;
  kind: 'choice' | 'translate' | 'timeattack' | 'voice' | 'listen' | 'dictate' | 'match';
  isVoice: boolean;
  difficulty: number;
  payload: Readonly<Record<string, unknown>>;
}>;

export type ArenaTaskTiming = Readonly<{
  taskId: string;
  taskIndex: number;
  startsAtMs: number;
  deadlineAtMs: number;
  feedbackEndsAtMs?: number;
}>;

export type ArenaTicket = Readonly<{
  authUid: string;
  stableUid: string;
  mode: ArenaQueueMode;
  status: ArenaTicketStatus;
  requestId: string;
  generation: number;
  matchId?: string;
  joinedAtMs?: number;
  leaseExpiresAt?: number;
  /** Момент входа бота, назначенный сервером (быстрый матч и рейтинг). */
  botDueAtMs?: number;
}>;

export type ArenaMatchReward = Readonly<{
  starsEarned: number;
  /** Опыт за матч. Считает и начисляет сервер в той же транзакции (D-69). */
  xpEarned?: number;
  /**
   * Авторитетная раскладка уже начисленного XP. Отсутствует при cap или на
   * старом сервере; клиент не восстанавливает её из ответов/счёта.
   */
  xpBreakdown?: Readonly<{
    schemaVersion: 'arena-xp-breakdown.v1';
    baseXp: number;
    correctBonusXp: number;
    outcomeBonusXp: number;
    totalXp: number;
  }>;
  totalXpAfter?: number;
  seasonStarsAfter?: number;
  ratingDelta?: number;
  ratingAfter?: number;
  rankAfter?: number;
  spinAwarded?: boolean;
  spinReceiptId?: string;
  hostScore?: number;
  guestScore?: number;
  outcome?: 'win' | 'loss' | 'draw';
}>;

export type ArenaMatch = Readonly<{
  matchId: string;
  mode: ArenaEntryMode;
  seriesId?: string;
  gameIndex?: number;
  rivalOffer?: Readonly<{ seriesId: string; fromSeat: 'a' | 'b'; expiresAtMs: number }>;
  /** Клиенту всегда приходит 'human' для дуэлей: тип соперника не раскрывается. */
  opponentKind: 'human' | 'bot' | 'none' | 'ghost' | 'recording';
  /** Длина матча. Быстрый — 5, остальные — 10. Старые матчи поля не имеют. */
  taskCount?: number;
  /** Safe display projections; never derive labels by rendering stable IDs. */
  players: readonly ArenaPlayer[];
  acceptedBy: readonly string[];
  state: ArenaMatchStatus;
  version: number;
  currentTaskIndex: number;
  currentPublicTask?: ArenaPublicTask;
  submittedBy: readonly string[];
  scores: Readonly<Record<string, number>>;
  stateStartedAtMs: number;
  stateDeadlineAtMs: number;
  terminal: boolean;
  result?: Readonly<{
    winnerUid?: string;
    rewards?: Readonly<Record<string, ArenaMatchReward>>;
    players?: readonly ArenaPlayer[];
    seriesSummary?: Readonly<{
      winsA: number;
      winsB: number;
      draws: number;
      gamesPlayed: number;
      complete: boolean;
    }>;
  }>;
  expireAt?: unknown;
}>;

export type ArenaSummary = Readonly<{
  uid: string;
  rating: number;
  rank: number;
  rankName?: string;
  seasonStars: number;
  seasonLevel: number;
  seasonEndsAtMs?: number;
  spinsAvailable: number;
  wins: number;
  losses: number;
  /** Лучший тир сезона — не падает вместе с рангом. */
  seasonBestTierIndex?: number;
  /** Лучший тир за всю жизнь: по нему открыта косметика за ранг (D-63). */
  lifetimeBestTierIndex?: number;
  /** Счётчики дневных целей. Лежат в сезонном документе, отдельного нет. */
  dailyDayKey?: string;
  dailyMatches?: number;
  dailyWins?: number;
  dailyFirstAnswers?: number;
  dailyStars?: number;
  todayKey?: string;
}>;

export const ARENA_QUESTION_COUNT = 10;
/** Владелец (2026-08-21): быстрый матч — восемь заданий.
 *  Зеркало ARENA_V2_QUICK_TASK_COUNT на сервере: расходиться нельзя. */
export const ARENA_QUICK_QUESTION_COUNT = 8;

/** Длина матча с запасом на документы, созданные до введения поля. */
export function arenaMatchTaskCount(match?: Pick<ArenaMatch, 'taskCount' | 'mode'>): number {
  const declared = Number(match?.taskCount);
  if (Number.isFinite(declared) && declared > 0) return Math.trunc(declared);
  return match?.mode === 'quick' ? ARENA_QUICK_QUESTION_COUNT : ARENA_QUESTION_COUNT;
}
/**
 * Страховка первого бота: серверное окно botDueAtMs не превышает 20 секунд.
 * зачем (владелец 2026-08-27): соперник обязан находиться в первые 20 секунд
 * всегда. Потолок держится и на клиенте, чтобы старый билет с прежним
 * 45-секундным botDueAtMs не растягивал поиск на выкаченной сборке.
 */
export const ARENA_QUICK_FALLBACK_MAX_MS = 20_000;
/**
 * Предел ожидания в быстром матче. Владелец 2026-08-27: соперник обязан
 * находиться в первые 20 секунд; если не нашёлся даже с запасом на один
 * короткий повтор — поиск заканчивается и потраченная энергия возвращается,
 * а не сгорает в бесконечном пульсе.
 */
export const ARENA_QUICK_SEARCH_GIVE_UP_MS = 26_000;
/**
 * Запас поверх СЕРВЕРНОГО срока бота (владелец 2026-08-29, лог 10:54).
 *
 * Сервер назначил бота на 24.9 с, клиент сдавал поиск на 26-й — ответ бота
 * пришёл ровно в момент сдачи, матч уже был создан, а человека выбросило на
 * хаб. Сдача обязана давать серверу дожать один короткий повтор после его
 * собственного срока, иначе гонка повторится на любой медленной сети.
 */
export const ARENA_QUICK_BOT_ANSWER_GRACE_MS = 10_000;
export const ARENA_RANKED_HEARTBEAT_MS = 15_000;
/**
 * Рейтинговый бот (владелец 2026-08-28): окно шире, чем в быстром матче — до
 * минуты, потому что живой соперник в рейтинге ценнее подождать, а окно
 * рангов ±1 не всегда находит его быстро. Живой соперник всегда перебивает
 * бота, если находится раньше.
 */
export const ARENA_RANKED_FALLBACK_MAX_MS = 60_000;
/** Запас поверх 60 с на один короткий повтор запроса бота, как в быстром матче. */
export const ARENA_RANKED_SEARCH_GIVE_UP_MS = 66_000;

export function isArenaTaskMode(value: unknown): value is ArenaTaskMode {
  return typeof value === 'string' && (ARENA_TASK_MODES as readonly string[]).includes(value);
}

export function parseMillis(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    const maybe = value as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof maybe.toMillis === 'function') return maybe.toMillis();
    const seconds = typeof maybe.seconds === 'number' ? maybe.seconds : maybe._seconds;
    if (typeof seconds === 'number') return seconds * 1_000;
  }
  return undefined;
}
