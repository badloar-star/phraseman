import { communityPackCardsToCardItems } from '../app/community_packs/communityFirestore';

jest.mock('@react-native-firebase/firestore', () => () => ({}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: false, IS_EXPO_GO: true }));

describe('rich community flashcard runtime compatibility', () => {
  it('preserves rich fields and all source references', () => {
    const [card] = communityPackCardsToCardItems('pack-1', [{ id: 'c1', en: 'Station', ru: 'Вокзал', richSchemaVersion: 1, exampleTarget: 'The station is near.', exampleSource: 'Вокзал рядом.', note: 'Travel noun.', sourceReferences: ['lesson:1:p1', 'exemplar:e2'] }]);
    expect(card).toMatchObject({ exampleTarget: 'The station is near.', exampleSource: 'Вокзал рядом.', exampleEn: 'The station is near.', exampleRu: 'Вокзал рядом.', description: 'Travel noun.', note: 'Travel noun.', sourceReferences: ['lesson:1:p1', 'exemplar:e2'] });
  });

  it('keeps legacy cards readable and falls back field by field', () => {
    const [legacy] = communityPackCardsToCardItems('pack-old', [{ id: 'c1', en: 'Station', ru: 'Вокзал', uk: 'Legacy note', exampleEn: 'At the station.', exampleRu: 'На вокзале.' }]);
    expect(legacy).toMatchObject({ en: 'Station', ru: 'Вокзал', description: 'Legacy note', exampleTarget: 'At the station.', exampleSource: 'На вокзале.' });
  });
});
