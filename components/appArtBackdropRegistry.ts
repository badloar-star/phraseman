import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

export const APP_ART_THEME_MODES = [
  'dark',
  'neon',
  'gold',
  'coral',
  'minimalLight',
  'minimalDark',
  'compass',
] as const satisfies readonly ThemeMode[];

export const APP_ART_BACKDROP_NAMES = [
  'home',
  'lessons',
  'lessonIntro',
  'lessonPractice',
  'arena',
  'arenaReady',
  'arenaMatch',
  'friends',
  'settings',
  'achievements',
  'dailyTasks',
  'quizzes',
  'diagnosticTest',
  'exam',
  'flashcards',
  'progressMap',
  'shardsShop',
  'levelGifts',
  'statistics',
] as const;

export type AppArtBackdropName = (typeof APP_ART_BACKDROP_NAMES)[number];

const THEME_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/theme_backdrops/theme-backdrop-dark.webp'),
  neon: require('../assets/images/theme_backdrops/theme-backdrop-neon.webp'),
  gold: require('../assets/images/theme_backdrops/theme-backdrop-gold.webp'),
  coral: require('../assets/images/theme_backdrops/theme-backdrop-coral.webp'),
  minimalLight: require('../assets/images/theme_backdrops/theme-backdrop-minimal-light.webp'),
  minimalDark: require('../assets/images/theme_backdrops/theme-backdrop-minimal-dark.webp'),
  compass: require('../assets/images/app_backdrops/compass-premium/home-compass-premium-session.webp'),
  // «Чёрное кино»: бэкдроп не показывается (IMAGE_OPACITY=0), ключи — компасные ассеты.
  midnight: require('../assets/images/app_backdrops/compass-premium/home-compass-premium-session.webp'),
  ember: require('../assets/images/app_backdrops/compass-premium/home-compass-premium-session.webp'),
  aurora: require('../assets/images/app_backdrops/compass-premium/home-compass-premium-session.webp'),
  volt: require('../assets/images/app_backdrops/compass-premium/home-compass-premium-session.webp'),
};

function withOnboardingGraphite(
  base: Record<ThemeMode, ImageSourcePropType>,
  compass: ImageSourcePropType,
): Record<ThemeMode, ImageSourcePropType> {
  // Cinema-темы наследуют компасный арт (он всё равно скрыт нулевой непрозрачностью).
  return { ...base, compass, midnight: compass, ember: compass, aurora: compass, volt: compass };
}

const HOME_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/home-compass-premium-session.webp'));
const LESSON_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/lessons-compass-premium-session.webp'));
const LESSON_INTRO_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/lessonIntro-compass-premium-session.webp'));
const LESSON_PRACTICE_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/lessonPractice-compass-premium-session.webp'));
const ARENA_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/arena-compass-premium-session.webp'));
const ARENA_READY_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/arenaReady-compass-premium-session.webp'));
const ARENA_MATCH_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/arenaMatch-compass-premium-session.webp'));
const FRIENDS_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/friends-compass-premium-session.webp'));
const SETTINGS_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/settings-compass-premium-session.webp'));
const ACHIEVEMENTS_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/achievements-compass-premium-session.webp'));
const DAILY_TASKS_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/dailyTasks-compass-premium-session.webp'));
const QUIZZES_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/quizzes-compass-premium-session.webp'));
const DIAGNOSTIC_TEST_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/diagnosticTest-compass-premium-session.webp'));
const EXAM_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/exam-compass-premium-session.webp'));
const FLASHCARDS_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/flashcards-compass-premium-session.webp'));
const PROGRESS_MAP_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/progressMap-compass-premium-session.webp'));
const SHARDS_SHOP_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/shardsShop-compass-premium-session.webp'));
const LEVEL_GIFTS_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/levelGifts-compass-premium-session.webp'));
const STATISTICS_BACKDROPS = withOnboardingGraphite(THEME_BACKDROPS, require('../assets/images/app_backdrops/compass-premium/statistics-compass-premium-session.webp'));

export const APP_ART_BACKDROP_SOURCES: Record<AppArtBackdropName, Record<ThemeMode, ImageSourcePropType>> = {
  home: HOME_BACKDROPS,
  lessons: LESSON_BACKDROPS,
  lessonIntro: LESSON_INTRO_BACKDROPS,
  lessonPractice: LESSON_PRACTICE_BACKDROPS,
  arena: ARENA_BACKDROPS,
  arenaReady: ARENA_READY_BACKDROPS,
  arenaMatch: ARENA_MATCH_BACKDROPS,
  friends: FRIENDS_BACKDROPS,
  settings: SETTINGS_BACKDROPS,
  achievements: ACHIEVEMENTS_BACKDROPS,
  dailyTasks: DAILY_TASKS_BACKDROPS,
  quizzes: QUIZZES_BACKDROPS,
  diagnosticTest: DIAGNOSTIC_TEST_BACKDROPS,
  exam: EXAM_BACKDROPS,
  flashcards: FLASHCARDS_BACKDROPS,
  progressMap: PROGRESS_MAP_BACKDROPS,
  shardsShop: SHARDS_SHOP_BACKDROPS,
  levelGifts: LEVEL_GIFTS_BACKDROPS,
  statistics: STATISTICS_BACKDROPS,
};

