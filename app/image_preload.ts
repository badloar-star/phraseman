import { Image, type ImageSourcePropType } from 'react-native';
import { Asset } from 'expo-asset';
import { FIRST_LESSON_SHEET_IMAGES } from '../components/firstLessonSheetAssets';
import { OSKOLOK_IMAGE_SOURCES } from './oskolok';
import { DebugLogger, reportSwallowed } from './debug-logger';

// Pre-load critical bundled images so Metro-served assets are already cached in dev.
// Image.getSize() only works with network URIs, not require() assets.
// Image.resolveAssetSource() warms the local asset registry without making requests.

const MEDAL_IMAGES = [
  require('../assets/images/levels/bronza.webp'),
  require('../assets/images/levels/serebro.webp'),
  require('../assets/images/levels/zoloto.webp'),
  require('../assets/images/levels/rubin.webp'),
  require('../assets/images/levels/izumrud.webp'),
  require('../assets/images/levels/almaz.webp'),
];

function isDevMetroAssetUri(uri: string) {
  if (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    (uri.includes('/assets/?unstable_path=') || uri.includes('%2Fassets%2F'))
  ) {
    return true;
  }
  return false;
}

function shouldPrefetchResolvedUri(uri: string) {
  if (!uri.startsWith('http')) return false;
  if (isDevMetroAssetUri(uri)) return false;
  return true;
}

function shouldLoadResolvedAsset(uri: string) {
  if (isDevMetroAssetUri(uri)) return false;
  return true;
}

async function warmImageSources(sources: readonly ImageSourcePropType[]) {
  const uniqueSources = Array.from(new Set(sources));
  const assetLoadSources: ImageSourcePropType[] = [];
  const prefetches: Promise<boolean>[] = [];

  uniqueSources.forEach(source => {
    try {
      const resolved = Image.resolveAssetSource(source);
      if (resolved?.uri) {
        if (shouldLoadResolvedAsset(resolved.uri)) {
          assetLoadSources.push(source);
        }
        if (shouldPrefetchResolvedUri(resolved.uri)) {
          prefetches.push(Image.prefetch(resolved.uri).catch((error: unknown) => { reportSwallowed('image_preload:warmImageSources', error); return false; }));
        }
      }
    } catch (e) {
      // Individual asset resolution failure must never crash the app.
      DebugLogger.error('image_preload:resolved', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  });

  await Promise.all([
    assetLoadSources.length > 0 ? Asset.loadAsync(assetLoadSources as any).catch((error: unknown) => { reportSwallowed('image_preload:warmImageSources', error); return []; }) : Promise.resolve([]),
    ...prefetches,
  ]);
}

export const preloadPrimaryTabImages = async () => {
  try {
    await warmImageSources([
      ...MEDAL_IMAGES,
      ...FIRST_LESSON_SHEET_IMAGES,
    ]);
  } catch (e) {
      // Silently fail - preloading is entirely optional.
      DebugLogger.error('image_preload:primary', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

export const preloadDeferredNonPrimaryImages = async () => {
  try {
    await warmImageSources([
      ...OSKOLOK_IMAGE_SOURCES,
    ]);
  } catch (e) {
      // Silently fail - preloading is entirely optional.
      DebugLogger.error('image_preload:preloadDeferredNonPrimaryImages', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

export const preloadImages = async () => {
  try {
    const allImages = [
      ...MEDAL_IMAGES,
      ...FIRST_LESSON_SHEET_IMAGES,
      ...OSKOLOK_IMAGE_SOURCES,
    ];
    await warmImageSources(allImages);
  } catch (e) {
      // Silently fail - preloading is entirely optional.
      DebugLogger.error('image_preload:allImages', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
