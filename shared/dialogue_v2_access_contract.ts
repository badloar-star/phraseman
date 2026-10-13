/**
 * Dialogue V2 progression is intentionally rank-only. Subscription and prior
 * ownership are accepted in the input shape solely so an integration cannot
 * accidentally treat either as an alternate unlock authority.
 */
export type DialogueV2ScenarioAccessInput = Readonly<{
  achievedRank: unknown;
  rankRequired: unknown;
  hasPremiumAccess?: boolean;
  ownsScenario?: boolean;
}>;

export type DialogueV2ScenarioAccess =
  | Readonly<{ status: 'unlocked' }>
  | Readonly<{ status: 'locked_by_rank'; rankRequired: number | null }>;

// зачем (правило владельца 13.10): ранг 0 — стартовый и допустим: на нём открыт ровно один диалог (social_01); раньше ранги < 1 отбрасывались
const FIRST_DIALOGUE_V2_RANK = 0;
const LAST_DIALOGUE_V2_RANK = 19;

function requiredCatalogueRank(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return null;
  if (value < FIRST_DIALOGUE_V2_RANK || value > LAST_DIALOGUE_V2_RANK) return null;
  return value;
}

function achievedAccountRank(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return null;
  return value >= FIRST_DIALOGUE_V2_RANK ? value : null;
}

export function decideDialogueV2ScenarioAccess(
  input: DialogueV2ScenarioAccessInput,
): DialogueV2ScenarioAccess {
  // Presentation-only helper. A server endpoint must resolve rankRequired from
  // its canonical scenario record, never accept it from a client request.
  const rankRequired = requiredCatalogueRank(input.rankRequired);
  const achievedRank = achievedAccountRank(input.achievedRank);
  if (rankRequired === null) return { status: 'locked_by_rank', rankRequired: null };
  if (achievedRank !== null && achievedRank >= rankRequired) return { status: 'unlocked' };
  return { status: 'locked_by_rank', rankRequired };
}
