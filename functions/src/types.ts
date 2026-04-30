export type RankTier =
  | 'bronze' | 'silver' | 'gold' | 'platinum'
  | 'diamond' | 'master' | 'grandmaster' | 'legend';

export type SessionSize = 2 | 4;

export const RANK_TIERS: RankTier[] = [
  'bronze', 'silver', 'gold', 'platinum',
  'diamond', 'master', 'grandmaster', 'legend',
];

export const RANK_LEVELS = ['I', 'II', 'III'] as const;

/** 0 = Bronze I … 23 = Legend III — как на клиенте (arena rankToIndex) */
export function rankToIndex(tier: string, level: string): number {
  const ti = RANK_TIERS.indexOf(tier as RankTier);
  const li = RANK_LEVELS.indexOf(level as (typeof RANK_LEVELS)[number]);
  return (ti >= 0 ? ti : 0) * 3 + (li >= 0 ? li : 0);
}

export const RANK_TO_QUESTION_LEVEL: Record<RankTier, string> = {
  bronze:      'A1',
  silver:      'A2',
  gold:        'A2',
  platinum:    'A2',
  diamond:     'B1',
  master:      'B1',
  grandmaster: 'B2',
  legend:      'C1',
};

export interface MatchmakingEntry {
  userId: string;
  rankTier: RankTier;
  size: SessionSize;
  joinedAt: number;
  rankIndex?: number;
  searchRange?: number;
  expoPushToken?: string;
  displayName?: string;
  sessionId?: string | null;
  /** Когда сопоставили в матч; для подчистки «осиротевших» queue-док в cron */
  matchedAt?: number;
}

export type DuelSessionState =
  | 'acceptance' // accept / decline
  | 'get_ready' // «Приготовься» (~2.5s), потім CF → countdown
  | 'countdown' // 3-2-1, потім перший питання
  | 'question'
  | 'reveal'
  | 'finished'
  | 'aborted'; // хтось відмовився / таймаут приймання

export interface DuelSession {
  id: string;
  type: string;
  state: DuelSessionState;
  rankTier: RankTier;
  size: SessionSize;
  playerIds: string[];
  questions: string[];
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  questionTimeoutMs: number;
  createdAt: number;
  finishedAt?: number;
  /** Кінець вікна accept (ranked + friend). */
  acceptDeadlineAt?: number;
  getReadyEndsAt?: number;
  getReadyStartedAt?: number;
  abortReason?: 'decline' | 'accept_timeout';
  abortedAt?: number;
}

export type LobbyChoice = 'none' | 'accept' | 'decline';

export interface SessionPlayer {
  sessionId: string;
  playerId: string;
  displayName?: string;
  answers: SessionAnswer[];
  score: number;
  finished?: boolean;
  /** До клієнта: прийняти матч чи ні, поки state сесії === acceptance. */
  lobbyChoice?: LobbyChoice;
}

export interface SessionAnswer {
  questionId: string;
  answer?: string | null;
  isCorrect?: boolean;
  timeMs?: number;
  points?: number;
  serverScored?: boolean;
  bonus?: {
    speed: number;
    streak: number;
    first: number;
    outspeed: number;
  };
}
