/**
 * Ключи без владельца в имени, которые переживали выход и смену аккаунта и доставались следующему человеку.
 *
 * зачем (координатор 15.10, docs/phraseman-2.0/handoff/LOGOUT_WIPE_AUDIT_2026-10-15.md, 🔴 №1 к сборке 16.10): серия (отложенная
 * заморозка Plus, маркеры недели, отметка отправки на сервер), уроки за жемчуг (материализуются заново из журнала покупок при входе),
 * история и лимиты Диалогов, кэш статистики с именем и серией, кэш бана, заморозки Plus месяца, ОЖИДАЮЩИЕ поздравления, лайки наборов,
 * счётчики пейвола. С 18.10 (координатор 03:42) — и отметки «поздравление уже показано» (ACCOUNT_SWITCH_CELEBRATION_SEEN_KEYS): это
 * аккаунт, а не телефон. Прежде их держали «чтобы A при повторном входе не увидел поздравление снова» — это и так обеспечивает копия
 * того же владельца ниже; а метка выдачи A гасила поздравление B, если выдача B была раньше по времени.
 *
 * Что с ними делает приложение:
 *  - стирание при выходе/смене (app/cloud_sync.ts, шаг «только стирание»: остаток проверяется сразу, поздняя запись убирается тихо);
 *  - аварийная копия уходящего A их сохраняет, и при входе ТОГО ЖЕ владельца restoreAccountSwitchEmergencyBackupIfSafe возвращает
 *    их (лимиты не сбрасываются перевходом, история и лайки на месте); чужому владельцу копия не отдаётся.
 * Отдельный модуль — чтобы читать список и из cloud_sync, и из восстановления копии без циклического импорта.
 * Устройство (study_target_v1, onboarding_*, app_lang) — решение владельца, здесь нет.
 */
/** Отметки «поздравление Plus / VIP уже показано» (premium_celebration_state.ts, vip_celebration_state.ts). */
export const ACCOUNT_SWITCH_CELEBRATION_SEEN_KEYS: readonly string[] = Object.freeze([
  'premium_celebration_seen_v1',
  'premium_celebration_admin_seen_v1',
  'vip_celebration_seen_v1',
]);

export const ACCOUNT_SWITCH_LEAK_KEYS: readonly string[] = Object.freeze([
  ...ACCOUNT_SWITCH_CELEBRATION_SEEN_KEYS,
  'streak_plus_freeze_pending_v1',
  'lessons_pearl_unlocked_v1', 'lessons_pearl_unlocked_v1_fr',
  'dialogs_completed_ids_v1', 'dialogs_free_lifetime_used_v2', 'dialogs_free_lifetime_count_v3',
  'dialogue_v2_voice_attempts_v1', 'dialogue_v2_why_allowance:v1',
  // R45 (Ревизор 15.10): кэш «stableId → был ли Plus» для лимита голоса (R13) — политика обещает стереть локальные данные
  'voice_last_known_access_v1',
  'stats_preload_cache_v5', 'lifetime_profile_stats_snapshot_v1',
  'streak_server_sync_day_v1', 'streak_week_day_markers_v1',
  'ban_status_cached_v1', 'ban_status_cached_at_v1',
  'premium_free_freeze_used', 'premium_free_freeze_month_v1',
  'premium_celebration_pending_v1', 'premium_celebration_pending_marker_v1', 'premium_celebration_pending_variant_v1',
  'vip_celebration_pending_v1', 'vip_celebration_pending_marker_v1',
  'community_pack_liked_ids_v1', 'community_pack_added_registered_ids_v1',
  'energy_zero_count_v1', 'streak_lost_count_v1',
]);

/* expo-router: keep this utility from being treated as a screen */
export default function __AccountSwitchLeakKeysRouteShim() {
  return null;
}
