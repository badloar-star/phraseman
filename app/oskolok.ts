import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

type OskolokTier = 'single' | '80' | '180' | '420';
type OskolokThemeMode = ThemeMode;

// Single source of truth for shard art. Keep raw require() calls here so Expo can
// statically bundle every themed sprite.
const THEMED_OSKOLOK_IMAGES: Record<OskolokThemeMode, Record<OskolokTier, ImageSourcePropType>> = {
  dark: {
    single: require('../assets/images/shards/dark-single.webp'),
    '80': require('../assets/images/shards/dark-80.webp'),
    '180': require('../assets/images/shards/dark-180.webp'),
    '420': require('../assets/images/shards/dark-420.webp'),
  },
  gold: {
    single: require('../assets/images/shards/gold-single.webp'),
    '80': require('../assets/images/shards/gold-80.webp'),
    '180': require('../assets/images/shards/gold-180.webp'),
    '420': require('../assets/images/shards/gold-420.webp'),
  },
  coral: {
    single: require('../assets/images/shards/coral-single.webp'),
    '80': require('../assets/images/shards/coral-80.webp'),
    '180': require('../assets/images/shards/coral-180.webp'),
    '420': require('../assets/images/shards/coral-420.webp'),
  },
  minimalDark: {
    single: require('../assets/images/shards/minimalDark-single.webp'),
    '80': require('../assets/images/shards/minimalDark-80.webp'),
    '180': require('../assets/images/shards/minimalDark-180.webp'),
    '420': require('../assets/images/shards/minimalDark-420.webp'),
  },
  // Business has its own strict monochrome shard cutouts.
  business: {
    single: require('../assets/images/shards/business-single.webp'),
    '80': require('../assets/images/shards/business-80.webp'),
    '180': require('../assets/images/shards/business-180.webp'),
    '420': require('../assets/images/shards/business-420.webp'),
  },
  // Cinema themes use DALL-E object-cutout shard foreground assets.
  midnight: {
    single: require('../assets/images/shards/midnight-single.webp'),
    '80': require('../assets/images/shards/midnight-80.webp'),
    '180': require('../assets/images/shards/midnight-180.webp'),
    '420': require('../assets/images/shards/midnight-420.webp'),
  },
  ember: {
    single: require('../assets/images/shards/ember-single.webp'),
    '80': require('../assets/images/shards/ember-80.webp'),
    '180': require('../assets/images/shards/ember-180.webp'),
    '420': require('../assets/images/shards/ember-420.webp'),
  },
  aurora: {
    single: require('../assets/images/shards/aurora-single.webp'),
    '80': require('../assets/images/shards/aurora-80.webp'),
    '180': require('../assets/images/shards/aurora-180.webp'),
    '420': require('../assets/images/shards/aurora-420.webp'),
  },
  volt: {
    single: require('../assets/images/shards/volt-single.webp'),
    '80': require('../assets/images/shards/volt-80.webp'),
    '180': require('../assets/images/shards/volt-180.webp'),
    '420': require('../assets/images/shards/volt-420.webp'),
  },
};

export const OSKOLOK_IMAGE_SOURCES: readonly ImageSourcePropType[] = Object.values(THEMED_OSKOLOK_IMAGES)
  .flatMap(themeImages => Object.values(themeImages));

let currentOskolokThemeMode: OskolokThemeMode = 'minimalDark';

export function setOskolokThemeMode(themeMode: OskolokThemeMode): void {
  currentOskolokThemeMode = themeMode;
}

function oskolokTierForShards(shards: number): OskolokTier {
  const n = Math.floor(Number(shards));
  if (!Number.isFinite(n) || n <= 0) return 'single';
  if (n < 80) return '80';
  if (n < 180) return '180';
  return '420';
}

/**
 * Returns a themed shard pile by amount:
 * [1, 79] -> small pile, [80, 179] -> medium pile, [180, infinity] -> large pile.
 * Invalid or zero values use the single shard.
 */
export function oskolokImageForPackShards(shards: number, themeMode: OskolokThemeMode = currentOskolokThemeMode): ImageSourcePropType {
  const themeImages = THEMED_OSKOLOK_IMAGES[themeMode] ?? THEMED_OSKOLOK_IMAGES.minimalDark;
  return themeImages[oskolokTierForShards(shards)];
}

/**
 * Store IAP row icon. Starter intentionally uses the single-shard model;
 * higher packs use the same amount tiers as the rest of the app.
 */
export function oskolokImageForShardIapRow(pack: { id: string; shards: number }, themeMode: OskolokThemeMode = currentOskolokThemeMode): ImageSourcePropType {
  if (pack.id === 'starter') {
    const themeImages = THEMED_OSKOLOK_IMAGES[themeMode] ?? THEMED_OSKOLOK_IMAGES.minimalDark;
    return themeImages.single;
  }
  return oskolokImageForPackShards(pack.shards, themeMode);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
