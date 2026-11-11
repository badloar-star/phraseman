/**
 * Dialogue V2 access: coin rank OR an active Plus subscription.
 *
 * зачем (владелец 2026-11-11, D204 — отменяет «только ранг» из D124/D185): экран покупки обещает
 * «Сценарии: по рангу / все сразу», и владелец выбрал выполнить обещание, а не убрать его. Plus открывает
 * любой сценарий каталога сразу; бесплатный аккаунт по-прежнему идёт лестницей рангов.
 * Prior rune ownership (ownsScenario) is still ignored: old purchases do not unlock anything.
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
  // Unknown scenario rank stays closed for everyone: Plus opens catalogue scenarios, not malformed rows.
  if (rankRequired === null) return { status: 'locked_by_rank', rankRequired: null };
  if (achievedRank !== null && achievedRank >= rankRequired) return { status: 'unlocked' };
  // Strict `=== true`: an unresolved or garbage flag must never open a scenario.
  if (input.hasPremiumAccess === true) return { status: 'unlocked' };
  return { status: 'locked_by_rank', rankRequired };
}
