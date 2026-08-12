import type { ArenaMatch, ArenaMatchReward, ArenaPublicTask, ArenaTaskMode } from './contract';

export const ARENA_HUB_SECTIONS = ['today', 'play', 'growth', 'together'] as const;
export type ArenaHubSection = (typeof ARENA_HUB_SECTIONS)[number];

export type ArenaFeatureState = 'loading' | 'ready' | 'empty' | 'unavailable' | 'expired' | 'error';

export type ArenaTodaySummary = Readonly<{
  state: 'available' | 'in_progress' | 'complete' | 'expired' | 'unavailable';
  completedTasks: number;
  totalTasks: 10;
  sessionId?: string;
  starsEarned?: number;
  resetsAtMs?: number;
}>;

export type ArenaMasteryMetric = Readonly<{
  mode: ArenaTaskMode;
  /** Frozen 0..100 server score. Null means the sample is still private/hidden. */
  score: number | null;
  sampleCount: number;
  accuracy: number;
  medianAnswerMs?: number;
  trend?: 'up' | 'steady' | 'down';
  confidence: 'insufficient' | 'developing' | 'stable';
}>;

export type ArenaRivalrySummary = Readonly<{
  rivalryId: string;
  opponentName: string;
  opponentAvatar?: string;
  state: 'invited' | 'awaiting' | 'active' | 'complete' | 'left';
  viewerWins: number;
  opponentWins: number;
  gamesPlayed: number;
  /** Frozen product rule: best of three games, first to two wins. */
  gamesToWin: 2;
  nextMatchId?: string;
  expiresAtMs?: number;
  leaveAllowed?: boolean;
  muted?: boolean;
}>;

export type ArenaPartnerSummary = Readonly<{
  partnershipId: string;
  state: 'invited' | 'active' | 'paused' | 'complete' | 'removed';
  partnerName: string;
  partnerAvatar?: string;
  /** Privacy-safe shared progress. Never expose either person's activity or stars. */
  sharedDays: number;
  targetSharedDays: number;
  claimedSharedDayThresholds: readonly number[];
  spotlightAvailable?: boolean;
  nudgeEnabled?: boolean;
  paused?: boolean;
  pausedByViewer?: boolean;
  pausedByOther?: boolean;
  direction?: 'incoming' | 'outgoing' | 'active';
  inviteToken?: string;
  shareUrl?: string;
}>;

export type ArenaWalletSummary = Readonly<{
  /** Spendable ledger. Never alias this to season progress stars. */
  walletStars: number;
  seasonStarsEarned: number;
  equippedBySlot: Readonly<Record<string, string>>;
}>;

export type ArenaExpansionAvailability = Readonly<{
  today: boolean;
  lab: boolean;
  ghost: boolean;
  rival: boolean;
  mastery: boolean;
  partner: boolean;
  store: boolean;
}>;

export type ArenaExpansionHome = Readonly<{
  ok: true;
  availability: ArenaExpansionAvailability;
  today: ArenaTodaySummary;
  mastery: readonly ArenaMasteryMetric[];
  rivalries: readonly ArenaRivalrySummary[];
  partners: readonly ArenaPartnerSummary[];
  partnerPreferences: Readonly<{
    nudgesEnabled: boolean;
    quietHoursUtc: Readonly<{ startHour: number; endHour: number }> | null;
  }>;
  /** Convenience projection for the Hub preview; detail UI must use partners. */
  partner?: ArenaPartnerSummary;
  wallet: ArenaWalletSummary;
  activeRun?: Readonly<{ runId: string; runKind: 'today' | 'ghost' }>;
}>;

export type ArenaExpansionMasteryWire = Readonly<{
  score: number | null;
  sampleCount: number;
  confidence: 'hidden' | 'preliminary' | 'confident';
  accuracy: number;
  medianMs?: number;
  trend?: 'up' | 'steady' | 'down' | number;
}>;

