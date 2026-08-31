import {
  AVATAR_PHENOMENA_ART_VERSION,
  AVATAR_PHENOMENA_ASSET_FOLDER,
  AVATAR_PHENOMENA_CATALOG,
  AVATAR_PHENOMENA_CATALOG_IDS,
} from '../constants/avatar_phenomena_assets';

describe('Avatar Phenomena V1 catalog', () => {
  it('contains 18 unique phenomena with three products in every active price tier', () => {
    expect(AVATAR_PHENOMENA_CATALOG_IDS).toHaveLength(18);
    expect(new Set(AVATAR_PHENOMENA_CATALOG_IDS)).toHaveSize(18);

    const prices = Object.values(AVATAR_PHENOMENA_CATALOG).map((entry) => entry.price);
    expect(prices.filter((price) => price === 70)).toHaveLength(3);
    expect(prices.filter((price) => price === 100)).toHaveLength(3);
    expect(prices.filter((price) => price === 150)).toHaveLength(3);
    expect(prices.filter((price) => price === 300)).toHaveLength(3);
    expect(prices.filter((price) => price === 500)).toHaveLength(3);
    expect(prices.filter((price) => price === 1000)).toHaveLength(3);
  });

  it('uses one immutable phenomena art version and two distinct hosted assets per product', () => {
    expect(AVATAR_PHENOMENA_ART_VERSION).toBe('phenomena-v1');
    expect(AVATAR_PHENOMENA_ASSET_FOLDER).toBe('avatar-phenomena-v1');

    const urls = Object.entries(AVATAR_PHENOMENA_CATALOG).flatMap(([id, entry]) => {
      expect(id).toMatch(/^custom-phen-(0[1-9]|1[0-8])$/);
      expect(entry.collection).toBe('phenomena-v1');
      expect(entry.black).not.toEqual(entry.white);
      expect(entry.black).toEqual({
        uri: expect.stringMatching(`/avatar-phenomena-v1/${id}-black\\.webp$`),
      });
      expect(entry.white).toEqual({
        uri: expect.stringMatching(`/avatar-phenomena-v1/${id}-white\\.webp$`),
      });
      return [(entry.black as { uri: string }).uri, (entry.white as { uri: string }).uri];
    });

    expect(urls).toHaveLength(36);
    expect(new Set(urls)).toHaveSize(36);
  });
});
