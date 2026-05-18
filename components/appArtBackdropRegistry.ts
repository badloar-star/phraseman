import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

export const APP_ART_THEME_MODES = [
  'dark',
  'neon',
  'gold',
  'coral',
  'minimalLight',
  'minimalDark',
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
  'statistics',
] as const;

export type AppArtBackdropName = (typeof APP_ART_BACKDROP_NAMES)[number];

const HOME_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/home/home-study-dark.webp'),
  neon: require('../assets/images/home/home-study-neon.webp'),
  gold: require('../assets/images/home/home-study-gold.webp'),
  coral: require('../assets/images/home/home-study-coral.webp'),
  minimalLight: require('../assets/images/home/home-study-minimal-light.webp'),
  minimalDark: require('../assets/images/home/home-study-minimal-dark.webp'),
};

const LESSON_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/lessons/lessons-path-dark.webp'),
  neon: require('../assets/images/lessons/lessons-path-neon.webp'),
  gold: require('../assets/images/lessons/lessons-path-gold.webp'),
  coral: require('../assets/images/lessons/lessons-path-coral.webp'),
  minimalLight: require('../assets/images/lessons/lessons-path-minimal-light.webp'),
  minimalDark: require('../assets/images/lessons/lessons-path-minimal-dark.webp'),
};

const LESSON_INTRO_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/lesson_intro/intro-bg-dark.webp'),
  neon: require('../assets/images/lesson_intro/intro-bg-neon.webp'),
  gold: require('../assets/images/lesson_intro/intro-bg-gold.webp'),
  coral: require('../assets/images/lesson_intro/intro-bg-coral.webp'),
  minimalLight: require('../assets/images/lesson_intro/intro-bg-minimal-light.webp'),
  minimalDark: require('../assets/images/lesson_intro/intro-bg-minimal-dark.webp'),
};

const ARENA_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/arena/knowledge-arena-dark.webp'),
  neon: require('../assets/images/arena/knowledge-arena-neon.webp'),
  gold: require('../assets/images/arena/knowledge-arena-gold.webp'),
  coral: require('../assets/images/arena/knowledge-arena-coral.webp'),
  minimalLight: require('../assets/images/arena/knowledge-arena-minimal-light.webp'),
  minimalDark: require('../assets/images/arena/knowledge-arena-minimal-dark.webp'),
};

const ARENA_READY_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/arena_match/arena-ready-dark.webp'),
  neon: require('../assets/images/arena_match/arena-ready-neon.webp'),
  gold: require('../assets/images/arena_match/arena-ready-gold.webp'),
  coral: require('../assets/images/arena_match/arena-ready-coral.webp'),
  minimalLight: require('../assets/images/arena_match/arena-ready-minimal-light.webp'),
  minimalDark: require('../assets/images/arena_match/arena-ready-minimal-dark.webp'),
};

const ARENA_MATCH_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/arena_match/arena-match-dark.webp'),
  neon: require('../assets/images/arena_match/arena-match-neon.webp'),
  gold: require('../assets/images/arena_match/arena-match-gold.webp'),
  coral: require('../assets/images/arena_match/arena-match-coral.webp'),
  minimalLight: require('../assets/images/arena_match/arena-match-minimal-light.webp'),
  minimalDark: require('../assets/images/arena_match/arena-match-minimal-dark.webp'),
};

const FRIENDS_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/friends/friends-guild-dark.webp'),
  neon: require('../assets/images/friends/friends-guild-neon.webp'),
  gold: require('../assets/images/friends/friends-guild-gold.webp'),
  coral: require('../assets/images/friends/friends-guild-coral.webp'),
  minimalLight: require('../assets/images/friends/friends-guild-minimal-light.webp'),
  minimalDark: require('../assets/images/friends/friends-guild-minimal-dark.webp'),
};

const SETTINGS_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/settings/settings-sanctum-dark.webp'),
  neon: require('../assets/images/settings/settings-sanctum-neon.webp'),
  gold: require('../assets/images/settings/settings-sanctum-gold.webp'),
  coral: require('../assets/images/settings/settings-sanctum-coral.webp'),
  minimalLight: require('../assets/images/settings/settings-sanctum-minimal-light.webp'),
  minimalDark: require('../assets/images/settings/settings-sanctum-minimal-dark.webp'),
};

const ACHIEVEMENTS_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/screen_backdrops/achievements/achievements-dark.webp'),
  neon: require('../assets/images/screen_backdrops/achievements/achievements-neon.webp'),
  gold: require('../assets/images/screen_backdrops/achievements/achievements-gold.webp'),
  coral: require('../assets/images/screen_backdrops/achievements/achievements-coral.webp'),
  minimalLight: require('../assets/images/screen_backdrops/achievements/achievements-minimal-light.webp'),
  minimalDark: require('../assets/images/screen_backdrops/achievements/achievements-minimal-dark.webp'),
};

