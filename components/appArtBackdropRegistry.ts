import type { ThemeMode } from '../constants/theme';

export const APP_ART_THEME_MODES = [
  'dark',
  'gold',
  'coral',
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
  'levelGifts',
  'statistics',
] as const;

export type AppArtBackdropName = (typeof APP_ART_BACKDROP_NAMES)[number];

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
  trainer_plan_session: 'lessonPractice',
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
  privacy_screen: 'settings',
  terms_screen: 'settings',
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

function normalizePathname(pathname?: string | null): string {
  const withoutQuery = String(pathname || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/g, '');

  return withoutQuery || '/';
}
