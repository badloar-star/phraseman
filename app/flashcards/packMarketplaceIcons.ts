import type { ImageSourcePropType } from 'react-native';
import { cardBackFanImage, cardBackFanImageForPack } from './cardBackCatalog';
import type { FlashcardMarketPack } from './marketplace';

export function bundledPackTilePng(packId: string): ImageSourcePropType | undefined {
  return cardBackFanImage(packId);
}

export function packTileImageForPack(
  pack: Pick<FlashcardMarketPack, 'id' | 'isCommunityUgc' | 'ugcCardBackKey'>,
): ImageSourcePropType | undefined {
  return cardBackFanImageForPack(pack);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
