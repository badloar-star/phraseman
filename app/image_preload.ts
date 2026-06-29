import { Image, type ImageSourcePropType } from 'react-native';
import { Asset } from 'expo-asset';
import { FIRST_LESSON_SHEET_IMAGES } from '../components/firstLessonSheetAssets';
import { LEVEL_GIFT_IMAGE_SOURCES } from '../constants/levelGiftImages';
import { LEVEL_GIFT_REWARD_ICON_SOURCES } from '../constants/levelGiftRewardIcons';
import { OSKOLOK_IMAGE_SOURCES } from './oskolok';

// Pre-load critical bundled images so Metro-served assets are already cached in dev.
// Image.getSize() only works with network URIs, not require() assets.
// Image.resolveAssetSource() warms the local asset registry without making requests.

const CLUB_IMAGES = [
  require('../assets/images/levels/club icon base forest.webp'),
  require('../assets/images/levels/club base ocean.webp'),
  require('../assets/images/levels/club base corak.webp'),
  require('../assets/images/levels/club base sacura.webp'),  require('../assets/images/levels/club icon base forest.webp'),
  require('../assets/images/levels/club base ocean.webp'),
  require('../assets/images/levels/club base corak.webp'),
  require('../assets/images/levels/club base sacura.webp'),  require('../assets/images/levels/club icon base forest.webp'),];

const MEDAL_IMAGES = [
  require('../assets/images/levels/bronza.webp'),
  require('../assets/images/levels/serebro.webp'),
  require('../assets/images/levels/zoloto.webp'),
  require('../assets/images/levels/rubin.webp'),
  require('../assets/images/levels/izumrud.webp'),
  require('../assets/images/levels/almaz.webp'),
];

const ARENA_RANK_IMAGES = [
  require('../assets/images/arena_ranks/v2/arena-rank-bronze-i.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-bronze-ii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-bronze-iii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-silver-i.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-silver-ii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-silver-iii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-gold-i.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-gold-ii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-gold-iii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-platinum-i.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-platinum-ii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-platinum-iii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-diamond-i.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-diamond-ii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-diamond-iii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-master-i.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-master-ii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-master-iii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-grandmaster-i.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-grandmaster-ii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-grandmaster-iii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-legend-i.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-legend-ii.webp'),
  require('../assets/images/arena_ranks/v2/arena-rank-legend-iii.webp'),
];

const ARENA_ACTION_IMAGES = [
  require('../assets/images/arena_actions/arena-action-match-dark.webp'),
  require('../assets/images/arena_actions/arena-action-friend-dark.webp'),
  require('../assets/images/arena_actions/arena-action-throne-dark.webp'),
  require('../assets/images/arena_actions/arena-action-season-reward-dark.webp'),
  require('../assets/images/arena_actions/arena-action-match-gold.webp'),
  require('../assets/images/arena_actions/arena-action-friend-gold.webp'),
  require('../assets/images/arena_actions/arena-action-throne-gold.webp'),
  require('../assets/images/arena_actions/arena-action-season-reward-gold.webp'),
  require('../assets/images/arena_actions/arena-action-match-coral.webp'),
  require('../assets/images/arena_actions/arena-action-friend-coral.webp'),
  require('../assets/images/arena_actions/arena-action-throne-coral.webp'),
  require('../assets/images/arena_actions/arena-action-season-reward-coral.webp'),
  require('../assets/images/arena_actions/arena-action-match-minimalDark.webp'),
  require('../assets/images/arena_actions/arena-action-friend-minimalDark.webp'),
  require('../assets/images/arena_actions/arena-action-throne-minimalDark.webp'),
  require('../assets/images/arena_actions/arena-action-season-reward-minimalDark.webp'),
  require('../assets/images/arena_actions/arena-action-match-midnight.webp'),
  require('../assets/images/arena_actions/arena-action-friend-midnight.webp'),
  require('../assets/images/arena_actions/arena-action-throne-midnight.webp'),
  require('../assets/images/arena_actions/arena-action-season-reward-midnight.webp'),
  require('../assets/images/arena_actions/arena-action-match-ember.webp'),
  require('../assets/images/arena_actions/arena-action-friend-ember.webp'),
  require('../assets/images/arena_actions/arena-action-throne-ember.webp'),
  require('../assets/images/arena_actions/arena-action-season-reward-ember.webp'),
  require('../assets/images/arena_actions/arena-action-match-aurora.webp'),
  require('../assets/images/arena_actions/arena-action-friend-aurora.webp'),
  require('../assets/images/arena_actions/arena-action-throne-aurora.webp'),
  require('../assets/images/arena_actions/arena-action-season-reward-aurora.webp'),
  require('../assets/images/arena_actions/arena-action-match-volt.webp'),
  require('../assets/images/arena_actions/arena-action-friend-volt.webp'),
  require('../assets/images/arena_actions/arena-action-throne-volt.webp'),
  require('../assets/images/arena_actions/arena-action-season-reward-volt.webp'),
];

const LESSON_INTRO_CTA_IMAGES = [
  require('../assets/images/lesson_intro/intro-cta-dark.webp'),
  require('../assets/images/lesson_intro/intro-cta-premium-gold.webp'),
  require('../assets/images/lesson_intro/intro-cta-coral.webp'),
  require('../assets/images/lesson_intro/intro-cta-minimal-dark.webp'),
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
    await warmImageSources([
      ...CLUB_IMAGES,
      ...MEDAL_IMAGES,
      ...ARENA_RANK_IMAGES,
      ...ARENA_ACTION_IMAGES,
      ...FIRST_LESSON_SHEET_IMAGES,
      ...LESSON_INTRO_CTA_IMAGES,
    ]);
  } catch {
    // Silently fail - preloading is entirely optional.
  }
};

export const preloadDeferredNonPrimaryImages = async () => {
  try {
    await warmImageSources([
      ...LEVEL_GIFT_IMAGE_SOURCES,
      ...LEVEL_GIFT_REWARD_ICON_SOURCES,
      ...OSKOLOK_IMAGE_SOURCES,
    ]);
  } catch {
    // Silently fail - preloading is entirely optional.
  }
};

export const preloadImages = async () => {
  try {
    const allImages = [
      ...CLUB_IMAGES,
      ...MEDAL_IMAGES,
      ...ARENA_RANK_IMAGES,
      ...ARENA_ACTION_IMAGES,
      ...FIRST_LESSON_SHEET_IMAGES,
      ...LESSON_INTRO_CTA_IMAGES,
      ...LEVEL_GIFT_IMAGE_SOURCES,
      ...LEVEL_GIFT_REWARD_ICON_SOURCES,
      ...OSKOLOK_IMAGE_SOURCES,
    ];
    await warmImageSources(allImages);
  } catch {
    // Silently fail - preloading is entirely optional.
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
