import { Image, type ImageSourcePropType } from 'react-native';
import { Asset } from 'expo-asset';
import { APP_ART_BACKDROP_NAMES, APP_ART_BACKDROP_SOURCES } from '../components/appArtBackdropRegistry';
import { FIRST_LESSON_SHEET_IMAGES } from '../components/firstLessonSheetAssets';

// Pre-load critical bundled images so Metro-served assets are already cached in dev.
// Image.getSize() only works with network URIs, not require() assets.
// Image.resolveAssetSource() warms the local asset registry without making requests.

const CLUB_IMAGES = [
  require('../assets/images/levels/club icon base forest.webp'),
  require('../assets/images/levels/club base ocean.webp'),
  require('../assets/images/levels/club base corak.webp'),
  require('../assets/images/levels/club base sacura.webp'),
  require('../assets/images/levels/club base neon.webp'),
  require('../assets/images/levels/club icon base forest.webp'),
  require('../assets/images/levels/club base ocean.webp'),
  require('../assets/images/levels/club base corak.webp'),
  require('../assets/images/levels/club base sacura.webp'),
  require('../assets/images/levels/club base neon.webp'),
  require('../assets/images/levels/club icon base forest.webp'),
  require('../assets/images/levels/club base neon.webp'),
];

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
  require('../assets/images/arena_actions/arena-action-match-neon.webp'),
  require('../assets/images/arena_actions/arena-action-friend-neon.webp'),
  require('../assets/images/arena_actions/arena-action-throne-neon.webp'),
  require('../assets/images/arena_actions/arena-action-match-gold.webp'),
  require('../assets/images/arena_actions/arena-action-friend-gold.webp'),
  require('../assets/images/arena_actions/arena-action-throne-gold.webp'),
  require('../assets/images/arena_actions/arena-action-match-coral.webp'),
  require('../assets/images/arena_actions/arena-action-friend-coral.webp'),
  require('../assets/images/arena_actions/arena-action-throne-coral.webp'),
  require('../assets/images/arena_actions/arena-action-match-minimalLight.webp'),
  require('../assets/images/arena_actions/arena-action-friend-minimalLight.webp'),
  require('../assets/images/arena_actions/arena-action-throne-minimalLight.webp'),
  require('../assets/images/arena_actions/arena-action-match-minimalDark.webp'),
  require('../assets/images/arena_actions/arena-action-friend-minimalDark.webp'),
  require('../assets/images/arena_actions/arena-action-throne-minimalDark.webp'),
];

const LESSON_INTRO_CTA_IMAGES = [
  require('../assets/images/lesson_intro/intro-cta-dark.webp'),
  require('../assets/images/lesson_intro/intro-cta-neon.webp'),
  require('../assets/images/lesson_intro/intro-cta-gold.webp'),
  require('../assets/images/lesson_intro/intro-cta-coral.webp'),
  require('../assets/images/lesson_intro/intro-cta-minimal-light.webp'),
  require('../assets/images/lesson_intro/intro-cta-minimal-dark.webp'),
];

