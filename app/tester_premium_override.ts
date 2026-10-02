import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_STORE_RELEASE } from './config';
import { DebugLogger } from './debug-logger';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export const TESTER_NO_PREMIUM_STORAGE_KEY = 'tester_no_premium';
export const TESTER_NO_LIMITS_STORAGE_KEY = 'tester_no_limits';

export type TesterFlagsRaw = Readonly<{ noPremium: string | null; noLimits: string | null }>;
const NO_TESTER_FLAGS: TesterFlagsRaw = Object.freeze({ noPremium: null, noLimits: null });
let inFlightTesterFlags: Promise<TesterFlagsRaw> | null = null;

/**
 * Сырые флаги тестера («Снять премиум», «Без лимитов») — одно чтение на всех.
 *
 * зачем ([COLD-START-IO], release, слабый профиль, 02.10): tester_no_premium читали ~42 раза за
 * первые 15 с (premium_guard ×4, PremiumContext, activation guard, cloud_sync) по ~0,5–4,5 с в
 * очереди нативных модулей. В store-сборке флаги и так игнорируются (resolveTesterNoPremiumOverride
 * → false) — там хранилище не трогаем вовсе. В dev/preview одновременные чтения склеиваются в одно
 * multiGet; результат НЕ держится дольше запроса — переключатель тестера срабатывает сразу.
 */
export function readTesterFlags(storeRelease = IS_STORE_RELEASE): Promise<TesterFlagsRaw> {
  if (storeRelease) return Promise.resolve(NO_TESTER_FLAGS);
  if (inFlightTesterFlags) return inFlightTesterFlags;
  const pending = AsyncStorage.multiGet([TESTER_NO_PREMIUM_STORAGE_KEY, TESTER_NO_LIMITS_STORAGE_KEY])
    .then((pairs): TesterFlagsRaw => {
      const values = Object.fromEntries(pairs) as Record<string, string | null>;
      return Object.freeze({
        noPremium: values[TESTER_NO_PREMIUM_STORAGE_KEY] ?? null,
        noLimits: values[TESTER_NO_LIMITS_STORAGE_KEY] ?? null,
      });
    })
    .catch((error: unknown): TesterFlagsRaw => {
      DebugLogger.error('tester_premium_override:readTesterFlags', error instanceof Error ? error : new Error(String(error)), 'warning');
      return NO_TESTER_FLAGS;
    })
    .finally(() => {
      if (inFlightTesterFlags === pending) inFlightTesterFlags = null;
    });
  inFlightTesterFlags = pending;
  return pending;
}

/**
 * Resolves the legacy local QA kill-switch at the store-release boundary.
 * Store users must never lose a paid entitlement because an old preview build
 * left this device-local flag behind. Cleanup is intentionally best-effort and
 * never delays entitlement resolution.
 */
export function resolveTesterNoPremiumOverride(
  raw: string | null | undefined,
  storeRelease = IS_STORE_RELEASE,
): boolean {
  if (raw !== 'true') return false;
  if (!storeRelease) return true;

  try {
    void AsyncStorage.removeItem(TESTER_NO_PREMIUM_STORAGE_KEY).catch(noteSwallowedHandler('tester_premium_override:promise_1'));
  } catch (e) {
      // An unavailable storage bridge must not turn a legacy QA flag into denial.
      DebugLogger.error('tester_premium_override:resolveTesterNoPremiumOverride', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return false;
}
