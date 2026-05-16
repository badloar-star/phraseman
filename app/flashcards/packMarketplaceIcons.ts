import type { ImageSourcePropType } from 'react-native';

/** WebP-плитки каталогу (прозорий фон); імена файлів у `assets/images/levels/`. */
const BUNDLED_PACK_TILE_WEBP: Record<string, ImageSourcePropType> = {
  official_negotiator_en: require('../../assets/images/levels/NEGOTIATOR.webp'),
  official_dark_logic_en: require('../../assets/images/levels/DARK LOGIC.webp'),
  official_wild_west_en: require('../../assets/images/levels/WILD WEST.webp'),
  official_royal_tea_en: require('../../assets/images/levels/ROYAL TEA.webp'),
  official_peaky_blinders_en: require('../../assets/images/levels/PEAKY BLINDERS.webp'),
  official_prep_in_en: require('../../assets/images/levels/in.webp'),
  official_prep_on_en: require('../../assets/images/levels/on.webp'),
  official_prep_at_en: require('../../assets/images/levels/At.webp'),
  official_prep_to_en: require('../../assets/images/levels/to.webp'),
  official_prep_by_en: require('../../assets/images/levels/by.webp'),
};

export function bundledPackTilePng(packId: string): ImageSourcePropType | undefined {
  return BUNDLED_PACK_TILE_WEBP[packId];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
