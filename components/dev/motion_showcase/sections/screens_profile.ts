// ─── Витрина движения · шард «Экраны · профиль и прочее» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Подраздел: всё, что не попало в «обучение» / «арена и социальное» / «карточки» —
// настройки, статистика, магазины, аватары, сертификаты, ачивки и разные утилитарные экраны.
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';

export const SECTION: ShowcaseSection = {
  id: 'screens_profile',
  order: 75,
  title: cs('screens_profile_section_title'),
  items: [
    { id: 'settings-tab', title: cs('settings_tab_title'), kind: 'route', route: '/(tabs)/settings', detail: cs('real_screen') },
    { id: 'settings-language', title: cs('settings_language_title'), kind: 'route', route: '/settings_language', detail: cs('real_screen') },
    { id: 'settings-notifications', title: cs('settings_notifications_title'), kind: 'route', route: '/settings_notifications', detail: cs('real_screen') },
    { id: 'settings-themes', title: cs('settings_themes_title'), kind: 'route', route: '/settings_themes', detail: cs('real_screen') },
    { id: 'settings-edu', title: cs('settings_edu_title'), kind: 'route', route: '/settings_edu', detail: cs('real_screen') },
    { id: 'account-details', title: cs('account_details_title'), kind: 'route', route: '/account_details', detail: cs('real_screen') },
    { id: 'privacy-settings', title: cs('privacy_settings_title'), kind: 'route', route: '/privacy_settings', detail: cs('real_screen') },
    { id: 'privacy-screen', title: cs('privacy_screen_title'), kind: 'route', route: '/privacy_screen', detail: cs('real_screen') },
    { id: 'terms-screen', title: cs('terms_screen_title'), kind: 'route', route: '/terms_screen', detail: cs('real_screen') },
    { id: 'streak-stats', title: cs('streak_stats_title'), kind: 'route', route: '/streak_stats', detail: cs('real_screen') },
    { id: 'phrase-analytics', title: cs('phrase_analytics_title'), kind: 'route', route: '/phrase_analytics_screen', detail: cs('real_screen') },
    { id: 'shards-shop', title: cs('shards_shop_title'), kind: 'route', route: '/shards_shop', detail: cs('real_screen') },
    { id: 'coin-exchange', title: cs('coin_exchange_title'), kind: 'route', route: '/coin_exchange', detail: cs('real_screen') },
    { id: 'avatar-select', title: cs('avatar_select_title'), kind: 'route', route: '/avatar_select', detail: cs('real_screen') },
    { id: 'collectibles-screen', title: cs('collectibles_screen_title'), kind: 'route', route: '/collectibles_screen', detail: cs('real_screen') },
    { id: 'achievements-screen', title: cs('achievements_screen_title'), kind: 'route', route: '/achievements_screen', detail: cs('real_screen') },
    { id: 'level-gifts-inventory', title: cs('level_gifts_inventory_title'), kind: 'route', route: '/level_gifts_inventory', detail: cs('real_screen') },
    { id: 'level-reward-spin', title: cs('level_reward_spin_title'), kind: 'route', route: '/level_reward_spin', detail: cs('real_screen') },
    { id: 'season-pass', title: cs('season_pass_title'), kind: 'route', route: '/season_pass', detail: cs('real_screen') },
    { id: 'club-screen', title: cs('club_screen_title'), kind: 'route', route: '/club_screen', detail: cs('real_screen') },
    { id: 'referrals', title: cs('referrals_invite_title'), kind: 'route', route: '/referrals', detail: cs('real_screen') },
    { id: 'manage-subscription', title: cs('manage_subscription_title'), kind: 'route', route: '/manage_subscription', detail: cs('real_screen') },
    { id: 'promo-code-entry', title: cs('promo_code_entry_title'), kind: 'route', route: '/promo_code_entry', detail: cs('real_screen') },
    { id: 'diagnostic-test', title: cs('diagnostic_test_level_title'), kind: 'route', route: '/diagnostic_test', detail: cs('real_screen') },
    { id: 'exam-screen', title: cs('exam_screen_title'), kind: 'route', route: '/exam', detail: cs('real_screen') },
    { id: 'problem-coach', title: cs('problem_coach_title'), kind: 'route', route: '/problem_coach', detail: cs('real_screen') },
    { id: 'survey-screen', title: cs('survey_screen_title'), kind: 'route', route: '/survey_screen', detail: cs('real_screen') },
    { id: 'ideas-submit', title: cs('ideas_submit_title'), kind: 'route', route: '/ideas_submit', detail: cs('real_screen') },
    { id: 'community-pack-create', title: cs('community_pack_create_title'), kind: 'route', route: '/community_pack_create', detail: cs('real_screen') },
    { id: 'language-welcome', title: cs('language_welcome_title'), kind: 'route', route: '/language_welcome', detail: cs('real_screen') },
  ],
};
