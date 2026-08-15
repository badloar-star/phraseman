import type { ImageSourcePropType } from 'react-native';
import { cardBackFanImage, cardBackFanImageForPack, normalizeUgcCardBackKey } from './cardBackCatalog';
import type { FlashcardMarketPack } from './marketplace';

type PackTileArtFields = Pick<FlashcardMarketPack, 'id' | 'isCommunityUgc' | 'ugcCardBackKey'>;

export function bundledPackTilePng(packId: string): ImageSourcePropType | undefined {
  return cardBackFanImage(packId);
}

export function packTileImageForPack(
  pack: PackTileArtFields,
): ImageSourcePropType | undefined {
  return cardBackFanImageForPack(pack);
}

/**
 * Stable revision for memoized pack lists.
 *
 * A UGC pack keeps the same id when its author changes the selected cover. Lists
 * that compared only ids therefore retained the old pack object and made most
 * cover choices look as if they had not applied. Keep the resolved art id in the
 * revision so a saved cover change invalidates those UI caches immediately.
 */
export function packTileArtRevision(pack: PackTileArtFields): string {
  const artId = pack.isCommunityUgc ? normalizeUgcCardBackKey(pack.ugcCardBackKey) : pack.id;
  return `${pack.id}:${artId}`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