export const APP_ART_ROUTE_BACKDROPS: Record<string, AppArtBackdropName> = {
  index: 'home',
  home: 'home',
  lessons: 'lessons',
  arena: 'arena',
  friends: 'friends',
  settings: 'settings',
  lesson_menu: 'lessons',
  lesson1: 'lessonPractice',
  lesson_words: 'lessonPractice',
  lesson_irregular_verbs: 'lessons',
  lesson_intro_screens: 'lessonIntro',
  lesson_complete: 'lessons',
  lesson_help: 'lessons',
  hint: 'lessons',
  preposition_drill: 'lessonPractice',
  level_exam: 'exam',
  review: 'lessonPractice',
  quizzes: 'quizzes',
  quizzes_screen: 'quizzes',
  result_view: 'quizzes',
  diagnostic_test: 'diagnosticTest',
  exam: 'exam',
  daily_tasks_screen: 'dailyTasks',
  achievements_screen: 'achievements',
  progress_map: 'progressMap',
  flashcards: 'flashcards',
  flashcards_audio: 'flashcards',
  flashcards_collection: 'flashcards',
  flashcards_swipe: 'flashcards',
  flashcards_market_dev: 'flashcards',
  community_pack_create: 'flashcards',
  pack_opening: 'flashcards',
  shards_shop: 'shardsShop',
  level_gifts_inventory: 'levelGifts',
  streak_stats: 'statistics',
  phrase_analytics_screen: 'statistics',
  trainer: 'statistics',
  trainer_smart_session: 'lessonPractice',
  trainer_words_session: 'lessonPractice',
  trainer_phrases_session: 'lessonPractice',
  trainer_arena_session: 'arena',
  problem_coach: 'lessonPractice',
  arena_game: 'arenaMatch',
  arena_lobby: 'arena',
  arena_join: 'arena',
  arena_results: 'arenaMatch',
  arena_room: 'arenaMatch',
  arena_rating: 'arena',
  arena_leaderboard: 'arena',
  club_screen: 'friends',
  league_screen: 'friends',
  friends_screen: 'friends',
  settings_edu: 'settings',
  settings_notifications: 'settings',
  settings_themes: 'settings',
  settings_language: 'settings',
  settings_invite_friend: 'settings',
  premium_modal: 'settings',
  avatar_select: 'settings',
  beta_testers: 'settings',
  privacy_screen: 'settings',
  terms_screen: 'settings',
  web_screen: 'settings',
  pos_analytics_audit: 'statistics',
  _pos_analytics_audit: 'statistics',
};

const DEFAULT_ROUTE_BACKDROP: AppArtBackdropName = 'home';
const warnedRouteBackdropKeys = new Set<string>();

function readRouteBackdrop(pathname?: string | null): {
  normalized: string;
  lastSegment: string;
  backdropName?: AppArtBackdropName;
} {
  const normalized = normalizePathname(pathname);
  const segments = normalized
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => segment && !segment.startsWith('('));
  const routeSegment = segments[segments.length - 1];
  const lastSegment = routeSegment || DEFAULT_ROUTE_BACKDROP;

  return {
    normalized,
    lastSegment,
    backdropName: APP_ART_ROUTE_BACKDROPS[lastSegment],
  };
}

export function assertAppArtBackdropRoute(pathname?: string | null): AppArtBackdropName {
  const route = readRouteBackdrop(pathname);

  if (!route.backdropName) {
    throw new Error(`[AppArtBackdrop] Missing generated backdrop mapping for route "${route.normalized}" (segment "${route.lastSegment}")`);
  }

  return route.backdropName;
}

export function resolveAppArtBackdropName(pathname?: string | null): AppArtBackdropName {
  const route = readRouteBackdrop(pathname);

  if (route.backdropName) {
    return route.backdropName;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const warnKey = `${route.normalized}:${route.lastSegment}`;
    if (!warnedRouteBackdropKeys.has(warnKey)) {
      warnedRouteBackdropKeys.add(warnKey);
      console.warn(`[AppArtBackdrop] Missing generated backdrop mapping for route "${route.normalized}" (segment "${route.lastSegment}"); using home art`);
    }
  }

  return DEFAULT_ROUTE_BACKDROP;
}

export function getAppArtBackdropSource(
  name: AppArtBackdropName,
  themeMode: ThemeMode,
): ImageSourcePropType {
  const source = APP_ART_BACKDROP_SOURCES[name][themeMode];
  return source ?? APP_ART_BACKDROP_SOURCES[name].dark;
}

function normalizePathname(pathname?: string | null): string {
  const withoutQuery = String(pathname || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/g, '');

  return withoutQuery || '/';
}
