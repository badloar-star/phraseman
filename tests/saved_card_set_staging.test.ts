import AsyncStorage from '@react-native-async-storage/async-storage';
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ stableId: 'test', generation: 1 }),
  isCurrentAccountGeneration: (token: { stableId: string; generation: number }) => token.stableId === 'test' && token.generation === 1,
  withAccountTransitionLock: (fn: () => Promise<unknown>) => fn(),
}));
import {
  consumeSavedCardSetStage,
  stageSavedCardSet,
} from '../app/community_packs/savedCardSetStaging';

describe('saved card set staging', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns a short key and hydrates the exact selected ids in order', async () => {
    const key = await stageSavedCardSet({
      packLanguage: 'en',
      cardIds: ['card-2', 'card-1', 'card-2'],
      cards: [
        { id: 'card-2', en: 'Two' },
        { id: 'card-1', en: 'One' },
      ],
    });

    expect(key.length).toBeLessThan(80);
    const staged = await consumeSavedCardSetStage(key);
    expect(staged?.cardIds).toEqual(['card-2', 'card-1']);
    expect(staged?.cards.map((card) => card.id)).toEqual(['card-2', 'card-1']);
  });

  it('consumes a stage once and does not leave editor payload in the route', async () => {
    const key = await stageSavedCardSet({ packLanguage: 'fr', cardIds: ['card-1'], cards: [{ id: 'card-1', en: 'Bonjour' }] });

    expect(key).not.toContain('Bonjour');
    expect(await consumeSavedCardSetStage(key)).not.toBeNull();
    expect(await consumeSavedCardSetStage(key)).toBeNull();
  });
});
