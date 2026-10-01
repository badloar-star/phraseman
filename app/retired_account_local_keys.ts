/**
 * Ключи снятых в 2.0 фич (XP, лига и их подарки), которые всё ещё лежат на
 * устройствах, обновившихся с 1.x.
 *
 * зачем отдельный модуль: снимок 2.0 (efe19ae9d) убрал эти ключи из SYNC_KEYS, а
 * инвентарь стирания при смене аккаунта строится из SYNC_KEYS — следующий
 * вошедший аккаунт наследовал чужие XP/уровень/очки лиги. Список нужен и
 * cloud_sync (стирание), и local_account_data (не считать прогрессом). Лежит
 * отдельно от cloud_sync, чтобы тесты, подменяющие cloud_sync целиком, не ломали
 * импорт local_account_data (так упал auth_provider_behavior после b8cc51b31).
 * Сторож: tests/cloud_sync_identity_anchor.test.ts.
 */
export const RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS = [
  'user_total_xp',
  'user_prev_xp',
  'weekly_xp',
  'weekly_xp_period_start',
  'season_cosmetics_v1',
  'admin_energy_command',
  'profile_card_level',
  'profile_card_theme',
  'profile_card_motion',
  'profile_card_public_focus',
  'gift_xp_bank_v1',
  'achievement_league_boost_count',
  'league_state_v3',
  'league_result_pending',
  'league_result_consumed_sig',
  'week_leaderboard',
  'week_points_v2',
  'chain_shield',
  'gift_xp_multiplier',
  'club_gift_free_boost_v1',
  'level_premium_pack_unlock_gifts_v1',
  'level_up_shown_levels_v1',
  'wager_discount',
  'wager_discount_uses_v1',
  'league_chest_energy_override_v1',
  'league_chest_xp_override_v1',
  'league_gold_theme_unlocked_v1',
  'league_gold_theme_unlocked_at',
  'xp_migration_v2',
  'xp_level_restore_250_to_400_v1',
  'week_points_migrated_v1',
] as const;
