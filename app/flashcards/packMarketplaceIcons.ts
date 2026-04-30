import type { ImageSourcePropType } from 'react-native';

/** PNG-плитки каталогу (прозорий фон); імена файлів у `assets/images/levels/`. */
const BUNDLED_PACK_TILE_PNG: Record<string, ImageSourcePropType> = {
  official_negotiator_en: require('../../assets/images/levels/NEGOTIATOR.png'),
  official_dark_logic_en: require('../../assets/images/levels/DARK LOGIC.png'),
  official_wild_west_en: require('../../assets/images/levels/WILD WEST.png'),
  official_royal_tea_en: require('../../assets/images/levels/ROYAL TEA.png'),
  official_peaky_blinders_en: require('../../assets/images/levels/PEAKY BLINDERS.png'),
};

export function bundledPackTilePng(packId: string): ImageSourcePropType | undefined {
  return BUNDLED_PACK_TILE_PNG[packId];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
