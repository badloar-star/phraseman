import type { ImageSourcePropType } from 'react-native';

/** WebP-плитки каталогу (прозорий фон); імена файлів у `assets/images/levels/`. */
const BUNDLED_PACK_TILE_WEBP: Record<string, ImageSourcePropType> = {
  official_negotiator_en: require('../../assets/images/levels/NEGOTIATOR.webp'),
  official_dark_logic_en: require('../../assets/images/levels/DARK LOGIC.webp'),
  official_wild_west_en: require('../../assets/images/levels/WILD WEST.webp'),
  official_royal_tea_en: require('../../assets/images/levels/ROYAL TEA.webp'),
  official_peaky_blinders_en: require('../../assets/images/levels/PEAKY BLINDERS.webp'),
};

export function bundledPackTilePng(packId: string): ImageSourcePropType | undefined {
  return BUNDLED_PACK_TILE_WEBP[packId];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
