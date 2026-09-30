import fs from 'fs';
import path from 'path';
import { packTileArtRevision, packTileImageForPack } from '../app/flashcards/packMarketplaceIcons';
import { buildCommunityPackPayloadForCloud, validateCommunityPackPayload } from '../app/community_packs/schema';
import { mapCommunityPackDocToMarket } from '../app/community_packs/communityFirestore';

jest.mock('../app/community_packs/functionsClient', () => ({
  callCommunityFetchPackCardsIfAccessible: jest.fn(),
  isCommunityPacksCloudEnabled: jest.fn(() => true),
}));

describe('retired community card backs', () => {
  it('ships no card-back images or picker', () => {
    const root = path.join(__dirname, '..');
    const dir = path.join(root, 'assets', 'images', 'flashcard_backs');
    expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toEqual([]);
    const create = fs.readFileSync(path.join(root, 'app', 'community_pack_create.tsx'), 'utf8');
    expect(create).not.toContain('cardBackKey');
    expect(create).not.toContain('ugc-pack-back-');
  });

  it('ignores legacy back keys while keeping community cards', () => {
    const payload = {
      title: 'Creator pack',
      description: 'Community examples',
      cardThemeKey: 'aqua_pulse',
      cardBackKey: 'community_01_aqua_circuit',
      cards: Array.from({ length: 10 }, (_, i) => ({
        id: `c${i + 1}`,
        en: `Phrase ${i + 1}`,
        ru: `Фраза ${i + 1}`,
      })),
    };
    expect(validateCommunityPackPayload(payload)).toBeNull();
    const cloud = buildCommunityPackPayloadForCloud(payload);
    expect(cloud).not.toHaveProperty('cardBackKey');
    expect(cloud.cards).toHaveLength(10);

    const pack = mapCommunityPackDocToMarket('ugc_pack_1', {
      listingStatus: 'published',
      titleRu: 'UGC',
      cardBackKey: 'community_01_aqua_circuit',
      cardCount: 10,
      updatedAt: 1,
    });
    expect(pack).toBeDefined();
    expect(pack).not.toHaveProperty('ugcCardBackKey');
    expect(packTileImageForPack(pack!)).toBeUndefined();
    expect(packTileArtRevision(pack!)).toBe('ugc_pack_1');
  });
});
