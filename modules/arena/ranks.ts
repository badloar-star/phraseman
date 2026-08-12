export type ArenaRank = Readonly<{
  /** Canonical matchmaking index: 0..23. */
  index: number;
  /** Visual tier: 0..7. */
  tierIndex: number;
  /** Division inside a tier: I..III, represented as 1..3. */
  division: 1 | 2 | 3;
  minRating: number;
}>;

export const ARENA_RANKS: readonly ArenaRank[] = Array.from({ length: 24 }, (_, index) => ({
  index,
  tierIndex: Math.floor(index / 3),
  division: ((index % 3) + 1) as 1 | 2 | 3,
  minRating: index === 0 ? 0 : index * 100,
}));

export function arenaRankForRating(rating: number): ArenaRank {
  const safe = Math.max(0, Math.floor(rating));
  return [...ARENA_RANKS].reverse().find((rank) => safe >= rank.minRating) ?? ARENA_RANKS[0];
}

export function isRankedOpponentEligible(ownRankIndex: number, opponentRankIndex: number): boolean {
  return Math.abs(ownRankIndex - opponentRankIndex) <= 1;
}
