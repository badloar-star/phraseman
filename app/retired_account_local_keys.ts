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
  // Синк-ключи удалённого личного плана (были в SYNC_KEYS до efe19ae9d).
  'personal_plan_state_v1',
  'personal_plan_progress_v1',
  'personal_plan_completed_tasks_v1',
  'personal_plan_task_progress_v1',
  'personal_plan_xp_ledger_v1',
] as const;

/**
 * Префиксы ключей удалённой миграции «Подарки и спины → монеты» и удалённого
 * «Дневного пути» (владелец 01.10: D148 — подарки в монеты НЕ переводятся;
 * D78/D49 — механики удалены целиком; Q109 — код миграции снесён).
 *
 * зачем оставлено: на устройствах, обновившихся с 1.x, эти ключи лежат
 * (журнал подарков и щитов серии, квитанции показа, журнал миграции). Код,
 * который их читал, удалён, но следующий вошедший аккаунт не должен
 * унаследовать чужой журнал — стираем вместе с аккаунтом (cloud_sync).
 */
export const RETIRED_GIFTS_TO_COINS_ACCOUNT_LOCAL_PREFIXES = [
  // Журнал миграции: WAL, квитанции Plus-дней, журнал потолка спинов.
  'gifts_to_coins_v1:',
  // Прежние constants/daily_journey_gift_storage_keys.ts (имена менять нельзя).
  'daily_journey_gift_occurrence_v1:',
  'daily_journey_gift_prepared_v1:',
  'daily_journey_gift_projection_v1:',
  'daily_journey_gift_claim_receipt_v1:',
  'daily_journey_production_presented_v1:',
  'daily_journey_production_intent_v1:',
  // Прежний constants/daily_journey_freeze_storage_keys.ts.
  'daily_journey_freeze_operation_v1:',
  'daily_journey_freeze_prepared_v1:',
  'daily_journey_freeze_projection_v1:',
  'daily_journey_protected_day_prepared_v1:',
] as const;
