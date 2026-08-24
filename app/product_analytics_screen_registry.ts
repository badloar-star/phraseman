const STATIC_SCREEN_NAMES = [
  'achievements_screen', 'avatar_select', 'club_screen',
  'arena', 'arena_friend_duel', 'arena_invite', 'arena_match', 'arena_matchmaking',
  'arena_ranks', 'arena_results', 'arena_season_pass',
  'arena_star_wallet', 'arena_today',
  'collectibles_screen', 'community_pack_create', 'diagnostic_test', 'exam', 'flashcards',
  'flashcards_audio', 'flashcards_collection', 'flashcards_swipe', 'hint', 'language_welcome',
  'league_screen', 'lesson_complete', 'lesson_help', 'lesson_irregular_verbs', 'lesson_menu',
  'lesson_theory_v2', 'lesson_words', 'level_exam', 'level_gifts_inventory',
  'lingman_videos', 'manage_subscription', 'pack_opening', 'paywall_a', 'paywall_b', 'paywall_c',
  'paywall_d', 'paywall_e', 'paywall_f', 'paywall_g', 'max_paywall',
  'phrase_analytics_screen', 'premium_modal',
  'preposition_drill', 'privacy_screen', 'promo_code_entry',
  'referrals', 'settings_edu', 'settings_language',
  'settings_notifications', 'settings_themes', 'shards_shop', 'streak_stats', 'terms_screen',
  'mistake_practice_session',
] as const;

const EXACT_SCREEN_IDS: Readonly<Record<string, string>> = Object.freeze({
  '/': 'root',
  '/home': 'home',
  '/lessons': 'lessons',
  '/friends': 'friends',
  ...Object.fromEntries(STATIC_SCREEN_NAMES.map((name) => [`/${name}`, name])),
});

function normalizedPath(pathname: string): string {
  const withoutGroups = pathname.replace(/\/\([^/]+\)/g, '');
  const withoutQuery = withoutGroups.split(/[?#]/, 1)[0] || '/';
  const compact = withoutQuery.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return compact || '/';
}

export function productAnalyticsScreenId(pathname: unknown): string {
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.includes('://')) {
    return 'unknown_screen';
  }
  const path = normalizedPath(pathname);
  const exact = EXACT_SCREEN_IDS[path];
  if (exact) return exact;
  if (/^\/lesson(?:1|\/[^/]+)$/.test(path)) return 'lesson';
  if (/^\/friends\/[^/]+$/.test(path)) return 'friend_profile';
  return 'unknown_screen';
}

export default function __RouteShim() { return null; }
