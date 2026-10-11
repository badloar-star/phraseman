import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountOwnedStorageKeysFrom } from './cloud_sync';
import { RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS } from './retired_account_local_keys';
import { DebugLogger } from './debug-logger';
import { LEARNING_LANGUAGE_TARGETS } from './learning_language_contour';
import { languageProfileKey } from './study_languages';

const NON_AUTHORITATIVE_BOOT_KEYS = new Set<string>([
  'user_name',
  'generated_nickname_pending_v1',
  'generated_name_confirmed_v1',
  'onboarding_done',
  'lang',
  'app_lang',
  'device_platform',
  'app_version',
  'last_active_date',
  'streak_last_date',
  'study_languages_started_v1',
  ...LEARNING_LANGUAGE_TARGETS.map(languageProfileKey),
  'week_points_migrated_v1',
  // зачем (Account V2, 7D): журнал удалений карточек — служебный след, не прогресс;
  // сам по себе не должен делать установку «непустой» при передаче учётных данных.
  'accounts_v2_card_deletions_v1',
  // зачем (Account Authority 2.0, S1b): отпечаток записи страниц карточек (8N) — служебный
  // след синка, не прогресс; в инвентаре аккаунта ради стирания, но установку «непустой» не делает.
  'flashcard_pages_write_fingerprint_v1',
  // зачем: XP/лига/их подарки сняты в 2.0. Их старые ключи стираются вместе с
  // аккаунтом, но прогрессом не являются и никуда не синхронизируются — значит,
  // не должны делать установку «непустой» ни при восстановлении, ни при передаче.
  ...RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS,
]);

type LocalAccountStorage = {
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  getAllKeys?(): Promise<readonly string[]>;
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
  } catch (e) {
      // Non-empty scalar strings can be account-owned values.
      DebugLogger.error('local_account_data:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return true;
}

export async function hasMeaningfulLocalAccountData(
  storage: LocalAccountStorage = AsyncStorage,
): Promise<boolean> {
  try {
    const allKeys = typeof storage.getAllKeys === 'function' ? await storage.getAllKeys() : [];
    const rows = await storage.multiGet(accountOwnedStorageKeysFrom(allKeys));
    return rows.some(([key, value]) => (
      !NON_AUTHORITATIVE_BOOT_KEYS.has(key) && isMeaningfulStoredAccountValue(value)
    ));
  } catch {
    return false;
  }
}

/**
 * Strong proof used before replacing an anonymous Firebase credential with an
 * already-existing provider account. A failed/incomplete inventory is never
 * interpreted as empty: this is the boundary preventing anonymous A data from
 * being observed or synchronized while authenticated as provider B.
 */
export async function isLocalAnonymousIdentityProvenCleanForCredentialHandoff(
  storage: LocalAccountStorage = AsyncStorage,
): Promise<boolean> {
  try {
    if (typeof storage.getAllKeys !== 'function') return false;
    const keys = await storage.getAllKeys();
    const rows = await storage.multiGet(accountOwnedStorageKeysFrom(keys));
    if (rows.some(([key, value]) => (
      !NON_AUTHORITATIVE_BOOT_KEYS.has(key) && isMeaningfulStoredAccountValue(value)
    ))) return false;
    return true;
  } catch {
    return false;
  }
}
