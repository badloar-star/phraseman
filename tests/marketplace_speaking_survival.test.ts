import { BUNDLED_MARKETPLACE_PACKS, buildMarketplaceOwnedCards, loadMarketplacePacks } from '../app/flashcards/marketplace';
import {
  OFFICIAL_DARK_LOGIC_EN_ID,
  OFFICIAL_NEGOTIATOR_EN_ID,
  OFFICIAL_PEAKY_BLINDERS_EN_ID,
  OFFICIAL_ROYAL_TEA_EN_ID,
  OFFICIAL_WILD_WEST_EN_ID,
} from '../app/flashcards/bundles/packIds';

describe('marketplace: bundled', () => {
  it('у маніфесті тільки поточні вбудовані паки (каталог = бандл)', () => {
    const ids = BUNDLED_MARKETPLACE_PACKS.map((p) => p.id);
    expect(ids).toEqual([
      OFFICIAL_NEGOTIATOR_EN_ID,
      OFFICIAL_DARK_LOGIC_EN_ID,
      OFFICIAL_WILD_WEST_EN_ID,
      OFFICIAL_ROYAL_TEA_EN_ID,
      OFFICIAL_PEAKY_BLINDERS_EN_ID,
    ]);
  });

  it('loadMarketplacePacks (без Firestore) повертає бандл', async () => {
    const packs = await loadMarketplacePacks();
    expect(packs.length).toBe(5);
    expect(packs[0].id).toBe(OFFICIAL_NEGOTIATOR_EN_ID);
  });

  it('Negotiator: 30 карток з бандла', () => {
    const pack = BUNDLED_MARKETPLACE_PACKS.find((p) => p.id === OFFICIAL_NEGOTIATOR_EN_ID);
    expect(pack).toBeDefined();
    expect(pack?.cardCount).toBe(30);
    const built = buildMarketplaceOwnedCards([pack!]);
    expect(built).toHaveLength(30);
    expect(built[0].sourceId).toBe(`DEV:${OFFICIAL_NEGOTIATOR_EN_ID}`);
    expect(built[0].en).toBe('To eyeball it');
  });

  it('Peaky Blinders: 30 карток з бандла', () => {
    const pack = BUNDLED_MARKETPLACE_PACKS.find((p) => p.id === OFFICIAL_PEAKY_BLINDERS_EN_ID);
    expect(pack).toBeDefined();
    expect(pack?.cardCount).toBe(30);
    const built = buildMarketplaceOwnedCards([pack!]);
    expect(built).toHaveLength(30);
    expect(built[0].sourceId).toBe(`DEV:${OFFICIAL_PEAKY_BLINDERS_EN_ID}`);
    expect(built[0].en).toBe('To settle a score');
  });

  it('Royal Tea: 40 карток з бандла', () => {
    const pack = BUNDLED_MARKETPLACE_PACKS.find((p) => p.id === OFFICIAL_ROYAL_TEA_EN_ID);
    expect(pack).toBeDefined();
    expect(pack?.cardCount).toBe(40);
    const built = buildMarketplaceOwnedCards([pack!]);
    expect(built).toHaveLength(40);
    expect(built[0].sourceId).toBe(`DEV:${OFFICIAL_ROYAL_TEA_EN_ID}`);
    expect(built[0].en).toBe('A diamond of the first water');
  });

  it('Wild West: 50 карток з бандла', () => {
    const pack = BUNDLED_MARKETPLACE_PACKS.find((p) => p.id === OFFICIAL_WILD_WEST_EN_ID);
    expect(pack).toBeDefined();
    expect(pack?.cardCount).toBe(50);
    const built = buildMarketplaceOwnedCards([pack!]);
    expect(built).toHaveLength(50);
    expect(built[0].sourceId).toBe(`DEV:${OFFICIAL_WILD_WEST_EN_ID}`);
    expect(built[0].en).toBe('To bite the dust');
  });

  it('Dark Logic: 40 карток з бандла', () => {
    const pack = BUNDLED_MARKETPLACE_PACKS.find((p) => p.id === OFFICIAL_DARK_LOGIC_EN_ID);
    expect(pack).toBeDefined();
    expect(pack?.cardCount).toBe(40);
    const built = buildMarketplaceOwnedCards([pack!]);
    expect(built).toHaveLength(40);
    expect(built[0].sourceId).toBe(`DEV:${OFFICIAL_DARK_LOGIC_EN_ID}`);
    expect(built[0].en).toBe('A straw man argument');
  });

  it('картки для невідомого id — шаблони (DEV:pack)', () => {
    const built = buildMarketplaceOwnedCards([
      {
        id: 'test_pack_placeholder',
        codeName: 'TEST',
        titleRu: 'Тест',
        titleUk: 'Тест',
        titleEs: '',
        descriptionRu: '',
        descriptionUk: '',
        descriptionEs: '',
        category: 'daily',
        cardCount: 1,
        priceShards: 0,
        ratingAvg: 0,
        ratingCount: 0,
        salesCount: 0,
        authorName: 'Test',
        isOfficial: false,
        updatedAt: new Date(0).toISOString(),
      },
    ]);
    expect(built.length).toBeGreaterThan(0);
    expect(built[0].sourceId).toBe('DEV:test_pack_placeholder');
  });
});
