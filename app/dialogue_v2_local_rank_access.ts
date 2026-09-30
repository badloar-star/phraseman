import { isValidCoinRank } from './coin_rank_table_v1';
import {
  decideDialogueV2ScenarioAccess,
  type DialogueV2ScenarioAccess,
} from '../shared/dialogue_v2_access_contract';
import {
  getDialogueV2CatalogueEntry,
  type DialogueV2CatalogueEntry,
} from '../shared/dialogue_v2_catalogue_index';

export type DialogueV2LocalRankAccess = Readonly<{
  entry: DialogueV2CatalogueEntry;
  access: DialogueV2ScenarioAccess;
}>;

/**
 * Local-first presentation access for the immutable V2 catalogue.
 * This deliberately accepts no subscription, ownership, or purchase state.
 */
export function getDialogueV2LocalRankAccess(
  scenarioId: unknown,
  localCoinRank: unknown,
): DialogueV2LocalRankAccess | null {
  const entry = getDialogueV2CatalogueEntry(scenarioId);
  if (!entry) return null;

  return {
    entry,
    access: decideDialogueV2ScenarioAccess({
      achievedRank: isValidCoinRank(localCoinRank) ? localCoinRank : null,
      rankRequired: entry.rankRequired,
    }),
  };
}
