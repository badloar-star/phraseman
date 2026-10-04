/*
 * AA S2d раунд 3 (§135 ❓1): два разных отказа входа, когда прогресс гостя не удалось
 * ни выгрузить, ни сохранить аварийной копией.
 *  - local_progress_backup_blocked — копию сделать НЕЛЬЗЯ по состоянию устройства
 *    (повтор не поможет): кнопка «Сменить аккаунт», как у account_switch_required;
 *  - local_progress_not_uploaded — настоящий сбой связи/записи: «Повторить».
 */
import {
  PRESYNC_BACKUP_REFUSAL_TABLE,
  classifyPresyncBackupRefusal,
} from '../app/presync_backup_refusal';

test.each([
  ['account_switch_backup_other_owner_pending', 'local_progress_backup_blocked'],
  ['account_switch_backup_history_upgrade_required', 'local_progress_backup_blocked'],
  ['account_switch_backup_value_upgrade_required', 'local_progress_backup_blocked'],
  ['account_switch_backup_capacity', 'local_progress_backup_blocked'],
  ['account_switch_backup_unavailable', 'local_progress_backup_blocked'],
  ['account_switch_backup_identity_unavailable', 'local_progress_not_uploaded'],
  ['account_switch_backup_verification_failed', 'local_progress_not_uploaded'],
  ['account_switch_backup_namespace_conflict', 'local_progress_not_uploaded'],
  ['account_switch_backup_owner_mismatch', 'local_progress_not_uploaded'],
  ['error_without_code', 'local_progress_not_uploaded'],
  ['something_new', 'local_progress_not_uploaded'],
])('%s → %s', (code, expected) => {
  expect(classifyPresyncBackupRefusal(code)).toBe(expected);
});

test('the table is explicit and only names the two sign-in codes', () => {
  for (const value of Object.values(PRESYNC_BACKUP_REFUSAL_TABLE)) {
    expect(['local_progress_backup_blocked', 'local_progress_not_uploaded']).toContain(value);
  }
  expect(Object.keys(PRESYNC_BACKUP_REFUSAL_TABLE).length).toBeGreaterThanOrEqual(9);
});
