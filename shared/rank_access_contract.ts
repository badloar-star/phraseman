export type RankAccessSurface =
  | "video"
  | "dialogues"
  | "peak"
  | "cards_hub"
  | "saved_cards"
  | "own_cards"
  | "card_practice"
  | "friends"
  | "social_packs";

export type RankAccessFacts = Readonly<{
  rank: number | null;
  rankResolved: boolean;
  plusActive: boolean;
  plusResolved: boolean;
  grantedSurfaces: ReadonlySet<RankAccessSurface>;
  grantsResolved: boolean;
  available: boolean;
  availabilityResolved: boolean;
}>;

export type RankAccessDecision =
  | Readonly<{
      status: "allowed";
      basis: "always_open" | "rank" | "plus" | "grandfather";
    }>
  | Readonly<{ status: "locked"; minimumRank: 1 | 2 | 3 }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "pending" }>;

const MINIMUM_RANK = {
  video: 1,
  dialogues: 1,
  peak: 2,
  cards_hub: 3,
} as const satisfies Partial<Record<RankAccessSurface, 1 | 2 | 3>>;

type RankGatedSurface = keyof typeof MINIMUM_RANK;

function isRankGatedSurface(
  surface: RankAccessSurface,
): surface is RankGatedSurface {
  return Object.prototype.hasOwnProperty.call(MINIMUM_RANK, surface);
}

function isValidRank(rank: number | null): rank is number {
  return rank !== null && Number.isInteger(rank) && rank >= 0 && rank <= 19;
}

export function decideRankAccess(
  surface: RankAccessSurface,
  facts: RankAccessFacts,
): RankAccessDecision {
  // Availability is the outer gate: no entitlement may expose an absent surface.
  if (!facts.availabilityResolved) return { status: "pending" };
  if (!facts.available) return { status: "unavailable" };

  // Personal and social utility surfaces deliberately do not wait for entitlement reads.
  if (!isRankGatedSurface(surface))
    return { status: "allowed", basis: "always_open" };

  if (facts.grantsResolved && facts.grantedSurfaces.has(surface)) {
    return { status: "allowed", basis: "grandfather" };
  }
  if (facts.plusResolved && facts.plusActive)
    return { status: "allowed", basis: "plus" };

  const minimumRank = MINIMUM_RANK[surface];
  if (
    facts.rankResolved &&
    isValidRank(facts.rank) &&
    facts.rank >= minimumRank
  ) {
    return { status: "allowed", basis: "rank" };
  }

  // Untrusted signals fail closed without turning a transient read into a durable lock.
  if (!facts.rankResolved || !facts.plusResolved || !facts.grantsResolved) {
    return { status: "pending" };
  }
  return { status: "locked", minimumRank };
}
