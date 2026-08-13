const STATIC_SCREEN_NAMES = [
  'achievements_screen', 'avatar_select', 'club_screen',
  'arena', 'arena_friend_duel', 'arena_invite', 'arena_match', 'arena_matchmaking',
  'arena_ghost_duel', 'arena_mastery_map', 'arena_match_lab', 'arena_partner',
  'arena_ranks', 'arena_results', 'arena_rivalries', 'arena_season_pass',
  'arena_star_wallet', 'arena_today',
  'collectibles_screen', 'community_pack_create', 'diagnostic_test', 'exam', 'flashcards',
  'flashcards_audio', 'flashcards_collection', 'flashcards_swipe', 'hint', 'language_welcome',
  'league_screen', 'lesson_complete', 'lesson_help', 'lesson_irregular_verbs', 'lesson_menu',
  'lesson_theory_v2', 'lesson_words', 'level_exam', 'level_gifts_inventory', 'lingman_video_player',
  'lingman_videos', 'manage_subscription', 'pack_opening', 'paywall_a', 'paywall_b', 'paywall_c',
  'paywall_d', 'paywall_e', 'paywall_f', 'paywall_g',
  'personal_plan', 'personal_plan_complete', 'personal_plan_dev', 'personal_plan_exercise_transition',
  'personal_plan_runtime_dev', 'personal_plan_stats_screen', 'personal_plan_task_done',
  'personal_plan_thank_you', 'personal_plan_theory', 'phrase_analytics_screen', 'premium_modal',
  'preposition_drill', 'privacy_screen', 'problem_coach', 'promo_code_entry',
  'referrals', 'review', 'settings_edu', 'settings_language',
  'settings_notifications', 'settings_themes', 'shards_shop', 'streak_stats', 'terms_screen',
  'top_helpers', 'trainer', 'trainer_phrases_session',
  'trainer_plan_session', 'trainer_words_session',
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
