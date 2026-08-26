import { Image, type ImageSourcePropType } from 'react-native';
import { Asset } from 'expo-asset';
import { FIRST_LESSON_SHEET_IMAGES } from '../components/firstLessonSheetAssets';
import { OSKOLOK_IMAGE_SOURCES } from './oskolok';
import { getActiveReferralInviteBannerImage } from '../components/ReferralInviteBannerArt';

// Pre-load critical bundled images so Metro-served assets are already cached in dev.
// Image.getSize() only works with network URIs, not require() assets.
// Image.resolveAssetSource() warms the local asset registry without making requests.

const CLUB_IMAGES = [
  require('../assets/images/levels/club icon base forest.webp'),
  require('../assets/images/levels/club base ocean.webp'),
  require('../assets/images/levels/club base corak.webp'),
  require('../assets/images/levels/club base sacura.webp'),
];

const MEDAL_IMAGES = [
  require('../assets/images/levels/bronza.webp'),
  require('../assets/images/levels/serebro.webp'),
  require('../assets/images/levels/zoloto.webp'),
  require('../assets/images/levels/rubin.webp'),
  require('../assets/images/levels/izumrud.webp'),
  require('../assets/images/levels/almaz.webp'),
];

const LESSON_INTRO_CTA_IMAGES = [
  require('../assets/images/lesson_intro/intro-cta-dark.webp'),
  require('../assets/images/lesson_intro/intro-cta-premium-gold.webp'),
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
          prefetches.push(Image.prefetch(resolved.uri).catch(() => false));
        }
      }
    } catch {
      // Individual asset resolution failure must never crash the app.
    }
  });

  await Promise.all([
    assetLoadSources.length > 0 ? Asset.loadAsync(assetLoadSources as any).catch(() => []) : Promise.resolve([]),
    ...prefetches,
  ]);
}

export const preloadPrimaryTabImages = async () => {
  try {
    const activeReferralBanner = await getActiveReferralInviteBannerImage();
    await warmImageSources([
      ...CLUB_IMAGES,
      ...MEDAL_IMAGES,
      ...FIRST_LESSON_SHEET_IMAGES,
      ...LESSON_INTRO_CTA_IMAGES,
      activeReferralBanner,
    ]);
  } catch {
    // Silently fail - preloading is entirely optional.
  }
};

export const preloadDeferredNonPrimaryImages = async () => {
  try {
    await warmImageSources([
      ...OSKOLOK_IMAGE_SOURCES,
    ]);
  } catch {
    // Silently fail - preloading is entirely optional.
  }
};

export const preloadImages = async () => {
  try {
    const activeReferralBanner = await getActiveReferralInviteBannerImage();
    const allImages = [
      ...CLUB_IMAGES,
      ...MEDAL_IMAGES,
      ...FIRST_LESSON_SHEET_IMAGES,
      ...LESSON_INTRO_CTA_IMAGES,
      activeReferralBanner,
      ...OSKOLOK_IMAGE_SOURCES,
    ];
    await warmImageSources(allImages);
  } catch {
    // Silently fail - preloading is entirely optional.
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