export type ArenaExpansionHomeWire = Readonly<{
  ok: true;
  availability: ArenaExpansionAvailability;
  walletStars: number;
  seasonStarsEarned: number;
  equippedBySlot?: Readonly<Record<string, string>>;
  mastery: Readonly<Partial<Record<ArenaTaskMode, ArenaExpansionMasteryWire>>>;
  today: Readonly<{
    dayKey: string;
    band?: string;
    status: 'available' | 'in_progress' | 'complete' | 'expired' | 'unavailable';
    matchId?: string;
    starsEarned?: number;
    completedTasks?: number;
  }>;
  partners: readonly ArenaPartnerSummary[];
  partnerPreferences?: Readonly<{
    nudgesEnabled?: boolean;
    quietHoursUtc?: Readonly<{ startHour?: number; endHour?: number }> | null;
  }>;
  rivals: readonly ArenaRivalrySummary[];
  store: Readonly<{ catalogVersion?: string }>;
  activeRun?: Readonly<{ runId: string; runKind: 'today' | 'ghost' }>;
}>;

export type ArenaExpansionSession = Readonly<{
  sessionId: string;
  state: 'active' | 'reveal' | 'complete' | 'expired';
  currentTaskIndex: number;
  totalTasks: 10;
  currentPublicTask?: ArenaPublicTask;
  submitted: boolean;
  correct?: boolean;
  points?: number;
  starsEarned: number;
  deadlineAtMs?: number;
}>;

export type ArenaTodayStartResponse = Readonly<{
  ok: true;
  dayKey: string;
  band: string;
  matchId: string;
  viewerSeat: 'a';
  hardExpiresAtMs: number;
  official: true;
  match: ArenaMatch;
}>;

export type ArenaExpansionMatchMutation = Readonly<{
  ok: true;
  matchId: string;
  state: ArenaMatch['state'];
  version: number;
  viewerSeat: 'a' | 'b';
  match: ArenaMatch;
  viewerReward?: ArenaMatchReward;
  hardExpiresAtMs?: number;
  correct?: boolean;
  points?: number;
}>;

export type ArenaMatchLabPlan = Readonly<{
  recommendedMode: ArenaTaskMode;
  modes: readonly Readonly<{
    mode: ArenaTaskMode;
    sampleCount: number;
    accuracy?: number;
    available: boolean;
  }>[];
  review?: Readonly<{
    sourceRunId: string;
    turningPoint?: Readonly<{ taskIndex: number; code: 'slow_correct' | 'fast_wrong' | 'missed_streak' | 'comeback' }>;
    questions: readonly Readonly<{
      taskIndex: number;
      mode: ArenaTaskMode;
      verdict: 'correct' | 'incorrect' | 'unanswered';
      elapsedMs?: number;
      explanation?: string;
    }>[];
    /** Owner-only answer-bearing exercises. Never persist these in a public match doc. */
    recoveryTasks: readonly ArenaLabRecoveryItem[];
  }>;
}>;

export type ArenaLabRecoveryItem = Readonly<{
  publicTask: ArenaPublicTask;
  correctAnswer: unknown;
}>;

export type ArenaGhostSourceKind = 'arena_match' | 'arena_today';

export type ArenaGhostSummary = Readonly<{
  ghostId: string;
  ownerName: string;
  ownerAvatar?: string;
  rank?: number;
  state: 'available' | 'accepted' | 'complete' | 'expired' | 'unavailable';
  matchId?: string;
  createdAtMs?: number;
  expiresAtMs?: number;
  direction?: 'incoming' | 'outgoing';
  inviteToken?: string;
  shareUrl?: string;
  result?: Readonly<{ hostScore: number; guestScore: number; outcome: 'win' | 'loss' | 'draw' }>;
}>;

export type ArenaGhostResponse = Readonly<{
  ok: true;
  ghostId: string;
  status: 'available' | 'accepted' | 'complete' | 'expired' | 'unavailable';
  opponentKind: 'recording';
  expiresAtMs: number;
  noEconomy: true;
  matchId?: string;
  viewerSeat?: 'a' | 'b';
  result?: Readonly<{ hostScore: number; guestScore: number; outcome: 'win' | 'loss' | 'draw' }>;
}>;

export type ArenaGhostCreateResponse = ArenaGhostResponse & Readonly<{
  sourceRunId: string;
  sourceKind: ArenaGhostSourceKind;
  /** One-time bearer token. It must not be reconstructed from ghostId. */
  inviteToken: string;
  shareUrl: string;
}>;