const TAB_BACKGROUND_IMAGES = [
  require('../assets/images/home/home-study-dark.webp'),
  require('../assets/images/home/home-study-neon.webp'),
  require('../assets/images/home/home-study-gold.webp'),
  require('../assets/images/home/home-study-coral.webp'),
  require('../assets/images/home/home-study-minimal-light.webp'),
  require('../assets/images/home/home-study-minimal-dark.webp'),
  require('../assets/images/lessons/lessons-path-dark.webp'),
  require('../assets/images/lessons/lessons-path-neon.webp'),
  require('../assets/images/lessons/lessons-path-gold.webp'),
  require('../assets/images/lessons/lessons-path-coral.webp'),
  require('../assets/images/lessons/lessons-path-minimal-light.webp'),
  require('../assets/images/lessons/lessons-path-minimal-dark.webp'),
  require('../assets/images/arena/knowledge-arena-dark.webp'),
  require('../assets/images/arena/knowledge-arena-neon.webp'),
  require('../assets/images/arena/knowledge-arena-gold.webp'),
  require('../assets/images/arena/knowledge-arena-coral.webp'),
  require('../assets/images/arena/knowledge-arena-minimal-light.webp'),
  require('../assets/images/arena/knowledge-arena-minimal-dark.webp'),
  require('../assets/images/friends/friends-guild-dark.webp'),
  require('../assets/images/friends/friends-guild-neon.webp'),
  require('../assets/images/friends/friends-guild-gold.webp'),
  require('../assets/images/friends/friends-guild-coral.webp'),
  require('../assets/images/friends/friends-guild-minimal-light.webp'),
  require('../assets/images/friends/friends-guild-minimal-dark.webp'),
  require('../assets/images/settings/settings-sanctum-dark.webp'),
  require('../assets/images/settings/settings-sanctum-neon.webp'),
  require('../assets/images/settings/settings-sanctum-gold.webp'),
  require('../assets/images/settings/settings-sanctum-coral.webp'),
  require('../assets/images/settings/settings-sanctum-minimal-light.webp'),
  require('../assets/images/settings/settings-sanctum-minimal-dark.webp'),
];

const DEEP_BACKGROUND_IMAGES = [
  require('../assets/images/statistics/stats-bg-dark.webp'),
  require('../assets/images/statistics/stats-bg-neon.webp'),
  require('../assets/images/statistics/stats-bg-gold.webp'),
  require('../assets/images/statistics/stats-bg-coral.webp'),
  require('../assets/images/statistics/stats-bg-minimal-light.webp'),
  require('../assets/images/statistics/stats-bg-minimal-dark.webp'),
  require('../assets/images/arena_match/arena-match-dark.webp'),
  require('../assets/images/arena_match/arena-match-neon.webp'),
  require('../assets/images/arena_match/arena-match-gold.webp'),
  require('../assets/images/arena_match/arena-match-coral.webp'),
  require('../assets/images/arena_match/arena-match-minimal-light.webp'),
  require('../assets/images/arena_match/arena-match-minimal-dark.webp'),
  require('../assets/images/arena_match/arena-ready-dark.webp'),
  require('../assets/images/arena_match/arena-ready-neon.webp'),
  require('../assets/images/arena_match/arena-ready-gold.webp'),
  require('../assets/images/arena_match/arena-ready-coral.webp'),
  require('../assets/images/arena_match/arena-ready-minimal-light.webp'),
  require('../assets/images/arena_match/arena-ready-minimal-dark.webp'),
];

const APP_ART_BACKGROUND_IMAGES = APP_ART_BACKDROP_NAMES.flatMap(name =>
  Object.values(APP_ART_BACKDROP_SOURCES[name])
);

async function warmImageSources(sources: readonly ImageSourcePropType[]) {
  const uniqueSources = Array.from(new Set(sources));
  const prefetches: Promise<boolean>[] = [];

  uniqueSources.forEach(source => {
    try {
      const resolved = Image.resolveAssetSource(source);
      if (resolved?.uri && resolved.uri.startsWith('http')) {
        prefetches.push(Image.prefetch(resolved.uri).catch(() => false));
      }
    } catch {
      // Individual asset resolution failure must never crash the app.
    }
  });

  await Promise.all([
    Asset.loadAsync(uniqueSources as any).catch(() => []),
    ...prefetches,
  ]);
}

export const preloadStartupImages = async () => {
  try {
    await warmImageSources(APP_ART_BACKGROUND_IMAGES);
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
      ...TAB_BACKGROUND_IMAGES,
      ...DEEP_BACKGROUND_IMAGES,
      ...APP_ART_BACKGROUND_IMAGES,
    ];
    await warmImageSources(allImages);
  } catch {
    // Silently fail - preloading is entirely optional.
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
