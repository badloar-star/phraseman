/**
 * Ключи без владельца в имени, которые переживали выход и смену аккаунта и доставались следующему человеку.
 *
 * зачем (координатор 15.10, docs/phraseman-2.0/handoff/LOGOUT_WIPE_AUDIT_2026-10-15.md, 🔴 №1 к сборке 16.10): серия (отложенная
 * заморозка Plus, маркеры недели, отметка отправки на сервер), уроки за жемчуг (материализуются заново из журнала покупок при входе),
 * история и лимиты Диалогов, кэш статистики с именем и серией, кэш бана, заморозки Plus месяца, ОЖИДАЮЩИЕ поздравления (флаги
 * «уже показано» намеренно не трогаем — иначе A при повторном входе увидит поздравление снова), лайки наборов, счётчики пейвола.
 *
 * Что с ними делает приложение:
 *  - стирание при выходе/смене (app/cloud_sync.ts, шаг «только стирание»: остаток проверяется сразу, поздняя запись убирается тихо);
 *  - аварийная копия уходящего A их сохраняет, и при входе ТОГО ЖЕ владельца restoreAccountSwitchEmergencyBackupIfSafe возвращает
 *    их (лимиты не сбрасываются перевходом, история и лайки на месте); чужому владельцу копия не отдаётся.
 * Отдельный модуль — чтобы читать список и из cloud_sync, и из восстановления копии без циклического импорта.
 * Устройство (study_target_v1, onboarding_*, app_lang) — решение владельца, здесь нет.
 */
export const ACCOUNT_SWITCH_LEAK_KEYS: readonly string[] = Object.freeze([
  'streak_plus_freeze_pending_v1',
  'lessons_pearl_unlocked_v1', 'lessons_pearl_unlocked_v1_fr',
  'dialogs_completed_ids_v1', 'dialogs_free_lifetime_used_v2', 'dialogs_free_lifetime_count_v3',
  'dialogue_v2_voice_attempts_v1', 'dialogue_v2_why_allowance:v1',
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
