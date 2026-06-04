import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  UGC_CARD_BACK_DEFAULT_ID,
  UGC_CARD_BACK_IDS,
  cardBackFanImage,
  cardBackImage,
  normalizeUgcCardBackKey,
} from '../app/flashcards/cardBackCatalog';
import {
  OFFICIAL_MOVIE_SERIES_EN_ID,
  OFFICIAL_PHRASAL_VERBS_EN_ID,
} from '../app/flashcards/bundles/packIds';
import { BUNDLED_MARKETPLACE_PACKS } from '../app/flashcards/marketplace';
import { packTileImageForPack } from '../app/flashcards/packMarketplaceIcons';
import {
  COMMUNITY_PACK_PRICE_SHARDS,
  buildCommunityPackPayloadForCloud,
  validateCommunityPackPayload,
  type CommunityPackSubmissionPayload,
} from '../app/community_packs/schema';
import { mapCommunityPackDocToMarket } from '../app/community_packs/communityFirestore';

jest.mock('../app/community_packs/functionsClient', () => ({
  callCommunityFetchPackCardsIfAccessible: jest.fn(),
  isCommunityPacksCloudEnabled: jest.fn(() => true),
}));

function validPayload(cardBackKey: string): CommunityPackSubmissionPayload {
  return {
    title: 'Creator pack',
    description: 'Community examples',
    priceShards: COMMUNITY_PACK_PRICE_SHARDS,
    cardThemeKey: 'aqua_pulse',
    cardBackKey,
    cards: Array.from({ length: 10 }, (_, i) => ({
      id: `c${i + 1}`,
      en: `Phrase ${i + 1}`,
      ru: `Фраза ${i + 1}`,
    })),
  };
}

describe('community pack card backs', () => {
  it('exposes thirty selectable UGC card backs with single and fan art', () => {
    expect(UGC_CARD_BACK_IDS).toHaveLength(30);
    expect(new Set(UGC_CARD_BACK_IDS).size).toBe(UGC_CARD_BACK_IDS.length);

    for (const id of UGC_CARD_BACK_IDS) {
      expect(cardBackImage(id)).toBeDefined();
      expect(cardBackFanImage(id)).toBeDefined();
    }
  });

  it('keeps selected card back key in the cloud payload', () => {
    const payload = validPayload('community_20_crystal_prism');

    expect(validateCommunityPackPayload(payload)).toBeNull();
    expect(buildCommunityPackPayloadForCloud(payload)).toMatchObject({
      cardThemeKey: 'aqua_pulse',
      cardBackKey: 'community_20_crystal_prism',
    });
  });

  it('normalizes community pack listing art for marketplace tiles', () => {
    const pack = mapCommunityPackDocToMarket('ugc_pack_1', {
      listingStatus: 'published',
      titleRu: 'UGC',
      cardBackKey: 'community_29_rainbow_foil',
      cardCount: 10,
      updatedAt: 1,
    });

    expect(pack?.ugcCardBackKey).toBe('community_29_rainbow_foil');
    expect(packTileImageForPack(pack!)).toBeDefined();
    expect(normalizeUgcCardBackKey('missing')).toBe(UGC_CARD_BACK_DEFAULT_ID);
  });

  it('keeps the newest official pack backs wired for marketplace tiles', () => {
    for (const packId of [OFFICIAL_PHRASAL_VERBS_EN_ID, OFFICIAL_MOVIE_SERIES_EN_ID]) {
      const pack = BUNDLED_MARKETPLACE_PACKS.find((item) => item.id === packId);

      expect(pack).toBeDefined();
      expect(cardBackImage(packId)).toBeDefined();
      expect(cardBackFanImage(packId)).toBeDefined();
      expect(packTileImageForPack(pack!)).toBeDefined();
    }
  });

  it('keeps generated card back assets on strict canvases with consistent visible bounds', async () => {
    const dir = path.join(__dirname, '..', 'assets', 'images', 'flashcard_backs');
    const files = fs.readdirSync(dir).filter((name) => name.endsWith('.webp')).sort();
    const singles = files.filter((name) => !name.includes('_fan.'));
    const fans = files.filter((name) => name.includes('_fan.'));

    const measure = async (name: string) => {
      const full = path.join(dir, name);
      const meta = await sharp(full).metadata();
      const trimmed = await sharp(full)
        .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
        .png()
        .toBuffer({ resolveWithObject: true });
      return `${meta.width}x${meta.height}:${trimmed.info.width}x${trimmed.info.height}`;
    };

    expect(new Set(await Promise.all(singles.map(measure)))).toEqual(new Set(['164x224:142x206']));
    expect(new Set(await Promise.all(fans.map(measure)))).toEqual(new Set(['329x268:272x215']));
  });
});
