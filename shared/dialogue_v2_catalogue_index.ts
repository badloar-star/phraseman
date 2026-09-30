import {
  DIALOGUE_V2_CEFR_SEQUENCE,
  DIALOGUE_V2_WORLD_IDS,
  type DialogueV2Cefr,
  type DialogueV2WorldId,
} from './dialogue_v2_contract';

/**
 * Server/client-neutral catalogue spine. It deliberately contains no learner
 * copy, personas, prompts or objectives: those are added only by a reviewed,
 * language-specific immutable pack.
 */
export type DialogueV2CatalogueEntry = Readonly<{
  id: string;
  worldId: DialogueV2WorldId;
  rankRequired: number;
  cefr: DialogueV2Cefr;
}>;

export const DIALOGUE_V2_CATALOGUE_INDEX: readonly DialogueV2CatalogueEntry[] = Object.freeze(
  DIALOGUE_V2_WORLD_IDS.flatMap((worldId) => DIALOGUE_V2_CEFR_SEQUENCE.map((cefr, index) => Object.freeze({
    id: `${worldId}_${String(index + 1).padStart(2, '0')}`,
    worldId,
    rankRequired: index + 1,
    cefr,
  }))),
);

const ENTRY_BY_ID: ReadonlyMap<string, DialogueV2CatalogueEntry> = new Map(
  DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => [entry.id, entry]),
);

export function getDialogueV2CatalogueEntry(scenarioId: unknown): DialogueV2CatalogueEntry | null {
  if (typeof scenarioId !== 'string') return null;
  return ENTRY_BY_ID.get(scenarioId) ?? null;
}
