import {
  DIALOGUE_V2_CATALOGUE_INDEX,
  getDialogueV2CatalogueEntry,
} from '../shared/dialogue_v2_catalogue_index';
import { DIALOGUE_V2_CEFR_SEQUENCE, DIALOGUE_V2_WORLD_IDS } from '../shared/dialogue_v2_contract';

describe('dialogue v2 catalogue index', () => {
  test('materialises all four 19-rank worlds without learner-facing text', () => {
    expect(DIALOGUE_V2_CATALOGUE_INDEX).toHaveLength(76);
    expect(Object.isFrozen(DIALOGUE_V2_CATALOGUE_INDEX)).toBe(true);
    expect(DIALOGUE_V2_CATALOGUE_INDEX.every((entry) => Object.isFrozen(entry))).toBe(true);
    expect(DIALOGUE_V2_CATALOGUE_INDEX.every((entry) => (
      Object.keys(entry).every((key) => ['id', 'worldId', 'rankRequired', 'unlockRank', 'cefr'].includes(key))
    ))).toBe(true);

    for (const worldId of DIALOGUE_V2_WORLD_IDS) {
      const worldEntries = DIALOGUE_V2_CATALOGUE_INDEX.filter((entry) => entry.worldId === worldId);
      expect(worldEntries.map((entry) => entry.rankRequired)).toEqual(
        Array.from({ length: 19 }, (_, index) => index + 1),
      );
      expect(worldEntries.map((entry) => entry.cefr)).toEqual(DIALOGUE_V2_CEFR_SEQUENCE);
    }
  });

  test('resolves an immutable scenario id to its rank and CEFR', () => {
    expect(getDialogueV2CatalogueEntry('social_19')).toEqual({
      id: 'social_19', worldId: 'social', rankRequired: 19, unlockRank: 18, cefr: 'C2',
    });
    expect(getDialogueV2CatalogueEntry('coffee')).toBeNull();
  });
});
