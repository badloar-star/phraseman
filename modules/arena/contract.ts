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
  isBot?: boolean;
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
}>;

export type ArenaMatchReward = Readonly<{
  starsEarned: number;
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
  opponentKind: 'human' | 'bot' | 'none' | 'ghost' | 'recording';
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
}>;

export const ARENA_QUESTION_COUNT = 10;
export const ARENA_QUICK_FALLBACK_MS = 6_000;
export const ARENA_RANKED_HEARTBEAT_MS = 15_000;

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
