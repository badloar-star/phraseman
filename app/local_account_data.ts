import AsyncStorage from '@react-native-async-storage/async-storage';
import { SYNC_KEYS } from './cloud_sync';

const NON_AUTHORITATIVE_BOOT_KEYS = new Set<string>([
  'user_name',
  'onboarding_done',
  'lang',
  'app_lang',
  'device_platform',
  'app_version',
  'last_active_date',
  'streak_last_date',
  'study_languages_started_v1',
  'language_profile_v1::en',
  'language_profile_v1::fr',
  'xp_migration_v2',
  'week_points_migrated_v1',
  'xp_level_restore_250_to_400_v1',
]);

type LocalAccountStorage = {
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
};

export function isMeaningfulStoredAccountValue(raw: string | null): boolean {
  const value = raw?.trim() ?? '';
  if (!value || value === '0' || value === 'false' || value === 'null' || value === '[]' || value === '{}') {
    return false;
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.length > 0;
    if (parsed && typeof parsed === 'object') return Object.keys(parsed).length > 0;
  } catch {
    // Non-empty scalar strings can be account-owned values.
  }
  return true;
}

export async function hasMeaningfulLocalAccountData(
  storage: LocalAccountStorage = AsyncStorage,
): Promise<boolean> {
  try {
    const rows = await storage.multiGet([...SYNC_KEYS]);
    return rows.some(([key, value]) => (
      !NON_AUTHORITATIVE_BOOT_KEYS.has(key) && isMeaningfulStoredAccountValue(value)
    ));
  } catch {
    return false;
  }
}