const DAILY_TASKS_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/screen_backdrops/daily_tasks/daily-tasks-dark.webp'),
  neon: require('../assets/images/screen_backdrops/daily_tasks/daily-tasks-neon.webp'),
  gold: require('../assets/images/screen_backdrops/daily_tasks/daily-tasks-gold.webp'),
  coral: require('../assets/images/screen_backdrops/daily_tasks/daily-tasks-coral.webp'),
  minimalLight: require('../assets/images/screen_backdrops/daily_tasks/daily-tasks-minimal-light.webp'),
  minimalDark: require('../assets/images/screen_backdrops/daily_tasks/daily-tasks-minimal-dark.webp'),
};

const QUIZZES_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/screen_backdrops/quizzes/quizzes-dark.webp'),
  neon: require('../assets/images/screen_backdrops/quizzes/quizzes-neon.webp'),
  gold: require('../assets/images/screen_backdrops/quizzes/quizzes-gold.webp'),
  coral: require('../assets/images/screen_backdrops/quizzes/quizzes-coral.webp'),
  minimalLight: require('../assets/images/screen_backdrops/quizzes/quizzes-minimal-light.webp'),
  minimalDark: require('../assets/images/screen_backdrops/quizzes/quizzes-minimal-dark.webp'),
};

const DIAGNOSTIC_TEST_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/screen_backdrops/diagnostic_test/diagnostic-test-dark.webp'),
  neon: require('../assets/images/screen_backdrops/diagnostic_test/diagnostic-test-neon.webp'),
  gold: require('../assets/images/screen_backdrops/diagnostic_test/diagnostic-test-gold.webp'),
  coral: require('../assets/images/screen_backdrops/diagnostic_test/diagnostic-test-coral.webp'),
  minimalLight: require('../assets/images/screen_backdrops/diagnostic_test/diagnostic-test-minimal-light.webp'),
  minimalDark: require('../assets/images/screen_backdrops/diagnostic_test/diagnostic-test-minimal-dark.webp'),
};

const EXAM_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/screen_backdrops/exam/exam-dark.webp'),
  neon: require('../assets/images/screen_backdrops/exam/exam-neon.webp'),
  gold: require('../assets/images/screen_backdrops/exam/exam-gold.webp'),
  coral: require('../assets/images/screen_backdrops/exam/exam-coral.webp'),
  minimalLight: require('../assets/images/screen_backdrops/exam/exam-minimal-light.webp'),
  minimalDark: require('../assets/images/screen_backdrops/exam/exam-minimal-dark.webp'),
};

const FLASHCARDS_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/screen_backdrops/flashcards/flashcards-dark.webp'),
  neon: require('../assets/images/screen_backdrops/flashcards/flashcards-neon.webp'),
  gold: require('../assets/images/screen_backdrops/flashcards/flashcards-gold.webp'),
  coral: require('../assets/images/screen_backdrops/flashcards/flashcards-coral.webp'),
  minimalLight: require('../assets/images/screen_backdrops/flashcards/flashcards-minimal-light.webp'),
  minimalDark: require('../assets/images/screen_backdrops/flashcards/flashcards-minimal-dark.webp'),
};

// Keep route-specific backdrop names while dedicated deep-screen art is not bundled yet.
const PROGRESS_MAP_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = LESSON_BACKDROPS;
const SHARDS_SHOP_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = SETTINGS_BACKDROPS;

const STATISTICS_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/statistics/stats-bg-dark.webp'),
  neon: require('../assets/images/statistics/stats-bg-neon.webp'),
  gold: require('../assets/images/statistics/stats-bg-gold.webp'),
  coral: require('../assets/images/statistics/stats-bg-coral.webp'),
  minimalLight: require('../assets/images/statistics/stats-bg-minimal-light.webp'),
  minimalDark: require('../assets/images/statistics/stats-bg-minimal-dark.webp'),
};

export const APP_ART_BACKDROP_SOURCES: Record<AppArtBackdropName, Record<ThemeMode, ImageSourcePropType>> = {
  home: HOME_BACKDROPS,
  lessons: LESSON_BACKDROPS,
  lessonIntro: LESSON_INTRO_BACKDROPS,
  lessonPractice: LESSON_BACKDROPS,
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
  flashcards_collection: 'flashcards',
  flashcards_swipe: 'flashcards',
  flashcards_market_dev: 'flashcards',
  community_pack_create: 'flashcards',
  pack_opening: 'flashcards',
  shards_shop: 'shardsShop',
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

export function resolveAppArtBackdropName(pathname?: string | null): AppArtBackdropName {
  const normalized = normalizePathname(pathname);
  const segments = normalized
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => segment && !segment.startsWith('('));
  const lastSegment = segments[segments.length - 1] ?? 'home';

  return APP_ART_ROUTE_BACKDROPS[lastSegment] ?? 'home';
}

export function getAppArtBackdropSource(
  name: AppArtBackdropName,
  themeMode: ThemeMode,
): ImageSourcePropType {
  return APP_ART_BACKDROP_SOURCES[name][themeMode] ?? APP_ART_BACKDROP_SOURCES[name].dark;
}

function normalizePathname(pathname?: string | null): string {
  const withoutQuery = String(pathname || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/g, '');

  return withoutQuery || '/';
}
