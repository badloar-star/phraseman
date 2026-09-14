import {
  AVATAR_PHENOMENA_ART_VERSION,
  AVATAR_PHENOMENA_ASSET_FOLDER,
  AVATAR_PHENOMENA_CATALOG,
  AVATAR_PHENOMENA_CATALOG_IDS,
  avatarPhenomenaAssetSource,
} from '../constants/avatar_phenomena_assets';
import { AVATAR_PHENOMENA_FITS } from '../constants/avatar_phenomena_fits';

describe('Avatar Phenomena V1 catalog', () => {
  it('contains 18 unique phenomena with three products in every active price tier', () => {
    expect(AVATAR_PHENOMENA_CATALOG_IDS).toHaveLength(18);
    expect(new Set(AVATAR_PHENOMENA_CATALOG_IDS).size).toBe(18);

    const prices = Object.values(AVATAR_PHENOMENA_CATALOG).map((entry) => entry.price);
    expect(prices.filter((price) => price === 70)).toHaveLength(3);
    expect(prices.filter((price) => price === 100)).toHaveLength(3);
    expect(prices.filter((price) => price === 150)).toHaveLength(3);
    expect(prices.filter((price) => price === 300)).toHaveLength(3);
    expect(prices.filter((price) => price === 500)).toHaveLength(3);
    expect(prices.filter((price) => price === 1000)).toHaveLength(3);
  });

  it('uses one immutable phenomena art version and one light hosted asset per product', () => {
    expect(AVATAR_PHENOMENA_ART_VERSION).toBe('phenomena-v1');
    expect(AVATAR_PHENOMENA_ASSET_FOLDER).toBe('avatar-phenomena-v1');

    const urls = Object.entries(AVATAR_PHENOMENA_CATALOG).map(([id, entry]) => {
      expect(id).toMatch(/^custom-phen-(0[1-9]|1[0-8])$/);
      expect(entry.collection).toBe('phenomena-v1');
      expect(entry.white).toEqual({
        uri: expect.stringMatching(`/avatar-phenomena-v1/${id}-white\\.webp$`),
      });
      expect(entry).not.toHaveProperty('black');
      return (entry.white as { uri: string }).uri;
    });

    expect(urls).toHaveLength(18);
    expect(new Set(urls).size).toBe(18);
    expect(Object.keys(AVATAR_PHENOMENA_FITS)).toHaveLength(18);
    expect(Object.keys(AVATAR_PHENOMENA_FITS).every((key) => key.endsWith(':white'))).toBe(true);
    expect(avatarPhenomenaAssetSource('custom-phen-01', 'black'))
      .toEqual(avatarPhenomenaAssetSource('custom-phen-01', 'white'));
  });
});
