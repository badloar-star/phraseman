import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountOwnedStorageKeysFrom } from './cloud_sync';
import { RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS } from './retired_account_local_keys';
import { DebugLogger } from './debug-logger';
import { classifyGuestCleanKey, describeGuestValueShape, type GuestCleanKind } from './guest_clean_classifier';
import { identityErrorCode, identityTrace, redactStorageKey } from './identity_trace';
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
  // зачем (пункт (а)): метка владельца отложенного восстановления — служебный след, не прогресс.
  'boot_restore_owner_v1',
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
  // зачем (прогон 11.10, «сперва логи»): гость без прогресса получил «Телефон уже связан с другим
  // аккаунтом» из-за localClean:false, но КАКИЕ данные сочли прогрессом — было не видно. Печатаем
  // только безопасные имена ключей (redactStorageKey), без значений; немого catch больше нет.
  try {
    if (typeof storage.getAllKeys !== 'function') {
      identityTrace('[AUTH-LINK-GOOGLE]', 'clean_proof unavailable', { reason: 'no_getAllKeys' });
      return false;
    }
    // зачем (координатор 14.10, вход №6: clean_proof 0,9–1,6 с): сперва замер шагов — сколько ключей, сколько байт, кто самый крупный.
    const t0 = Date.now();
    const keys = await storage.getAllKeys();
    const t1 = Date.now();
    const selected = accountOwnedStorageKeysFrom(keys);
    const t2 = Date.now();
    const rows = await storage.multiGet(selected);
    const t3 = Date.now();
    const sized = rows.map(([key, value]) => [key, value ? value.length : 0] as const);
    const totalBytes = sized.reduce((sum, [, len]) => sum + len, 0);
    const top5 = [...sized].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, len]) => `${redactStorageKey(key)}=${len}`).join(' ');
    identityTrace('[AUTH-LINK-GOOGLE]', 'clean_proof timing', {
      allKeys: keys.length, getAllKeysMs: t1 - t0, selected: selected.length, filterMs: t2 - t1,
      multiGetMs: t3 - t2, bytes: totalBytes, top5,
    });
    const dirtyKeys = rows
      .filter(([key, value]) => !NON_AUTHORITATIVE_BOOT_KEYS.has(key) && isMeaningfulStoredAccountValue(value))
      .map(([key]) => key);
    if (dirtyKeys.length > 0) {
      identityTrace('[AUTH-LINK-GOOGLE]', 'clean_proof dirty', { count: dirtyKeys.length });
      // зачем (координатор 15.10, «переустановил → окно смены аккаунта»): пачки по 8 обрезались журналом на ~100 знаках,
      // полного списка «прогресса» свежего гостя не видели. Сперва логи: каждый ключ своей строкой с разметкой
      // default|service|progress, длиной и формой (типы, поля, длины массивов); значения НЕ печатаются. Решение входа пока прежнее (шаг 2 — по фактам).
      const valueByKey = new Map(rows);
      const kindCounts: Record<GuestCleanKind, number> = { default: 0, service: 0, progress: 0 };
      dirtyKeys.forEach((key, index) => {
        const raw = valueByKey.get(key) ?? '';
        const kind = classifyGuestCleanKey(key, raw);
        kindCounts[kind] += 1;
        console.log(`[GUEST-CLEAN] ${index + 1}/${dirtyKeys.length} key=${redactStorageKey(key)} kind=${kind} len=${String(raw).length} shape=${describeGuestValueShape(raw)}`); // guard-ok: одна строка на ключ, только при входе
      });
      console.log(`[GUEST-CLEAN] summary dirty=${dirtyKeys.length} default=${kindCounts.default} service=${kindCounts.service} progress=${kindCounts.progress} wouldBeClean=${kindCounts.progress === 0} decision=not_clean`); // guard-ok: итог разметки
      return false;
    }
    identityTrace('[AUTH-LINK-GOOGLE]', 'clean_proof clean', { checked: rows.length });
    return true;
  } catch (error) {
    identityTrace('[AUTH-LINK-GOOGLE]', 'clean_proof failed', { code: identityErrorCode(error) });
    return false;
  }
}