export type ArenaRivalResponse = Readonly<{
  ok: true;
  seriesId: string;
  status: 'invited' | 'awaiting' | 'active' | 'complete' | 'left';
  wins: Readonly<{ a: number; b: number }>;
  gameIndex: number;
  maxGames: 3;
  activeMatchId?: string;
  viewerSeat?: 'a' | 'b';
  leaveAllowed: boolean;
}>;

export type ArenaCosmeticSlot = 'title' | 'reaction_pack' | 'result_theme' | 'victory_stamp' | 'entry';

export type ArenaStoreItem = Readonly<{
  sku: string;
  category: ArenaCosmeticSlot;
  slot: ArenaCosmeticSlot;
  priceStars: number;
  owned: boolean;
  equipped: boolean;
  available: boolean;
  icon?: 'shield' | 'sparkles' | 'ribbon';
}>;

export type ArenaStarStoreResponse = Readonly<{
  ok: true;
  catalogVersion: string;
  wallet: ArenaWalletSummary;
  items: readonly ArenaStoreItem[];
}>;

export type ArenaPurchaseResponse = Readonly<{
  ok: true;
  receiptId: string;
  itemId: string;
  balanceAfter: number;
  entitlement: Readonly<{ itemId: string; slot: ArenaCosmeticSlot }>;
}>;

export function normalizeArenaExpansionHome(wire: ArenaExpansionHomeWire): ArenaExpansionHome {
  const mastery = Object.entries(wire.mastery).flatMap(([mode, value]) => {
    if (!value) return [];
    return [{
      mode: mode as ArenaTaskMode,
      score: value.score,
      sampleCount: value.sampleCount,
      accuracy: value.accuracy,
      medianAnswerMs: value.medianMs,
      trend: typeof value.trend === 'number' ? value.trend > 0 ? 'up' : value.trend < 0 ? 'down' : 'steady' : value.trend,
      confidence: value.confidence === 'confident'
        ? 'stable' as const
        : value.confidence === 'preliminary'
          ? 'developing' as const
          : 'insufficient' as const,
    }];
  });
  const partners = wire.partners.filter((item) => item.state !== 'removed').slice(0, 5);
  return {
    ok: true,
    availability: wire.availability,
    today: {
      state: wire.today.status,
      completedTasks: Math.max(0, Math.min(10, wire.today.completedTasks ?? (wire.today.status === 'complete' ? 10 : 0))),
      totalTasks: 10,
      sessionId: wire.today.matchId,
      starsEarned: wire.today.starsEarned,
    },
    mastery,
    rivalries: wire.rivals,
    partners,
    partnerPreferences: {
      nudgesEnabled: wire.partnerPreferences?.nudgesEnabled === true,
      quietHoursUtc: wire.partnerPreferences?.quietHoursUtc
        && Number.isInteger(wire.partnerPreferences.quietHoursUtc.startHour)
        && Number.isInteger(wire.partnerPreferences.quietHoursUtc.endHour)
        ? {
          startHour: Math.max(0, Math.min(23, Number(wire.partnerPreferences.quietHoursUtc.startHour))),
          endHour: Math.max(0, Math.min(23, Number(wire.partnerPreferences.quietHoursUtc.endHour))),
        }
        : null,
    },
    partner: partners[0],
    wallet: {
      walletStars: wire.walletStars,
      seasonStarsEarned: wire.seasonStarsEarned,
      equippedBySlot: wire.equippedBySlot ?? {},
    },
    activeRun: wire.activeRun,
  };
}

export function coerceArenaHubSection(value: unknown): ArenaHubSection {
  return typeof value === 'string' && (ARENA_HUB_SECTIONS as readonly string[]).includes(value)
    ? value as ArenaHubSection
    : 'today';
}

export function rivalrySeriesStatus(viewerWins: number, opponentWins: number): 'active' | 'won' | 'lost' {
  if (viewerWins >= 2) return 'won';
  if (opponentWins >= 2) return 'lost';
  return 'active';
}

export function masteryLevel(metric: Pick<ArenaMasteryMetric, 'score'>): 'hidden' | 'starter' | 'developing' | 'strong' | 'expert' | 'mastered' {
  if (metric.score === null) return 'hidden';
  if (metric.score >= 90) return 'mastered';
  if (metric.score >= 80) return 'expert';
  if (metric.score >= 65) return 'strong';
  if (metric.score >= 50) return 'developing';
  return 'starter';
}
