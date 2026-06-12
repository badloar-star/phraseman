import {
  CINEMA_ASSET_VARIANT_STORAGE_KEY,
  CINEMA_ASSET_VARIANTS,
  CINEMA_THEME_MODES_FOR_ASSET_PREVIEW,
  isCinemaAssetVariant,
} from '../constants/cinemaAssetVariants';

describe('cinema asset variant dev selector contract', () => {
  it('exposes all serious preview variants for every cinema theme', () => {
    expect(CINEMA_ASSET_VARIANT_STORAGE_KEY).toBe('cinema_asset_variant');
    expect(CINEMA_ASSET_VARIANTS.map(variant => variant.id)).toEqual([
      'relicGlass',
      'monolith',
      'signalCrest',
    ]);
    expect(CINEMA_THEME_MODES_FOR_ASSET_PREVIEW).toEqual([
      'midnight',
      'ember',
      'aurora',
      'volt',
    ]);
    expect(isCinemaAssetVariant('monolith')).toBe(true);
    expect(isCinemaAssetVariant('cartoon')).toBe(false);
  });
});
