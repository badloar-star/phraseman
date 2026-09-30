import type { ImageSourcePropType } from 'react-native';
import type { FlashcardMarketPack } from './marketplace';

type PackTileArtFields = Pick<FlashcardMarketPack, 'id'>;

export function bundledPackTilePng(_packId: string): ImageSourcePropType | undefined {
  return undefined;
}

export function packTileImageForPack(
  _pack: PackTileArtFields,
): ImageSourcePropType | undefined {
  return undefined;
}

/**
 * Stable revision for memoized pack lists.
 *
 * Pack art is retired; id is sufficient for stable list identity.
 */
export function packTileArtRevision(pack: PackTileArtFields): string {
  return pack.id;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
