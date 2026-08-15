import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_STORE_RELEASE } from './config';

export const TESTER_NO_PREMIUM_STORAGE_KEY = 'tester_no_premium';

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
    void AsyncStorage.removeItem(TESTER_NO_PREMIUM_STORAGE_KEY).catch(() => {});
  } catch {
    // An unavailable storage bridge must not turn a legacy QA flag into denial.
  }
  return false;
}
