import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { IS_EXPO_GO } from './config';

const RC_TIMEOUT_MS = 8000;
const CACHE_TTL_MS  = 5 * 60 * 1000; // 5 minutes — avoid hammering RevenueCat

let _cachedResult: boolean | null = null;
let _cacheTime = 0;

/** Invalidate the in-memory cache (call after purchase/restore). */
export function invalidatePremiumCache(): void {
  _cachedResult = null;
  _cacheTime = 0;
}

/**
 * Verifies premium status: tries RevenueCat first, falls back to
 * local AsyncStorage with expiry check. Updates AsyncStorage to reflect
 * the verified status so other code stays in sync.
 * Result is cached in memory for 5 minutes to avoid rate-limiting RC.
 *
 * Referral bonus (premium_plan === 'referral_bonus') is validated
 * locally via expiry timestamp — RC is not aware of it.
 *
 * tester_no_premium overrides everything — returns false even if RC says active.
 */
export async function getVerifiedPremiumStatus(): Promise<boolean> {
  // Tester override: force no-premium regardless of RC or AsyncStorage
  const [testerNoPremiumRaw, testerNoLimitsRaw] = await Promise.all([
    AsyncStorage.getItem('tester_no_premium'),
    AsyncStorage.getItem('tester_no_limits'),
  ]);
  if (testerNoPremiumRaw === 'true') return cache(false);
  // "No Limits" tester mode implies full premium access
  if (testerNoLimitsRaw === 'true') return cache(true);

  // Return cached result if still fresh
  if (_cachedResult !== null && Date.now() - _cacheTime < CACHE_TTL_MS) {
    return _cachedResult;
  }
  const pairs = await AsyncStorage.multiGet(['premium_active', 'premium_plan', 'premium_expiry']);
  const active  = pairs.find(p => p[0] === 'premium_active')?.[1];
  const plan    = pairs.find(p => p[0] === 'premium_plan')?.[1];
  const expiry  = parseInt(pairs.find(p => p[0] === 'premium_expiry')?.[1] || '0');

  if (!IS_EXPO_GO) {
    try {
      const info = await Promise.race([
        Purchases.getCustomerInfo(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), RC_TIMEOUT_MS)),
      ]);
      if (info) {
        const rcActive =
          Object.keys((info as any).entitlements.active).length > 0 ||
          (info as any).activeSubscriptions.length > 0;

        if (rcActive) {
          await AsyncStorage.setItem('premium_active', 'true');
          return cache(true);
        }

        // RC says not active — allow unexpired referral bonus
        const isValidReferral = plan === 'referral_bonus' && expiry > Date.now();
        if (isValidReferral) {
          await AsyncStorage.setItem('premium_active', 'true');
          return cache(true);
        }

        // Post-purchase RC propagation grace: if local flag is true and expiry
        // is still in the future, trust local state. RC sandbox (and prod) can
        // lag for several seconds after a purchase, and overwriting the flag
        // here causes freshly-purchased premium to appear locked immediately
        // after the purchase modal closes.
        if (active === 'true' && expiry > Date.now()) {
          return cache(true);
        }

        await AsyncStorage.setItem('premium_active', 'false');
        return cache(false);
      }
    } catch {
      // RC unavailable — fall through to local check
    }
  }

  // Expo Go or RC unavailable: trust AsyncStorage with expiry validation
  if (active !== 'true') return cache(false);
  if (expiry > 0 && expiry < Date.now()) {
    await AsyncStorage.setItem('premium_active', 'false');
    return cache(false);
  }
  return cache(true);
}

function cache(result: boolean): boolean {
  _cachedResult = result;
  _cacheTime = Date.now();
  return result;
}
