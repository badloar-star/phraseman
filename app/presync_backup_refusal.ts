/*
 * Отказ входа, когда прогресс гостя не удалось ни выгрузить, ни сохранить аварийной
 * копией (AA S2d раунд 3, решение координатора §135 ❓1).
 *
 * зачем: прежде любой отказ копии давал local_progress_not_uploaded с текстом
 * «повтори при хорошем интернете». Но чаще копию нельзя сделать по СОСТОЯНИЮ
 * устройства (уже лежит копия другого аккаунта, старая копия требует обновления,
 * нет места, удаление аккаунта) — повтор там бесполезен, нужна «Сменить аккаунт».
 * Явная таблица: неизвестный код — сбой записи (повтор безопасен, данные не стёрты).
 */
export type PresyncBackupRefusalCode = 'local_progress_backup_blocked' | 'local_progress_not_uploaded';

export const PRESYNC_BACKUP_REFUSAL_TABLE: Readonly<Record<string, PresyncBackupRefusalCode>> = {
  // Копию сделать нельзя по состоянию устройства — повтор не поможет.
  account_switch_backup_other_owner_pending: 'local_progress_backup_blocked',
  account_switch_backup_history_upgrade_required: 'local_progress_backup_blocked',
  account_switch_backup_value_upgrade_required: 'local_progress_backup_blocked',
  account_switch_backup_capacity: 'local_progress_backup_blocked',
  // save вернул false: личность в карантине удаления аккаунта.
  account_switch_backup_unavailable: 'local_progress_backup_blocked',
  // Сбой чтения личности/записи/проверки — повтор при нормальной связи имеет смысл.
  account_switch_backup_identity_unavailable: 'local_progress_not_uploaded',
  account_switch_backup_verification_failed: 'local_progress_not_uploaded',
  account_switch_backup_namespace_conflict: 'local_progress_not_uploaded',
  account_switch_backup_owner_mismatch: 'local_progress_not_uploaded',
};

export function classifyPresyncBackupRefusal(backupCode: string): PresyncBackupRefusalCode {
  return PRESYNC_BACKUP_REFUSAL_TABLE[backupCode] ?? 'local_progress_not_uploaded';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
