// ─── Ранги ────────────────────────────────────────────────────────────────────

export type RankTier =
  | 'bronze' | 'silver' | 'gold' | 'platinum'
  | 'diamond' | 'master' | 'grandmaster' | 'legend';

export type RankLevel = 'I' | 'II' | 'III';

export interface Rank {
  tier: RankTier;
  level: RankLevel;
  stars: 0 | 1 | 2 | 3; // 0-2 shown; reaching 3 triggers promotion
}

// Rank as a single integer (0=Bronze I … 23=Legend III) — used for matchmaking range
export function rankToIndex(tier: RankTier, level: RankLevel | string): number {
  const ti = RANK_TIERS.indexOf(tier as RankTier);
  const li = RANK_LEVELS.indexOf(level as RankLevel);
  return (ti >= 0 ? ti : 0) * 3 + (li >= 0 ? li : 0);
}

export const QUESTIONS_PER_MATCH = 10;
export const PRIVATE_DUEL_QUESTIONS_PER_MATCH = 10;
export const QUESTION_TIMEOUT_MS = 40_000;

export const RANK_TIERS: RankTier[] = [
  'bronze', 'silver', 'gold', 'platinum',
  'diamond', 'master', 'grandmaster', 'legend',
];

export const RANK_LEVELS: RankLevel[] = ['I', 'II', 'III'];

export const RANK_EMOJIS: Record<RankTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '👑',
  master: '🔥',
  grandmaster: '⚡',
  legend: '🌟',
};

// ─── Вопросы (банк квизов) ────────────────────────────────────────────────────

export type QuestionLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type QuestionType =
  | 'translate'
  | 'fill'
  | 'choose'
  | 'audio'
  | 'complete_phrasal'
  | 'translate_meaning'
  | 'fill_blank'
  | 'find_error'
  | 'choose_phrasal'
  | 'quiz_logic';

export const QUESTION_TYPE_ICONS: Record<QuestionType, string> = {
  translate: '🔤',
  fill: '✏️',
  choose: '🎯',
  audio: '🔊',
  complete_phrasal: '🔗',
  translate_meaning: '💬',
  fill_blank: '✏️',
  find_error: '🛠️',
  choose_phrasal: '🧩',
  quiz_logic: '🧠',
};

export interface ArenaQuestion {
  id: string;
  level: QuestionLevel;
  type?: QuestionType;
  task?: string;
  question: string;
  options: [string, string, string, string];
  correct: string;
  rule: string;
  source?: string;
}

// ─── Сессия ───────────────────────────────────────────────────────────────────

export type SessionType = 'ranked' | 'private' | 'rematch';

export type RematchStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface RematchOffer {
  byUid: string;
  byName: string;
  at: number;
  ttlAt: number;
  status: RematchStatus;
  newSessionId?: string;
}

export const REMATCH_TTL_MS = 30_000;
export type SessionSize = 2 | 4;
export type SessionState =
  | 'waiting'       // ждём игроков
  | 'acceptance'   // accept / decline перед стартом
  | 'get_ready'     // «Приготовься» (~2.5s)
  | 'countdown'     // 3-2-1
  | 'question'      // вопрос активен
  | 'reveal'        // показываем правильный ответ
  | 'finished'      // матч завершён
  | 'aborted';      // отмена (отказ / таймаут приймання)

export interface ArenaSession {
  id: string;
  type: SessionType;
  size: SessionSize;
  state: SessionState;
  roomCode?: string;           // только для приватных
  rankTier: RankTier;          // для matchmaking
  playerIds: string[];
  questions: string[];         // id вопросов
  currentQuestionIndex: number;
  questionStartedAt: number | null; // timestamp ms
  questionTimeoutMs: number;   // сколько даётся на вопрос
  createdAt: number;
  forfeitedBy?: string;        // userId who forfeited
  acceptDeadlineAt?: number;
  getReadyEndsAt?: number;
  getReadyStartedAt?: number;
  abortReason?: 'decline' | 'accept_timeout';
  abortedAt?: number;
  rematchOffer?: RematchOffer;
}

// ─── Игрок в сессии ───────────────────────────────────────────────────────────

export type LobbyChoice = 'none' | 'accept' | 'decline';

export interface SessionPlayer {
  sessionId: string;
  playerId: string;
  displayName?: string;
  avatarLevel?: number;
  score: number;
  answers: SessionAnswer[];
  lobbyChoice?: LobbyChoice;
}

export interface SessionAnswer {
  questionId: string;
  answer: string | null; // null = не успел
  isCorrect: boolean;
  timeMs: number;        // время ответа в мс
  points: number;        // базовые + бонусы (сумма со всеми)
  // Серверная разбивка очков (functions/src/arena_scoring.ts). Для оффлайн-моков может отсутствовать.
  bonus?: {
    speed: number;
    streak: number;
    first: number;
    outspeed: number;
  };
  serverScored?: boolean;
}

// ─── Профиль арены (хранится в Firestore /arena_profiles/{userId}) ─────────────

export interface ArenaProfile {
  userId: string;
  displayName: string;
  avatarId: string;
  rank: Rank;
  xp: number;
  stats: ArenaStats;
  updatedAt: number;
}

export interface ArenaStats {
  matchesPlayed: number;
  matchesWon: number;
  totalScore: number;
  winStreak: number;
  bestWinStreak: number;
}

// ─── Matchmaking queue ────────────────────────────────────────────────────────

export interface MatchmakingEntry {
  userId: string;
  rankTier: RankTier;
  size: SessionSize;
  joinedAt: number;
  rankIndex?: number;   // 0–23, for range-based matching
  searchRange?: number; // ±N ranks; starts at 2, expands to 4 after 3 min
  expoPushToken?: string;
  displayName?: string;
  /** Выставляет Cloud Function при матче; клиент сразу удаляет документ из очереди. */
  sessionId?: string;
  matchedAt?: number;
}

// ─── Вызов (приватная комната) ────────────────────────────────────────────────

export interface ArenaRoom {
  code: string;          // WOLF-7342
  hostId: string;
  hostName?: string;
  guestId?: string;
  guestName?: string;
  size: SessionSize;
  playerIds?: string[];
  status: 'waiting' | 'matched' | 'expired';
  sessionId?: string;
  rankTier?: RankTier;
  expiresAt?: number;
  createdAt: number;
}

// ─── Начисление очков ────────────────────────────────────────────────────────

export const SCORE_CONFIG = {
  correctBase: 100,
  speedBonusMax: 50,       // если ответил за < 2 сек
  speedBonusThresholdMs: 2000,
  streakBonus: 30,         // 3 правильных подряд
  streakThreshold: 3,
  firstAnswerBonus: 20,    // первый правильный ответ в матче
  outspeedBonus: 15,       // ответил в первые 10 сек (быстрее соперника)
  outspeedThresholdMs: 10_000,
  winXp: 50,
  loseXp: 15,
  correctAnswerXp: 5,
  fastAnswerXp: 3,
} as const;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
