// ════════════════════════════════════════════════════════════════════════════
// account_switch_backup_restore.ts — восстановление аварийной копии «Сменить аккаунт».
//
// cloud_sync.saveAccountSwitchEmergencyBackup() пишет полную копию account-ключей
// в AsyncStorage ПЕРЕД wipeLocalAccountData(), когда forceSyncToCloud провалился
// и юзер явно выбрал «сменить без сохранения». До этого модуля копию никто не
// читал — прогресс терялся безвозвратно. Теперь при следующем входе в ТОТ ЖЕ
// аккаунт (stable_id совпал) доливаем из копии ключи, которых нет после
// restoreFromCloud.
//
// Правила безопасности:
//   • stableId в копии обязан совпасть с текущим canonical id — данные не могут
//     перетечь в чужой аккаунт.
//   • Доливаем ТОЛЬКО отсутствующие ключи (текущее значение == null): облачный
//     restore всегда главнее, копия лишь закрывает дыры, которых облако не знало.
//   • Копия старше 30 дней считается протухшей и удаляется.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCanonicalUserId } from './user_id_policy';

// Литерал продублирован из app/cloud_sync.ts (ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY):
// константа там не экспортируется. При смене ключа менять в обоих местах.
const BACKUP_KEY = 'account_switch_emergency_backup_latest_v1';
const BACKUP_MAX_AGE_MS = 30 * 24 * 60 * 60_000;

type BackupPayload = {
  version: number;
  createdAt: number;
  reason?: string;
  stableId?: string | null;
  pairs: Array<[string, string]>;
};

export type BackupRestoreResult =
  | { status: 'no_backup' }
  | { status: 'different_account' }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'restored'; restoredKeys: number; skippedExisting: number };

function parseBackup(raw: string): BackupPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && Array.isArray(parsed.pairs)) {
      return parsed as BackupPayload;
    }
  } catch {
    // повреждённый JSON — вызывающий удалит копию
  }
  return null;
}

export async function restoreAccountSwitchEmergencyBackupIfSafe(): Promise<BackupRestoreResult> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(BACKUP_KEY);
  } catch {
    return { status: 'no_backup' };
  }
  if (!raw) return { status: 'no_backup' };

  const backup = parseBackup(raw);
  if (!backup) {
    await AsyncStorage.removeItem(BACKUP_KEY).catch(() => {});
    return { status: 'invalid' };
  }

  if (typeof backup.createdAt === 'number' && Date.now() - backup.createdAt > BACKUP_MAX_AGE_MS) {
    await AsyncStorage.removeItem(BACKUP_KEY).catch(() => {});
    return { status: 'expired' };
  }

  const currentId = await getCanonicalUserId().catch(() => null);
  if (!backup.stableId || !currentId || backup.stableId !== currentId) {
    // Чужой (или неизвестный) аккаунт — копию не трогаем: владелец может вернуться.
    return { status: 'different_account' };
  }

  const candidates = backup.pairs.filter(
    (pair): pair is [string, string] =>
      Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string',
  );
  if (candidates.length === 0) {
    await AsyncStorage.removeItem(BACKUP_KEY).catch(() => {});
    return { status: 'invalid' };
  }

  const current = await AsyncStorage.multiGet(candidates.map(([key]) => key));
  const existing = new Set(current.filter(([, value]) => value != null).map(([key]) => key));
  const missing = candidates.filter(([key]) => !existing.has(key));

  if (missing.length > 0) {
    await AsyncStorage.multiSet(missing);
  }
  await AsyncStorage.removeItem(BACKUP_KEY).catch(() => {});
  return { status: 'restored', restoredKeys: missing.length, skippedExisting: existing.size };
}

// Required by Expo Router — not a screen
export default {};
