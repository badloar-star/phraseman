import { applyCommunityPacksFilter, filterPacksByLanguage } from '../app/community_packs/communityCatalogFilter';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';

function pack(id: string, extra: Partial<FlashcardMarketPack> = {}): FlashcardMarketPack {
  return {
    id,
    codeName: id,
    titleRu: id,
    titleUk: id,
    titleEs: id,
    descriptionRu: '',
    descriptionUk: '',
    descriptionEs: '',
    category: 'daily',
    cardCount: 10,
    priceShards: 0,
    salesCount: 0,
    authorName: 'Author',
    isOfficial: false,
    updatedAt: '2026-09-12T00:00:00.000Z',
    ...extra,
  };
}

describe('community pack language filter', () => {
  it('keeps only the selected language and treats legacy packs as English', () => {
    const packs = [
      pack('legacy'),
      pack('fr', { packLanguage: 'fr' }),
      pack('de', { packLanguage: 'de' }),
      pack('es', { packLanguage: 'es' }),
    ];

    expect(filterPacksByLanguage(packs, 'fr').map((item) => item.id)).toEqual(['fr']);
    expect(filterPacksByLanguage(packs, 'de').map((item) => item.id)).toEqual(['de']);
    expect(filterPacksByLanguage(packs, 'es').map((item) => item.id)).toEqual(['es']);
    expect(filterPacksByLanguage(packs, 'en').map((item) => item.id)).toEqual(['legacy']);
  });

  it('composes language filtering with existing query and sort without falling back', () => {
    const packs = [
      pack('en-old', { packLanguage: 'en', updatedAt: '2026-09-10T00:00:00.000Z' }),
      pack('de-new', { packLanguage: 'de', titleRu: 'Airport', updatedAt: '2026-09-12T00:00:00.000Z' }),
    ];

    expect(applyCommunityPacksFilter(packs, 'Airport', 'new', 'en')).toEqual([]);
    expect(applyCommunityPacksFilter(packs, '', 'new', 'de').map((item) => item.id)).toEqual(['de-new']);
  });
});
